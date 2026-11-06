import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Group, Student } from '../../../data/teacherMockData'
import { AvatarPhotoFill } from '../../AvatarPhoto'
import { Download, X } from '../../icons/appIcons'
import { OverlayScrollArea } from '../OverlayScroll'

export default function StudentReportDrawer({ student, group, host, children, onClose, onPrint }: {
  student: Student
  group?: Group
  host: HTMLElement
  children: ReactNode
  onClose: () => void
  onPrint: () => void
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  useLayoutEffect(() => {
    closeButton.current?.focus({ preventScroll: true })
  }, [])
  return createPortal(
    <aside role="dialog" aria-modal="false" aria-label={'Полная статистика · ' + student.name}
      className="js-report-drawer" style={{ '--report-accent': group?.color || 'var(--color-accent)' } as CSSProperties}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      }}>
      <header>
        <span className="js-report-avatar" aria-hidden>
          {student.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('')}
          <AvatarPhotoFill path={student.avatarPath} />
        </span>
        <div className="js-report-person">
          <strong title={student.name}>{student.name}</strong>
          <small>{group?.name ?? 'Без группы'}</small>
        </div>
        <button data-hover="layer" type="button" aria-label="Скачать PDF" title="Скачать PDF" onClick={onPrint}><Download size={15} /></button>
        <button data-hover="layer" type="button" ref={closeButton} aria-label="Закрыть статистику" title="Закрыть статистику" onClick={onClose}><X size={16} /></button>
      </header>
      <OverlayScrollArea key={student.id} className="js-report-scroll" style={{ flex: 1 }}>
        {children}
      </OverlayScrollArea>
    </aside>, host
  )
}
