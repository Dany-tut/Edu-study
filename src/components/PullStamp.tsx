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
// НИКАКОЙ РАМКИ. На экране только слово: квадрат печати добавлял вторую
// фигуру, и глаз читал сначала коробку, а слово — вторым. Без него жест
// выглядит как письмо, а не как значок в рамке.
//
// КРАСКА ИДЁТ СВЕРХУ ВНИЗ, вместе с тягой и вместе с рукой: пишут сверху, и
// палец ведёт туда же. Черты живут в двух слоях — бледный след пути и тот же
// путь цветом, обрезанный по уровню краски. Один слой не годится: черта,
// попавшая на границу, должна наливаться ПОСЕРЕДИНЕ себя.
//
// ЩЕЛЧОК НА ПОРОГЕ — не появление цвета, а его завершение: краска дотекает до
// низа, черты чуть тяжелеют, слово коротко вспыхивает. Дальше отпускать можно
// где угодно — печать уже «схватилась», обратно не разбирается (то же
// правило, что у стыка ленты в FeedSwipe: радиус только растёт).
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
  size = 64,
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
  // След ещё не налитой части: не «серый», а та же краска в разбеле — иначе
  // верх и низ слова читаются как два разных знака.
  const trace = dark ? 'rgba(226,104,92,.26)' : 'rgba(193,53,43,.22)'
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
        // Прозрачностью тягу больше не показываем: её показывает сама краска.
        // Бледный след и так тише налитой части, а общее затемнение делало
        // начало жеста мутным вместо «слово пишется».
        transform: `scale(${locked ? 1 : 0.92 + p * 0.08})`,
        transformOrigin: '50% 50%',
        transition: locked ? 'transform 240ms cubic-bezier(.2,1.6,.4,1)' : 'none',
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
        {/* Уровень краски: сверху вниз, по тяге. */}
        <clipPath id={inkClip}>
          <rect
            x="0" y="0" width="100" height={level}
            style={{ transition: locked ? 'height 220ms ease-out' : 'none' }}
          />
        </clipPath>
      </defs>

      {/* Без рамки слово должно занять весь квадрат виджета: черты писаны в
          координатах 23..72 × 19..89, растягиваем их до полей. */}
      <g transform="translate(50 50) scale(1.3) translate(-47.5 -54)">
      {/* Бледный след — путь, по которому пойдёт краска. */}
      {strokes.map(({ d, i, off }) => (
        <path
          key={i} d={d} pathLength={1} fill="none" stroke={trace}
          strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={1} strokeDashoffset={off}
          style={{ transition: strokeMove }}
        />
      ))}
      {/* Налитая часть тех же черт. */}
      <g clipPath={`url(#${inkClip})`}>
        {strokes.map(({ d, i, off }) => (
          <path
            key={i} d={d} pathLength={1} fill="none" stroke={seal}
            strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={1} strokeDashoffset={off}
            style={{ transition: strokeMove }}
          />
        ))}
      </g>

      </g>

      {/* Вспышка на щелчке: те же черты, разом и ярче, гаснут сами. */}
      {locked && (
        <g key="flash" transform="translate(50 50) scale(1.3) translate(-47.5 -54)"
           style={{ animation: 'pullstamp-flash 280ms ease-out forwards' }}>
          {strokes.map(({ d, i }) => (
            <path
              key={i} d={d} fill="none" stroke={seal}
              strokeWidth={strokeW + 3} strokeLinecap="round" strokeLinejoin="round"
            />
          ))}
        </g>
      )}
    </svg>
  )
}
