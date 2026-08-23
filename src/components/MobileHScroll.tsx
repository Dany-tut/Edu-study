import { type ReactNode } from 'react'
import HScrollFade from './HScrollFade'

// Horizontal scroller with edge fades that appear only when content is hidden
// past that edge (§1.3). Scrollbar hidden. MOBILE ONLY. Reused by chip rows
// (courses subjects/modules, trainer filters).
// Thin wrapper over the shared HScrollFade — mobile gutters + narrower fade.
export default function MobileHScroll({
  children,
  gap = 8,
  fade = 'var(--color-bg)',
  padX = 16,
  arrows = false,
}: {
  children: ReactNode
  gap?: number
  /** Color the edge fade blends into — match the surface behind the row. */
  fade?: string
  padX?: number
  /** Стрелки у краёв. По умолчанию выключены: ряды чипс листаются только
   *  скроллом — как трек на главной. */
  arrows?: boolean
}) {
  return (
    <HScrollFade gap={gap} fade={fade} padX={padX} fadeWidth={28} arrows={arrows}>
      {children}
    </HScrollFade>
  )
}
