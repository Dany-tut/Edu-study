// Файлы урока — рабочая тетрадь, конспект-PDF, справочные материалы.
//
// Живут в бакете `lesson-materials` (миграция 0056): сам файл в Storage, а
// метаданные — в lessons.materials. В JSONB кладём ПУТЬ объекта, а не ссылку:
// путь стабилен, ссылка на публичный бакет собирается из него в момент показа.
//
// Раньше «прикрепления» не существовало: редакторы запоминали имя выбранного
// файла в черновике браузера, а ученику плитка «скачать» отдавала PDF,
// сгенерированный на лету в JS.

import { supabase } from './supabase'
import { t } from './i18n'
import { getOwnerId } from './owner'

const BUCKET = 'lesson-materials'

/** Один прикреплённый файл. `path` — ключ объекта в бакете.
 *
 *  Или ссылка на файл снаружи (`url`: Google Диск, Яндекс Диск) — так
 *  прикрепляют то, что больше лимита бакета: тетрадь из сканов весит сотни МБ,
 *  а бесплатный Supabase не примет файл больше 50 МБ и отдаёт 5 ГБ в месяц.
 *  У ссылки `path` = сама ссылка: по нему файл ищут при удалении из слота. */
export interface LessonFile {
  id: string
  name: string
  path: string
  size: number
  mime: string
  url?: string
  /** Файл лежит в Cloudflare R2 (больше лимита бакета, см. функцию r2-upload):
   *  `url` — его публичный адрес, но имя и размер настоящие, это не ссылка. */
  r2?: boolean
}

/** Внешняя ссылка, которую вставил учитель, — не файл с известным размером. */
export function isLinkFile(f: LessonFile): boolean {
  return !!f.url && !f.r2
}

/** Содержимое lessons.materials. Все поля необязательны — урок без файлов
 *  хранит `{}`, и плитки у ученика рисуются неактивными. */
export interface LessonFiles {
  workbook?: LessonFile
  notebook?: LessonFile
  materials?: LessonFile[]
}

/** Совпадает с file_size_limit бакета. Проверяем и на клиенте — ради внятной
 *  ошибки вместо сырого 413 из Storage. */
export const MAX_LESSON_FILE_BYTES = 25 * 1024 * 1024

export class LessonFileTooLargeError extends Error {
  constructor(public bytes: number) {
    super(`${t('Файл')} ${(bytes / 1024 / 1024).toFixed(1)} ${t('МБ')} — ${t('больше')} ${(MAX_LESSON_FILE_BYTES / 1024 / 1024).toFixed(0)} ${t('МБ')}. ${t('Прикрепите ссылкой на Google Диск')}`)
    this.name = 'LessonFileTooLargeError'
  }
}

/** Расширение из имени файла — им подписывается объект в бакете, чтобы браузер
 *  и Storage видели знакомый тип. */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'
}

/** Разбор lessons.materials из БД. Не доверяем форме: колонка старая, в ней
 *  мог оказаться массив или мусор — тогда читаем как «файлов нет». */
export function parseLessonFiles(raw: unknown): LessonFiles {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const r = raw as Record<string, unknown>
  const one = (v: unknown): LessonFile | undefined => {
    if (!v || typeof v !== 'object') return undefined
    const f = v as Record<string, unknown>
    if (typeof f.path !== 'string' || !f.path) return undefined
    if (typeof f.url === 'string' && f.r2 === true) {
      return isHttpUrl(f.url) ? {
        id: typeof f.id === 'string' ? f.id : f.path,
        name: typeof f.name === 'string' && f.name ? f.name : t('Файл'),
        path: f.path,
        size: typeof f.size === 'number' ? f.size : 0,
        mime: typeof f.mime === 'string' ? f.mime : '',
        url: f.url,
        r2: true,
      } : undefined
    }
    if (typeof f.url === 'string') {
      return isHttpUrl(f.url) ? linkFile(f.url, typeof f.name === 'string' ? f.name : '', typeof f.id === 'string' ? f.id : undefined) : undefined
    }
    return {
      id: typeof f.id === 'string' ? f.id : f.path,
      name: typeof f.name === 'string' && f.name ? f.name : t('Файл'),
      path: f.path,
      size: typeof f.size === 'number' ? f.size : 0,
      mime: typeof f.mime === 'string' ? f.mime : '',
    }
  }
  const list = Array.isArray(r.materials)
    ? (r.materials as unknown[]).map(one).filter((f): f is LessonFile => !!f)
    : []
  const out: LessonFiles = {}
  const wb = one(r.workbook); if (wb) out.workbook = wb
  const nb = one(r.notebook); if (nb) out.notebook = nb
  if (list.length) out.materials = list
  return out
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch { return false }
}

/** Подпись ссылки, пока учитель не дал своей: где лежит файл. */
function linkName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '')
  if (/(^|\.)(drive|docs)\.google\.com$/.test(host)) return t('Google Диск')
  if (/^disk\.yandex\./.test(host) || host === 'yadi.sk') return t('Яндекс Диск')
  if (/(^|\.)dropbox\.com$/.test(host)) return 'Dropbox'
  if (/(^|\.)cloud\.mail\.ru$/.test(host)) return t('Облако Mail')
  return host
}

function linkFile(url: string, name: string, id?: string): LessonFile {
  return { id: id ?? crypto.randomUUID(), name: name.trim() || linkName(url), path: url, size: 0, mime: 'text/uri-list', url }
}

/** Ссылка, вставленная учителем, → файл урока. null — это не ссылка. */
export function makeLinkFile(raw: string): LessonFile | null {
  let s = raw.trim()
  if (!s) return null
  if (!/^[a-z]+:\/\//i.test(s)) s = `https://${s}`
  if (!isHttpUrl(s) || !new URL(s).hostname.includes('.')) return null
  return linkFile(s, '')
}

/** Есть ли у урока хоть один файл — по этому флагу плитки становятся активными. */
export function hasLessonFiles(files: LessonFiles): boolean {
  return !!(files.workbook || files.notebook || files.materials?.length)
}

/**
 * Заливает файл в бакет и возвращает его метаданные. Владелец объекта —
 * загрузивший учитель: писать и удалять в бакете может только он (RLS).
 */
export async function uploadLessonFile(file: File): Promise<LessonFile> {
  if (file.size > MAX_LESSON_FILE_BYTES) return uploadLessonFileToR2(file)

  const uid = await getOwnerId()
  if (!uid) throw new Error(t('Не авторизован — войдите заново'))

  const id = crypto.randomUUID()
  const path = `${uid}/${id}.${extOf(file.name)}`
  const mime = file.type || 'application/octet-stream'

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mime,
    upsert: false,
  })
  if (error) throw error

  return { id, name: file.name, path, size: file.size, mime }
}

/**
 * Большой файл — в Cloudflare R2: функция r2-upload подписывает PUT-ссылку,
 * файл идёт из браузера прямо в R2, мимо Supabase. Пока R2 не подключён
 * (функция отвечает notConfigured), остаётся прежняя ошибка «больше 25 МБ» с
 * советом прикрепить ссылкой на Диск.
 */
async function uploadLessonFileToR2(file: File): Promise<LessonFile> {
  const mime = file.type || 'application/octet-stream'
  const { data, error } = await supabase.functions.invoke('r2-upload', {
    body: { name: file.name, size: file.size, mime },
  })
  if (error) {
    // Ответ не-2xx supabase-js прячет в error.context (см. cardImport.ts).
    const context = (error as { context?: unknown }).context
    const said = context instanceof Response
      ? await context.clone().json().catch(() => undefined) as { error?: string; notConfigured?: boolean } | undefined
      : undefined
    if (!said || said.notConfigured) throw new LessonFileTooLargeError(file.size)
    throw new Error(said.error || error.message)
  }
  const { uploadUrl, publicUrl } = (data ?? {}) as { uploadUrl?: string; publicUrl?: string }
  if (!uploadUrl || !publicUrl) throw new LessonFileTooLargeError(file.size)

  const res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': mime } })
  if (!res.ok) throw new Error(`${t('не удалось загрузить')} (R2 ${res.status})`)

  return { id: crypto.randomUUID(), name: file.name, path: publicUrl, size: file.size, mime, url: publicUrl, r2: true }
}

/**
 * Скачивание под настоящим именем файла.
 *
 * Тянем blob и сохраняем его сами: атрибут `download` на кросс-origin ссылке
 * браузер игнорирует — файл открылся бы в соседней вкладке под именем-uuid.
 *
 * Бакет публичный на чтение, поэтому запрос проходит и без сессии Supabase
 * Auth: часть учеников входит легаси-логином (RPC student_login), и приватный
 * бакет им бы ничего не отдал.
 */
export async function downloadLessonFile(file: LessonFile): Promise<void> {
  // Внешнюю ссылку открываем как есть: Диск сам покажет файл и кнопку «скачать».
  // Файл из R2 — тоже вкладкой: тянуть сотни МБ в blob телефону не по силам.
  if (file.url) {
    window.open(file.url, '_blank', 'noopener,noreferrer')
    return
  }
  const { data, error } = await supabase.storage.from(BUCKET).download(file.path)
  if (error || !data) throw error ?? new Error(t('Файл не найден'))
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Удаление объекта (только владелец, по RLS). Ошибку не роняем наверх: запись
 *  в уроке уже снята, осиротевший объект не ломает экран. */
export async function deleteLessonFile(path: string): Promise<void> {
  if (!path || /^https?:\/\//.test(path)) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('[lessonFiles] remove failed', error)
}

/** Человекочитаемый размер для подписи плитки. */
export function formatFileSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} ${t('Б')}`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${t('КБ')}`
  return `${(bytes / 1024 / 1024).toFixed(1)} ${t('МБ')}`
}
