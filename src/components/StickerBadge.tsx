// Дешёвый статичный стикер: тот же артворк, но canvas 2D + CSS-перелив.
// Нужен там, где стикеров много (коллекция, списки) — WebGL-контекстов в
// браузере всего ~16, поэтому голо-рендер оставляем для «открытого» стикера.
import { useEffect, useRef, type CSSProperties } from 'react'
import { drawStickerArt, tierOf } from '../lib/holo/presets'

interface Props {
  score: number
  label?: string
  sublabel?: string
  size?: number
  /** Приглушить (стикер ещё не получен) */
  locked?: boolean
  onClick?: () => void
  style?: CSSProperties
}

// Кейфреймы перелива — один раз на документ (бейджей на экране бывает десятки).
const SHINE_CSS = `
  .holo-shine { animation: holoShine 5.5s linear infinite; }
  @keyframes holoShine { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  @media (prefers-reduced-motion: reduce) { .holo-shine { animation: none; } }
`
function injectShineCss() {
  if (typeof document === 'undefined' || document.getElementById('holo-shine-css')) return
  const el = document.createElement('style')
  el.id = 'holo-shine-css'
  el.textContent = SHINE_CSS
  document.head.appendChild(el)
}

export default function StickerBadge({ score, label, sublabel, size = 96, locked, onClick, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const tier = tierOf(score)

  useEffect(() => {
    injectShineCss()
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.round(size * dpr)
    const art = drawStickerArt({ score, label, sublabel, px })
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, px, px)
    ctx.drawImage(art, 0, 0)
  }, [score, label, sublabel, size])

  return (
    <div
      onClick={onClick}
      title={`${tier.name} · ${tier.score}/5`}
      style={{
        position: 'relative', width: size, height: size, flexShrink: 0,
        cursor: onClick ? 'pointer' : undefined,
        filter: locked ? 'grayscale(1) opacity(0.35)' : `drop-shadow(0 6px 14px ${tier.ink}44)`,
        ...style,
      }}
    >
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!locked && tier.shine > 0.2 && (
        <span
          className="holo-shine"
          style={{
            position: 'absolute', inset: '6%', borderRadius: '50%', pointerEvents: 'none',
            opacity: 0.25 + tier.shine * 0.5, mixBlendMode: 'overlay',
            background: 'linear-gradient(115deg, transparent 20%, #FF5F6D 32%, #FFC371 40%, #4FE0C0 48%, #5B8CFF 56%, #C77DFF 64%, transparent 78%)',
            backgroundSize: '260% 260%',
          }}
        />
      )}
    </div>
  )
}
