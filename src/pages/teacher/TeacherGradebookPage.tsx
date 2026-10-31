import { LoopTextIcon } from '../../components/icons/LoopIcon'
import { Check as LoopMarkCheck, X as LoopMarkX } from '../../components/icons/appIcons'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Check } from '../../components/icons/appIcons'
import type { TabConfig } from '../../components/teacher/GroupStrip'
import type { Group, Student } from '../../data/teacherMockData'
import { expandToPerson } from '../../lib/personGroups'
import { useTeacher } from '../../store/teacherStore'
import GroupStrip from '../../components/teacher/GroupStrip'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import { Alert, AlertStack } from '../../components/Alert'
import { useGroups, useAllStudents, reloadAllStudents, useAttendance, useGroupLessons, useLessonRoster, useJournalPending } from '../../lib/useGroups'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { useT, useTc } from '../../lib/i18n'
import { AvatarPhotoFill } from '../../components/AvatarPhoto'
import { btn } from '../../lib/pillStyles'
import { supabase } from '../../lib/supabase'
import { average, studentJournalStats, journalLessonRef, journalWorkKind, journalResult, type JournalAttendance, type JournalProgress, type JournalLesson } from '../../lib/gradebookStats'
import type { AttendanceRecord } from '../../lib/useGroups'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] },
})

function ScorePill({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>—</span>
  const pct = value / 100
  const color = pct >= 0.8 ? 'var(--color-green-text)' : pct >= 0.6 ? 'var(--color-yellow-text)' : 'var(--color-red-text)'
  const bg = pct >= 0.8 ? 'var(--color-green-soft)' : pct >= 0.6 ? 'var(--color-yellow-soft)' : 'var(--color-red-soft)'
  return (
    <span style={{
      display: 'inline-block', minWidth: 34,
      fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums',
      background: bg, borderRadius: 7, padding: '2px 8px', textAlign: 'center',
    }}>
      {value}
    </span>
  )
}

// Avatar/accent colour for a student, resolved from their own group.
function useGroupColor(gid: string | null) {
  const { groups } = useGroups()
  return gid ? (groups.find(g => g.id === gid)?.color ?? 'var(--color-purple)') : 'var(--color-purple)'
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
        background: 'linear-gradient(to right, var(--color-surface), transparent)',
        opacity: fadeLeft ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 72,
        pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(to left, var(--color-surface), transparent)',
        opacity: fadeRight ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      border: '1px solid var(--color-border-glass)',
      borderRadius: 22,
      boxShadow: 'var(--shadow-sm-page)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  )
}

// ─── Attendance tab ────────────────────────────────────────────────────────────
function StudentName({ student }: { student: Student }) {
  const t = useT()
  const { tn } = useTc()
  const open = useTeacher(s => s.openStudentDashboard)
  return <button type="button" onClick={() => open(student.id, student.groupId)} style={{ border: 0, background: 'transparent', color: 'var(--color-accent)', font: 'inherit', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
    {tn(student.name) || student.email || t('Без имени')}
  </button>
}

function AttendanceTab({ students: groupStudents, records }: { students: Student[]; records: AttendanceRecord[] }) {
  const t = useT()
  const { tn } = useTc()

  // Derive sorted unique dates from real records
  const dates = Array.from(new Set(records.map(r => r.lessonDate))).sort()

  // Format 'YYYY-MM-DD' → 'DD.MM'
  function fmtDate(iso: string) {
    const [, m, d] = iso.split('-')
    return `${d}.${m}`
  }

  return (
    <Card>
      {dates.length === 0 && groupStudents.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
          {t('Нет данных — выберите группу и отметьте посещаемость')}
        </div>
      ) : (
        <ScrollFadeTable>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-2)' }}>
                <th style={{
                  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                  color: 'var(--color-text-3)', borderBottom: '1px solid var(--color-border-soft)',
                  position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, whiteSpace: 'nowrap',
                }}>
                  {t('Студент')}
                </th>
                {dates.map(d => (
                  <th key={d} style={{
                    padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700,
                    color: 'var(--color-text-3)', letterSpacing: 0.2, borderBottom: '1px solid var(--color-border-soft)',
                    whiteSpace: 'nowrap', minWidth: 44,
                  }}>
                    {fmtDate(d)}
                  </th>
                ))}
                <th style={{
                  padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                  color: 'var(--color-accent)', borderBottom: '1px solid var(--color-border-soft)', whiteSpace: 'nowrap',
                }}>
                  {t('Итого')}
                </th>
              </tr>
            </thead>
            <tbody>
              {groupStudents.map((student) => {
                const initials = tn(student.name).split(' ').map(p => p[0]).join('').slice(0, 2)
                const studentRecords = records.filter(r => r.studentId === student.id)
                const presentCount = studentRecords.filter(r => r.present).length
                const pct = studentRecords.length ? Math.round((presentCount / studentRecords.length) * 100) : null

                return (
                  <tr
                    key={student.id}
                    style={{ borderBottom: '1px solid var(--color-border-soft)' }}
                  >
                    <td style={{
                      padding: '10px 16px', position: 'sticky', left: 0,
                      background: 'rgba(var(--glass-rgb), 0.95)', zIndex: 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          position: 'relative', width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--color-avatar-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#fff',
                        }}>
                          {initials}
                          <AvatarPhotoFill path={student.avatarPath} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                          <StudentName student={student} />
                        </span>
                      </div>
                    </td>
                    {dates.map(date => {
                      const rec = studentRecords.find(r => r.lessonDate === date)
                      const present = rec?.present
                      return (
                        <td key={date} style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {rec === undefined ? (
                            <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>—</span>
                          ) : present ? (
                            <div style={{
                              width: 22, height: 22, borderRadius: 7, margin: '0 auto',
                              background: 'var(--color-green-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12,
                            }}><LoopTextIcon icon={LoopMarkCheck}>✓</LoopTextIcon></div>
                          ) : (
                            <div style={{
                              width: 22, height: 22, borderRadius: 7, margin: '0 auto',
                              background: 'var(--color-red-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, color: 'var(--color-red-text)',
                            }}><LoopTextIcon icon={LoopMarkX}>✗</LoopTextIcon></div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {pct === null ? (
                        <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>—</span>
                      ) : (
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: pct >= 90 ? 'var(--color-green-text)' : pct >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)',
                        }}>
                          {pct}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ScrollFadeTable>
      )}
    </Card>
  )
}

// ─── Scores tab ────────────────────────────────────────────────────────────────
function CourseHistory({ students, progress, lessons }: { students: Student[]; progress: JournalProgress[]; lessons: JournalLesson[] }) {
  const t = useT()
  const { tn } = useTc()
  const metadata = new Map(lessons.map(l => [l.short_id, l]))
  const statusLabels: Record<string, string> = { completed: 'Принято', submitted: 'Сдано', returned: 'На доработке', current: 'В процессе', locked: 'Не начат', unviewed: 'Не просмотрен' }
  const kindLabels = { course: 'Урок курса', homework: 'ДЗ', hard: 'Сложная часть', video: 'Запись урока' }
  return <section style={{ padding: 16, borderTop: '1px solid var(--color-border-soft)' }}>
    <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{t('Прогресс по урокам курса')}</h3>
    {students.map(student => {
      const records = progress.filter(r => r.student_id === student.id && !r.lesson_ref.startsWith('hw-') && journalWorkKind(r.lesson_ref))
        .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '') || a.lesson_ref.localeCompare(b.lesson_ref))
      return <details key={student.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{tn(student.name) || student.email || t('Без имени')} · {records.length ? t('История прогресса') : t('Пока нет прогресса по курсу')}</summary>
        {records.length > 0 && <ScrollFadeTable><table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 12, textAlign: 'left' }}>
          <thead><tr>{['Урок', 'Тип работы', 'Статус', 'Результат', 'Обновлено'].map(label => <th key={label} style={{ padding: 8, color: 'var(--color-text-3)' }}>{t(label)}</th>)}</tr></thead>
          <tbody>{records.map(row => {
            const kind = journalWorkKind(row.lesson_ref)!
            const lesson = metadata.get(journalLessonRef(row.lesson_ref))
            const result = journalResult(row)
            const videoDone = result.videoCompleted
            const label = kind === 'video' ? (videoDone ? 'Просмотрено' : 'Нет отметки о просмотре') : row.status === 'returned' ? 'На доработке' : result.pending ? 'На проверке' : statusLabels[row.status] ?? row.status
            const date = row.updated_at ? new Date(row.updated_at) : null
            return <tr key={row.lesson_ref} style={{ borderTop: '1px solid var(--color-border-soft)' }}>
              <td style={{ padding: 8 }}>{lesson?.title || journalLessonRef(row.lesson_ref)}</td>
              <td style={{ padding: 8 }}>{t(kind === 'course' && row.lesson_ref.endsWith('~rec') ? 'ДЗ к записи' : kind === 'course' && lesson?.kind === 'test' ? 'Тест курса' : kindLabels[kind])}{row.lesson_ref.includes('~') && !row.lesson_ref.includes('~rec') ? ` · ${t('Дополнительное ДЗ')}` : ''}</td>
              <td style={{ padding: 8 }}>{t(label)}</td>
              <td style={{ padding: 8 }}>
                {kind === 'video' ? '—' : kind === 'hard' ? row.status === 'completed' && row.score !== null ? `${row.score} ${t('баллов')}` : '—'
                  : result.percent === null ? '—' : <span>{result.percent}%{result.pending ? ` · ${t('Предварительный результат')}` : ''}</span>}
                {result.points.map((score, i) => <div key={i} style={{ marginTop: 4, color: 'var(--color-text-3)' }}>{t('Тестли')}: {score.got} / {score.max}{score.pending ? ` · ${t('На проверке')}` : ''}</div>)}
              </td>
              <td style={{ padding: 8, whiteSpace: 'nowrap' }}>{date && Number.isFinite(date.getTime()) ? date.toLocaleString() : '—'}</td>
            </tr>
          })}</tbody>
        </table></ScrollFadeTable>}
      </details>
    })}
  </section>
}

function ScoresTab({ students, attendance, progress, lessons }: { students: Student[]; attendance: JournalAttendance[]; progress: JournalProgress[]; lessons: JournalLesson[] }) {
  const t = useT()
  const { groups } = useGroups()
  const rows = students.map(student => ({ student, stats: studentJournalStats(student.id, attendance, progress) }))
  const columns = ['Ученик', 'Группа', 'ДЗ, %', 'Результат курса, %', 'Сдано в курсе', 'Сложная часть', 'Принято', 'Сдано', 'На доработке', 'Тесты', 'Пробник', 'Цель', 'Посещ.', 'Занятий', 'Оценка за урок']
  const cell: React.CSSProperties = { padding: '10px 16px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border-soft)' }
  return <Card><ScrollFadeTable><table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead><tr style={{ background: 'var(--color-bg-2)' }}>{columns.map((label, i) => <th key={label} style={{ ...cell, fontSize: 11, color: 'var(--color-text-3)', ...(i === 0 ? { position: 'sticky', left: 0, zIndex: 1, background: 'var(--color-surface)', textAlign: 'left' } : {}) }}>{t(label)}</th>)}</tr></thead>
    <tbody>{rows.map(({ student, stats }) => <tr key={student.id}>
      <td style={{ ...cell, position: 'sticky', left: 0, zIndex: 1, background: 'var(--color-surface)', textAlign: 'left' }}><StudentName student={student} /></td>
      <td style={cell}>{groups.find(g => g.id === student.groupId)?.name || t('Без группы')}</td>
      <td style={cell}><ScorePill value={stats.hwScore} /></td>
      <td style={cell}><ScorePill value={stats.courseScore} /></td>
      <td style={cell}>{stats.courseSubmitted}</td>
      <td style={cell}>{stats.hardTotal ? `${stats.hardCompleted} / ${stats.hardTotal}` : '—'}</td>
      <td style={cell}>{stats.completed}</td><td style={cell}>{stats.pending}</td><td style={cell}>{stats.returned}</td>
      <td style={cell}><ScorePill value={student.testScore} /></td>
      <td style={cell}><ScorePill value={student.trialScore} /></td>
      <td style={cell}>{student.desiredScore || '—'}</td>
      <td style={cell}>{stats.attendance === null ? '—' : `${stats.attendance}%`}</td>
      <td style={cell}>{stats.lessons}</td><td style={cell}>{stats.grade ?? '—'}</td>
    </tr>)}</tbody>
    {rows.length > 0 && <tfoot><tr style={{ background: 'var(--color-purple-soft)' }}>
      <td style={cell}>{t('Среднее')}</td><td style={cell}>—</td>
      <td style={cell}><ScorePill value={average(rows.map(r => r.stats.hwScore))} /></td>
      <td style={cell}><ScorePill value={average(rows.map(r => r.stats.courseScore))} /></td>
      <td colSpan={2} style={cell}>—</td>
      <td colSpan={3} style={cell}>—</td>
      <td style={cell}><ScorePill value={average(students.map(s => s.testScore))} /></td>
      <td style={cell}><ScorePill value={average(students.map(s => s.trialScore))} /></td>
      <td style={cell}>—</td><td style={cell}>{average(rows.map(r => r.stats.attendance)) === null ? '—' : `${average(rows.map(r => r.stats.attendance))}%`}</td>
      <td style={cell}>—</td><td style={cell}>{average(rows.map(r => r.stats.grade)) ?? '—'}</td>
    </tr></tfoot>}
  </table></ScrollFadeTable>
    <p style={{ padding: '0 16px', fontSize: 12, color: 'var(--color-text-3)' }}>{t('Результат курса — средний процент по сданным и принятым работам. Ожидающие ручной проверки и возвращённые работы не входят в среднее. Счётчики статусов включают ДЗ и работы курса.')}</p>
    <CourseHistory students={students} progress={progress} lessons={lessons} />
  </Card>
}

// ─── Lesson grading modal ──────────────────────────────────────────────────────
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

function LessonGradeModal({ groupId, onClose, initialLessonId }: { groupId: string | null; onClose: () => void; initialLessonId?: string }) {
  const t = useT()
  const { tc, tn } = useTc()
  const { groups } = useGroups()
  const { saveLesson, records } = useAttendance(groupId)
  const lessons = useGroupLessons(groupId)

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

  const [present, setPresent] = useState<Record<string, boolean>>({})
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Pre-populate grades & attendance from saved records when lesson changes.
  useEffect(() => {
    if (!isoDate || groupStudents.length === 0) return
    const dateRecords = records.filter(r => r.lessonDate === isoDate)
    if (dateRecords.length === 0) return
    const newPresent: Record<string, boolean> = {}
    const newGrades: Record<string, Grade> = {}
    for (const r of dateRecords) {
      newPresent[r.studentId] = r.present
      if (r.grade != null) newGrades[r.studentId] = r.grade as Grade
    }
    setPresent(newPresent)
    setGrades(newGrades)
  }, [isoDate, groupStudents.length, records.length])

  const accent = lessonGroup?.color ?? 'var(--color-accent)'
  const headerName = selectedLesson?.scopeName || lessonGroup?.name || t('Все группы')

  const isPresent = (id: string) => present[id] ?? true

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
    if (!selectedLesson || groupStudents.length === 0) return
    setSaveError(null)
    try {
      const entries = groupStudents.map(s => ({
        studentId: s.id,
        present: isPresent(s.id),
        grade: grades[s.id] ?? null,
      }))
      await saveLesson(selectedLesson.groupId, isoDate, entries, lessonTitle)
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
          width: 560, maxHeight: '82vh',
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
              {t('Нет уроков в расписании — оценки запишутся на сегодня')} ({dateLabel})
            </div>
          ) : (
            <TeacherSelect
              value={lessonId}
              onChange={setLessonId}
              placeholder={t('Выберите урок')}
              options={lessons.map(l => {
                const [, m, d] = l.date.split('-')
                const titlePart = l.title && l.title !== String(l.lessonNumber) ? ` — ${tc(l.title)}` : ''
                const scopePart = l.scopeName ? ` · ${l.scopeName}` : ''
                return { value: l.id, label: `${d}.${m} · ${t('Урок')} ${l.lessonNumber}${titlePart}${scopePart}` }
              })}
            />
          )}
        </div>

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
                  background: studentPresent ? 'transparent' : 'rgba(192,48,58,0.025)',
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
                    color: studentPresent ? 'var(--color-text)' : '#A0A0A8',
                    transition: 'color 0.22s',
                  }}>
                    {tn(student.name)}
                  </span>
                </div>

                {/* Attendance toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      const next = !studentPresent
                      setPresent(p => ({ ...p, [student.id]: next }))
                      // Clearing presence drops any grade — can't grade an absentee.
                      if (!next) setGrades(g => ({ ...g, [student.id]: null }))
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: studentPresent ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color, color, border-color, box-shadow, opacity, transform 0.15s',
                    }}
                  >
                    {studentPresent
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
            saved={saved} onClick={handleSave}
          />
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TeacherGradebookPage() {
  const t = useT()
  const { tc } = useTc()
  const [activeTab, setActiveTab] = useState<'attendance' | 'scores'>('attendance')
  const activeGroupId = useTeacher(s => s.selectedGroupId)
  const setActiveGroupId = useTeacher(s => s.setSelectedGroupId)
  const pendingGradebookLessonId = useTeacher(s => s.pendingGradebookLessonId)
  const clearPendingGradebookLesson = useTeacher(s => s.clearPendingGradebookLesson)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  // When opening the modal from the "журнал не заполнен" banner we preselect a lesson.
  const [gradeLessonId, setGradeLessonId] = useState<string | undefined>(undefined)
  const [journalReloadKey, setJournalReloadKey] = useState(0)
  const { groups } = useGroups()
  const allStudents = useAllStudents()
  const students = activeGroupId ? allStudents.filter(s => s.groupId === activeGroupId) : allStudents
  const studentIds = JSON.stringify(students.map(s => s.id).sort())
  const [journal, setJournal] = useState<{ attendance: JournalAttendance[]; progress: JournalProgress[]; lessons: JournalLesson[] } | null>(null)
  const [dataError, setDataError] = useState(false)
  useEffect(() => {
    let cancelled = false
    setJournal(null)
    setDataError(false)
    const ids: string[] = JSON.parse(studentIds)
    async function readAll(table: string, columns: string) {
      const rows: any[] = []
      // Page and chunk explicitly: PostgREST otherwise silently truncates at 1000 rows.
      for (let start = 0; start < ids.length; start += 100) {
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase.from(table).select(columns).in('student_id', ids.slice(start, start + 100)).order('student_id').order(table === 'lesson_attendance' ? 'lesson_date' : 'lesson_ref').range(offset, offset + 499)
          if (error) throw error
          rows.push(...(data ?? []))
          if (!data || data.length < 500) break
        }
      }
      return rows
    }
    Promise.all([
      readAll('lesson_attendance', 'student_id, lesson_date, present, grade'),
      readAll('lesson_progress', 'student_id, lesson_ref, status, score, attachments, updated_at'),
    ]).then(async ([attendance, progress]) => {
      if (cancelled) return
      const refs = [...new Set((progress as JournalProgress[]).filter(r => journalWorkKind(r.lesson_ref) && !r.lesson_ref.startsWith('hw-')).map(r => journalLessonRef(r.lesson_ref)))]
      const lessons: JournalLesson[] = []
      for (let start = 0; start < refs.length; start += 100) {
        if (cancelled) return
        const { data, error } = await supabase.from('lessons').select('short_id, title, kind').in('short_id', refs.slice(start, start + 100))
        if (error) throw error
        lessons.push(...(data ?? []))
      }
      if (!cancelled) setJournal({ attendance, progress, lessons })
    })
      .catch(() => { if (!cancelled) setDataError(true) })
    return () => { cancelled = true }
  }, [studentIds, journalReloadKey])
  useEffect(() => {
    const refresh = () => { void reloadAllStudents(); setJournalReloadKey(k => k + 1) }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  const regularGroups = groups.filter(g => !g.isIndividual)
  const individualGroups = groups.filter(g => g.isIndividual)
  const pendingJournals = useJournalPending(activeGroupId, journalReloadKey)
  // Sibling subject-groups of the selected 1:1 person (empty for regular groups).
  const personSubjects = expandToPerson(individualGroups, activeGroupId)
    .map(id => individualGroups.find(g => g.id === id))
    .filter((g): g is Group => !!g)
    .map(g => ({ groupId: g.id, subject: g.subject, icon: g.icon, color: g.color }))

  // If navigated here via a journal reminder, auto-open that specific lesson.
  useEffect(() => {
    if (pendingGradebookLessonId) {
      setGradeLessonId(pendingGradebookLessonId)
      setLessonModalOpen(true)
      clearPendingGradebookLesson()
    }
  }, [pendingGradebookLessonId, clearPendingGradebookLesson])

  function openJournalFor(p: { groupId: string | null; scheduleId: string }) {
    if (p.groupId) setActiveGroupId(p.groupId)
    setGradeLessonId(p.scheduleId)
    setLessonModalOpen(true)
  }
  function closeGradeModal() {
    setLessonModalOpen(false)
    setGradeLessonId(undefined)
    setJournalReloadKey(k => k + 1) // refresh the pending list after marking
  }

  const tabConfig: TabConfig = {
    tabs: [
      { id: 'attendance', label: t('Посещаемость') },
      { id: 'scores', label: t('Статистика') },
    ],
    activeTab,
    onTabChange: (id) => setActiveTab(id as 'attendance' | 'scores'),
    // Roster-style: first click selects the tab, clicking the active tab (hover shows ＋) opens the marking modal.
    onTabPlusClick: () => { setGradeLessonId(undefined); setLessonModalOpen(true) },
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Group strip: tab switcher on left + groups + 1:1 individuals */}
      <motion.div {...fadeUp(0.04)}>
        <GroupStrip
          mergePersons
          groups={regularGroups}
          individualGroups={individualGroups}
          selectedGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
          tabConfig={tabConfig}
        />
      </motion.div>

      {/* "Журнал не заполнен" — lessons that finished without attendance recorded */}
      <AlertStack
        items={pendingJournals.map(p => {
          const [, mm, dd] = p.date.split('-')
          return {
            id: p.scheduleId, tone: 'warning' as const,
            title: `${t('Журнал не заполнен')}:`,
            text: `${p.scopeName || tc(p.title) || t('Урок')} · ${dd}.${mm}${p.timeStart ? ` · ${p.timeStart}` : ''}${p.title && p.scopeName ? ` · ${tc(p.title)}` : ''}`,
            action: { label: t('Заполнить'), onClick: () => openJournalFor(p) },
          }
        })}
      />

      {/* Subject switcher — when a merged 1:1 person is selected, let the teacher
          flip between their subject journals (each subject is its own group). */}
      {personSubjects.length > 1 && (
        <motion.div {...fadeUp(0.06)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {personSubjects.map(s => {
            const active = s.groupId === activeGroupId
            return (
              <button
                key={s.groupId}
                onClick={() => setActiveGroupId(s.groupId)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  padding: '6px 12px', borderRadius: 10,
                  color: active ? '#fff' : s.color,
                  background: active ? s.color : s.color + '1E',
                  border: `1px solid ${active ? s.color : s.color + '3A'}`,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span>{s.icon}</span>{tc(s.subject)}
              </button>
            )
          })}
        </motion.div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" aria-pressed={!activeGroupId} onClick={() => setActiveGroupId(null)} style={btn('S', activeGroupId ? 'secondary' : 'primary')}>{t('Все ученики')}</button>
        <span style={{ color: 'var(--color-text-3)', fontSize: 13 }}>{t('Учеников')}: {students.length}</span>
      </div>
      {/* Export row */}
      <motion.div {...fadeUp(0.08)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }} />
        <button type="button" disabled={!journal && !dataError} onClick={() => { void reloadAllStudents(); setJournalReloadKey(k => k + 1) }} style={btn('S', 'secondary')}>
          {t('Обновить')}
        </button>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={btn('S', 'secondary')}
        >
          <Download size={14} strokeWidth={2} />
          {t('Экспорт CSV')}
        </motion.button>
      </motion.div>

      {/* Table — single smooth fade per selection (no per-row stagger = no jank) */}
      <motion.div
        key={`${activeTab}:${activeGroupId ?? 'all'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {dataError ? <div role="alert">{t('Не удалось загрузить статистику')} <button type="button" onClick={() => setJournalReloadKey(k => k + 1)}>{t('Повторить')}</button></div>
          : !journal ? <div role="status">{t('Загрузка…')}</div>
          : students.length === 0 ? <Card><div style={{ padding: 24 }}>{t('Нет учеников')}</div></Card>
          : activeTab === 'attendance'
            ? <AttendanceTab students={students} records={journal.attendance.map(r => ({ studentId: r.student_id, lessonDate: r.lesson_date, present: r.present, grade: r.grade, lessonTitle: '' }))} />
            : <ScoresTab students={students} attendance={journal.attendance} progress={journal.progress} lessons={journal.lessons} />}

      </motion.div>

      {/* Lesson grading modal */}
      <AnimatePresence>
        {lessonModalOpen && (
          <LessonGradeModal
            groupId={activeGroupId}
            initialLessonId={gradeLessonId}
            onClose={closeGradeModal}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
