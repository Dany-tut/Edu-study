// ─────────────────────────────────────────────────────────────────────────────
// Ответ на задание «посмотреть видео»
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Просмотр — единственный ответ, который не печатают:
// его набирает плеер, а хранится он там же, где текстовые ответы домашки, —
// одной строкой. Кодек этой строки нужен сразу трём сторонам: решателю
// (HomeworkFlow), проверке (data/taskTypes.ts) и экрану учителя, который
// показывает «просмотрено 6:12 из 8:00». Держать его в data/ нельзя — там
// не место логике плеера, а в videoProgress.ts тянется supabase.
//
// ФОРМАТ. `w=<просмотрено>;p=<позиция>;d=<длительность>;r=<отрезки>`, секунды
// целыми, отрезки — `0-120_140-300`.
// Человекочитаемо в логах и в БД, переживает JSON-сериализацию домашки и
// разбирается назад без схемы. Позиция нужна, чтобы вернуться на то же место
// после перезагрузки, длительность — чтобы посчитать долю, когда плеер ещё
// не сообщил её заново.
//
// ПОЧЕМУ «ПРОСМОТРЕНО», А НЕ «ПОЗИЦИЯ». Ровно по той же причине, что и в
// lib/videoProgress.ts: перемотка в конец не есть просмотр. Секунды копит
// плеер отрезками, сюда приходит уже сумма.
//
// ЗАЧЕМ ХРАНИТЬ И ОТРЕЗКИ. Ученик закрывает домашку на середине серии и
// возвращается вечером. Без отрезков плеер начинал бы копить просмотр с нуля:
// либо всё пересматривать, либо складывать старую сумму с новой — а это
// зачёт за одну и ту же минуту дважды.
// ─────────────────────────────────────────────────────────────────────────────

/** Доля ролика, после которой просмотр засчитан, если не задано watchSeconds. */
export const VIDEO_DONE_RATIO = 0.9

export interface VideoAnswer {
  /** Сколько секунд ролика реально просмотрено. */
  watched: number
  /** Где стоял плейхед — точка «продолжить». */
  position: number
  /** Длительность ролика, 0 — ещё неизвестна. */
  duration: number
  /** Отсмотренные отрезки [начало, конец] — чтобы продолжить, а не начать заново. */
  ranges: Array<[number, number]>
}

export const emptyVideoAnswer = (): VideoAnswer =>
  ({ watched: 0, position: 0, duration: 0, ranges: [] })

export function formatVideoAnswer(v: VideoAnswer): string {
  const n = (x: number) => Math.max(0, Math.round(x))
  const head = `w=${n(v.watched)};p=${n(v.position)};d=${n(v.duration)}`
  if (!v.ranges.length) return head
  return `${head};r=${v.ranges.map(([a, b]) => `${n(a)}-${n(b)}`).join('_')}`
}

export function parseVideoAnswer(raw: string | undefined | null): VideoAnswer {
  const out = emptyVideoAnswer()
  if (!raw) return out
  for (const part of raw.split(';')) {
    const [key, value] = part.split('=')
    const num = Number(value)
    if (!Number.isFinite(num)) continue
    if (key === 'w') out.watched = num
    else if (key === 'p') out.position = num
    else if (key === 'd') out.duration = num
  }
  const r = raw.split(';').find(part => part.startsWith('r='))?.slice(2)
  if (r) {
    out.ranges = r.split('_').map(seg => seg.split('-').map(Number) as [number, number])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
  }
  return out
}

/**
 * Сколько секунд нужно просмотреть, чтобы задание считалось выполненным.
 *
 * Задано учителем (`watchSeconds`) — берём его: у фильма и серии мультика
 * требовать девять десятых бессмысленно, там задание «посмотри двадцать минут
 * и перескажи». Не задано — девять десятых длительности: хвост с титрами не
 * требуем (то же правило, что у записи урока).
 */
export function videoRequiredSeconds(watchSeconds: number | undefined, duration: number): number {
  if (watchSeconds && watchSeconds > 0) return watchSeconds
  return duration > 0 ? duration * VIDEO_DONE_RATIO : 0
}

/** Готово ли задание: просмотрено не меньше требуемого. */
export function videoAnswerDone(raw: string | undefined | null, watchSeconds?: number): boolean {
  const v = parseVideoAnswer(raw)
  const need = videoRequiredSeconds(watchSeconds, v.duration)
  // Длительность неизвестна и порога нет — засчитывать нечего: иначе пустой
  // ответ «w=0;p=0;d=0» проходил бы как выполненный.
  if (need <= 0) return false
  return v.watched + 0.5 >= need
}
