// Public operational summary only. No raw errors, user IDs, emails, tokens or session logs.
import { mkdir, readFile, rename, writeFile, open, unlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
export const STATUS = {
  monitor: { blocked: 'Нет доступа к журналу Искры', observing: 'Мониторинг подключён', error: 'Ошибка чтения журнала' },
  telemetry: { local: 'Расширенный сбор подготовлен локально', deployed: 'Расширенный сбор выпущен' },
  incident: { unknown: 'Достоверных данных пока нет', detected: 'Обнаружен сбой', investigating: 'Идёт разбор', resolved: 'Восстановление проверено' },
  hotfix: { none: 'Нет подтверждённого инцидента для исправления', ready: 'Исправление подготовлено', awaiting_approval: 'Нужно согласовать исправление', approved: 'Исправление согласовано' },
  release: { not_started: 'Выпуск не начат', testing: 'Идут проверки', publishing: 'Идёт выпуск', failed: 'Выпуск остановлен', published: 'Версия выпущена', verified: 'Версия и восстановление проверены' },
}
export const DEFAULT_OUTPUT = '/Users/dany/Cursor/_Архив/Stata/public/operations/iskra.json'
export function initialStatus(at) {
  return { schema_version: 1, project: 'iskra', name: 'Искра', updated_at: at, last_checked_at: null,
    states: Object.fromEntries(Object.entries(STATUS).map(([key, labels]) => [key, { code: Object.keys(labels)[0], label: Object.values(labels)[0], at }])), history: [] }
}
export function updateStatus(previous, area, code, now = new Date().toISOString()) {
  if (!Object.hasOwn(STATUS, area) || !Object.hasOwn(STATUS[area], code)) throw new Error('Unknown Pulse area/status')
  if (previous && (previous.schema_version !== 1 || previous.project !== 'iskra')) throw new Error('Unsupported existing Pulse document')
  const next = initialStatus(now)
  // Reconstruct from known enum values; never copy arbitrary fields into a public file.
  for (const key of Object.keys(STATUS)) {
    const old = previous?.states?.[key]
    if (old && Object.hasOwn(STATUS[key], old.code)) next.states[key] = { code: old.code, label: STATUS[key][old.code], at: validDate(old.at) ? old.at : now }
  }
  next.history = (previous?.history ?? []).filter(e => Object.hasOwn(STATUS, e.area) && Object.hasOwn(STATUS[e.area], e.code) && validDate(e.at)).slice(-29)
    .map(e => ({ area: e.area, code: e.code, label: STATUS[e.area][e.code], at: e.at }))
  next.last_checked_at = validDate(previous?.last_checked_at) ? previous.last_checked_at : null
  if (next.states[area].code !== code || next.history.length === 0) {
    next.states[area] = { code, label: STATUS[area][code], at: now }
    next.history.push({ area, code, label: STATUS[area][code], at: now })
  }
  if (area === 'monitor' && code === 'observing') next.last_checked_at = now
  return next
}
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)) }
export async function publishStatus(area, code, output = DEFAULT_OUTPUT) {
  const file = resolve(output)
  await mkdir(dirname(file), { recursive: true })
  // Fail explicitly on concurrent writers; don't silently overwrite their transitions.
  const lock = await open(file + '.lock', 'wx')
  const temporary = `${file}.${process.pid}.tmp`
  try {
    let previous
    try { previous = JSON.parse(await readFile(file, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
    const next = updateStatus(previous, area, code)
    await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { mode: 0o644 })
    await rename(temporary, file)
    return next
  } finally { await lock.close(); await unlink(file + '.lock'); await unlink(temporary).catch(() => {}) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [area, code, output] = process.argv.slice(2)
  try { await publishStatus(area, code, output); console.log(`Pulse: ${area} → ${code}`) }
  catch (e) { console.error('Pulse status not delivered:', e.message); process.exitCode = 1 }
}
