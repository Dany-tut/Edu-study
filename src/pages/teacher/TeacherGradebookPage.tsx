import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Check, Clock } from 'lucide-react'
import type { TabConfig } from '../../components/teacher/GroupStrip'
import { useTeacher } from '../../store/teacherStore'
import GroupStrip from '../../components/teacher/GroupStrip'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import { useGroups, useStudents, useAttendance, useGroupLessons, useLessonRoster, useJournalPending } from '../../lib/useGroups'
import TeacherSelect from '../../components/teacher/TeacherSelect'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] },
})

// Russian plural: pluralRu(1,'урок','урока','уроков') → урок / урока / уроков
function pluralRu(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

function ScorePill({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--color-text-4)', fontSize: 12 }}>—</span>
  const pct = value / 100
  const color = pct >= 0.8 ? 'var(--color-green-text)' : pct >= 0.6 ? 'var(--color-yellow-text)' : 'var(--color-red-text)'
  const bg = pct >= 0.8 ? 'var(--color-green-soft)' : pct >= 0.6 ? 'var(--color-yellow-soft)' : 'var(--color-red-soft)'
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
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      borderRadius: 22,
      boxShadow: 'var(--shadow-sm-page)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  )
}

// ─── Attendance tab ────────────────────────────────────────────────────────────
function AttendanceTab({ groupId }: { groupId: string | null }) {
  const { students: groupStudents } = useStudents(groupId)
  const { records } = useAttendance(groupId)

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
          Нет данных — выберите группу и отметьте посещаемость
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
                  Студент
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
                  Итого
                </th>
              </tr>
            </thead>
            <tbody>
              {groupStudents.map((student) => {
                const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
                const studentRecords = records.filter(r => r.studentId === student.id)
                const presentCount = studentRecords.filter(r => r.present).length
                const pct = dates.length ? Math.round((presentCount / dates.length) * 100) : null

                return (
                  <tr
                    key={student.id}
                    style={{ borderBottom: '1px solid var(--color-border-soft)' }}
                  >
                    <td style={{
                      padding: '10px 16px', position: 'sticky', left: 0,
                      background: 'rgba(var(--glass-rgb), 0.95)', zIndex: 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                          background: 'var(--color-purple)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#fff',
                        }}>
                          {initials}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                          {student.name}
                        </span>
                      </div>
                    </td>
                    {dates.map(date => {
                      const rec = studentRecords.find(r => r.lessonDate === date)
                      const present = rec?.present
                      return (
                        <td key={date} style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {rec === undefined ? (
                            <span style={{ color: 'var(--color-text-4)', fontSize: 12 }}>—</span>
                          ) : present ? (
                            <div style={{
                              width: 22, height: 22, borderRadius: 7, margin: '0 auto',
                              background: 'var(--color-green-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12,
                            }}>✓</div>
                          ) : (
                            <div style={{
                              width: 22, height: 22, borderRadius: 7, margin: '0 auto',
                              background: 'var(--color-red-soft)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, color: 'var(--color-red-text)',
                            }}>✗</div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {pct === null ? (
                        <span style={{ color: 'var(--color-text-4)', fontSize: 12 }}>—</span>
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
function ScoresTab({ groupId }: { groupId: string | null }) {
  const { students: groupStudents } = useStudents(groupId)

  const avgHw = Math.round(groupStudents.reduce((a, s) => a + s.hwScore, 0) / groupStudents.length)
  const avgTest = Math.round(groupStudents.reduce((a, s) => a + s.testScore, 0) / groupStudents.length)
  const trials = groupStudents.filter(s => s.trialScore !== null)
  const avgTrial = trials.length ? Math.round(trials.reduce((a, s) => a + (s.trialScore ?? 0), 0) / trials.length) : null

  return (
    <Card>
      <ScrollFadeTable>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-2)' }}>
              <th style={{
                padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                color: 'var(--color-text-3)', borderBottom: '1px solid var(--color-border-soft)',
                position: 'sticky', left: 0, background: 'var(--color-bg-2)', zIndex: 1,
              }}>
                Студент
              </th>
              {['ДЗ', 'Тесты', 'Пробник', 'Цель', 'Посещ.'].map(col => (
                <th key={col} style={{
                  padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                  color: 'var(--color-text-3)', borderBottom: '1px solid var(--color-border-soft)', whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupStudents.map((student) => {
              const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
              return (
                <tr
                  key={student.id}
                  style={{ borderBottom: '1px solid var(--color-border-soft)' }}
                >
                  <td style={{
                    padding: '10px 16px', position: 'sticky', left: 0,
                    background: 'rgba(var(--glass-rgb), 0.95)', zIndex: 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                        background: 'var(--color-purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}><ScorePill value={student.hwScore} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}><ScorePill value={student.testScore} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}><ScorePill value={student.trialScore} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-yellow-text)' }}>{student.desiredScore}</span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: student.attendance >= 90 ? 'var(--color-green-text)' : student.attendance >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)',
                    }}>
                      {student.attendance}%
                    </span>
                  </td>
                </tr>
              )
            })}
            {/* Averages row */}
            <tr style={{ background: 'var(--color-purple-soft)', borderTop: '2px solid var(--color-border-soft)' }}>
              <td style={{
                padding: '10px 16px', position: 'sticky', left: 0,
                background: 'var(--color-purple-soft)', zIndex: 1,
                fontSize: 11, fontWeight: 700, color: 'var(--color-accent)',
              }}>
                Среднее
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <ScorePill value={avgHw} />
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <ScorePill value={avgTest} />
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <ScorePill value={avgTrial} />
              </td>
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>—</td>
              <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>
                  {Math.round(groupStudents.reduce((a, s) => a + s.attendance, 0) / groupStudents.length)}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </ScrollFadeTable>
    </Card>
  )
}

// ─── Lesson grading modal ──────────────────────────────────────────────────────
const GRADE_OPTIONS = [null, 1, 2, 3, 4, 5] as const
type Grade = 1 | 2 | 3 | 4 | 5 | null

function GradeButton({ value, selected, onClick }: { value: Grade; selected: boolean; onClick: () => void }) {
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
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 9, border: selected ? 'none' : '1.5px solid transparent',
        background: selected ? c.selBg : c.bg,
        color: selected ? '#fff' : c.color,
        fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
        outline: selected ? `2px solid ${c.selBg}` : 'none',
        outlineOffset: 1,
      }}
    >
      {value}
    </button>
  )
}

function LessonGradeModal({ groupId, onClose, initialLessonId }: { groupId: string | null; onClose: () => void; initialLessonId?: string }) {
  const { groups } = useGroups()
  const { saveLesson } = useAttendance(groupId)
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

  const accent = lessonGroup?.color ?? 'var(--color-accent)'
  const headerName = selectedLesson?.scopeName || lessonGroup?.name || 'Все группы'

  const isPresent = (id: string) => present[id] ?? true

  async function handleSave() {
    if (!selectedLesson || groupStudents.length === 0) return
    // One click writes both fields: present → attendance, grade → grade.
    const entries = groupStudents.map(s => ({
      studentId: s.id,
      present: isPresent(s.id),
      grade: grades[s.id] ?? null,
    }))
    await saveLesson(selectedLesson.groupId, isoDate, entries, lessonTitle)
    setSaved(true)
    setTimeout(onClose, 900)
  }

  const presentCount = groupStudents.filter(s => isPresent(s.id)).length
  const gradedCount = groupStudents.filter(s => grades[s.id] != null).length

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(11,11,13,0.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={saved ? { opacity: 0, scale: 0.96, y: -8 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'rgba(var(--glass-rgb), 0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
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
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
              Оценки за урок
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--color-text-3)' }}>
              Присутствовало {presentCount} из {groupStudents.length} · оценок выставлено {gradedCount}
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
            УРОК
          </span>
          {lessons.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              Нет уроков в расписании — оценки запишутся на сегодня ({dateLabel})
            </div>
          ) : (
            <TeacherSelect
              value={lessonId}
              onChange={setLessonId}
              placeholder="Выберите урок"
              options={lessons.map(l => {
                const [, m, d] = l.date.split('-')
                const titlePart = l.title && l.title !== String(l.lessonNumber) ? ` — ${l.title}` : ''
                const scopePart = l.scopeName ? ` · ${l.scopeName}` : ''
                return { value: l.id, label: `${d}.${m} · Урок ${l.lessonNumber}${titlePart}${scopePart}` }
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
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3 }}>СТУДЕНТ</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, textAlign: 'center' }}>ПРИСУТСТВИЕ</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, paddingLeft: 16 }}>ОЦЕНКА ЗА УРОК</span>
        </div>

        {/* Student list */}
        <div style={{ overflowY: 'auto', scrollbarGutter: 'stable', flex: 1 }}>
          {groupStudents.map((student, si) => {
            const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
            const studentPresent = isPresent(student.id)

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: si * 0.03 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 72px 1fr',
                  alignItems: 'center',
                  padding: '10px 24px',
                  borderBottom: '1px solid var(--color-border-soft)',
                  background: studentPresent ? 'transparent' : 'rgba(192,48,58,0.025)',
                  transition: 'background 0.2s',
                }}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                    background: studentPresent ? 'var(--color-purple)' : 'var(--color-bg-5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    transition: 'background 0.2s',
                  }}>
                    {initials}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: studentPresent ? 'var(--color-text)' : '#A0A0A8',
                    transition: 'color 0.2s',
                  }}>
                    {student.name}
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
                      transition: 'all 0.15s',
                    }}
                  >
                    {studentPresent
                      ? <Check size={14} strokeWidth={2.5} color="#1a7a3f" />
                      : <X size={13} strokeWidth={2.5} color="#c0303a" />
                    }
                  </button>
                </div>

                {/* Grade selector */}
                <div style={{
                  display: 'flex', gap: 4, paddingLeft: 16,
                  opacity: studentPresent ? 1 : 0.3, pointerEvents: studentPresent ? 'auto' : 'none',
                  transition: 'opacity 0.2s',
                }}>
                  {([1, 2, 3, 4, 5] as const).map(g => (
                    <GradeButton
                      key={g} value={g}
                      selected={grades[student.id] === g}
                      onClick={() => setGrades(prev => ({ ...prev, [student.id]: prev[student.id] === g ? null : g }))}
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
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 13, border: '1.5px solid var(--color-border-medium)',
              background: 'transparent', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <TeacherSaveButton
            label="Сохранить" savedLabel="Сохранено"
            saved={saved} onClick={handleSave}
          />
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TeacherGradebookPage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'scores'>('attendance')
  const activeGroupId = useTeacher(s => s.selectedGroupId)
  const setActiveGroupId = useTeacher(s => s.setSelectedGroupId)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  // When opening the modal from the "журнал не заполнен" banner we preselect a lesson.
  const [gradeLessonId, setGradeLessonId] = useState<string | undefined>(undefined)
  const [journalReloadKey, setJournalReloadKey] = useState(0)
  const { groups } = useGroups()
  const regularGroups = groups.filter(g => !g.isIndividual)
  const individualGroups = groups.filter(g => g.isIndividual)
  const pendingJournals = useJournalPending(activeGroupId, journalReloadKey)

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
      { id: 'attendance', label: 'Посещаемость' },
      { id: 'scores', label: 'Оценки' },
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
          groups={regularGroups}
          individualGroups={individualGroups}
          selectedGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
          tabConfig={tabConfig}
        />
      </motion.div>

      {/* "Журнал не заполнен" — lessons that finished without attendance recorded */}
      <AnimatePresence>
        {pendingJournals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              borderRadius: 18, padding: '14px 18px',
              background: 'var(--color-peach-soft)', border: '1px solid var(--color-border-soft)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
              <Clock size={17} style={{ color: 'var(--color-peach-text)' }} />
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>
                Журнал не заполнен · {pendingJournals.length} {pluralRu(pendingJournals.length, 'урок', 'урока', 'уроков')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pendingJournals.slice(0, 5).map(p => {
                const [, mm, dd] = p.date.split('-')
                return (
                  <div key={p.scheduleId} style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    background: 'rgba(var(--glass-rgb), 0.55)', border: '1px solid var(--color-border-soft)',
                    borderRadius: 11, padding: '10px 13px',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-peach-text)', flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.scopeName || p.title || 'Урок'}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                        {dd}.{mm}{p.timeStart ? ` · ${p.timeStart}` : ''}{p.title && p.scopeName ? ` · ${p.title}` : ''}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => openJournalFor(p)}
                      style={{
                        flex: 'none', padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'var(--color-accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                        boxShadow: '0 2px 10px rgba(99,84,207,0.45)',
                      }}
                    >
                      Заполнить
                    </motion.button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export row */}
      <motion.div {...fadeUp(0.08)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }} />
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 14, border: '1px solid var(--color-border)', cursor: 'pointer',
            background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <Download size={14} strokeWidth={2} />
          Экспорт CSV
        </motion.button>
      </motion.div>

      {/* Table — single smooth fade per selection (no per-row stagger = no jank) */}
      <motion.div
        key={`${activeTab}:${activeGroupId ?? 'all'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {activeTab === 'attendance'
          ? <AttendanceTab groupId={activeGroupId} />
          : <ScoresTab groupId={activeGroupId} />
        }
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
