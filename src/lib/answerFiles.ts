// Файлы в ответе на сложное (практическое) задание: XLSX, PDF, DOCX, CSV, ZIP…
//
// Решение Дани (26.11.2026): практические задания курсов — «Бухгалтерия» и
// любых других — сдаются заполненным файлом, как домашка. Фото и доска для
// этого не годятся: учителю нужен сам документ, чтобы открыть его в Excel.
//
// Файл лежит в приватном бакете `homework-answer-files` (миграция
// 20261126150000). В JSONB решения (lesson_progress.attachments → tasks →
// solutions[].files) пишем ПУТЬ объекта и подпись — имя, размер, тип. Ссылку
// не храним: подписанная ссылка живёт час и собирается при показе.
//
// Путь: <auth uid ученика>/<students.id карточки>/<мс>-<uuid>.<ext>. Как у фото
// ДЗ (homeworkPhotos.ts): uid проверяется RLS без запросов, id карточки — чтобы
// читал только учитель ЭТОЙ карточки (её автор или владелец её группы),
// а не каждый, кто ведёт того же человека по другому предмету.
//
// Срока хранения нет: это работа ученика, а не фото лица. Подменить файл
// задним числом нельзя (UPDATE запрещён), удалить может только загрузивший —
// пока решение не отправлено, «×» в черновике снимает объект.

import { supabase } from './supabase'
import { supabaseMediaUrl } from './supabaseFailover'
import { getSessionUser } from './owner'
import { personalDemoOwner } from './personalStudentDemo'
import { t } from './i18n'

export const ANSWER_FILES_BUCKET = 'homework-answer-files'
/** Совпадает с file_size_limit бакета. */
export const MAX_ANSWER_FILE_BYTES = 20 * 1024 * 1024
/** Сколько файлов в одном решении. Больше — значит, пора в ZIP. */
export const MAX_ANSWER_FILES = 5

/** Один файл в решении. `path` — ключ объекта в бакете (или `blob:` в демо). */
export interface AnswerFile {
  path: string
  name: string
  size: number
  mime: string
}

/**
 * Разрешённые расширения → тип, с которым файл кладётся в бакет. Список тот же,
 * что allowed_mime_types бакета. Тип берём ПО РАСШИРЕНИЮ, а не из File.type:
 * Android и Safari отдают для .xlsx то пустую строку, то octet-stream.
 * HTML, SVG и исполняемых нет: подписанная ссылка открылась бы на домене
 * хранилища как страница.
 */
export const ANSWER_FILE_TYPES: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  csv: 'text/csv',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  txt: 'text/plain',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  zip: 'application/zip',
}

/** `accept` для <input type="file">: расширения + типы (iOS понимает типы). */
export const ANSWER_FILE_ACCEPT = [
  ...Object.keys(ANSWER_FILE_TYPES).map(e => `.${e}`),
  ...new Set(Object.values(ANSWER_FILE_TYPES)),
].join(',')

export function answerFileExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export class AnswerFileError extends Error {
  constructor(message: string, public code: 'too_large' | 'type' | 'count' | 'auth' | 'upload') {
    super(message)
    this.name = 'AnswerFileError'
  }
}

/** Проверка до загрузки — ради внятной ошибки вместо сырого 413/415 хранилища. */
export function validateAnswerFile(file: { name: string; size: number }): AnswerFileError | null {
  if (!ANSWER_FILE_TYPES[answerFileExt(file.name)]) {
    return new AnswerFileError(`«${file.name}» — ${t('такой тип файла не принимается. Подойдут XLSX, PDF, DOCX, CSV, ZIP')}`, 'type')
  }
  if (file.size > MAX_ANSWER_FILE_BYTES) {
    return new AnswerFileError(`«${file.name}» — ${formatAnswerFileSize(file.size)}, ${t('больше 20 МБ. Сожмите в ZIP или разделите на части')}`, 'too_large')
  }
  return null
}

/**
 * Загрузить файл ответа и вернуть его подпись для JSONB. Вызывается сразу при
 * выборе файла: 20 МБ по мобильной связи — это секунды, и ждать их на кнопке
 * «Отправить» хуже, чем видеть «Загружаю…» на карточке.
 */
export async function uploadAnswerFile(file: File, studentId: string): Promise<AnswerFile> {
  const bad = validateAnswerFile(file)
  if (bad) throw bad
  const ext = answerFileExt(file.name)
  const mime = ANSWER_FILE_TYPES[ext]
  // Демо-кабинет ничего не пишет в базу: файл живёт в памяти вкладки.
  if (personalDemoOwner()) return { path: URL.createObjectURL(file), name: file.name, size: file.size, mime }
  // Папка = auth.uid() (так проверяет RLS), не getOwnerId: тот подменяется
  // при админском «просмотре кабинета».
  const uid = (await getSessionUser())?.id
  if (!uid) throw new AnswerFileError(t('Войдите заново, чтобы прикрепить файл'), 'auth')
  const path = `${uid}/${studentId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(ANSWER_FILES_BUCKET).upload(path, file, { contentType: mime, upsert: false })
  if (error) throw new AnswerFileError(t('Файл не загрузился — проверьте связь и повторите'), 'upload')
  return { path, name: file.name.slice(0, 200), size: file.size, mime }
}

/** Снять загруженный, но не отправленный файл (× в черновике). Тихо: сирота не ломает экран. */
export async function deleteAnswerFile(path: string): Promise<void> {
  if (!path || path.startsWith('blob:')) return
  const { error } = await supabase.storage.from(ANSWER_FILES_BUCKET).remove([path])
  if (error) console.error('[answerFiles] remove failed', error)
}

/** Разбор `files` из JSONB решения. Форме не доверяем — мусор отбрасываем. */
export function parseAnswerFiles(raw: unknown): AnswerFile[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(v => {
    if (!v || typeof v !== 'object') return []
    const f = v as Record<string, unknown>
    if (typeof f.path !== 'string' || !f.path) return []
    const name = typeof f.name === 'string' && f.name ? f.name : t('Файл')
    return [{
      path: f.path,
      name,
      size: typeof f.size === 'number' ? f.size : 0,
      mime: typeof f.mime === 'string' ? f.mime : (ANSWER_FILE_TYPES[answerFileExt(name)] ?? ''),
    }]
  })
}

// ── Ссылки ──────────────────────────────────────────────────────────────────
// Подписанные ссылки живут час; кешируем, чтобы перерисовки не ходили в сеть.
// Ссылка нужна ДО нажатия: карточка — настоящая <a href>, иначе Safari сочтёт
// открытие после await всплывающим окном и заблокирует его.
const SIGN_TTL_S = 3600
const signed = new Map<string, { url: string; until: number }>()

/** PDF и текст браузер покажет сам — «Открыть»; таблицы и архивы — «Скачать». */
export function answerFileOpensInline(f: Pick<AnswerFile, 'name'>): boolean {
  return ['pdf', 'txt', 'csv'].includes(answerFileExt(f.name))
}

/**
 * Подписанная ссылка на файл. `download` — с Content-Disposition: attachment и
 * настоящим именем (иначе файл скачается как «1732…-uuid.xlsx»). null — файла
 * нет или нет доступа (чужой файл RLS не подпишет).
 */
export async function answerFileUrl(f: AnswerFile, download: boolean): Promise<string | null> {
  if (f.path.startsWith('blob:')) return f.path
  const uid = (await getSessionUser())?.id ?? 'anon'
  const key = `${uid}:${download ? 'd' : 'o'}:${f.path}`
  const hit = signed.get(key)
  if (hit && hit.until > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from(ANSWER_FILES_BUCKET)
    .createSignedUrl(f.path, SIGN_TTL_S, download ? { download: f.name } : undefined)
  if (error || !data) { console.error('[answerFiles] sign failed', error); return null }
  const url = supabaseMediaUrl(data.signedUrl)
  signed.set(key, { url, until: Date.now() + (SIGN_TTL_S - 120) * 1000 })
  return url
}

// ── Подпись карточки ────────────────────────────────────────────────────────

export function formatAnswerFileSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} ${t('Б')}`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${t('КБ')}`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} ${t('МБ')}`
}

/** Что это за файл словами — вторая строка карточки. */
export function answerFileKind(name: string): string {
  const ext = answerFileExt(name)
  if (['xlsx', 'xls', 'ods'].includes(ext)) return t('Таблица')
  if (ext === 'csv') return t('Таблица CSV')
  if (ext === 'pdf') return 'PDF'
  if (['docx', 'doc', 'odt', 'rtf'].includes(ext)) return t('Документ')
  if (['pptx', 'ppt'].includes(ext)) return t('Презентация')
  if (ext === 'zip') return t('Архив')
  if (ext === 'txt') return t('Текст')
  return t('Файл')
}

/** Метка на значке — расширение (до 4 букв). Цвета — как у файлов урока. */
export function answerFileChip(name: string): { label: string; background: string } {
  const ext = answerFileExt(name)
  const label = ext && ext.length <= 4 ? ext.toUpperCase() : t('ФАЙЛ')
  let background = 'linear-gradient(135deg, #A8B0C0, #6B7280)'
  if (ext === 'pdf') background = 'linear-gradient(135deg, #FF8A8A, #D93A3A)'
  else if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) background = 'linear-gradient(135deg, #6EC6FF, #2D6BE0)'
  else if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) background = 'linear-gradient(135deg, #6EE7A0, #1E9E63)'
  else if (['ppt', 'pptx'].includes(ext)) background = 'linear-gradient(135deg, #FFB86E, #E07B1E)'
  return { label, background }
}
