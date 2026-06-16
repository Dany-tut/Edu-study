// Confidence calibration — logs (confident?, correct?) for each answered question so the
// teacher can see metacognition: the "confidently wrong" danger zone and self-underrating.
//
// Capture: call logConfidence(...) when an answer is locked in a test/trainer that has the
// "ask confidence" option on. Report: fetchCalibration(owner) aggregates the 2×2 matrix.

import { supabase } from '../lib/supabase'

export interface CalibrationCounts {
  confidentCorrect: number  // ✅ healthy knowledge
  confidentWrong: number    // 🔴 danger zone — thinks they know
  unsureCorrect: number     // 🟡 underrates self
  unsureWrong: number       // ⬜ honest gap
  total: number
  /** 0..100 — share of answers where confidence matched outcome (confident+correct or unsure+wrong). */
  calibration: number
}

export async function logConfidence(input: {
  studentId?: string
  anonName?: string
  subject?: string
  source?: string
  confident: boolean
  correct: boolean
}): Promise<void> {
  const owner = input.studentId ?? input.anonName
  if (!owner) return
  await supabase.from('confidence_log').insert({
    student_id: input.studentId ?? null,
    anon_name: input.anonName ?? null,
    subject: input.subject ?? null,
    source: input.source ?? 'diagnostic',
    confident: input.confident,
    correct: input.correct,
  })
}

export async function fetchCalibration(
  owner: { studentId?: string; anonName?: string },
  subject?: string,
): Promise<CalibrationCounts> {
  const col = owner.studentId ? 'student_id' : 'anon_name'
  const val = owner.studentId ?? owner.anonName ?? ''
  const empty: CalibrationCounts = { confidentCorrect: 0, confidentWrong: 0, unsureCorrect: 0, unsureWrong: 0, total: 0, calibration: 0 }
  if (!val) return empty
  let q = supabase.from('confidence_log').select('confident, correct').eq(col, val)
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error || !data) { if (error) console.error('fetchCalibration:', error); return empty }
  const c = { ...empty }
  for (const r of data) {
    const conf = r.confident as boolean, ok = r.correct as boolean
    if (conf && ok) c.confidentCorrect++
    else if (conf && !ok) c.confidentWrong++
    else if (!conf && ok) c.unsureCorrect++
    else c.unsureWrong++
  }
  c.total = data.length
  c.calibration = c.total ? Math.round(((c.confidentCorrect + c.unsureWrong) / c.total) * 100) : 0
  return c
}
