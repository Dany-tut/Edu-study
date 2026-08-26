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

  const first = useRef<string>('')
  const [t0, setT0] = useState('')

  useEffect(() => {
    const read = () => {
      const vv = window.visualViewport
      const el = probe.current
      const r = el?.getBoundingClientRect()
      const safeTop = r ? Math.round(r.top) : -1
      const safeBottom = r ? Math.round(r.height) : -1
      const dock = document.querySelector('[data-probe-dock]')
      const dockBottom = dock ? Math.round(dock.getBoundingClientRect().bottom) : -1
      const standalone =
        (window.matchMedia?.('(display-mode: standalone)').matches ? 'S' : '-') +
        ((navigator as unknown as { standalone?: boolean }).standalone ? 'N' : '-')
      const now = [
        `in ${window.innerHeight}`,
        `doc ${document.documentElement.clientHeight}`,
        `scr ${window.screen.height}/${window.screen.availHeight}`,
        `vv ${vv ? Math.round(vv.height) : -1}+${vv ? Math.round(vv.offsetTop) : -1}`,
        `safe ${safeTop}/${safeBottom}`,
        `dockB ${dockBottom}`,
      ].join(' ')
      setLine(now)
      // Самый первый замер запоминаем навсегда: тогда одного скрина ПОСЛЕ
      // свайпа хватает, чтобы увидеть оба состояния сразу.
      if (!first.current) { first.current = now; setT0(now) }
    }
    read()
    const t = setInterval(read, 250)
    return () => clearInterval(t)
  }, [])

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
          position: 'fixed', left: 4, right: 4, zIndex: 9999,
          top: 'calc(env(safe-area-inset-top, 0px) + 44px)',
          pointerEvents: 'none',
          padding: '4px 6px', borderRadius: 8,
          background: 'rgba(200,0,0,0.92)', color: '#fff',
          fontSize: 11, lineHeight: '15px', fontFamily: 'ui-monospace, monospace',
        }}
      >
        <div>v{build} {(window.matchMedia?.('(display-mode: standalone)').matches ? 'STANDALONE' : 'browser')}</div>
        <div>t0 {t0}</div>
        <div>now {line}</div>
      </div>
    </>
  )
}
