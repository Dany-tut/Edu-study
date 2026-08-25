// ─────────────────────────────────────────────────────────────────────────────
// PlayerPill — СТРОКА ПЛЕЕРА. Одна на весь тренажёр.
//
// ЗАЧЕМ ОТДЕЛЬНЫМ ФАЙЛОМ. Плееров у нас два: запись задания (TrackPlayer) и
// голос партитуры, который ведёт по строкам подсветкой (ScoreReader). Внутри
// они устроены по-разному — таймлайн против номеров реплик, — но НАРУЖУ это
// один и тот же предмет, и стоит он в одном и том же месте: в ряду дока, у
// большого пальца. Пока разметка была списана в два файла, они разъехались: в
// разборе плеер не подрастал вместе с уходящим доком, точка бегунка наезжала
// боком на кнопку «играть», границы реплик под пальцем не проступали, а
// название текста не показывалось вовсе.
//
// Поэтому здесь ровно ВИД: круг «играть», бегунок, счётчик и бургер. Что
// считать позицией и что делать с промоткой, знает хозяин плеера — он отдаёт
// сюда долю заполнения и обработчики жеста.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, Volume2 } from 'lucide-react'
import { useSmoothCollapse } from '../MobileDock'

/** Самая большая точка бегунка (под пальцем). Её половина — поля полосы. */
export const DOT_MAX = 18

export default function PlayerPill({
  accent, inline, icon, playLabel, onPlay,
  trackRef, slider, frac, held, ticks, hint,
  lead, tail, counter, onMenu, menuLabel,
}: {
  accent: string
  /**
   * Только строка, без собственного слоя: позицией владеет вызывающий. Так
   * плеер встаёт В РЯД дока и растёт, когда док прячется при листании.
   */
  inline?: boolean
  /** Содержимое круга: play / pause, а у партитуры ещё и «стоп». */
  icon: React.ReactNode
  playLabel: string
  onPlay: () => void
  /** Полоса бегунка: по её ширине хозяин считает позицию пальца. */
  trackRef: React.RefObject<HTMLDivElement | null>
  slider: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerCancel: () => void
    onLostPointerCapture: () => void
    label: string
    min: number
    max: number
    now: number
  }
  /** Доля заполнения полосы, 0…1. */
  frac: number
  /** Палец на бегунке: полоса толще, точка больше, проступают границы. */
  held: boolean
  /** Границы реплик долями 0…1 — рисуются только под пальцем. */
  ticks?: number[]
  /** Пузырь над бегунком, пока ведут. */
  hint?: string | null
  /** Левая половина второй строки: название записи или время от начала. */
  lead?: React.ReactNode
  /** Правая половина второй строки: «реплика 3 из 7» или длительность. */
  tail?: React.ReactNode
  /** Микро-счётчик справа, когда второй строки нет. */
  counter?: React.ReactNode
  onMenu: () => void
  menuLabel: string
}) {
  const [menuHeld, setMenuHeld] = useState(false)
  // Тот же сглаженный флаг, что схлопывает круг «Фильтры» рядом (см.
  // useSmoothCollapse в MobileDock): плеер обязан расти ровно тем же жестом,
  // которым круг уступает ему место, иначе два движения в одном ряду разъедутся.
  const dockCollapsed = useSmoothCollapse()
  // РОСТ. В ряду дока плеер притворяется его частью: те же 46 в высоту, что у
  // круга, и кнопка «играть» — такой же кружок. Остался один — распрямляется
  // в настоящий проигрыватель: выше, полоса толще, проступает подпись с
  // названием записи. Растёт ВВЕРХ: док прижат к низу, нижняя кромка стоит.
  const grown = !!inline && dockCollapsed

  const barH = held ? 7 : grown ? 4 : 3
  const dotSize = held ? DOT_MAX : grown ? 10 : 9

  return (
    // Высота — не «на глаз», а от соседа: 46 = DockCircle. Гоним её тем же
    // COLLAPSE, что схлопывает круг, чтобы рост плеера и уход круга читались
    // одним движением, а не двумя.
    <motion.div
      initial={false}
      animate={inline ? { height: grown ? 58 : 46, borderRadius: grown ? 26 : 23 } : undefined}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: inline ? 8 : 12,
        padding: inline ? (grown ? '0 8px 0 5px' : '0 4px 0 3px') : '10px 12px',
        borderRadius: inline ? undefined : 22,
        background: 'rgba(var(--glass-rgb), 0.86)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-pill)',
      }}
    >
      <motion.button
        onClick={onPlay}
        aria-label={playLabel}
        initial={false}
        animate={inline ? { width: grown ? 46 : 40, height: grown ? 46 : 40 } : undefined}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0, border: 'none',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          background: accent, color: '#fff',
          boxShadow: `0 4px 12px -3px color-mix(in srgb, ${accent} 55%, transparent)`,
        }}
      >
        {icon}
      </motion.button>

      {/* Мишень бегунка выше самой полосы: тянуть трёхпиксельную линию
          пальцем невозможно, поэтому жест ловит вся полоса-подложка. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          onPointerDown={slider.onPointerDown}
          onPointerMove={slider.onPointerMove}
          onPointerUp={slider.onPointerUp}
          // Палец «потерялся» — жест обрывают и система (звонок, шторка
          // уведомлений), и браузер, отобрав захват. Без этих двух строк
          // бегунок оставался в состоянии перетаскивания навсегда: полоса
          // толстая, точка большая, а звук идёт своим чередом.
          onPointerCancel={slider.onPointerCancel}
          onLostPointerCapture={slider.onLostPointerCapture}
          role="slider"
          aria-label={slider.label}
          aria-valuemin={slider.min}
          aria-valuemax={slider.max}
          aria-valuenow={slider.now}
          style={{
            position: 'relative', height: 22, display: 'flex', alignItems: 'center',
            touchAction: 'none', cursor: 'pointer',
            // Поля под радиус точки. Без них точка в нуле наезжает круглым
            // боком на кнопку «играть» (а в конце — на бургер): она стоит
            // ЦЕНТРОМ на краю полосы, то есть половиной висит снаружи.
            // Полоса теперь начинается там, где начинается точка.
            padding: `0 ${DOT_MAX / 2}px`, boxSizing: 'border-box',
          }}
        >
          <div
            ref={trackRef}
            style={{
              position: 'relative', width: '100%', height: barH, borderRadius: 4,
              background: 'var(--color-border-soft)',
              transition: 'height .14s ease',
            }}
          >
            {hint && (
              <span style={{
                position: 'absolute', left: `${frac * 100}%`, bottom: 16, transform: 'translateX(-50%)',
                padding: '3px 8px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none',
                fontSize: 11, fontWeight: 700, background: accent, color: '#fff',
              }}>
                {hint}
              </span>
            )}
            <div style={{
              position: 'absolute', inset: 0, right: `${100 - frac * 100}%`,
              background: accent, borderRadius: 4,
            }} />
            {/* Границы реплик проступают только под пальцем: в покое
                десяток рисок на трёхпиксельной полосе — рябь, а не шкала. */}
            {held && ticks?.map(x => (
              <div key={x} style={{
                position: 'absolute', top: 0, bottom: 0, left: `${x * 100}%`,
                width: 1, background: 'rgba(var(--glass-rgb), 0.9)',
              }} />
            ))}
            <div style={{
              position: 'absolute', top: '50%', left: `${frac * 100}%`,
              width: dotSize, height: dotSize, marginTop: -dotSize / 2, marginLeft: -dotSize / 2,
              borderRadius: '50%', background: accent,
              border: held ? '2.5px solid rgba(var(--glass-rgb), 1)' : 'none',
              transition: 'width .14s ease, height .14s ease, margin .14s ease',
            }} />
          </div>
        </div>
        {/* Подпись — правда об источнике: у файла секунды, у синтеза номер
            реплики. Оценку длительности синтеза секундами не подписываем.
            В ряду дока второй строки нет вовсе — именно она и делала плеер
            на 14 px выше соседнего круга; вместо неё справа стоит микро-
            счётчик, а название записи появляется только там, где под него
            есть ширина. */}
        <motion.div
          initial={false}
          animate={inline ? { height: grown ? 14 : 0, opacity: grown ? 1 : 0, marginTop: grown ? 4 : 0 } : undefined}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          style={{
            display: 'flex', justifyContent: 'space-between', gap: 8, overflow: 'hidden',
            marginTop: inline ? undefined : 3,
            fontSize: 10.5, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums',
          }}
        >
          {lead !== undefined && lead !== null && lead !== '' && (
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead}
            </span>
          )}
          <span style={{ flexShrink: 0 }}>{tail}</span>
        </motion.div>
      </div>

      {/* Счётчик компактного состояния: позиция в записи не должна
          пропадать вместе со второй строкой. */}
      {inline && !grown && counter !== undefined && (
        <span style={{
          flexShrink: 0, fontSize: 10.5, color: 'var(--color-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {counter}
        </span>
      )}

      {/* Голая иконка: коробка с рамкой и заливкой внутри стеклянной
          капсулы давала обводку в обводке. Мишень остаётся 32×32, а нажатие
          показывает прозрачность — любая подсветка на стекле снова
          превращается в ту же коробку. */}
      <button
        onClick={onMenu}
        onPointerDown={() => setMenuHeld(true)}
        onPointerUp={() => setMenuHeld(false)}
        onPointerLeave={() => setMenuHeld(false)}
        onPointerCancel={() => setMenuHeld(false)}
        aria-label={menuLabel}
        style={{
          width: 32, height: 32, flexShrink: 0,
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          border: 'none', background: 'transparent', color: 'var(--color-muted)',
          WebkitTapHighlightColor: 'transparent',
          opacity: menuHeld ? 0.55 : 1, transition: 'opacity .12s ease',
        }}
      >
        <Menu size={17} />
      </button>
    </motion.div>
  )
}

/** Короткая шапка отрывка для списка: длинная строка в кнопке всё равно
 *  обрежется многоточием браузера, но по своему месту, а не по слову. */
function head(line: string): string {
  const clean = line.trim()
  return clean.length > 28 ? `${clean.slice(0, 27)}…` : clean
}

/**
 * СПИСОК ОТРЫВКОВ в шторке плеера — вторая половина промотки.
 *
 * Бегунок отвечает на «отмотать чуть назад», список — на «мне нужно вон то
 * место»: у синтеза нет ни таймлайна, ни узнаваемой волны, и найти нужную
 * реплику иначе можно только тыкая в шкалу вслепую. Поэтому он есть у обоих
 * плееров и выглядит одинаково.
 */
export function CueList({ items, active, playing, accent, soft, onPick }: {
  items: string[]
  /** Номер звучащего (или отмеченного паузой) отрывка. */
  active: number | null
  playing?: boolean
  accent: string
  soft: string
  onPick: (index: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((l, i) => {
        const on = i === active
        return (
          <button
            key={`${i}-${l}`}
            onClick={() => onPick(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
              padding: '9px 11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: on ? `1px solid ${accent}` : '1px solid var(--color-border-soft)',
              background: on ? soft : 'var(--color-bg-2)',
              color: on ? accent : 'var(--color-text)',
              fontSize: 13, fontWeight: on ? 700 : 500,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--color-muted)', minWidth: 14 }}>{i + 1}</span>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {head(l)}
            </span>
            {on && playing && <Volume2 size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
          </button>
        )
      })}
    </div>
  )
}
