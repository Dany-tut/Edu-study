// «Я оплатила» и закрытие месяца (миграция 20261108120000_payment_claims.sql).
//
// Ученик отмечает оплату → запрос ждёт учителя → учитель подтверждает (создаётся
// обычный платёж, баланс пересчитывает база) или отклоняет с причиной.
// Таблицы закрыты для клиента: всё через функции, которые проверяют владельца
// ученика и функцию payment_reminders. Без функции ученик получает null.
import { create } from 'zustand'
import { supabase } from './supabase'
import { reloadAllStudents } from './useGroups'

export type ClaimStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'

export type MyClaim = {
  id: string; amount: number; lessons: number; status: ClaimStatus
  reject_reason: string | null; created_at: string; decided_at: string | null; has_receipt: boolean
}

export type MyInvoice = { id: string; period: string; lessons: number; price: number; total: number; due_date: string }

export type MyPaymentInfo = {
  balance: number
  payment_amount: number | null
  payment_due: string | null
  last_package: { amount: number; lessons: number } | null
  invoice: MyInvoice | null
  claims: MyClaim[]
}

export type TeacherClaim = {
  id: string; student_id: string; student_name: string | null; amount: number; lessons: number
  note: string | null; has_receipt: boolean; invoice_id: string | null; invoice_period: string | null
  invoice_total: number | null; balance: number; created_at: string
}

export type MonthRow = {
  student_id: string; student_name: string | null; group_name: string | null; has_account: boolean
  held: number; balance: number; owed: number; price: number | null; paid_in_month: number
  invoice_id: string | null; invoice_status: 'sent' | 'paid' | 'void' | null
  invoice_total: number | null; invoice_lessons: number | null
}

export function rub(n: number | null | undefined) {
  return `${(n ?? 0).toLocaleString('ru-RU')} ₽`
}

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
/** «октябрь» по 'YYYY-MM-DD'. */
export function monthName(period: string) {
  return MONTHS[Number(period.slice(5, 7)) - 1] ?? ''
}

/** Первое число прошлого месяца по местному времени: месяц, который закрывают. */
export function previousPeriod(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function claimTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `сегодня ${time}`
  const y = new Date(today); y.setDate(today.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `вчера ${time}`
  return shortDate(iso)
}

// ── Ученик ──────────────────────────────────────────────────────────────────

export async function fetchMyPaymentInfo(studentId: string): Promise<MyPaymentInfo | null> {
  const { data, error } = await supabase.rpc('my_payment_info', { p_student: studentId })
  if (error) return null
  return (data as MyPaymentInfo | null) ?? null
}

export async function claimPayment(p: { studentId: string; amount: number; lessons: number; note?: string; receipt?: string | null }) {
  const { data, error } = await supabase.rpc('claim_payment', {
    p_student: p.studentId, p_amount: p.amount, p_lessons: p.lessons,
    p_note: p.note?.trim() || null, p_receipt: p.receipt || null,
  })
  if (error) throw error
  return data as string
}

export async function cancelPaymentClaim(id: string) {
  const { error } = await supabase.rpc('cancel_payment_claim', { p_claim: id })
  if (error) throw error
}

export async function fetchClaimReceipt(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('payment_claim_receipt', { p_claim: id })
  if (error) throw error
  return (data as string | null) ?? null
}

// ── Учитель ─────────────────────────────────────────────────────────────────

type InboxState = {
  claims: TeacherClaim[]
  loaded: boolean
  /** Растёт после каждого подтверждения/счёта — виджеты финансов перечитывают данные. */
  version: number
  load: () => Promise<void>
  bump: () => void
}

let inflight: Promise<void> | null = null
/** Общий список «ждут вас»: виджет, окно на телефоне и окно запроса видят одно и то же. */
export const usePaymentInbox = create<InboxState>((set, get) => ({
  claims: [],
  loaded: false,
  version: 0,
  load: () => {
    inflight ??= (async () => {
      try {
        const { data, error } = await supabase.rpc('teacher_payment_claims')
        set({ claims: error ? get().claims : (data ?? []) as TeacherClaim[], loaded: true })
      } finally { inflight = null }
    })()
    return inflight
  },
  bump: () => set(s => ({ version: s.version + 1 })),
}))

export async function confirmPaymentClaim(id: string, amount?: number, lessons?: number) {
  const { error } = await supabase.rpc('confirm_payment_claim', { p_claim: id, p_amount: amount ?? null, p_lessons: lessons ?? null })
  if (error) throw error
  usePaymentInbox.setState(s => ({ claims: s.claims.filter(c => c.id !== id) }))
  usePaymentInbox.getState().bump()
  // Баланс и дата оплаты в карточках учеников поменялись.
  void reloadAllStudents()
}

export async function rejectPaymentClaim(id: string, reason: string) {
  const { data, error } = await supabase.rpc('reject_payment_claim', { p_claim: id, p_reason: reason })
  if (error) throw error
  usePaymentInbox.setState(s => ({ claims: s.claims.filter(c => c.id !== id) }))
  return data === true
}

export async function fetchMonthClose(period: string): Promise<MonthRow[]> {
  const { data, error } = await supabase.rpc('month_close_preview', { p_period: period })
  if (error) throw error
  return (data ?? []) as MonthRow[]
}

export async function sendMonthInvoices(period: string, items: { student_id: string; lessons: number; price: number }[]) {
  const { data, error } = await supabase.rpc('month_close_send', { p_period: period, p_items: items })
  if (error) throw error
  usePaymentInbox.getState().bump()
  void reloadAllStudents()
  return Number(data ?? 0)
}

/** Строки, которым нужен счёт: долг по занятиям, счёта за месяц ещё нет. */
export function rowsToInvoice(rows: MonthRow[]) {
  return rows.filter(r => r.owed > 0 && !r.invoice_id)
}

// ── Ученик: общее состояние «Оплаты» (меню и окно) ──────────────────────────

type MyPaymentState = {
  studentId: string | null
  info: MyPaymentInfo | null
  loaded: boolean
  /** Окно «Оплата» открыто (одно на кабинет — StudentPaymentHost). */
  open: boolean
  load: (studentId: string) => Promise<void>
  setOpen: (open: boolean) => void
}

/** null в info — функция у учителя выключена: пункт «Оплата» не показываем. */
export const useMyPayment = create<MyPaymentState>((set, get) => ({
  studentId: null,
  info: null,
  loaded: false,
  open: false,
  setOpen: open => set({ open }),
  load: async studentId => {
    if (get().studentId !== studentId) set({ studentId, info: null, loaded: false })
    const info = await fetchMyPaymentInfo(studentId)
    if (get().studentId === studentId) set({ info, loaded: true })
  },
}))
