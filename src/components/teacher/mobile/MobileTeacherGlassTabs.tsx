import { useEffect, useRef } from 'react'
import type { MTab } from './MobileTeacherNav'
import { setGlassTabs, removeGlassTabs, onGlassTab, setGlassKeyboard } from '../../../lib/nativeGlass'
import { useKeyboardOpen } from '../../../lib/useKeyboardInset'
import { tactile } from '../../../lib/feedback'
import { useT } from '../../../lib/i18n'

// Нижняя навигация кабинета учителя в приложении на iOS — системный UITabBar
// со стеклом Liquid Glass (lib/nativeGlass.ts). Веб-док MobileTeacherNav в
// приложении не рисуется: этот компонент только передаёт пункты, выбор и бейдж
// в нативный бар и слушает нажатия.

// NativeGlass resolves these stable identifiers to bundled Loop images.
// The native UITabBar retains its system glass, gestures and accessibility.
const SYMBOL: Record<string, string> = {
  home: 'house',
  schedule: 'calendar',
  students: 'person.2',
  review: 'checkmark.rectangle.stack',
  gradebook: 'checklist',
  profile: 'person.crop.circle',
}

// Акцент кабинета (#786AD7, см. project-color-system) — цвет выбранного пункта.
const TINT = '#786AD7'

export default function MobileTeacherGlassTabs({ items, active, onChange, reviewBadge }: {
  items: { id: MTab; label: string }[]
  active: MTab
  onChange: (tab: MTab) => void
  reviewBadge: number
}) {
  const t = useT()
  const kbOpen = useKeyboardOpen()
  useEffect(() => { setGlassKeyboard(kbOpen) }, [kbOpen])

  useEffect(() => {
    setGlassTabs(items.map(it => ({
      id: it.id, title: t(it.label), symbol: SYMBOL[it.id] ?? 'circle',
      badge: it.id === 'review' ? reviewBadge : 0,
    })), active, TINT)
  }, [items, active, reviewBadge, t])

  // Обработчик через ref: подписка одна на всё время жизни бара.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => onGlassTab(id => { tactile(); onChangeRef.current(id as MTab) }), [])
  useEffect(() => () => removeGlassTabs(), [])

  return null
}
