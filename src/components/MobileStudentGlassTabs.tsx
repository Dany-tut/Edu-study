import { useEffect, useRef } from 'react'
import { setGlassTabs, removeGlassTabs, onGlassTab, setGlassKeyboard } from '../lib/nativeGlass'
import { useKeyboardOpen } from '../lib/useKeyboardInset'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'
import { useDashboard } from '../store/dashboardStore'

// Нижняя навигация ученика в приложении на iOS (iPhone и iPad в телефонной
// раскладке) — системный UITabBar со стеклом Liquid Glass, как у преподавателя
// (teacher/mobile/MobileTeacherGlassTabs.tsx). Веб-док MobileBottomNav в
// приложении не рисуется; в Safari, на Android и на ПК он остаётся своим.
//
// ОДИН БАР НА ВСЕ ЭКРАНЫ. MobileBottomNav монтируется каждым экраном отдельно,
// и при смене вкладки старый экран размонтируется уже после того, как новый
// смонтировался (или наоборот). Поэтому подписка на нажатия одна на модуль и
// ведёт в последний смонтированный экран, а бар снимается, только если за
// тик не появилось ни одного нового — иначе он мигал бы на каждом переходе.

const SYMBOL: Record<string, string> = {
  home: 'house',
  courses: 'book',
  trainer: 'dumbbell',
  homeworkList: 'checkmark.rectangle.stack',
  profile: 'person.crop.circle',
}

// Акцент кабинета (#786AD7, project-color-system) — цвет выбранного пункта.
const TINT = '#786AD7'

// Смонтированные экраны по порядку: нажатие уходит последнему.
const handlers: ((id: string) => void)[] = []
let unsubscribe: (() => void) | null = null

export default function MobileStudentGlassTabs({ items, active, onSelect, hwBadge, feedBadge }: {
  items: { id: string; label: string }[]
  active: string
  onSelect: (id: string) => void
  hwBadge: number
  feedBadge: number
}) {
  const t = useT()
  const kbOpen = useKeyboardOpen()
  useEffect(() => { setGlassKeyboard(kbOpen) }, [kbOpen])

  // Урок и домашка — не вкладки, а вложенные экраны. Пока они открыты,
  // выбранной остаётся вкладка, откуда пришли (lessonReturnPage): урок из ДЗ
  // подсвечивает «ДЗ», а не первую вкладку, на которую иначе падает UITabBar.
  const returnPage = useDashboard(s => s.lessonReturnPage)
  const selected = items.some(it => it.id === active)
    ? active
    : items.some(it => it.id === returnPage) ? returnPage : 'home'

  useEffect(() => {
    setGlassTabs(items.map(it => ({
      id: it.id, title: t(it.label), symbol: SYMBOL[it.id] ?? 'circle',
      badge: it.id === 'homeworkList' ? hwBadge : it.id === 'trainer' ? feedBadge : 0,
    })), selected, TINT)
  }, [items, selected, hwBadge, feedBadge, t])

  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  useEffect(() => {
    const mine = (id: string) => onSelectRef.current(id)
    handlers.push(mine)
    if (!unsubscribe) unsubscribe = onGlassTab(id => { tactile(); handlers[handlers.length - 1]?.(id) })
    return () => {
      handlers.splice(handlers.indexOf(mine), 1)
      window.setTimeout(() => {
        if (handlers.length > 0) return
        unsubscribe?.()
        unsubscribe = null
        removeGlassTabs()
      }, 0)
    }
  }, [])

  return null
}
