import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Users, Check, User, ChevronLeft } from 'lucide-react'
import type { Group, Student } from '../../data/teacherMockData'
import TeacherSelect from './TeacherSelect'
import { useT } from '../../lib/i18n'
import { levelOptionsForSubject } from '../../lib/courseLevels'

// Identity a group-enrollment reuses. Any object carrying these fields works.
export type PersonLike = Pick<
  Student,
  'name' | 'phone' | 'telegramLink' | 'parentContact' | 'desiredScore' | 'paymentAmount' | 'email' | 'tempPassword' | 'authUserId' | 'personId'
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
  const t = useT()
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t('Добавить ученика')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          {t('в группу')} <b style={{ color: targetGroup.color }}>{targetGroup.name}</b> {t('— существующий ученик сохранит свой логин')}
        </div>

        <div style={searchBox}>
          <Search size={15} style={{ color: 'var(--color-text-3)' }} />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('Поиск по имени…')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text)' }}
          />
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
          {list.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '24px 0' }}>
              {people.length === 0 ? t('Нет учеников') : t('Никого не нашлось')}
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
                  {subjects.length ? subjects.join(' · ') : t('Без предметов')}
                  {registered ? t(' · есть аккаунт') : t(' · не зарегистрирован')}
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
  const t = useT()
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>{t('Добавить в группу')}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          <b>{studentName}</b> {t('сохранит свой логин и увидит курс группы')}
        </div>

        <div style={searchBox}>
          <Search size={15} style={{ color: 'var(--color-text-3)' }} />
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('Поиск группы…')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text)' }}
          />
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
          {list.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '24px 0' }}>
              {groups.length === 0 ? t('Нет групп') : t('Уже во всех группах')}
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
                    {g.level} · {g.studentCount} {t('студ.')}
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

// ─── Create a NEW 1:1 card for an EXISTING person ──────────────────────────────
// Pick an existing human → choose subject/level → a fresh individual group card
// is created that REUSES their account (no new person, no re-registration).
// A registered person reaches the card by their existing login (no invite link);
// an unregistered one still gets a fresh invite link to activate it.
const selectTrigger = {
  background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)',
  borderRadius: 12, padding: '10px 12px', fontSize: 13,
}
export function AddExistingIndividualModal({
  people, subjectOptions, onCreate, onClose,
}: {
  people: { key: string; person: PersonLike; subjects: string[]; registered: boolean }[]
  subjectOptions: string[]
  onCreate: (person: PersonLike, subject: string, level: string) => Promise<{ inviteToken: string | null; registered: boolean }>
  onClose: () => void
}) {
  const t = useT()
  const [step, setStep] = useState<'pick' | 'subject' | 'result'>('pick')
  const [picked, setPicked] = useState<{ person: PersonLike; registered: boolean } | null>(null)
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ inviteToken: string | null; registered: boolean } | null>(null)
  const [copied, setCopied] = useState(false)
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = useMemo(
    () => people.filter(p => !query || p.person.name.toLowerCase().includes(query)),
    [people, query],
  )
  const inviteLink = result?.inviteToken
    ? `${window.location.origin}${window.location.pathname}#/join?token=${result.inviteToken}`
    : null

  async function create() {
    if (!picked || !subject.trim() || busy) return
    setBusy(true)
    const res = await onCreate(picked.person, subject.trim(), level.trim())
    setBusy(false)
    setResult(res)
    setStep('result')
  }
  async function copy() {
    if (!inviteLink) return
    try { await navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()} style={card}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            {step === 'subject' && (
              <button onClick={() => setStep('pick')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex' }}><ChevronLeft size={18} /></button>
            )}
            {step === 'result' ? t('Карточка 1:1 создана') : t('Существующий ученик → 1:1')}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}><X size={18} /></button>
        </div>

        {step === 'pick' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
              {t('выберите человека — новая карточка переиспользует его аккаунт')}
            </div>
            <div style={searchBox}>
              <Search size={15} style={{ color: 'var(--color-text-3)' }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('Поиск по имени…')}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text)' }} />
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
              {list.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center', padding: '24px 0' }}>
                  {people.length === 0 ? t('Нет учеников') : t('Никого не нашлось')}
                </div>
              )}
              {list.map(({ key, person, subjects, registered }) => (
                <button key={key} onClick={() => { setPicked({ person, registered }); setStep('subject') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: 'var(--color-bg-4)', border: '1.5px solid var(--color-border-medium)',
                    borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-medium)' }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>{initials(person.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {subjects.length ? subjects.join(' · ') : t('Без предметов')}{registered ? t(' · есть аккаунт') : t(' · не зарегистрирован')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'subject' && picked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-bg-4)', borderRadius: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>{initials(picked.person.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{picked.person.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{picked.registered ? t('есть аккаунт — логин сохранится') : t('не зарегистрирован — дадим ссылку')}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Направление 1:1')}</div>
            {/* Уровни зависят от предмета: языкам — CEFR и их родная шкала,
                школьным предметам — ЕГЭ/ОГЭ/… */}
            <TeacherSelect
              value={subject}
              onChange={v => {
                setSubject(v)
                if (level && !levelOptionsForSubject(v).includes(level)) setLevel('')
              }}
              placeholder={t('Предмет')}
              options={subjectOptions}
              triggerStyle={selectTrigger}
            />
            <TeacherSelect value={level} onChange={setLevel} placeholder={t('Уровень')} options={levelOptionsForSubject(subject)} triggerStyle={selectTrigger} />
            <button onClick={create} disabled={!subject.trim() || busy}
              style={{ marginTop: 4, width: '100%', padding: '12px 0', background: subject.trim() ? 'var(--color-purple)' : 'rgba(155,109,255,0.35)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 14, cursor: subject.trim() && !busy ? 'pointer' : 'not-allowed' }}>
              {busy ? t('Создаём…') : t('Создать карточку 1:1')}
            </button>
          </div>
        )}

        {step === 'result' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result?.registered || !inviteLink ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-green-soft)', borderRadius: 14, padding: '14px 16px' }}>
                <User size={18} color="var(--color-green-text)" />
                <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{t('Готово — ученик увидит карточку по своему логину.')}</div>
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--color-bg-4)', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 6, fontWeight: 600 }}>{t('ССЫЛКА ДЛЯ РЕГИСТРАЦИИ')}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text)', wordBreak: 'break-all', lineHeight: 1.5 }}>{inviteLink}</div>
                </div>
                <button onClick={copy} style={{ width: '100%', padding: '12px 0', background: copied ? '#3FCC8A' : 'var(--color-purple)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', borderRadius: 14, cursor: 'pointer', transition: 'background 0.2s' }}>
                  {copied ? t('✓ Скопировано') : t('Скопировать ссылку')}
                </button>
              </>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: '10px 0', background: 'transparent', color: 'var(--color-muted)', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>{t('Закрыть')}</button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
