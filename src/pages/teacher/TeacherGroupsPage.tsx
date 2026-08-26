import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, ChevronUp, ChevronDown, X, Trash2,
  Phone, Send, User, UserPlus,
  TrendingUp, ClipboardCheck, Clock, Award,
  ChevronsUpDown, ExternalLink, Copy, Check,
  BarChart2, Target, BookOpen, XCircle, CheckCircle2, Layers,
  Search, Plus,
} from 'lucide-react'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { SUBJECT_ICON_MAP } from '../../lib/subjects'
import { levelOptionsForSubject } from '../../lib/courseLevels'
import NewStudentConfig from '../../components/teacher/NewStudentConfig'
import GroupStrip, { type TabConfig } from '../../components/teacher/GroupStrip'
import {
  type Group, type GroupTrack, type Student,
} from '../../data/teacherMockData'
import { useGroups, useStudents, useAllStudents, listTeacherCourses, bindGroupToCourse, personKey, type GroupCourseOption } from '../../lib/useGroups'
import { ensureCardFillTask } from '../../lib/cardFillTask'
import { PickStudentModal, PickGroupModal, AddExistingIndividualModal, type PersonLike } from '../../components/teacher/AddToGroupModals'
import { supabase } from '../../lib/supabase'
import { usePersistentState, clearDrafts } from '../../lib/useDraft'
import { copyToClipboard } from '../../lib/clipboard'
import { OverlayScrollArea } from '../../components/teacher/OverlayScroll'
import { normalizeContact, contactHref, contactLabel } from '../../lib/contactLink'
import { useTeacher } from '../../store/teacherStore'
import { useT } from '../../lib/i18n'
import { confirmDialog } from '../../components/ConfirmHost'
import {
  fetchStudentActiveCourses, type StudentCourseInfo,
  fetchStudentTrainerSections, type TrainerSection,
  fetchStudentWrongTasks, type WrongTask,
  fetchStudentSessionDays,
} from '../../lib/db'

// ─── Цвета для выбора группы ─────────────────────────────────────────────────
const GROUP_COLORS = [
  { color: 'var(--color-purple)', soft: '#EFE0FF' },
  { color: '#3F8F6B', soft: '#D6EDE2' },
  { color: '#FF8F6D', soft: '#FFE8DF' },
  { color: '#6D9BFF', soft: '#DCE8FF' },
  { color: '#FFB96D', soft: '#FFF1DC' },
  { color: '#FF6D9B', soft: '#FFE0EC' },
]

// ─── Модалка создания группы ──────────────────────────────────────────────────
function AddGroupModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (g: Omit<Group, 'id' | 'studentCount' | 'lessonsCompleted'>, courseId: string | null) => Promise<void>
}) {
  const t = useT()
  // Draft-backed: survives a page reload; cleared on save or explicit close.
  const [name, setName] = usePersistentState('groups.addGroup.name', '')
  const [subject, setSubject] = usePersistentState('groups.addGroup.subject', '')
  const [icon, setIcon] = usePersistentState('groups.addGroup.icon', '📚')
  const [level, setLevel] = usePersistentState('groups.addGroup.level', '')
  const [colorIdx, setColorIdx] = usePersistentState('groups.addGroup.colorIdx', 0)
  const [totalLessons, setTotalLessons] = usePersistentState('groups.addGroup.totalLessons', 48)
  const [courseId, setCourseId] = usePersistentState<string>('groups.addGroup.courseId', '')
  const [courses, setCourses] = useState<GroupCourseOption[]>([])
  const [saving, setSaving] = useState(false)

  // Load the teacher's courses so "Всего уроков" can come from a course instead
  // of being guessed by hand. A group can still be created without a course and
  // attached later.
  useEffect(() => { listTeacherCourses().then(setCourses).catch(() => setCourses([])) }, [])

  const selectedCourse = courses.find(c => c.id === courseId) ?? null
  // When a course is chosen, the lesson count is derived from it (read-only).
  const effectiveTotal = selectedCourse ? selectedCourse.lessonCount : totalLessons

  const subjectIcons = SUBJECT_ICON_MAP

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const c = GROUP_COLORS[colorIdx]
    await onSave({
      name: name.trim(),
      subject: subject as Group['subject'],
      icon,
      level,
      color: c.color,
      colorSoft: c.soft,
      startDate: new Date().toLocaleDateString('ru-RU'),
      totalLessons: effectiveTotal,
    }, selectedCourse ? selectedCourse.id : null)
    clearDrafts('groups.addGroup.')
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-input)', borderRadius: 24, padding: 28,
          width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t('Новая группа')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('Название')} style={inputStyle} />

          <TeacherSelect
            value={subject}
            onChange={v => {
              setSubject(v)
              setIcon(subjectIcons[v] ?? '📚')
              // Шкала уровней у нового предмета своя: «ЕГЭ» на корейском или «B1»
              // на химии остались бы висеть мусором — чистим несовместимое.
              if (level && !levelOptionsForSubject(v).includes(level)) setLevel('')
            }}
            placeholder={t('Предмет')}
            options={Object.keys(subjectIcons).map(o => ({ value: o, label: t(o) }))}
            triggerStyle={selectTriggerStyle}
          />

          <TeacherSelect
            value={level}
            onChange={setLevel}
            placeholder={t('Уровень')}
            options={levelOptionsForSubject(subject).map(o => ({ value: o, label: t(o) }))}
            triggerStyle={selectTriggerStyle}
          />

          {/* Optional course. When set, "Всего уроков" comes from the course (no
              guessing). Without a course the group is created unbound — attach one
              later from the course editor. */}
          <TeacherSelect
            value={selectedCourse ? selectedCourse.title : 'Без курса'}
            onChange={title => {
              const c = courses.find(x => x.title === title)
              setCourseId(c ? c.id : '')
            }}
            placeholder={t('Курс (необязательно)')}
            options={[{ value: 'Без курса', label: t('Без курса') }, ...courses.map(c => c.title)]}
            triggerStyle={selectTriggerStyle}
          />

          {selectedCourse ? (
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-2)', background: 'var(--color-bg-3)' }}>
              <span>{t('Всего уроков')}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                {selectedCourse.lessonCount} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--color-text-3)' }}>{t('из курса')}</span>
              </span>
            </div>
          ) : (
            <input
              type="number"
              value={totalLessons === 0 ? '' : totalLessons}
              onChange={e => setTotalLessons(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder={t('Всего уроков')}
              min={1}
              style={inputStyle}
            />
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>{t('Цвет')}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {GROUP_COLORS.map((c, i) => (
                <div key={i} onClick={() => setColorIdx(i)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c.color,
                  cursor: 'pointer', outline: colorIdx === i ? `3px solid ${c.color}` : 'none',
                  outlineOffset: 2,
                }} />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{
            marginTop: 22, width: '100%', padding: '12px 0',
            background: 'var(--grad-purple)', opacity: name.trim() ? 1 : 0.45,
            color: '#fff', fontWeight: 700, fontSize: 15,
            border: 'none', borderRadius: 14, cursor: name.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? t('Сохранение...') : t('Создать группу')}
        </button>
      </motion.div>
    </div>
  )
}

// ─── Модалка добавления ученика ───────────────────────────────────────────────
function AddStudentTypePicker({ groups, hasPeople, onPickGroup, onPickIndividual, onPickExisting, onClose }: {
  groups: Group[]
  hasPeople: boolean
  onPickGroup: () => void
  onPickIndividual: () => void
  onPickExisting: () => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-input)', borderRadius: 24, padding: 28,
          width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t('Добавить ученика')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={groups.length > 0 ? onPickGroup : undefined}
            disabled={groups.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              background: 'var(--color-bg-4)', border: '1.5px solid var(--color-border-medium)',
              borderRadius: 16, cursor: groups.length > 0 ? 'pointer' : 'not-allowed',
              opacity: groups.length === 0 ? 0.45 : 1, textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={18} color="var(--color-accent)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('В группу')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                {groups.length === 0 ? t('Сначала создайте группу') : `${groups.length} ${groups.length === 1 ? t('группа') : t('групп')}`}
              </div>
            </div>
          </button>
          <button
            onClick={onPickIndividual}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              background: 'var(--color-bg-4)', border: '1.5px solid var(--color-border-medium)',
              borderRadius: 16, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} color="var(--color-green-text)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('1:1 занятие')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{t('Индивидуальный ученик')}</div>
            </div>
          </button>
          {hasPeople && (
            <button
              onClick={onPickExisting}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                background: 'var(--color-bg-4)', border: '1.5px solid var(--color-border-medium)',
                borderRadius: 16, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserPlus size={18} color="var(--color-accent)" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Существующий человек → 1:1')}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{t('Второй предмет без новой карточки')}</div>
              </div>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function AddStudentModal({ onClose, onSave, groups, initialGroupId }: {
  onClose: () => void
  onSave: (groupId: string, s: { name: string; phone: string; telegramLink: string; parentContact: string; desiredScore: number; paymentAmount: number }) => Promise<{ inviteToken: string | null; studentId: string | null }>
  groups: Group[]
  initialGroupId: string | null
}) {
  const t = useT()
  // Draft-backed: survives a page reload; cleared on save or explicit close.
  const [selectedGroup, setSelectedGroup] = usePersistentState<string>('groups.addStudent.group', initialGroupId ?? groups[0]?.id ?? '')
  const [name, setName] = usePersistentState('groups.addStudent.name', '')
  const [phone, setPhone] = usePersistentState('groups.addStudent.phone', '')
  const [telegram, setTelegram] = usePersistentState('groups.addStudent.telegram', '')
  const [parent, setParent] = usePersistentState('groups.addStudent.parent', '')
  const [desiredScore, setDesiredScore] = usePersistentState('groups.addStudent.desiredScore', 0)
  const [paymentAmount, setPaymentAmount] = usePersistentState('groups.addStudent.paymentAmount', 0)
  const [saving, setSaving] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // form → config (widgets + course) → link. The student row exists from `config`
  // on; the config step and the invite link both operate on it.
  const [step, setStep] = useState<'form' | 'config' | 'link'>('form')
  const [newStudentId, setNewStudentId] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim() || !selectedGroup) return
    setSaving(true)
    const { inviteToken, studentId } = await onSave(selectedGroup, { name: name.trim(), phone, telegramLink: normalizeContact(telegram), parentContact: parent, desiredScore, paymentAmount })
    setSaving(false)
    clearDrafts('groups.addStudent.')
    if (inviteToken) {
      setInviteLink(`${window.location.origin}${window.location.pathname}#/join?token=${inviteToken}`)
    }
    if (studentId) {
      setNewStudentId(studentId)
      setStep('config')
    } else if (!inviteToken) {
      onClose()
    } else {
      setStep('link')
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    const ok = await copyToClipboard(inviteLink)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-input)', borderRadius: 24,
          width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '90dvh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* On the config step the footer button stays put and only the list scrolls,
            so the shell must clip instead of scrolling as a whole. */}
        <div style={{
          padding: 28, minHeight: 0,
          ...(step === 'config'
            ? { overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            : { overflowY: 'auto' }),
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{step === 'config' ? t('Настройка ученика') : step === 'link' ? t('Ученик добавлен') : t('Новый ученик')}</span>
          <button onClick={onClose} aria-label={t('Закрыть')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>

        {step === 'config' && newStudentId ? (
          <NewStudentConfig
            studentId={newStudentId}
            groupId={selectedGroup}
            onDone={() => setStep('link')}
          />
        ) : step === 'link' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-bg-4)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600 }}>{t('ССЫЛКА ДЛЯ РЕГИСТРАЦИИ')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text)', wordBreak: 'break-all', lineHeight: 1.5 }}>{inviteLink}</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
              {t('Отправьте эту ссылку ученику — он перейдёт по ней и создаст свой аккаунт.')}
            </p>
            <button
              onClick={copyLink}
              style={{
                width: '100%', padding: '12px 0',
                background: copied ? '#3FCC8A' : 'var(--color-purple)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 14, cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {copied ? t('✓ Скопировано') : t('Скопировать ссылку')}
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '10px 0',
                background: 'transparent', color: 'var(--color-muted)', fontWeight: 600, fontSize: 14,
                border: 'none', cursor: 'pointer',
              }}
            >
              {t('Закрыть')}
            </button>
          </div>
        ) : (
          <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.length > 0 && (
            <label style={labelStyle}>
              {t('Группа *')}
              <TeacherSelect
                value={selectedGroup}
                onChange={setSelectedGroup}
                options={groups.map(g => ({ value: g.id, label: `${g.icon} ${g.name}` }))}
                clearable={false}
                triggerStyle={selectTriggerStyle}
              />
            </label>
          )}
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('Имя *')} style={inputStyle} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('Телефон')} style={inputStyle} />
          <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder={t('Telegram или VK (@ник или ссылка)')} style={inputStyle} />
          <input value={parent} onChange={e => setParent(e.target.value)} placeholder={t('Контакт родителя')} style={inputStyle} />
          <input
            type="number"
            value={desiredScore === 0 ? '' : desiredScore}
            onChange={e => setDesiredScore(e.target.value === '' ? 0 : Number(e.target.value))}
            onFocus={() => setDesiredScore(0)}
            placeholder={t('Целевой балл')}
            min={0}
            max={100}
            style={inputStyle}
          />
          <input
            type="number"
            value={paymentAmount === 0 ? '' : paymentAmount}
            onChange={e => setPaymentAmount(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder={t('Стоимость занятия (₽)')}
            min={0}
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{
            marginTop: 22, width: '100%', padding: '12px 0',
            background: 'var(--grad-purple)', opacity: (name.trim() && selectedGroup) ? 1 : 0.45,
            color: '#fff', fontWeight: 700, fontSize: 15,
            border: 'none', borderRadius: 14, cursor: (name.trim() && selectedGroup) ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? t('Сохранение...') : t('Добавить ученика')}
        </button>
          </>
        )}
        </div>
      </motion.div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
  fontSize: 12, fontWeight: 600, color: '#555',
}
const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 12,
  border: '1.5px solid var(--color-border-medium)', fontSize: 14,
  outline: 'none', background: 'var(--color-bg-4)', color: 'var(--color-text)',
}
// Makes a TeacherSelect trigger match the bordered input fields above.
const selectTriggerStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 12,
  border: '1.5px solid var(--color-border-medium)', fontSize: 14,
  background: 'var(--color-bg-4)',
}
const SUBJECT_ICONS = SUBJECT_ICON_MAP

const INDIV_COLORS = [
  { color: 'var(--color-purple)', soft: '#EFE0FF' },
  { color: '#3F8F6B', soft: '#D6EDE2' },
  { color: '#FF8F6D', soft: '#FFE8DF' },
  { color: '#6D9BFF', soft: '#DCE8FF' },
  { color: '#FFB96D', soft: '#FFF1DC' },
]

// ─── Направления (предмет + уровень) с кнопкой «＋» ───────────────────────────
// Первое направление — основное (subject/level колонки группы), остальные —
// массив tracks. Ученик 1:1 может учиться по нескольким предметам/уровням сразу.
function TrackFields({
  subject, level, onSubject, onLevel, tracks, onTracksChange,
}: {
  subject: string; level: string
  onSubject: (v: string) => void; onLevel: (v: string) => void
  tracks: GroupTrack[]; onTracksChange: (t: GroupTrack[]) => void
}) {
  const t = useT()
  const setTrack = (i: number, patch: Partial<GroupTrack>) =>
    onTracksChange(tracks.map((tr, idx) => idx === i ? { ...tr, ...patch } : tr))
  const removeTrack = (i: number) => onTracksChange(tracks.filter((_, idx) => idx !== i))
  const addTrack = () => onTracksChange([...tracks, { subject: '', level: '' }])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Основное направление */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <TeacherSelect
            value={subject}
            onChange={v => {
              onSubject(v)
              // Шкала уровней у нового предмета своя — несовместимый выбор чистим.
              if (level && !levelOptionsForSubject(v).includes(level)) onLevel('')
            }}
            placeholder={t('Предмет')}
            options={Object.keys(SUBJECT_ICONS).map(o => ({ value: o, label: t(o) }))}
            triggerStyle={selectTriggerStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <TeacherSelect value={level} onChange={onLevel} placeholder={t('Уровень')} options={levelOptionsForSubject(subject).map(o => ({ value: o, label: t(o) }))} triggerStyle={selectTriggerStyle} />
        </div>
      </div>

      {/* Дополнительные направления */}
      {tracks.map((tr, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <TeacherSelect
              value={tr.subject}
              onChange={v => setTrack(i, {
                subject: v,
                ...(tr.level && !levelOptionsForSubject(v).includes(tr.level) ? { level: '' } : {}),
              })}
              placeholder={t('Предмет')}
              options={Object.keys(SUBJECT_ICONS).map(o => ({ value: o, label: t(o) }))}
              triggerStyle={selectTriggerStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <TeacherSelect value={tr.level} onChange={v => setTrack(i, { level: v })} placeholder={t('Уровень')} options={levelOptionsForSubject(tr.subject).map(o => ({ value: o, label: t(o) }))} triggerStyle={selectTriggerStyle} />
          </div>
          <button
            type="button" onClick={() => removeTrack(i)} title={t('Убрать направление')}
            style={{
              width: 32, height: 32, flexShrink: 0, borderRadius: 9, cursor: 'pointer',
              border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-4)',
              color: 'var(--color-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>
      ))}

      <button
        type="button" onClick={addTrack}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 0', borderRadius: 10, cursor: 'pointer',
          border: '1.5px dashed var(--color-border-medium)', background: 'transparent',
          color: 'var(--color-accent)', fontSize: 13, fontWeight: 600,
        }}
      >
        <Plus size={15} /> {t('Ещё направление')}
      </button>
    </div>
  )
}

// ─── Модалка добавления индивидуального ученика ──────────────────────────────
function AddIndividualStudentModal({ onClose, onPickExisting, onSave }: {
  onClose: () => void
  /** Switch to picking an existing person instead of creating a fresh one. */
  onPickExisting?: () => void
  onSave: (s: {
    name: string; subject: string; icon: string; level: string; color: string; colorSoft: string;
    phone: string; telegramLink: string; parentContact: string; desiredScore: number; paymentAmount: number;
    tracks: GroupTrack[]
  }) => Promise<{ inviteToken: string | null; studentId: string | null; groupId: string | null }>
}) {
  const t = useT()
  // Draft-backed: survives a page reload; cleared on save or explicit close.
  const [name, setName] = usePersistentState('groups.addIndiv.name', '')
  const [subject, setSubject] = usePersistentState('groups.addIndiv.subject', '')
  const [level, setLevel] = usePersistentState('groups.addIndiv.level', '')
  // Дополнительные направления (предмет+уровень) сверх основного.
  const [tracks, setTracks] = usePersistentState<GroupTrack[]>('groups.addIndiv.tracks', [])
  const [colorIdx, setColorIdx] = usePersistentState('groups.addIndiv.colorIdx', 0)
  const [phone, setPhone] = usePersistentState('groups.addIndiv.phone', '')
  const [telegram, setTelegram] = usePersistentState('groups.addIndiv.telegram', '')
  const [parent, setParent] = usePersistentState('groups.addIndiv.parent', '')
  const [desiredScore, setDesiredScore] = usePersistentState('groups.addIndiv.desiredScore', 0)
  const [paymentAmount, setPaymentAmount] = usePersistentState('groups.addIndiv.paymentAmount', 0)
  const [saving, setSaving] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'form' | 'config' | 'link'>('form')
  const [newStudentId, setNewStudentId] = useState<string | null>(null)
  const [newGroupId, setNewGroupId] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const c = INDIV_COLORS[colorIdx % INDIV_COLORS.length]
    const { inviteToken, studentId, groupId } = await onSave({
      name: name.trim(), subject, icon: SUBJECT_ICONS[subject] ?? '📚',
      level, color: c.color, colorSoft: c.soft,
      phone, telegramLink: normalizeContact(telegram), parentContact: parent, desiredScore, paymentAmount,
      tracks: tracks.filter(t => t.subject.trim() || t.level.trim()),
    })
    setSaving(false)
    clearDrafts('groups.addIndiv.')
    if (inviteToken) {
      setInviteLink(`${window.location.origin}${window.location.pathname}#/join?token=${inviteToken}`)
    }
    if (studentId) {
      setNewStudentId(studentId)
      setNewGroupId(groupId)
      setStep('config')
    } else if (!inviteToken) {
      onClose()
    } else {
      setStep('link')
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    const ok = await copyToClipboard(inviteLink)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-input)', borderRadius: 24,
          width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '90dvh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* On the config step the footer button stays put and only the list scrolls,
            so the shell must clip instead of scrolling as a whole. */}
        <div style={{
          padding: 28, minHeight: 0,
          ...(step === 'config'
            ? { overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            : { overflowY: 'auto' }),
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{step === 'config' ? t('Настройка ученика') : step === 'link' ? t('Ученик добавлен') : t('Новый ученик 1:1')}</span>
          <button onClick={onClose} aria-label={t('Закрыть')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>

        {step === 'config' && newStudentId ? (
          <NewStudentConfig
            studentId={newStudentId}
            groupId={newGroupId}
            onDone={() => setStep('link')}
          />
        ) : step === 'link' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-bg-4)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600 }}>{t('ССЫЛКА ДЛЯ РЕГИСТРАЦИИ')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text)', wordBreak: 'break-all', lineHeight: 1.5 }}>{inviteLink}</div>
            </div>
            <button onClick={copyLink} style={{
              width: '100%', padding: '12px 0',
              background: copied ? '#3FCC8A' : 'var(--color-purple)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              border: 'none', borderRadius: 14, cursor: 'pointer', transition: 'background 0.2s',
            }}>
              {copied ? t('✓ Скопировано') : t('Скопировать ссылку')}
            </button>
            <button onClick={onClose} style={{
              width: '100%', padding: '10px 0',
              background: 'transparent', color: 'var(--color-muted)', fontWeight: 600, fontSize: 14,
              border: 'none', cursor: 'pointer',
            }}>{t('Закрыть')}</button>
          </div>
        ) : (
          <>
            {onPickExisting && (
              <button
                type="button" onClick={onPickExisting}
                style={{ width: '100%', marginBottom: 14, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'var(--color-bg-4)', border: '1px solid var(--color-border-medium)', borderRadius: 12, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--color-accent)', fontFamily: 'inherit' }}
              >
                <UserPlus size={15} /> {t('Выбрать из существующих')}
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t('Имя *')} style={inputStyle} />
              <TrackFields
                subject={subject} level={level} onSubject={setSubject} onLevel={setLevel}
                tracks={tracks} onTracksChange={setTracks}
              />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('Телефон')} style={inputStyle} />
              <input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder={t('Telegram или VK (@ник или ссылка)')} style={inputStyle} />
              <input value={parent} onChange={e => setParent(e.target.value)} placeholder={t('Контакт родителя')} style={inputStyle} />
              <input
                type="number"
                value={desiredScore === 0 ? '' : desiredScore}
                onChange={e => setDesiredScore(e.target.value === '' ? 0 : Number(e.target.value))}
                onFocus={() => setDesiredScore(0)}
                placeholder={t('Целевой балл')}
                min={0}
                max={100}
                style={inputStyle}
              />
              <input
                type="number"
                value={paymentAmount === 0 ? '' : paymentAmount}
                onChange={e => setPaymentAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder={t('Стоимость занятия (₽)')} min={0} style={inputStyle}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>{t('Цвет')}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {INDIV_COLORS.map((c, i) => (
                    <div key={i} onClick={() => setColorIdx(i)} style={{
                      width: 28, height: 28, borderRadius: '50%', background: c.color,
                      cursor: 'pointer', outline: colorIdx === i ? `3px solid ${c.color}` : 'none',
                      outlineOffset: 2,
                    }} />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              style={{
                marginTop: 22, width: '100%', padding: '12px 0',
                background: 'var(--grad-purple)', opacity: name.trim() ? 1 : 0.45,
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 14, cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? t('Сохранение...') : t('Добавить ученика')}
            </button>
          </>
        )}
        </div>
      </motion.div>
    </div>
  )
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] },
})

// ─── Glass card ──────────────────────────────────────────────────────────────
function Card({
  children, style, onClick,
}: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        borderRadius: 22,
        boxShadow: 'var(--shadow-sm-page)',
        padding: 20,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function ScrollFadeTable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  function check() {
    const el = ref.current
    if (!el) return
    setFadeLeft(el.scrollLeft > 4)
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => { check() }, [])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} onScroll={check} style={{ overflowX: 'auto' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 56,
        pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(to right, var(--color-bg-2), transparent)',
        opacity: fadeLeft ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 72,
        pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(to left, var(--color-bg-2), transparent)',
        opacity: fadeRight ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
    </div>
  )
}

// ─── Group card ───────────────────────────────────────────────────────────────
function GroupCard({
  group, isActive, onClick, onDelete,
}: { group: Group; isActive: boolean; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const t = useT()
  const progress = Math.round((group.lessonsCompleted / group.totalLessons) * 100)
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-group-card
      data-compact="false"
      className="group-card"
      style={{
        background: isActive ? `${group.color}14` : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive ? `1.5px solid ${group.color}` : '1px solid var(--color-border-glass)',
        borderRadius: 22,
        boxShadow: isActive
          ? `0 0 0 3px ${group.color}33, 0 4px 20px rgba(0,0,0,0.06)`
          : 'var(--shadow-sm-page)',
        cursor: 'pointer',
        flex: '1 1 180px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Delete button */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            key="del"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            onClick={onDelete}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 24, height: 24, borderRadius: 8,
              background: 'rgba(220,50,50,0.12)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-red-text)', zIndex: 5,
              padding: 0,
            }}
            title={t('Удалить группу')}
          >
            <Trash2 size={13} strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Level badge + count */}
      <div className="group-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          color: group.color,
          background: group.color + '22',
          padding: '3px 9px', borderRadius: 8,
          border: `1px solid ${group.color}33`,
        }}>
          {t(group.level)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-muted)' }}>
          <Users size={13} strokeWidth={1.8} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{group.studentCount}</span>
        </div>
      </div>

      {/* Name */}
      <div className="group-card-name" style={{ fontWeight: 700, color: 'var(--color-text)' }}>
        {group.name}
      </div>

      {/* Date + progress — hidden in compact via CSS */}
      <div className="group-card-details">
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          {t('с')} {group.startDate}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>{t('Прогресс')}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>
              {group.lessonsCompleted}/{group.totalLessons}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: group.color, borderRadius: 99 }}
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>{progress}% {t('выполнено')}</div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortKey = 'attention' | 'name' | 'lastVisit' | 'hwScore' | 'testScore' | 'trialScore' | 'attendance' | 'lastPayment' | 'debt'
type SortDir = 'asc' | 'desc'
type RosterFilter = 'all' | 'debtors' | 'fading' | 'nohw'

// Days since a "dd.mm.yyyy" date string; large fallback when unparseable/empty.
function daysSinceVisit(v?: string): number {
  if (!v || !v.includes('.')) return 999
  const [d, m, y] = v.split('.').map(Number)
  if (!d || !m || !y) return 999
  const then = new Date(y, m - 1, d).getTime()
  return Math.floor((Date.now() - then) / 86_400_000)
}

// Heuristic "needs attention" score from the fields we already have on Student.
// Higher = more urgent; used for the default sort so problem students float up.
function attentionScore(s: Student): number {
  let score = 0
  const debt = s.debt ?? 0
  if (debt > 0) score += 4 + Math.min(3, debt / 2000)
  if (s.attendance < 70) score += 3
  else if (s.attendance < 85) score += 1
  if (s.hwScore === 0) score += 3
  else if (s.hwScore < 60) score += 2
  const stale = daysSinceVisit(s.lastVisit)
  if (stale > 14) score += 3
  else if (stale > 7) score += 1.5
  return score
}

const filterPredicate: Record<RosterFilter, (s: Student) => boolean> = {
  all: () => true,
  debtors: s => (s.debt ?? 0) > 0,
  fading: s => daysSinceVisit(s.lastVisit) > 7 || s.attendance < 70,
  nohw: s => s.hwScore === 0,
}

function sortStudents(list: Student[], key: SortKey, dir: SortDir) {
  if (key === 'attention') {
    // Always urgent-first regardless of dir toggle; tie-break by name.
    return [...list].sort((a, b) => {
      const diff = attentionScore(b) - attentionScore(a)
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'ru')
    })
  }
  return [...list].sort((a, b) => {
    let av: number | string = (a as Record<string, unknown>)[key] as number | string ?? -1
    let bv: number | string = (b as Record<string, unknown>)[key] as number | string ?? -1
    if (typeof av === 'string' && typeof bv === 'string') {
      // dd.mm.yyyy → yyyymmdd for lastVisit; ISO dates sort lexically already
      const toTs = (s: string) => s.includes('.') ? s.split('.').reverse().join('') : s
      av = toTs(av); bv = toTs(bv)
    }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Table header cell ────────────────────────────────────────────────────────
function Th({
  label, sortKey, currentKey, dir, onSort, right, last,
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir
  onSort: (k: SortKey) => void; right?: boolean; last?: boolean
}) {
  const active = currentKey === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: last ? '10px 24px 10px 12px' : '10px 12px',
        textAlign: right ? 'center' : 'left',
        fontSize: 11, fontWeight: 700, color: active ? 'var(--color-accent)' : 'var(--color-text-3)',
        letterSpacing: 0.3, cursor: 'pointer', whiteSpace: 'nowrap',
        userSelect: 'none',
        borderBottom: '1px solid var(--color-border-soft)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active
          ? dir === 'asc'
            ? <ChevronUp size={11} />
            : <ChevronDown size={11} />
          : <ChevronsUpDown size={11} style={{ opacity: 0.4 }} />
        }
      </span>
    </th>
  )
}

function ScorePill({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value === null) return <span style={{ color: 'var(--color-text-4)', fontSize: 12 }}>—</span>
  const pct = value / max
  const color = pct >= 0.8 ? 'var(--color-green-text)' : pct >= 0.6 ? 'var(--color-text-2)' : 'var(--color-red-text)'
  const bg    = pct >= 0.8 ? 'var(--color-green-soft)' : pct >= 0.6 ? 'var(--color-yellow-soft)' : 'var(--color-red-soft)'
  return (
    <span style={{
      display: 'inline-block', minWidth: 34,
      fontSize: 12, fontWeight: 700, color,
      background: bg, borderRadius: 7, padding: '2px 7px', textAlign: 'center',
    }}>
      {value}
    </span>
  )
}

// ─── Student profile panel ────────────────────────────────────────────────────
function CredentialsSpoiler({ login, password }: { login: string; password: string }) {
  const t = useT()
  const [phase, setPhase] = useState<'hidden' | 'revealed'>('hidden')
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-hide after 3s of inactivity when revealed
  useEffect(() => {
    if (phase === 'revealed') {
      hideTimer.current = setTimeout(() => setPhase('hidden'), 3000)
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [phase])

  function handleClick() {
    if (phase === 'hidden') {
      setPhase('revealed')
    } else {
      void copyToClipboard(`${t('Логин')}: ${login}\n${t('Пароль')}: ${password}`)
      setPhase('hidden')
    }
  }

  const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, padding: '7px 10px', background: 'var(--color-bg)', borderRadius: 10,
  }
  const shimBar: React.CSSProperties = {
    flex: 1, height: 14, borderRadius: 6,
    background: 'var(--color-bg-5)',
    position: 'relative', overflow: 'hidden',
  }

  return (
    <div
      onClick={handleClick}
      title={phase === 'hidden' ? t('Нажмите чтобы показать') : t('Нажмите чтобы скопировать')}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <div style={rowStyle}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', minWidth: 48 }}>{t('Логин')}</span>
        {phase === 'revealed'
          ? <span style={{ ...mono, color: 'var(--color-text)', flex: 1, textAlign: 'right', wordBreak: 'break-all' }}>{login}</span>
          : (
            <span style={shimBar}>
              <span style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                animation: 'shimmer-bar 1.6s ease-in-out infinite',
              }} />
            </span>
          )
        }
      </div>
      <div style={rowStyle}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', minWidth: 48 }}>{t('Пароль')}</span>
        {phase === 'revealed'
          ? <span style={{ ...mono, color: 'var(--color-text)', flex: 1, textAlign: 'right' }}>{password}</span>
          : (
            <span style={shimBar}>
              <span style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                animation: 'shimmer-bar 1.6s ease-in-out 0.3s infinite',
              }} />
            </span>
          )
        }
      </div>
      <div style={{ fontSize: 10, color: 'var(--color-text-3)', textAlign: 'center', marginTop: 2 }}>
        {phase === 'hidden' ? t('● ● ●  нажмите чтобы показать') : t('нажмите ещё раз — скопирует оба поля')}
      </div>
    </div>
  )
}

function StudentAvatar({
  student, group,
}: { student: Student; group: Group }) {
  const t = useT()
  const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const isRegistered = !!student.email

  async function copyInvite() {
    if (!student.inviteToken) return
    const link = `${window.location.origin}${window.location.pathname}#/join?token=${student.inviteToken}`
    const ok = await copyToClipboard(link)
    if (!ok) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{ position: 'relative', width: 46, height: 46, flexShrink: 0, cursor: isRegistered ? 'default' : 'pointer' }}
      onMouseEnter={() => !isRegistered && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isRegistered && copyInvite()}
      title={isRegistered ? '' : t('Скопировать ссылку приглашения')}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 16,
        background: group.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 700, color: '#fff',
        transition: 'opacity 0.15s',
        opacity: hovered ? 0.25 : 1,
      }}>
        {initials}
      </div>

      {/* Overlay: copy icon (not registered) */}
      {!isRegistered && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: 'none',
        }}>
          {copied
            ? <Check size={18} strokeWidth={2.5} style={{ color: group.color }} />
            : <Copy size={17} strokeWidth={2.2} style={{ color: group.color }} />
          }
        </div>
      )}

      {/* Badge: pending registration dot */}
      {!isRegistered && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 12, height: 12, borderRadius: '50%',
          background: '#F5A623', border: '2px solid var(--color-bg)',
        }} title={t('Ещё не зарегистрирован')} />
      )}
    </div>
  )
}

// ─── Mock trainer stats for a student (until Supabase trainer_sessions table) ──

// ─── Full-screen student card ─────────────────────────────────────────────────
function StudentFullCard({ student, group, onClose }: { student: Student; group: Group; onClose: () => void }) {
  const t = useT()
  const [tab, setTab] = useState<'main' | 'trainer'>('main')
  const [trainerSections, setTrainerSections] = useState<TrainerSection[]>([])
  const [wrongTasks, setWrongTasks] = useState<WrongTask[]>([])
  const [sessionDays, setSessionDays] = useState(0)

  useEffect(() => {
    const sid = student.id
    const aid = (student as any).authUserId ?? null
    fetchStudentTrainerSections(sid, aid).then(setTrainerSections)
    fetchStudentWrongTasks(sid, aid).then(setWrongTasks)
    fetchStudentSessionDays(sid, aid).then(setSessionDays)
  }, [student.id])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 800, maxHeight: '90dvh',
          background: 'var(--color-bg-input)',
          borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          border: '1px solid var(--color-border-glass)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 0', background: group.color + '18', borderBottom: `1px solid ${group.color}33`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <StudentAvatar student={student} group={group} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 750, color: 'var(--color-text)' }}>{student.name}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, background: group.color + '33', borderRadius: 7, padding: '2px 8px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)' }}>· {group.icon} {t(group.subject)}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
              <X size={15} />
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {([['main', BookOpen, 'Основное'], ['trainer', Target, 'Тренажёр']] as const).map(([key, Icon, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 700 : 500, color: tab === key ? 'var(--color-text)' : 'var(--color-text-3)', borderBottom: `2px solid ${tab === key ? group.color : 'transparent'}`, transition: 'all 0.15s' }}>
                <Icon size={13} />
                {t(label)}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <AnimatePresence mode="wait">
            {tab === 'main' ? (
              <motion.div key="main" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Left col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <section>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{t('Контакты')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <ContactRow icon={Phone} label={student.phone} href={`tel:${student.phone}`} />
                      {student.telegramLink && <ContactRow icon={Send} label={contactLabel(student.telegramLink)} href={contactHref(student.telegramLink)} />}
                      {student.parentContact && <ContactRow icon={User} label={`${t('Родитель:')} ${student.parentContact}`} href={`tel:${student.parentContact}`} />}
                    </div>
                  </section>
                  <section>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{t('Прочее')}</div>
                    <InfoRow label={t('Начал(а)')} value={student.startedAt} />
                    <InfoRow label={t('Последний вход')} value={student.lastVisit} />
                    <InfoRow label={t('Целевой балл')} value={`${student.desiredScore} ${t('баллов')}`} />
                  </section>
                </div>
                {/* Right col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <section>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{t('Показатели')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <ScoreBar label={t('ДЗ')} icon={ClipboardCheck} value={student.hwScore} color="#5FD68A" bg="#D6F5E3" />
                      <ScoreBar label={t('Тесты')} icon={TrendingUp} value={student.testScore} color="var(--color-purple)" bg="#EFE0FF" />
                      {student.trialScore !== null && <ScoreBar label={t('Пробник')} icon={Award} value={student.trialScore} color="#F5A623" bg="#FFF3D6" />}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--color-bg)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Clock size={13} strokeWidth={2} style={{ color: 'var(--color-muted)' }} />
                          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Посещаемость')}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: student.attendance >= 90 ? 'var(--color-green-text)' : student.attendance >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)' }}>
                          {student.attendance}%
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <motion.div key="trainer" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {(() => {
                    const total = trainerSections.reduce((a, s) => a + s.total, 0)
                    const correct = trainerSections.reduce((a, s) => a + s.correct, 0)
                    return [
                      { val: total, label: 'Всего задач', color: 'var(--color-text)', bg: 'var(--color-bg)' },
                      { val: correct, label: 'Верно', color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
                      { val: total - correct, label: 'Ошибок', color: 'var(--color-red-text)', bg: 'var(--color-red-soft)' },
                      { val: sessionDays, label: 'Занятий', color: 'var(--color-purple)', bg: '#EFE0FF' },
                    ]
                  })().map(({ val, label, color, bg }) => (
                    <div key={label} style={{ padding: '12px 14px', borderRadius: 14, background: bg, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 750, color, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 11, color, opacity: 0.75, marginTop: 4 }}>{t(label)}</div>
                    </div>
                  ))}
                </div>
                {/* Section breakdown */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Layers size={14} style={{ color: 'var(--color-muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('По разделам')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {trainerSections.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '8px 0' }}>{t('Нет данных — ученик ещё не занимался в тренажёре')}</div>
                    )}
                    {trainerSections.map(({ section, correct, total }) => {
                      const pct = total ? correct / total : 0
                      const color = pct >= 0.7 ? '#34C877' : pct >= 0.4 ? '#FAC775' : '#F09595'
                      return (
                        <div key={section}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{section}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, marginLeft: 8 }}>{correct}/{total} · {Math.round(pct * 100)}%</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.55, delay: 0.1 }}
                              style={{ height: '100%', background: color, flexShrink: 0 }} />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${((total - correct) / total) * 100}%` }} transition={{ duration: 0.55, delay: 0.1 }}
                              style={{ height: '100%', background: '#F4B3B344', flexShrink: 0 }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Wrong tasks */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <XCircle size={14} style={{ color: 'var(--color-red-text)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Задания с ошибками')}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Нажмите, чтобы дать похожие')}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {wrongTasks.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '4px 0' }}>{t('Нет ошибок — или ученик ещё не занимался в тренажёре')}</div>
                    )}
                    {wrongTasks.map(wt => (
                      <div key={wt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--color-red-soft)', border: '1px solid rgba(244,139,145,0.25)', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,139,145,0.18)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-red-soft)' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'rgba(244,139,145,0.35)', color: 'var(--color-red-text)', flexShrink: 0 }}>#{wt.id}</span>
                        <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1 }}>{wt.topic}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>{t('Линия')} {wt.line}</span>
                        <CheckCircle2 size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(155,109,255,0.08)', border: '1px solid rgba(155,109,255,0.2)', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                    💡 {t('Данные тренажёра появятся автоматически, когда ученик начнёт заниматься в банке заданий под своим аккаунтом.')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StudentCoursesSection({ student, group }: { student: Student; group: Group }) {
  const t = useT()
  const [courses, setCourses] = useState<StudentCourseInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentActiveCourses(student.id, student.groupId ?? '')
      .then(c => { setCourses(c); setLoading(false) })
  }, [student.id, student.groupId])

  return (
    <section>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
        {t('Активные курсы')}
      </div>
      {!loading && courses.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', padding: '8px 0' }}>{t('Нет активных курсов')}</div>
      )}
      {courses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {courses.map(c => {
            const pct = c.totalLessons > 0 ? c.completedLessons / c.totalLessons : 0
            return (
              <div key={c.id} style={{ background: 'var(--color-bg)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, flex: 1 }}>{c.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: group.color, flexShrink: 0 }}>
                    {c.completedLessons}/{c.totalLessons}
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: '100%', background: group.color, borderRadius: 99 }}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 3 }}>{Math.round(pct * 100)}% {t('пройдено')}</div>
              </div>
            )
          })}
        </div>
      )}
      {loading && (
        <div style={{ padding: '8px 0' }}><Skeleton.Text lines={2} /></div>
      )}
    </section>
  )
}

// Направления ученика 1:1. Каждый предмет — ОТДЕЛЬНАЯ карточка-группа (не JSONB):
// показываем текущую карточку + другие карточки этого же ученика, а «Ещё
// направление» создаёт новую карточку (новую группу + строку ученика с теми же
// контактами и той же учётной записью). Удаление сносит карточку целиком.
export type SiblingCard = { id: string; subject: string; level: string; icon: string; color: string }
function TracksSection({
  group, individual = true, siblings, onAddCard, onRemoveCard, onOpenCard,
}: {
  group: Group
  /** true = current card is itself a 1:1 direction; false = current card is a regular group. */
  individual?: boolean
  siblings: SiblingCard[]
  onAddCard: (subject: string, level: string) => Promise<void>
  onRemoveCard: (groupId: string) => Promise<void>
  onOpenCard: (groupId: string) => void
}) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [busy, setBusy] = useState(false)
  // Reset the inline add-form when switching to another student.
  useEffect(() => { setAdding(false); setSubject(''); setLevel(''); setBusy(false) }, [group.id])

  async function confirmAdd() {
    if (!subject.trim()) return
    setBusy(true)
    try {
      await onAddCard(subject, level)
      setAdding(false); setSubject(''); setLevel('')
    } finally { setBusy(false) }
  }

  const chip = (icon: string, subj: string, lvl: string, color: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: color + '22', border: `1px solid ${color}44`,
    borderRadius: 9, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: 'var(--color-text)',
  })

  return (
    <section>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
        {t('Направления')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Текущая карточка. Крестик есть и у неё — иначе направление, на котором
            стоишь, снять было нельзя вовсе (приходилось открывать соседнее).
            Последнее направление не удаляем: это уже «Удалить ученика». */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ ...chip(group.icon, group.subject, group.level, group.color), flex: 1 }}>
            <span>{group.icon}</span>
            <span>{t(group.subject)}{group.level ? ` · ${t(group.level)}` : ''}</span>
          </div>
          {siblings.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                const ok = await confirmDialog({
                  title: `${t('Убрать направление')} «${t(group.subject)}»?`,
                  message: t('Карточка этого предмета удалится вместе с её посещаемостью и домашкой. Аккаунт ученика и остальные направления останутся.'),
                  confirmLabel: t('Убрать'),
                  tone: 'danger',
                })
                if (ok) await onRemoveCard(group.id)
              }}
              title={t('Удалить карточку')}
              style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-4)', color: 'var(--color-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Другие карточки этого ученика — клик открывает, крестик удаляет */}
        {siblings.map(sc => (
          <div key={sc.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button" onClick={() => onOpenCard(sc.id)} title={t('Открыть карточку')}
              style={{ ...chip(sc.icon, sc.subject, sc.level, sc.color), cursor: 'pointer', flex: 1, justifyContent: 'flex-start' }}
            >
              <span>{sc.icon}</span>
              <span>{t(sc.subject)}{sc.level ? ` · ${t(sc.level)}` : ''}</span>
            </button>
            <button
              type="button" onClick={() => onRemoveCard(sc.id)} title={t('Удалить карточку')}
              style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-4)', color: 'var(--color-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Инлайн-форма нового направления */}
        {adding ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <TeacherSelect
                  value={subject}
                  onChange={v => {
                    setSubject(v)
                    if (level && !levelOptionsForSubject(v).includes(level)) setLevel('')
                  }}
                  placeholder={t('Предмет')}
                  options={Object.keys(SUBJECT_ICONS).map(o => ({ value: o, label: t(o) }))}
                  triggerStyle={selectTriggerStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TeacherSelect value={level} onChange={setLevel} placeholder={t('Уровень')} options={levelOptionsForSubject(subject).map(o => ({ value: o, label: t(o) }))} triggerStyle={selectTriggerStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button" onClick={confirmAdd} disabled={!subject.trim() || busy}
                // Заливка — канонический --grad-purple (как у всех «Сохранить»):
                // --color-purple/--color-accent светлые, они для ТЕКСТА, и белые
                // буквы на них тонут. Неактивность — прозрачностью, не бледнотой.
                style={{ flex: 1, padding: '8px 0', borderRadius: 9, cursor: (!subject.trim() || busy) ? 'default' : 'pointer', border: 'none', background: 'var(--grad-purple)', opacity: (!subject.trim() || busy) ? 0.45 : 1, color: '#fff', fontSize: 12, fontWeight: 700 }}
              >
                {busy ? t('Создаём…') : t('Создать карточку')}
              </button>
              <button
                type="button" onClick={() => { setAdding(false); setSubject(''); setLevel('') }}
                style={{ padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-4)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600 }}
              >
                {t('Отмена')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button" onClick={() => setAdding(true)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 9, cursor: 'pointer', border: '1.5px dashed var(--color-border-medium)', background: 'transparent', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}
          >
            <Plus size={14} /> {individual ? t('Ещё направление') : t('Направление 1:1')}
          </button>
        )}
      </div>
    </section>
  )
}

function StudentPanel({
  student, group, onClose, onDelete, onOpenFullCard, onAddHomework, onSaveComment, onResetPassword,
  siblingCards, onAddCard, onRemoveCard, onOpenCard, onAddToGroup,
}: { student: Student; group: Group; onClose: () => void; onDelete: () => void; onOpenFullCard: () => void; onAddHomework: () => void; onSaveComment: (text: string) => Promise<void>; onResetPassword: () => Promise<string>; siblingCards?: SiblingCard[]; onAddCard?: (subject: string, level: string) => Promise<void>; onRemoveCard?: (groupId: string) => Promise<void>; onOpenCard?: (groupId: string) => void; onAddToGroup?: () => void }) {
  const t = useT()
  const [comment, setComment] = useState(student.comment ?? '')
  const [commentSaved, setCommentSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [newPass, setNewPass] = useState<string | null>(null)
  const [resetErr, setResetErr] = useState<string | null>(null)
  async function resetPassword() {
    setResetting(true)
    setResetErr(null)
    try { setNewPass(await onResetPassword()) }
    catch (e) { setResetErr(e instanceof Error ? e.message : t('Не удалось сбросить пароль')) }
    finally { setResetting(false) }
  }
  // Re-sync the editor when switching to another student.
  useEffect(() => { setComment(student.comment ?? ''); setCommentSaved(false) }, [student.id])
  async function saveComment() {
    if (comment === (student.comment ?? '')) return
    await onSaveComment(comment)
    setCommentSaved(true)
    setTimeout(() => setCommentSaved(false), 2000)
  }
  return (
    <div
      style={{
        width: 320, flexShrink: 0, flex: 1, minHeight: 0,
        background: 'rgba(var(--glass-rgb), 0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        margin: '36px 12px 12px 0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        background: group.color + '22',
        borderBottom: `1px solid ${group.color}44`,
        borderTopLeftRadius: 19,
        borderTopRightRadius: 19,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <StudentAvatar student={student} group={group} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {student.name}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, maxWidth: '100%',
                background: group.color + '33', borderRadius: 7, padding: '2px 8px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>· {group.icon} {t(group.subject)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onOpenFullCard}
              title={t('Полная статистика ученика')}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-3)' }}
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-3)' }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable body. Фейды краёв + плавающий бегунок — как у остальных
          панелей: уходящий под шапку/футер контент не обрезается ножом. */}
      <OverlayScrollArea style={{ flex: 1 }} padding="16px 20px 0" scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Credentials */}
        {(student.email || student.tempPassword) && (
          <section>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
              {t('Доступ в кабинет')}
            </div>
            <CredentialsSpoiler
              login={student.email ?? ''}
              password={newPass ?? student.tempPassword ?? ''}
            />
            <button
              onClick={resetPassword}
              disabled={resetting}
              style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 12, fontWeight: 600, cursor: resetting ? 'default' : 'pointer' }}
            >
              {resetting ? t('Сбрасываем…') : newPass ? `${t('Новый пароль:')} ${newPass}` : t('Сбросить пароль')}
            </button>
            {resetErr && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-danger, #e5484d)', textAlign: 'center' }}>
                {resetErr}
              </div>
            )}
          </section>
        )}

        {/* Направления — отдельная 1:1-карточка на каждый доп. предмет. Показываем
            и для 1:1, и для групповых учеников: групповой может уйти на второй
            предмет в формате 1:1, переиспользуя тот же аккаунт (addIndividualCard). */}
        {onAddCard && onRemoveCard && onOpenCard && (
          <TracksSection
            group={group}
            individual={group.isIndividual ?? false}
            siblings={siblingCards ?? []}
            onAddCard={onAddCard}
            onRemoveCard={onRemoveCard}
            onOpenCard={onOpenCard}
          />
        )}

        {/* Contacts */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            {t('Контакты')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ContactRow icon={Phone} label={student.phone} href={`tel:${student.phone}`} />
            {student.telegramLink && (
              <ContactRow icon={Send} label={contactLabel(student.telegramLink)} href={contactHref(student.telegramLink)} />
            )}
            {student.parentContact && (
              <ContactRow icon={User} label={`${t('Родитель:')} ${student.parentContact}`} href={`tel:${student.parentContact}`} />
            )}
          </div>
        </section>

        {/* Scores */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            {t('Показатели')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScoreBar label={t('ДЗ')} icon={ClipboardCheck} value={student.hwScore} color="#5FD68A" bg="#D6F5E3" />
            <ScoreBar label={t('Тесты')} icon={TrendingUp} value={student.testScore} color="var(--color-purple)" bg="#EFE0FF" />
            {student.trialScore !== null && (
              <ScoreBar label={t('Пробник')} icon={Award} value={student.trialScore} color="#F5A623" bg="#FFF3D6" />
            )}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', background: 'var(--color-bg)', borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={13} strokeWidth={2} style={{ color: 'var(--color-muted)' }} />
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Посещаемость')}</span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: student.attendance >= 90 ? 'var(--color-green-text)' : student.attendance >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)',
              }}>
                {student.attendance}%
              </span>
            </div>
          </div>
        </section>

        {/* Active courses */}
        <StudentCoursesSection student={student} group={group} />

        {/* Goal */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            {t('Цель')}
          </div>
          {/* Янтарь, а не --color-yellow-*: тот подобран как ЦВЕТ ТЕКСТА, и
              лимонная заливка на графите даёт оливковую грязь (ровно то же
              правило уже записано у --color-amber в index.css). Рамка была
              литеральным персиковым с альфой — в тёмной теме она темнее
              подложки и читалась ободком грязи. */}
          <div style={{
            background: 'var(--color-amber-soft)', border: '1px solid var(--color-amber-border)',
            borderRadius: 12, padding: '10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Желаемый балл ЕГЭ')}</span>
            <span style={{ fontSize: 18, fontWeight: 750, color: 'var(--color-amber-text)' }}>{student.desiredScore}</span>
          </div>
        </section>

        {/* Info */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            {t('Прочее')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <InfoRow label={t('Начал(а)')} value={student.startedAt} />
            <InfoRow label={t('Последний вход')} value={student.lastVisit} />
          </div>
        </section>

        {/* Comment */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {t('Заметка преподавателя')}
            </div>
            {commentSaved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--color-green-text)' }}>
                <Check size={11} /> {t('сохранено')}
              </span>
            )}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t('Добавить заметку...')}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--color-bg)', border: '1.5px solid transparent',
              borderRadius: 12, padding: '10px 12px',
              fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6,
              resize: 'none', outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = group.color
              e.currentTarget.style.background = 'var(--color-bg-input)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.background = 'var(--color-bg)'
              saveComment()
            }}
          />
        </section>

      </OverlayScrollArea>

      {/* Sticky footer: assign extra homework + delete */}
      <div style={{ padding: '12px 20px 16px', flexShrink: 0, borderTop: '1px solid var(--color-border-soft)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onAddHomework}
          style={{
            width: '100%', padding: '11px 0',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'var(--grad-purple)', border: 'none',
            borderRadius: 12, cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: '#fff',
            transition: 'filter 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
        >
          <Plus size={15} strokeWidth={2.4} /> {t('Выдать ДЗ допом')}
        </button>
        {onAddToGroup && (
          <button
            onClick={onAddToGroup}
            style={{
              width: '100%', padding: '10px 0',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)',
              borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-purple-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-3)' }}
          >
            <Users size={15} strokeWidth={2.2} /> {t('Добавить в группу')}
          </button>
        )}
        <button
          disabled={deleting}
          onClick={async () => {
            const ok = await confirmDialog({
              title: `${t('Удалить')} «${student.name}»?`,
              message: t('Ученик и его данные по этой карточке исчезнут. Это действие нельзя отменить.'),
              confirmLabel: t('Удалить'),
              tone: 'danger',
            })
            if (!ok) return
            setDeleting(true)
            await onDelete()
          }}
          style={{
            width: '100%', padding: '10px 0',
            background: 'none', border: '1.5px solid #ff453a55',
            borderRadius: 12, cursor: deleting ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, color: '#ff453a',
            opacity: deleting ? 0.5 : 1,
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = '#ff453a11' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          {deleting ? t('Удаление...') : t('Удалить ученика')}
        </button>
      </div>
    </div>
  )
}

function ContactRow({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', background: 'var(--color-bg)',
        borderRadius: 10, textDecoration: 'none',
        color: 'var(--color-text)', fontSize: 12, fontWeight: 500,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-purple-soft)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg)')}
    >
      <Icon size={13} strokeWidth={2} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <ExternalLink size={11} style={{ color: 'var(--color-text-3)' }} />
    </a>
  )
}

function ScoreBar({ label, icon: Icon, value, color, bg }: {
  label: string; icon: React.ElementType; value: number; color: string; bg: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={12} strokeWidth={2} style={{ color }} />
          <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, borderRadius: 99, opacity: 0.8 }}
        />
      </div>
    </div>
  )
}

function RosterAddItem({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px',
        background: 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-3)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>{subtitle}</div>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeacherGroupsPage() {
  const t = useT()
  const { selectedGroupId, setSelectedGroupId } = useTeacher()
  const openStudentDashboard = useTeacher(s => s.openStudentDashboard)
  const openHomeworkCreate = useTeacher(s => s.openHomeworkCreate)
  const { groups, loading: groupsLoading, addGroup, addIndividualStudent, addStudentToGroup, addIndividualCard, addExistingStudentToGroup, deleteGroup } = useGroups()
  const { students, deleteStudent, updateStudent } = useStudents(selectedGroupId)
  const allStudents = useAllStudents()
  // Persisted so an open modal (and its draft) re-opens after a page reload —
  // the teacher must never lose an in-progress form to a tab switch/reload.
  const [showAddGroup, setShowAddGroup] = usePersistentState('groups.show.addGroup', false)
  const [showAddStudentPicker, setShowAddStudentPicker] = usePersistentState('groups.show.addStudentPicker', false)
  const [showAddStudent, setShowAddStudent] = usePersistentState('groups.show.addStudent', false)
  const [showAddIndividual, setShowAddIndividual] = usePersistentState('groups.show.addIndividual', false)
  const [showExistingIndiv, setShowExistingIndiv] = useState(false)  // existing person → new 1:1 card
  const [activeStripTab, setActiveStripTab] = useState<'groups' | 'students'>('groups')
  const [sortKey, setSortKey] = useState<SortKey>('attention')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all')
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0 && !groupsLoading) {
      setSelectedGroupId(groups[0].id)
    }
  }, [groups, groupsLoading])

  const openAddGroupModal = useCallback(() => setShowAddGroup(true), [])

  useEffect(() => {
    const onAddStudent = () => setShowAddStudentPicker(true)
    window.addEventListener('teacher:open-add-group', openAddGroupModal)
    window.addEventListener('teacher:open-add-student', onAddStudent)
    return () => {
      window.removeEventListener('teacher:open-add-group', openAddGroupModal)
      window.removeEventListener('teacher:open-add-student', onAddStudent)
    }
  }, [openAddGroupModal])


  const regularGroups = groups.filter(g => !g.isIndividual)
  const individualGroups = groups.filter(g => g.isIndividual)

  const stripTabConfig: TabConfig = {
    tabs: [
      { id: 'groups', label: t('Группы') },
      { id: 'students', label: t('Ученики') },
    ],
    activeTab: activeStripTab,
    onTabChange: (id) => {
      setActiveStripTab(id as 'groups' | 'students')
      setSelectedGroupId(null)
      setActiveStudentId(null)
    },
    onTabPlusClick: (id) => {
      if (id === 'groups') setShowAddGroup(true)
      else setShowAddStudentPicker(true)
    },
  }

  const activeGroup = groups.find(g => g.id === selectedGroupId) ?? null
  // Full roster of the active group (drives chip counts), then narrowed by the
  // search box + active quick-filter, then sorted for display.
  const rosterAll = activeGroup ? students.filter(s => s.groupId === activeGroup.id) : []
  const q = searchQuery.trim().toLowerCase()
  const groupStudents = sortStudents(
    rosterAll
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .filter(filterPredicate[rosterFilter]),
    sortKey, sortDir,
  )
  const filterCounts: Record<RosterFilter, number> = {
    all: rosterAll.length,
    debtors: rosterAll.filter(filterPredicate.debtors).length,
    fading: rosterAll.filter(filterPredicate.fading).length,
    nohw: rosterAll.filter(filterPredicate.nohw).length,
  }
  const activeStudent = activeStudentId ? students.find(s => s.id === activeStudentId) ?? null : null
  const activeStudentGroup = activeStudent ? groups.find(g => g.id === activeStudent.groupId) ?? null : null

  // personKey: person_id — источник правды, authUserId/имя — запасные варианты
  // для незабэкфилленных строк (миграция 0031). Общий с пикером «кому дать курс».

  // Other 1:1 cards of the SAME person — matched by person_id (personKey), robust
  // to renames / same-name people. Each 1:1 card is its own individual group.
  const siblingCards: SiblingCard[] = activeStudent && activeStudentGroup
    ? (() => {
        const key = personKey(activeStudent)
        const seen = new Set<string>()
        const out: SiblingCard[] = []
        for (const s of allStudents) {
          if (s.groupId === activeStudentGroup.id || personKey(s) !== key) continue
          if (seen.has(s.groupId)) continue
          const g = groups.find(gg => gg.id === s.groupId)
          if (!g || !g.isIndividual) continue
          seen.add(s.groupId)
          out.push({ id: g.id, subject: g.subject, level: g.level, icon: g.icon, color: g.color })
        }
        return out
      })()
    : []

  // Switching to a sibling card = select its group, then auto-open its (single)
  // student once useStudents has reloaded for the new group.
  const [pendingOpenGroup, setPendingOpenGroup] = useState<string | null>(null)
  useEffect(() => {
    if (pendingOpenGroup && selectedGroupId === pendingOpenGroup && students.length) {
      setActiveStudentId(students[0].id)
      setPendingOpenGroup(null)
    }
  }, [students, pendingOpenGroup, selectedGroupId])
  function openSiblingCard(groupId: string) {
    setActiveStudentId(null)
    setSelectedGroupId(groupId)
    setPendingOpenGroup(groupId)
  }
  async function addCardForActive(subject: string, level: string) {
    if (!activeStudent || !activeStudentGroup) return
    // Цвет — предмета, а не той карточки, из которой добавляли: направления
    // одного человека должны различаться на глаз (реестр предметов).
    const { studentId, groupId } = await addIndividualCard({
      student: activeStudent,
      subject: subject as Group['subject'],
      level,
    })
    if (studentId && groupId) ensureCardFillTask({ studentId, groupId, name: activeStudent.name, subject })
  }

  function handleGroupClick(group: Group) {
    if (selectedGroupId === group.id) {
      setSelectedGroupId(null)
      setActiveStudentId(null)
    } else {
      setSelectedGroupId(group.id)
      setActiveStudentId(null)
      setSortKey('attention')
      setSortDir('desc')
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  // ─── Enroll an EXISTING person into a regular group ──────────────────────────
  // People are deduplicated per human (auth account if registered, else name),
  // collecting the subjects they already study for the picker label.
  const people = useMemo(() => {
    const map = new Map<string, { key: string; person: PersonLike; subjects: Set<string>; registered: boolean }>()
    for (const s of allStudents) {
      const key = personKey(s)
      let e = map.get(key)
      if (!e) {
        e = {
          key,
          person: {
            name: s.name, phone: s.phone, telegramLink: s.telegramLink, parentContact: s.parentContact,
            desiredScore: s.desiredScore, paymentAmount: s.paymentAmount,
            email: s.email, tempPassword: s.tempPassword, authUserId: s.authUserId, personId: s.personId,
          },
          subjects: new Set(), registered: !!s.authUserId,
        }
        map.set(key, e)
      }
      if (s.subject) e.subjects.add(s.subject)
      // Prefer identity from a registered row so the enrollment inherits the login.
      if (s.authUserId) {
        e.registered = true
        e.person.authUserId = s.authUserId
        if (s.email) e.person.email = s.email
        if (s.tempPassword) e.person.tempPassword = s.tempPassword
      }
    }
    return [...map.values()].map(e => ({ key: e.key, person: e.person, subjects: [...e.subjects], registered: e.registered }))
  }, [allStudents])

  const [addToGroupTarget, setAddToGroupTarget] = useState<string | null>(null)  // group id → PickStudentModal
  const [addToGroupForStudent, setAddToGroupForStudent] = useState(false)         // student card → PickGroupModal
  const [enrolling, setEnrolling] = useState(false)
  const [rosterAddMenu, setRosterAddMenu] = useState(false)

  const existingKeysForGroup = (gid: string) =>
    new Set(allStudents.filter(s => s.groupId === gid).map(personKey))

  async function enrollExisting(targetGroupId: string, person: PersonLike) {
    setEnrolling(true)
    await addExistingStudentToGroup(targetGroupId, person)
    setEnrolling(false)
    setAddToGroupTarget(null)
    setAddToGroupForStudent(false)
    setSelectedGroupId(targetGroupId)
    setActiveStudentId(null)
  }

  // Existing person → brand-new 1:1 card (reuses their account via addIndividualCard).
  // Returns whether they're registered so the modal skips the invite link for them.
  async function createIndivForExisting(person: PersonLike, subject: string, level: string) {
    // Цвет не передаём: карточка красится цветом своего предмета из реестра, а
    // не первым из INDIV_COLORS — иначе все заведённые так карточки одинаковы.
    const { inviteToken, studentId, groupId } = await addIndividualCard({ student: person, subject: subject as Group['subject'], level })
    if (studentId && groupId) ensureCardFillTask({ studentId, groupId, name: person.name, subject })
    return { inviteToken: person.authUserId ? null : (inviteToken ?? null), registered: !!person.authUserId }
  }

  const addToGroupTargetGroup = addToGroupTarget ? groups.find(g => g.id === addToGroupTarget) ?? null : null
  // Groups the active person is already a member of (by their identity key).
  const activeStudentMemberGroupIds = activeStudent
    ? new Set(allStudents.filter(s => personKey(s) === personKey(activeStudent)).map(s => s.groupId))
    : new Set<string>()

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'visible', position: 'relative' }}>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <motion.div {...fadeUp(0.04)}>
          <GroupStrip
            mergePersons
            groups={activeStripTab === 'groups' ? regularGroups : []}
            individualGroups={activeStripTab === 'students' ? individualGroups : []}
            selectedGroupId={selectedGroupId}
            onSelectGroup={(id) => {
              if (!id) { setSelectedGroupId(null); setActiveStudentId(null) }
              else { setSelectedGroupId(id); setActiveStudentId(null); setSortKey('attention'); setSortDir('desc'); setSearchQuery(''); setRosterFilter('all') }
            }}
            tabConfig={stripTabConfig}
            onAddToGroup={activeStripTab === 'groups' ? (gid) => setAddToGroupTarget(gid) : undefined}
          />
        </motion.div>

        {/* Student table */}
        <AnimatePresence>
          {activeGroup && (
            <motion.div
              ref={tableRef}
              key="student-table"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, marginRight: activeStudentId ? 344 : 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  padding: '14px 20px 12px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  borderBottom: '1px solid var(--color-border-soft)',
                }}>
                  {/* Single header row: name left, pills center, search right */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                    {/* Left: group name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', minWidth: 0 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', background: activeGroup.color, flex: 'none',
                      }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {activeGroup.name}
                      </span>
                      {activeGroup.isIndividual && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, flex: 'none',
                          background: `${activeGroup.color}22`, color: activeGroup.color,
                          border: `1px solid ${activeGroup.color}44`,
                        }}>1:1</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap', flex: 'none' }}>
                        · {groupStudents.length} {groupStudents.length === 1 ? t('студент') : t('студентов')}
                      </span>
                    </div>

                    {/* Center: filter pills (absolute so they're truly centered) */}
                    <div style={{
                      position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {([
                        { id: 'all', label: t('Все') },
                        { id: 'debtors', label: t('Должники') },
                        { id: 'fading', label: t('Пропадают') },
                        { id: 'nohw', label: t('Не сдали ДЗ') },
                      ] as { id: RosterFilter; label: string }[]).map(f => {
                        const active = rosterFilter === f.id
                        const count = filterCounts[f.id]
                        return (
                          <button
                            key={f.id}
                            onClick={() => setRosterFilter(f.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                              fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
                              background: active ? 'var(--color-purple-soft)' : 'var(--color-bg)',
                              color: active ? 'var(--color-text)' : 'var(--color-muted)',
                              border: `1px solid ${active ? 'transparent' : 'var(--color-border-soft)'}`,
                            }}
                          >
                            {f.label}
                            <span style={{
                              fontSize: 11, fontWeight: 700, opacity: active ? 1 : 0.7,
                              color: f.id !== 'all' && count > 0 && !active ? 'var(--color-accent)' : 'inherit',
                            }}>{count}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Right: search */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)',
                        borderRadius: 10, padding: '7px 11px', width: 180,
                      }}>
                        <Search size={14} style={{ color: 'var(--color-text-3)', flex: 'none' }} />
                        <input
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder={t('Поиск ученика…')}
                          style={{
                            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
                            fontSize: 13, color: 'var(--color-text)',
                          }}
                        />
                        {searchQuery && (
                          <X size={13} style={{ color: 'var(--color-text-3)', cursor: 'pointer', flex: 'none' }} onClick={() => setSearchQuery('')} />
                        )}
                      </div>

                      {/* Add student to this group (new or existing) */}
                      {!activeGroup.isIndividual && (
                        <div style={{ position: 'relative', flex: 'none' }}>
                          <button
                            onClick={() => setRosterAddMenu(v => !v)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                              background: 'var(--grad-purple)', border: 'none',
                              color: '#fff', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                            }}
                          >
                            <Plus size={14} strokeWidth={2.6} /> {t('Ученик')}
                          </button>
                          {rosterAddMenu && (
                            <>
                              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setRosterAddMenu(false)} />
                              <div style={{
                                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 41,
                                background: 'var(--color-bg-input)', borderRadius: 14, padding: 6, width: 220,
                                boxShadow: '0 12px 40px rgba(0,0,0,0.18)', border: '1px solid var(--color-border-soft)',
                              }}>
                                <RosterAddItem
                                  title={t('Новый ученик')} subtitle={t('создать и выдать логин')}
                                  onClick={() => { setRosterAddMenu(false); setShowAddStudent(true) }}
                                />
                                <RosterAddItem
                                  title={t('Существующий')} subtitle={t('перенести из другой группы / 1:1')}
                                  onClick={() => { setRosterAddMenu(false); setAddToGroupTarget(activeGroup.id) }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <ScrollFadeTable>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-3)' }}>
                        <Th label={t('Студент')}        sortKey="name"       currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                        <Th label={t('Посл. вход')}     sortKey="lastVisit"  currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                        <Th label={t('ДЗ')}             sortKey="hwScore"    currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label={t('Тест')}           sortKey="testScore"  currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label={t('Пробник')}        sortKey="trialScore"   currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label={t('Посещ.')}         sortKey="attendance"   currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label={t('Посл. оплата')}   sortKey="lastPayment"  currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label={t('Долг')}           sortKey="debt"         currentKey={sortKey} dir={sortDir} onSort={handleSort} right last />
                      </tr>
                    </thead>
                    <tbody>
                      {groupStudents.map((student, i) => {
                        const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
                        const isSelected = student.id === activeStudentId
                        const colBg = (key: SortKey) =>
                          sortKey === key ? { background: 'rgba(255,255,255,0.035)' } : {}
                        return (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.24, delay: i * 0.04 }}
                            onClick={() => setActiveStudentId(isSelected ? null : student.id)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? `${activeGroup.color}12` : 'transparent',
                              borderLeft: `3px solid ${isSelected ? activeGroup.color : 'transparent'}`,
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)'
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                            }}
                          >
                            {/* Name */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', ...colBg('name') }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                                  background: activeGroup.color,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700, color: '#fff',
                                }}>
                                  {initials}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                                  {student.name}
                                </span>
                              </div>
                            </td>
                            {/* Last visit */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap', ...colBg('lastVisit') }}>
                              {student.lastVisit}
                            </td>
                            {/* Scores */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', ...colBg('hwScore') }}>
                              <ScorePill value={student.hwScore} />
                            </td>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', ...colBg('testScore') }}>
                              <ScorePill value={student.testScore} />
                            </td>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', ...colBg('trialScore') }}>
                              <ScorePill value={student.trialScore} />
                            </td>
                            {/* Attendance */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', ...colBg('attendance') }}>
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: student.attendance >= 90 ? 'var(--color-green-text)' : student.attendance >= 70 ? 'var(--color-text-2)' : 'var(--color-red-text)',
                              }}>
                                {student.attendance}%
                              </span>
                            </td>
                            {/* Last payment */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', ...colBg('lastPayment') }}>
                              <span style={{ fontSize: 12, color: student.lastPayment ? 'var(--color-muted)' : 'var(--color-text-4)' }}>
                                {student.lastPayment
                                  ? new Date(student.lastPayment).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                  : '—'}
                              </span>
                            </td>
                            {/* Debt */}
                            <td style={{ padding: '11px 24px 11px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'center', ...colBg('debt') }}>
                              {student.debt != null && student.debt > 0 ? (
                                <span style={{
                                  fontSize: 12, fontWeight: 700,
                                  color: 'var(--color-red-text)',
                                  background: 'var(--color-red-soft)',
                                  border: '1px solid var(--color-red)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                }}>
                                  {student.debt.toLocaleString('ru-RU')} ₽
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>—</span>
                              )}
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </ScrollFadeTable>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!activeGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)',
            }}
          >
            <Users size={36} strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-muted)' }}>{t('Выберите группу')}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{t('чтобы увидеть список студентов')}</div>
          </motion.div>
        )}
      </div>

      {/* Mini student panel */}
      <AnimatePresence>
        {activeStudentId && activeStudent && activeStudentGroup && (
          <motion.div
            key="student-panel"
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 332, zIndex: 10, display: 'flex', flexDirection: 'column' }}
          >
            <StudentPanel
              student={activeStudent}
              group={activeStudentGroup}
              onClose={() => setActiveStudentId(null)}
              onDelete={async () => {
                await deleteStudent(activeStudentId)
                setActiveStudentId(null)
              }}
              onOpenFullCard={() => openStudentDashboard(activeStudentId, activeStudentGroup.id)}
              onAddHomework={() => openHomeworkCreate(activeStudentId)}
              onSaveComment={async (text) => { await updateStudent(activeStudentId, { comment: text }) }}
              siblingCards={siblingCards}
              onAddCard={addCardForActive}
              onRemoveCard={async (groupId) => {
                // Снятие направления, на котором стоим: карточки не станет, так
                // что уводим панель на соседнее (или закрываем, если его нет).
                const wasActive = groupId === activeStudentGroup.id
                const next = siblingCards[0]?.id
                await deleteGroup(groupId)
                if (wasActive) {
                  if (next) openSiblingCard(next)
                  else { setActiveStudentId(null); setSelectedGroupId(null) }
                }
              }}
              onOpenCard={openSiblingCard}
              onAddToGroup={regularGroups.length > 0 ? () => setAddToGroupForStudent(true) : undefined}
              onResetPassword={async () => {
                // Real password reset: the Edge Function changes the actual Supabase
                // Auth password (needs service_role) and mirrors it into temp_password.
                const { data, error } = await supabase.functions.invoke('reset-student-password', {
                  body: { studentId: activeStudentId },
                })
                if (error || !data?.password) {
                  const msg = (data as { error?: string } | null)?.error
                  throw new Error(msg || t('Не удалось сбросить пароль'))
                }
                return data.password as string
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddGroup && (
          <AddGroupModal
            onClose={() => { setShowAddGroup(false); clearDrafts('groups.addGroup.') }}
            onSave={async (g, courseId) => {
              const { data } = await addGroup(g)
              if (data && courseId) await bindGroupToCourse(data.id, courseId)
            }}
          />
        )}
        {showAddStudentPicker && (
          <AddStudentTypePicker
            groups={regularGroups}
            hasPeople={people.length > 0}
            onPickGroup={() => { setShowAddStudentPicker(false); setShowAddStudent(true) }}
            onPickIndividual={() => { setShowAddStudentPicker(false); setShowAddIndividual(true) }}
            onPickExisting={() => { setShowAddStudentPicker(false); setShowExistingIndiv(true) }}
            onClose={() => setShowAddStudentPicker(false)}
          />
        )}
        {showAddStudent && (
          <AddStudentModal
            groups={regularGroups}
            initialGroupId={selectedGroupId}
            onClose={() => { setShowAddStudent(false); clearDrafts('groups.addStudent.') }}
            onSave={async (groupId, s) => {
              const { inviteToken, studentId } = await addStudentToGroup(groupId, s)
              return { inviteToken: inviteToken ?? null, studentId: studentId ?? null }
            }}
          />
        )}
        {showAddIndividual && (
          <AddIndividualStudentModal
            onClose={() => { setShowAddIndividual(false); clearDrafts('groups.addIndiv.') }}
            onPickExisting={people.length > 0 ? () => { setShowAddIndividual(false); setShowExistingIndiv(true) } : undefined}
            onSave={async (s) => {
              const result = await addIndividualStudent(s as Parameters<typeof addIndividualStudent>[0])
              return { inviteToken: result.inviteToken, studentId: result.studentId ?? null, groupId: result.groupId ?? null }
            }}
          />
        )}
        {showExistingIndiv && (
          <AddExistingIndividualModal
            people={people}
            subjectOptions={Object.keys(SUBJECT_ICONS)}
            onCreate={createIndivForExisting}
            onClose={() => setShowExistingIndiv(false)}
          />
        )}
        {addToGroupTargetGroup && (
          <PickStudentModal
            targetGroup={addToGroupTargetGroup}
            people={people}
            existingKeys={existingKeysForGroup(addToGroupTargetGroup.id)}
            busy={enrolling}
            onPick={(person) => enrollExisting(addToGroupTargetGroup.id, person)}
            onClose={() => setAddToGroupTarget(null)}
          />
        )}
        {addToGroupForStudent && activeStudent && (
          <PickGroupModal
            studentName={activeStudent.name}
            groups={regularGroups}
            memberGroupIds={activeStudentMemberGroupIds}
            busy={enrolling}
            onPick={(groupId) => enrollExisting(groupId, {
              name: activeStudent.name, phone: activeStudent.phone, telegramLink: activeStudent.telegramLink,
              parentContact: activeStudent.parentContact, desiredScore: activeStudent.desiredScore,
              paymentAmount: activeStudent.paymentAmount, email: activeStudent.email,
              tempPassword: activeStudent.tempPassword, authUserId: activeStudent.authUserId,
              personId: activeStudent.personId,
            })}
            onClose={() => setAddToGroupForStudent(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
