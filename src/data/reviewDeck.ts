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
import { vocabImage } from './vocabImages'

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

  // ── Поля показа. В БД их нет и не будет ────────────────────────────────────
  //
  // Колода умеет крутить не только карточки повторений, но и любую стопку
  // (DeckSource). У готового разговорника к фразе прилагается чтение и заметка
  // о том, когда так говорить нельзя, — без них карточка «데워 주세요 —
  // разогрейте» теряет ровно то, ради чего фраза и написана.
  //
  // Заводить ради этого второй тип карточки значило бы раздвоить всю стопку —
  // очередь, свайпы, разбор. Поэтому поля живут здесь и просто пустые у
  // карточек из review_cards: rowToCard их не заполняет, в insert они не идут.

  /** Романизация или транскрипция — показывается вместе с ответом. */
  reading?: string
  /** Когда так говорить нельзя, что ответят, чем отличается от соседней фразы. */
  note?: string
  /**
   * Фраза в живом предложении — предложение, чтение, перевод.
   *
   * Тип описан здесь структурно, а не импортом из разговорника: колода не знает
   * про survivalPhrases и знать не должна, а пример к карточке может однажды
   * прийти и из урока курса.
   */
  ex?: { term: string; reading?: string; ru: string }
  /**
   * Предметный рисунок на лицевой стороне (см. data/vocabImages.ts).
   *
   * Подбирается по ответу — то есть по русскому значению слова, — поэтому его
   * получают и карточки, давно лежащие в review_cards: колонки в БД для этого
   * не нужно, картинка вычисляется на чтении.
   */
  image?: string
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
    image: vocabImage(r.answer as string),
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

/**
 * Cards currently due for an owner (studentId or anonName), oldest-due first.
 *
 * `subjects` — список написаний предмета (см. subjectAliases в studentDataStore).
 * Колода одна на человека, а экран почти всегда предметный: в корейском
 * тренажёре карточки по химии не только лишние — они съедают лимит сессии и
 * читаются вслух корейским голосом. Пустой список = без фильтра: так работают
 * общие экраны повторения, где смешение как раз уместно.
 */
export async function dueCards(
  owner: { studentId?: string; anonName?: string },
  limit = 20,
  subjects?: string[],
): Promise<ReviewCard[]> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  if (!val) return []
  let q = supabase
    .from('review_cards')
    .select('*')
    .eq(col, val)
    .lte('due_at', new Date().toISOString())
  if (subjects?.length) q = q.in('subject', subjects)
  const { data, error } = await q
    .order('due_at', { ascending: true })
    .limit(limit)
  if (error) { console.error('dueCards:', error); return [] }
  return (data ?? []).map(rowToCard)
}

/** Count of due cards — for badges ("3 на повторение"). `subjects` как в dueCards. */
export async function dueCount(
  owner: { studentId?: string; anonName?: string },
  subjects?: string[],
): Promise<number> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  if (!val) return 0
  let q = supabase
    .from('review_cards')
    .select('id', { count: 'exact', head: true })
    .eq(col, val)
    .lte('due_at', new Date().toISOString())
  if (subjects?.length) q = q.in('subject', subjects)
  const { count } = await q
  return count ?? 0
}

/**
 * Что колода помнит про одну фразу: сколько раз подряд её вспомнили, сколько раз
 * забыли, на каком интервале она сейчас и когда вернётся.
 *
 * Это ровно те четыре числа, которыми SM-2 и живёт (см. lib/srs.ts); отдельной
 * таблицы «статистики» для них не нужно — они и есть строка карточки.
 */
export interface CardState {
  id: string
  /** Успехов подряд. Ноль после каждой ошибки. */
  reps: number
  /** Сколько раз фразу забывали за всё время. */
  lapses: number
  intervalDays: number
  ease: number
  dueAt: string
}

/** Пора ли показывать карточку сегодня. Новой (без состояния) — всегда пора. */
export function isDue(s: CardState | undefined, nowMs = Date.now()): boolean {
  return !s || new Date(s.dueAt).getTime() <= nowMs
}

/**
 * Состояние всех карточек владельца, ключ — prompt.
 *
 * ЗАЧЕМ ЦЕЛИКОМ, А НЕ ПРОВЕРКОЙ СПИСКА. Витрине наборов нужен прогресс сразу по
 * всем темам: «сколько из сорока фраз кофейни выучено». Проверять вхождение
 * списком (.in('prompt', …)) значит слать полторы тысячи значений в URL — это и
 * не пройдёт по длине, и превратится в запрос на каждую тему. Колода одного
 * ученика — это сотни строк, поэтому дешевле забрать её один раз и считать
 * пересечения в памяти.
 *
 * Возвращается Map, а не список: витрина обходит 38 тем по 40 фраз, и линейный
 * поиск по массиву превратил бы это в 60 тысяч сравнений на каждый рендер.
 */
export async function deckStates(
  owner: { studentId?: string; anonName?: string },
  subjects?: string[],
): Promise<Map<string, CardState>> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  if (!val) return new Map()
  let q = supabase
    .from('review_cards')
    .select('id, prompt, reps, lapses, interval_days, ease, due_at')
    .eq(col, val)
  if (subjects?.length) q = q.in('subject', subjects)
  const { data, error } = await q
  if (error) { console.error('deckStates:', error); return new Map() }
  return new Map((data ?? []).map(r => [r.prompt as string, {
    id: r.id as string,
    reps: r.reps as number,
    lapses: r.lapses as number,
    intervalDays: r.interval_days as number,
    ease: r.ease as number,
    dueAt: r.due_at as string,
  }]))
}

/**
 * Оценить фразу по prompt'у — и завести карточку, если её ещё не было.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ gradeCard. Тот двигает расписание УЖЕ СУЩЕСТВУЮЩЕЙ строки и
 * получает её id. Прогон готового набора работает с фразами разговорника: строки
 * в базе у них нет до первого ответа, и id у карточки на экране синтетический
 * (`sv-…`). Раньше это решалось грубо: «знаю» не сохранялось вообще, а «не знаю»
 * заводило строку через captureMistake. То есть база помнила только провалы —
 * поэтому и стопка после F5 начиналась заново, и проценты на плитке считали
 * незнание.
 *
 * Теперь ответ сохраняется любой. «Знаю» — это тоже данные: именно из череды
 * успехов SM-2 и растит интервал (1 → 6 → ~15 → ~37 дней).
 */
export async function gradePrompt(
  owner: { studentId?: string; anonName?: string },
  input: { subject?: string; source: ReviewSource; prompt: string; answer: string },
  grade: ReviewGrade,
): Promise<CardState | null> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  if (!val) return null

  const { data: existing } = await supabase
    .from('review_cards')
    .select('id, ease, interval_days, reps, lapses')
    .eq(col, val)
    .eq('prompt', input.prompt)
    .maybeSingle()

  const before = existing
    ? {
      ease: existing.ease as number,
      intervalDays: existing.interval_days as number,
      reps: existing.reps as number,
      lapses: existing.lapses as number,
    }
    : INITIAL_SRS
  const next = review(before, grade, Date.now())

  if (existing) {
    const { error } = await supabase.from('review_cards').update({
      ease: next.ease, interval_days: next.intervalDays,
      reps: next.reps, lapses: next.lapses, due_at: next.dueAt,
    }).eq('id', existing.id as string)
    if (error) { console.error('gradePrompt update:', error); return null }
    return { id: existing.id as string, ...next }
  }

  const { data, error } = await supabase.from('review_cards').insert({
    student_id: owner.studentId ?? null,
    anon_name: owner.anonName ?? null,
    subject: input.subject ?? null,
    source: input.source,
    prompt: input.prompt,
    answer: input.answer,
    ease: next.ease,
    interval_days: next.intervalDays,
    reps: next.reps,
    lapses: next.lapses,
    due_at: next.dueAt,
  }).select('id').single()
  if (error) { console.error('gradePrompt insert:', error); return null }
  return { id: data.id as string, ...next }
}

/** Grade a card and persist the new SM-2 schedule. */
export async function gradeCard(card: ReviewCard, grade: ReviewGrade): Promise<ReviewCard> {
  const next = review(card, grade, Date.now())
  await supabase.from('review_cards').update({
    ease: next.ease, interval_days: next.intervalDays, reps: next.reps, lapses: next.lapses, due_at: next.dueAt,
  }).eq('id', card.id)
  return { ...card, ...next }
}
