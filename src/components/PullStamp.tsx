import { useId } from 'react'
import { useTheme } from '../store/themeStore'

// ─────────────────────────────────────────────────────────────────────────────
// PullStamp — печать 도장 вместо крутилки обновления
//
// Тянешь ленту вниз — сверху проступает корейская печать: черты рисуются ПО
// ОЧЕРЕДИ и в том порядке, в каком слог пишут рукой (сначала ㅅ, потом ㅐ,
// потом ㄹ, потом ㅗ). Поэтому на половине пути на экране честно стоит 새 без
// хвостов, а не половина обоих слогов сразу — это и отличает каллиграфию от
// проявляющейся картинки.
//
// ПОЧЕМУ НЕ ШРИФТ. Текстом «새로» черту не вытянуть: у глифа нет длины пути,
// он либо есть, либо нет. Каждая черта здесь — отдельный <path> с
// pathLength=1, и рост дают dasharray/dashoffset. Цена — координаты руками
// (ниже), выгода — сам жест.
//
// ЗАЛИВКА ПОДНИМАЕТСЯ ВМЕСТЕ С ТЯГОЙ. Киноварь наливается снизу вверх ровно
// на столько, на сколько вытянули, — печать макают в краску, а не включают
// на пороге. Черты живут в двух слоях: поверх пустого поля они цвета краски,
// а внутри залитой части — вывороткой (тот же путь, обрезанный по уровню).
// Один слой не годится: черта, попавшая на границу, должна менять цвет
// ПОСЕРЕДИНЕ себя.
//
// ЩЕЛЧОК НА ПОРОГЕ — не появление заливки, а её завершение: уровень
// доливается до края, рамка утолщается, поверх проходит вспышка. Дальше
// отпускать можно где угодно — печать уже «схватилась», обратно не
// разбирается (то же правило, что у стыка ленты в FeedSwipe: радиус только
// растёт).
//
// НАДПИСЬ. 새로 — «заново». Два слога, мало черт: на 44 px линии ещё
// читаются, а 새로고침 в том же квадрате превратилось бы в сетку. И это не
// системный термин из настроек, а слово курса — печать заодно учит.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Черты в порядке написания. Квадрат 100×100, поле печати — внутри рамки.
 * Порядок массива = порядок появления, менять его нельзя: он и есть
 * последовательность руки.
 */
const STROKES = [
  // 새 — ㅅ
  'M34 20 L23 49',
  'M34 26 L45 49',
  // 새 — ㅐ (ㅏ: стойка и полка, затем ㅣ)
  'M58 19 L58 51',
  'M58 36 L70 36',
  'M72 19 L72 51',
  // 로 — ㄹ
  'M37 56 L63 56 L39 65',
  'M39 65 L63 65',
  'M63 65 L63 75 L37 75',
  // 로 — ㅗ
  'M50 79 L50 87',
  'M31 89 L69 89',
]

/** Доля пути, на которой черта нарисована целиком (0..1). */
function strokeAt(progress: number, i: number) {
  const each = 1 / STROKES.length
  return Math.max(0, Math.min(1, (progress - i * each) / each))
}

export default function PullStamp({
  progress,
  locked,
  busy = false,
  size = 56,
}: {
  /** Сколько вытянули: 0 — ничего, 1 — порог. */
  progress: number
  /** Порог пройден: печать собрана и залита. */
  locked: boolean
  /** Идёт обновление — печать дышит на месте. */
  busy?: boolean
  size?: number
}) {
  const { dark } = useTheme()
  // Киноварь настоящей печати на чёрном горит и слепит — в тёмной теме берём
  // ту же краску, разбавленную до читаемой (см. память invisible-in-dark:
  // фиксированный «красивый» цвет ломается ровно на одной из двух тем).
  const seal = dark ? '#E2685C' : '#C1352B'
  const ink = dark ? '#17161A' : '#FFFFFF'
  const p = Math.max(0, Math.min(1, progress))
  const inkClip = 'pullstamp-ink-' + useId().replace(/:/g, '')
  // Уровень краски. Не в ноль на старте: первый же миллиметр тяги должен
  // что-то делать, иначе жест начинается «вхолостую».
  // До края не доливаем: последние проценты — работа щелчка, иначе порог
  // ничего не добавляет и его невозможно заметить глазом.
  const level = locked ? 100 : p * 93
  const strokeW = locked ? 5.5 : 4.5
  const strokeMove = locked
    ? 'stroke-dashoffset 220ms ease-out, stroke-width 180ms ease-out'
    : 'none'
  const strokes = STROKES.map((d, i) => ({
    d, i, off: 1 - (locked ? 1 : strokeAt(p, i)),
  }))

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      style={{
        display: 'block',
        overflow: 'visible',
        // До порога печать ещё не проявилась целиком — приглушаем её вместе с
        // тягой, иначе первая же черта выглядит как готовый знак.
        opacity: locked ? 1 : 0.55 + p * 0.45,
        transform: `scale(${locked ? 1 : 0.86 + p * 0.14})`,
        transformOrigin: '50% 50%',
        transition: locked
          ? 'transform 240ms cubic-bezier(.2,1.6,.4,1), opacity 160ms ease-out'
          : 'none',
        animation: busy ? 'pullstamp-breathe 1400ms ease-in-out infinite' : undefined,
      }}
    >
      <style>{`
        @keyframes pullstamp-breathe {
          0%, 100% { opacity: 1 }
          50% { opacity: .55 }
        }
        @keyframes pullstamp-flash {
          0% { opacity: .9 }
          100% { opacity: 0 }
        }
      `}</style>

      <defs>
        {/* Уровень краски: снизу вверх, по тяге. */}
        <clipPath id={inkClip}>
          <rect
            x="0" y={100 - level} width="100" height={level}
            style={{ transition: locked ? 'y 200ms ease-out, height 200ms ease-out' : 'none' }}
          />
        </clipPath>
      </defs>

      {/* Пустое поле печати — только рамка. */}
      <rect
        x="4" y="4" width="92" height="92" rx="10"
        fill="none"
        stroke={seal}
        strokeWidth={locked ? 5 : 3}
        style={{ transition: 'stroke-width 180ms ease-out' }}
      />
      {/* Налитая краска. Обрезана и по уровню, и по самой рамке — иначе
          прямоугольник заливки торчал бы за скруглённые углы печати. */}
      <g clipPath={`url(#${inkClip})`}>
        <rect x="4" y="4" width="92" height="92" rx="10" fill={seal} />
      </g>

      {/* Внутренняя нить — у настоящей 도장 рамка двойная. */}
      <rect
        x="11" y="11" width="78" height="78" rx="6"
        fill="none"
        stroke={seal}
        strokeWidth="1"
        opacity={0.35 + p * 0.4}
      />
      <g clipPath={`url(#${inkClip})`}>
        <rect
          x="11" y="11" width="78" height="78" rx="6"
          fill="none" stroke={ink} strokeWidth="1" opacity="0.5"
        />
      </g>

      {/* Черты: сначала все краской по пустому полю... */}
      {strokes.map(({ d, i, off }) => (
        <path
          key={i} d={d} pathLength={1} fill="none" stroke={seal}
          strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={1} strokeDashoffset={off}
          style={{ transition: strokeMove }}
        />
      ))}
      {/* ...и они же вывороткой внутри залитой части. */}
      <g clipPath={`url(#${inkClip})`}>
        {strokes.map(({ d, i, off }) => (
          <path
            key={i} d={d} pathLength={1} fill="none" stroke={ink}
            strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={1} strokeDashoffset={off}
            style={{ transition: strokeMove }}
          />
        ))}
      </g>

      {/* Вспышка на щелчке: одноразовая, поверх всего, гаснет сама. */}
      {locked && (
        <rect
          key="flash"
          x="4" y="4" width="92" height="92" rx="10"
          fill={ink}
          style={{ animation: 'pullstamp-flash 260ms ease-out forwards' }}
        />
      )}
    </svg>
  )
}
