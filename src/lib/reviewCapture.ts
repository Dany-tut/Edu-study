// ─────────────────────────────────────────────────────────────────────────────
// Домашка → карточки интервального повторения.
//
// ЗАЧЕМ. SM-2 и колода у нас были написаны давно (lib/srs.ts, data/reviewDeck.ts),
// но наполнялись ровно из одного места — диагностической батареи. Ученик мог
// пройти тридцать юнитов языкового курса и четыреста слов, а в повторении у него
// было пусто: механизм есть, провода нет. Здесь провод.
//
// ЧТО ПОПАДАЕТ В КОЛОДУ
//   • слова урока (flashcard) — все, независимо от того, ошибся ученик или нет:
//     угаданное сегодня слово забывается через неделю точно так же;
//   • ошибки — но только те, чей вопрос самодостаточен текстом.
//
// ЧТО НЕ ПОПАДАЕТ И ПОЧЕМУ. Карточка колоды — это две строки, «лицо» и «оборот»;
// ни звука, ни картинки, ни отрывка она не хранит. Поэтому диктант («Напечатайте
// услышанное слово»), «что на картинке», сборка предложения из плиток и вопросы
// к тексту в колоду не идут: без стимула такая карточка нерешаема, а формулировки
// у них вдобавок одинаковые от юнита к юниту — дедуп по prompt схлопнул бы их в
// одну бессмысленную запись.
//
// Модуль чистый (никаких запросов): проверку «верно/неверно» делает вызывающий —
// граф проверки живёт в HomeworkFlow, и тянуть его сюда значило бы закольцевать
// импорты.
// ─────────────────────────────────────────────────────────────────────────────

import type { HomeworkQuizQuestion } from '../data/lessonContent'
import { normalizeTaskType } from '../data/taskTypes'
import type { ReviewSource } from '../data/reviewDeck'

/** Вход для addCards — ровно то, что колода умеет хранить. */
export interface ReviewCardInput {
  subject?: string
  source: ReviewSource
  prompt: string
  answer: string
  options?: string[]
}

/**
 * Типы, чей вопрос читается как текст и потому годится в карточку.
 *
 * Свободный ответ (`extended`) сюда входит только с эталоном — без него
 * повторять нечего, и такие задания всё равно уходят учителю.
 */
const TEXTUAL_TYPES = new Set(['single', 'multi', 'fill', 'extended'])

/** Есть ли у задания стимул, который карточка не унесёт (звук, картинка, отрывок). */
function hasCarriedStimulus(q: HomeworkQuizQuestion): boolean {
  return !!(q.image || q.images?.length || q.audioUrl || q.ttsText || q.passage)
}

/** Текст верного ответа — то, что ученик увидит на обороте карточки. */
function correctAnswerText(q: HomeworkQuizQuestion): string {
  const tp = normalizeTaskType(q.type)
  if (tp === 'multi') {
    const ids = q.correctOptionIds ?? []
    return q.options.filter(o => ids.includes(o.id)).map(o => o.text.trim()).filter(Boolean).join(', ')
  }
  if (tp === 'single') return q.options.find(o => o.id === q.correctOptionId)?.text.trim() ?? ''
  return q.referenceAnswer?.trim() ?? ''
}

/**
 * Лицо словарной карточки — слово на изучаемом языке, без чтения.
 *
 * Чтение уезжает на оборот (см. vocabCardOf): лицо должно требовать вспомнить
 * слово по его записи, а романизация рядом со словом ровно это и отменяет.
 */
function vocabFront(q: HomeworkQuizQuestion): string {
  return (q.front || q.prompt || '').trim()
}

/** Оборот словарной карточки: перевод, а через тире — чтение, если оно задано. */
function vocabBack(q: HomeworkQuizQuestion): string {
  const back = (q.back ?? '').trim()
  const reading = (q.reading ?? '').trim()
  return reading ? `${back} — ${reading}` : back
}

/**
 * Карточки по одной сданной домашке.
 *
 * `wrongIds` — id заданий, решённых неверно (считает HomeworkFlow своей же
 * проверкой). Слова урока добавляются независимо от него.
 */
export function cardsFromHomework(opts: {
  questions: HomeworkQuizQuestion[]
  wrongIds: Set<string>
  subject?: string
}): ReviewCardInput[] {
  const { questions, wrongIds, subject } = opts
  const out: ReviewCardInput[] = []

  for (const q of questions) {
    const tp = normalizeTaskType(q.type)

    if (tp === 'flashcard') {
      const prompt = vocabFront(q)
      const answer = vocabBack(q)
      if (prompt && answer) out.push({ subject, source: 'vocab', prompt, answer })
      continue
    }

    if (!wrongIds.has(q.id)) continue
    if (!TEXTUAL_TYPES.has(tp)) continue
    if (hasCarriedStimulus(q)) continue

    const prompt = (q.prompt ?? '').trim()
    const answer = correctAnswerText(q)
    if (!prompt || !answer) continue

    const options = (tp === 'single' || tp === 'multi')
      ? q.options.map(o => o.text).filter(Boolean)
      : undefined
    out.push({ subject, source: 'homework', prompt, answer, options })
  }

  return out
}
