import { useEffect, useRef, type CSSProperties } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
}

type SpoilerTextProps = {
  children: string
  revealed?: boolean
  /** dots per px² of covered area */
  density?: number
  /** RGB triplet string e.g. "11, 11, 13"; if omitted reads --spoiler-dot-rgb CSS var */
  color?: string
  /** px the dot field extends beyond the text box on every side */
  pad?: number
  /** px over which dots fade out toward the edges (organic, non-rectangular look) */
  feather?: number
  /** peak dot opacity */
  maxAlpha?: number
  /** fill the parent container instead of wrapping just the text */
  fill?: boolean
  style?: CSSProperties
  className?: string
}

const smoothstep = (t: number) => {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/**
 * Telegram-style spoiler: the text stays in the layout (reserving its size) but is
 * hidden under a field of tiny dots. Every dot has its own random position, velocity
 * and lifetime, so the field shimmers chaotically instead of moving as one pattern.
 *
 * The field extends `pad` px past the text on every side and fades out over `feather`
 * px near the edges, so it reads as a soft organic cloud rather than a hard rectangle.
 */
export default function SpoilerText({
  children,
  revealed = false,
  density = 0.12,
  color, // rgb triplet; if omitted, reads --spoiler-dot-rgb from CSS
  pad = 10,
  feather = 14,
  maxAlpha = 0.5,
  fill = false,
  style,
  className,
}: SpoilerTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rand = (min: number, max: number) => min + Math.random() * (max - min)

    const spawn = (p: Particle, W: number, H: number) => {
      p.x = Math.random() * W
      p.y = Math.random() * H
      // each particle drifts in its own random direction & speed
      const angle = Math.random() * Math.PI * 2
      const speed = rand(0.05, 0.5)
      p.vx = Math.cos(angle) * speed
      p.vy = Math.sin(angle) * speed
      p.maxLife = rand(30, 110)
      p.life = Math.random() * p.maxLife
      p.size = rand(0.5, 1.3)
    }

    let particles: Particle[] = []
    let lastW = 0
    let lastH = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = (W: number, H: number) => {
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.max(40, Math.floor(W * H * density))
      particles = Array.from({ length: count }, () => {
        const p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 1 }
        spawn(p, W, H)
        return p
      })
      lastW = W
      lastH = H
    }

    let raf = 0
    const tick = () => {
      // measure from the laid-out canvas itself (it's sized 100% of the text + pad)
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (W >= 1 && H >= 1) {
        if (W !== lastW || H !== lastH) resize(W, H)

        ctx.clearRect(0, 0, W, H)
        const dotColor = color ?? (getComputedStyle(document.documentElement).getPropertyValue('--spoiler-dot-rgb').trim() || '11, 11, 13')
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          p.life += 1

          // wrap around edges + respawn at end of life so motion never syncs up
          if (
            p.life >= p.maxLife ||
            p.x < -2 || p.x > W + 2 ||
            p.y < -2 || p.y > H + 2
          ) {
            spawn(p, W, H)
          }

          // twinkle: fade in over first half of life, out over second half
          const t = p.life / p.maxLife
          const twinkle = t < 0.5 ? t * 2 : (1 - t) * 2

          // edge feather: fade toward the nearest edge so the cloud has soft,
          // irregular borders instead of a crisp rectangle. The left edge is kept
          // solid (excluded) because the field is anchored to the text's left edge —
          // feathering it would leave the first letters readable.
          const edgeDist = Math.min(p.y, W - p.x, H - p.y)
          const edge = smoothstep(edgeDist / feather)

          const alpha = twinkle * edge * maxAlpha
          if (alpha <= 0.01) continue

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${dotColor}, ${alpha})`
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [density, color, feather, maxAlpha])

  if (fill) {
    return (
      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease', position: 'relative', zIndex: 1, ...style }}>
          {children}
        </span>
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: revealed ? 0 : 1,
            transition: 'opacity 0.35s ease',
          }}
        />
      </div>
    )
  }

  return (
    <span className={className} style={{ position: 'relative', display: 'inline-block', ...style }}>
      {/* Text — invisible while hidden so it still reserves layout space */}
      <span style={{ opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {children}
      </span>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: 'absolute',
          // anchor the left edge to the text (so the card's left padding stays the
          // left margin) and let the soft cloud bleed past the other three sides
          top: `-${pad}px`,
          bottom: `-${pad}px`,
          right: `-${pad}px`,
          left: 0,
          width: `calc(100% + ${pad}px)`,
          height: `calc(100% + ${pad * 2}px)`,
          pointerEvents: 'none',
          opacity: revealed ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
      />
    </span>
  )
}
