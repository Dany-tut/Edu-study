import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

// Current teacher/admin ownership context. Every teacher-cabinet data query is
// scoped to `created_by = auth.uid()` so a teacher only ever sees their OWN
// groups / students / homework.
//
// ПОЧЕМУ ЭТО НЕ ПРОСТО ОБЁРТКА НАД auth.getUser().
//
// `supabase.auth.getUser()` — СЕТЕВОЙ запрос: он ходит на `/auth/v1/user`
// проверять токен на сервере (замер RTT до нашего проекта — 250–500 мс). Хуже
// того, вызовы сериализуются общим замком auth-клиента: десять параллельных
// getUser() — это не один круг, а десять подряд.
//
// На входе в кабинет учителя таких вызовов набиралось около десятка — свой у
// TeacherDashboardPage, у топбара, у прав доступа, у столов, у аналитики, у
// финансов, плюс по одному на каждый хук, звавший getOwnerId (кеш ставился
// ПОСЛЕ await, и параллельные вызовы все промахивались мимо него). И почти
// каждый запрос данных ждал своего getUser первым делом.
//
// Поэтому здесь два разных ответа на два разных вопроса:
//
//   getSessionUser()/getOwnerId() — «чьи строки спрашивать». Берётся из
//                   СОХРАНЁННОЙ сессии
//                   (`getSession()` читает её локально, без сети). Это не
//                   решение о доступе: что учителю можно отдать, решает RLS на
//                   сервере, а id здесь нужен, чтобы не тащить чужое.
//
//   getAuthUser() — «кто это и что ему разрешено». Здесь нужен именно
//                   проверенный сервером ответ (`app_metadata.role`), поэтому
//                   getUser() остаётся — но ровно один раз на страницу.
//
// Оба кеша сбрасываются на любую смену auth-состояния (вход/выход/обновление).

// ── ПРОСМОТР ЧУЖОГО КАБИНЕТА (только админ) ───────────────────────────────
//
// Админу нужно видеть кабинет любого преподавателя целиком — Группы, ДЗ,
// Журнал, Финансы, — а не по кусочку в реестре. Поскольку весь кабинет
// спрашивает владельца ЗДЕСЬ, подмена одного этого id переключает все экраны
// разом, без правок в 37 местах вызова.
//
// ПОЧЕМУ ЭТО НЕ ДЫРА. Подмена работает только на чтение, и держится она не на
// честности клиента, а на RLS: политики `groups_read_auth` и
// `teacher_read_students` содержат `is_admin()` — читать чужое админу
// разрешено. А запись — `write_own_groups` с условием
// `created_by = auth.uid()`, БЕЗ исключения для админа: попытка создать что-то
// в чужом кабинете будет отклонена базой. То есть «только просмотр» здесь
// обеспечивает сервер, а не спрятанная кнопка.
//
// Контекст просмотра относится только к этой вкладке, а не ко всем окнам
// администратора. Его сессия Auth остаётся прежней; сервер по-прежнему
// проверяет её права и RLS.
const VIEW_AS_KEY = 'iskra:viewAsTeacher'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ViewAsTeacher { id: string; name: string }

function clearViewAs() {
  try { sessionStorage.removeItem(VIEW_AS_KEY) } catch { /* unavailable */ }
  try { localStorage.removeItem(VIEW_AS_KEY) } catch { /* legacy context */ }
}

export function getViewAs(): ViewAsTeacher | null {
  try {
    const raw = sessionStorage.getItem(VIEW_AS_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as ViewAsTeacher
    return UUID.test(v?.id) && typeof v.name === 'string' ? v : null
  } catch { return null }
}

/** Reload all owner-scoped stores on a clean route; never reuse another
 * teacher's navigation or an open course/cards editor. */
export function setViewAs(teacher: ViewAsTeacher | null) {
  if (teacher && !UUID.test(teacher.id)) throw new Error('Invalid teacher id')
  if (teacher) sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(teacher))
  else clearViewAs()
  try { localStorage.removeItem(VIEW_AS_KEY) } catch { /* legacy context */ }
  for (const key of ['teacher-nav', 'ce-session', 'cards-session']) {
    sessionStorage.removeItem(key)
  }
  // Updating the hash alone keeps mounted stores alive. Replace + reload gives
  // the next document the intended route before teacherStore reads navigation.
  window.history.replaceState(null, '', teacher ? '#/teacher' : '#/teacher/admin')
  window.location.reload()
}

let cachedSession: User | null | undefined
let sessionInflight: Promise<User | null> | null = null

let cachedUser: User | null | undefined
let userInflight: Promise<User | null> | null = null

/** Пользователь из локально сохранённой сессии. Без сети. */
export async function getSessionUser(): Promise<User | null> {
  if (cachedSession !== undefined) return cachedSession
  // Дедуп: пока первый вызов идёт, остальные ждут ЕГО, а не заводят свой.
  if (!sessionInflight) {
    sessionInflight = (async () => {
      const { data } = await supabase.auth.getSession()
      cachedSession = data.session?.user ?? null
      return cachedSession
    })().finally(() => { sessionInflight = null })
  }
  return sessionInflight
}

/** id владельца из локально сохранённой сессии. Без сети.
 *  Если админ смотрит чужой кабинет — id того преподавателя. */
export async function getOwnerId(): Promise<string | null> {
  const view = getViewAs()
  if (view) {
    const user = await getAuthUser()
    if (user?.app_metadata?.role === 'admin') return view.id
    clearViewAs()
  }
  return (await getSessionUser())?.id ?? null
}

/** Пользователь, проверенный сервером. Один сетевой запрос на страницу.
 *  Нужен там, где решается ПРАВО (роль админа), а не «чьи строки читать». */
export async function getAuthUser(): Promise<User | null> {
  if (cachedUser !== undefined) return cachedUser
  if (!userInflight) {
    userInflight = (async () => {
      const { data } = await supabase.auth.getUser()
      cachedUser = data.user ?? null
      return cachedUser
    })().finally(() => { userInflight = null })
  }
  return userInflight
}

supabase.auth.onAuthStateChange(evt => {
  cachedSession = undefined
  cachedUser = undefined
  // Выход из аккаунта снимает и просмотр: иначе следующий вошедший увидел бы
  // чужой кабинет, выбранный не им.
  if (evt === 'SIGNED_OUT') {
    clearViewAs()
  }
})
