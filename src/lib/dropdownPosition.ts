/** Keep anchored menus inside the viewport, including narrow and short windows. */
export function dropdownPosition(rect: { left: number; top: number; bottom: number; width: number }, viewport: { width: number; height: number; left?: number; top?: number; layoutHeight?: number }, height: number, preferredWidth = rect.width, margin = 8) {
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2))
  const viewLeft = viewport.left ?? 0, viewTop = viewport.top ?? 0
  const left = Math.max(viewLeft + margin, Math.min(rect.left, viewLeft + viewport.width - width - margin))
  const below = Math.max(0, Math.min(viewport.height - margin * 2, viewTop + viewport.height - rect.bottom - 5 - margin))
  const above = Math.max(0, Math.min(viewport.height - margin * 2, rect.top - viewTop - 5 - margin))
  const up = below < height && above > below
  // Very little room on either side: use the viewport rather than clipping actions.
  const detached = rect.top >= viewTop + viewport.height - margin || rect.bottom <= viewTop + margin || Math.max(above, below) < Math.min(height, 96)
  return {
    width, left, up: !detached && up,
    top: detached ? viewTop + margin : Math.max(viewTop + margin, rect.bottom + 5),
    bottom: Math.max(margin, (viewport.layoutHeight ?? viewport.height) - rect.top + 5),
    maxHeight: detached ? Math.max(0, viewport.height - margin * 2) : up ? above : below,
  }
}
export const viewportDropdownPosition = (rect: Parameters<typeof dropdownPosition>[0], height: number, width?: number, margin?: number) =>
  dropdownPosition(rect, { width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight, left: window.visualViewport?.offsetLeft, top: window.visualViewport?.offsetTop, layoutHeight: window.innerHeight }, height, width, margin)

/** Keyboard and viewport panning do not always dispatch a window resize. */
export function watchDropdownViewport(update: (event: Event) => void) {
  const viewport = window.visualViewport
  viewport?.addEventListener('resize', update)
  viewport?.addEventListener('scroll', update)
  return () => { viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update) }
}
