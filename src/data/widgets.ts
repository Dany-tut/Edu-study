import { BarChart3, FlaskConical, Atom, Timer, Laugh, Sparkles, CircleHelp, TrendingUp, Award, Sunrise, type LucideIcon } from 'lucide-react'

// Single source of truth for the carousel widgets. The numeric `id` is the
// widget's stable identity used by the carousel (renderWidget) and by the
// reorder modal — the display sequence is just an array of these ids.
export type WidgetMeta = {
  id: number
  label: string
  Icon: LucideIcon
  /** accent colour for the reorder-modal tile */
  color: string
  /** soft tint behind the tile's icon */
  soft: string
  /**
   * Предметы (слаги из lib/subjects.ts), которым виджет вообще нужен. Пусто =
   * виджет предметно-нейтральный и показывается всем.
   *
   * Карусель писалась под химию с биологией, и «Реакции» с «Научными фактами»
   * так и остались в общем списке: ученик-языковик листал ионный обмен между
   * своей статистикой и таймером. Показываем такие виджеты только там, где они
   * про дело — см. lib/widgetVisibility.ts.
   */
  subjects?: string[]
  /**
   * Из какой таблицы виджет берёт материал. Заполнено — значит виджет без
   * контента пустой (заголовок «…» и кнопка, которая ничего не делает), и
   * показывать его нельзя. Проверяется по факту загруженных данных, так что
   * виджет вернётся сам, как только материал появится.
   */
  content?: 'quiz' | 'facts' | 'memes' | 'reactions'
  /**
   * Виджет имеет смысл только на языковом предмете, но не привязан к
   * конкретному языку: перечислять их в `subjects` пришлось бы заново при
   * каждом новом языке в реестре, и один забытый слаг молча выключал бы виджет.
   */
  languagesOnly?: boolean
}

export const WIDGET_META: WidgetMeta[] = [
  { id: 6, label: 'Викторина',     Icon: CircleHelp,   color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)', content: 'quiz' },
  { id: 0, label: 'Статистика',    Icon: BarChart3,    color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)' },
  { id: 7, label: 'Прогресс',      Icon: TrendingUp,   color: 'var(--color-green-text)',  soft: 'var(--color-green-soft)'  },
  { id: 1, label: 'Научные факты', Icon: FlaskConical, color: 'var(--color-green-text)',  soft: 'var(--color-green-soft)', subjects: ['chemistry', 'biology'], content: 'facts' },
  { id: 2, label: 'Реакции',       Icon: Atom,         color: 'var(--color-blue-pill-text)', soft: 'var(--color-blue-pill-bg)', subjects: ['chemistry'], content: 'reactions' },
  { id: 3, label: 'Фокус',         Icon: Timer,        color: 'var(--color-peach-text)',  soft: 'var(--color-peach-soft)'  },
  { id: 4, label: 'Мемы',          Icon: Laugh,        color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)', subjects: ['chemistry', 'biology'], content: 'memes' },
  { id: 5, label: 'Вопрос дня',    Icon: Sparkles,     color: 'var(--color-teal-pill-text)', soft: 'var(--color-teal-pill-bg)', content: 'quiz' },
  { id: 8, label: 'Стикеры',       Icon: Award,        color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)' },
  { id: 9, label: 'Доза дня',      Icon: Sunrise,      color: 'var(--color-peach-text)',  soft: 'var(--color-peach-soft)', languagesOnly: true },
]

// Default sequence: quiz first, then the rest.
export const DEFAULT_WIDGET_ORDER = WIDGET_META.map(w => w.id)
