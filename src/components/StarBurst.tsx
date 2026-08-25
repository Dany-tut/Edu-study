// ─────────────────────────────────────────────────────────────────────────────
// Разлёт звёздочек на верный ответ (docs/MEMORY_STANDARD.md, Р10)
//
// ЗАЧЕМ. Вердикт должен читаться в самом элементе, по которому ученик только
// что попал, а не оверлеем поверх экрана: летящий кружок с галочкой (бывший
// AnswerFlightLayer) на телефоне не имел цели, вспыхивал на месте и гас — его
// не успевали прочитать. Звёздочки же не сообщают ничего нового словами, они
// подтверждают то, что уже видно цветом, и делают это ровно там, куда смотрит
// глаз.
//
// ПОЧЕМУ CSS, А НЕ LOTTIE И НЕ FRAMER. Разлёт случается десятки раз за урок и
// по несколько штук одновременно (пара плиток, ряд вариантов). Lottie тянет
// парсер и рисует канвас на каждую звезду, framer-motion считает кадры на
// rAF — а rAF в превью не тикает вовсе (см. память проекта preview-no-raf), и
// анимация там просто не начиналась бы. CSS-анимация проигрывается композитором
// и живёт без JS.
//
// САМОУНИЧТОЖЕНИЕ. Компонент снимает себя сам по таймеру (не по событию
// animationend: элемент могут размонтировать раньше). Родитель просто
// монтирует <StarBurst key={n} /> и больше о нём не думает.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

const STYLE_ID = 'star-burst-keyframes'
const DURATION = 720

/** Ключевые кадры вставляются один раз на документ, а не на каждую звезду. */
function ensureStyle() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
@keyframes star-burst-fly {
  0%   { transform: translate(-50%, -50%) translate(0, 0) scale(0.2) rotate(0deg); opacity: 0; }
  18%  { opacity: 1; }
  100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1) rotate(var(--rot)); opacity: 0; }
}
/* Разлёт без полёта: звёзды сразу стоят по местам и мягко гаснут.
   Гасить их за 1мс, как было раньше, — это не «меньше движения», а «никакого
   вердикта»: на телефоне с включённым «Уменьшением движения» ответ засчитан,
   а подтверждения не видно вовсе. */
@keyframes star-burst-hold {
  0%   { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.9); opacity: 0; }
  15%  { opacity: 1; }
  65%  { opacity: 1; }
  100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .star-burst-star { animation-name: star-burst-hold; }
}`
  document.head.appendChild(el)
}

/** Восемь лучей по кругу — фиксированно, без случайности: одинаковый жест
 *  каждый раз узнаётся быстрее, чем каждый раз новый. */
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
  return { angle, big: i % 2 === 0 }
})

export default function StarBurst({
  radius = 46,
  color = '#F5C244',
}: {
  /** На сколько пикселей разлетаются звёзды от центра родителя. */
  radius?: number
  color?: string
}) {
  const [alive, setAlive] = useState(true)

  useEffect(() => {
    ensureStyle()
    const timer = window.setTimeout(() => setAlive(false), DURATION + 60)
    return () => window.clearTimeout(timer)
  }, [])

  if (!alive) return null

  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', inset: 0, overflow: 'visible',
        pointerEvents: 'none', zIndex: 3,
      }}
    >
      {RAYS.map((ray, i) => {
        const dist = radius * (ray.big ? 1 : 0.68)
        const size = ray.big ? 14 : 9
        return (
          <svg
            key={i}
            className="star-burst-star"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              // Смещение и поворот — переменными: сами кадры одни на все звёзды.
              ['--dx' as string]: `${Math.cos(ray.angle) * dist}px`,
              ['--dy' as string]: `${Math.sin(ray.angle) * dist}px`,
              ['--rot' as string]: `${ray.big ? 140 : -110}deg`,
              animation: `star-burst-fly ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 18}ms both`,
              fill: color,
              filter: 'drop-shadow(0 1px 3px rgba(245,194,68,0.55))',
            }}
          >
            <path d="M12 1.6l2.9 6.1 6.7.9-4.9 4.6 1.2 6.6-5.9-3.2-5.9 3.2 1.2-6.6L2.4 8.6l6.7-.9z" />
          </svg>
        )
      })}
    </span>
  )
}
