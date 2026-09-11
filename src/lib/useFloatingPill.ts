import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

type PillRect = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * ПЛАШКА ЕДЕТ ТРАНСФОРМОМ, А НЕ left/top.
 *
 * Спред `pillRect` в `animate` анимировал `left`/`top`: браузер на каждый кадр
 * пружины заново раскладывает и перекрашивает ряд, а ряд курсов — это семь
 * длинных названий с переносами. Переключение курса из-за этого дёргалось.
 * `pillMotion` отдаёт ту же геометрию сдвигом (`x`/`y` — это transform, кадр
 * уходит на композитор). Плашка при этом обязана стоять в нуле контейнера —
 * иначе трансформ считался бы от места, куда её положил флекс: для этого
 * `PILL_ANCHOR`.
 */
export const PILL_ANCHOR = { position: 'absolute', left: 0, top: 0 } as const

export function useFloatingPill<T extends string | number>(activeId: T) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const [pillRect, setPillRect] = useState<PillRect | null>(null)

  const measure = useCallback(() => {
    const container = containerRef.current
    const activeEl = itemRefs.current.get(String(activeId))
    if (!container || !activeEl) {
      setPillRect(null)
      return
    }

    const containerRect = container.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()

    // СПРЯТАННЫЙ ЭКРАН НЕ ПЕРЕСЧИТЫВАЕТ ПЛАШКУ.
    //
    // Страница каталога на время урока прячется через display:none, а не
    // размонтируется (см. DashboardPage). ResizeObserver честно сообщает про
    // нулевой размер, и замер записал бы плашке 0×0 — на возврате она поехала
    // бы пружиной из левого верхнего угла к выбранной таблетке. Пока размера
    // нет, держим последний известный.
    if (!activeRect.width && !activeRect.height) return

    // getBoundingClientRect is measured from the container's border-box (outer
    // edge), but an absolutely-positioned child resolves top/left against the
    // padding-box (inside the border). Subtract the border (clientTop/clientLeft)
    // so the pill isn't offset by the container's border width.
    setPillRect({
      left: activeRect.left - containerRect.left - container.clientLeft,
      top: activeRect.top - containerRect.top - container.clientTop,
      width: activeRect.width,
      height: activeRect.height,
    })
  }, [activeId])

  const registerItem = useCallback(
    (id: T) => (node: HTMLElement | null) => {
      const key = String(id)
      if (node) itemRefs.current.set(key, node)
      else itemRefs.current.delete(key)
    },
    [],
  )

  useLayoutEffect(() => {
    measure()
    const frame = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(frame)
  }, [measure])

  useEffect(() => {
    const onResize = () => measure()
    window.addEventListener('resize', onResize)

    const observer = new ResizeObserver(() => measure())
    if (containerRef.current) observer.observe(containerRef.current)
    itemRefs.current.forEach(node => observer.observe(node))

    return () => {
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [measure, activeId])

  // Ширина и высота остаются собой: у таблеток она разная, и подменить её
  // масштабом нельзя — растянулись бы и скругление, и рамка. Но меняются они
  // на одном элементе с position:absolute, соседей не двигают.
  const pillMotion = useMemo(
    () => pillRect && { x: pillRect.left, y: pillRect.top, width: pillRect.width, height: pillRect.height },
    [pillRect],
  )

  return { containerRef, registerItem, pillRect, pillMotion, measure }
}
