// Иконка «Копировать», которая сама отвечает «скопировано»: листы уходят,
// галочка дорисовывается обводкой с лёгким «поп», затем всё возвращается.
//
// Почему SVG, а не Lottie: lottie-web — сотни килобайт ради одной иконки
// (reference-bundle-weight), а движение здесь — одна дорисовка штриха.
// Рисунок тот же, что у Loop-иконок Copy и Check (viewBox 32, обводка 2,3).
// Анимация — в index.css (.cc-*), там же отключение при reduced motion.

export function CopyCheckIcon({ done, size = '1em' }: { done: boolean; size?: number | string }) {
  return (
    <svg
      className={`cc${done ? ' is-done' : ''}`}
      width={size} height={size} viewBox="0 0 32 32" fill="none"
      stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable="false"
    >
      <g className="cc-copy">
        <path d="m7 6 1-4 22 1-1 21h-4M3 10l20-1-1 21-20-1z" />
        <path d="m6 14 5-1" stroke="var(--loop-detail, #F4A55A)" />
      </g>
      <g className="cc-check">
        <path d="m4 16 9 10Q20 17 29 5" strokeWidth={2.7} pathLength={1} />
        <path d="m3 8 2 2" stroke="var(--loop-detail, #F4A55A)" pathLength={1} />
      </g>
    </svg>
  )
}
