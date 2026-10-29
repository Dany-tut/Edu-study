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
  connected: boolean
  email: string
  tests: number
  load: () => Promise<void>
}

export const useTestlyModule = create<TestlyModuleState>(set => ({
  loaded: false,
  connected: false,
  email: '',
  tests: 0,
  load: async () => {
    const user = await getAuthUser()
    if (!user) { set({ loaded: true, connected: false }); return }
    const { data } = await supabase.from('teacher_modules').select('meta')
      .eq('teacher_id', user.id).eq('module', 'testly').maybeSingle()
    const meta = (data?.meta ?? {}) as { email?: string; tests?: number }
    set({ loaded: true, connected: !!data, email: meta.email ?? '', tests: meta.tests ?? 0 })
  },
}))

const ERRORS: Record<string, string> = {
  bad_code: 'Код не подошёл или истёк. Возьмите новый в Тестли: Профиль → «Подключить к Искре».',
  not_connected: 'Тестли не подключён. Подключите его в Профиль → Модули.',
  revoked: 'Доступ к Тестли отозван. Подключите модуль заново в Профиль → Модули.',
  not_configured: 'Модуль Тестли ещё не включён на сервере.',
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
