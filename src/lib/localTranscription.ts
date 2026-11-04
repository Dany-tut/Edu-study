import type { LessonTimecode } from '../data/lessonContent'

export interface TranscriptSegment { start: number; end: number; text: string }
export interface LessonTranscript { source: string; segments: TranscriptSegment[] }
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
  return { source: value.source, segments: value.segments }
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
