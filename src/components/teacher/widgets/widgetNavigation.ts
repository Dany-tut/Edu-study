import type { HTMLAttributes, MouseEvent } from 'react'
import type { TeacherPage } from '../../../store/teacherStore'

/** Only real destinations get a navigation affordance. */
export function metricNavigationTarget(id?: string): TeacherPage | undefined {
  if (id === 'stat-hw') return 'homework'
  if (['stat-students','student-count','student-groups','student-active','student-debtors'].includes(id ?? '')) return 'groups'
  if (['finance-received','finance-expected','finance-debt','finance-forecast'].includes(id ?? '')) return 'finances'
  // Lessons supply their actual next-lesson action; earnings is a placeholder.
  return undefined
}

const interactive = 'button,a,input,select,textarea,summary,[role="button"],[role="link"],[role="tab"],[role="checkbox"],[role="switch"],[role="combobox"],[role="slider"],[data-widget-interactive],[contenteditable="true"]'

function isCardSurface(event: MouseEvent<HTMLElement>): boolean {
  if (event.defaultPrevented || !(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return false
  const control = event.target.closest(interactive)
  if (control && control !== event.currentTarget) return false
  const selection = window.getSelection()
  if (selection?.toString() && selection.anchorNode && event.currentTarget.contains(selection.anchorNode)) return false
  // A scrollbar gesture belongs to its scroll area, not the card destination.
  for (let node: Element | null = event.target; node && node !== event.currentTarget; node = node.parentElement) {
    if (!(node instanceof HTMLElement)) continue
    const rect = node.getBoundingClientRect()
    if (node.scrollHeight > node.clientHeight + 1 && event.clientX >= rect.left + node.clientLeft + node.clientWidth) return false
    if (node.scrollWidth > node.clientWidth + 1 && event.clientY >= rect.top + node.clientTop + node.clientHeight) return false
  }
  return true
}

/** Interactive children keep their own action; the remaining surface opens once. */
export function widgetNavigationProps(action?: () => void): HTMLAttributes<HTMLElement> {
  if (!action) return {}
  return {
    role: 'link', tabIndex: 0, 'data-widget-navigation': 'true',
    // Кликабельная карточка целиком — слабый ховер-слой (index.css).
    'data-hover': 'card',
    onClick: event => { if (isCardSurface(event)) action() },
    onKeyDown: event => {
      if (event.target === event.currentTarget && !event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); action()
      }
    },
  } as HTMLAttributes<HTMLElement>
}
