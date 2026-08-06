// Review deck — spaced-repetition cards auto-built from student mistakes (and manual adds).
//
// Capture: when a student answers something wrong in the diagnostic battery or the trainer,
// call captureMistake(...) to drop a card into the deck. The student later works the deck in
// a ReviewSession; each grade reschedules the card via SM-2 (see ../lib/srs).
//
// Teacher side: cards are visible/configurable in the constructor (review enabled per source,
// daily cap) and surface inside homework/lesson flows as a "Повторение" block.

import { supabase } from '../lib/supabase'
import { review, INITIAL_SRS, type ReviewGrade } from '../lib/srs'
import { getStudentSession } from '../lib/studentSession'

/**
 * Откуда карточка пришла.
 *
 * `homework` — ошибка в сданной домашке, `vocab` — слово урока, поставленное на
 * повторение самим фактом изучения (ошибка для этого не нужна: слово, которое
 * ученик угадал сегодня, он забудет через неделю ровно так же).
 */
export type ReviewSource = 'diagnostic' | 'trainer' | 'manual' | 'homework' | 'vocab'

/**
 * Владелец колоды — человек, а не курс.
 *
 * Раньше владелец выводился из предмета (`ownerStudentIdFor`), и это работало,
 * пока колоду наполнял и читал один и тот же экран. Как только карточки начали
 * приходить из домашки, разница вылезла: домашка знает short_id курса, тренажёр
 * — слаг предмета из реестра, и по разным ключам получались бы разные владельцы,
 * то есть записанное в домашке не показалось бы в тренажёре.
 *
 * Интервальное повторение и по смыслу личное: слово, выученное на курсе, ученик
 * забывает не «в рамках курса». Поэтому ключ один — id сессии ученика, а
 * принадлежность предмету остаётся полем `subject` для фильтров.
 */
export function deckOwner(): { studentId?: string } {
  return { studentId: getStudentSession()?.id }
}

export interface ReviewCard {
  id: string
  studentId?: string
  anonName?: string
  subject?: string
  source: ReviewSource
  prompt: string
  answer: string
  options?: string[]
  ease: number
  intervalDays: number
  reps: number
  lapses: number
  dueAt: string      // ISO
  createdAt: string  // ISO
}

function rowToCard(r: Record<string, unknown>): ReviewCard {
  return {
    id: r.id as string,
    studentId: (r.student_id as string | null) ?? undefined,
    anonName: (r.anon_name as string | null) ?? undefined,
    subject: (r.subject as string | null) ?? undefined,
    source: (r.source as ReviewSource) ?? 'manual',
    prompt: r.prompt as string,
    answer: r.answer as string,
    options: (r.options as string[] | null) ?? undefined,
    ease: r.ease as number,
    intervalDays: r.interval_days as number,
    reps: r.reps as number,
    lapses: r.lapses as number,
    dueAt: r.due_at as string,
    createdAt: r.created_at as string,
  }
}

/** Drop a card into a student's deck. De-dupes on (owner, prompt) so the same mistake repeated
 *  in one session doesn't create duplicates. Owner = studentId when known, else anonName. */
export async function captureMistake(input: {
  studentId?: string
  anonName?: string
  subject?: string
  source: ReviewSource
  prompt: string
  answer: string
  options?: string[]
}): Promise<void> {
  const ownerCol = input.studentId ? 'student_id' : 'anon_name'
  const ownerVal = input.studentId ?? input.anonName ?? ''
  if (!ownerVal) return
  const { data: existing } = await supabase
    .from('review_cards')
    .select('id')
    .eq(ownerCol, ownerVal)
    .eq('prompt', input.prompt)
    .maybeSingle()
  if (existing) return  // already queued
  await supabase.from('review_cards').insert({
    student_id: input.studentId ?? null,
    anon_name: input.anonName ?? null,
    subject: input.subject ?? null,
    source: input.source,
    prompt: input.prompt,
    answer: input.answer,
    options: input.options ?? null,
    ease: INITIAL_SRS.ease,
    interval_days: INITIAL_SRS.intervalDays,
    reps: INITIAL_SRS.reps,
    lapses: INITIAL_SRS.lapses,
    due_at: new Date().toISOString(),
  })
}

/**
 * Положить в колоду сразу пачку карточек — словарь текста, слова урока.
 *
 * ПОЧЕМУ НЕ ЦИКЛ ИЗ captureMistake. Тот делает select + insert на КАЖДУЮ
 * карточку: на глоссарии из 20 слов это 40 запросов и заметная пауза перед
 * первой карточкой. Здесь один select существующих prompt'ов и один insert
 * недостающих. Дедуп тот же — по паре (владелец, prompt).
 *
 * Возвращает число реально добавленных карточек: ноль означает «всё это уже
 * в колоде», и экрану есть что сказать вместо молчания.
 */
export async function addCards(
  owner: { studentId?: string; anonName?: string },
  inputs: Array<{ subject?: string; source: ReviewSource; prompt: string; answer: string; options?: string[] }>,
): Promise<number> {
  const ownerCol = owner.studentId ? 'student_id' : 'anon_name'
  const ownerVal = owner.studentId ?? owner.anonName ?? ''
  if (!ownerVal || inputs.length === 0) return 0

  // Дубли внутри самой пачки (одно слово в двух текстах) убираем до запроса.
  const byPrompt = new Map(inputs.map(i => [i.prompt, i]))
  const prompts = [...byPrompt.keys()]

  const { data: existing } = await supabase
    .from('review_cards')
    .select('prompt')
    .eq(ownerCol, ownerVal)
    .in('prompt', prompts)
  const known = new Set((existing ?? []).map(r => r.prompt as string))

  const rows = prompts
    .filter(p => !known.has(p))
    .map(p => {
      const i = byPrompt.get(p)!
      return {
        student_id: owner.studentId ?? null,
        anon_name: owner.anonName ?? null,
        subject: i.subject ?? null,
        source: i.source,
        prompt: i.prompt,
        answer: i.answer,
        options: i.options ?? null,
        ease: INITIAL_SRS.ease,
        interval_days: INITIAL_SRS.intervalDays,
        reps: INITIAL_SRS.reps,
        lapses: INITIAL_SRS.lapses,
        due_at: new Date().toISOString(),
      }
    })
  if (rows.length === 0) return 0

  const { error } = await supabase.from('review_cards').insert(rows)
  if (error) { console.error('addCards:', error); return 0 }
  return rows.length
}

/** Cards currently due for an owner (studentId or anonName), oldest-due first. */
export async function dueCards(owner: { studentId?: string; anonName?: string }, limit = 20): Promise<ReviewCard[]> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  if (!val) return []
  const { data, error } = await supabase
    .from('review_cards')
    .select('*')
    .eq(col, val)
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(limit)
  if (error) { console.error('dueCards:', error); return [] }
  return (data ?? []).map(rowToCard)
}

/** Count of due cards — for badges ("3 на повторение"). */
export async function dueCount(owner: { studentId?: string; anonName?: string }): Promise<number> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  if (!val) return 0
  const { count } = await supabase
    .from('review_cards')
    .select('id', { count: 'exact', head: true })
    .eq(col, val)
    .lte('due_at', new Date().toISOString())
  return count ?? 0
}

/** Grade a card and persist the new SM-2 schedule. */
export async function gradeCard(card: ReviewCard, grade: ReviewGrade): Promise<ReviewCard> {
  const next = review(card, grade, Date.now())
  await supabase.from('review_cards').update({
    ease: next.ease, interval_days: next.intervalDays, reps: next.reps, lapses: next.lapses, due_at: next.dueAt,
  }).eq('id', card.id)
  return { ...card, ...next }
}
