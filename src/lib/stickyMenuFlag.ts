import { useEffect, useMemo } from 'react'

/** Пункты меню профиля, которые зависят от ответа сервера («В кабинет препода»,
 *  «Друзья», «Оплата»), раньше появлялись по одному уже в открытом меню — оно
 *  росло на глазах. Помним прошлый ответ для этого ученика и показываем его,
 *  пока свежий не пришёл; свежий ответ всегда побеждает и перезаписывает память. */
const keyOf = (owner: string, flag: string) => `menu-flag.${flag}.${owner}`

function read(owner: string, flag: string): boolean {
  try { return localStorage.getItem(keyOf(owner, flag)) === '1' } catch { return false }
}

function write(owner: string, flag: string, value: boolean) {
  try {
    if (value) localStorage.setItem(keyOf(owner, flag), '1')
    else localStorage.removeItem(keyOf(owner, flag))
  } catch { /* без хранилища — просто без памяти */ }
}

/** value — свежий ответ, known — пришёл ли он. До ответа — прошлый ответ. */
export function useStickyMenuFlag(owner: string | null | undefined, flag: string, value: boolean, known: boolean): boolean {
  const cached = useMemo(() => !!owner && read(owner, flag), [owner, flag])
  useEffect(() => { if (owner && known) write(owner, flag, value) }, [owner, flag, value, known])
  if (!owner) return false
  return known ? value : cached
}
