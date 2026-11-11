// Подвижные глаза Огонька поверх неподвижной картинки. В каждой «глазнице»
// (внутренний овал глаза) рисуется белок, поверх — зрачок: та же картинка под
// эллиптической маской вокруг радужки. Двигаем зрачок — Огонёк водит глазами,
// рисунок остаётся авторским. Координаты — в долях картинки; слой должен лежать
// ровно поверх неё (inset-0, без object-contain-полей).

import { forwardRef, type CSSProperties } from 'react'

export type EyeSocket = {
  /** Глазница: левый край, верх, ширина, высота — доли картинки. */
  l: number; t: number; w: number; h: number
  /** Центр радужки — доли картинки. */
  cx: number; cy: number
}

type Props = {
  src: string
  sockets: readonly EyeSocket[]
  /** Полуоси маски радужки в процентах картинки: [по ширине, по высоте]. */
  iris: readonly [number, number]
  /** Класс, который двигает зрачок (переход по --ex/--ey или своя анимация). */
  irisClass: string
}

const OgonekEyes = forwardRef<HTMLDivElement, Props>(function OgonekEyes({ src, sockets, iris, irisClass }, ref) {
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      {sockets.map((e, i) => {
        const mask = `radial-gradient(ellipse ${iris[0]}% ${iris[1]}% at ${e.cx * 100}% ${e.cy * 100}%, #000 86%, transparent 100%)`
        return (
          <span
            key={i}
            className="absolute overflow-hidden rounded-[50%]"
            style={{
              left: `${e.l * 100}%`, top: `${e.t * 100}%`, width: `${e.w * 100}%`, height: `${e.h * 100}%`,
              background: 'radial-gradient(ellipse at 45% 30%, #ffffff 0%, #f1edfd 55%, #d6ccf5 100%)',
            }}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className={`absolute max-w-none select-none ${irisClass}`}
              style={{
                left: `${(-e.l / e.w) * 100}%`, top: `${(-e.t / e.h) * 100}%`, width: `${(1 / e.w) * 100}%`, height: `${(1 / e.h) * 100}%`,
                WebkitMaskImage: mask, maskImage: mask,
              } as CSSProperties}
            />
          </span>
        )
      })}
    </div>
  )
})

export default OgonekEyes
