// Модуль «Тестли» в кабинете учителя (Профиль → Модули).
//
// Тестли — отдельный продукт со своей базой. Учитель подключает его кодом из
// Тестли, сервер (функция testly-bridge) меняет код на ключ и хранит его у
// себя. Здесь — только то, что видит браузер: подключён ли модуль, к какому
// аккаунту, и список тестов. Пока модуль не подключён, кнопки «Из Тестли» в ДЗ,
// уроках курса и Конструкторе не рисуются (useTestlyModule().connected).
import { create } from 'zustand'
import { supabase } from './supabase'
import { getAuthUser } from './owner'
import { t } from './i18n'

/** Сайт Тестли: по нему ученик проходит тест, учитель открывает его в редакторе. */
export const TESTLY_SITE = 'https://testly-sigma.vercel.app'
export const testlyPlayUrl = (id: string) => `${TESTLY_SITE}/t/${id}`
export const testlyEditUrl = (id: string) => `${TESTLY_SITE}/app/tests/${id}`
export const testlyNewUrl = () => `${TESTLY_SITE}/app/tests/new`
export const testlyResultsUrl = (id: string) => `${TESTLY_SITE}/app/tests/${id}/results`

/** Тест из Тестли, как его отдаёт testly-bridge: без вопросов и ключей. */
export interface TestlyTest {
  id: string
  title: string
  status: 'draft' | 'published' | 'closed'
  questions: number
  points: number
  minutes: number | null
  /** есть развёрнутые ответы — их проверяет учитель в Тестли */
  manual: boolean
  updatedAt: string
}

interface TestlyModuleState {
  loaded: boolean
  /** учитель, чей это кабинет: пишется в TestlyRef.owner при выборе теста */
  teacherId: string
  connected: boolean
  email: string
  tests: number
  load: () => Promise<void>
}

export const useTestlyModule = create<TestlyModuleState>(set => ({
  loaded: false,
  teacherId: '',
  connected: false,
  email: '',
  tests: 0,
  load: async () => {
    const user = await getAuthUser()
    if (!user) { set({ loaded: true, connected: false }); return }
    const { data } = await supabase.from('teacher_modules').select('meta')
      .eq('teacher_id', user.id).eq('module', 'testly').maybeSingle()
    const meta = (data?.meta ?? {}) as { email?: string; tests?: number }
    set({ loaded: true, teacherId: user.id, connected: !!data, email: meta.email ?? '', tests: meta.tests ?? 0 })
  },
}))

const ERRORS: Record<string, string> = {
  bad_code: 'Код не подошёл или истёк. Возьмите новый в Тестли: Профиль → «Подключить к Искре».',
  not_connected: 'Тестли не подключён. Подключите его в Профиль → Модули.',
  revoked: 'Доступ к Тестли отозван. Подключите модуль заново в Профиль → Модули.',
  not_configured: 'Модуль Тестли ещё не включён на сервере.',
  not_student: 'Тест доступен только ученикам преподавателя.',
}

/** Вызов testly-bridge. Ошибку функции отдаём человеческим текстом. */
async function bridge<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('testly-bridge', { body })
  if (error) {
    // Response лежит в context только у FunctionsHttpError — см. googleFormsImport.ts.
    const context = (error as { context?: unknown }).context
    const code = context instanceof Response
      ? await context.clone().json().then(b => b?.error as string | undefined).catch(() => undefined)
      : undefined
    throw new Error(t(ERRORS[code ?? ''] ?? 'Не удалось связаться с Тестли. Попробуйте ещё раз.'))
  }
  return data as T
}

export async function connectTestly(code: string): Promise<void> {
  const meta = await bridge<{ email: string; tests: number }>({ action: 'connect', code })
  useTestlyModule.setState({ loaded: true, connected: true, email: meta.email, tests: meta.tests })
}

export async function disconnectTestly(): Promise<void> {
  await bridge({ action: 'disconnect' })
  useTestlyModule.setState({ connected: false, email: '', tests: 0 })
}

export async function fetchTestlyTests(): Promise<TestlyTest[]> {
  const { tests } = await bridge<{ tests: TestlyTest[] }>({ action: 'tests' })
  useTestlyModule.setState({ tests: tests.length })
  return tests
}

/** Попытка ученика в Тестли — как её отдаёт testly-bridge. */
export interface TestlyAttempt {
  state: 'none' | 'started' | 'submitted' | 'gone'
  total?: number
  answered?: number
  startedAt?: string | null
  submittedAt?: string | null
  /** балла нет, если Тестли не показывает его ученику (настройка теста) */
  got?: number
  max?: number
  pending?: boolean
  /** токен разбора /r/<token> */
  review?: string
}

export const testlyReviewUrl = (token: string) => `${TESTLY_SITE}/r/${token}`

/** Ученик: личная ссылка на тест (одна на ученика, заводится при первом открытии). */
export async function startTestlyTest(testId: string, owner?: string): Promise<string> {
  const { path } = await bridge<{ path: string }>({ action: 'start', testId, owner })
  return TESTLY_SITE + path
}

/** Ученик: что с его попыткой. */
export function fetchTestlyStatus(testId: string, owner?: string): Promise<TestlyAttempt> {
  return bridge<TestlyAttempt>({ action: 'status', testId, owner })
}

/** Учитель: свежие баллы своих учеников по тестам. */
export async function fetchTestlyResults(items: { testId: string; studentId: string }[]): Promise<(TestlyAttempt & { testId: string; studentId: string })[]> {
  if (!items.length) return []
  const { items: out } = await bridge<{ items: (TestlyAttempt & { testId: string; studentId: string })[] }>({ action: 'results', items })
  return out
}

/** «14 / 19» — балл как в Тестли, без перевода в сотню; дробные с запятой. */
export function testlyPoints(got: number, max: number): string {
  const f = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
  return `${f(got)} / ${f(max)}`
}

/** Русская форма по числу: 1 тест, 3 теста, 5 тестов. */
export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
}

/** «15 вопросов · 20 баллов · 25 мин» — одна строка на все списки. */
export function testlyMeta(x: { questions: number; points: number; minutes: number | null }): string {
  const parts = [
    `${x.questions} ${t(plural(x.questions, 'вопрос', 'вопроса', 'вопросов'))}`,
    `${x.points} ${t(plural(x.points, 'балл', 'балла', 'баллов'))}`,
  ]
  if (x.minutes) parts.push(`${x.minutes} ${t('мин')}`)
  return parts.join(' · ')
}
