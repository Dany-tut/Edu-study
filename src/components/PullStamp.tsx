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
// ЩЕЛЧОК НА ПОРОГЕ. Пока тянут, печать — только контур цвета киновари. На
// пороге она СОБИРАЕТСЯ: поле заливается, черты выворачиваются в белое,
// рамка коротко вспыхивает. Дальше отпускать можно где угодно — печать уже
// «схватилась», обратно контуром не разбирается (то же правило, что у стыка
// ленты в FeedSwipe: радиус только растёт).
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
        opacity: locked ? 1 : 0.35 + p * 0.65,
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

      {/* Поле печати. До порога прозрачное — виден только контур. */}
      <rect
        x="4" y="4" width="92" height="92" rx="10"
        fill={locked ? seal : 'transparent'}
        stroke={seal}
        strokeWidth={locked ? 5 : 3}
        style={{ transition: 'fill 180ms ease-out, stroke-width 180ms ease-out' }}
      />
      {/* Внутренняя нить — у настоящей 도장 рамка двойная. */}
      <rect
        x="11" y="11" width="78" height="78" rx="6"
        fill="none"
        stroke={locked ? ink : seal}
        strokeWidth="1"
        opacity={locked ? 0.5 : 0.35 + p * 0.4}
        style={{ transition: 'stroke 180ms ease-out' }}
      />

      {STROKES.map((d, i) => {
        const s = locked ? 1 : strokeAt(p, i)
        return (
          <path
            key={i}
            d={d}
            pathLength={1}
            fill="none"
            stroke={locked ? ink : seal}
            strokeWidth={locked ? 5.5 : 4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={1}
            strokeDashoffset={1 - s}
            style={{
              transition: locked
                ? 'stroke-dashoffset 220ms ease-out, stroke 180ms ease-out, stroke-width 180ms ease-out'
                : 'none',
            }}
          />
        )
      })}

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
