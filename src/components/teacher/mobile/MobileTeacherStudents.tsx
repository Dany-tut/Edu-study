import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, ChevronRight, ArrowLeft, Phone, Send, Wallet, CalendarCheck } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { useGroups, useStudents } from '../../../lib/useGroups'
import { contactLabel } from '../../../lib/contactLink'
import { useT } from '../../../lib/i18n'
import type { Group, Student } from '../../../data/teacherMockData'
import { DEMO_GROUPS, demoStudentsFor } from '../../../data/teacherDevDemo'

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

function StudentSheet({ student, group, onClose }: { student: Student | null; group: Group; onClose: () => void }) {
  const t = useT()
  return (
    <MobileSheet open={!!student} onClose={onClose} title={student?.name}>
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

// 1:1 groups hold a single student — tapping one opens the student sheet
// directly over the groups list, skipping the pointless roster-of-one.
function SoloStudentSheet({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const { students: realStudents } = useStudents(group?.id ?? '')
  const students = import.meta.env.DEV && group && realStudents.length === 0
    ? demoStudentsFor(group.id)
    : realStudents
  if (!group) return null
  return <StudentSheet student={students[0] ?? null} group={group} onClose={onClose} />
}

function GroupRoster({ group, onBack }: { group: Group; onBack: () => void }) {
  const t = useT()
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
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>{t('ДЗ')} {s.hwScore}% · {t('посещ.')} {s.attendance}%</div>
              </div>
              {(s.debt ?? 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: PAIR.error.bg, color: PAIR.error.text, flexShrink: 0 }}>{t('долг')}</span>}
              <ChevronRight size={17} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </motion.button>
          ))}
          {students.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '20px 0', textAlign: 'center' }}>{t('В группе пока нет учеников')}</div>
          )}
        </div>
      </div>
      <StudentSheet student={selected} group={group} onClose={() => setSelected(null)} />
    </>
  )
}

type StudentsFilter = 'all' | 'groups' | 'individual'

const FILTERS: { key: StudentsFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'groups', label: 'Группы' },
  { key: 'individual', label: '1:1' },
]

export default function MobileTeacherStudents() {
  const t = useT()
  const { groups: realGroups } = useGroups()
  // DEV-only: no logged-in teacher locally → show demo groups instead of empty.
  const groups = import.meta.env.DEV && realGroups.length === 0 ? DEMO_GROUPS : realGroups
  const [openGroup, setOpenGroup] = useState<Group | null>(null)
  const [soloGroup, setSoloGroup] = useState<Group | null>(null)
  const [filter, setFilter] = useState<StudentsFilter>('all')

  const visibleGroups = groups.filter(g =>
    filter === 'all' ? true : filter === 'individual' ? g.isIndividual : !g.isIndividual,
  )

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', marginBottom: 4 }}>
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="cursor-pointer"
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 650,
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
          {visibleGroups.map(g => (
            <motion.button
              key={g.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => (g.isIndividual ? setSoloGroup(g) : setOpenGroup(g))}
              className="cursor-pointer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', textAlign: 'left' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: g.colorSoft, color: g.color, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{g.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)' }}>
                  {g.isIndividual ? t('Индивидуально') : `${g.studentCount} ${t('учеников')}`}{g.level ? ` · ${g.level}` : ''}
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </motion.button>
          ))}
          {visibleGroups.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', padding: '40px 0', textAlign: 'center' }}>
              {groups.length === 0 ? t('Групп пока нет. Создайте их на компьютере.') : filter === 'individual' ? t('Нет индивидуальных учеников') : t('Нет групп')}
            </div>
          )}
          <SoloStudentSheet group={soloGroup} onClose={() => setSoloGroup(null)} />
        </div>
      )}
    </MobileScreen>
  )
}
