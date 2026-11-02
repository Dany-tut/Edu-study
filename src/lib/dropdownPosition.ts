/** Keep anchored menus inside the viewport, including narrow and short windows. */
export function dropdownPosition(rect: { left: number; top: number; bottom: number; width: number }, viewport: { width: number; height: number }, height: number, preferredWidth = rect.width, margin = 8) {
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2))
  const left = Math.max(margin, Math.min(rect.left, viewport.width - width - margin))
  const below = Math.max(0, viewport.height - rect.bottom - 5 - margin)
  const above = Math.max(0, rect.top - 5 - margin)
  const up = below < height && above > below
  // Very little room on either side: use the viewport rather than clipping actions.
  const detached = Math.max(above, below) < Math.min(height, 96)
  return {
    width, left, up: !detached && up,
    top: detached ? margin : Math.max(margin, rect.bottom + 5),
    bottom: Math.max(margin, viewport.height - rect.top + 5),
    maxHeight: detached ? Math.max(0, viewport.height - margin * 2) : up ? above : below,
  }
}
export const viewportDropdownPosition = (rect: Parameters<typeof dropdownPosition>[0], height: number, width?: number, margin?: number) =>
  dropdownPosition(rect, { width: window.innerWidth, height: window.innerHeight }, height, width, margin)
