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

/** Один прикреплённый файл. `path` — ключ объекта в бакете. */
export interface LessonFile {
  id: string
  name: string
  path: string
  size: number
  mime: string
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
    super(`${t('Файл')} ${(bytes / 1024 / 1024).toFixed(1)} ${t('МБ')} — ${t('больше')} ${(MAX_LESSON_FILE_BYTES / 1024 / 1024).toFixed(0)} ${t('МБ')}`)
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

/** Есть ли у урока хоть один файл — по этому флагу плитки становятся активными. */
export function hasLessonFiles(files: LessonFiles): boolean {
  return !!(files.workbook || files.notebook || files.materials?.length)
}

/**
 * Заливает файл в бакет и возвращает его метаданные. Владелец объекта —
 * загрузивший учитель: писать и удалять в бакете может только он (RLS).
 */
export async function uploadLessonFile(file: File): Promise<LessonFile> {
  if (file.size > MAX_LESSON_FILE_BYTES) throw new LessonFileTooLargeError(file.size)

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
  if (!path) return
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
