/** Apply a trusted Testly result without treating a zero score as an empty answer. */
export function applyTestlyResult(attachments: any, testId: string, result: any) {
  if (attachments?.v !== 'basic-1' || !Array.isArray(attachments.rows) || result.state !== 'submitted') return null
  let changed = false
  let correct = Number(attachments.correct) || 0
  const credit = (x: any) => x?.max > 0 ? Math.max(0, Math.min(1, x.got / x.max)) : 0
  const rows = attachments.rows.map((row: any) => {
    if (row.type !== 'testly' || row.testly?.testId !== testId) return row
    const testly = { ...row.testly, got: result.got, max: result.max, pending: !!result.pending, submittedAt: result.submittedAt }
    const next = { ...row, answer: 'сдал тест в Тестли', testly, verdict: result.pending ? 'review' : credit(testly) === 1 ? 'correct' : 'wrong' }
    if (JSON.stringify(next) === JSON.stringify(row)) return row
    correct += credit(testly) - credit(row.testly)
    changed = true
    return next
  })
  if (!changed) return null
  const next = { ...attachments, rows, correct: Math.round(correct * 10000) / 10000 }
  return { attachments: next, score: next.gradable > 0 ? Math.round(100 * correct / next.gradable) : 0 }
}
