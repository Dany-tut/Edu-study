import type { CSSProperties, ReactNode } from 'react'

// Заливка прогресса, которая ПЕРЕКРАШИВАЕТ подпись, а не топит её.
//
// Раньше подпись целиком становилась белой, едва заливка трогалась с места, —
// и та её часть, до которой фиолет ещё не дошёл, оставалась белым по светлому
// стеклу, то есть пропадала. Теперь фиолет работает маской: подпись чёрная, и
// белой становится ровно та её часть, которую заливка уже накрыла.
//
// Копий подписи три, и все три обязательны:
//   • в потоке (visibility: hidden) — держит ширину таблетки, иначе абсолютные
//     копии схлопнут её до одних отступов;
//   • чёрная, обрезанная слева по кромке заливки;
//   • белая, обрезанная справа по той же кромке.
// Обрезки дополняют друг друга, поэтому глиф не рисуется дважды и на стыке нет
// серого ореола от наложения.
//
// Проценты clip-path считаются от СВОЕЙ коробки, а ширина заливки — от коробки
// родителя. Совпадают они только если копии лежат inset: 0 у того же родителя
// и повторяют его отступы — за это отвечает boxStyle. Разъедутся коробки —
// кромка перекраски поедет рядом с кромкой заливки, а не по ней.

export default function ProgressFill({
  pct, children, labelStyle, boxStyle, color, fillColor = '#fff', fillStyle,
}: {
  /** 0…100. null — заливки нет, подпись просто стоит в потоке. */
  pct: number | null
  children: ReactNode
  /** Типографика подписи — общая для всех копий. */
  labelStyle?: CSSProperties
  /** Отступы и раскладка коробки-родителя: копии обязаны их повторить. */
  boxStyle?: CSSProperties
  color?: string
  fillColor?: string
  fillStyle?: CSSProperties
}) {
  const on = pct != null
  const copy: CSSProperties = {
    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
    pointerEvents: 'none', transition: 'clip-path 0.18s linear',
    ...labelStyle, ...boxStyle,
  }
  // Ширина заливки едет обычным CSS-переходом, а не анимацией framer: полоса
  // должна ползти даже там, где кадры идут туго. Обрезки идут тем же переходом
  // и той же длительностью — иначе перекраска отстанет от фиолета.
  const clipLeft = `inset(0 0 0 ${pct}%)`
  const clipRight = `inset(0 ${100 - (pct ?? 0)}% 0 0)`

  return (
    <>
      {on && (
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`, background: 'var(--grad-purple)',
            transition: 'width 0.18s linear',
            ...fillStyle,
          }}
        />
      )}

      <span style={{ ...labelStyle, position: 'relative', color, visibility: on ? 'hidden' : undefined }}>
        {children}
      </span>

      {on && (
        <>
          <span aria-hidden style={{ ...copy, color, clipPath: clipLeft, WebkitClipPath: clipLeft }}>
            {children}
          </span>
          <span aria-hidden style={{ ...copy, color: fillColor, clipPath: clipRight, WebkitClipPath: clipRight }}>
            {children}
          </span>
        </>
      )}
    </>
  )
}
