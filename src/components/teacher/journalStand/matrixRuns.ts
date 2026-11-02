/** Keep every assigned cell, but represent consecutive unassigned columns with
 * an actual HTML colspan. This preserves all column positions and table
 * navigation without mounting tens of thousands of identical empty cells. */
export function matrixRuns<T>(columns: readonly T[], assigned: (column: T) => boolean) {
  const runs: { item: T; span: number; assigned: boolean }[] = []
  for (const item of columns) {
    const present = assigned(item)
    const last = runs[runs.length - 1]
    if (!present && last && !last.assigned) last.span++
    else runs.push({ item, span: 1, assigned: present })
  }
  return runs
}
