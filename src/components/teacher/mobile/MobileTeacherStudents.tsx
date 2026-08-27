import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, ChevronRight, ArrowLeft, Phone, Send, Wallet, CalendarCheck, Check } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import Skeleton from '../../Skeleton'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { useGroups, useStudents, useAllStudents } from '../../../lib/useGroups'
import { useSwipeBack } from '../../../lib/useSwipeBack'
import { useHomework } from '../../../lib/useHomework'
import { contactLabel } from '../../../lib/contactLink'
import { useT } from '../../../lib/i18n'
import type { Group, Student } from '../../../data/teacherMockData'
import { DEMO_GROUPS, DEMO_STUDENTS_BY_GROUP, demoStudentsFor } from '../../../data/teacherDevDemo'

// MOBILE ONLY students browser: groups list → tap → roster → tap student →
// detail sheet (contacts, attendance, scores, debt). Read-focused; editing the
// roster stays on desktop.

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '—'
}

// ── "smart mix" right-side signal for a person row: money → academics → nothing.
// Debt outranks weak homework outranks poor attendance; a healthy student shows
// no chip (quiet by default — only what needs action draws the eye).
type Signal = { text: string; kind: 'danger' | 'warning' }
function studentSignal(s: Student, t: (k: string) => string): Signal | null {
  if ((s.debt ?? 0) > 0) return { kind: 'danger', text: `${t('долг')} ${(s.debt ?? 0).toLocaleString('ru-RU')}` }
  if ((s.hwScore ?? 100) > 0 && (s.hwScore ?? 100) < 50) return { kind: 'warning', text: `${t('ДЗ')} ${s.hwScore}%` }
  if ((s.attendance ?? 100) > 0 && (s.attendance ?? 100) < 70) return { kind: 'warning', text: t('пропуски') }
  return null
}

function SignalChip({ signal }: { signal: Signal }) {
  const c = signal.kind === 'danger' ? PAIR.error : PAIR.review
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: c.bg, color: c.text, flexShrink: 0, whiteSpace: 'nowrap' }}>{signal.text}</span>
  )
}

// Unified person row — one visual language for a student everywhere (group roster
// and the individuals list). Avatar with initials (never a placeholder silhouette),
// name, subject + ДЗ + посещаемость, and the smart-mix signal on the right.
function PersonRow({ student, subject, onClick }: { student: Student; subject?: string; onClick: () => void }) {
  const t = useT()
  const signal = studentSignal(student, t)
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left', width: '100%' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(student.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subject ? `${subject} · ` : ''}{t('ДЗ')} {student.hwScore}% · {t('посещ.')} {student.attendance}%
        </div>
      </div>
      {signal && <SignalChip signal={signal} />}
      <ChevronRight size={17} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
    </motion.button>
  )
}

// Aggregate shown on a group row — average homework, debtors, and how many
// submissions are waiting for review, so the teacher sees where to dive in.
type GroupAgg = { avgHw: number | null; debtCount: number; pending: number }

function GroupRow({ group, agg, onClick }: { group: Group; agg: GroupAgg; onClick: () => void }) {
  const t = useT()
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left', width: '100%' }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: group.colorSoft, color: group.color, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{group.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>
          {group.studentCount} {t('учеников')}{agg.avgHw != null ? ` · ${t('ср. ДЗ')} ${agg.avgHw}%` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        {agg.pending > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: PAIR.review.bg, color: PAIR.review.text, whiteSpace: 'nowrap' }}>{agg.pending} {t('проверить')}</span>}
        {agg.debtCount > 0 && <span style={{ fontSize: 10.5, fontWeight: 600, color: PAIR.error.text, whiteSpace: 'nowrap' }}>{agg.debtCount} {t('долг')}</span>}
        {agg.pending === 0 && agg.debtCount === 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: PAIR.success.text, display: 'flex', alignItems: 'center', gap: 3 }}><Check size={12} /> {t('всё сдано')}</span>
        )}
      </div>
    </motion.button>
  )
}

// Small tappable summary tile for the "Все" header (debtors / to-review / total).
function SummaryTile({ value, label, tone }: { value: number; label: string; tone: 'danger' | 'warning' | 'accent' }) {
  const c = tone === 'danger' ? { bg: PAIR.error.bg, text: PAIR.error.text }
    : tone === 'warning' ? { bg: PAIR.review.bg, text: PAIR.review.text }
    : { bg: 'var(--color-bg-4)', text: 'var(--color-accent)' }
  return (
    <div style={{ flex: 1, background: c.bg, borderRadius: 12, padding: '8px 4px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 750, color: c.text }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: c.text, opacity: 0.9 }}>{label}</div>
    </div>
  )
}

function MetricRow({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
      <span style={{ color: 'var(--color-muted)', display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text-2)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 650, color: danger ? 'var(--color-red-text)' : 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

export function StudentSheet({ student, group, open, loading, onClose }: { student: Student | null; group: Group; open: boolean; loading?: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <MobileSheet open={open} onClose={onClose} title={student?.name ?? group.name}>
      {!student && (
        loading ? (
          <div style={{ padding: '20px 0' }} aria-busy="true"><Skeleton.List rows={3} /></div>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-muted)', padding: '28px 0', textAlign: 'center' }}>
            {t('Нет данных об ученике')}
          </div>
        )
      )}
      {student && (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, padding: '4px 0 14px' }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.success.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 750, color: PAIR.success.text }}>{student.hwScore}%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.success.text, opacity: 0.85 }}>{t('ДЗ')}</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.info.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 750, color: PAIR.info.text }}>{student.testScore}%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.info.text, opacity: 0.85 }}>{t('тесты')}</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.review.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 750, color: PAIR.review.text }}>{student.attendance}%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.review.text, opacity: 0.85 }}>{t('посещ.')}</div>
            </div>
          </div>
          <MetricRow icon={<span style={{ fontSize: 15 }}>{group.icon}</span>} label={t('Предмет')} value={`${group.subject} · ${group.name}`} />
          {student.phone && <MetricRow icon={<Phone size={16} />} label={t('Телефон')} value={student.phone} />}
          {student.telegramLink && <MetricRow icon={<Send size={16} />} label={contactLabel(student.telegramLink) === 'VK' ? 'VK' : 'Telegram'} value={contactLabel(student.telegramLink)} />}
          <MetricRow icon={<CalendarCheck size={16} />} label={t('Последний визит')} value={student.lastVisit} />
          <MetricRow icon={<Wallet size={16} />} label={t('Долг')} value={student.debt ? `${student.debt.toLocaleString('ru-RU')} ₽` : t('нет')} danger={(student.debt ?? 0) > 0} />
        </div>
      )}
    </MobileSheet>
  )
}

function GroupRoster({ group, onBack }: { group: Group; onBack: () => void }) {
  const t = useT()
  // Свайп от левого края = «Все группы».
  useSwipeBack(onBack)
  const { students: realStudents } = useStudents(group.id)
  // DEV-only: for a demo group (no real roster in the DB) fall back to demo students.
  const students = import.meta.env.DEV && realStudents.length === 0
    ? demoStudentsFor(group.id)
    : realStudents
  const [selected, setSelected] = useState<Student | null>(null)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={onBack} className="cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--color-muted)', padding: '2px 0' }}>
          <ArrowLeft size={17} /> {t('Все группы')}
        </button>
        <div style={{ fontSize: 20, fontWeight: 750, color: 'var(--color-text)' }}>{group.icon} {group.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => (
            <PersonRow key={s.id} student={s} onClick={() => setSelected(s)} />
          ))}
          {students.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '20px 0', textAlign: 'center' }}>{t('В группе пока нет учеников')}</div>
          )}
        </div>
      </div>
      <StudentSheet student={selected} group={group} open={!!selected} onClose={() => setSelected(null)} />
    </>
  )
}

type StudentsFilter = 'all' | 'groups' | 'individual'

const FILTERS: { key: StudentsFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'groups', label: 'Группы' },
  { key: 'individual', label: '1:1' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', margin: '6px 2px 2px' }}>{children}</div>
  )
}

export default function MobileTeacherStudents() {
  const t = useT()
  const { groups: realGroups } = useGroups()
  const realStudents = useAllStudents()
  const { homework } = useHomework()
  // DEV-only: no logged-in teacher locally → show demo content instead of empty.
  const dev = import.meta.env.DEV
  const groups = dev && realGroups.length === 0 ? DEMO_GROUPS : realGroups
  const allStudents = dev && realStudents.length === 0
    ? (Object.values(DEMO_STUDENTS_BY_GROUP).flat() as Student[])
    : realStudents

  const [openGroup, setOpenGroup] = useState<Group | null>(null)
  const [sel, setSel] = useState<{ student: Student; group: Group } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [filter, setFilter] = useState<StudentsFilter>('all')

  const openStudent = (student: Student) => {
    const group = groups.find(g => g.id === student.groupId)
    if (group) { setSel({ student, group }); setSheetOpen(true) }
  }

  // Per-group aggregates (avg homework, debtors, pending review) + top-line totals.
  const { aggFor, totals } = useMemo(() => {
    const pendingByGroup = new Map<string, number>()
    for (const h of homework) {
      if (h.status === 'closed') continue
      const p = Math.max(0, (h.submittedCount ?? 0) - (h.reviewedCount ?? 0))
      if (p > 0) pendingByGroup.set(h.groupId, (pendingByGroup.get(h.groupId) ?? 0) + p)
    }
    const aggFor = (g: Group): GroupAgg => {
      const list = allStudents.filter(s => s.groupId === g.id)
      const avgHw = list.length ? Math.round(list.reduce((n, s) => n + (s.hwScore ?? 0), 0) / list.length) : null
      return { avgHw, debtCount: list.filter(s => (s.debt ?? 0) > 0).length, pending: pendingByGroup.get(g.id) ?? 0 }
    }
    const totals = {
      debtors: allStudents.filter(s => (s.debt ?? 0) > 0).length,
      pending: [...pendingByGroup.values()].reduce((a, b) => a + b, 0),
      students: allStudents.length,
    }
    return { aggFor, totals }
  }, [groups, allStudents, homework])

  const groupList = groups.filter(g => !g.isIndividual)
  const individuals = allStudents.filter(s => s.isIndividual)
  const showGroups = filter === 'all' || filter === 'groups'
  const showIndividuals = filter === 'all' || filter === 'individual'

  const topZone = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GlassPill><Users size={15} /> {t('Ученики')}</GlassPill>
    </div>
  )

  return (
    <MobileScreen topZone={topZone} topPad={64} scrollKey={openGroup ? `g-${openGroup.id}` : 't-groups'}>
      {openGroup ? (
        <GroupRoster group={openGroup} onBack={() => setOpenGroup(null)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="cursor-pointer"
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13.5, fontWeight: 650,
                    color: active ? '#fff' : 'var(--color-muted)',
                    background: active ? 'var(--color-avatar-bg)' : 'transparent',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {t(f.label)}
                </button>
              )
            })}
          </div>

          {filter === 'all' && allStudents.length > 0 && (
            <div style={{ display: 'flex', gap: 8, margin: '4px 0 2px' }}>
              <SummaryTile value={totals.debtors} label={t('долги')} tone="danger" />
              <SummaryTile value={totals.pending} label={t('проверить')} tone="warning" />
              <SummaryTile value={totals.students} label={t('учеников')} tone="accent" />
            </div>
          )}

          {showGroups && groupList.length > 0 && (
            <>
              {filter === 'all' && <SectionLabel>{t('Группы')}</SectionLabel>}
              {groupList.map(g => (
                <GroupRow key={g.id} group={g} agg={aggFor(g)} onClick={() => setOpenGroup(g)} />
              ))}
            </>
          )}

          {showIndividuals && individuals.length > 0 && (
            <>
              {filter === 'all' && <SectionLabel>{t('Индивидуальные')}</SectionLabel>}
              {individuals.map(s => (
                <PersonRow key={s.id} student={s} subject={s.subject} onClick={() => openStudent(s)} />
              ))}
            </>
          )}

          {((showGroups && groupList.length === 0 && !showIndividuals) ||
            (showIndividuals && individuals.length === 0 && !showGroups) ||
            (groupList.length === 0 && individuals.length === 0)) && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>
              {groups.length === 0 ? t('Групп пока нет. Создайте их на компьютере.') : filter === 'individual' ? t('Нет индивидуальных учеников') : t('Нет групп')}
            </div>
          )}

          {sel && <StudentSheet student={sel.student} group={sel.group} open={sheetOpen} onClose={() => setSheetOpen(false)} />}
        </div>
      )}
    </MobileScreen>
  )
}
