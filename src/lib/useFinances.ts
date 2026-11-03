import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import { paymentAmount, paymentLessons } from './paymentInput'

export type Payment = {
  id: string
  studentId: string
  teacherId: string | null
  amount: number
  lessonsPaid: number
  note: string
  paidAt: string
}

export type FinanceSummary = {
  received: number
  expected: number
  debt: number
  forecast: number
}

export function usePayments(studentId?: string) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('payments')
      .select('*')
      .eq('teacher_id', await getOwnerId())
      .order('paid_at', { ascending: false })
    if (studentId) q = q.eq('student_id', studentId)
    const { data } = await q
    if (data) {
      setPayments(data.map((p: any) => ({
        id: p.id,
        studentId: p.student_id,
        teacherId: p.teacher_id,
        amount: p.amount,
        lessonsPaid: p.lessons_paid ?? 0,
        note: p.note ?? '',
        paidAt: p.paid_at,
      })))
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => { load() }, [load])

  return { payments, loading, reload: load }
}

// Keep an uncertain payment's identity across retry/reload. The table primary key
// makes resending that operation safe; a confirmed save starts a new operation.
const pendingPayments = new Map<string, { id: string; paidAt: string }>()
function pendingPayment(key: string) {
  let value = pendingPayments.get(key)
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (typeof stored?.id === 'string' && /^[0-9a-f-]{36}$/i.test(stored.id) && typeof stored.paidAt === 'string') value = stored
  } catch { /* Storage can be unavailable; keep the same-page retry identity. */ }
  if (!value) value = { id: crypto.randomUUID(), paidAt: new Date().toISOString() }
  pendingPayments.set(key, value)
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Same-page fallback above. */ }
  return value
}

export async function addPayment(params: {
  studentId: string
  amount: number
  lessonsPaid: number
  note?: string
}, signal?: AbortSignal) {
  if (paymentAmount(String(params.amount)) === null || paymentLessons(String(params.lessonsPaid)) === null) throw new Error('Invalid payment values')
  signal?.throwIfAborted()
  const uid = await getOwnerId()
  signal?.throwIfAborted()
  const key = 'iskra:pending-payment:' + JSON.stringify([uid, params.studentId, params.amount, params.lessonsPaid, params.note ?? ''])
  const pending = pendingPayment(key)
  const row = {
    id: pending.id,
    student_id: params.studentId,
    teacher_id: uid,
    amount: params.amount,
    lessons_paid: params.lessonsPaid,
    note: params.note || null,
    paid_at: pending.paidAt,
  }
  const request = supabase.from('payments').insert(row).retry(false)
  const { error } = await (signal ? request.abortSignal(signal) : request)
  signal?.throwIfAborted()
  if (error) {
    // A lost response may hide a committed insert. Only accept a conflict when
    // our authenticated read proves that exact operation and all its values.
    if (error.code !== '23505') throw error
    const query = supabase.from('payments').select('id,student_id,teacher_id,amount,lessons_paid,note').eq('id',pending.id)
    const existing = await (signal ? query.abortSignal(signal) : query).single()
    signal?.throwIfAborted()
    const saved = existing.data
    if (existing.error || !saved || saved.student_id !== row.student_id || saved.teacher_id !== row.teacher_id || saved.amount !== row.amount || saved.lessons_paid !== row.lessons_paid || saved.note !== row.note) throw error
  }
  pendingPayments.delete(key)
  try { localStorage.removeItem(key) } catch { /* Storage is optional. */ }
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

export function useFinanceSummary(version = 0) {
  const [summary, setSummary] = useState<FinanceSummary>({ received: 0, expected: 0, debt: 0, forecast: 0 })

  useEffect(() => {
    let active = true
    getOwnerId().then(uid => {
      if (!uid || !active) return
      supabase.rpc('teacher_finance_summary', { p_teacher_id: uid })
        .then(({ data: rows }) => {
          if (active && rows?.[0]) {
            const r = rows[0]
            setSummary({
              received: Number(r.received),
              expected: Number(r.expected),
              debt: Number(r.debt),
              forecast: Number(r.forecast),
            })
          }
        })
    })
    return () => { active = false }
  }, [version])

  return summary
}
