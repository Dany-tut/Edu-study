// ─────────────────────────────────────────────────────────────────────────────
// Пробники IELTS — попытки, черновик и оценка моделью
//
// ГДЕ ЖИВУТ ПОПЫТКИ. В localStorage, как прогресс текстов и аудио тренажёра
// (lib/trainerProgress): результат — для себя, учитель его пока не видит.
// Таблица в базе понадобится, когда пробник станет домашкой; до тех пор
// заводить её ради одной вкладки незачем.
//
// ЧЕРНОВИК. Идущая попытка пишется на каждое изменение: эссе на 250 слов,
// потерянное из-за F5 или выгруженной вкладки на телефоне, — это сорок минут
// работы. Вместе с ответами хранится срок секции (`deadline`), а не остаток:
// после перезагрузки таймер продолжает с того же места, а не начинает заново.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { t } from './i18n'
import { appFlag } from './cardGroups'
import { SECTION_ORDER as SECTIONS, type IeltsSection } from '../data/ieltsMocks'
import { overallBand, writingBand } from './ieltsScore'

export interface GradeCriterion { key: string; name: string; band: number; comment: string }

export interface Grade {
  band: number
  criteria: GradeCriterion[]
  strengths: string[]
  fixes: { quote: string; issue: string; better: string }[]
  /** Замены «простое слово → точнее», их можно унести в карточки. */
  lexis?: { from: string; to: string; ru: string }[]
  summary: string
  model?: string
}

export interface SpeakingAnswer {
  part: 1 | 2 | 3
  question: string
  transcript: string
  seconds: number
}

/** Одна секция попытки. */
export interface SectionResult {
  /** Listening / Reading: ответы по номеру вопроса. */
  answers?: Record<number, string>
  raw?: number
  /** Writing: тексты двух заданий. */
  texts?: Record<1 | 2, string>
  /** Speaking: расшифровки по вопросам. */
  speech?: SpeakingAnswer[]
  /** Reading: выделенное маркером — «номер текста:номер абзаца» → куски. */
  marks?: Record<string, string[]>
  /**
   * Балл Listening / Reading — считается ключом в момент сдачи. У Writing и
   * Speaking его здесь нет: их балл живёт в хранилище оценок (см. ниже) и
   * приезжает позже, иногда — когда экзамен уже закрыт.
   */
  band?: number | null
  finishedAt?: number
}

export interface MockAttempt {
  id: string
  mockId: string
  /** Полный пробник или одна секция. */
  scope: 'full' | IeltsSection
  startedAt: number
  finishedAt?: number
  sections: Partial<Record<IeltsSection, SectionResult>>
}

/** Идущая попытка: где человек сейчас и до какого момента идёт таймер. */
export interface MockDraft {
  attempt: MockAttempt
  section: IeltsSection
  /** Номер части/текста/задания внутри секции. */
  step: number
  /** Срок таймера секции, мс epoch. null — у шага таймера нет. */
  deadline: number | null
  /**
   * Пауза: сколько оставалось, когда остановили. Только в практике одной
   * секции — в полном пробнике паузы нет, как и на экзамене.
   */
  paused?: number | null
}

const HISTORY_KEY = 'ielts.mocks.history.v1'
const DRAFT_KEY = 'ielts.mocks.draft.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch { /* приватный режим или переполнение — пробник идёт и без памяти */ }
}

export const loadHistory = (): MockAttempt[] => read<MockAttempt[]>(HISTORY_KEY, [])

export function saveAttempt(a: MockAttempt) {
  const rest = loadHistory().filter(x => x.id !== a.id)
  // Новые сверху; держим полсотни — дальше история уже не читается глазами,
  // а localStorage у сайта общий на все разделы.
  write(HISTORY_KEY, [a, ...rest].slice(0, 50))
}

export function deleteAttempt(id: string) {
  write(HISTORY_KEY, loadHistory().filter(x => x.id !== id))
}

export const loadDraft = (): MockDraft | null => read<MockDraft | null>(DRAFT_KEY, null)
export const saveDraft = (d: MockDraft | null) => write(DRAFT_KEY, d)

/**
 * Последний балл по каждой секции — для рейла. Берётся из любой попытки, где
 * секция досчитана: пробник по одной секции тоже измеряет.
 */
export function lastBands(history: MockAttempt[]): Partial<Record<IeltsSection, number>> {
  const out: Partial<Record<IeltsSection, number>> = {}
  for (const a of history) {
    for (const s of Object.keys(a.sections) as IeltsSection[]) {
      const b = sectionBand(a, s)
      if (out[s] == null && b != null) out[s] = b
    }
  }
  return out
}

/**
 * Балл секции попытки. Listening и Reading — из самой попытки; Writing и
 * Speaking — из оценок модели. Writing без обеих оценок балла не получает:
 * одно задание из двух — это не балл за секцию.
 */
export function sectionBand(a: MockAttempt, s: IeltsSection, g: AttemptGrades = loadGrades(a.id)): number | null {
  const r = a.sections[s]
  if (!r?.finishedAt) return null
  if (s === 'listening' || s === 'reading') return r.band ?? null
  if (s === 'speaking') return g.grades.speaking?.band ?? null
  const t1 = g.grades.t1?.band
  const t2 = g.grades.t2?.band
  return t1 != null && t2 != null ? writingBand(t1, t2) : null
}

/** Итог попытки — только если досчитаны все четыре секции. */
export function attemptOverall(a: MockAttempt, g: AttemptGrades = loadGrades(a.id)): number | null {
  return overallBand(SECTIONS.map(s => sectionBand(a, s, g)))
}

// ─── Оценка моделью ──────────────────────────────────────────────────────────

/** Обе галочки: общий рубильник и свой (миграция 0099). */
export async function mockGradingEnabled(): Promise<boolean> {
  const [master, own] = await Promise.all([appFlag('ai_enabled'), appFlag('ai_ielts_grade')])
  return master && own
}

/**
 * Можно ли звать оценку: она платная, поэтому только для вошедших. Гость
 * (тренажёр по присланной ссылке) пробник проходит целиком, но письмо и речь
 * сохраняются без балла — и об этом говорится словами, а не «401».
 */
export async function canGrade(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return 'Оценка письма и речи — после входа в кабинет'
  if (!(await mockGradingEnabled())) return 'Оценка моделью выключена в админке'
  return null
}

// ─── Цель и дата экзамена ────────────────────────────────────────────────────
//
// Без цели балл пробника — просто число: «6.0» хорошо или плохо, зависит от
// того, нужен ли человеку 6.5 через месяц или 7.5 через полгода. Цель и дата
// превращают историю попыток в ответ на единственный вопрос, который его
// волнует: успеваю или нет.

export interface MockGoal {
  /** Целевой общий балл. */
  target: number
  /** Дата экзамена, YYYY-MM-DD. Пусто — даты ещё нет. */
  date?: string
}

const GOAL_KEY = 'ielts.mocks.goal.v1'

export const loadGoal = (): MockGoal | null => read<MockGoal | null>(GOAL_KEY, null)
export const saveGoal = (g: MockGoal | null) => write(GOAL_KEY, g)

/** Дней до экзамена; null — даты нет, отрицательное — дата прошла. */
export function daysLeft(goal: MockGoal | null, now = Date.now()): number | null {
  if (!goal?.date) return null
  const d = new Date(`${goal.date}T00:00:00`).getTime()
  if (!Number.isFinite(d)) return null
  return Math.ceil((d - now) / 86_400_000)
}

/**
 * Текущий уровень: последний балл по каждой секции, сведённый в общий.
 * Это не «прогноз на день экзамена», а честное «если бы экзамен был сегодня»:
 * экстраполировать рост по двум-трём попыткам значило бы обещать то, чего
 * данные не говорят. Нет хотя бы одной секции — уровня нет.
 */
export function currentLevel(history: MockAttempt[]): { overall: number | null; bands: Partial<Record<IeltsSection, number>> } {
  const bands = lastBands(history)
  return { overall: overallBand(SECTIONS.map(s => bands[s])), bands }
}

/** Самая слабая из досчитанных секций — по ней строится план дня. */
export function weakestSection(bands: Partial<Record<IeltsSection, number>>): IeltsSection | null {
  let worst: IeltsSection | null = null
  for (const s of SECTIONS) {
    const b = bands[s]
    if (b == null) continue
    if (worst == null || b < (bands[worst] ?? 99)) worst = s
  }
  return worst
}

/**
 * Динамика секции по попыткам, от старых к новым. Нужна для мини-графика:
 * одно число говорит «где я», ряд из пяти — «двигаюсь ли».
 */
export function bandSeries(history: MockAttempt[], s: IeltsSection): number[] {
  return [...history].reverse()
    .map(a => sectionBand(a, s))
    .filter((b): b is number => b != null)
}

// ─── Speak or Die ────────────────────────────────────────────────────────────

const ARCADE_KEY = 'ielts.arcade.v1'

export interface ArcadeRecord { best: number; plays: number; /** Когда играли последний раз — для плана дня. */ last?: number }

export const loadArcade = (): ArcadeRecord => read<ArcadeRecord>(ARCADE_KEY, { best: 0, plays: 0 })
export const saveArcade = (r: ArcadeRecord) => write(ARCADE_KEY, r)

async function call(body: Record<string, unknown>): Promise<Grade> {
  const { data, error } = await supabase.functions.invoke('ielts-grade', { body })
  if (error) {
    // Тот же разбор, что у cards-extract: причина отказа лежит в error.context,
    // и context — не всегда Response (функцию не задеплоили, оборвалась сеть).
    const context = (error as { context?: unknown }).context
    const said = context instanceof Response
      ? await context.clone().json().then(b => b?.error as string | undefined).catch(() => undefined)
      : undefined
    throw new Error(said || error.message || t('Не получилось получить оценку'))
  }
  if (data?.error) throw new Error(data.error as string)
  return data as Grade
}

// ─── Оценки попыток ──────────────────────────────────────────────────────────
//
// ОТДЕЛЬНО ОТ ПОПЫТКИ. Оценка приезжает через десять–тридцать секунд, и за это
// время человек успевает уйти в Speaking, закрыть экзамен или открыть историю.
// Положи её в саму попытку — пришлось бы угадывать, где попытка сейчас: в
// черновике, в истории или уже ни там, ни там. Отдельная запись по id попытки
// не зависит от того, где сама попытка, а экраны узнают о ней событием.

export type GradeKey = 't1' | 't2' | 'speaking'

export interface AttemptGrades {
  grades: Partial<Record<GradeKey, Grade>>
  /** Почему оценки нет: выключено, сбой шлюза, мало текста. */
  errors: Partial<Record<GradeKey, string>>
}

const GRADES_KEY = 'ielts.mocks.grades.v1'
const GRADES_EVENT = 'ielts-mock-grades'

/** Что сейчас оценивается: `${attemptId}:${key}`. Живёт до конца вкладки. */
const inflight = new Set<string>()

export const isGrading = (attemptId: string, key: GradeKey) => inflight.has(`${attemptId}:${key}`)

export function loadGrades(attemptId: string): AttemptGrades {
  const all = read<Record<string, AttemptGrades>>(GRADES_KEY, {})
  return all[attemptId] ?? { grades: {}, errors: {} }
}

function putGrade(attemptId: string, key: GradeKey, grade: Grade | null, error?: string) {
  const all = read<Record<string, AttemptGrades>>(GRADES_KEY, {})
  const cur = all[attemptId] ?? { grades: {}, errors: {} }
  if (grade) { cur.grades[key] = grade; delete cur.errors[key] } else if (error) cur.errors[key] = error
  all[attemptId] = cur
  write(GRADES_KEY, all)
  window.dispatchEvent(new CustomEvent(GRADES_EVENT, { detail: attemptId }))
}

/** Подписка на оценки: зовёт `fn` при каждом изменении (своём или чужом). */
export function onGrades(fn: () => void): () => void {
  window.addEventListener(GRADES_EVENT, fn)
  return () => window.removeEventListener(GRADES_EVENT, fn)
}

/**
 * Запустить оценку одного ответа. Повторный вызов того же ключа, пока первый не
 * вернулся, ничего не делает: кнопка «Оценить заново» и автозапуск после сдачи
 * не должны платить за одно эссе дважды.
 */
export async function runGrade(attemptId: string, key: GradeKey, job: () => Promise<Grade>) {
  const id = `${attemptId}:${key}`
  if (inflight.has(id)) return
  inflight.add(id)
  window.dispatchEvent(new CustomEvent(GRADES_EVENT, { detail: attemptId }))
  try {
    putGrade(attemptId, key, await job())
  } catch (e) {
    putGrade(attemptId, key, null, e instanceof Error ? e.message : String(e))
  } finally {
    inflight.delete(id)
    window.dispatchEvent(new CustomEvent(GRADES_EVENT, { detail: attemptId }))
  }
}

export const gradeWriting = (task: 1 | 2, prompt: string, text: string, facts?: string[]) =>
  call({ kind: 'writing', task, prompt, text, facts })

export const gradeSpeaking = (answers: SpeakingAnswer[]) =>
  call({ kind: 'speaking', answers })
