import assert from 'node:assert/strict'
import { buildTeacherReminders, pendingSubmissionTime, reminderDate, reminderDayDifference, reminderWait } from '../src/lib/reminderContent.ts'

const now = Date.parse('2026-11-01T12:00:00Z')
const t = value => value
assert.equal(reminderDate('2026-11-01'), '01.11')
assert.equal(reminderDayDifference('2026-10-31', '2026-11-01'), -1)
assert.equal(reminderDayDifference('2026-11-03', '2026-11-01'), 2)
assert.equal(reminderWait(undefined, now), undefined)
assert.equal(reminderWait('invalid', now), undefined)
assert.equal(reminderWait('2026-11-01T10:00:00Z', now), 'Ждёт 2 ч')
assert.equal(pendingSubmissionTime({ status: 'returned', updated_at: '2026-10-20T12:00:00Z' }), undefined)
assert.equal(pendingSubmissionTime({ status: 'submitted', updated_at: '2026-11-01T12:00:00Z', homework_attempts: [
  { number: 1, status: 'returned', submitted_at: '2026-10-20T12:00:00Z' },
  { number: 2, status: 'submitted', submitted_at: '2026-10-31T10:00:00Z' },
] }), '2026-10-31T10:00:00Z', 'Waiting starts with the current attempt, not a previous returned attempt or subsequent update')

const base = { id: 'hw', groupId: 'group', groupName: 'Хим ОГЭ', title: 'Растворы', assignedAt: '', dueDate: '', submittedCount: 4, totalCount: 6, reviewedCount: 1, color: '#777', status: 'active' }
const rows = buildTeacherReminders({
  homework: [
    { ...base, oldestSubmittedAt: '2026-10-29T12:00:00Z', lastSubmittedAt: '2026-11-01T11:30:00Z' },
    { ...base, id: 'done', reviewedCount: 4 },
    { ...base, id: 'unknown' },
  ],
  hard: [{ id: 'hard', studentName: 'Митя Иванов', lessonTitle: 'Экология', updatedAt: '2026-11-01T10:00:00Z', status: 'submitted' }],
  students: [
    { id: 'alice', name: 'Алиса', paymentDue: '2026-10-27', paymentAmount: 4000 },
    { id: 'today', name: 'София', paymentDue: '2026-11-01', paymentAmount: 0 },
    { id: 'future', name: 'Маша', paymentDue: '2026-11-03', paymentAmount: 6000 },
    { id: 'later', name: 'Позже', paymentDue: '2026-11-09' },
  ],
  journals: [{ scheduleId: 'lesson', scopeName: 'Био ЕГЭ', date: '2026-11-01', title: 'Экология' }],
  today: '2026-11-01', now, t,
})
const get = id => rows.find(r => r.id === id)
assert.equal(get('hw-hw').pendingCount, 3, 'Count work still awaiting review, not everybody who submitted')
assert.equal(get('hw-hw').statusLabel, 'Ждёт 3 дн.', 'Show the oldest unreviewed submission')
assert.equal(get('hw-hw').urgency, 'high')
assert.equal(get('hw-done').pendingCount, 0)
assert.equal(get('hw-done').done, true)
assert.equal(get('hw-unknown').statusLabel, undefined, 'Do not invent waiting time without a timestamp')
assert.equal(get('hw-unknown').urgency, 'medium')
assert.equal(get('hard-hard').pendingCount, 1)
assert.equal(get('hard-hard').statusLabel, 'Ждёт 2 ч')
assert.equal(get('hard-hard').urgency, 'medium')
assert.equal(get('pay-alice').statusLabel, 'Просрочено на 5 дн.')
assert.equal(get('pay-today').statusLabel, 'Оплата сегодня')
assert.match(get('pay-today').detail, /^0 ₽/)
assert.equal(get('pay-future').statusLabel, 'Через 2 дн.')
assert.equal(get('pay-later'), undefined)
assert.equal(get('journal-lesson').detail, '01.11 · Экология')
console.log('Reminder content checks passed')
