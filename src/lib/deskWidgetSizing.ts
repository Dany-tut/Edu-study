import type { LayoutItem } from './useDeskLayouts'

export type WidgetSizeLimits = {
  minW: number
  minH: number
  maxH?: number
  minWidthPx?: number
  minHeightPx?: number
}

export const DESK_COLUMNS = 12
export const DESK_GAP = 8

/** One grid scale per viewport, shared by every desk and stable after reload.
 * Content edits must not change the physical size of saved fractional cells. */
export function deskRowHeight(viewportHeight: number): number {
  return Math.max(42, Math.min(84, (viewportHeight - 108 - 16 - 10 * DESK_GAP) / 11))
}

/** Registered types use today's rules, never stale limits from a saved desk. */
export function widgetBounds(item: LayoutItem, definition: WidgetSizeLimits | undefined, width: number, rowHeight: number) {
  const limits = definition ?? item
  const columnPitch = (Math.max(1, width) + DESK_GAP) / DESK_COLUMNS
  const minW = Math.min(DESK_COLUMNS, Math.max(limits.minW ?? 1, ((definition?.minWidthPx ?? 0) + DESK_GAP) / columnPitch))
  const minH = Math.max(limits.minH ?? 1, ((definition?.minHeightPx ?? 0) + DESK_GAP) / (rowHeight + DESK_GAP))
  const maxH = limits.maxH == null ? undefined : Math.max(minH, limits.maxH)
  return { minW, minH, maxH }
}

export function clampDeskWidget(item: LayoutItem, definition: WidgetSizeLimits | undefined, width: number, rowHeight: number): LayoutItem {
  const limits = widgetBounds(item, definition, width, rowHeight)
  const w = Math.max(limits.minW, Math.min(DESK_COLUMNS, item.w))
  const h = Math.max(limits.minH, Math.min(limits.maxH ?? Infinity, item.h))
  return { ...item, ...limits, w, h, x: Math.max(0, Math.min(DESK_COLUMNS - w, item.x)), y: Math.max(0, item.y) }
}

/** Pack below the exact preceding edge, including fractional compact sizes. */
export function compactDeskWidgets(items: LayoutItem[]): LayoutItem[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const placed: LayoutItem[] = []
  for (const item of sorted) {
    let y = 0
    for (;;) {
      const blocker = placed.find(p => item.x < p.x + p.w && item.x + item.w > p.x && y < p.y + p.h && y + item.h > p.y)
      if (!blocker) break
      y = blocker.y + blocker.h
    }
    placed.push({ ...item, y })
  }
  return placed
}
