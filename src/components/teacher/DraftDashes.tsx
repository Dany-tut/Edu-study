import { useLayoutEffect, useRef, useState } from 'react'

// Пунктирная рамка кнопки «Черновик». CSS `border: dashed` не даёт задать
// длину штриха и промежуток, поэтому контур рисуется SVG поверх рамки кнопки:
// у кнопки прозрачная рамка 1.5px и position: relative, svg ложится линией
// по середине этой рамки. Скругление = половина высоты: SVG срезает rx и ry
// по отдельности, и «rx с запасом» дал бы овал вместо пилюли.
export default function DraftDashes() {
  const ref = useRef<SVGSVGElement>(null)
  const [h, setH] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setH(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <svg
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: -0.75, width: 'calc(100% + 1.5px)', height: 'calc(100% + 1.5px)', overflow: 'visible', pointerEvents: 'none' }}
    >
      <rect
        x="0" y="0" width="100%" height="100%" rx={h / 2} ry={h / 2}
        fill="none" strokeWidth={1.75} strokeDasharray="2 11" strokeLinecap="round"
        style={{ stroke: 'color-mix(in srgb, var(--color-yellow-text) 45%, #D9AE2A)' }}
      />
    </svg>
  )
}
