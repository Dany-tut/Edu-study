/** Keep the independent student cards consistent with the original summary. */
export function studentBalanceStats(students: readonly { lessonBalance?: number | null }[]) {
  let active = 0, debtors = 0
  for (const student of students) {
    if ((student.lessonBalance ?? 0) < 0) debtors++
    else active++
  }
  return { active, debtors }
}
