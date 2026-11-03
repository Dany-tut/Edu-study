import type { ReactNode } from 'react'
import { OverlayScrollArea } from './OverlayScroll'

/** Ordinary teacher pages scroll edge to edge behind the floating header. */
export default function TeacherPageScroll({ children }: { children: ReactNode }) {
  return (
    <OverlayScrollArea
      className="teacher-page-scroll"
      style={{ flex: 1, marginTop: 'calc(-1 * var(--teacher-header-space))' }}
      padding="var(--teacher-header-space) 0 0"
    >
      {children}
    </OverlayScrollArea>
  )
}
