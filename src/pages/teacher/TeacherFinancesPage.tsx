import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, Plus, X, Check, ChevronDown, ChevronUp,
  TrendingUp, AlertCircle, Clock, CheckCircle2, Trash2,
} from 'lucide-react'
import { useAllStudents, useGroups } from '../../lib/useGroups'
import { usePayments, useFinanceSummary, addPayment, deletePayment } from '../../lib/useFinances'
import type { Student } from '../../data/teacherMockData'

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function diffDays(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

type PaymentStatus = 'overdue' | 'soon' | 'pending' | 'ok'

function getStatus(s: Student): PaymentStatus {
  if (!s.paymentDue) return 'ok'
  const d = diffDays(s.paymentDue)
  if (d < 0)  return 'overdue'
  if (d <= 3) return 'soon'
  if (d <= 14) return 'pending'
  return 'ok'
}

type FilterTab = 'all' | 'overdue' | 'soon' | 'paid'

// ── AddPaymentModal ────────────────────────────────────────────────────────────

function AddPaymentModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(student.paymentAmount ? String(student.paymentAmount) : '')
  const [lessons, setLessons] = useState('4')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const amt = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amt || amt <= 0) return
    setSaving(true)
    try {
      await addPayment({
        studentId: student.id,
        amount: amt,
        lessonsPaid: parseInt(lessons) || 0,
        note,
      })
      setSaved(true)
      setTimeout(() => { onSaved(); onClose() }, 700)
    } catch {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--color-bg-3)',
    border: '1px solid var(--color-border)',
    borderRadius: 10, fontSize: 14,
    color: 'var(--color-text)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 20, padding: '22px 22px 20px',
          width: 360, maxWidth: '90vw',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Отметить оплату</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{student.name}</div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'var(--color-bg-3)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-text-3)',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Сумма, ₽</div>
            <input
              style={inputStyle}
              type="number"
              placeholder="4 500"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Занятий оплачено</div>
            <input
              style={inputStyle}
              type="number"
              placeholder="4"
              value={lessons}
              onChange={e => setLessons(e.target.value)}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Заметка (необязательно)</div>
            <input
              style={inputStyle}
              placeholder="Перевод на карту..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || saved || !amount}
          style={{
            marginTop: 16,
            width: '100%', padding: '11px',
            background: saved ? 'var(--color-green-soft)' : 'var(--grad-purple)',
            border: 'none', borderRadius: 12,
            color: saved ? 'var(--color-green-text)' : '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: saving || saved ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'background 0.2s',
          } as React.CSSProperties}
        >
          {saved
            ? <><Check size={15} /> Сохранено</>
            : saving
              ? 'Сохраняем...'
              : 'Сохранить платёж'
          }
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// ── StudentRow ─────────────────────────────────────────────────────────────────

function StudentRow({
  student,
  groupName,
  onPay,
  expanded,
  onToggle,
}: {
  student: Student
  groupName: string
  onPay: (s: Student) => void
  expanded: boolean
  onToggle: () => void
}) {
  const status = getStatus(student)
  const { payments, reload } = usePayments(student.id)

  const statusColor = status === 'overdue' ? 'var(--color-red-text)'
    : status === 'soon' ? '#D07020'
    : status === 'pending' ? 'var(--color-text-2)'
    : 'var(--color-green-text)'

  const avatarBg = status === 'overdue' ? 'var(--color-red-soft)'
    : status === 'soon' ? 'var(--color-peach-soft)'
    : 'var(--color-purple-soft)'

  const balance = student.lessonBalance ?? 0

  async function handleDelete(id: string) {
    await deletePayment(id)
    reload()
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--color-border)',
    }}>
      {/* Main row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: statusColor,
        }}>
          {initials(student.name)}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>
            {student.name.split(' ').slice(0, 2).join(' ')}
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 400, marginLeft: 6 }}>{groupName}</span>
          </div>
          <div style={{ fontSize: 11, color: statusColor, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            {status === 'overdue' && <><AlertCircle size={11} /> просрочено {Math.abs(diffDays(student.paymentDue!))} дн.</>}
            {status === 'soon'    && <><Clock size={11} /> через {diffDays(student.paymentDue!)} дн.</>}
            {status === 'pending' && <><Clock size={11} /> до {fmtDate(student.paymentDue!)}</>}
            {status === 'ok'     && balance > 0 && <><CheckCircle2 size={11} /> баланс {balance} зан.</>}
            {status === 'ok'     && balance <= 0 && '—'}
          </div>
        </div>

        {/* Balance chip */}
        <div style={{
          padding: '3px 8px', borderRadius: 8,
          background: balance < 0 ? 'var(--color-red-soft)' : balance === 0 ? 'var(--color-bg-3)' : 'var(--color-green-soft)',
          fontSize: 11, fontWeight: 700,
          color: balance < 0 ? 'var(--color-red-text)' : balance === 0 ? 'var(--color-text-3)' : 'var(--color-green-text)',
          flexShrink: 0,
        }}>
          {balance > 0 ? `+${balance}` : balance} зан.
        </div>

        {/* Amount */}
        {student.paymentAmount ? (
          <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 4 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: statusColor }}>
              {fmt(student.paymentAmount)} ₽
            </div>
          </div>
        ) : null}

        {/* Pay button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={e => { e.stopPropagation(); onPay(student) }}
          style={{
            padding: '6px 12px', borderRadius: 9,
            background: status === 'overdue' || status === 'soon'
              ? 'var(--grad-purple)'
              : 'var(--color-bg-3)',
            border: status === 'overdue' || status === 'soon'
              ? 'none'
              : '1px solid var(--color-border)',
            color: status === 'overdue' || status === 'soon'
              ? '#fff'
              : 'var(--color-text-2)',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
          } as React.CSSProperties}
        >
          Оплачено
        </motion.button>

        {/* Expand toggle */}
        <div style={{ color: 'var(--color-text-3)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Payment history */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              margin: '0 16px 12px',
              background: 'var(--color-bg-3)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              {payments.length === 0 ? (
                <div style={{ padding: '14px 14px', fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
                  История платежей пуста
                </div>
              ) : payments.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  borderBottom: i < payments.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <CheckCircle2 size={13} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-2)' }}>
                    {fmtDate(p.paidAt)}
                    {p.lessonsPaid > 0 && <span style={{ color: 'var(--color-text-3)' }}> · {p.lessonsPaid} зан.</span>}
                    {p.note && <span style={{ color: 'var(--color-text-3)' }}> · {p.note}</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)' }}>
                    +{fmt(p.amount)} ₽
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-3)', padding: 2, display: 'flex',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TeacherFinancesPage() {
  const students = useAllStudents()
  const { groups } = useGroups()
  const summary  = useFinanceSummary()
  const [filter, setFilter]       = useState<FilterTab>('all')
  const [paying, setPaying]       = useState<Student | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  function handlePaid() {
    setReloadKey(k => k + 1)
  }

  const studentsWithDue = useMemo(() =>
    students.filter(s => s.paymentDue || (s.lessonBalance ?? 0) < 0)
  , [students])

  const filtered = useMemo(() => {
    const s = studentsWithDue
    if (filter === 'all')     return s
    if (filter === 'overdue') return s.filter(x => getStatus(x) === 'overdue')
    if (filter === 'soon')    return s.filter(x => getStatus(x) === 'soon' || getStatus(x) === 'pending')
    if (filter === 'paid')    return students.filter(x => !x.paymentDue && (x.lessonBalance ?? 0) >= 0)
    return s
  }, [studentsWithDue, students, filter])

  const overdueCount = useMemo(() => studentsWithDue.filter(s => getStatus(s) === 'overdue').length, [studentsWithDue])
  const soonCount    = useMemo(() => studentsWithDue.filter(s => getStatus(s) === 'soon' || getStatus(s) === 'pending').length, [studentsWithDue])

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all',     label: 'Все' },
    { id: 'overdue', label: 'Просрочено', count: overdueCount },
    { id: 'soon',    label: 'На подходе',  count: soonCount },
    { id: 'paid',    label: 'Оплачено' },
  ]

  return (
    {/* Lifted under the topbar so content melts into the progressive-blur
        strip instead of hard-clipping (shared scroll-under-topbar recipe) */}
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '128px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'var(--grad-purple)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Wallet size={18} strokeWidth={2} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>Финансы</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => students[0] && setPaying(students[0])}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 12,
              background: 'var(--grad-purple)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            } as React.CSSProperties}
          >
            <Plus size={15} /> Платёж
          </motion.button>
        </div>

        {/* KPI strip */}
        <div style={{
          display: 'flex',
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 16, overflow: 'hidden',
          marginBottom: 20,
        }}>
          {[
            { label: 'Получено',  value: fmt(summary.received),  color: 'var(--color-green-text)', icon: <CheckCircle2 size={13} /> },
            { label: 'Ожидается', value: fmt(summary.expected),  color: 'var(--color-text)',        icon: <Clock size={13} /> },
            { label: 'Долг',      value: fmt(summary.debt),      color: 'var(--color-red-text)',    icon: <AlertCircle size={13} /> },
            { label: 'Прогноз',   value: fmt(summary.forecast),  color: 'var(--color-text)',        icon: <TrendingUp size={13} /> },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              flex: 1, padding: '14px 8px', textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.color, marginTop: 4, letterSpacing: '-0.5px' }}>
                {item.value} ₽
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '6px 13px', borderRadius: 10,
                background: filter === tab.id ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                border: filter === tab.id ? '1px solid transparent' : '1px solid var(--color-border)',
                color: filter === tab.id ? 'var(--color-purple)' : 'var(--color-text-2)',
                fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.15s, color 0.15s',
              } as React.CSSProperties}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span style={{
                  background: filter === tab.id ? 'var(--color-bg-3)' : 'var(--color-red-soft)',
                  color: filter === tab.id ? 'var(--color-purple)' : 'var(--color-red-text)',
                  borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Student list */}
        <div style={{
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <CheckCircle2 size={32} strokeWidth={1.5} style={{ color: 'var(--color-text-3)' }} />
              <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>
                {filter === 'overdue' ? 'Просрочек нет' : 'Ничего не найдено'}
              </div>
            </div>
          ) : (
            filtered.map(s => {
              const group = groups.find(g => g.id === s.groupId)
              return (
                <StudentRow
                  key={s.id + reloadKey}
                  student={s}
                  groupName={group?.name ?? ''}
                  onPay={setPaying}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                />
              )
            })
          )}
        </div>

      </div>

      {/* Add payment modal */}
      <AnimatePresence>
        {paying && (
          <AddPaymentModal
            student={paying}
            onClose={() => setPaying(null)}
            onSaved={handlePaid}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
