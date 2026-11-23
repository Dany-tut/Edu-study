// A lesson lookup can span two requests. Navigating elsewhere, including opening
// a second lesson on the same screen, retires the earlier click.
let generation = 0
export function invalidateCourseNavigation() { generation++ }
export function beginCourseNavigation() {
  const mine = ++generation
  return () => mine === generation
}
