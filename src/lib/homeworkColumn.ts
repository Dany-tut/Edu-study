import { useLayoutEffect, type RefObject } from 'react'

// Нижние полосы домашки (точки прогресса, «К результату / К уроку»,
// полоса режима одного экрана) закреплены у окна и рисуются порталом,
// поэтому центровались по окну. На ПК и айпаде в ландшафте слева стоит
// колонка «Структура домашки», и полоса съезжала влево от задания (27.11.2026,
// скриншот ученика с тестом Тестли). Колонка задания публикует свой центр и
// ширину в CSS-переменные корня; полосы берут их, а без них — центр окна.

const CENTER = '--hw-col-center'
const WIDTH = '--hw-col-width'

export function useHomeworkColumnVars(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const el = ref.current
    const root = document.documentElement.style
    if (!el || !enabled) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0) return
      root.setProperty(CENTER, `${Math.round(r.left + r.width / 2)}px`)
      root.setProperty(WIDTH, `${Math.round(r.width)}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(document.documentElement)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      root.removeProperty(CENTER)
      root.removeProperty(WIDTH)
    }
  }, [ref, enabled])
}

/** left для полосы с translateX(-50%): центр колонки задания или окна. */
export const HW_COLUMN_LEFT = `var(${CENTER}, 50%)`
/** Ширина полосы: не шире колонки задания (без неё — окна) минус поля. */
export const hwColumnWidth = (max: number, gutter: number) => `min(${max}px, calc(var(${WIDTH}, 100vw) - ${gutter}px))`
/** Отступ слева у полосы во всю ширину окна, чтобы её середина встала на центр колонки. */
export const HW_COLUMN_PAD_LEFT = `max(0px, calc(2 * var(${CENTER}, 50vw) - 100vw))`
