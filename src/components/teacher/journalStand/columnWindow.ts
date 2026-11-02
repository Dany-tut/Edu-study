/** Window only the DOM. The complete ordered columns and student results stay
 * in memory, including works outside the viewport and the active filter. */
export function columnWindow(count: number, left: number, width: number, columnWidth: number) {
  if (count <= 40) return { start: 0, end: count }
  const start = Math.max(0, Math.min(count - 1, Math.floor(Math.max(0, left) / columnWidth)) - 4)
  return { start, end: Math.min(count, Math.ceil((Math.max(0, left) + Math.max(width, columnWidth)) / columnWidth) + 4) }
}

/** HTML clamps colSpan at 1000. Split distant spacers without losing tracks. */
export function columnSpacers(count: number) {
  const spans: number[] = []
  for (let remaining = count; remaining > 0; remaining -= 1000) spans.push(Math.min(1000, remaining))
  return spans
}
