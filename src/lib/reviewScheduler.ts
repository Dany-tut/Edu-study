// Мост между «ученик нажал кнопку» и планировщиком расписания.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. lib/srs.ts (SM-2) и lib/fsrs.ts (FSRS) — два разных
// планировщика с разной моделью состояния (ease vs stability+difficulty). Оценку
// карточки в UI считают ДВАЖДЫ: один раз для подсказки под кнопкой ДО клика
// («через 3 дня» в CardDeck.tsx/ReviewSession.tsx), второй раз при самом клике
// (gradeCard/gradePrompt в data/reviewDeck.ts) — и оба раза обязаны получить
// ОДНО И ТО ЖЕ число, иначе подсказка соврёт. Здесь одна функция для обоих мест.
//
// FSRS спрятан за фиче-флагом lib/featureFlags ('fsrs'). Выключенный флаг —
// это ровно прежнее поведение: SM-2 без изменений, stability/difficulty не
// пишутся. EF (ease) при этом считается ВСЕГДА, даже когда расписание ведёт
// FSRS — если флаг откатят посреди жизни карточки, SM-2 продолжит с того EF,
// на котором остановился, а не с дефолта.

import { review as sm2Review, type ReviewGrade } from './srs'
import { fsrsReview, fsrsFromSm2, initialFsrs, type FsrsRating, type FsrsState } from './fsrs'
import { isEnabled } from './featureFlags'
import type { ReviewSource } from '../data/reviewDeck'

const DAY_MS = 86_400_000

/** Строка review_cards, какой её видит планировщик. stability/difficulty
 *  отсутствуют (null/undefined) у карточек, ещё не прошедших через FSRS —
 *  старые SM-2-карточки и совсем новые до первой вставки. */
export interface SchedulableCard {
  ease: number
  intervalDays: number
  reps: number
  lapses: number
  dueAt: string
  stability?: number | null
  difficulty?: number | null
}

export interface ScheduleResult {
  ease: number
  intervalDays: number
  reps: number
  lapses: number
  dueAt: string
  stability: number | null
  difficulty: number | null
}

/** SM-2 grade (0..5, см. srs.ts) → FSRS rating (1..4). Кнопки шлют только
 *  1/3/4/5 (GRADE_BUTTONS); 0 и 2 сворачиваем к соседям на случай будущих вызовов. */
function toFsrsRating(grade: ReviewGrade): FsrsRating {
  if (grade <= 1) return 1
  if (grade <= 3) return 2
  if (grade === 4) return 3
  return 4
}

/** Сколько дней реально прошло с прошлого показа, а не «сколько было запланировано».
 *
 * due_at = (момент прошлого показа) + intervalDays, поэтому «момент прошлого
 * показа» = dueAt − intervalDays. Если ученик открыл карточку ровно в срок,
 * elapsed = intervalDays. Если позже — elapsed больше: та самая ситуация из
 * шапки lib/fsrs.ts («открыл на 30-й день вместо 10-го»), которую SM-2 не видит
 * вовсе, а FSRS обязан увидеть, чтобы не занижать прирост стабильности.
 */
function elapsedDays(card: Pick<SchedulableCard, 'dueAt' | 'intervalDays'>, nowMs: number): number {
  const lastShownMs = new Date(card.dueAt).getTime() - card.intervalDays * DAY_MS
  return Math.max(0, (nowMs - lastShownMs) / DAY_MS)
}

/**
 * Один грейд по существующей (или синтетической — см. newSchedulableCard) карточке.
 * Чистая функция: время приходит параметром, ничего не читает и не пишет сама.
 */
export function scheduleReview(card: SchedulableCard, grade: ReviewGrade, nowMs: number): ScheduleResult {
  // Считаем SM-2 всегда: держит EF/reps/lapses живыми на случай отката флага
  // (см. шапку файла) и остаётся источником reps/lapses — их UI (прогресс в
  // deckStates) читает как «успехов подряд»/«раз забыто», FSRS такие числа не
  // считает.
  const sm2 = sm2Review({ ease: card.ease, intervalDays: card.intervalDays, reps: card.reps, lapses: card.lapses }, grade, nowMs)

  if (!isEnabled('fsrs')) {
    return { ...sm2, stability: null, difficulty: null }
  }

  const prevState: FsrsState = (card.stability != null && card.difficulty != null)
    ? { stability: card.stability, difficulty: card.difficulty }
    // Легаси-карточка без FSRS-состояния — мигрируем на лету из SM-2
    // (формула и её обоснование — lib/fsrs.ts:fsrsFromSm2).
    : fsrsFromSm2({ ease: card.ease, intervalDays: card.intervalDays })

  const rating = toFsrsRating(grade)
  const elapsed = elapsedDays(card, nowMs)
  const next = fsrsReview(prevState, rating, elapsed)

  return {
    ease: sm2.ease,
    intervalDays: next.intervalDays,
    reps: sm2.reps,
    lapses: sm2.lapses,
    dueAt: new Date(nowMs + next.intervalDays * DAY_MS).toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
  }
}

/**
 * Стартовый уровень (1..5) для НОВОЙ карточки — вход в initialFsrs().
 *
 * РЕАЛЬНО ДОСТУПНЫЕ СИГНАЛЫ в точках вставки (captureMistake/addCards/gradePrompt
 * в data/reviewDeck.ts):
 *   • source — из чего карточка (см. ReviewSource ниже);
 *   • fromMistake — captureMistake() зовут НА ОШИБКЕ, addCards() — на спокойном
 *     добавлении (слово урока, фраза разговорника, которую просто изучили).
 *     Ошибка стартует труднее: то, в чём ученик уже споткнулся, вероятнее
 *     забудется быстрее, чем слово, угаданное с первого раза;
 *   • adaptiveLevel — лестница lib/adaptive.ts (nextState по ходу сессии),
 *     ЕСЛИ вызывающий код её ведёт и явно передал. На практике почти никто не
 *     передаёт: колоду наполняют домашка, диагностика и разговорник — экраны
 *     без запущенной adaptive-сессии на этот момент. Параметр остаётся для
 *     тех мест (тренажёрные драйверы), где лестница реально крутится рядом.
 *
 * ЧТО НЕ ИСПОЛЬЗОВАНО. Персональная история карточек этого же ученика (средняя
 * difficulty его колоды, общий lapse-rate) — потребовала бы читать чужие строки
 * review_cards при каждой вставке; неоправданно для одной новой карточки за раз.
 */
export function startingLevel(opts: { source: ReviewSource; fromMistake: boolean; adaptiveLevel?: number }): number {
  if (opts.adaptiveLevel != null) return opts.adaptiveLevel
  return opts.fromMistake ? 4 : 3
}

/**
 * Синтетическая «карточка до первого показа» — то, что вставляют в БД строки
 * captureMistake/addCards/gradePrompt(insert). intervalDays всегда 0 и dueAt —
 * «сейчас»: новая карточка обязана быть due СЕГОДНЯ (жёсткое требование плана
 * §3.1 — настраивается только трудность старта, не отсрочка).
 */
export function newSchedulableCard(opts: { source: ReviewSource; fromMistake: boolean; adaptiveLevel?: number }, nowMs = Date.now()): SchedulableCard {
  const dueAt = new Date(nowMs).toISOString()
  if (!isEnabled('fsrs')) {
    return { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt, stability: null, difficulty: null }
  }
  const level = startingLevel(opts)
  const { stability, difficulty } = initialFsrs(level)
  return { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt, stability, difficulty }
}
