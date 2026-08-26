// ─────────────────────────────────────────────────────────────────────────────
// ВРЕМЕННЫЙ ЗОНД укороченного вьюпорта. Снять вместе с диагностикой.
// Держит первый замер (t0) и живой (now) + состояние lib/viewportRepair.ts,
// чтобы одного скрина после свайпа хватало на весь разбор.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { repairState } from '../lib/viewportRepair'

export default function ViewportProbe() {
  const probe = useRef<HTMLDivElement>(null)
  const first = useRef('')
  const [line, setLine] = useState('')
  const [t0, setT0] = useState('')
  const [rep, setRep] = useState('')
  const [build, setBuild] = useState('?')

  useEffect(() => {
    fetch('./version.json?probe=1').then(r => r.json())
      .then(v => setBuild(String(v.version ?? '?'))).catch(() => {})
  }, [])

  useEffect(() => {
    const read = () => {
      const vv = window.visualViewport
      const r = probe.current?.getBoundingClientRect()
      const dock = document.querySelector('[data-probe-dock]')?.getBoundingClientRect()
      const now = [
        `in ${window.innerHeight}`,
        `doc ${document.documentElement.clientHeight}`,
        `scr ${window.screen.height}`,
        `vv ${vv ? Math.round(vv.height) : -1}+${vv ? Math.round(vv.offsetTop) : -1}`,
        `safe ${r ? Math.round(r.top) : -1}/${r ? Math.round(r.height) : -1}`,
        `dock ${dock ? Math.round(dock.top) : -1}..${dock ? Math.round(dock.bottom) : -1}`,
      ].join(' ')
      setLine(now)
      if (!first.current) { first.current = now; setT0(now) }
      const s = repairState()
      setRep(`step ${s.step} done ${s.done ? 1 : 0} gap ${s.gap} | ${s.meta.replace(/width=device-width, ?/, '')}`)
    }
    read()
    const t = setInterval(read, 250)
    return () => clearInterval(t)
  }, [])

  return (
    <>
      <div
        ref={probe}
        style={{
          position: 'fixed', left: 0, width: 1, pointerEvents: 'none', opacity: 0,
          top: 'env(safe-area-inset-top, 0px)', height: 'env(safe-area-inset-bottom, 0px)',
        }}
      />
      <div
        className="md:hidden"
        style={{
          position: 'fixed', left: 4, right: 4, zIndex: 9999,
          top: 'calc(env(safe-area-inset-top, 0px) + 44px)',
          pointerEvents: 'none', padding: '4px 6px', borderRadius: 8,
          background: 'rgba(200,0,0,0.92)', color: '#fff',
          fontSize: 11, lineHeight: '15px', fontFamily: 'ui-monospace, monospace',
        }}
      >
        <div>v{build} {window.matchMedia?.('(display-mode: standalone)').matches ? 'STANDALONE' : 'browser'}</div>
        <div>t0 {t0}</div>
        <div>now {line}</div>
        <div>rep {rep}</div>
      </div>
    </>
  )
}
