/**
 * Действие ждёт человека (например, код двухфакторной защиты при входе).
 * Пока ждёт, общий таймаут useAsyncTask не считается: «сервер не ответил»
 * здесь неправда — отвечать должен человек.
 */
let waiting = 0
export const isWaitingForUser = () => waiting > 0
export function beginUserWait() {
  waiting++
  let done = false
  return () => { if (!done) { done = true; waiting-- } }
}
