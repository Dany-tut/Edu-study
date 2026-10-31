/** Apply a trusted Testly result without treating a zero score as an empty answer. */
export function applyTestlyResult(attachments: any, testId: string, result: any, status?: string) {
  if (attachments?.v !== 'basic-1' || !Array.isArray(attachments.rows) || !['submitted', 'started'].includes(result.state)) return null
  let changed = false
  let returned = false
  let correct = Number(attachments.correct) || 0
  const credit = (x: any) => x?.max > 0 ? Math.max(0, Math.min(1, x.got / x.max)) : 0
  const rows = attachments.rows.map((row: any) => {
    if (row.type !== 'testly' || row.testly?.testId !== testId) return row
    if (result.state === 'started') {
      if (!row.testly.submittedAt || row.testly.returned) return row
      changed = true
      returned = true
      return { ...row, answer: '', verdict: 'review', testly: { ...row.testly, returned: true,
        returnedAt: result.updatedAt ?? new Date().toISOString() } }
    }
    // An in-flight response from before the return must not close the homework again.
    if (row.testly.returnedAt && Date.parse(result.submittedAt) <= Date.parse(row.testly.returnedAt)) return row
    const testly = { ...row.testly, ...(row.testly.returned ? { returned: false } : {}), got: result.got, max: result.max, pending: !!result.pending, submittedAt: result.submittedAt }
    const next = { ...row, answer: 'сдал тест в Тестли', testly, verdict: result.pending ? 'review' : credit(testly) === 1 ? 'correct' : 'wrong' }
    if (JSON.stringify(next) === JSON.stringify(row)) return row
    correct += credit(testly) - credit(row.testly)
    changed = true
    return next
  })
  if (!changed) return null
  const next = { ...attachments, rows, correct: Math.round(correct * 10000) / 10000 }
  const stillReturned = returned || rows.some((row: any) => row.testly?.returned)
  return { attachments: next, score: next.gradable > 0 ? Math.round(100 * correct / next.gradable) : 0,
    ...(stillReturned ? { status: 'returned' } : status === 'returned' ? { status: 'submitted' } : {}) }

}
