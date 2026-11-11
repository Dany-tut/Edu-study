// Огонёк первого экрана — живой: дышит и раз в несколько секунд подпрыгивает
// (подставка под ним проседает при приземлении), моргает, огонёк в животе
// пульсирует, верх пламени колышется, сам он тянется к курсору, а по клику
// подскакивает и разбрасывает искры.
//
// Картинка одна (ogonek-wave.webp) — части «оживают» слоями поверх неё:
// пламя — вторая копия под маской, веки — овалы цвета кожи над глазами
// (координаты глаз в долях картинки 412×700), свечение — радиальный градиент.
// При «Уменьшить движение» остаётся спокойная картинка.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useT } from '../../../lib/i18n'
import { asset } from './kit'
import OgonekEyes from './OgonekEyes'

// Глаза в долях картинки (левый край, верх, ширина, высота) и цвет кожи над ними.
const EYES = [
  { l: 0.205, t: 0.462, w: 0.24, h: 0.165, top: '#6c65d7', bottom: '#8a5fc6' },
  { l: 0.603, t: 0.434, w: 0.25, h: 0.165, top: '#9c88ec', bottom: '#a07ccc' },
]

// Глаза (OgonekEyes): глазница и центр радужки — в долях картинки.
const SOCKETS = [
  { l: 0.228, t: 0.486, w: 0.195, h: 0.12, cx: 0.33, cy: 0.537 },
  { l: 0.628, t: 0.458, w: 0.2, h: 0.118, cx: 0.704, cy: 0.505 },
]

// Искры при клике: направление разлёта.
const BURST = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2
  const r = 90 + (i % 3) * 26
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * 0.8 - 40), size: 8 + (i % 3) * 4 }
})

export default function HeroOgonek() {
  const t = useT()
  const lean = useRef<HTMLDivElement>(null)
  const eyes = useRef<HTMLDivElement>(null)
  const [boing, setBoing] = useState(0)

  // Глаза: следят за курсором; если курсора нет или он замер — сами
  // поглядывают по сторонам. Сдвиг зрачка — до 3.5 % ширины картинки.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = eyes.current
    if (!el) return
    let last = 0
    const look = (dx: number, dy: number) => {
      const max = el.getBoundingClientRect().width * 0.035
      el.style.setProperty('--ex', `${(dx * max).toFixed(1)}px`)
      el.style.setProperty('--ey', `${(dy * max * 0.7).toFixed(1)}px`)
    }
    const on = (e: PointerEvent) => {
      last = Date.now()
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / 420
      const dy = (e.clientY - (r.top + r.height * 0.52)) / 420
      const k = Math.min(1, Math.hypot(dx, dy))
      const a = Math.atan2(dy, dx)
      look(Math.cos(a) * k, Math.sin(a) * k)
    }
    const spots: Array<[number, number]> = [[0, 0], [-1, 0.1], [1, -0.2], [0.2, -0.9], [-0.7, -0.6], [0.8, 0.4], [0, 0]]
    let i = 0
    const idle = window.setInterval(() => {
      if (Date.now() - last < 2500) return
      i = (i + 1) % spots.length
      look(spots[i][0], spots[i][1])
    }, 1700)
    window.addEventListener('pointermove', on, { passive: true })
    return () => { window.clearInterval(idle); window.removeEventListener('pointermove', on) }
  }, [])

  // Тянется к курсору: наклон и сдвиг по горизонтали, без rAF — переход в CSS.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches) return
    const el = lean.current
    if (!el) return
    const on = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 640))
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 640))
      el.style.transform = `translate(${dx * 10}px, ${dy * 4}px) rotate(${dx * 6}deg)`
    }
    const off = () => { el.style.transform = '' }
    window.addEventListener('pointermove', on, { passive: true })
    document.documentElement.addEventListener('pointerleave', off)
    return () => {
      window.removeEventListener('pointermove', on)
      document.documentElement.removeEventListener('pointerleave', off)
    }
  }, [])

  return (
    <div className="pointer-events-none relative mt-8 flex flex-col items-center lg:absolute lg:left-1/2 lg:top-[468px] lg:mt-0 lg:-translate-x-1/2">
      <button
        type="button"
        onClick={() => setBoing(v => v + 1)}
        aria-label={t('Огонёк машет рукой')}
        className="pointer-events-auto relative h-[255px] w-[150px] cursor-pointer rounded-[40px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] sm:h-[340px] sm:w-[200px] lg:h-[404px] lg:w-[238px]"
      >
        <div ref={lean} className="lp-lean absolute inset-0">
          <div className="lp-life absolute inset-0">
            <div key={boing} className={`absolute inset-0 ${boing ? 'lp-boing' : ''}`}>
              <div className="absolute inset-0">
                <img src={asset('ogonek-wave.webp')} alt="" loading="eager" draggable={false} className="lp-flame-body absolute inset-0 h-full w-full select-none object-contain" />
                <img src={asset('ogonek-wave.webp')} alt="" aria-hidden loading="eager" draggable={false} className="lp-flame-tip absolute inset-0 h-full w-full select-none object-contain" />
                {/* глаза: белок в глазнице и подвижный зрачок */}
                <OgonekEyes ref={eyes} src={asset('ogonek-wave.webp')} sockets={SOCKETS} iris={[8.6, 5.1]} irisClass="lp-iris" />
                {/* огонёк в животе */}
                <span
                  aria-hidden
                  className="lp-glow absolute rounded-full"
                  style={{ left: '27%', top: '64%', width: '46%', height: '24%', background: 'radial-gradient(closest-side, rgba(255,214,140,0.85), rgba(255,170,90,0.35) 55%, rgba(255,170,90,0) 100%)', mixBlendMode: 'screen' }}
                />
                {/* веки */}
                {EYES.map((e, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="lp-blink absolute overflow-hidden rounded-[50%]"
                    style={{
                      left: `${e.l * 100}%`, top: `${e.t * 100}%`, width: `${e.w * 100}%`, height: `${e.h * 100}%`,
                      background: `linear-gradient(180deg, ${e.top} 0%, ${e.bottom} 100%)`,
                    } as CSSProperties}
                  >
                    {/* дуга ресниц — закрытый глаз читается как «^» */}
                    <span className="absolute left-[16%] right-[16%] top-[30%] h-[38%] rounded-[50%] border-b-[3px] border-[rgba(48,26,120,0.85)]" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {boing > 0 && (
          <span key={`b${boing}`} aria-hidden className="pointer-events-none absolute left-1/2 top-[38%]">
            {BURST.map((p, i) => (
              <span
                key={i}
                className="lp-burst absolute rounded-full"
                style={{
                  width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2,
                  background: 'radial-gradient(circle, #fff 0%, #ffd27a 40%, #ff9a3c 70%, rgba(255,154,60,0) 100%)',
                  boxShadow: '0 0 10px rgba(255,170,80,0.8)',
                  '--bx': `${p.x}px`, '--by': `${p.y}px`, animationDelay: `${(i % 4) * 25}ms`,
                } as CSSProperties}
              />
            ))}
          </span>
        )}
      </button>
      {/* Пол: мягкая контактная тень и тёплое пятно света от его огонька —
          он стоит на поверхности, а не висит. При прыжке тень сжимается. */}
      <div aria-hidden className="relative -mt-7 h-[44px] w-[230px] sm:w-[280px] lg:w-[330px]">
        <span className="lp-floor-light absolute inset-x-0 -top-6 bottom-[-18px] rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(255,186,110,0.45), rgba(255,186,110,0.14) 55%, rgba(255,186,110,0) 100%)' }} />
        <span className="lp-floor absolute left-[22%] right-[22%] top-[14px] h-[18px] rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(38,26,89,0.42), rgba(38,26,89,0.16) 60%, rgba(38,26,89,0) 100%)', filter: 'blur(2px)' }} />
      </div>
    </div>
  )
}
