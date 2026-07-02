import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'

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
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('payments').insert({
    student_id: params.studentId,
    teacher_id: user?.id ?? null,
    amount: params.amount,
    lessons_paid: params.lessonsPaid,
    note: params.note ?? null,
    paid_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deletePayment(id: string) {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

export function useFinanceSummary() {
  const [summary, setSummary] = useState<FinanceSummary>({ received: 0, expected: 0, debt: 0, forecast: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.rpc('teacher_finance_summary', { p_teacher_id: data.user.id })
        .then(({ data: rows }) => {
          if (rows?.[0]) {
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
  }, [])

  return summary
}
