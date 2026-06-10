import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Users } from 'lucide-react'
import { groups, students } from '../../data/teacherMockData'

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
function AttendanceTab({ groupId }: { groupId: string }) {
  const group = groups.find(g => g.id === groupId)
  const groupStudents = students.filter(s => s.groupId === groupId)

  if (!group) return null

  return (
    <Card>
      <div style={{ overflowX: 'auto' }}>
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
                        background: group.color,
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
      </div>
    </Card>
  )
}

// ─── Scores tab ────────────────────────────────────────────────────────────────
function ScoresTab({ groupId }: { groupId: string }) {
  const group = groups.find(g => g.id === groupId)
  const groupStudents = students.filter(s => s.groupId === groupId)

  if (!group) return null

  const avgHw = Math.round(groupStudents.reduce((a, s) => a + s.hwScore, 0) / groupStudents.length)
  const avgTest = Math.round(groupStudents.reduce((a, s) => a + s.testScore, 0) / groupStudents.length)
  const trials = groupStudents.filter(s => s.trialScore !== null)
  const avgTrial = trials.length ? Math.round(trials.reduce((a, s) => a + (s.trialScore ?? 0), 0) / trials.length) : null

  return (
    <Card>
      <div style={{ overflowX: 'auto' }}>
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
                        background: group.color,
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
      </div>
    </Card>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TeacherGradebookPage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'scores'>('attendance')
  const [activeGroupId, setActiveGroupId] = useState(groups[0].id)

  const activeGroup = groups.find(g => g.id === activeGroupId)!
  const groupStudents = students.filter(s => s.groupId === activeGroupId)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toolbar */}
      <motion.div {...fadeUp(0.04)} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Group selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setActiveGroupId(g.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: activeGroupId === g.id ? g.colorSoft : '#F5F5F6',
                color: activeGroupId === g.id ? g.color : '#6F6F76',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: g.color }} />
              {g.name}
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

      {/* Tab bar + summary */}
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

        {/* Group summary pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: activeGroup.colorSoft, borderRadius: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeGroup.color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0D' }}>{activeGroup.name}</span>
          <span style={{ fontSize: 12, color: '#6F6F76' }}>·</span>
          <Users size={12} strokeWidth={2} style={{ color: '#6F6F76' }} />
          <span style={{ fontSize: 12, color: '#6F6F76', fontWeight: 600 }}>{groupStudents.length}</span>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div {...fadeUp(0.12)}>
        {activeTab === 'attendance'
          ? <AttendanceTab groupId={activeGroupId} />
          : <ScoresTab groupId={activeGroupId} />
        }
      </motion.div>
    </div>
  )
}
