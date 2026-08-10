// Знак «стопка пройдена» — рисунок вместо эмодзи на финальном экране колоды.
//
// ЗАЧЕМ. Финал сессии — единственный кадр, который ученик видит как награду за
// сорок свайпов; галочка-эмодзи там читается как системное уведомление, а не
// как «ты закрыл стопку». Рисунок повторяет то, с чем человек только что
// работал: та же стопка карточек, только собранная и помеченная.
//
// АНИМАЦИЯ НА CSS, НЕ НА FRAMER-MOTION. Знак живёт внутри Empty, который может
// смонтироваться в момент, когда рядом ещё доигрывает вылет последней карточки;
// css-кейфреймы крутит компоузитор и им всё равно на занятый главный поток.
// Плюс тот же приём, что в StickerBadge: один <style> на документ, а не стиль
// на каждый экземпляр.
import { useEffect } from 'react'

const CSS = `
  .ddm { transform-box: fill-box; transform-origin: 50% 50%; }
  .ddm-float { animation: ddmFloat 3.6s ease-in-out 1.5s infinite; }
  .ddm-card { opacity: 0; animation: ddmCard .42s cubic-bezier(.2,.75,.35,1) forwards; }
  .ddm-card-2 { animation-delay: .07s; }
  .ddm-card-3 { animation-delay: .14s; }
  .ddm-edge { stroke-dasharray: 210; stroke-dashoffset: 210; animation: ddmDraw .62s cubic-bezier(.4,0,.2,1) .2s forwards; }
  .ddm-line { opacity: 0; transform-box: fill-box; transform-origin: 0% 50%; animation: ddmLine .34s ease-out forwards; }
  .ddm-line-2 { animation-delay: .62s; }
  .ddm-badge { opacity: 0; animation: ddmPop .42s cubic-bezier(.34,1.56,.64,1) .6s forwards; }
  .ddm-tick { stroke-dasharray: 26; stroke-dashoffset: 26; animation: ddmDraw .3s ease-out .82s forwards; }
  .ddm-wave { opacity: 0; transform-box: fill-box; transform-origin: 50% 50%; animation: ddmWave .7s cubic-bezier(.2,.6,.3,1) .78s forwards; }
  .ddm-wave-2 { animation-delay: .9s; }

  @keyframes ddmFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
  @keyframes ddmCard { from { opacity: 0; transform: translateY(13px) scale(.92) } to { opacity: 1; transform: none } }
  @keyframes ddmDraw { to { stroke-dashoffset: 0 } }
  @keyframes ddmLine { from { opacity: 0; transform: scaleX(.2) } to { opacity: 1; transform: none } }
  @keyframes ddmPop { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: none } }
  @keyframes ddmWave { 0% { opacity: .55; transform: scale(1) } 100% { opacity: 0; transform: scale(1.75) } }

  @media (prefers-reduced-motion: reduce) {
    .ddm-float, .ddm-card, .ddm-edge, .ddm-line, .ddm-badge, .ddm-tick { animation: none }
    .ddm-card, .ddm-line, .ddm-badge { opacity: 1 }
    .ddm-edge, .ddm-tick { stroke-dashoffset: 0 }
    .ddm-wave { animation: none; opacity: 0 }
  }
`
function injectCss() {
  if (typeof document === 'undefined' || document.getElementById('ddm-css')) return
  const el = document.createElement('style')
  el.id = 'ddm-css'
  el.textContent = CSS
  document.head.appendChild(el)
}

export default function DeckDoneMark({ accent, size = 104 }: { accent: string; size?: number }) {
  useEffect(injectCss, [])

  return (
    <svg
      width={size} height={size * 0.82} viewBox="0 0 104 86" fill="none" aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g className="ddm ddm-float">
        {/* Задние карточки — только контур: стопка должна читаться глубиной, а
            не тремя одинаковыми прямоугольниками друг на друге. */}
        <g transform="rotate(-11 52 40)">
          <g className="ddm ddm-card">
            <rect x="24" y="14" width="56" height="38" rx="9"
              fill="var(--color-bg-2)" stroke="var(--color-border-medium)" strokeWidth="1.6" />
          </g>
        </g>
        <g transform="rotate(-5.5 52 40)">
          <g className="ddm ddm-card ddm-card-2">
            <rect x="24" y="18" width="56" height="38" rx="9"
              fill="var(--color-bg-2)" stroke="var(--color-border-strong)" strokeWidth="1.7" />
          </g>
        </g>

        {/* Верхняя карточка: заливка появляется сразу, акцентный кант
            обводится по периметру — жест «стопка закрыта» без слов. */}
        <g className="ddm ddm-card ddm-card-3">
          <rect x="24" y="24" width="56" height="38" rx="9" fill="var(--color-bg-3)" />
          <rect className="ddm-edge" x="24" y="24" width="56" height="38" rx="9"
            fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <rect className="ddm-line" x="34" y="36" width="36" height="3.4" rx="1.7" fill={accent} opacity="0.5" />
          <rect className="ddm-line ddm-line-2" x="34" y="45" width="22" height="3.4" rx="1.7"
            fill="var(--color-text-3)" opacity="0.45" />
        </g>

        {/* Бейдж вынесен за угол карточки: печать поверх стопки, а не иконка
            внутри неё. */}
        <g className="ddm ddm-badge">
          {/* Волна от удара печати вместо лучей: расходящееся кольцо читается
              как «поставили штамп», а шесть штрихов по кругу — как солнышко. */}
          <circle className="ddm-wave" cx="82" cy="64" r="12.5" fill="none" stroke={accent} strokeWidth="1.6" />
          <circle className="ddm-wave ddm-wave-2" cx="82" cy="64" r="12.5" fill="none" stroke={accent} strokeWidth="1.2" />
          <circle cx="82" cy="64" r="12.5" fill="var(--color-bg-2)" stroke={accent} strokeWidth="2" />
          <path className="ddm-tick" d="M76.5 64.2 L80.6 68.3 L88 60.6"
            fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  )
}
