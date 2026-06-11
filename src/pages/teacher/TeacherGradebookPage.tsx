import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, ClipboardList, X, Check } from 'lucide-react'
import { groups, students } from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'
import GroupStrip from '../../components/teacher/GroupStrip'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] },
})

// Generate mock attendance dates (last 14 school days)
const DATES = [
  '28.05', '29.05', '30.05', '02.06', '03.06', '04.06',
  '05.06', '06.06', '07.06', '09.06', '10.06',
]

// Deterministic attendance per student/date based on their attendance %
function wasPresent(studentId: string, dateIdx: number): boolean | null {
  const s = students.find(x => x.id === studentId)
  if (!s) return null
  const seed = (studentId.charCodeAt(1) + dateIdx * 7) % 100
  return seed < s.attendance
}

function ScorePill({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#C2C2C8', fontSize: 12 }}>—</span>
  const pct = value / 100
  const color = pct >= 0.8 ? '#1a7a3f' : pct >= 0.6 ? '#7a6500' : '#c0303a'
  const bg = pct >= 0.8 ? '#DFF8D6' : pct >= 0.6 ? '#FFF9CC' : '#FFE1E4'
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
const groupColor = (gid: string) => groups.find(g => g.id === gid)?.color ?? '#9B6DFF'

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
        background: 'linear-gradient(to right, rgba(255,255,255,0.92), transparent)',
        opacity: fadeLeft ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 72,
        pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(to left, rgba(255,255,255,0.92), transparent)',
        opacity: fadeRight ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderRadius: 22,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  )
}

// ─── Attendance tab ────────────────────────────────────────────────────────────
function AttendanceTab({ groupId }: { groupId: string | null }) {
  // null groupId → whole list (all students across every group).
  const groupStudents = groupId ? students.filter(s => s.groupId === groupId) : students

  return (
    <Card>
      <ScrollFadeTable>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.018)' }}>
              <th style={{
                padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                color: '#9A9AA2', borderBottom: '1px solid rgba(0,0,0,0.06)',
                position: 'sticky', left: 0, background: 'rgba(249,249,251,0.97)', zIndex: 1, whiteSpace: 'nowrap',
              }}>
                Студент
              </th>
              {DATES.map(d => (
                <th key={d} style={{
                  padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700,
                  color: '#9A9AA2', letterSpacing: 0.2, borderBottom: '1px solid rgba(0,0,0,0.06)',
                  whiteSpace: 'nowrap', minWidth: 44,
                }}>
                  {d}
                </th>
              ))}
              <th style={{
                padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: '#7B3FCC', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap',
              }}>
                Итого
              </th>
            </tr>
          </thead>
          <tbody>
            {groupStudents.map((student, si) => {
              const presences = DATES.map((_, di) => wasPresent(student.id, di))
              const presentCount = presences.filter(Boolean).length
              const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)

              return (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: si * 0.04 }}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                >
                  <td style={{
                    padding: '10px 16px', position: 'sticky', left: 0,
                    background: 'rgba(255,255,255,0.95)', zIndex: 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                        background: groupColor(student.groupId),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D', whiteSpace: 'nowrap' }}>
                        {student.name}
                      </span>
                    </div>
                  </td>
                  {presences.map((present, di) => (
                    <td key={di} style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {present === null ? null : present ? (
                        <div style={{
                          width: 22, height: 22, borderRadius: 7, margin: '0 auto',
                          background: '#DFF8D6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12,
                        }}>✓</div>
                      ) : (
                        <div style={{
                          width: 22, height: 22, borderRadius: 7, margin: '0 auto',
                          background: '#FFE1E4',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#c0303a',
                        }}>✗</div>
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: student.attendance >= 90 ? '#1a7a3f' : student.attendance >= 70 ? '#7a6500' : '#c0303a',
                    }}>
                      {student.attendance}%
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </ScrollFadeTable>
    </Card>
  )
}

// ─── Scores tab ────────────────────────────────────────────────────────────────
function ScoresTab({ groupId }: { groupId: string | null }) {
  // null groupId → whole list (all students across every group).
  const groupStudents = groupId ? students.filter(s => s.groupId === groupId) : students

  const avgHw = Math.round(groupStudents.reduce((a, s) => a + s.hwScore, 0) / groupStudents.length)
  const avgTest = Math.round(groupStudents.reduce((a, s) => a + s.testScore, 0) / groupStudents.length)
  const trials = groupStudents.filter(s => s.trialScore !== null)
  const avgTrial = trials.length ? Math.round(trials.reduce((a, s) => a + (s.trialScore ?? 0), 0) / trials.length) : null

  return (
    <Card>
      <ScrollFadeTable>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.018)' }}>
              <th style={{
                padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                color: '#9A9AA2', borderBottom: '1px solid rgba(0,0,0,0.06)',
                position: 'sticky', left: 0, background: 'rgba(249,249,251,0.97)', zIndex: 1,
              }}>
                Студент
              </th>
              {['ДЗ', 'Тесты', 'Пробник', 'Цель', 'Посещ.'].map(col => (
                <th key={col} style={{
                  padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                  color: '#9A9AA2', borderBottom: '1px solid rgba(0,0,0,0.06)', whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupStudents.map((student, si) => {
              const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
              return (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: si * 0.04 }}
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                >
                  <td style={{
                    padding: '10px 16px', position: 'sticky', left: 0,
                    background: 'rgba(255,255,255,0.95)', zIndex: 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                        background: groupColor(student.groupId),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: '#fff',
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D', whiteSpace: 'nowrap' }}>
                        {student.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}><ScorePill value={student.hwScore} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}><ScorePill value={student.testScore} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}><ScorePill value={student.trialScore} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#7a6500' }}>{student.desiredScore}</span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: student.attendance >= 90 ? '#1a7a3f' : student.attendance >= 70 ? '#7a6500' : '#c0303a',
                    }}>
                      {student.attendance}%
                    </span>
                  </td>
                </motion.tr>
              )
            })}
            {/* Averages row */}
            <tr style={{ background: 'rgba(123,63,204,0.04)', borderTop: '2px solid rgba(123,63,204,0.12)' }}>
              <td style={{
                padding: '10px 16px', position: 'sticky', left: 0,
                background: 'rgba(238,219,255,0.5)', zIndex: 1,
                fontSize: 11, fontWeight: 700, color: '#7B3FCC',
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
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7B3FCC' }}>
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
    1: { bg: '#FFE1E4', color: '#c0303a', selBg: '#c0303a' },
    2: { bg: '#FFE1E4', color: '#c0303a', selBg: '#c0303a' },
    3: { bg: '#FFF9CC', color: '#7a6500', selBg: '#e6a800' },
    4: { bg: '#DFF8D6', color: '#1a7a3f', selBg: '#1a7a3f' },
    5: { bg: '#DFF8D6', color: '#1a7a3f', selBg: '#1a7a3f' },
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

function LessonGradeModal({ groupId, onClose }: { groupId: string | null; onClose: () => void }) {
  const group = groupId ? groups.find(g => g.id === groupId) ?? null : null
  const groupStudents = groupId ? students.filter(s => s.groupId === groupId) : students
  const today = new Date()
  const dateLabel = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`

  const [present, setPresent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groupStudents.map(s => [s.id, true]))
  )
  const [grades, setGrades] = useState<Record<string, Grade>>(() =>
    Object.fromEntries(groupStudents.map(s => [s.id, null]))
  )
  const [saved, setSaved] = useState(false)

  // Accent/label fall back to a neutral "Все группы" when grading the whole list.
  const accent = group?.color ?? '#7B3FCC'
  const headerName = group?.name ?? 'Все группы'

  function handleSave() {
    setSaved(true)
    setTimeout(onClose, 900)
  }

  const presentCount = Object.values(present).filter(Boolean).length
  const gradedCount = Object.values(grades).filter(v => v !== null).length

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
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,1)',
          width: 560, maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{headerName}</span>
              <span style={{ fontSize: 11, color: '#9A9AA2' }}>·</span>
              <span style={{ fontSize: 11, color: '#9A9AA2', fontWeight: 600 }}>{dateLabel}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0B0B0D' }}>
              Оценки за урок
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9A9AA2' }}>
              Присутствовало {presentCount} из {groupStudents.length} · оценок выставлено {gradedCount}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 10, border: 'none',
              background: '#F5F5F6', color: '#6F6F76', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          padding: '8px 24px',
          display: 'grid', gridTemplateColumns: '1fr 72px 1fr',
          background: 'rgba(0,0,0,0.018)',
          borderBottom: '1px solid rgba(0,0,0,0.04)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.3 }}>СТУДЕНТ</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.3, textAlign: 'center' }}>ПРИСУТСТВИЕ</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.3, paddingLeft: 16 }}>ОЦЕНКА ЗА УРОК</span>
        </div>

        {/* Student list */}
        <div style={{ overflowY: 'auto', scrollbarGutter: 'stable', flex: 1 }}>
          {groupStudents.map((student, si) => {
            const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
            const isPresent = present[student.id]

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
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                  background: isPresent ? 'transparent' : 'rgba(192,48,58,0.025)',
                  transition: 'background 0.2s',
                }}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                    background: isPresent ? groupColor(student.groupId) : '#D4D4D8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    transition: 'background 0.2s',
                  }}>
                    {initials}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: isPresent ? '#0B0B0D' : '#A0A0A8',
                    transition: 'color 0.2s',
                  }}>
                    {student.name}
                  </span>
                </div>

                {/* Attendance toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => {
                      setPresent(p => ({ ...p, [student.id]: !p[student.id] }))
                      if (!present[student.id] === false) setGrades(g => ({ ...g, [student.id]: null }))
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: isPresent ? '#DFF8D6' : '#FFE1E4',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    {isPresent
                      ? <Check size={14} strokeWidth={2.5} color="#1a7a3f" />
                      : <X size={13} strokeWidth={2.5} color="#c0303a" />
                    }
                  </button>
                </div>

                {/* Grade selector */}
                <div style={{
                  display: 'flex', gap: 4, paddingLeft: 16,
                  opacity: isPresent ? 1 : 0.3, pointerEvents: isPresent ? 'auto' : 'none',
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
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 13, border: '1.5px solid rgba(0,0,0,0.08)',
              background: 'transparent', color: '#6F6F76', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <TeacherSaveButton
            label="Сохранить урок" savedLabel="Сохранено"
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

  return (
    // Scroll pane lifted to the viewport top (marginTop:-100) and re-inset with
    // paddingTop:100 so content scrolls UP under the floating topbar and melts
    // into the progressive-blur strip instead of hard-clipping at the pane edge.
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Group strip: pinned "Выставить оценки" action card + scrollable group cards */}
      <motion.div {...fadeUp(0.04)}>
        <GroupStrip
          selectedGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
          actionLabel="Выставить оценки"
          actionIcon={ClipboardList}
          onAction={() => setLessonModalOpen(true)}
        />
      </motion.div>

      {/* Tab bar + export */}
      <motion.div {...fadeUp(0.08)} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 14, padding: 4,
        }}>
          {([['attendance', 'Посещаемость'], ['scores', 'Оценки']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#0B0B0D' : '#6F6F76',
                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Export */}
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: '#F5F5F6', color: '#3A3A40', fontSize: 13, fontWeight: 600,
          }}
        >
          <Download size={14} strokeWidth={2} />
          Экспорт CSV
        </motion.button>
      </motion.div>

      {/* Table */}
      <motion.div {...fadeUp(0.12)}>
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
            onClose={() => setLessonModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
