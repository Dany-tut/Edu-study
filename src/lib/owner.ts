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
// Хранится в localStorage, чтобы переживать перезагрузку: админ уходит в чужой
// кабинет надолго и F5 не должен возвращать его к себе молча.

const VIEW_AS_KEY = 'iskra:viewAsTeacher'

export interface ViewAsTeacher { id: string; name: string }

export function getViewAs(): ViewAsTeacher | null {
  try {
    const raw = localStorage.getItem(VIEW_AS_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as ViewAsTeacher
    return v?.id ? v : null
  } catch { return null }
}

/**
 * Переключить кабинет. Страница перезагружается намеренно: владельца успели
 * прочитать десятки хуков и сторов со своими кешами, и выборочно их сбрасывать
 * — значит однажды забыть один и показать смесь двух кабинетов.
 */
export function setViewAs(teacher: ViewAsTeacher | null) {
  try {
    if (teacher) localStorage.setItem(VIEW_AS_KEY, JSON.stringify(teacher))
    else localStorage.removeItem(VIEW_AS_KEY)
  } catch { /* приватный режим — просто не запомним */ }
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
  if (view) return view.id
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
    try { localStorage.removeItem(VIEW_AS_KEY) } catch { /* не важно */ }
  }
})
