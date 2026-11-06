import { supabase } from './supabase'

/**
 * Выход с полной перезагрузкой страницы.
 *
 * Перезагрузка обязательна: сторы (банк заданий, кабинет, журнал) живут в
 * памяти вкладки и сами не сбрасываются на SIGNED_OUT. Без неё следующий
 * вошедший в той же вкладке видел чужие задания до F5.
 *
 * signOut надо ДОЖДАТЬСЯ: SDK удаляет токен из localStorage в конце, и
 * reload сразу после вызова оставлял сессию живой. Если сервер недоступен
 * (офлайн), глобальный выход возвращает ошибку и токен не трогает — тогда
 * выходим хотя бы на этом устройстве.
 */
export async function signOutAndReload(hash: string) {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) await supabase.auth.signOut({ scope: 'local' })
  } catch {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  }
  window.location.hash = hash
  window.location.reload()
}
