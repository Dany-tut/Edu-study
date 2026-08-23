import { useEffect, useRef } from 'react'

/**
 * Новый экран показывается с его начала.
 *
 * ЗАЧЕМ. Тренажёр меняет содержимое ВНУТРИ одной страницы: режим, половина
 * «Чтения», открытый материал — всё это разные экраны для человека, но один и
 * тот же скролл для браузера. Пролистав ленту до середины и переключившись на
 * «Тексты», ученик попадал в середину нового списка (а если тот короче — вообще
 * в пустоту под ним) и не понимал, куда делся верх.
 *
 * ГДЕ ЛИСТАЕТСЯ. На десктопе — внутренняя панель кабинета (.dashboard-main),
 * на телефоне страница монтируется без неё и листается окном. Поэтому обнуляем
 * обе: лишнее обнуление того, что и так стоит на нуле, ничего не стоит.
 *
 * Без 'smooth': плавная прокрутка в скрытой/переставляемой панели молча ничего
 * не делает, а здесь важен именно факт — экран обязан начаться сверху.
 */
export function useScreenTop(key: string) {
  const prev = useRef<string | null>(null)
  useEffect(() => {
    // Первый проход — это монтирование (в том числе восстановление после F5):
    // экран и так открывается сверху, и обнулять там нечего.
    if (prev.current === null) { prev.current = key; return }
    if (prev.current === key) return
    prev.current = key
    const main = document.querySelector('.dashboard-main') as HTMLElement | null
    if (main) main.scrollTop = 0
    window.scrollTo(0, 0)
    const root = document.scrollingElement as HTMLElement | null
    if (root) root.scrollTop = 0
  }, [key])
}
