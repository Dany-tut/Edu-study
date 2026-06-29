import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ChevronRight, ArrowLeft, Phone, Send, Wallet, CalendarCheck } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { useGroups, useStudents } from '../../../lib/useGroups'
import type { Group, Student } from '../../../data/teacherMockData'

// MOBILE ONLY students browser: groups list → tap → roster → tap student →
// detail sheet (contacts, attendance, scores, debt). Read-focused; editing the
// roster stays on desktop.

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '—'
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

function StudentSheet({ student, onClose }: { student: Student | null; onClose: () => void }) {
  return (
    <MobileSheet open={!!student} onClose={onClose} title={student?.name}>
      {student && (
        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, padding: '4px 0 14px' }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.success.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 750, color: PAIR.success.text }}>{student.hwScore}%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.success.text, opacity: 0.85 }}>ДЗ</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.info.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 750, color: PAIR.info.text }}>{student.testScore}%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.info.text, opacity: 0.85 }}>тесты</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 14, background: PAIR.review.bg, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 750, color: PAIR.review.text }}>{student.attendance}%</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: PAIR.review.text, opacity: 0.85 }}>посещ.</div>
            </div>
          </div>
          {student.phone && <MetricRow icon={<Phone size={16} />} label="Телефон" value={student.phone} />}
          {student.telegramLink && <MetricRow icon={<Send size={16} />} label="Telegram" value={student.telegramLink.replace(/^https?:\/\/(t\.me\/)?/, '@')} />}
          <MetricRow icon={<CalendarCheck size={16} />} label="Последний визит" value={student.lastVisit} />
          <MetricRow icon={<Wallet size={16} />} label="Долг" value={student.debt ? `${student.debt.toLocaleString('ru-RU')} ₽` : 'нет'} danger={(student.debt ?? 0) > 0} />
        </div>
      )}
    </MobileSheet>
  )
}

function GroupRoster({ group, onBack }: { group: Group; onBack: () => void }) {
  const { students } = useStudents(group.id)
  const [selected, setSelected] = useState<Student | null>(null)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={onBack} className="cursor-pointer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--color-muted)', padding: '2px 0' }}>
          <ArrowLeft size={17} /> Все группы
        </button>
        <div style={{ fontSize: 20, fontWeight: 750, color: 'var(--color-text)' }}>{group.icon} {group.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => (
            <motion.button
              key={s.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(s)}
              className="cursor-pointer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(s.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>ДЗ {s.hwScore}% · посещ. {s.attendance}%</div>
              </div>
              {(s.debt ?? 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: PAIR.error.bg, color: PAIR.error.text, flexShrink: 0 }}>долг</span>}
              <ChevronRight size={17} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </motion.button>
          ))}
          {students.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '20px 0', textAlign: 'center' }}>В группе пока нет учеников</div>
          )}
        </div>
      </div>
      <StudentSheet student={selected} onClose={() => setSelected(null)} />
    </>
  )
}

export default function MobileTeacherStudents() {
  const { groups } = useGroups()
  const [openGroup, setOpenGroup] = useState<Group | null>(null)

  const topZone = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GlassPill><Users size={15} /> Ученики</GlassPill>
    </div>
  )

  return (
    <MobileScreen topZone={topZone} topPad={64} scrollKey={openGroup ? `g-${openGroup.id}` : 't-groups'}>
      {openGroup ? (
        <GroupRoster group={openGroup} onBack={() => setOpenGroup(null)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => (
            <motion.button
              key={g.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpenGroup(g)}
              className="cursor-pointer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: g.colorSoft, color: g.color, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{g.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)' }}>
                  {g.isIndividual ? 'Индивидуально' : `${g.studentCount} учеников`}{g.level ? ` · ${g.level}` : ''}
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </motion.button>
          ))}
          {groups.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>Групп пока нет. Создайте их на компьютере.</div>
          )}
        </div>
      )}
    </MobileScreen>
  )
}
