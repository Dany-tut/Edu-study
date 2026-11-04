import type { LessonTimecode } from '../data/lessonContent'
import type { MontageSettings, MontageSpeaker, PauseOverride, QuietSpan } from './lessonMontage'

/** speaker — id голоса из LessonTranscript.speakers (после монтажа). */
export interface TranscriptSegment { start: number; end: number; text: string; speaker?: string }
/** Что модуль нашёл в звуке (без ИИ) и что решил преподаватель в окне монтажа. */
export interface SavedMontage {
  duration: number
  quiet: QuietSpan[]
  /** Громкость на каждые step секунд для формы волны: по байту на точку
   *  (дБ со сдвигом +128) в base64 — 48 минут ≈ 8 КБ в содержимом урока. */
  levels?: { step: number; data: string }
  settings?: MontageSettings
  overrides?: Record<string, PauseOverride>
}
export interface LessonTranscript { source: string; segments: TranscriptSegment[]; speakers?: MontageSpeaker[]; montage?: SavedMontage }
export interface LocalDraft { transcript: LessonTranscript; timecodes: LessonTimecode[] }

export class LocalTranscriptionUnavailable extends Error {}

export const transcriptionOrigin = 'http://127.0.0.1:18764'

/** 0:06, 12:30, 1:02:15 — с часами, как время глав: двухчасовой ролик не превращается в «125:30». */
export function transcriptTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function readTranscript(value: unknown): LessonTranscript | undefined {
  if (!value || typeof value !== 'object' || !('source' in value) || typeof value.source !== 'string' ||
      !('segments' in value) || !Array.isArray(value.segments) || !value.segments.length) return
  if (!value.segments.every(s => s && Number.isFinite(s.start) && s.start >= 0 &&
    Number.isFinite(s.end) && s.end > s.start && typeof s.text === 'string' && s.text.trim())) return
  const v = value as { speakers?: unknown; montage?: unknown }
  return { source: value.source, segments: value.segments,
    ...(readSpeakers(v.speakers) ? { speakers: readSpeakers(v.speakers) } : {}),
    ...(readMontage(v.montage) ? { montage: readMontage(v.montage) } : {}) }
}

function readSpeakers(value: unknown): MontageSpeaker[] | undefined {
  if (!Array.isArray(value) || !value.length) return
  return value.every(s => s && typeof s.id === 'string' && typeof s.label === 'string' && (s.role === 'teacher' || s.role === 'student') && typeof s.tone === 'string')
    ? value as MontageSpeaker[] : undefined
}

/** Ответ модуля или сохранённый монтаж; кривые данные — без монтажа, а не ошибка. */
export function readMontage(value: unknown): SavedMontage | undefined {
  if (!value || typeof value !== 'object') return
  const v = value as Record<string, unknown>
  if (!Number.isFinite(v.duration) || !Array.isArray(v.quiet)) return
  const quiet = (v.quiet as QuietSpan[]).filter(q => q && typeof q.id === 'string' && Number.isFinite(q.start) && Number.isFinite(q.end) && q.end > q.start && Number.isFinite(q.level))
  // Модуль отдаёт массив дБ (levels + step), сохранённый монтаж — уже сжатую строку.
  const raw = (v.levels && typeof v.levels === 'object' && !Array.isArray(v.levels) ? v.levels : null) as { step?: unknown; data?: unknown } | null
  const levels = Array.isArray(v.levels) && Number.isFinite(v.step) && (v.step as number) > 0 && (v.levels as unknown[]).every(Number.isFinite)
    ? { step: v.step as number, data: encodeLevels(v.levels as number[]) }
    : raw && Number.isFinite(raw.step) && (raw.step as number) > 0 && typeof raw.data === 'string' ? { step: raw.step as number, data: raw.data } : undefined
  return {
    duration: v.duration as number, quiet,
    ...(levels ? { levels } : {}),
    ...(v.settings && typeof v.settings === 'object' ? { settings: v.settings as MontageSettings } : {}),
    ...(v.overrides && typeof v.overrides === 'object' ? { overrides: v.overrides as Record<string, PauseOverride> } : {}),
  }
}

export async function localRequest(path: string, token: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('X-Iskra-Module', 'transcription-v1')
  if (token) headers.set('Authorization', 'Bearer ' + token)
  let response: Response
  try {
    response = await fetch(transcriptionOrigin + path, { ...options, headers, cache: 'no-store',
      signal: options.signal ?? (!options.method || options.method === 'GET' ? AbortSignal.timeout(15000) : undefined) })
  } catch {
    throw new LocalTranscriptionUnavailable('Нет связи с модулем на этом Mac. Откройте start.command, дождитесь строки Running on и оставьте Терминал открытым до конца обработки.')
  }
  if (response.status === 403) throw new Error('Проверьте адрес приложения и подключите модуль заново.')
  if (response.status === 404) throw new Error('Обработка больше не доступна. Запустите её снова.')
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ||
    (response.status === 413 ? 'Размер видео превышает 2 ГиБ.' : 'Не удалось связаться с модулем.'))
  return response.status === 204 ? {} : response.json()
}

export function encodeLevels(db: number[]) {
  let bin = ''
  for (const d of db) bin += String.fromCharCode(Math.max(0, Math.min(255, Math.round(d) + 128)))
  return btoa(bin)
}

export function decodeLevels(data: string): number[] {
  try { return Array.from(atob(data), c => c.charCodeAt(0) - 128) } catch { return [] }
}
