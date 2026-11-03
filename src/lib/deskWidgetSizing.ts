import type { LayoutItem } from './useDeskLayouts'

export type WidgetSizeLimits = {
  allowedSizes?: readonly {w:number;h:number}[]
  minW: number
  minH: number
  maxH?: number
  minWidthPx?: number
  minHeightPx?: number
}

export const DESK_COLUMNS = 12
export const DESK_GAP = 8
export const DESK_INSET = 32
export const DESK_TOP = 108

/** All widgets share cells; a 1×1 card is readable even on a small desktop. */
export function deskColumns(width: number, preferred?: number): number {
  const available = Math.max(1, Math.min(DESK_COLUMNS, Math.floor((width + DESK_GAP) / (156 + DESK_GAP))))
  // Built-in desks share an eight-column template; narrow desktops use four.
  return preferred === 8 ? (available >= 8 ? 8 : Math.min(4, available)) : available
}
export function deskRowHeight(viewportHeight: number): number {
  // Six whole rows fill a normal desktop with the same side and bottom inset.
  // Short windows scroll rather than reducing cards below their readable size.
  return Math.max(116, (viewportHeight - DESK_TOP - DESK_INSET - 5 * DESK_GAP) / 6)
}
/** Migration uses a fixed baseline, so changing window height cannot resize
 * an untouched saved desk before the teacher edits it. */
export function legacyDeskRowHeight(_viewportHeight: number): number { return 64 }

/** Registered types use today's rules, never stale limits from a saved desk. */
export function widgetBounds(item: LayoutItem, definition: WidgetSizeLimits | undefined, width: number, rowHeight: number, preferredColumns?: number) {
  const base = definition ?? item
  const pairs = definition?.allowedSizes
  const limits = pairs?.length ? {...base,minW:Math.min(...pairs.map(s=>s.w)),minH:Math.min(...pairs.map(s=>s.h)),maxH:Math.max(...pairs.map(s=>s.h))} : base
  const columns = deskColumns(width, preferredColumns)
  const columnPitch = (Math.max(1, width) + DESK_GAP) / columns
  const minW = Math.min(columns, Math.max(1, Math.ceil(limits.minW ?? 1), Math.ceil(((definition?.minWidthPx ?? 0) + DESK_GAP) / columnPitch)))
  const minH = Math.max(1, Math.ceil(limits.minH ?? 1), Math.ceil(((definition?.minHeightPx ?? 0) + DESK_GAP) / (rowHeight + DESK_GAP)))
  const maxH = limits.maxH == null ? undefined : Math.max(minH, Math.floor(limits.maxH))
  return { minW, minH, maxH }
}

export function clampDeskWidget(item: LayoutItem, definition: WidgetSizeLimits | undefined, width: number, rowHeight: number, legacyRowHeight = 64, preferredColumns?: number): LayoutItem {
  const limits = widgetBounds(item, definition, width, rowHeight, preferredColumns)
  const columns = deskColumns(width, preferredColumns)
  // Normalize the old 12-column/fractional layout once, preserving its physical
  // proportions as closely as whole cells allow. No fractional sizes survive.
  const current = item.gridVersion === 2 ? item : {
    ...item,
    x: item.x * columns / DESK_COLUMNS,
    w: item.w * columns / DESK_COLUMNS,
    y: item.y * (legacyRowHeight + DESK_GAP) / (rowHeight + DESK_GAP),
    h: (item.h * (legacyRowHeight + DESK_GAP)) / (rowHeight + DESK_GAP),
  }
  let w = Math.max(limits.minW, Math.min(columns, Math.round(current.w)))
  let h = Math.max(limits.minH, Math.min(limits.maxH ?? Infinity, Math.round(current.h)))
  const pairs = definition?.allowedSizes?.filter(s=>s.w<=columns && s.w>=limits.minW && s.h>=limits.minH)
  if(pairs?.length){
    const nearest=[...pairs].sort((a,b)=>(a.w-w)**2+(a.h-h)**2-((b.w-w)**2+(b.h-h)**2)||a.w*a.h-b.w*b.h)[0]
    w=nearest.w;h=nearest.h
  }
  return { ...current, ...limits, gridVersion: 2, w, h, x: Math.max(0, Math.min(columns - w, Math.round(current.x))), y: Math.max(0, Math.round(current.y)) }
}

/** Pointer movement selects whole cells; it never changes the cell geometry. */
export function resizeDeskWidget(item: LayoutItem, definition: WidgetSizeLimits | undefined, dx: number, dy: number, width: number, rowHeight: number, preferredColumns?: number): LayoutItem {
  const columnPitch = (width + DESK_GAP) / deskColumns(width, preferredColumns)
  return clampDeskWidget({ ...item,
    w: Math.min(deskColumns(width, preferredColumns) - item.x, item.w + Math.round(dx / columnPitch)),
    h: item.h + Math.round(dy / (rowHeight + DESK_GAP)),
  }, definition, width, rowHeight, 64, preferredColumns)
}

/** The active card keeps its column; collisions only move its neighbours down.
 * Horizontal shoves leave unrelated cards stranded after a resize is reversed. */
export function resolveDeskCollisions(items: LayoutItem[], activeId = ''): LayoutItem[] {
  const layout = items.map(item => ({ ...item }))
  const overlaps = (a: LayoutItem, b: LayoutItem) => a.i !== b.i &&
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  for (let pass = 0; pass < layout.length * 3; pass++) {
    let changed = false
    for (const item of layout) {
      if (item.i === activeId) continue
      const blocker = layout.find(other => overlaps(item, other))
      if (blocker) { item.y = blocker.y + blocker.h; changed = true }
    }
    if (!changed) break
  }
  return layout
}
