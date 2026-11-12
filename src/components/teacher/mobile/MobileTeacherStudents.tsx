import FadeText from '../../FadeText'
import { useState, useMemo, useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import EmptyState from '../../EmptyState'
import { ICON_GAP } from '../../../lib/subjects'
import { motion } from 'framer-motion'
import { Users, ChevronRight, ChevronDown, Phone, Send, Wallet, CalendarCheck, Check, X } from '../../icons/appIcons'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import Skeleton from '../../Skeleton'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { useGroups, useStudents, useAllStudents, personKey } from '../../../lib/useGroups'
import { useSwipeBack } from '../../../lib/useSwipeBack'
import { useHomework } from '../../../lib/useHomework'
import { contactLabel } from '../../../lib/contactLink'
import { useT, useTc } from '../../../lib/i18n'
import TeacherSelect from '../TeacherSelect'
import { FIELD, FIELD_LABEL_INSET } from '../../../lib/fieldStyle'
import { btn, GRAD } from '../../../lib/pillStyles'
import { Alert } from '../../Alert'
import { copyToClipboard } from '../../../lib/clipboard'
import { mySubjectNames } from '../../../lib/subjects'
import { useTeacherAccess } from '../../../lib/teacherAccess'
import { GLASS, glassMenu, useGlassBar, type GlassBar } from '../../../lib/nativeGlass'
import { PLATFORM } from '../../../lib/platform'
import { useKeyboardInset } from '../../../lib/useKeyboardInset'
import { tactile } from '../../../lib/feedback'
import { studentSubjectOptions, defaultStudentSubject, isStudentSubjectValid } from '../../../lib/studentSubject'
import type { Group, Student } from '../../../data/teacherMockData'
import { DEMO_GROUPS, DEMO_STUDENTS_BY_GROUP, demoStudentsFor } from '../../../data/teacherDevDemo'
import BackCircle from '../../../components/BackCircle'
import { AvatarPhotoFill } from '../../AvatarPhoto'
import { TaskliIcon } from '../../icons/TaskliIcon'
import { SubjectMark } from '../../icons/SubjectMark'

const IPHONE_GLASS = GLASS && PLATFORM === 'iphone'
const ACTION_ROW_RATIO = 0.8
type StatusFilter = 'debt' | 'review'

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
    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: c.bg, color: c.text, flexShrink: 0, whiteSpace: 'nowrap' }}>{signal.text}</span>
  )
}

// Unified person row — one visual language for a student everywhere (group roster
// and the individuals list). Avatar with initials (never a placeholder silhouette),
// name, subject + ДЗ + посещаемость, and the smart-mix signal on the right.
function PersonRow({ student, subject, onClick }: { student: Student; subject?: string; onClick: () => void }) {
  const t = useT()
  const { tc, tn } = useTc()
  const signal = studentSignal(student, t)
  return (
    <motion.button type="button" data-hover={IPHONE_GLASS ? undefined : 'layer'}
      whileTap={IPHONE_GLASS ? undefined : { scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 24, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left', width: '100%' }}
    >
      <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {initials(tn(student.name))}
        <AvatarPhotoFill path={student.avatarPath} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <FadeText style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{tn(student.name)}</FadeText>
        <FadeText style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>
          {subject ? tc(subject) : !student.groupId ? t('Пока без занятий') : `${t('ДЗ')} ${student.hwScore}% · ${t('посещ.')} ${student.attendance}%`}
        </FadeText>
      </div>
      {signal && <SignalChip signal={signal} />}
      <ChevronRight size={18} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
    </motion.button>
  )
}

// Aggregate shown on a group row — average homework, debtors, and how many
// submissions are waiting for review, so the teacher sees where to dive in.
type GroupAgg = { avgHw: number | null; debtCount: number; pending: number }

function GroupRow({ group, agg, onClick }: { group: Group; agg: GroupAgg; onClick: () => void }) {
  const t = useT()
  return (
    <motion.button type="button" data-hover={IPHONE_GLASS ? undefined : 'layer'}
      whileTap={IPHONE_GLASS ? undefined : { scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 24, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left', width: '100%' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${group.color} 18%, transparent)`, color: group.color, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SubjectMark subject={group.subject} fallback={group.icon} size={26} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <FadeText style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</FadeText>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>
          {group.studentCount} {t('учеников')}{agg.avgHw != null ? ` · ${t('ср. ДЗ')} ${agg.avgHw}%` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {agg.pending > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: PAIR.review.bg, color: PAIR.review.text, whiteSpace: 'nowrap' }}>{agg.pending} {t('проверить')}</span>}
        {agg.debtCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: PAIR.error.text, whiteSpace: 'nowrap' }}>{agg.debtCount} {t('долг')}</span>}
        {agg.pending === 0 && agg.debtCount === 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: PAIR.success.text, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> {t('всё сдано')}</span>
        )}
      </div>
    </motion.button>
  )
}

function SummaryTile({ value, label, tone, pressed, onClick }: {
  value: number
  label: string
  tone: 'danger' | 'warning' | 'accent'
  pressed?: boolean
  onClick?: () => void
}) {
  const c = tone === 'danger' ? { bg: PAIR.error.bg, text: PAIR.error.text }
    : tone === 'warning' ? { bg: PAIR.review.bg, text: PAIR.review.text }
    : { bg: 'var(--color-bg-4)', text: 'var(--color-accent)' }
  const style: CSSProperties = {
    flex: 1, background: c.bg, borderRadius: 12, padding: '8px 4px', textAlign: 'center',
    boxShadow: pressed ? `inset 0 0 0 2px ${c.text}` : undefined,
  }
  const content = <>
    <span style={{ display: 'block', fontSize: 18, fontWeight: 700, color: c.text }}>{value}</span>
    <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: c.text, opacity: 0.9 }}>{label}</span>
  </>
  return onClick
    ? <button type="button" aria-pressed={pressed} style={{ ...style, border: 0 }} onClick={onClick}>{content}</button>
    : <div style={style}>{content}</div>
}

function MetricRow({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
      <span style={{ color: 'var(--color-muted)', display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--color-text-2)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: danger ? 'var(--color-red-text)' : 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

export function StudentSheet({ student: initialStudent, group: initialGroup, open, loading, onClose }: { student: Student | null; group: Group; open: boolean; loading?: boolean; onClose: () => void }) {
  const t = useT()
  const { tc, tn } = useTc()
  const liveStudents = useAllStudents()
  const { groups } = useGroups()
  const student = liveStudents.find(s => s.id === initialStudent?.id) ?? initialStudent
  const group = groups.find(g => g.id === student?.groupId) ?? initialGroup
  const active = !!student && (student.hwScore > 0 || student.testScore > 0 || student.attendance > 0)
  return (
    <MobileSheet open={open} onClose={onClose} title={student ? tn(student.name) : group.name} footer={student ? <StudentAssignments student={student} /> : undefined}>
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
              <div style={{ fontSize: 20, fontWeight: 700, color: PAIR.success.text }}>{active ? `${student.hwScore}%` : '—'}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.success.text, opacity: 0.85 }}>{t('ДЗ')}</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.info.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: PAIR.info.text }}>{active ? `${student.testScore}%` : '—'}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.info.text, opacity: 0.85 }}>{t('тесты')}</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.review.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: PAIR.review.text }}>{active ? `${student.attendance}%` : '—'}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.review.text, opacity: 0.85 }}>{t('посещ.')}</div>
            </div>
          </div>
          <MetricRow icon={<SubjectMark subject={group.subject} fallback={group.icon} size={18} />} label={t('Предмет')} value={group.id ? `${tc(group.subject)} · ${group.name}` : t('Пока без занятий')} />
          {student.phone && <MetricRow icon={<Phone size={16} />} label={t('Телефон')} value={student.phone} />}
          {student.telegramLink && <MetricRow icon={<Send size={16} />} label={contactLabel(student.telegramLink) === 'VK' ? 'VK' : 'Telegram'} value={contactLabel(student.telegramLink)} />}
          <MetricRow icon={<CalendarCheck size={16} />} label={t('Последний визит')} value={student.lastVisit} />
          <MetricRow icon={<Wallet size={16} />} label={t('Долг')} value={student.debt ? `${student.debt.toLocaleString('ru-RU')} ₽` : t('нет')} danger={(student.debt ?? 0) > 0} />
        </div>
      )}
    </MobileSheet>
  )
}


function StudentAssignments({ student }: { student: Student }) {
  const t = useT()
  const { groups, addExistingStudentToGroup, addIndividualCard } = useGroups()
  const all = useAllStudents()
  const current = all.find(s => s.id === student.id) ?? student
  const memberships = all.filter(s => personKey(s) === personKey(current))
  const [mode, setMode] = useState<'group' | 'individual'>('group')
  const [groupId, setGroupId] = useState('')
  const [subject, setSubject] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function assign(individual: boolean) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = individual
        ? await addIndividualCard({ student: current, subject: subject as Group['subject'], level: '' })
        : await addExistingStudentToGroup(groupId, current)
      if (result.error) throw result.error
      setGroupId(''); setSubject('')
    } catch (e) { setError((e as { message?: string }).message || t('Не удалось назначить занятия')) }
    finally { setBusy(false) }
  }
  return <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <button data-hover="layer" style={{ ...btn('S', mode === 'group' ? 'primary' : 'secondary'), flex: 1 }} aria-pressed={mode === 'group'} onClick={() => setMode('group')}>{t('В группу')}</button>
      <button data-hover="layer" style={{ ...btn('S', mode === 'individual' ? 'primary' : 'secondary'), flex: 1 }} aria-pressed={mode === 'individual'} onClick={() => setMode('individual')}>{t('Занятия 1:1')}</button>
    </div>
    {mode === 'group'
      ? <TeacherSelect value={groupId} onChange={setGroupId} placeholder={t('Выберите группу')} triggerStyle={{ minHeight: 48 }} options={groups.filter(g => !g.isIndividual && !memberships.some(s => s.groupId === g.id)).map(g => ({value:g.id,label:g.name}))} />
      : <TeacherSelect value={subject} onChange={setSubject} placeholder={t('Предмет для занятий 1:1')} triggerStyle={{ minHeight: 48 }} options={mySubjectNames(useTeacherAccess.getState().subjects).map(s => ({value:s,label:t(s)}))} />}
    <button data-hover="layer" style={{ ...btn('M', 'primary'), width: '100%', minHeight: 48 }} disabled={busy || !(mode === 'group' ? groupId : subject)} onClick={() => void assign(mode === 'individual')}>{busy ? t('Сохранение...') : mode === 'group' ? t('Добавить в группу') : t('Назначить занятия 1:1')}</button>
    {error && <Alert tone="danger" text={error} />}
  </section>
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
        <BackCircle onClick={onBack} label="Все группы" />
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}><SubjectMark subject={group.subject} fallback={group.icon} size={24} />{ICON_GAP}{group.name}</div>
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
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '6px 16px 2px' }}>{children}</div>
  )
}

// Плавающая подпись поля: в покое стоит внутри поля как плейсхолдер, при
// значении/фокусе уезжает наверх и уменьшается — подпись не исчезает при наборе
// (правило «подпись внутри поля», a11y). Высота поля = 48 (как у кнопок).
const FLOAT_FIELD: CSSProperties = { ...FIELD, minHeight: 48, boxSizing: 'border-box' }
function FloatingField({ label, required, floated, children }: { label: string; required?: boolean; floated: boolean; children: ReactNode }) {
  const t = useT()
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <span aria-hidden style={{
        position: 'absolute', left: FIELD_LABEL_INSET, pointerEvents: 'none',
        top: floated ? 7 : '50%', transform: floated ? 'none' : 'translateY(-50%)',
        fontSize: floated ? 11 : 13, lineHeight: 1, color: 'var(--color-muted)',
        transition: 'top .14s ease, font-size .14s ease',
      }}>{t(label)}{required && <span style={{ color: 'var(--color-red-text)' }}> *</span>}</span>
    </div>
  )
}

// Поле «Предмет» новой карточки ученика (вариант Б, studentSubject.ts).
// На iOS-приложении — системное меню (nativeGlass), в вебе и на Android —
// TeacherSelect. Значение — название предмета из реестра. Плейсхолдер пустой:
// подпись рисует FloatingField снаружи. При выборе значение прижато к низу,
// чтобы не наехать на уехавшую вверх подпись.
function SubjectPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT()
  const subjects = useTeacherAccess(s => s.subjects)
  const options = studentSubjectOptions(mySubjectNames(subjects), value)
  const floated = !!value
  if (GLASS) {
    const index = options.indexOf(value)
    return (
      <button type="button" data-hover="layer" aria-label={t('Предмет')}
        style={{ ...FLOAT_FIELD, display: 'flex', alignItems: floated ? 'flex-end' : 'center', justifyContent: 'space-between', gap: 8, paddingTop: floated ? 20 : 9, paddingBottom: floated ? 6 : 9, color: 'var(--color-text)' }}
        onClick={async e => {
          const sel = await glassMenu(e.currentTarget, options.map((label, i) => ({ label: t(label), checked: i === index })), t('Предмет'))
          if (sel >= 0) onChange(options[sel])
        }}>
        <FadeText style={{ flex: 1, textAlign: 'left' }}>{value ? t(value) : ''}</FadeText>
        <ChevronDown size={16} style={{ flexShrink: 0 }} />
      </button>
    )
  }
  return (
    <TeacherSelect value={value} onChange={onChange} clearable={false} placeholder=""
      triggerStyle={{ minHeight: 48, ...(floated ? { alignItems: 'flex-end', paddingTop: 20, paddingBottom: 6 } : {}) }}
      options={options.map(s => ({ value: s, label: t(s) }))} />
  )
}

export default function MobileTeacherStudents() {
  const t = useT()
  const { groups: realGroups, addUnassignedStudent } = useGroups()
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const toggleStatus = (status: StatusFilter) => setStatusFilter(current => current === status ? null : status)
  // Нативный стеклянный бар экрана — только в приложении на iPhone. iPad
  // (капсула TeacherIpadRail) и веб/Android остаются на веб-доке и инлайн-поиске.
  const nativeBar = IPHONE_GLASS
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const kbInset = useKeyboardInset()
  useEffect(() => { if (searchOpen) searchRef.current?.focus({ preventScroll: true }) }, [searchOpen])

  const openStudent = (student: Student) => {
    const group = groups.find(g => g.id === student.groupId) ?? { id: '', name: t('Пока без занятий'), subject: '' as Group['subject'], icon: '', level: '', color: '#9B6DFF', colorSoft: '#EFE0FF', startDate: '', studentCount: 0, totalLessons: 0, lessonsCompleted: 0 }
    if (group) { setSel({ student, group }); setSheetOpen(true) }
  }

  // Per-group aggregates (avg homework, debtors, pending review) + top-line totals.
  const { aggFor, totals, pendingByGroup } = useMemo(() => {
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
      students: new Set(allStudents.map(personKey)).size,
    }
    return { aggFor, totals, pendingByGroup }
  }, [allStudents, homework])

  const needle = search.trim().toLocaleLowerCase()
  const groupList = groups.filter(g => {
    if (g.isIndividual || (needle && !g.name.toLocaleLowerCase().includes(needle))) return false
    if (statusFilter === 'debt') return aggFor(g).debtCount > 0
    if (statusFilter === 'review') return (pendingByGroup.get(g.id) ?? 0) > 0
    return true
  })
  const individuals = allStudents.filter(s => {
    if (!s.isIndividual || (needle && !s.name.toLocaleLowerCase().includes(needle))) return false
    if (statusFilter === 'debt') return (s.debt ?? 0) > 0
    if (statusFilter === 'review') return (pendingByGroup.get(s.groupId) ?? 0) > 0
    return true
  })
  const showGroups = filter === 'all' || filter === 'groups'
  const showIndividuals = filter === 'all' || filter === 'individual'

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [createError, setCreateError] = useState('')
  const [invite, setInvite] = useState('')
  const [copiedInvite, setCopiedInvite] = useState(false)
  const teacherSubjects = useTeacherAccess(s => s.subjects)
  const [newSubject, setNewSubject] = useState('')
  const [nameFocused, setNameFocused] = useState(false)
  // Один предмет у учителя — подставляем сразу (предметы догружаются асинхронно).
  useEffect(() => { if (addOpen && !newSubject) { const d = defaultStudentSubject(mySubjectNames(teacherSubjects)); if (d) setNewSubject(d) } }, [addOpen, newSubject, teacherSubjects])
  async function createStudent() {
    if (!newName.trim() || !isStudentSubjectValid(newSubject) || savingNew) return
    setSavingNew(true); setCreateError('')
    try {
      const result = await addUnassignedStudent({ name: newName.trim(), subject: newSubject })
      if (result.error) throw result.error
      setNewName('')
      setInvite(result.inviteToken ? `${location.origin}${location.pathname}#/join?token=${result.inviteToken}` : '')
      if (!result.inviteToken) setAddOpen(false)
    } catch (e) { setCreateError((e as { message?: string }).message || t('Не удалось добавить ученика')) }
    finally { setSavingNew(false) }
  }

  const openAdd = () => {
    setInvite(''); setCreateError(''); setCopiedInvite(false); setNewName('')
    setNewSubject(defaultStudentSubject(mySubjectNames(teacherSubjects))); setAddOpen(true)
  }

  // Системный бар экрана (useGlassBar): таблетка-фильтр сверху + ряд над
  // вкладками (поиск · «Добавить»). Прячется в под-экранах (ростер группы,
  // карточка, лист добавления). На вебе/Android/iPad ничего не рисует — там
  // работают инлайн-поиск, чипы и веб-док ниже.
  const barActive = nativeBar && !openGroup && !addOpen && !sheetOpen
  const studentsBar: GlassBar = {
    top: {
      id: 'filter', kind: 'pill', title: t(FILTERS.find(f => f.key === filter)?.label ?? 'Все'), menuTitle: t('Показать'),
      menu: FILTERS.map(f => ({ value: f.key, title: t(f.label), checked: f.key === filter })),
    },
    bottomTabBarWidthRatio: ACTION_ROW_RATIO,
    bottom: [
      { id: 'search', kind: 'circle', symbol: 'magnifyingglass', label: t('Поиск'), active: !!search },
      { id: 'add', kind: 'pill', title: t('Добавить') },
    ],
  }
  useGlassBar(barActive ? studentsBar : null, {
    onTap: id => {
      tactile()
      if (id === 'search') setSearchOpen(true)
      if (id === 'add') openAdd()
    },
    onMenu: (id, value) => { if (id === 'filter') setFilter(value as StudentsFilter) },
  }, searchOpen)

  // false сохраняет верхний отступ MobileScreen для нативного меню.
  const topZone = nativeBar && !openGroup ? false : (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GlassPill><Users size={16} /> {t('Ученики')}</GlassPill>
    </div>
  )

  return (
    <>
    {/* Поиск в нативном режиме — веб-поле на месте нижнего стеклянного ряда
        (он прячется), над вкладками; с клавиатурой поднимается вместе с ней. */}
    {nativeBar && searchOpen && (
      <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: `calc((100% - 40px) * ${ACTION_ROW_RATIO})`, boxSizing: 'border-box', bottom: kbInset > 0 ? kbInset + 12 : 'calc(env(safe-area-inset-bottom, 0px) + 58px)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 8px 0 16px', borderRadius: 24, background: 'rgba(var(--glass-rgb), var(--glass-fill))', backdropFilter: 'var(--blur-solid)', WebkitBackdropFilter: 'var(--blur-solid)', boxShadow: 'var(--shadow-pill)', border: '1px solid var(--color-border-glass)' }}>
        <TaskliIcon name="search" size={20} />
        <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Поиск учеников и групп')} aria-label={t('Поиск учеников и групп')} enterKeyHint="search"
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--color-text)' }} />
        <button onClick={() => { tactile(); setSearch(''); setSearchOpen(false) }} aria-label={t('Закрыть поиск')}
          style={{ width: 36, height: 36, borderRadius: 18, border: 0, background: 'transparent', display: 'grid', placeItems: 'center', color: 'var(--color-text-3)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
    )}
    <MobileScreen nativeDocumentScroll={nativeBar && !openGroup && !searchOpen} topZone={topZone} glassHeader={nativeBar && !openGroup ? undefined : { leading: t('Ученики'), leadingSymbol: 'person.2' }} topPad={64} scrollKey={openGroup ? `g-${openGroup.id}` : 't-groups'}
      bottomDockRaise={80}
      bottomDock={!nativeBar && !openGroup && !addOpen && !sheetOpen ? (
        <button data-hover="layer" style={{ ...btn('M', 'primary'), width: '100%', minHeight: 48 }}
          onClick={openAdd}>
          {t('Добавить ученика')}
        </button>
      ) : undefined}>

      {openGroup ? (
        <GroupRoster group={openGroup} onBack={() => setOpenGroup(null)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <MobileSheet open={addOpen} onClose={() => setAddOpen(false)} title={invite ? t('Ученик добавлен') : t('Новый ученик')} footer={<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {invite ? <>
                <button data-hover="layer" style={btn('M', 'primary', { background: copiedInvite ? GRAD.green : GRAD.purple, transition: 'background 0.22s' })} onClick={async () => setCopiedInvite(await copyToClipboard(invite))}>{copiedInvite && <Check size={16} strokeWidth={2.5} aria-hidden style={{ flexShrink: 0 }} />}<span style={{ position: 'relative', top: '-0.04em' }}>{copiedInvite ? t('Скопировано') : t('Скопировать приглашение')}</span></button>
                <button data-hover="layer" style={btn('M', 'secondary')} onClick={() => setAddOpen(false)}>{t('Готово')}</button>
              </> : <>
                <button data-hover="layer" style={btn('M', 'primary')} disabled={!newName.trim() || !isStudentSubjectValid(newSubject) || savingNew} onClick={createStudent}>{savingNew ? t('Сохранение...') : t('Добавить ученика')}</button>
              </>}
            </div>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {invite ? <>
                <p>{t('Отправьте ссылку ученику, чтобы он создал свой аккаунт.')}</p>

              </> : <>
                <FloatingField label="Имя ученика" floated={nameFocused || !!newName}>
                  <input aria-label={t('Имя ученика')} value={newName} onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void createStudent() }} style={{ ...FLOAT_FIELD, paddingTop: 20, paddingBottom: 4 }} />
                </FloatingField>
                <FloatingField label="Предмет" required floated={!!newSubject}>
                  <SubjectPicker value={newSubject} onChange={setNewSubject} />
                </FloatingField>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: 13 }}>{t('Предмет нужен, чтобы ученик сразу увидел свои курсы и виджеты. Группу и расписание можно назначить позже.')}</p>
                {createError && <Alert tone="danger" text={createError} />}

              </>}
            </div>
          </MobileSheet>
          {/* Инлайн-поиск и чипы — только вне нативного режима. В приложении на
              iPhone их заменяет системный бар (поиск-круг + таблетка-фильтр). */}
          {!nativeBar && <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', minHeight: 42, borderRadius: 13, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', color: 'var(--color-muted)' }}>
            <TaskliIcon name="search" size={18} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Поиск учеников и групп')} aria-label={t('Поиск учеников и групп')} style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--color-text)', fontSize: 14 }} />
          </label>
          <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button data-hover="layer"
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="cursor-pointer"
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 14, fontWeight: 600,
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
          </>}

          {(nativeBar || filter === 'all') && allStudents.length > 0 && (
            <div style={{ display: 'flex', gap: 8, margin: '4px 0 2px' }}>
              <SummaryTile value={totals.debtors} label={t('долги')} tone="danger" pressed={statusFilter === 'debt'} onClick={nativeBar ? () => toggleStatus('debt') : undefined} />
              <SummaryTile value={totals.pending} label={t('проверить')} tone="warning" pressed={statusFilter === 'review'} onClick={nativeBar ? () => toggleStatus('review') : undefined} />
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
              {filter === 'all' && <SectionLabel>{t('Все ученики')}</SectionLabel>}
              {individuals.map(s => (
                <PersonRow key={s.id} student={s} subject={s.subject} onClick={() => openStudent(s)} />
              ))}
            </>
          )}

          {!(showGroups && groupList.length > 0) && !(showIndividuals && individuals.length > 0) && (
            <EmptyState
              icon={Users}
              title={statusFilter ? t('Ничего не найдено') : filter === 'all' ? t('Учеников пока нет') : groups.length === 0 ? t('Групп пока нет') : filter === 'individual' ? t('Нет индивидуальных учеников') : t('Нет групп')}
              text={!statusFilter && filter === 'all' ? t('Добавьте первого — достаточно имени.') : undefined}
              style={{ marginTop: 8 }}
            />
          )}

          {sel && <StudentSheet student={sel.student} group={sel.group} open={sheetOpen} onClose={() => setSheetOpen(false)} />}
        </div>
      )}
    </MobileScreen>
    </>
  )
}
