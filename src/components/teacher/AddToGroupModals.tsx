import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Users, Check } from 'lucide-react'
import type { Group, Student } from '../../data/teacherMockData'

// Identity a group-enrollment reuses. Any object carrying these fields works.
export type PersonLike = Pick<
  Student,
  'name' | 'phone' | 'telegramLink' | 'parentContact' | 'desiredScore' | 'paymentAmount' | 'email' | 'tempPassword' | 'authUserId'
>

const overlay = {
  position: 'fixed' as const, inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const card = {
  background: 'var(--color-bg-input)', borderRadius: 24, padding: 24,
  width: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column' as const,
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
}
const searchBox = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)',
  borderRadius: 12, padding: '9px 12px', marginBottom: 12,
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Pick an EXISTING person to enroll into `targetGroup` ──────────────────────
// `people` should already be deduplicated per person (one entry per human).
export function PickStudentModal({
  targetGroup, people, existingKeys, busy, onPick, onClose,
}: {
  targetGroup: Group
  people: { key: string; person: PersonLike; subjects: string[]; registered: boolean }[]
  existingKeys: Set<string>
  busy: boolean
  onPick: (person: PersonLike) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = useMemo(
    () => people.filter(p => !existingKeys.has(p.key)).filter(p => !query || p.person.name.toLowerCase().includes(query)),
    [people, existingKeys, query],
  )
  return (
    <div style={overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()} style={card}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Добавить ученика</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          в группу <b style={{ color: targetGroup.color }}>{targetGroup.name}</b> — существующий ученик сохранит свой логин
        </div>

        <div style={searchBox}>
          <Search size={15} style={{ color: 'var(--color-text-3)' }} />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по имени…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text)' }}
          />
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
          {list.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '24px 0' }}>
              {people.length === 0 ? 'Нет учеников' : 'Никого не нашлось'}
            </div>
          )}
          {list.map(({ key, person, subjects, registered }) => (
            <button
              key={key} disabled={busy} onClick={() => onPick(person)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                background: 'var(--color-bg-4)', border: '1.5px solid var(--color-border-medium)',
                borderRadius: 14, cursor: busy ? 'wait' : 'pointer', textAlign: 'left', width: '100%',
                opacity: busy ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.borderColor = targetGroup.color }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-medium)' }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: `linear-gradient(135deg, ${targetGroup.color}, ${targetGroup.color}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff',
              }}>{initials(person.name)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {person.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subjects.length ? subjects.join(' · ') : 'Без предметов'}
                  {registered ? ' · есть аккаунт' : ' · не зарегистрирован'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Pick a regular GROUP to enroll `studentName` into (from the student card) ─
export function PickGroupModal({
  studentName, groups, memberGroupIds, busy, onPick, onClose,
}: {
  studentName: string
  groups: Group[]
  memberGroupIds: Set<string>
  busy: boolean
  onPick: (groupId: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = useMemo(
    () => groups.filter(g => !memberGroupIds.has(g.id)).filter(g => !query || g.name.toLowerCase().includes(query)),
    [groups, memberGroupIds, query],
  )
  return (
    <div style={overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()} style={card}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Добавить в группу</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          <b>{studentName}</b> сохранит свой логин и увидит курс группы
        </div>

        <div style={searchBox}>
          <Search size={15} style={{ color: 'var(--color-text-3)' }} />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск группы…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text)' }}
          />
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
          {list.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '24px 0' }}>
              {groups.length === 0 ? 'Нет групп' : 'Уже во всех группах'}
            </div>
          )}
          {list.map(g => {
            const already = memberGroupIds.has(g.id)
            return (
              <button
                key={g.id} disabled={busy} onClick={() => onPick(g.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: 'var(--color-bg-4)', border: '1.5px solid var(--color-border-medium)',
                  borderRadius: 14, cursor: busy ? 'wait' : 'pointer', textAlign: 'left', width: '100%',
                  opacity: busy ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.borderColor = g.color }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-medium)' }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: `${g.color}22`, border: `1px solid ${g.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: g.color,
                }}><Users size={17} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                    {g.level} · {g.studentCount} студ.
                  </div>
                </div>
                {already && <Check size={16} style={{ color: g.color }} />}
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
