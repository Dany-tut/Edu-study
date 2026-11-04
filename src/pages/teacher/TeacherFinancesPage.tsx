import TeacherPageScroll from '../../components/teacher/TeacherPageScroll'
import { useState, useMemo } from 'react'
import FadeText from '../../components/FadeText'
import { useIsDesktop } from '../../lib/useIsDesktop'
import Modal from '../../components/Modal'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { Alert } from '../../components/Alert'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { paymentAmount, paymentLessons } from '../../lib/paymentInput'
import CountBadge from '../../components/CountBadge'
import Segmented from '../../components/Segmented'
import { FIELD } from '../../lib/fieldStyle'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, Plus, X, Check, ChevronDown, ChevronUp,
  TrendingUp, AlertCircle, Clock, CheckCircle2, Trash2,
} from '../../components/icons/appIcons'
import { useAllStudents, useGroups, reloadAllStudents } from '../../lib/useGroups'
import { usePayments, useFinanceSummary, addPayment, deletePayment } from '../../lib/useFinances'
import { useT, useTc } from '../../lib/i18n'
import type { Student } from '../../data/teacherMockData'
import { PAGE_WIDTH } from '../../lib/pageWidth'

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

export function AddPaymentModal({ student, students, onClose, onSaved }: {
  student: Student | null; students: Student[]; onClose: () => void; onSaved: () => void
}) {
  const t = useT()
  const { tn } = useTc()
  const [studentId, setStudentId] = useState(student?.id ?? '')
  const [amount, setAmount] = useState(student?.paymentAmount ? String(student.paymentAmount) : '')
  const [lessons, setLessons] = useState('4')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const action = useAsyncTask()
  function close() { action.cancel(); onClose() }
  function save() {
    const selected = students.find(s => s.id === studentId)
    const amt = paymentAmount(amount), count = paymentLessons(lessons)
    if (!selected) { setError(t('Выберите ученика для оплаты.')); return }
    if (amt === null) { setError(t('Укажите положительную сумму в целых рублях, не больше 2 147 483 647.')); return }
    if (count === null) { setError(t('Укажите целое неотрицательное количество занятий.')); return }
    setError('')
    void action.run(signal => addPayment({ studentId: selected.id, amount: amt, lessonsPaid: count, note }, signal),
      () => { onSaved(); onClose() },
      () => setError(t('Не удалось подтвердить сохранение платежа.\nПроверьте список оплат перед повтором. Введённые данные сохранены.')))
  }
  const field = { ...FIELD, fontSize: 16, minHeight: 48 }
  return <Modal title={t('Отметить оплату')} width={420} onClose={close}
    footer={<><button type="button" className="cj-button" style={{ minHeight: 44 }} onClick={close}>{t('Отмена')}</button><button type="button" className="cj-button cj-primary" style={{ minHeight: 44 }} disabled={action.busy || !studentId || !amount} onClick={save}>{action.busy ? t('Сохраняем...') : t('Сохранить платёж')}</button></>}>
    <div style={{ display: 'grid', gap: 14 }}>
      <label style={{ display: 'grid', gap: 6 }}>{t('Ученик')}
        <TeacherSelect disabled={action.busy} clearable={!action.busy} value={studentId} options={students.map(s => ({ value: s.id, label: tn(s.name) }))} onChange={setStudentId} placeholder={t('Выберите ученика')} triggerStyle={field} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>{t('Сумма, ₽')}
        <input style={field} type="text" inputMode="numeric" placeholder="4 500" value={amount} onChange={e => setAmount(e.target.value)} disabled={action.busy} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>{t('Занятий оплачено')}
        <input style={field} type="text" inputMode="numeric" placeholder="4" value={lessons} onChange={e => setLessons(e.target.value)} disabled={action.busy} />
      </label>
      <label style={{ display: 'grid', gap: 6 }}>{t('Заметка (необязательно)')}
        <input style={field} placeholder={t('Перевод на карту...')} value={note} onChange={e => setNote(e.target.value)} disabled={action.busy} />
      </label>
      {error && <Alert tone="danger" text={error} />}
    </div>
  </Modal>
}

// ── StudentRow ─────────────────────────────────────────────────────────────────

function StudentRow({
  student,
  groupName,
  compact = false,
  onPay,
  expanded,
  onToggle,
  onChanged,
}: {
  student: Student
  groupName: string
  compact?: boolean
  onPay: (s: Student) => void
  expanded: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const t = useT()
  const { tn } = useTc()
  const status = getStatus(student)
  const { payments } = usePayments(student.id)
  const deletion = useAsyncTask()
  const [deleteError, setDeleteError] = useState('')

  const statusColor = status === 'overdue' ? 'var(--color-red-text)'
    : status === 'soon' ? '#D07020'
    : status === 'pending' ? 'var(--color-text-2)'
    : 'var(--color-green-text)'

  const avatarBg = status === 'overdue' ? 'var(--color-red-soft)'
    : status === 'soon' ? 'var(--color-peach-soft)'
    : 'var(--color-purple-soft)'

  const balance = student.lessonBalance ?? 0

  function handleDelete(id: string) {
    setDeleteError('')
    void deletion.run(signal => deletePayment(id, signal),
      () => { onChanged() },
      () => setDeleteError(t('Не удалось удалить платёж. Попробуйте ещё раз.')))
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--color-border)',
    }}>
      {/* Main row */}
      <div
        style={{
          display: compact ? 'grid' : 'flex', gridTemplateColumns: compact ? '34px minmax(0, 1fr) auto' : undefined, alignItems: 'center', gap: 10,
          padding: '12px 16px', cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0, gridColumn: compact ? 1 : undefined, gridRow: compact ? '1 / span 2' : undefined,
          background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: statusColor,
        }}>
          {initials(tn(student.name))}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0, gridColumn: compact ? 2 : undefined, gridRow: compact ? 1 : undefined }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'flex', flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'baseline', gap: compact ? 2 : 6, minWidth: 0 }}>
            <FadeText>{tn(student.name).split(' ').slice(0, 2).join(' ')}</FadeText>
            <FadeText style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 400 }}>{groupName}</FadeText>
          </div>
          <div style={{ fontSize: 11, color: statusColor, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            {status === 'overdue' && <><AlertCircle size={12} /> {t('просрочено')} {Math.abs(diffDays(student.paymentDue!))} {t('дн.')}</>}
            {status === 'soon'    && <><Clock size={12} /> {t('через')} {diffDays(student.paymentDue!)} {t('дн.')}</>}
            {status === 'pending' && <><Clock size={12} /> {t('до')} {fmtDate(student.paymentDue!)}</>}
            {status === 'ok'     && balance > 0 && <><CheckCircle2 size={12} /> {t('баланс')} {balance} {t('зан.')}</>}
            {status === 'ok'     && balance <= 0 && '—'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: compact ? 'wrap' : 'nowrap', minWidth: 0, gridColumn: compact ? 2 : undefined, gridRow: compact ? 2 : undefined }}>
        {/* Balance chip */}
        <div style={{
          padding: '4px 8px', borderRadius: 8,
          background: balance < 0 ? 'var(--color-red-soft)' : balance === 0 ? 'var(--color-bg-3)' : 'var(--color-green-soft)',
          fontSize: 11, fontWeight: 700,
          color: balance < 0 ? 'var(--color-red-text)' : balance === 0 ? 'var(--color-text-3)' : 'var(--color-green-text)',
          flexShrink: 0, maxWidth: '100%',
        }}>
          <FadeText>{`${balance > 0 ? '+' : ''}${balance} ${t('зан.')}`}</FadeText>
        </div>

        {/* Amount */}
        {student.paymentAmount ? (
          <div style={{ textAlign: 'right', flexShrink: compact ? 1 : 0, minWidth: 0, maxWidth: '100%', marginRight: compact ? 0 : 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>
              <FadeText>{`${fmt(student.paymentAmount)} ₽`}</FadeText>
            </div>
          </div>
        ) : null}

        </div>
        {/* Pay button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={e => { e.stopPropagation(); onPay(student) }}
          style={{
            padding: '6px 12px', borderRadius: 9, minHeight: 44, gridColumn: compact ? 3 : undefined, gridRow: compact ? 2 : undefined,
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
          {t('Оплачено')}
        </motion.button>

        {/* Expand toggle */}
        <button type="button" aria-label={t('История платежей') + ': ' + tn(student.name)} aria-expanded={expanded} onClick={e => { e.stopPropagation(); onToggle() }} style={{ color: 'var(--color-text-3)', flexShrink: 0, border: 0, background: 'transparent', cursor: 'pointer', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: compact ? 3 : undefined, gridRow: compact ? 1 : undefined, justifySelf: 'end' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {deleteError && <Alert tone="danger" text={deleteError} />}
      {/* Payment history */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              margin: '0 16px 12px',
              background: 'var(--color-bg-3)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              {payments.length === 0 ? (
                <div style={{ padding: '14px 14px', fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
                  {t('История платежей пуста')}
                </div>
              ) : payments.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  borderBottom: i < payments.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-2)' }}>
                    {fmtDate(p.paidAt)}
                    {p.lessonsPaid > 0 && <span style={{ color: 'var(--color-text-3)' }}> · {p.lessonsPaid} {t('зан.')}</span>}
                    {p.note && <span style={{ color: 'var(--color-text-3)' }}> · {p.note}</span>}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)' }}>
                    +{fmt(p.amount)} ₽
                  </div>
                  <button
                    aria-label={t('Удалить платёж')}
                    disabled={deletion.busy}
                    onClick={() => handleDelete(p.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-3)', padding: 2, display: 'flex',
                      minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
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
  const t = useT()
  const desktop = useIsDesktop()
  const students = useAllStudents()
  const { groups } = useGroups()
  const [filter, setFilter]       = useState<FilterTab>('all')
  const [paying, setPaying]       = useState<Student | null | undefined>(undefined)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const summary = useFinanceSummary(reloadKey)
  function handlePaid() {
    setReloadKey(k => k + 1)
    void reloadAllStudents()
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
    { id: 'all',     label: t('Все') },
    { id: 'overdue', label: t('Просрочено'), count: overdueCount },
    { id: 'soon',    label: t('На подходе'),  count: soonCount },
    { id: 'paid',    label: t('Оплачено') },
  ]

  // Lifted under the topbar so content melts into the progressive-blur strip
  // instead of hard-clipping (shared scroll-under-topbar recipe).
  return (
    <>
      <TeacherPageScroll>
      <div style={{ maxWidth: PAGE_WIDTH.form, margin: '0 auto', padding: '28px 24px 60px' }}>

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
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>{t('Финансы')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setPaying(null)}
            style={{ height: 44,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 16px', borderRadius: 12,
              background: 'var(--grad-purple)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            } as React.CSSProperties}
          >
            <Plus size={16} /> {t('Платёж')}
          </motion.button>
        </div>

        {/* KPI strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: desktop ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
          background: 'var(--color-bg-2)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 16, overflow: 'hidden',
          marginBottom: 20,
        }}>
          {[
            { label: t('Получено'),  value: fmt(summary.received),  color: 'var(--color-green-text)', icon: <CheckCircle2 size={14} /> },
            { label: t('Ожидается'), value: fmt(summary.expected),  color: 'var(--color-text)',        icon: <Clock size={14} /> },
            { label: t('Долг'),      value: fmt(summary.debt),      color: 'var(--color-red-text)',    icon: <AlertCircle size={14} /> },
            { label: t('Прогноз'),   value: fmt(summary.forecast),  color: 'var(--color-text)',        icon: <TrendingUp size={14} /> },
          ].map((item, i, arr) => (
            <div key={item.label} style={{
              minWidth: 0, padding: '14px 8px', textAlign: 'center',
              borderRight: (desktop ? i < arr.length - 1 : i % 2 === 0) ? '1px solid var(--color-border)' : 'none',
              borderBottom: !desktop && i < 2 ? '1px solid var(--color-border)' : 'none',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {item.icon} <FadeText>{item.label}</FadeText>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.color, marginTop: 4, letterSpacing: '-0.5px' }}>
                <FadeText>{`${item.value} ₽`}</FadeText>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <Segmented
          variant="filter" value={filter} onChange={setFilter} style={{ marginBottom: 14 }}
          items={tabs.map(tab => ({
            id: tab.id, title: tab.label,
            label: tab.count ? <>{tab.label} <CountBadge count={tab.count} tone={tab.id === 'overdue' ? 'danger' : 'accent'} /></> : tab.label,
          }))}
        />

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
                {filter === 'overdue' ? t('Просрочек нет') : t('Ничего не найдено')}
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
                  compact={!desktop}
                  onPay={setPaying}
                  onChanged={handlePaid}
                  expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                />
              )
            })
          )}
        </div>

      </div>

      </TeacherPageScroll>

      {/* Add payment modal */}
      <AnimatePresence>
        {paying !== undefined && (
          <AddPaymentModal
            student={paying}
            students={students}
            onClose={() => setPaying(undefined)}
            onSaved={handlePaid}
          />
        )}
      </AnimatePresence>
    </>
  )
}
