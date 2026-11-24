// iskra-media-sync — автоимпорт записей уроков из публичных папок Диска в R2.
// Работает на VPS (api.iskra-study.ru), Node 22, без зависимостей.
// Проект: design/recordings-import/README.md. Установка: docs/infra/setup-media-sync.sh.
//
// Видео идёт Диск → VPS → R2 потоком, на диск VPS не пишется и через Supabase
// не проходит. С Supabase служба говорит только маленькими RPC (media_sync_*),
// предъявляя свой секрет (в БД лежит его SHA-256), и одной Edge-функцией
// media-sync-sign, которая подписывает PUT-ссылку в R2.
//
// HTTP (через nginx: https://api.iskra-study.ru/media-sync/…), с JWT учителя:
//   POST /media-sync/scan  { url, module_id } → папка, файлы и предложенные уроки
//   POST /media-sync/kick  { source_id }      → перепроверить папку сейчас + разбудить очередь
//   GET  /media-sync/health

import http from 'node:http'
import https from 'node:https'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'

const SB = (process.env.SUPABASE_URL || 'https://igsdwvwiqnozgwczzycx.supabase.co').replace(/\/+$/, '')
const ANON = process.env.SUPABASE_ANON_KEY || ''
const SECRET = process.env.MEDIA_SYNC_SECRET || ''
const GKEY = process.env.GOOGLE_DRIVE_API_KEY || ''
const PORT = Number(process.env.PORT || 8787)
const R2_PUBLIC = 'https://pub-7fc0bdb31ef8477cb024b613af34e1d8.r2.dev'
const ALLOWED_ORIGINS = [/^https:\/\/(www\.)?iskra-study\.ru$/, /^https:\/\/edu-study-app\.vercel\.app$/,
  /^https:\/\/edu-study-app-[\w-]+\.vercel\.app$/, /^capacitor:\/\/localhost$/, /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/]
const VIDEO_RE = /\.(mp4|m4v|mov|webm|mkv|avi)$/i
const PLAYABLE_RE = /\.(mp4|m4v|mov|webm)$/i
const RESCAN_MS = 10 * 60 * 1000
const QUEUE_MS = 60 * 1000

const log = (...a) => console.log(new Date().toISOString(), ...a)

// ── Supabase ────────────────────────────────────────────────────────────────
async function sb(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(SB + path, {
    method,
    headers: { apikey: ANON, Authorization: `Bearer ${token || ANON}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw Object.assign(new Error(`${path} ${res.status}: ${typeof data === 'string' ? data : data?.message || text}`.slice(0, 300)), { status: res.status })
  return data
}
const rpc = (name, args, token) => sb(`/rest/v1/rpc/${name}`, { method: 'POST', body: args, token })

async function userFrom(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) throw Object.assign(new Error('Не авторизован'), { status: 401 })
  const user = await sb('/auth/v1/user', { token }).catch(() => null)
  if (!user?.id) throw Object.assign(new Error('Не авторизован'), { status: 401 })
  return { token, user }
}

// ── Папки ───────────────────────────────────────────────────────────────────
export function parseFolder(raw) {
  let u
  try { u = new URL(String(raw || '').trim()) } catch { return null }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase()
  if (/^(disk\.yandex\.(ru|com|by|kz|uz|com\.tr)|disk\.360\.yandex\.(ru|com)|yadi\.sk)$/.test(host)) {
    if (!/^\/(d|i)\//.test(u.pathname)) return null
    return { provider: 'yadisk', folder_ref: `https://${host}${u.pathname.replace(/\/+$/, '')}` }
  }
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/folders\/([\w-]{10,})/)?.[1] || u.searchParams.get('id')
    if (!id || !/^[\w-]{10,}$/.test(id)) return null
    return { provider: 'gdrive', folder_ref: id }
  }
  return null
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(data?.description || data?.error?.message || `HTTP ${res.status}`), { status: res.status })
  return data
}

async function listYadisk(publicKey) {
  const out = []
  const walk = async (path, depth) => {
    const q = new URLSearchParams({ public_key: publicKey, limit: '1000', fields: '_embedded.items.name,_embedded.items.path,_embedded.items.size,_embedded.items.type,_embedded.items.media_type,type,name,size,path' })
    if (path) q.set('path', path)
    const data = await getJson(`https://cloud-api.yandex.net/v1/disk/public/resources?${q}`)
    if (data.type === 'file') { out.push({ id: data.path || '/', name: data.name, size: data.size ?? null, folder: '' }); return }
    for (const it of data._embedded?.items ?? []) {
      if (it.type === 'dir' && depth < 1) await walk(it.path, depth + 1)
      else if (it.type === 'file') out.push({ id: it.path, name: it.name, size: it.size ?? null, folder: depth ? (path || '').split('/').filter(Boolean).pop() : '' })
    }
  }
  await walk('', 0)
  return out
}

async function listGdrive(folderId) {
  if (!GKEY) throw new Error('Не настроен ключ Google Drive API на сервере')
  const out = []
  const walk = async (id, depth, folderName) => {
    let pageToken = ''
    do {
      const q = new URLSearchParams({ q: `'${id}' in parents and trashed = false`, fields: 'nextPageToken,files(id,name,size,mimeType)',
        pageSize: '1000', key: GKEY, supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' })
      if (pageToken) q.set('pageToken', pageToken)
      const data = await getJson(`https://www.googleapis.com/drive/v3/files?${q}`)
      for (const f of data.files ?? []) {
        if (f.mimeType === 'application/vnd.google-apps.folder') { if (depth < 1) await walk(f.id, depth + 1, f.name) }
        else out.push({ id: f.id, name: f.name, size: f.size ? Number(f.size) : null, folder: folderName })
      }
      pageToken = data.nextPageToken || ''
    } while (pageToken)
  }
  await walk(folderId, 0, '')
  return out
}

async function listFolder(provider, ref) {
  const files = provider === 'yadisk' ? await listYadisk(ref) : await listGdrive(ref)
  const coll = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
  return files.filter(f => VIDEO_RE.test(f.name)).sort((a, b) => coll.compare(`${a.folder}/${a.name}`, `${b.folder}/${b.name}`))
}

// ── Сопоставление файл → урок ───────────────────────────────────────────────
const words = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\.[a-z0-9]{2,4}$/i, '')
  .split(/[^a-zа-я0-9]+/i).filter(w => w.length >= 3 && !/^\d+$/.test(w))
export function fileNumber(name) {
  const base = String(name).replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/\b\d{4}[-_.]\d{1,2}[-_.]\d{1,2}\b/g, ' ').replace(/\b\d{1,2}[-_.]\d{1,2}[-_.]\d{2,4}\b/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\b\d{3,4}p\b/gi, ' ')
  const nums = base.match(/\d{1,3}/g)
  return nums ? Number(nums[nums.length - 1]) : null
}

/** lessons — уроки модуля по порядку; taken — id уроков, уже занятых записями. */
export function matchFiles(files, lessons, taken = new Set()) {
  const ordered = [...lessons].filter(l => (l.kind ?? 'lesson') !== 'test')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.lesson_number ?? 0) - (b.lesson_number ?? 0))
  const used = new Set(taken)
  const res = files.map(f => ({ file: f, lesson: null, kind: null }))
  for (const r of res) {
    const n = fileNumber(r.file.name)
    if (n == null) continue
    const byCourse = ordered.find(l => l.lesson_number != null && l.lesson_number + 1 === n)
    const lesson = byCourse || ordered[n - 1]
    if (lesson) { r.lesson = lesson; r.kind = 'number' }
  }
  for (const r of res) {
    if (r.lesson) continue
    const fw = new Set(words(r.file.name))
    let best = null, score = 0
    for (const l of ordered) {
      const lw = words(l.title)
      if (!lw.length) continue
      const s = lw.filter(w => fw.has(w) || [...fw].some(x => x.startsWith(w.slice(0, 5)) && w.length >= 5)).length / lw.length
      if (s > score) { score = s; best = l }
    }
    if (best && score >= 0.6) { r.lesson = best; r.kind = 'title' }
  }
  // Дубли: второй файл на тот же урок — не отмечаем.
  const seen = new Set(used)
  for (const r of res) {
    if (!r.lesson) continue
    r.duplicate = seen.has(r.lesson.id)
    seen.add(r.lesson.id)
  }
  const free = ordered.filter(l => !seen.has(l.id))
  for (const r of res) {
    if (r.lesson || !free.length) continue
    r.lesson = free.shift(); r.kind = 'order'
  }
  return res.map(r => ({
    provider_file_id: r.file.id, file_name: r.file.folder ? `${r.file.folder}/${r.file.name}` : r.file.name,
    size_bytes: r.file.size, lesson_id: r.lesson?.id ?? null, match_kind: r.lesson ? r.kind : null,
    duplicate: !!r.duplicate, playable: PLAYABLE_RE.test(r.file.name),
  }))
}

// ── Копирование в R2 ────────────────────────────────────────────────────────
async function openDownload(item) {
  let url
  if (item.provider === 'yadisk') {
    const q = new URLSearchParams({ public_key: item.folder_ref, path: item.provider_file_id })
    url = (await getJson(`https://cloud-api.yandex.net/v1/disk/public/resources/download?${q}`)).href
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.provider_file_id)}?alt=media&supportsAllDrives=true&key=${GKEY}`
  }
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`скачивание: HTTP ${res.status}`)
  if (/text\/html/i.test(res.headers.get('content-type') || '')) throw new Error('Диск вернул страницу вместо файла (квота или доступ)')
  const size = Number(res.headers.get('content-length')) || Number(item.size_bytes) || 0
  if (!size) { res.body.cancel().catch(() => {}); throw new Error('неизвестен размер файла') }
  return { stream: Readable.fromWeb(res.body), size }
}

function putStream(url, stream, size, contentType) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'PUT', headers: { 'Content-Length': size, 'Content-Type': contentType } }, res => {
      let body = ''
      res.on('data', c => { if (body.length < 2000) body += c })
      res.on('end', () => res.statusCode >= 200 && res.statusCode < 300 ? resolve() : reject(new Error(`R2 ${res.statusCode}: ${body.slice(0, 200)}`)))
    })
    req.on('error', reject)
    stream.on('error', e => { req.destroy(e); reject(e) })
    stream.pipe(req)
  })
}

const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' }
async function copyItem(item) {
  const ext = (item.file_name.match(/\.([a-z0-9]{2,4})$/i)?.[1] || '').toLowerCase()
  if (!MIME[ext]) throw new Error(`формат .${ext || '?'} не играет в браузере — нужен mp4/mov/webm`)
  if (!item.course_id || !item.lesson_short_id) throw new Error('урок удалён')
  const slug = String(item.lesson_short_id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80) || 'lesson'
  const tag = crypto.createHash('sha1').update(`${item.provider}:${item.provider_file_id}`).digest('hex').slice(0, 8)
  const key = `rec/${item.course_id}/${slug}-${tag}.${ext}`
  const dl = await openDownload(item)
  const sign = await sb('/functions/v1/media-sync-sign', { method: 'POST', body: { secret: SECRET, key, size: dl.size } })
  const t0 = Date.now()
  await putStream(sign.uploadUrl, dl.stream, dl.size, MIME[ext])
  log('copied', key, `${(dl.size / 1048576).toFixed(0)} MB in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  return { key, url: `${R2_PUBLIC}/${key}` }
}

let queueBusy = false
let queueAgain = false
async function runQueue() {
  if (queueBusy) { queueAgain = true; return }
  queueBusy = true
  try {
    do {
      queueAgain = false
      for (;;) {
        const items = await rpc('media_sync_claim', { p_secret: SECRET, p_limit: 1 })
        if (!items?.length) break
        const item = items[0]
        try {
          const done = await copyItem(item)
          const r = await rpc('media_sync_finish', { p_secret: SECRET, p_item_id: item.id, p_ok: true, p_r2_key: done.key, p_media_url: done.url })
          log('finish', item.id, r)
        } catch (e) {
          log('copy failed', item.id, e.message)
          await rpc('media_sync_finish', { p_secret: SECRET, p_item_id: item.id, p_ok: false, p_error: e.message }).catch(x => log('finish failed', x.message))
        }
      }
    } while (queueAgain)
  } catch (e) { log('queue error', e.message) } finally { queueBusy = false }
}

// ── Перепроверка папок ──────────────────────────────────────────────────────
async function scanSource(src) {
  try {
    const files = await listFolder(src.provider, src.folder_ref)
    const known = new Set(src.known ?? [])
    const fresh = files.filter(f => !known.has(f.id))
    const matched = matchFiles(fresh, src.lessons ?? [], new Set(src.claimed_lessons ?? []))
    const empty = id => { const l = (src.lessons ?? []).find(x => x.id === id); return l && !String(l.youtube_url || '').trim() }
    const items = matched.map(m => ({ ...m, auto: (m.match_kind === 'number' || m.match_kind === 'title') && !m.duplicate && m.playable && empty(m.lesson_id) }))
    const n = await rpc('media_sync_record_scan', { p_secret: SECRET, p_source_id: src.id, p_items: items })
    if (n) log('scan', src.id, `new ${n}`)
    return n
  } catch (e) {
    log('scan failed', src.id, e.message)
    await rpc('media_sync_record_scan', { p_secret: SECRET, p_source_id: src.id, p_items: [], p_error: e.message }).catch(() => {})
    throw e
  }
}
async function rescanDue() {
  try {
    for (const src of await rpc('media_sync_sources_due', { p_secret: SECRET }) ?? []) await scanSource(src).catch(() => {})
    runQueue()
  } catch (e) { log('rescan error', e.message) }
}

// ── HTTP ────────────────────────────────────────────────────────────────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function send(res, status, body, origin) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', Vary: 'Origin' }
  if (origin && ALLOWED_ORIGINS.some(r => r.test(origin))) {
    h['Access-Control-Allow-Origin'] = origin
    h['Access-Control-Allow-Headers'] = 'authorization, content-type'
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    h['Access-Control-Max-Age'] = '600'
  }
  res.writeHead(status, h)
  res.end(body === undefined ? '' : JSON.stringify(body))
}
async function readBody(req) {
  let s = ''
  for await (const c of req) { s += c; if (s.length > 20000) throw Object.assign(new Error('too large'), { status: 413 }) }
  try { return JSON.parse(s || '{}') } catch { throw Object.assign(new Error('bad json'), { status: 400 }) }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin
  const path = (req.url || '').split('?')[0].replace(/^\/media-sync/, '')
  try {
    if (req.method === 'OPTIONS') return send(res, 204, undefined, origin)
    if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, queueBusy, google: !!GKEY }, origin)
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, origin)
    const { token } = await userFrom(req)
    const body = await readBody(req)

    if (path === '/scan') {
      if (!UUID.test(String(body.module_id))) return send(res, 400, { error: 'Нет модуля' }, origin)
      const folder = parseFolder(body.url)
      if (!folder) return send(res, 400, { error: 'Нужна ссылка на публичную папку Google Диска или Яндекс Диска' }, origin)
      const can = await rpc('recording_import_can_edit', { p_module_id: body.module_id }, token)
      if (can !== true) return send(res, 403, { error: 'Нет доступа к модулю' }, origin)
      const lessons = await sb(`/rest/v1/lessons?module_id=eq.${body.module_id}&select=id,short_id,title,position,lesson_number,youtube_url,kind&order=position`, { token })
      let files
      try { files = await listFolder(folder.provider, folder.folder_ref) } catch (e) {
        return send(res, 422, { error: e.status === 404 ? 'Папка не найдена или закрыта — нужна ссылка с доступом «всем, у кого есть ссылка»' : `Не удалось прочитать папку: ${e.message}` }, origin)
      }
      const known = await sb(`/rest/v1/recording_import_items?select=provider_file_id,lesson_id,status,source_id,course_module_recording_sources!inner(module_id)&course_module_recording_sources.module_id=eq.${body.module_id}`, { token }).catch(() => [])
      const knownIds = new Set(known.map(k => k.provider_file_id))
      const taken = new Set(known.filter(k => k.lesson_id && ['confirmed', 'copying', 'applied'].includes(k.status)).map(k => k.lesson_id))
      const matched = matchFiles(files.filter(f => !knownIds.has(f.id)), lessons.filter(l => l.kind !== 'test'), taken)
      return send(res, 200, { ...folder, folder_url: String(body.url).trim(), files: matched, known: known.length, lessons }, origin)
    }

    if (path === '/kick') {
      if (!UUID.test(String(body.source_id))) return send(res, 400, { error: 'Нет папки' }, origin)
      const own = await sb(`/rest/v1/course_module_recording_sources?id=eq.${body.source_id}&select=id`, { token })
      if (!own?.length) return send(res, 403, { error: 'Нет доступа' }, origin)
      const [src] = await rpc('media_sync_sources_due', { p_secret: SECRET, p_source_id: body.source_id })
      let added = 0
      if (src) added = await scanSource(src).catch(e => { throw Object.assign(new Error(`Не удалось прочитать папку: ${e.message}`), { status: 422 }) })
      runQueue()
      return send(res, 200, { added }, origin)
    }
    return send(res, 404, { error: 'not found' }, origin)
  } catch (e) {
    return send(res, e.status && e.status < 600 ? e.status : 500, { error: e.message }, origin)
  }
})

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  if (!SECRET || !ANON) { console.error('MEDIA_SYNC_SECRET и SUPABASE_ANON_KEY обязательны'); process.exit(1) }
  server.listen(PORT, '127.0.0.1', () => log(`iskra-media-sync on 127.0.0.1:${PORT}, google=${!!GKEY}`))
  setInterval(runQueue, QUEUE_MS)
  setInterval(rescanDue, RESCAN_MS)
  setTimeout(rescanDue, 5000)
}
