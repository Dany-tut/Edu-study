// ─────────────────────────────────────────────────────────────────────────────
// ВРЕМЕННЫЙ ЗОНД. Снять сразу, как поймём, почему нижний док на холодном
// запуске PWA стоит выше низа экрана и садится на место после первого свайпа.
//
// Показывает все числа-кандидаты живьём: что меняется в момент свайпа — то и
// виновато. Панель стоит СВЕРХУ (верх на запуске не врёт), поэтому её видно и
// до, и после.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'

export default function ViewportProbe() {
  const probe = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState('')
  const [build, setBuild] = useState('?')

  useEffect(() => {
    fetch('./version.json?probe=1')
      .then(r => r.json())
      .then(v => setBuild(String(v.version ?? v.build ?? '?')))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const read = () => {
      const vv = window.visualViewport
      const el = probe.current
      // Реальные значения safe-area: env() читаем через размеры пробника.
      const safeTop = el ? Math.round(el.getBoundingClientRect().top) : -1
      const safeBottom = el ? Math.round(el.getBoundingClientRect().height) : -1
      const dock = document.querySelector('[data-probe-dock]')
      const dockBottom = dock ? Math.round(dock.getBoundingClientRect().bottom) : -1
      const standalone =
        (window.matchMedia?.('(display-mode: standalone)').matches ? 'S' : '-') +
        ((navigator as unknown as { standalone?: boolean }).standalone ? 'N' : '-')
      setLine([
        `v${build} ${standalone}`,
        `inner ${window.innerHeight}`,
        `doc ${document.documentElement.clientHeight}`,
        `screen ${window.screen.height}`,
        `avail ${window.screen.availHeight}`,
        `vv ${vv ? Math.round(vv.height) : -1}/${vv ? Math.round(vv.offsetTop) : -1}`,
        `safe ${safeTop}/${safeBottom}`,
        `dockB ${dockBottom}`,
        `dpr ${window.devicePixelRatio}`,
      ].join('  '))
    }
    read()
    const t = setInterval(read, 250)
    return () => clearInterval(t)
  }, [build])

  return (
    <>
      {/* Пробник safe-area: верхний край = inset-top, высота = inset-bottom. */}
      <div
        ref={probe}
        style={{
          position: 'fixed', left: 0, width: 1, pointerEvents: 'none', opacity: 0,
          top: 'env(safe-area-inset-top, 0px)',
          height: 'env(safe-area-inset-bottom, 0px)',
        }}
      />
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          pointerEvents: 'none',
          padding: '2px 4px',
          background: 'rgba(255,0,0,0.85)', color: '#fff',
          fontSize: 9, lineHeight: '12px', fontFamily: 'ui-monospace, monospace',
        }}
      >
        {line}
      </div>
    </>
  )
}
