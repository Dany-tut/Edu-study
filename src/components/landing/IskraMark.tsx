import { useEffect, useId, useRef, useState } from 'react'

// Знак Искры «Буква И» — тот же вектор, что public/icon.svg (Figma «Искра» →
// «кит» → Тайл=Фиолетовый). В покое стоит неподвижно; каждое наведение на
// .iskra-host (знак + слово «Искра») проигрывает следующую анимацию по кругу:
//   пишется → искра падает → мерцание → пружина.
// Повтор = перемонтирование svg по key, анимации только CSS: rAF в превью
// не срабатывает (см. [[preview-no-raf]]).
//
// id градиентов через useId: одинаковые id на странице ломают заливку.

const VARIANTS = ['im-write', 'im-fall', 'im-twinkle', 'im-spring'] as const

const CSS = `
.iskra-mark * { transform-box: fill-box; }
.iskra-mark .im-sp { transform-origin: 50% 50%; }
.im-write .im-sl, .im-write .im-sr { transform-origin: 50% 100%; animation: im-grow .35s cubic-bezier(.22,1,.36,1) both; }
.im-write .im-sl { animation-delay: .05s; } .im-write .im-sr { animation-delay: .6s; }
.im-write .im-dg { stroke-dasharray: 50 60; animation: im-draw .35s cubic-bezier(.5,0,.3,1) .35s both; }
.im-write .im-sp { animation: im-pop .6s cubic-bezier(.34,1.56,.64,1) .85s both; }
.im-fall .im-sp { animation: im-fall .7s cubic-bezier(.34,1.4,.64,1) both; }
.im-fall .im-gl { animation: im-flash 1s ease-out .55s both; }
.im-fall .im-lt { animation: im-lit 1s ease-out .55s both; }
.im-twinkle .im-sp { animation: im-twinkle 1.2s ease-in-out both; }
.im-twinkle .im-gl { animation: im-breathe 1.2s ease-in-out both; }
.im-spring .im-tl { transform-origin: 50% 50%; animation: im-jelly .8s cubic-bezier(.34,1.56,.64,1) both; }
.im-spring .im-lt { transform-origin: 50% 100%; animation: im-hop .6s cubic-bezier(.34,1.56,.64,1) .2s both; }
.im-spring .im-sp { animation: im-spin .7s cubic-bezier(.34,1.56,.64,1) .35s both; }

@keyframes im-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes im-draw { from { stroke-dashoffset: 50 } to { stroke-dashoffset: 0 } }
@keyframes im-pop { from { transform: scale(0) rotate(-140deg); opacity: 0 } 60% { opacity: 1 } to { transform: scale(1) rotate(0); opacity: 1 } }
@keyframes im-fall { from { transform: translate(30px,-40px) scale(.3) rotate(-200deg); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes im-flash { 0% { opacity: 0 } 30% { opacity: 1; transform: scale(1.8) } 100% { opacity: .8; transform: scale(1) } }
@keyframes im-lit { 0%, 100% { filter: none } 30% { filter: drop-shadow(0 0 3px #fff) } }
@keyframes im-twinkle { 0%, 100% { transform: scale(1) rotate(0) } 40% { transform: scale(.72) rotate(30deg) } 65% { transform: scale(1.15) rotate(-8deg) } }
@keyframes im-breathe { 0%, 100% { opacity: .8 } 65% { opacity: 1 } }
@keyframes im-jelly { 0% { transform: scale(.4) } 40% { transform: scale(1.12,.9) } 65% { transform: scale(.95,1.05) } 100% { transform: scale(1) } }
@keyframes im-hop { from { transform: scaleY(.2); opacity: 0 } to { transform: scaleY(1); opacity: 1 } }
@keyframes im-spin { from { transform: scale(0) rotate(-360deg) } to { transform: scale(1) rotate(0) } }

@media (prefers-reduced-motion: reduce) { .iskra-mark * { animation: none !important; } }
`

const SPARK = 'M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10Z'

export default function IskraMark({ size = 30 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  const ref = useRef<SVGSVGElement>(null)
  // play = сколько раз наводили; 0 — ещё ни разу, знак стоит без анимации
  const [play, setPlay] = useState(0)

  useEffect(() => {
    const host = ref.current?.closest('.iskra-host') ?? ref.current
    if (!host) return
    const onEnter = () => setPlay(p => p + 1)
    host.addEventListener('mouseenter', onEnter)
    return () => host.removeEventListener('mouseenter', onEnter)
  }, [])

  const variant = play ? VARIANTS[(play - 1) % VARIANTS.length] : ''
  const tile = `im-tile-${id}`, sheen = `im-sheen-${id}`, glyph = `im-glyph-${id}`, glow = `im-blur-${id}`
  return (
    <svg ref={ref} key={play} className={`iskra-mark ${variant}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <style>{CSS}</style>
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9D8BFF" />
          <stop offset="1" stopColor="#6A5AE6" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={glyph} x1="0" y1="26" x2="0" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E7E4FB" />
        </linearGradient>
        <filter id={glow} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <g className="im-tl">
        <rect width="120" height="120" rx="27" fill={`url(#${tile})`} />
        <rect width="120" height="120" rx="27" fill={`url(#${sheen})`} />
        <g className="im-lt">
          <rect className="im-sl" x="33" y="26" width="14" height="67" rx="7" fill={`url(#${glyph})`} />
          <path className="im-dg" d="M40 86 L78 54" stroke={`url(#${glyph})`} strokeWidth="14" strokeLinecap="round" fill="none" />
          <rect className="im-sr" x="71" y="47" width="14" height="46" rx="7" fill={`url(#${glyph})`} />
        </g>
        <g transform="translate(78 31) scale(0.98) translate(-12 -12)">
          <g className="im-sp">
            <path className="im-gl" d={SPARK} fill="#fff" opacity="0.8" filter={`url(#${glow})`} />
            <path d={SPARK} fill="#fff" />
          </g>
        </g>
      </g>
    </svg>
  )
}
