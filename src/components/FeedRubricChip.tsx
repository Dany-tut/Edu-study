import { AnimatePresence, motion } from 'framer-motion'
import { useT } from '../lib/i18n'
import { filterIcon, type FeedFilter } from '../data/feed'

// ─────────────────────────────────────────────────────────────────────────────
// Чипс рубрики ленты — один на обе платформы
//
// СВЁРНУТЫЙ РЯД: ТЕКУЩАЯ РУБРИКА СЛОВОМ, ОСТАЛЬНЫЕ ЗНАЧКАМИ. Ряд из восьми
// подписей — это либо полоса во всю ширину колонки, либо горизонтальная
// прокрутка, в которой не видно, где ты. Но и ряд из одних значков не годится:
// «о чём эта лента прямо сейчас» — первое, что нужно знать, а пиктограмма
// колбы читается как «наука» далеко не сразу.
//
// Поэтому подпись есть ровно у одной кнопки — у выбранной. Она же и ответ на
// вопрос «где я», и заголовок ленты, и весь ряд при этом занимает места чуть
// больше, чем одна таблетка.
//
// ПЕРЕКЛЮЧЕНИЕ — ПЕРЕЛИВ, А НЕ ПОДМЕНА. При тапе подпись новой рубрики
// раскрывается из значка, а подпись прошлой в тот же момент сворачивается в
// значок: обе анимации идут одновременно, и ряд читается как одна вещь,
// переехавшая с места на место, а не как восемь мигнувших кнопок.
// ─────────────────────────────────────────────────────────────────────────────

export interface Rubric { id: FeedFilter; label: string; count: number }

/** Плавность раскрытия подписи — та же, что у таблеток скелета. */
const EASE = [0.22, 1, 0.36, 1] as const

export function RubricChip({ rubric, on, label, grow, accent, onClick }: {
  rubric: Rubric
  /** Выбранная — заливка и цвет предмета. */
  on: boolean
  /**
   * Показывать подпись словом.
   *
   * Отдельно от `on`, а не «подпись = выбранная»: в развёрнутом ряду (широкий
   * экран, лента не прокручена) подписаны все, и правило «слово только у
   * выбранной» там означало бы ряд, который сворачивается сам по себе.
   */
  label: boolean
  /** Сегмент растянутого ряда: делит ширину поровну с соседями. */
  grow?: boolean
  accent: string
  onClick: () => void
}) {
  const t = useT()
  const Icon = filterIcon(rubric.id)
  const text = t(rubric.label)
  return (
    <button
      type="button"
      onClick={onClick}
      // Значок без подписи обязан называть себя мышью и диктору: свёрнутый ряд
      // иначе становится восемью безымянными кружками.
      title={text}
      aria-label={text}
      aria-pressed={on}
      style={{
        flex: grow ? '1 1 0' : '0 0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 0, height: 30, padding: label ? '0 11px' : '0 7px',
        borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 12, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
        background: on ? `${accent}26` : 'transparent',
        color: on ? accent : 'var(--color-text-3)',
        transition: 'background 0.18s ease, color 0.18s ease, padding 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <Icon size={14} />
      {/* Подпись раскрывается ШИРИНОЙ, а не появлением: без анимации ширины
          соседние кнопки прыгали бы на новое место одним кадром. */}
      <AnimatePresence initial={false}>
        {label && (
          <motion.span
            key="label"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            style={{ display: 'block', overflow: 'hidden' }}
          >
            {/* Зазор до значка внутри уезжающей коробки: снаружи (gap у кнопки)
                он остался бы висеть и у голого значка. */}
            <span style={{ display: 'block', paddingLeft: 6 }}>{text}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
