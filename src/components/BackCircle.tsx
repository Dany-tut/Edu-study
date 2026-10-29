// ─────────────────────────────────────────────────────────────────────────────
// «Назад» — шеврон в круге
//
// Единственная форма кнопки возврата во всём приложении. Раньше это была
// таблетка «‹ К наборам», «← Назад», «‹ К справочнику» — у каждого экрана своя
// подпись, свой размер и своя стрелка, а на телефоне подпись переносилась в две
// строки и раздувала строку инструментов. Круг 40×40 стоит вровень с круглыми
// кнопками-иконками (поиск, ToolButton), подпись живёт в aria-label и подсказке.
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronLeft } from 'lucide-react'
import { useT } from '../lib/i18n'

export default function BackCircle({ onClick, label = 'Назад', style }: {
  onClick: () => void
  /** Куда ведёт — русской строкой, переводится здесь. Видна только в подсказке. */
  label?: string
  style?: React.CSSProperties
}) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t(label)}
      title={t(label)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, flexShrink: 0, padding: 0, borderRadius: 999,
        border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.62)',
        backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        cursor: 'pointer', color: 'var(--color-text-2)', fontFamily: 'inherit',
        // Кнопка часто стоит в плавающей панели, где родитель пропускает клики
        // насквозь (pointerEvents: none) — сама она должна их ловить.
        pointerEvents: 'auto',
        ...style,
      }}
    >
      <ChevronLeft size={20} strokeWidth={2} style={{ marginLeft: -2 }} />
    </button>
  )
}
