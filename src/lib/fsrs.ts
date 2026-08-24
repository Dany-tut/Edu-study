// FSRS — Free Spaced Repetition Scheduler (реализация модели FSRS-4.5).
//
// ЗАЧЕМ ВМЕСТО SM-2. SM-2 (1987) хранит одну ручку — «лёгкость» (EF) — и умножает
// на неё интервал. FSRS хранит ДВЕ независимые величины и связывает их моделью
// забывания:
//
//   • stability  S — сколько дней держится память: столько времени пройдёт, пока
//     вероятность вспомнить не упадёт до желаемой (0.9);
//   • difficulty D — насколько материал тяжёл лично этому ученику, 1..10;
//   • retrievability R — вероятность вспомнить ПРЯМО СЕЙЧАС, считается из S и
//     того, сколько дней реально прошло с прошлого показа.
//
// Ключевая разница с SM-2 практическая: FSRS учитывает, что ученик пришёл не
// вовремя. Карточку, назначенную на 10 дней и открытую на 30-й, SM-2 обсчитает
// так же, как открытую вовремя, — а ведь вспомнить её через 30 дней было ТРУДНЕЕ,
// и успех тут стоит дороже. У FSRS это заложено в формуле: чем ниже был R в
// момент успешного вспоминания, тем сильнее вырастет стабильность (эффект
// «интервального выигрыша»).
//
// БИБЛИОТЕКА НЕ ИСПОЛЬЗУЕТСЯ (ts-fsrs) — реализация своя, компактная: нам нужен
// ровно планировщик на днях, без коротких внутридневных шагов, очередей и
// оптимизатора весов. Формулы взяты из открытого описания алгоритма FSRS-4.5,
// веса — авторские дефолты (обучены на ~1.7 млрд повторений открытого датасета).
// Каждая формула ниже подписана.

/** Оценка ученика: 1 «не помню», 2 «трудно», 3 «хорошо», 4 «легко». */
export type FsrsRating = 1 | 2 | 3 | 4

export interface FsrsState {
  stability: number   // S, дни
  difficulty: number  // D, 1..10
}

/**
 * Авторские дефолтные веса FSRS-4.5 (w0..w16).
 *
 * w0..w3   — стартовая стабильность для оценок «не помню/трудно/хорошо/легко»;
 * w4, w5   — стартовая трудность и её наклон по оценке;
 * w6, w7   — шаг трудности за ответ и сила возврата к среднему;
 * w8..w10  — рост стабильности при успехе;
 * w11..w14 — стабильность после провала;
 * w15, w16 — штраф за «трудно» и бонус за «легко».
 */
export const FSRS_DEFAULT_W = [
  0.4872, 1.4003, 3.7145, 13.8206,
  5.1618, 1.2298,
  0.8975, 0.031,
  1.6474, 0.1367, 1.0461,
  2.1072, 0.0793, 0.3246, 1.587,
  0.2272, 2.8755,
] as const

/**
 * Кривая забывания FSRS: R(t) = (1 + FACTOR · t/S)^DECAY.
 *
 * DECAY = −0.5 — степенная (а не экспоненциальная) кривая: именно она ложится на
 * реальные логи повторений. FACTOR выведен из DECAY так, чтобы при t = S
 * получалось ровно R = 0.9 — то есть «стабильность» по определению равна числу
 * дней до падения до 90%.
 */
const DECAY = -0.5
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1   // = 19/81 ≈ 0.2346

/** Желаемая доля вспоминания. План §3.4 хочет отдать её учителю — сигнатуры уже готовы. */
export const DEFAULT_RETENTION = 0.9

const MIN_S = 0.01
const MAX_S = 36500      // 100 лет: потолок против ухода в бесконечность
const MAX_INTERVAL = 3650

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Численная страховка: любая NaN/Infinity в цепочке заменяется запасным значением. */
const finite = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback)

/** R(t, S) — вероятность вспомнить через t дней при стабильности S. */
export function retrievability(elapsedDays: number, stability: number, w = FSRS_DEFAULT_W): number {
  void w
  const s = Math.max(MIN_S, stability)
  const t = Math.max(0, elapsedDays)
  return finite(Math.pow(1 + FACTOR * (t / s), DECAY), 1)
}

/**
 * Обратная задача: через сколько дней R упадёт до `retention`.
 *
 * I = S/FACTOR · (retention^(1/DECAY) − 1). При retention = 0.9 выражение
 * схлопывается ровно в I = S — этим и пользуется миграция старых карточек ниже.
 */
export function intervalFor(stability: number, retention = DEFAULT_RETENTION): number {
  const s = clamp(stability, MIN_S, MAX_S)
  const raw = (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)
  return clamp(finite(raw, 1), 1, MAX_INTERVAL)
}

/** S0(G) = w[G−1] — стартовая стабильность первой оценки. */
export function initialStability(rating: FsrsRating, w = FSRS_DEFAULT_W): number {
  return clamp(w[rating - 1], MIN_S, MAX_S)
}

/** D0(G) = w4 − w5·(G−3), 1..10 (линейная инициализация FSRS-4.5). */
export function initialDifficulty(rating: FsrsRating, w = FSRS_DEFAULT_W): number {
  return clamp(w[4] - w[5] * (rating - 3), 1, 10)
}

/**
 * Обновление трудности: шаг по оценке + возврат к среднему.
 *
 * D' = D − w6·(G−3) двигает трудность вниз на «легко» и вверх на «не помню»;
 * D'' = w7·D0(3) + (1−w7)·D' медленно тянет её к дефолту, иначе одна серия
 * неудач навсегда впечатывала бы карточку в потолок 10.
 */
function nextDifficulty(d: number, rating: FsrsRating, w = FSRS_DEFAULT_W): number {
  const stepped = d - w[6] * (rating - 3)
  const reverted = w[7] * w[4] + (1 - w[7]) * stepped
  return clamp(finite(reverted, w[4]), 1, 10)
}

/**
 * Рост стабильности при успешном вспоминании (FSRS-4.5 §"SInc").
 *
 * S' = S · (1 + e^w8 · (11 − D) · S^(−w9) · (e^((1−R)·w10) − 1) · штраф · бонус)
 *
 * Читается так: чем легче материал (меньше D), чем меньше уже накоплено (S^(−w9)
 * — у длинных интервалов прирост в разах меньше) и чем ниже была вероятность
 * вспомнить (1−R — тот самый «интервальный выигрыш»), тем больше прибавка.
 * «Трудно» умножается на w15 < 1, «легко» — на w16 > 1.
 */
function stabilityAfterRecall(s: number, d: number, r: number, rating: FsrsRating, w = FSRS_DEFAULT_W): number {
  const hard = rating === 2 ? w[15] : 1
  const easy = rating === 4 ? w[16] : 1
  const inc =
    Math.exp(w[8]) *
    (11 - d) *
    Math.pow(Math.max(MIN_S, s), -w[9]) *
    (Math.exp((1 - r) * w[10]) - 1) *
    hard * easy
  return clamp(finite(s * (1 + Math.max(0, inc)), s), MIN_S, MAX_S)
}

/**
 * Стабильность после провала (FSRS-4.5 §"S after forgetting").
 *
 * S_f = w11 · D^(−w12) · ((S+1)^w13 − 1) · e^((1−R)·w14)
 *
 * Это НЕ ноль: забытая карточка, которую до этого держали месяцами, вернётся
 * быстрее к длинным интервалам, чем совсем новая, — память сохраняет след. Но
 * выше прежней стабильности она подняться не может, отсюда финальный min.
 */
function stabilityAfterLapse(s: number, d: number, r: number, w = FSRS_DEFAULT_W): number {
  const raw =
    w[11] *
    Math.pow(clamp(d, 1, 10), -w[12]) *
    (Math.pow(Math.max(MIN_S, s) + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14])
  return clamp(finite(Math.min(raw, s), MIN_S), MIN_S, MAX_S)
}

/** Один шаг планировщика. Чистая функция: время приходит параметром. */
export function fsrsReview(
  state: FsrsState | null,
  rating: FsrsRating,
  elapsedDays: number,
  retention = DEFAULT_RETENTION,
  w = FSRS_DEFAULT_W,
): { stability: number; difficulty: number; intervalDays: number; retrievability: number } {
  if (!state) {
    const stability = initialStability(rating, w)
    const difficulty = initialDifficulty(rating, w)
    return { stability, difficulty, intervalDays: Math.round(intervalFor(stability, retention)), retrievability: 1 }
  }
  const s = clamp(finite(state.stability, initialStability(3, w)), MIN_S, MAX_S)
  const d = clamp(finite(state.difficulty, w[4]), 1, 10)
  const r = retrievability(elapsedDays, s, w)

  const difficulty = nextDifficulty(d, rating, w)
  const stability = rating === 1
    ? stabilityAfterLapse(s, d, r, w)
    : stabilityAfterRecall(s, d, r, rating, w)

  return { stability, difficulty, intervalDays: Math.round(intervalFor(stability, retention)), retrievability: r }
}

/**
 * Миграция карточки, заведённой ещё по SM-2 (в БД у неё есть ease/interval_days,
 * но нет stability/difficulty). Выполняется на лету в момент первого ревью.
 *
 * СТАБИЛЬНОСТЬ = НАКОПЛЕННЫЙ ИНТЕРВАЛ. При retention = 0.9 формула интервала
 * даёт ровно I = S (см. intervalFor), то есть «карточка на 37 дней» и есть
 * «стабильность 37 дней». Перенос один в один, ничего не теряется. У карточки,
 * которую ещё ни разу не показывали (interval = 0), берём стартовую стабильность
 * «хорошо» — S0(3).
 *
 * ТРУДНОСТЬ ИЗ EF. EF у SM-2 живёт в 1.3..~3.0 и растёт с лёгкостью; D у FSRS —
 * 1..10 и растёт с трудностью. Отображаем отрезок [1.3, 2.8] на [10, 1] линейно:
 *   D = 10 − (EF − 1.3) · 9 / 1.5
 * Дефолтный EF 2.5 даёт D ≈ 2.8 — заметно легче середины. Это осознанно: EF 2.5
 * у SM-2 означает «ни разу не спотыкались», а каждая ошибка в SM-2 роняла EF,
 * так что низкий EF = высокая D по построению.
 */
export function fsrsFromSm2(sm2: { ease: number; intervalDays: number }, w = FSRS_DEFAULT_W): FsrsState {
  const stability = sm2.intervalDays > 0
    ? clamp(finite(sm2.intervalDays, 1), MIN_S, MAX_S)
    : initialStability(3, w)
  const ease = finite(sm2.ease, 2.5)
  const difficulty = clamp(finite(10 - (ease - 1.3) * 9 / 1.5, w[4]), 1, 10)
  return { stability, difficulty }
}

/**
 * Стартовое состояние НОВОЙ карточки — до первого ответа.
 *
 * `level` 1..5 приходит из lib/adaptive (лестница сложности): чем выше уровень
 * «сопротивления материала», тем труднее стартует карточка и тем короче её
 * первая стабильность.
 *
 * ВАЖНО: intervalDays здесь всегда 0 и due остаётся «сейчас» — новая карточка
 * обязана быть доступной СЕГОДНЯ, иначе ломается «добавил слово → повторяю его».
 * Настраивается только трудность старта, не отсрочка.
 */
export function initialFsrs(level = 3, w = FSRS_DEFAULT_W): FsrsState {
  const lv = clamp(Math.round(level), 1, 5)
  // Трудность: уровень 1 → чуть легче дефолта, уровень 5 → заметно труднее.
  // Шаг w5 тот же, что у линейной инициализации D0, чтобы шкалы жили в одном масштабе.
  const difficulty = clamp(w[4] + (lv - 2) * w[5], 1, 10)
  // Стабильность: интерполяция между S0(«легко») и S0(«трудно») по тому же уровню.
  const easyS = w[3], hardS = w[1]
  const k = (lv - 1) / 4
  const stability = clamp(easyS + (hardS - easyS) * k, MIN_S, MAX_S)
  return { stability, difficulty }
}
