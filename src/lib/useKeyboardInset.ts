import { useEffect, useState } from 'react'

// Height (px) the on-screen keyboard overlaps the layout viewport bottom.
// The virtual keyboard shrinks only the *visual* viewport, not the layout
// viewport, so `position: fixed` bottom-anchored elements (bottom nav, the
// trainer's search dock) stay pinned under the keyboard. This hook reports the
// overlap so those elements can lift above it and settle back when it closes.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      // Bottom gap between the layout viewport and the visible viewport.
      const overlap = window.innerHeight - vv.height - vv.offsetTop
      setInset(overlap > 40 ? overlap : 0) // ignore URL-bar jitter
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
