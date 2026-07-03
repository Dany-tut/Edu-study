import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, ClipboardCheck, Image as ImageIcon, Users, ChevronRight, AlertTriangle, BookOpen, Link2, Copy, Check } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { tactile } from '../../../lib/feedback'
import { copyToClipboard } from '../../../lib/clipboard'
import { useHomework, useHardSubmissions } from '../../../lib/useHomework'
import { useGroups } from '../../../lib/useGroups'
import { loadTestAssignments, type TestAssignment } from '../../../data/diagnosticData'
import type { MTab } from './MobileTeacherNav'

const BASE_URL = window.location.origin + window.location.pathname
const DIAG_SUBJECTS: { id: string; label: string }[] = [
  { id: 'biology', label: 'Биология' },
  { id: 'chemistry', label: 'Химия' },
  { id: 'logic', label: 'Мышление' },
  { id: 'ap-chem-ru', label: 'AP Химия RU' },
  { id: 'ap-chem-en', label: 'AP Chemistry EN' },
]
const diagLink = (subject: string, assignmentId?: string) =>
  `${BASE_URL}#/diagnostic?subject=${subject}${assignmentId ? `&assignment=${assignmentId}` : ''}`

// MOBILE ONLY teacher home — "command center": quick stats + a "сделать сейчас"
// list that routes to the actionable tabs. Heavy authoring stays on desktop.

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 12px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}

function TodoCard({ icon, title, sub, pair, onClick }: {
  icon: React.ReactNode; title: string; sub: string; pair: { bg: string; text: string }; onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 16, background: pair.bg, border: '1px solid transparent' }}
    >
      <span style={{ color: pair.text, flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: pair.text, lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: pair.text, opacity: 0.82, marginTop: 2 }}>{sub}</span>
      </span>
      <ChevronRight size={18} style={{ color: pair.text, opacity: 0.7, flexShrink: 0 }} />
    </motion.button>
  )
}

// Row inside the "Ссылки на тесты" sheet: label + copy-to-clipboard button.
function LinkRow({ label, sub, url }: { label: string; sub?: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    tactile()
    void copyToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center cursor-pointer text-left"
      style={{ gap: 11, width: '100%', padding: '12px 13px', borderRadius: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
        {sub && <div className="truncate" style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <span
        className="flex items-center flex-shrink-0"
        style={{
          gap: 5, padding: '7px 12px', borderRadius: 999,
          background: copied ? 'var(--color-green-soft)' : 'var(--color-accent)',
          color: copied ? 'var(--color-green-text)' : '#fff',
          fontSize: 12, fontWeight: 700, transition: 'background 0.18s',
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Готово' : 'Копировать'}
      </span>
    </button>
  )
}

export default function MobileTeacherHome({ onNavigate }: { onNavigate: (tab: MTab) => void }) {
  const { homework } = useHomework()
  const { submissions } = useHardSubmissions()
  const { groups } = useGroups()
  const [linksOpen, setLinksOpen] = useState(false)
  const [assignments, setAssignments] = useState<TestAssignment[]>([])

  useEffect(() => { loadTestAssignments().then(setAssignments).catch(() => {}) }, [])
  const activeAssignments = assignments.filter(a => !a.closed)

  const hwPending = homework
    .filter(h => h.status !== 'closed')
    .reduce((sum, h) => sum + Math.max(0, h.submittedCount - h.reviewedCount), 0)
  const hardPending = submissions.filter(s => s.status === 'submitted').length
  const totalReview = hwPending + hardPending

  const studentTotal = groups.reduce((sum, g) => sum + g.studentCount, 0)
  const groupCount = groups.filter(g => !g.isIndividual).length

  const topZone = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <GlassPill>
        <span style={{ fontWeight: 750 }}>Кабинет учителя</span>
      </GlassPill>
      <GlassPill style={{ color: 'var(--color-yellow-text)' }}>
        <Flame size={15} /> 12
      </GlassPill>
    </div>
  )

  return (
    <MobileScreen topZone={topZone} topPad={72} scrollKey="t-home">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Stat value={totalReview} label="на проверке" />
          <Stat value={groupCount} label="групп" />
          <Stat value={studentTotal} label="учеников" />
        </div>

        {/* To-do now */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, padding: '0 2px' }}>
            СДЕЛАТЬ СЕЙЧАС
          </div>

          {hardPending > 0 && (
            <TodoCard
              icon={<ImageIcon size={18} />}
              title={`${hardPending} «сложных» с фото`}
              sub="ждут вердикта — открыть проверку"
              pair={PAIR.review}
              onClick={() => onNavigate('review')}
            />
          )}

          {hwPending > 0 && (
            <TodoCard
              icon={<ClipboardCheck size={18} />}
              title={`${hwPending} работ на проверке`}
              sub="по домашним заданиям групп"
              pair={PAIR.info}
              onClick={() => onNavigate('review')}
            />
          )}

          {totalReview === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 16, background: PAIR.success.bg }}>
              <ClipboardCheck size={18} style={{ color: PAIR.success.text }} />
              <span style={{ fontSize: 14, fontWeight: 650, color: PAIR.success.text }}>Всё проверено — инбокс пуст 🎉</span>
            </div>
          )}

          <TodoCard
            icon={<Users size={18} />}
            title="Ученики и группы"
            sub={`${groupCount} групп · ${studentTotal} учеников`}
            pair={PAIR.focus}
            onClick={() => onNavigate('students')}
          />

          <TodoCard
            icon={<AlertTriangle size={18} />}
            title="Заполнить журнал"
            sub="отметить посещаемость уроков"
            pair={PAIR.warning}
            onClick={() => onNavigate('gradebook')}
          />

          <TodoCard
            icon={<Link2 size={18} />}
            title="Ссылки на тесты"
            sub="скопировать ученикам — диагностики и назначения"
            pair={PAIR.success}
            onClick={() => { tactile(); setLinksOpen(true) }}
          />
        </div>

        {/* Desktop-only hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
          <BookOpen size={17} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)', lineHeight: 1.35 }}>
            Полный конструктор курсов, тренажёров и редактор уроков — на компьютере.
          </span>
        </div>
      </div>

      {/* Test links sheet — copy diagnostic + assignment links for students */}
      <MobileSheet open={linksOpen} onClose={() => setLinksOpen(false)} title="Ссылки на тесты">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
          {activeAssignments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Активные назначения
              </div>
              {activeAssignments.map(a => (
                <LinkRow
                  key={a.id}
                  label={a.title}
                  sub={`${a.assignType === 'trial' ? 'Пробник' : 'Тест'}${a.dueDate ? ` · до ${a.dueDate}` : ''}`}
                  url={diagLink(a.subject, a.id)}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Диагностики по предметам
            </div>
            {DIAG_SUBJECTS.map(s => (
              <LinkRow key={s.id} label={s.label} sub="открытая диагностика" url={diagLink(s.id)} />
            ))}
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.4, padding: '0 2px' }}>
            Ссылку можно отправить ученику в любом мессенджере — он откроет тест по ней.
          </div>
        </div>
      </MobileSheet>
    </MobileScreen>
  )
}
