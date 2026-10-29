// Pre-designed diagnostic test questions for biology, chemistry, and logic screening.
// Teachers can view and edit these in Constructor → Тестирование.

import { supabase } from '../lib/supabase'
import { ENGLISH_PLACEMENT_QUESTIONS, KOREAN_PLACEMENT_QUESTIONS } from './placementTests'
import { ENGLISH_RESTORE_QUESTIONS } from './englishRestore'
import type { QTable } from '../components/QuestionTable'

export type DiagSubject = 'biology' | 'chemistry' | 'logic' | 'ap-chem-ru' | 'ap-chem-en' | 'eng-placement' | 'kor-placement' | 'eng-restore'

export interface DiagQuestion {
  id: string
  section: string
  text: string
  options: string[]   // exactly 4
  correct: number     // 0-indexed
  /**
   * Вид вопроса. Нет поля — выбор из вариантов (options/correct).
   * 'term' — таблица с ячейкой «?», в неё вписывается термин; options пустой,
   * ответ сверяется со списком `accepts`. Хранится в diag_questions.payload.
   */
  kind?: 'term'
  table?: QTable
  /**
   * Картинка к вопросу (путь от корня сайта) — под текстом, над полем ответа.
   * У 'term' без таблицы ответ вписывается в отдельное поле (Линия 1 ОГЭ:
   * «рисунок → какое свойство живого»).
   */
  image?: string
  /** Принимаемые ответы для 'term'. Пустой — ответ ещё не расставлен. */
  accepts?: string[]
  /** Откуда вопрос (для перенесённых банков), напр. «stepenin.ru · ID 54140». */
  source?: string
}

/** Ответ ученика: номер варианта у выбора, введённая строка у 'term'. */
export type DiagAnswer = number | string

/** Термин сравнивается без регистра, ё/е, лишних пробелов, точек и кавычек. */
export function normalizeTerm(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[«»"'.,;:!?()]/g, ' ').replace(/[‐-―-]/g, '-').replace(/\s+/g, ' ').trim()
}

export function isDiagAnswerCorrect(q: DiagQuestion, a: DiagAnswer | undefined): boolean {
  if (a === undefined) return false
  if (q.kind === 'term') {
    const given = normalizeTerm(String(a))
    return !!given && (q.accepts ?? []).some(x => normalizeTerm(x) === given)
  }
  return a === q.correct
}

/** Правильный ответ строкой — для «Верно: …» в разборе. */
export function diagCorrectLabel(q: DiagQuestion): string {
  if (q.kind === 'term') return (q.accepts ?? []).join(' / ')
  return q.options[q.correct] ?? ''
}

/**
 * Подпись вопроса в списке редактора. У терминов текст задания почти всегда
 * один и тот же («Рассмотрите таблицу…»), и 143 одинаковых строки не
 * различить — поэтому показываем остальные ячейки строки с пропуском: «Цитология».
 */
export function diagListLabel(q: DiagQuestion): string {
  if (q.kind !== 'term' || !q.table) return q.text
  const blank = Object.keys(q.table.emptyCells ?? {})[0]
  const r = blank ? Number(blank.split(',')[0]) : -1
  const rest = (q.table.rows[r] ?? []).filter(Boolean).join(' · ')
  return rest || q.text
}

/** Ответ ученика строкой. */
export function diagAnswerLabel(q: DiagQuestion, a: DiagAnswer): string {
  return q.kind === 'term' ? String(a) : (q.options[a as number] ?? '')
}

export type DiagResults = Record<string, { correct: number; total: number }>


// In-memory cache pre-seeded with compiled defaults so sync reads always work.
const questionsCache = new Map<DiagSubject, DiagQuestion[]>(
  (['biology', 'chemistry', 'logic', 'ap-chem-ru', 'ap-chem-en', 'eng-placement', 'kor-placement', 'eng-restore'] as DiagSubject[]).map(s => [s, DEFAULT_QUESTIONS[s]])
)

// Sync read from cache (instant, no flicker). Call fetchDiagQuestions in useEffect to hydrate.
export function loadDiagQuestions(subject: DiagSubject): DiagQuestion[] {
  return questionsCache.get(subject) ?? DEFAULT_QUESTIONS[subject] ?? []
}

/**
 * У термина ячейка для ответа должна быть отмечена в emptyCells. Если пометки нет
 * (так пришёл bio-l1-54140: пустая клетка без отметки), ученик видел таблицу без
 * поля и не мог ответить вовсе — полем становится первая пустая клетка.
 */
function withTermBlank(q: DiagQuestion): DiagQuestion {
  if (q.kind !== 'term' || !q.table || Object.keys(q.table.emptyCells ?? {}).length) return q
  for (let r = 0; r < q.table.rows.length; r++) {
    const c = q.table.rows[r].findIndex(cell => !String(cell ?? '').trim())
    if (c >= 0 && !q.table.cellImages?.[`${r},${c}`]) return { ...q, table: { ...q.table, emptyCells: { [`${r},${c}`]: true } } }
  }
  return q
}

// Async fetch from Supabase — updates cache and returns fresh questions.
//
// Запрос на тест ОДИН, сколько бы его ни ждало. Сетка «Тестов» монтирует
// десятки карточек, и каждая спрашивала свои вопросы сама; вернувшись из
// редактора, учитель ловил те же запросы заново, а ответы, приходя вразнобой,
// перерисовывали сетку волнами — экран дёргался два-три раза. Поэтому: общий
// запрос на время полёта, свежий кэш не ходит в сеть вовсе, а совпавший с кэшем
// ответ отдаёт прежний массив — setState с тем же массивом ничего не рисует.
const QUESTIONS_FRESH_MS = 30_000
const questionsFetchedAt = new Map<DiagSubject, number>()
const questionsInFlight = new Map<DiagSubject, Promise<DiagQuestion[]>>()

export function fetchDiagQuestions(subject: DiagSubject): Promise<DiagQuestion[]> {
  const at = questionsFetchedAt.get(subject)
  if (at != null && Date.now() - at < QUESTIONS_FRESH_MS) return Promise.resolve(loadDiagQuestions(subject))
  const pending = questionsInFlight.get(subject)
  if (pending) return pending
  const p = fetchDiagQuestionsNow(subject).finally(() => questionsInFlight.delete(subject))
  questionsInFlight.set(subject, p)
  return p
}

async function fetchDiagQuestionsNow(subject: DiagSubject): Promise<DiagQuestion[]> {
  const { data, error } = await supabase
    .from('diag_questions')
    .select('id, section, text, options, correct, payload')
    .eq('subject', subject)
    .order('position')
  if (error || !data?.length) return loadDiagQuestions(subject)
  const qs: DiagQuestion[] = data.map(r => withTermBlank({
    id: r.id as string,
    section: r.section as string,
    text: r.text as string,
    options: r.options as string[],
    correct: r.correct as number,
    ...((r.payload as Partial<DiagQuestion> | null) ?? {}),
  }))
  questionsFetchedAt.set(subject, Date.now())
  const cached = questionsCache.get(subject)
  if (cached && JSON.stringify(cached) === JSON.stringify(qs)) return cached
  questionsCache.set(subject, qs)
  return qs
}

// Async save — updates cache + upserts all rows to Supabase.
export async function saveDiagQuestions(subject: DiagSubject, qs: DiagQuestion[]): Promise<void> {
  questionsCache.set(subject, qs)
  // Пустой список — тоже правка: удалили последний вопрос. Раньше здесь был
  // выход, и в базе вопрос оставался.
  if (!qs.length) {
    const { error } = await supabase.from('diag_questions').delete().eq('subject', subject)
    if (error) { console.error('saveDiagQuestions:', error); throw new Error(error.message) }
    return
  }
  const rows = qs.map((q, pos) => ({
    id: q.id, subject, section: q.section, text: q.text,
    options: q.options, correct: q.correct, position: pos,
    payload: q.kind || q.image ? { kind: q.kind, table: q.table, image: q.image, accepts: q.kind ? q.accepts ?? [] : undefined, source: q.source } : null,
  }))
  const { error } = await supabase
    .from('diag_questions')
    .upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('saveDiagQuestions:', error)
    throw new Error(error.message)
  }
  // Remove deleted questions from DB
  const ids = qs.map(q => q.id)
  const { error: delError } = await supabase
    .from('diag_questions')
    .delete()
    .eq('subject', subject)
    .not('id', 'in', `(${ids.join(',')})`)
  if (delError) { console.error('saveDiagQuestions delete:', delError); throw new Error(delError.message) }
}

// ── Custom test metadata (cross-device, Supabase-backed) ──────────────────────

export interface CustomTestMeta { id: string; label: string; accent: string; iconKey?: string; chip?: string; subject?: string; doneLabel?: string; level?: string; createdAt?: string }

export async function fetchCustomTestsMeta(): Promise<CustomTestMeta[]> {
  const { data, error } = await supabase
    .from('custom_diag_tests')
    .select('id, label, accent, icon_key, chip, subject, done_label, level, created_at')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchCustomTestsMeta:', error); return [] }
  return (data ?? []).map((r: { id: string; label: string; accent: string; icon_key?: string; chip?: string; subject?: string | null; done_label?: string | null; level?: string | null; created_at?: string | null }) => ({
    id: r.id, label: r.label, accent: r.accent, iconKey: r.icon_key ?? undefined, chip: r.chip ?? 'Диагностика', subject: r.subject || undefined,
    doneLabel: r.done_label || undefined, level: r.level || undefined, createdAt: r.created_at || undefined,
  }))
}

export async function saveCustomTestMeta(id: string, label: string, accent: string, iconKey?: string, chip?: string, subject?: string, level?: string): Promise<void> {
  const { error } = await supabase
    .from('custom_diag_tests')
    .upsert({ id, label, accent, ...(iconKey ? { icon_key: iconKey } : {}), ...(chip ? { chip } : {}), ...(subject ? { subject } : {}), ...(level ? { level } : {}) }, { onConflict: 'id' })
  if (error) { console.error('saveCustomTestMeta:', error); throw new Error(error.message) }
}

export async function updateCustomTestSubject(id: string, subject: string): Promise<void> {
  const { error } = await supabase.from('custom_diag_tests').update({ subject: subject || null }).eq('id', id)
  if (error) console.error('updateCustomTestSubject:', error)
}

export async function updateCustomTestLevel(id: string, level: string): Promise<void> {
  const { error } = await supabase.from('custom_diag_tests').update({ level: level || null }).eq('id', id)
  if (error) console.error('updateCustomTestLevel:', error)
}

// Подпись над «Молодец!» на финальном экране. Пусто — подписи нет.
export async function updateCustomTestDoneLabel(id: string, label: string): Promise<void> {
  const { error } = await supabase.from('custom_diag_tests').update({ done_label: label.trim() || null }).eq('id', id)
  if (error) console.error('updateCustomTestDoneLabel:', error)
}

export async function updateCustomTestChip(id: string, chip: string): Promise<void> {
  const { error } = await supabase.from('custom_diag_tests').update({ chip }).eq('id', id)
  if (error) console.error('updateCustomTestChip:', error)
}

// Chip label for built-in diagnostic subjects (stored in localStorage)
export function loadBuiltinLabel(subject: string): string {
  try { return (JSON.parse(localStorage.getItem('diagBuiltinLabels') ?? '{}'))[subject] ?? '' } catch { return '' }
}
export function saveBuiltinLabel(subject: string, label: string): void {
  try {
    const map = JSON.parse(localStorage.getItem('diagBuiltinLabels') ?? '{}')
    map[subject] = label
    localStorage.setItem('diagBuiltinLabels', JSON.stringify(map))
  } catch { /* ignore */ }
}

export function loadBuiltinChip(subject: string): string {
  try {
    const map = JSON.parse(localStorage.getItem('diagBuiltinChips') ?? '{}')
    return map[subject] ?? 'AI'
  } catch { return 'AI' }
}
export function saveBuiltinChip(subject: string, chip: string): void {
  try {
    const map = JSON.parse(localStorage.getItem('diagBuiltinChips') ?? '{}')
    map[subject] = chip
    localStorage.setItem('diagBuiltinChips', JSON.stringify(map))
  } catch { /* ignore */ }
}

export async function deleteCustomTestMeta(id: string): Promise<void> {
  const { error } = await supabase.from('custom_diag_tests').delete().eq('id', id)
  if (error) { console.error('deleteCustomTestMeta:', error); throw new Error(error.message) }
}

export async function updateCustomTestAccent(id: string, accent: string): Promise<void> {
  const { error } = await supabase
    .from('custom_diag_tests')
    .update({ accent })
    .eq('id', id)
  if (error) console.error('updateCustomTestAccent:', error)
}

export async function updateCustomTestIcon(id: string, iconKey: string): Promise<void> {
  const { error } = await supabase
    .from('custom_diag_tests')
    .update({ icon_key: iconKey })
    .eq('id', id)
  if (error) console.error('updateCustomTestIcon:', error)
}

// ─────────────────────────────────────────────────────────────────────────────

export function loadDiagResults(subject: DiagSubject): DiagResults | null {
  try {
    const s = localStorage.getItem(`diag-results-${subject}`)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function saveDiagResults(subject: DiagSubject, results: DiagResults) {
  localStorage.setItem(`diag-results-${subject}`, JSON.stringify(results))
}

// ── Anonymous (pre-registration) test results ──────────────────────────────────

export interface AnonDiagResult {
  id: string
  name: string
  subject: DiagSubject
  timestamp: string     // ISO date (mapped from created_at)
  results: DiagResults
  answers: Record<string, DiagAnswer>
  linkedStudentId?: string
  /** Сколько вопросов отвечено и сколько всего — у брошенных на середине. */
  answered?: number
  total?: number
  /** false — прогон брошен на середине; строка есть, но результат неполный. */
  completed: boolean
  /** Секрет владения строкой (0082): по нему ссылка «Продолжить» открывает этот прогон. */
  ownerToken?: string
  assignmentId?: string
  studentId?: string
}

function rowToResult(row: Record<string, unknown>): AnonDiagResult {
  return {
    id: row.id as string,
    name: row.name as string,
    subject: row.subject as DiagSubject,
    timestamp: row.created_at as string,
    results: row.results as DiagResults,
    answers: row.answers as Record<string, DiagAnswer>,
    linkedStudentId: (row.linked_student_id as string | null) ?? undefined,
    answered: (row.answered as number | null) ?? undefined,
    total: (row.total as number | null) ?? undefined,
    // Строки, лежавшие до миграции 0082, — законченные прогоны (default true).
    completed: (row.completed as boolean | null) ?? true,
    ownerToken: (row.owner_token as string | null) ?? undefined,
    assignmentId: (row.assignment_id as string | null) ?? undefined,
    studentId: (row.student_id as string | null) ?? undefined,
  }
}

// Все карточки сетки тестов монтируются разом и каждая просит результаты —
// пока запрос в полёте, они получают один и тот же, и ответ ложится одним
// рендером, а не десятком вразнобой.
let anonResultsInFlight: Promise<AnonDiagResult[]> | null = null
let anonResultsLast: AnonDiagResult[] = []
export function loadAnonResults(): Promise<AnonDiagResult[]> {
  if (!anonResultsInFlight) anonResultsInFlight = loadAnonResultsNow()
    .then(rs => { anonResultsLast = rs; return rs })
    .finally(() => { anonResultsInFlight = null })
  return anonResultsInFlight
}
/** Последние загруженные результаты — чтобы карточка сразу встала с верным счётчиком. */
export function peekAnonResults(): AnonDiagResult[] { return anonResultsLast }

async function loadAnonResultsNow(): Promise<AnonDiagResult[]> {
  const { data, error } = await supabase
    .from('diag_results')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('loadAnonResults:', error); return [] }
  return (data ?? []).map(rowToResult)
}

/**
 * Сдать результат. Возвращает `true`, если строка легла в базу.
 *
 * БЕЗ `.select()` — И ЭТО НЕ ЭКОНОМИЯ, А ЕДИНСТВЕННЫЙ РАБОЧИЙ ВАРИАНТ.
 * Раньше здесь стояло `.insert(...).select().single()`, то есть
 * `INSERT ... RETURNING`. Postgres требует, чтобы возвращаемая строка прошла
 * ещё и SELECT-политику, а у анонима она — `student_id is not null`. При
 * прохождении по общей ссылке student_id пустой, проверка не проходит, и
 * отклоняется ВСЯ вставка: «new row violates row-level security policy».
 *
 * Итог был такой: любой, кто проходил диагностику по ссылке не залогиненным,
 * терял результат целиком — а экран показывал «готово», потому что ошибка
 * уходила в console.error. Учителя это не задевало: у staff SELECT-политика
 * проходит, и его собственные прогоны сохранялись. Отсюда и ощущение, что
 * тесты работают.
 *
 * Возвращаемая строка здесь никому не нужна — оба вызывающих её игнорируют.
 */
/**
 * Промежуточное сохранение прохождения: ответил — сохранилось.
 *
 * ЗАЧЕМ. Результат уходил в базу ОДИН раз, после последнего вопроса; закрыл
 * вкладку на предпоследнем — не осталось ничего, даже факта, что человек
 * начинал. Учитель при этом не отличал «не проходил» от «бросил на середине».
 *
 * ВЛАДЕНИЕ ПО ТОКЕНУ. Дописывать строку должен уметь аноним — диагностику
 * проходят по общей ссылке, без аккаунта, — а прямой UPDATE ему открыть
 * нельзя: политике нечем спросить «твоя ли это строка». Поэтому клиент
 * придумывает секрет (uuid), держит его у себя и присылает при каждой записи,
 * а запись идёт через одну узкую дверь — RPC `save_diag_progress`
 * (миграция 0082, security definer). Завершённый прогон функция больше не
 * переписывает.
 *
 * Ошибку глотаем намеренно: это фоновая дозапись после каждого ответа, и
 * ронять на ней прохождение нельзя. Итоговый вызов (`completed: true`) свою
 * неудачу показывает — там есть экран с повтором.
 */
export async function saveDiagProgress(p: {
  token: string
  name: string
  subject: DiagSubject | string
  results: DiagResults
  answers: Record<string, DiagAnswer>
  answered: number
  total: number
  completed: boolean
  studentId?: string
  assignmentId?: string
  scorePct?: number
}): Promise<boolean> {
  const { error } = await supabase.rpc('save_diag_progress', {
    p_token: p.token,
    p_name: p.name,
    p_subject: p.subject,
    p_results: p.results,
    p_answers: p.answers,
    p_student_id: p.studentId ?? null,
    p_assignment_id: p.assignmentId ?? null,
    p_score_pct: p.scorePct ?? null,
    p_answered: p.answered,
    p_total: p.total,
    p_completed: p.completed,
  })
  if (error) { console.error('saveDiagProgress:', error); return false }
  return true
}

// ── Продолжить брошенный прогон (0094) ──────────────────────────────────────
// Строка дописывается после каждого ответа, но раньше прочитать её обратно
// аноним не мог — закрыл вкладку, и тест начинался с нуля отдельной строкой.

export interface DiagProgress {
  name: string
  subject: string
  answers: Record<string, DiagAnswer>
  completed: boolean
  studentId?: string
  assignmentId?: string
}

/** Прогон по токену владения; `null` — не нашёлся (удалён или токен чужой). */
export async function loadDiagProgress(token: string): Promise<DiagProgress | null> {
  const { data, error } = await supabase.rpc('load_diag_progress', { p_token: token })
  if (error) { console.error('loadDiagProgress:', error); return null }
  const row = (data as Record<string, unknown>[] | null)?.[0]
  if (!row) return null
  return {
    name: row.name as string,
    subject: row.subject as string,
    answers: (row.answers as Record<string, DiagAnswer> | null) ?? {},
    completed: !!row.completed,
    studentId: (row.student_id as string | null) ?? undefined,
    assignmentId: (row.assignment_id as string | null) ?? undefined,
  }
}

/** «Начать заново»: брошенный прогон удаляется, чтобы в таблице не было двух строк. Сданный — нет. */
export async function discardDiagProgress(token: string): Promise<void> {
  const { error } = await supabase.rpc('discard_diag_progress', { p_token: token })
  if (error) console.error('discardDiagProgress:', error)
}

/** Личная ссылка ученику: открывает его же прогон со следующего вопроса. */
export function diagResumeHash(r: Pick<AnonDiagResult, 'subject' | 'ownerToken'>): string | null {
  if (!r.ownerToken) return null
  return `#/diagnostic?subject=${encodeURIComponent(r.subject)}&resume=${encodeURIComponent(r.ownerToken)}`
}

export async function appendAnonResult(
  // completed/answered/total сюда не передают: эта дверь пишет только
  // законченный прогон целиком (скрининг). Промежуточное — saveDiagProgress.
  r: Omit<AnonDiagResult, 'id' | 'timestamp' | 'completed' | 'answered' | 'total'>,
  opts?: { studentId?: string; assignmentId?: string; scorePct?: number },
): Promise<boolean> {
  const { error } = await supabase
    .from('diag_results')
    .insert({
      name: r.name,
      subject: r.subject,
      results: r.results,
      answers: r.answers,
      linked_student_id: opts?.studentId ?? null,
      student_id: opts?.studentId ?? null,
      assignment_id: opts?.assignmentId ?? null,
      score_pct: opts?.scorePct ?? null,
    })
  if (error) { console.error('appendAnonResult:', error); return false }

  // Auto-update student score field when submitted under an assignment
  if (opts?.studentId && opts?.assignmentId && opts.scorePct != null) {
    await updateStudentScoreFromAssignment(opts.studentId, opts.assignmentId, opts.scorePct)
  }

  return true
}

export async function updateStudentScoreFromAssignment(studentId: string, assignmentId: string, scorePct: number) {
  const { data: asgn } = await supabase
    .from('test_assignments')
    .select('assign_type')
    .eq('id', assignmentId)
    .single()
  if (!asgn) return
  const field = asgn.assign_type === 'trial' ? 'trial_score' : 'test_score'
  await supabase.from('students').update({ [field]: scorePct }).eq('id', studentId)
}

// ─── Test assignment helpers ──────────────────────────────────────────────────
export interface TestAssignment {
  id: string
  title: string
  subject: string
  assignType: 'test' | 'trial'
  groupIds: string[]
  studentIds: string[]
  dueDate?: string
  createdAt: string
  closed: boolean
}

function rowToAssignment(row: Record<string, unknown>): TestAssignment {
  return {
    id: row.id as string,
    title: row.title as string,
    subject: row.subject as string,
    assignType: (row.assign_type as 'test' | 'trial') ?? 'test',
    groupIds: (row.group_ids as string[]) ?? [],
    studentIds: (row.student_ids as string[]) ?? [],
    dueDate: (row.due_date as string | null) ?? undefined,
    createdAt: row.created_at as string,
    closed: (row.closed as boolean) ?? false,
  }
}

export async function createTestAssignment(a: Omit<TestAssignment, 'id' | 'createdAt'>): Promise<TestAssignment | null> {
  const { data, error } = await supabase
    .from('test_assignments')
    .insert({
      title: a.title,
      subject: a.subject,
      assign_type: a.assignType,
      group_ids: a.groupIds,
      student_ids: a.studentIds,
      due_date: a.dueDate ?? null,
      closed: false,
    })
    .select()
    .single()
  if (error) { console.error('createTestAssignment:', error); return null }
  return rowToAssignment(data)
}

export async function loadTestAssignments(): Promise<TestAssignment[]> {
  const { data } = await supabase
    .from('test_assignments')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToAssignment)
}

export async function deleteTestAssignment(id: string): Promise<void> {
  await supabase.from('test_assignments').delete().eq('id', id)
}

// Fetch assignments visible to a student (by student id or group id)
export async function fetchStudentAssignments(studentId: string, groupId: string): Promise<TestAssignment[]> {
  const { data } = await supabase
    .from('test_assignments')
    .select('*')
    .eq('closed', false)
    .order('created_at', { ascending: false })
  if (!data) return []

  return data
    .map(rowToAssignment)
    .filter(a =>
      a.groupIds.includes(groupId) || a.studentIds.includes(studentId)
    )
}

// Check if a student already submitted a specific assignment
export async function checkAssignmentSubmitted(studentId: string, assignmentId: string): Promise<boolean> {
  const { count } = await supabase
    .from('diag_results')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
  return (count ?? 0) > 0
}

// Load results for a specific assignment (for teacher view)
export async function loadAssignmentResults(assignmentId: string): Promise<AnonDiagResult[]> {
  const { data } = await supabase
    .from('diag_results')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToResult)
}

export async function linkAnonResult(id: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('diag_results')
    .update({ linked_student_id: studentId })
    .eq('id', id)
  if (error) console.error('linkAnonResult:', error)
}

export async function unlinkAnonResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('diag_results')
    .update({ linked_student_id: null })
    .eq('id', id)
  if (error) console.error('unlinkAnonResult:', error)
}

export async function deleteAnonResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('diag_results')
    .delete()
    .eq('id', id)
  if (error) console.error('deleteAnonResult:', error)
}
