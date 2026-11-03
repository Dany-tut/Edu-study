import type { WidgetDef } from '../components/teacher/widgets/registry'
import { widgetBounds } from './deskWidgetSizing'

export type Size = { w: number; h: number }
export type Grid = { width: number; columns: number; rowHeight: number; rows: number; cellWidth: number }

export function reviewLimits(def: WidgetDef, grid: Grid) {
  return widgetBounds({ i: def.type, type: def.type, x: 0, y: 0, w: 1, h: 1, gridVersion: 2 }, def, grid.width, grid.rowHeight, 8)
}
export function reviewAllowed(def: WidgetDef, grid: Grid, size: Size) {
  const min = reviewLimits(def, grid)
  return size.w >= min.minW && size.w <= grid.columns && size.h >= min.minH && size.h <= Math.min(grid.rows, min.maxH ?? grid.rows)
}
export function reviewPresets(def: WidgetDef, grid: Grid): Size[] {
  const candidates = def.stat ? [[1, 1], [1, 2], [2, 2], [2, 3], [3, 3]]
    : def.type === 'today-schedule' ? [[2, 3], [3, 3], [3, 4], [4, 3], [4, 5]]
      : [[2, 2], [2, 3], [3, 2], [3, 3], [4, 3]]
  const choices = candidates.map(([w, h]) => ({ w, h })).filter(size => reviewAllowed(def, grid, size))
  for (let h = 1; h <= grid.rows && choices.length < 5; h++) for (let w = 1; w <= grid.columns && choices.length < 5; w++) {
    if (reviewAllowed(def, grid, { w, h }) && !choices.some(size => size.w === w && size.h === h)) choices.push({ w, h })
  }
  return choices
}
