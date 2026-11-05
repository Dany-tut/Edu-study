import type { Session } from '@supabase/supabase-js'

// Какой кабинет открыть на голом адресе, не дожидаясь сети.
//
// Только учитель/админ → учительская. Только ученик → ученическая. И то и
// другое (админ со своей карточкой ученика) → тот, где был последним: иначе
// посмотреть свой ученический кабинет можно было бы только до следующего входа.

export type Cabinet = 'teacher' | 'student'
const LAST_KEY = 'iskra:last-cabinet'

export function lastCabinet(): Cabinet | null {
  try {
    const value = localStorage.getItem(LAST_KEY)
    return value === 'teacher' || value === 'student' ? value : null
  } catch { return null }
}

export function rememberCabinet(cabinet: Cabinet) {
  try { localStorage.setItem(LAST_KEY, cabinet) } catch { /* storage blocked */ }
}

// Последний ответ сервера «это сотрудник» на этом устройстве. Только подсказка,
// что рисовать до проверки: данные всё равно закрыты RLS, а «нет» от сервера
// кабинет закрывает (TeacherRouteGate).
const STAFF_HINT_KEY = 'iskra.staffHint'
export function readStaffHint(user: string) {
  try { return localStorage.getItem(STAFF_HINT_KEY) === user } catch { return false }
}
export function writeStaffHint(user: string, staff: boolean) {
  try {
    if (staff) localStorage.setItem(STAFF_HINT_KEY, user)
    else if (localStorage.getItem(STAFF_HINT_KEY) === user) localStorage.removeItem(STAFF_HINT_KEY)
  } catch { /* Storage blocked: fall back to the fenced check. */ }
}

/** Роль из токена (app_metadata) или прошлая положительная проверка — без запросов. */
export function likelyStaff(session: Session | null | undefined) {
  if (!session || session.user.is_anonymous) return false
  const role = session.user.app_metadata?.role
  return role === 'teacher' || role === 'admin' || readStaffHint(session.user.id)
}

/** Есть ли сохранённая сессия Supabase. Без неё ждать getSession незачем:
 * гость видит лендинг сразу, а не после межвкладочной блокировки Auth. */
export function hasStoredAuth() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (/^sb-.+-auth-token$/.test(localStorage.key(i) ?? '')) return true
    }
  } catch { /* storage blocked */ }
  return false
}
