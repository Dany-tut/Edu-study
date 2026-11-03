// Дешёвый статичный стикер: тот же артворк, но canvas 2D с переливом по положению указателя.
// Нужен там, где стикеров много (коллекция, списки) — WebGL-контекстов в
// браузере всего ~16, поэтому голо-рендер оставляем для «открытого» стикера.
import { useEffect, useRef, type CSSProperties } from 'react'
import { drawStickerArt, tierOf, type StickerEmblem } from '../lib/holo/presets'

interface Props {
  score: number
  label?: string
  sublabel?: string
  size?: number
  /** Личность стикера — держит эмблему и высечку одинаковыми во всех размерах */
  stickerId?: string
  /** Готовая эмблема из assignEmblems(); без неё выводится из stickerId */
  emblem?: StickerEmblem
  /** Приглушить (стикер ещё не получен) */
  locked?: boolean
  onClick?: () => void
  style?: CSSProperties
}

export default function StickerBadge({ score, label, sublabel, size = 96, stickerId, emblem, locked, onClick, style }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const artwork = useRef<HTMLCanvasElement | null>(null)
  const tier = tierOf(score)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.round(size * dpr)
    const art = drawStickerArt({ score, label, sublabel, px, stickerId, emblem })
    artwork.current = art
    canvas.width = px
    canvas.height = px
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, px, px)
    ctx.drawImage(art, 0, 0)
  }, [score, label, sublabel, size, stickerId, emblem])

  function paintFoil(x?: number, y = 0.5) {
    const canvas = ref.current
    const art = artwork.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !art) return
    const px = canvas.width
    ctx.clearRect(0, 0, px, px)
    ctx.drawImage(art, 0, 0)
    if (x === undefined) return
    // source-atop keeps the moving reflection inside the actual die cut.
    const center = px * (0.95 * x + 0.45 * y - 0.2)
    const foil = ctx.createLinearGradient(center - px * 0.48, px * 0.22, center + px * 0.48, px * 0.78)
    foil.addColorStop(0, 'transparent')
    foil.addColorStop(0.24, '#f589e6a6')
    foil.addColorStop(0.43, '#8caaffab')
    foil.addColorStop(0.50, '#ffffffcf')
    foil.addColorStop(0.6, '#86ffe9b3')
    foil.addColorStop(0.76, '#ffd69aa1')
    foil.addColorStop(1, 'transparent')
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = foil
    ctx.fillRect(0, 0, px, px)
    ctx.restore()
  }

  const Element = onClick ? 'button' : 'div'
  return (
    <Element
      type={onClick ? 'button' : undefined}
      aria-label={onClick ? [label, tier.name, `${tier.score}/5`].filter(Boolean).join(' · ') : undefined}
      onClick={onClick}
      onPointerMove={locked ? undefined : event => {
        if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const box = event.currentTarget.getBoundingClientRect()
        paintFoil((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height)
      }}
      onPointerLeave={locked ? undefined : () => paintFoil()}
      title={`${tier.name} · ${tier.score}/5`}
      style={{
        border: 0, background: 'transparent', padding: 0,
        position: 'relative', width: size, height: size, flexShrink: 0,
        cursor: onClick ? 'pointer' : undefined,
        filter: locked ? 'grayscale(1) opacity(0.35)' : `drop-shadow(0 6px 14px ${tier.ink}44)`,
        ...style,
      }}
    >
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
    </Element>
  )
}
