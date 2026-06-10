import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

type PillRect = {
  left: number
  top: number
  width: number
  height: number
}

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

    setPillRect({
      left: activeRect.left - containerRect.left,
      top: activeRect.top - containerRect.top,
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

  return { containerRef, registerItem, pillRect, measure }
}
