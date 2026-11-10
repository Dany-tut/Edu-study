// «Последний вход» — ПОДСКАЗКА устройства, не доступ. После успешного соц-входа
// запоминаем на ЭТОМ браузере {provider, name, role}, чтобы на экране входа
// показать карточку «Продолжить как <Имя> · через <провайдер>» (один тап — тот
// же провайдер). Токенов/секретов тут НЕТ — только отображаемые данные; сессия
// живёт отдельно. На общем устройстве «Это не я» мгновенно чистит эту память.
//
// Ключ отдельный от сессии и per-origin (работает и на iskra-study.ru, и в нативке).
export type LastLoginProvider = 'apple' | 'google' | 'yandex' | 'vk'
export type LastLoginRole = 'teacher' | 'student'
export type LastLogin = { provider: LastLoginProvider; name: string; role: LastLoginRole }

const KEY = 'iskra:last-login'
const PROVIDERS: LastLoginProvider[] = ['apple', 'google', 'yandex', 'vk']

/** Запомнить последний успешный соц-вход (только 4 соц-провайдера; passkey/пр. — нет). */
export function rememberLastLogin(x: { provider: string; name: string; role: LastLoginRole }): void {
  if (!PROVIDERS.includes(x.provider as LastLoginProvider) || !x.name) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ provider: x.provider, name: x.name.trim().slice(0, 40), role: x.role }))
  } catch { /* localStorage недоступен — подсказка не критична */ }
}

/** Последний вход ДЛЯ ЭКРАНА этой роли: препод-last только на #/teacher, ученик — на #/login. */
export function readLastLogin(role: LastLoginRole): LastLogin | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const x = JSON.parse(raw)
    if (!PROVIDERS.includes(x?.provider) || x?.role !== role || !x?.name) return null
    return { provider: x.provider, name: String(x.name), role }
  } catch { return null }
}

/** «Это не я» / смена аккаунта — чистим подсказку (приватность на общем устройстве). */
export function clearLastLogin(): void {
  try { localStorage.removeItem(KEY) } catch { /* no-op */ }
}
