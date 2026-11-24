import { newYearImg } from '../../../lib/season'
import './videoSkin.css'

/*
 * Детали новогоднего скина плеера урока. Все слои — aria-hidden и
 * pointer-events: none: жесты кадра и шкалы остаются у плеера как были.
 */

const BULBS = Array.from({ length: 28 }, (_, i) => i)

/** Снежная шапка и гирлянда по верхнему краю кадра. */
export function PlayerGarland() {
  return (
    <>
      <div aria-hidden="true" className="ny-garland">
        {BULBS.map(i => <span key={i} />)}
      </div>
      <div aria-hidden="true" className="ny-cap" />
    </>
  )
}

/** Снежная шапка для карточек сезона. */
export function SnowCap() {
  return <div aria-hidden="true" className="ny-cap" />
}

/** Снежинка на стыке глав шкалы (иллюстрация, не статусный значок). */
export function ChapterFlake({ left }: { left: string }) {
  return (
    <span aria-hidden="true" className="ny-flake" style={{ left }}>
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <path d="M6 1v10M1.7 3.5l8.6 5M1.7 8.5l8.6-5M4.6 1.8 6 3l1.4-1.2M4.6 10.2 6 9l1.4 1.2" />
      </svg>
    </span>
  )
}

/** Бегунок шкалы — Огонёк в шарфе над точкой текущей секунды. */
export function OgonekThumb({ left }: { left: string }) {
  return (
    <span aria-hidden="true" className="ny-thumb" style={{ left }}>
      <img src={newYearImg('og-scarf')} alt="" draggable={false} />
    </span>
  )
}

/** Лёгкий снег на фоне страницы урока. */
export function LessonSnow() {
  return <div aria-hidden="true" className="ny-snow"><span /><span /></div>
}
