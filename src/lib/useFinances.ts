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
  const request = supabase.from('payments').insert({
    student_id: params.studentId,
    teacher_id: uid,
    amount: params.amount,
    lessons_paid: params.lessonsPaid,
    note: params.note ?? null,
    paid_at: new Date().toISOString(),
  }).retry(false)
  const { error } = await (signal ? request.abortSignal(signal) : request)
  if (error) throw error
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
