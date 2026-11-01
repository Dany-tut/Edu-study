import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from '../icons/appIcons'
import { useGroups, useAttendance, useGroupLessons, useLessonRoster, type AttendanceRecord } from '../../lib/useGroups'
import { useEventAttendance } from '../../lib/useEventAttendance'
import { useT, useTc } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'
import TeacherSelect from './TeacherSelect'
import TeacherSaveButton from './TeacherSaveButton'
import { Alert } from '../Alert'
import { AvatarPhotoFill } from '../AvatarPhoto'

const GRADE_OPTIONS = [null, 1, 2, 3, 4, 5] as const
type Grade = 1 | 2 | 3 | 4 | 5 | null

function GradeButton({ value, selected, onMouseDown, onMouseEnter }: {
  value: Grade; selected: boolean
  onMouseDown: () => void
  onMouseEnter: () => void
}) {
  if (value === null) return null
  const colors: Record<number, { bg: string; color: string; selBg: string }> = {
    1: { bg: 'var(--color-red-soft)', color: 'var(--color-red-text)', selBg: 'var(--color-red-text)' },
    2: { bg: 'var(--color-red-soft)', color: 'var(--color-red-text)', selBg: 'var(--color-red-text)' },
    3: { bg: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)', selBg: '#e6a800' },
    4: { bg: 'var(--color-green-soft)', color: 'var(--color-green-text)', selBg: 'var(--color-green-text)' },
    5: { bg: 'var(--color-green-soft)', color: 'var(--color-green-text)', selBg: 'var(--color-green-text)' },
  }
  const c = colors[value]
  return (
    <button
      data-grade={value}
      onMouseDown={e => { e.preventDefault(); onMouseDown() }}
      onMouseEnter={onMouseEnter}
      style={{
        width: 32, height: 32, borderRadius: 9, border: selected ? 'none' : '1.5px solid transparent',
        background: selected ? c.selBg : c.bg,
        color: selected ? '#fff' : c.color,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background-color, color, border-color, box-shadow, opacity, transform 0.15s',
        outline: selected ? `2px solid ${c.selBg}` : 'none',
        outlineOffset: 1,
      }}
    >
      {value}
    </button>
  )
}

export default function LessonGradeModal({ groupId, onClose, initialLessonId, scheduleIds, eventRecords }: { groupId: string | null; onClose: () => void; initialLessonId?: string; scheduleIds?: string[]; eventRecords?: Record<string, AttendanceRecord[]> }) {
  const t = useT()
  const { tc, tn } = useTc()
  const { groups } = useGroups()
  const { saveLesson, records, loading: journalLoading } = useAttendance(groupId)
  const lessons = useGroupLessons(groupId, scheduleIds)

  // Which lesson are we grading? When opened from the "журнал не заполнен"
  // banner we preselect that lesson; otherwise the most recent scheduled one.
  const [lessonId, setLessonId] = useState<string>(initialLessonId ?? '')
  const selectedLesson = lessons.find(l => l.id === lessonId) ?? lessons[0] ?? null
  useEffect(() => {
    if (!lessonId && lessons.length) setLessonId(lessons[0].id)
  }, [lessons, lessonId])

  // Roster + accent derive from the chosen lesson, not the page filter — so
  // grading works even from the "Все группы" view.
  const groupStudents = useLessonRoster(selectedLesson)
  const lessonGroup = selectedLesson?.groupId ? groups.find(g => g.id === selectedLesson.groupId) ?? null : null

  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isoDate = selectedLesson?.date ?? todayIso
  const dateLabel = (() => {
    const [, m, d] = isoDate.split('-')
    return `${d}.${m}`
  })()
  const lessonTitle = selectedLesson?.title ?? ''
  const legacyUnambiguous = new Set(lessons.filter(l => l.date === isoDate && l.title === lessonTitle && l.groupId === selectedLesson?.groupId && l.studentId === selectedLesson?.studentId).map(l => l.timeStart)).size === 1

  const [present, setPresent] = useState<Record<string, boolean | null>>({})
  const eventAttendance = useEventAttendance(selectedLesson?.id)
  const attendanceLoading = eventAttendance.loading || journalLoading
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Pre-populate grades & attendance from saved records when lesson changes.
  useEffect(() => {
    if (!isoDate || groupStudents.length === 0 || attendanceLoading) return
    const dateRecords = eventRecords ? eventRecords[selectedLesson?.id ?? ''] ?? [] : records.filter(r => legacyUnambiguous && r.lessonDate === isoDate && r.lessonTitle === lessonTitle)
    const newPresent: Record<string, boolean | null> = {}
    const newGrades: Record<string, Grade> = {}
    for (const r of dateRecords) {
      newPresent[r.studentId] = r.present
      if (r.grade != null) newGrades[r.studentId] = r.grade as Grade
    }
    setPresent({ ...newPresent, ...eventAttendance.marks })
    setGrades(newGrades)
  }, [selectedLesson?.id, isoDate, lessonTitle, legacyUnambiguous, groupStudents.length, records, attendanceLoading, eventAttendance.marks, eventRecords])

  const accent = lessonGroup?.color ?? 'var(--color-accent)'
  const headerName = selectedLesson?.scopeName || lessonGroup?.name || t('Все группы')

  const isPresent = (id: string) => present[id] === true

  // Drag-to-grade: свободное рисование — курсор определяет и строку и оценку.
  const isDragging = useRef(false)
  function stopDrag() { isDragging.current = false }
  function handleDragMove(e: React.MouseEvent) {
    if (!isDragging.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    if (!el) return
    const btn = el.closest('[data-grade]') as HTMLElement | null
    const row = el.closest('[data-student-id]') as HTMLElement | null
    if (!btn || !row) return
    const g = Number(btn.dataset.grade) as Grade
    const sid = row.dataset.studentId!
    if (!g || !isPresent(sid)) return
    setGrades(prev => prev[sid] === g ? prev : ({ ...prev, [sid]: g }))
  }

  async function handleSave() {
    if (!selectedLesson || groupStudents.length === 0 || attendanceLoading || eventAttendance.error) return
    setSaveError(null)
    try {
      const entries = groupStudents.map(s => ({
        studentId: s.id,
        present: present[s.id] ?? null,
        grade: Object.prototype.hasOwnProperty.call(grades, s.id) ? grades[s.id] ?? null : undefined,
      }))
      await saveLesson(selectedLesson.groupId, isoDate, entries, lessonTitle, selectedLesson.id)
      setSaved(true)
      setTimeout(onClose, 900)
    } catch (e: any) {
      setSaveError(e?.message ?? t('Ошибка сохранения'))
    }
  }

  const presentCount = groupStudents.filter(s => isPresent(s.id)).length
  const gradedCount = groupStudents.filter(s => grades[s.id] != null).length

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={saved ? { opacity: 0, scale: 0.96, y: -8 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'rgba(var(--glass-rgb), 0.97)',
          backdropFilter: 'var(--blur-solid)',
          borderRadius: 22,
          boxShadow: 'var(--shadow-modal-lg)',
          width: 560, maxWidth: 'calc(100vw - 24px)', maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-border-soft)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{headerName}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>{dateLabel}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Оценки за урок')}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
              {t('Присутствовало')} {presentCount} {t('из')} {groupStudents.length} · {t('оценок выставлено')} {gradedCount}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 10, border: 'none',
              background: 'var(--color-bg)', color: 'var(--color-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Lesson picker — grades & attendance are recorded against this lesson */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-border-soft)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, display: 'block', marginBottom: 6 }}>
            {t('УРОК')}
          </span>
          {lessons.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              {t('Нет запланированных уроков')}
            </div>
          ) : (
            <TeacherSelect
              value={lessonId}
              onChange={setLessonId}
              placeholder={t('Выберите урок')}
              options={lessons.map(l => {
                const [, m, d] = l.date.split('-')
                const titlePart = tc(l.title) || t('Урок')
                const scopePart = l.scopeName ? ` · ${l.scopeName}` : ''
                return { value: l.id, label: `${d}.${m}${l.timeStart ? ` · ${l.timeStart.slice(0, 5)}` : ''} · ${titlePart}${scopePart}` }
              })}
            />
          )}
        </div>

        <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" disabled={attendanceLoading || eventAttendance.error} onClick={() => setPresent(Object.fromEntries(groupStudents.map(s => [s.id, true])))} style={btn('S', 'secondary')}>{t('Все присутствовали')}</button>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Без отметки — не значит пропуск. Можно заполнить позже.')}</span>
        </div>
        {eventAttendance.error && <Alert tone="danger" text={t('Не удалось загрузить посещаемость. Откройте журнал ещё раз.')} />}
        {/* Column headers */}
        <div style={{
          padding: '8px 24px',
          display: 'grid', gridTemplateColumns: '1fr 72px 1fr',
          background: 'var(--color-bg-2)',
          borderBottom: '1px solid var(--color-border-soft)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3 }}>{t('СТУДЕНТ')}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, textAlign: 'center' }}>{t('ПРИСУТСТВИЕ')}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, paddingLeft: 16 }}>{t('ОЦЕНКА ЗА УРОК')}</span>
        </div>

        {/* Student list — continuous drag tracking via mousemove + elementFromPoint */}
        <div
          style={{ overflowY: 'auto', scrollbarGutter: 'stable', flex: 1, userSelect: 'none' }}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onMouseMove={handleDragMove}
        >
          {groupStudents.map((student, si) => {
            const initials = tn(student.name).split(' ').map(p => p[0]).join('').slice(0, 2)
            const studentPresent = isPresent(student.id)
            const unmarked = present[student.id] == null || attendanceLoading

            return (
              <motion.div
                key={student.id}
                data-student-id={student.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: si * 0.03 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 72px 1fr',
                  alignItems: 'center',
                  padding: '10px 24px',
                  borderBottom: '1px solid var(--color-border-soft)',
                  background: unmarked || studentPresent ? 'transparent' : 'rgba(192,48,58,0.025)',
                  transition: 'background 0.22s',
                }}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    position: 'relative', width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: studentPresent ? 'var(--color-avatar-bg)' : 'var(--color-bg-5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    // У отсутствующего фон светло-серый — белые инициалы на нём пропадали.
                    fontSize: 10, fontWeight: 700, color: studentPresent ? '#fff' : 'var(--color-text-3)',
                    transition: 'background 0.22s',
                  }}>
                    {initials}
                    <AvatarPhotoFill path={student.avatarPath} />
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: unmarked || studentPresent ? 'var(--color-text)' : '#A0A0A8',
                    transition: 'color 0.22s',
                  }}>
                    {tn(student.name)}
                  </span>
                </div>

                {/* Attendance toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    disabled={attendanceLoading || eventAttendance.error}
                    aria-label={`${tn(student.name)}: ${t(unmarked ? 'Без отметки' : studentPresent ? 'Присутствовал' : 'Пропущен')}`}
                    onClick={() => {
                      const next = unmarked ? true : studentPresent ? false : null
                      setPresent(p => ({ ...p, [student.id]: next }))
                      // Clearing presence drops any grade — can't grade an absentee.
                      if (!next) setGrades(g => ({ ...g, [student.id]: null }))
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: unmarked ? 'var(--color-bg-4)' : studentPresent ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color, color, border-color, box-shadow, opacity, transform 0.15s',
                    }}
                  >
                    {unmarked ? <span style={{ color: 'var(--color-muted)' }}>—</span> : studentPresent
                      ? <Check size={14} strokeWidth={2.5} color="#1a7a3f" />
                      : <X size={14} strokeWidth={2.5} color="#c0303a" />
                    }
                  </button>
                </div>

                {/* Grade selector with drag-to-grade support */}
                <div
                  style={{
                    display: 'flex', gap: 4, paddingLeft: 16,
                    opacity: studentPresent ? 1 : 0.3, pointerEvents: studentPresent ? 'auto' : 'none',
                    transition: 'opacity 0.22s',
                  }}
                >
                  {([1, 2, 3, 4, 5] as const).map(g => (
                    <GradeButton
                      key={g} value={g}
                      selected={grades[student.id] === g}
                      onMouseDown={() => {
                        isDragging.current = true
                        setGrades(prev => ({ ...prev, [student.id]: prev[student.id] === g ? null : g }))
                      }}
                      onMouseEnter={() => {}}
                    />
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
        }}>
          {saveError && (
            <Alert tone="danger" text={saveError} style={{ flex: 1, minWidth: 0, marginRight: 14 }} />
          )}
          <button
            onClick={onClose}
            style={btn('M', 'secondary')}
          >
            {t('Отмена')}
          </button>
          <TeacherSaveButton
            label={t('Сохранить')} savedLabel={t('Сохранено')}
            saved={saved} disabled={!selectedLesson || !groupStudents.length || attendanceLoading || eventAttendance.error} onClick={handleSave}
          />
        </div>
      </motion.div>
    </div>
  )
}
