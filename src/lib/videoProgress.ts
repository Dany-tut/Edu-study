// ─────────────────────────────────────────────────────────────────────────────
// Прогресс просмотра записи урока
//
// ЗАЧЕМ. Ученик закрывает вкладку на середине ролика и возвращается назавтра:
// без этого модуля он каждый раз начинает с нуля и сам ищет, где остановился.
// Плюс преподавателю важно знать, что запись реально посмотрели.
//
// ПОЧЕМУ НЕ ОДНА ЦИФРА «ПОЗИЦИЯ». Позиция врёт в обе стороны: перемотал в конец
// — «просмотрено», хотя не смотрел; посмотрел всё и отмотал назад послушать
// момент — «на 20%». Поэтому храним МНОЖЕСТВО отсмотренных отрезков и считаем
// покрытие по ним. Отрезок растёт только когда время идёт само, шагами не
// длиннее MAX_STEP: прыжок ползунком разрывает отрезок и ничего не заполняет,
// так что «перетащил в конец» даёт покрытие около нуля. Ускорение не наказываем
// — на 2× секунды ролика идут вдвое быстрее, но покрытие то же.
//
// КУДА ПИШЕМ. В lesson_progress, строка с ключом `video-<lessonId>` — тем же
// приёмом, что и голосовые ответы тренажёра (`trainer-speaking-<предмет>`):
// таблица уже открыта ученику по RLS, миграция не нужна. Статус строки НЕ
// трогаем (остаётся дефолтный 'locked'): триггер уведомлений реагирует на
// переходы в submitted/completed, и просмотр видео не должен слать
// преподавателю «новая работа на проверку».
//
// БЕЗ СЕССИИ (демо, превью) прогресс живёт в localStorage — экран ведёт себя
// одинаково, просто не переезжает на другое устройство.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'

/** Отсмотренный отрезок ролика, секунды: [начало, конец]. */
export type WatchRange = [number, number]

export interface VideoWatch {
  /** Где стоял плейхед в последний раз — точка «продолжить просмотр». */
  position: number
  /** Длительность ролика в секундах; 0 — плеер её ещё не сообщил. */
  duration: number
  /** Отсмотренное: отсортированные непересекающиеся отрезки. */
  ranges: WatchRange[]
  /** Просмотр засчитан (покрытие дошло до COMPLETE_RATIO). Не сбрасывается. */
  completed: boolean
  updatedAt: string
}

/** Доля ролика, после которой просмотр засчитан. Хвост с титрами не требуем. */
export const COMPLETE_RATIO = 0.9
/** Отрезки короче этого не запоминаем — это дрожание таймера, не просмотр. */
const MIN_SEGMENT = 0.35
/** Шаг больше этого = перемотка: отрезок разрывается, промежуток не засчитан. */
export const MAX_STEP = 2.5
/** Дырка короче — склеиваем: иначе массив отрезков растёт без конца. */
const GAP_EPS = 1

export function emptyWatch(): VideoWatch {
  return { position: 0, duration: 0, ranges: [], completed: false, updatedAt: '' }
}

/** Ключ строки lesson_progress для просмотра записи урока. */
export function videoWatchRef(lessonId: string): string {
  return `video-${lessonId}`
}

/** Строка прогресса относится к видео, а не к домашке. */
export function isVideoWatchRef(ref: string): boolean {
  return ref.startsWith('video-')
}

/** Добавить отсмотренный отрезок и склеить пересечения. Возвращает новый массив. */
export function addWatched(ranges: WatchRange[], from: number, to: number): WatchRange[] {
  const a = Math.max(0, Math.min(from, to))
  const b = Math.max(0, Math.max(from, to))
  if (b - a < MIN_SEGMENT) return ranges

  const all = [...ranges, [a, b] as WatchRange].sort((x, y) => x[0] - y[0])
  const merged: WatchRange[] = []
  for (const [s, e] of all) {
    const last = merged[merged.length - 1]
    if (last && s - last[1] <= GAP_EPS) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }
  return merged
}

/** Сколько секунд ролика реально отсмотрено (без повторов). */
export function watchedSeconds(ranges: WatchRange[]): number {
  return ranges.reduce((sum, [a, b]) => sum + (b - a), 0)
}

/** Доля просмотра 0…1. Пока длительность неизвестна — 0. */
export function watchRatio(w: VideoWatch): number {
  if (!w.duration) return 0
  return Math.min(1, watchedSeconds(w.ranges) / w.duration)
}

/** Пересчитать флаг «засчитано» после очередного отрезка (только вверх). */
export function withCompletion(w: VideoWatch): VideoWatch {
  const done = w.completed || (w.duration > 0 && watchRatio(w) >= COMPLETE_RATIO)
  return done === w.completed ? w : { ...w, completed: done }
}

/** Есть ли откуда продолжать: смотрели больше минуты и не досмотрели до конца. */
export function hasResumePoint(w: VideoWatch): boolean {
  return w.position > 45 && (!w.duration || w.position < w.duration - 20)
}

/** «9:39» / «1:03:43» — часы появляются только когда они есть. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

// ── Хранение ────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const localKey = (lessonId: string) => `video-watch:${lessonId}`

function readLocal(lessonId: string): VideoWatch {
  try {
    const raw = localStorage.getItem(localKey(lessonId))
    if (!raw) return emptyWatch()
    return { ...emptyWatch(), ...(JSON.parse(raw) as VideoWatch) }
  } catch { return emptyWatch() }
}

function writeLocal(lessonId: string, w: VideoWatch): void {
  try { localStorage.setItem(localKey(lessonId), JSON.stringify(w)) } catch { /* приватный режим */ }
}

/**
 * Прогресс просмотра урока. Локальная копия — не только фолбэк для демо:
 * она отдаёт позицию мгновенно, до ответа сети, поэтому «продолжить с 9:39»
 * не мигает при открытии страницы.
 */
export async function loadVideoWatch(studentId: string, lessonId: string): Promise<VideoWatch> {
  const local = readLocal(lessonId)
  if (!UUID_RE.test(studentId)) return local

  const { data } = await supabase
    .from('lesson_progress')
    .select('attachments')
    .eq('student_id', studentId)
    .eq('lesson_ref', videoWatchRef(lessonId))
    .maybeSingle()

  const remote = (data?.attachments as { video?: VideoWatch } | null)?.video
  if (!remote) return local
  // Побеждает более свежая запись: на другом устройстве могли уйти дальше.
  return (remote.updatedAt ?? '') >= (local.updatedAt ?? '') ? { ...emptyWatch(), ...remote } : local
}

export async function saveVideoWatch(
  studentId: string,
  lessonId: string,
  subject: string,
  w: VideoWatch,
): Promise<void> {
  const next: VideoWatch = { ...w, updatedAt: new Date().toISOString() }
  writeLocal(lessonId, next)
  if (!UUID_RE.test(studentId)) return

  await supabase.from('lesson_progress').upsert({
    student_id: studentId,
    lesson_ref: videoWatchRef(lessonId),
    subject,
    // status намеренно не передаём — у новой строки останется дефолтный
    // 'locked', и триггер уведомлений её не заметит.
    attachments: { v: 1, video: next },
    updated_at: next.updatedAt,
  }, { onConflict: 'student_id,lesson_ref' })
}
