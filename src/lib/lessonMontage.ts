// ─────────────────────────────────────────────────────────────────────────────
// Монтаж записи урока: паузы и говорящие поверх расшифровки
//
// ПАУЗЫ БЕЗ ИИ. Локальный модуль отдаёт «тихие отрезки» с уровнем громкости
// (ffmpeg silencedetect / RMS по кадрам). Здесь только арифметика: порог,
// минимальная длина, запас по краям. Тишина ниже −50 дБ — пусто (вырезать),
// выше — тихая работа: ученики решают, шуршат, учитель пишет на доске
// (ускорить: кадр может быть содержательным, хоть звука и нет).
//
// ВИДЕО НЕ ПЕРЕКОДИРУЕМ. Монтаж — список отрезков; плеер перепрыгивает
// вырезанное и ускоряет ускоренное. Ссылку на YouTube или Диск иначе не
// смонтировать, а любая правка остаётся обратимой.
//
// ГОВОРЯЩИЕ. Голоса приходят безымянными кластерами («Голос 1…»). Учитель —
// тот, кто говорит больше всех; остальные — ученики по порядку первой реплики.
// Преподаватель переименовывает голос, меняет роль, склеивает разбитый голос.
// ─────────────────────────────────────────────────────────────────────────────

export type SpeakerRole = 'teacher' | 'student'
export type SpeakerTone = 'purple' | 'blue' | 'teal' | 'peach' | 'rose' | 'green'
export interface MontageSpeaker { id: string; label: string; role: SpeakerRole; tone: SpeakerTone }
export interface MontageLine { id: string; start: number; end: number; text: string; speaker: string }

/** Тихий отрезок, как его отдаёт модуль: без решений преподавателя. */
export interface QuietSpan { id: string; start: number; end: number; level: number }
export type PauseKind = 'silence' | 'quiet'
export type PauseAction = 'cut' | 'speed' | 'keep'
export interface MontagePause { id: string; start: number; end: number; level: number; kind: PauseKind; action: PauseAction; edited: boolean }
export interface PauseOverride { start?: number; end?: number; action?: PauseAction }

export type Sensitivity = 'strict' | 'normal' | 'loud'
export interface MontageSettings {
  /** Короче — не пауза, а обычная заминка речи. */
  minPause: number
  sensitivity: Sensitivity
  /** Сколько секунд тишины оставить у каждого края, чтобы речь не обрывалась. */
  padding: number
  quietAction: PauseAction
  speed: 2 | 4 | 8
}

export const DEFAULT_SETTINGS: MontageSettings = { minPause: 20, sensitivity: 'normal', padding: 0.5, quietAction: 'speed', speed: 4 }
export const THRESHOLD: Record<Sensitivity, number> = { strict: -50, normal: -40, loud: -32 }
export const SILENCE_LEVEL = -50

export interface LessonMontage {
  duration: number
  speakers: MontageSpeaker[]
  lines: MontageLine[]
  pauses: MontagePause[]
  settings: MontageSettings
}

export function detectPauses(spans: QuietSpan[], settings: MontageSettings, overrides: Record<string, PauseOverride> = {}): MontagePause[] {
  const threshold = THRESHOLD[settings.sensitivity]
  return spans.filter(s => s.level <= threshold && s.end - s.start >= settings.minPause).map(s => {
    const o = overrides[s.id] ?? {}
    const kind: PauseKind = s.level <= SILENCE_LEVEL ? 'silence' : 'quiet'
    const start = o.start ?? s.start + settings.padding
    const end = o.end ?? s.end - settings.padding
    const action = o.action ?? (kind === 'silence' ? 'cut' : settings.quietAction)
    return { id: s.id, start, end, level: s.level, kind, action, edited: o.start != null || o.end != null }
  }).sort((a, b) => a.start - b.start)
}

/** Сколько секунд отрезок займёт после монтажа. */
export function pausePlayed(p: Pick<MontagePause, 'start' | 'end' | 'action'>, speed: number) {
  const length = p.end - p.start
  return p.action === 'cut' ? 0 : p.action === 'speed' ? length / speed : length
}

export function editedDuration(duration: number, pauses: MontagePause[], speed: number) {
  return pauses.reduce((total, p) => total - (p.end - p.start) + pausePlayed(p, speed), duration)
}

/** Время исходной записи → время смонтированного урока (для глав и таймкодов). */
export function toEditedTime(t: number, pauses: MontagePause[], speed: number) {
  let shift = 0
  for (const p of pauses) {
    if (t <= p.start) break
    const inside = Math.min(t, p.end) - p.start
    shift += inside - pausePlayed({ start: p.start, end: p.start + inside, action: p.action }, speed)
  }
  return t - shift
}

/** Что делает плеер в момент t: играет, ускоряет или перепрыгивает. */
export function playbackAt(t: number, pauses: MontagePause[]): { pause?: MontagePause; rate: 'normal' | 'speed' | 'skip' } {
  const pause = pauses.find(p => t >= p.start && t < p.end && p.action !== 'keep')
  return { pause, rate: !pause ? 'normal' : pause.action === 'cut' ? 'skip' : 'speed' }
}

/** Реплики, которые задевает вырезанный или ускоренный отрезок. */
export function linesHit(pause: Pick<MontagePause, 'start' | 'end'>, lines: MontageLine[]) {
  return lines.filter(l => l.end > pause.start + 0.05 && l.start < pause.end - 0.05)
}

export function talkTime(lines: MontageLine[]) {
  const total: Record<string, number> = {}
  for (const l of lines) total[l.speaker] = (total[l.speaker] ?? 0) + l.end - l.start
  return total
}

/** Учитель — кто говорит больше всех, ученики нумеруются по первой реплике. */
export function labelVoices(voices: string[], lines: MontageLine[]): MontageSpeaker[] {
  const time = talkTime(lines)
  const teacher = [...voices].sort((a, b) => (time[b] ?? 0) - (time[a] ?? 0))[0]
  const first = (id: string) => lines.find(l => l.speaker === id)?.start ?? Infinity
  const tones: SpeakerTone[] = ['blue', 'teal', 'peach', 'rose', 'green']
  const students = voices.filter(v => v !== teacher).sort((a, b) => first(a) - first(b))
  return [
    { id: teacher, label: 'Учитель', role: 'teacher', tone: 'purple' },
    ...students.map((id, i) => ({ id, label: `Ученик ${i + 1}`, role: 'student' as const, tone: tones[i % tones.length] })),
  ]
}

export function mergeSpeaker(montage: Pick<LessonMontage, 'speakers' | 'lines'>, from: string, into: string) {
  return {
    speakers: montage.speakers.filter(s => s.id !== from),
    lines: montage.lines.map(l => l.speaker === from ? { ...l, speaker: into } : l),
  }
}

export function clock(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

/** Шаг делений шкалы под длину видимого окна: от 10 мс до 15 минут. */
const TICK_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 900]
export function tickStep(length: number, maxTicks = 6) {
  return TICK_STEPS.find(x => length / x <= maxTicks) ?? 900
}
/** Сколько знаков после секунд нужно при таком шаге: 0, 1 или 2. */
export function tickDigits(step: number) {
  return step < 0.1 ? 2 : step < 1 ? 1 : 0
}
/** Время с долями секунды при глубоком масштабе: «1:31.25». */
export function clockFine(seconds: number, digits = 0) {
  if (!digits) return clock(seconds)
  const k = 10 ** digits, total = Math.round(Math.max(0, seconds) * k) / k
  const whole = Math.floor(total + 1e-9)
  return clock(whole) + (total - whole).toFixed(digits).slice(1)
}
/** Деления шкалы: крупные (с подписью) и мелкие засечки между ними. */
export function rulerTicks(from: number, to: number, maxTicks = 6) {
  const step = tickStep(to - from, maxTicks), minor = step / 5
  const range = (st: number) => {
    const first = Math.ceil(from / st - 1e-9), last = Math.floor(to / st + 1e-9)
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => +((first + i) * st).toFixed(4))
  }
  const major = range(step)
  return { step, digits: tickDigits(step), major, minor: range(minor).filter(m => !major.some(M => Math.abs(M - m) < minor / 2)) }
}

/** Длительность словами: «2 мин 30 с», «45 с». */
export function span(seconds: number) {
  const s = Math.round(seconds), m = Math.floor(s / 60), r = s % 60
  return m ? (r ? `${m} мин ${r} с` : `${m} мин`) : `${r} с`
}

/** План для плеера ученика: что перепрыгнуть и что ускорить. Пусто, пока
 *  преподаватель не применил монтаж (нет settings): найденные паузы сами по
 *  себе ничего не вырезают. */
export function playbackPlan(saved: { quiet: QuietSpan[]; settings?: MontageSettings; overrides?: Record<string, PauseOverride> } | undefined) {
  if (!saved?.settings) return undefined
  const pauses = detectPauses(saved.quiet, saved.settings, saved.overrides ?? {})
  const skip = pauses.filter(p => p.action === 'cut').map(p => [p.start, p.end] as [number, number])
  const fast = pauses.filter(p => p.action === 'speed').map(p => [p.start, p.end, saved.settings!.speed] as [number, number, number])
  return skip.length || fast.length ? { skip, fast } : undefined
}
