import { BarChart3, FlaskConical, Atom, Timer, Laugh, Sparkles, CircleHelp, TrendingUp, type LucideIcon } from 'lucide-react'

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
}

export const WIDGET_META: WidgetMeta[] = [
  { id: 6, label: 'Викторина',     Icon: CircleHelp,   color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)' },
  { id: 0, label: 'Статистика',    Icon: BarChart3,    color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)' },
  { id: 7, label: 'Прогресс',      Icon: TrendingUp,   color: 'var(--color-green-text)',  soft: 'var(--color-green-soft)'  },
  { id: 1, label: 'Научные факты', Icon: FlaskConical, color: 'var(--color-green-text)',  soft: 'var(--color-green-soft)'  },
  { id: 2, label: 'Реакции',       Icon: Atom,         color: 'var(--color-blue-pill-text)', soft: 'var(--color-blue-pill-bg)' },
  { id: 3, label: 'Фокус',         Icon: Timer,        color: 'var(--color-peach-text)',  soft: 'var(--color-peach-soft)'  },
  { id: 4, label: 'Мемы',          Icon: Laugh,        color: 'var(--color-purple-text)', soft: 'var(--color-purple-soft)' },
  { id: 5, label: 'Вопрос дня',    Icon: Sparkles,     color: 'var(--color-teal-pill-text)', soft: 'var(--color-teal-pill-bg)' },
]

// Default sequence: quiz first, then the rest.
export const DEFAULT_WIDGET_ORDER = WIDGET_META.map(w => w.id)
