import { BarChart3, FlaskConical, Atom, Timer, Laugh, Sparkles, CircleHelp, type LucideIcon } from 'lucide-react'

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
  { id: 6, label: 'Викторина',     Icon: CircleHelp,   color: '#7B3FCC', soft: '#EEDBFF' },
  { id: 0, label: 'Статистика',    Icon: BarChart3,    color: '#7B61FF', soft: '#E8E4FF' },
  { id: 1, label: 'Научные факты', Icon: FlaskConical, color: '#1E9E63', soft: '#DCF6E7' },
  { id: 2, label: 'Реакции',       Icon: Atom,         color: '#1F6FB8', soft: '#DCEEFB' },
  { id: 3, label: 'Фокус',         Icon: Timer,        color: '#E0794B', soft: '#FFE4BD' },
  { id: 4, label: 'Мемы',          Icon: Laugh,        color: '#C58BFF', soft: '#F1E3FF' },
  { id: 5, label: 'Вопрос дня',    Icon: Sparkles,     color: '#0E7A6F', soft: '#CFF3EE' },
]

// Default sequence: quiz first, then the rest.
export const DEFAULT_WIDGET_ORDER = WIDGET_META.map(w => w.id)
