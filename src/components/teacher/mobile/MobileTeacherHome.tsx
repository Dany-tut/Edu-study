import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardCheck, Users, ChevronRight, AlertTriangle, BookOpen, Link2, Copy, Check,
  Wallet, Play, PartyPopper, Send, ArrowRight, CircleCheck, Clock,
} from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { tactile } from '../../../lib/feedback'
import { copyToClipboard } from '../../../lib/clipboard'
import { contactHref } from '../../../lib/contactLink'
import { useHomeData } from '../../../lib/useHomeData'
import { useHardSubmissions } from '../../../lib/useHomework'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useJournalPending } from '../../../lib/useGroups'
import { loadTestAssignments, type TestAssignment } from '../../../data/diagnosticData'
import { DEMO_TEACHER_HOME, type TeacherHomeModel, type AttentionItem, type AttentionTagKind } from '../../../data/teacherHomeDemo'
import type { ScheduleItem } from '../../../data/teacherMockData'
import type { MTab } from './MobileTeacherNav'
import { useT, t } from '../../../lib/i18n'

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

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`
const firstName = (full: string) => full.trim().split(/\s+/)[0] || full
const initialsOf = (full: string) => {
  const parts = full.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '•'
}

// ─── tag colour map for "требуют внимания" ───────────────────────────────────
const TAG_COLORS: Record<AttentionTagKind, { bg: string; text: string; avBg: string; avText: string }> = {
  danger:  { bg: 'var(--color-red-soft)',    text: 'var(--color-red-text)',    avBg: 'var(--color-red-soft)',    avText: 'var(--color-red-text)' },
  warning: { bg: 'var(--color-yellow-soft)', text: 'var(--color-yellow-text)', avBg: 'var(--color-yellow-soft)', avText: 'var(--color-yellow-text)' },
  neutral: { bg: 'var(--color-bg-3)',        text: 'var(--color-muted)',       avBg: 'var(--color-bg-3)',        avText: 'var(--color-muted)' },
  success: { bg: 'var(--color-green-soft)',  text: 'var(--color-green-text)',  avBg: 'var(--color-green-soft)',  avText: 'var(--color-green-text)' },
}

// ─── date helpers ────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0]
const diffDays = (a: string, b: string) =>
  Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)

// Derive the "требуют внимания" list from real students: overdue payment,
// weak homework, or poor attendance — worst first, capped at 3.
function deriveAttention(students: any[]): AttentionItem[] {
  const items: (AttentionItem & { rank: number })[] = []
  for (const s of students) {
    let picked: (AttentionItem & { rank: number }) | null = null
    if (s.paymentDue && diffDays(s.paymentDue, TODAY) < 0) {
      picked = {
        id: s.id, name: s.name, initials: initialsOf(s.name), contact: s.telegramLink || undefined, tagKind: 'danger', rank: 0,
        tag: t('долг'), sub: `${Math.abs(diffDays(s.paymentDue, TODAY))} ${t('дн. просрочки')}${s.debt ? ` · ${rub(s.debt)}` : ''}`,
      }
    } else if ((s.hwScore ?? 100) > 0 && (s.hwScore ?? 100) < 50) {
      picked = {
        id: s.id, name: s.name, initials: initialsOf(s.name), contact: s.telegramLink || undefined, tagKind: 'warning', rank: 1,
        tag: `${t('балл')} ${s.hwScore}`, sub: t('низкий результат по ДЗ'),
      }
    } else if ((s.attendance ?? 100) > 0 && (s.attendance ?? 100) < 70) {
      picked = {
        id: s.id, name: s.name, initials: initialsOf(s.name), contact: s.telegramLink || undefined, tagKind: 'warning', rank: 2,
        tag: t('пропуски'), sub: `${t('посещаемость')} ${s.attendance}%`,
      }
    }
    if (picked) items.push(picked)
  }
  return items.sort((a, b) => a.rank - b.rank).slice(0, 3)
}

// ─── section label ───────────────────────────────────────────────────────────
function SectionLabel({ children, action, onAction }: {
  children: React.ReactNode; action?: string; onAction?: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: 2 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase' }}>{children}</span>
      {action && (
        <button onClick={() => { tactile(); onAction?.() }} className="cursor-pointer" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-accent)' }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ─── confetti for the calm state ─────────────────────────────────────────────
const CONFETTI_COLORS = ['#5a4fcf', '#1d9e75', '#efb01e', '#e2554a', '#3789dd', '#d4537e']
function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 42 }, (_, i) => ({
      left: 5 + Math.random() * 90,
      w: 6 + Math.random() * 5,
      h: 10 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dur: 1.7 + Math.random() * 1.4,
      delay: Math.random() * 0.7,
    })), [])
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }} aria-hidden>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: -16, left: `${p.left}%`, width: p.w, height: p.h,
          background: p.color, borderRadius: 2,
          animation: `mth-confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(0.4,0.2,0.6,1) forwards`,
        }} />
      ))}
    </div>
  )
}

// ─── hero (what's on fire) ───────────────────────────────────────────────────
function Hero({ state, review, hard, oldestDays, onOpen }: {
  state: 'overdue' | 'fresh' | 'calm'
  review: number; hard: number; oldestDays: number
  onOpen: () => void
}) {
  const t = useT()
  if (state === 'calm') {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: PAIR.success.bg, padding: '22px 16px', textAlign: 'center' }}>
        <Confetti />
        <div style={{ position: 'relative', zIndex: 4 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <PartyPopper size={26} style={{ color: PAIR.success.text }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 750, color: PAIR.success.text }}>{t('Всё проверено — инбокс пуст')}</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: PAIR.success.text, opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>
            {t('Ни одной работы в очереди. Спокойный день ✨')}
          </div>
        </div>
      </div>
    )
  }
  const danger = state === 'overdue'
  const pair = danger ? PAIR.error : PAIR.focus
  const sub = danger
    ? `${hard} ${t('сложных')} · ${review - hard} ${t('обычных')} · ${t('старейшая ждёт')} ${oldestDays} ${t('дн.')}`
    : `${hard} ${t('сложных')} · ${review - hard} ${t('обычных')} — ${t('свежие, без просрочки')}`
  return (
    <div style={{ borderRadius: 20, background: pair.bg, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ClipboardCheck size={21} style={{ color: pair.text }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 750, color: pair.text, lineHeight: 1.25 }}>{review} {t('работ ждут проверки')}</div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: pair.text, opacity: 0.82, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { tactile(); onOpen() }}
        className="cursor-pointer"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', marginTop: 12, padding: '11px', borderRadius: 12, background: pair.text, color: '#fff', fontSize: 13.5, fontWeight: 700 }}
      >
        <ArrowRight size={16} /> {t('Проверить сейчас')}
      </motion.button>
    </div>
  )
}

// ─── money strip ─────────────────────────────────────────────────────────────
function MoneyStrip({ received, debt, debtorCount, plannedLessons, onOpen }: {
  received: number; debt: number; debtorCount: number; plannedLessons: number; onOpen: () => void
}) {
  const t = useT()
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={() => { tactile(); onOpen() }}
      className="cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '12px 13px', borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Wallet size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)' }}>{t('Доход за месяц')} · {rub(received)}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 1 }}>
          {plannedLessons > 0 ? `${t('ещё')} ${plannedLessons} ${t('занятий по расписанию')}` : t('нет запланированных занятий')}
        </div>
      </div>
      {debt > 0 && (
        <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--color-red-soft)', color: 'var(--color-red-text)' }}>
          {debtorCount} {debtorCount === 1 ? t('долг') : debtorCount < 5 ? t('долга') : t('долгов')} {rub(debt)}
        </span>
      )}
    </motion.button>
  )
}

// ─── schedule ────────────────────────────────────────────────────────────────
const statusDot: Record<ScheduleItem['status'], string> = {
  completed: 'var(--color-green-text)',
  live: 'var(--color-accent)',
  upcoming: 'var(--color-border-strong)',
}

function NextLessonCard({ item, onOpen }: { item: ScheduleItem; onOpen: () => void }) {
  const t = useT()
  return (
    <div style={{ borderRadius: 16, background: 'var(--color-bg-1)', border: '1.5px solid var(--color-purple-soft)', padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 7 }}>
            {item.time} · {item.groupName}
            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }}>
              {item.status === 'live' ? t('идёт') : t('ближайший')}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>
            {item.topic}{item.studentCount > 1 ? ` · ${item.studentCount} ${t('учеников')}` : ''}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { tactile(); onOpen() }} className="cursor-pointer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>
          <Play size={13} /> {t('Открыть')}
        </motion.button>
        <button className="cursor-pointer" style={{ flex: 1, padding: '8px 0', borderRadius: 10, background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12.5, fontWeight: 600, border: '1px solid var(--color-border-soft)' }}>
          {t('Материалы')}
        </button>
      </div>
    </div>
  )
}

function ScheduleRow({ item, last }: { item: ScheduleItem; last: boolean }) {
  const t = useT()
  const done = item.status === 'completed'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--color-border-soft)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot[item.status], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text)' }}>{item.time} · {item.groupName}</div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
          {done ? t('проведён') : item.topic}
        </div>
      </div>
      {done
        ? <CircleCheck size={16} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
        : <Clock size={15} style={{ color: 'var(--color-border-strong)', flexShrink: 0 }} />}
    </div>
  )
}

// ─── attention row ───────────────────────────────────────────────────────────
function AttentionRow({ item, last, onRemind, onOpen }: {
  item: AttentionItem; last: boolean; onRemind: () => void; onOpen: () => void
}) {
  const c = TAG_COLORS[item.tagKind]
  const t = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: last ? 'none' : '1px solid var(--color-border-soft)' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.avBg, color: c.avText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{item.initials}</div>
      <button onClick={() => { tactile(); onOpen() }} className="cursor-pointer text-left" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.name}
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.bg, color: c.text }}>{item.tag}</span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--color-muted)', marginTop: 1 }}>{item.sub}</div>
      </button>
      <button onClick={() => { tactile(); onRemind() }} aria-label={t('Напомнить в Telegram')} className="cursor-pointer flex-shrink-0" style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-bg-3)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border-soft)' }}>
        <Send size={14} />
      </button>
    </div>
  )
}

function LinkRow({ label, sub, url }: { label: string; sub?: string; url: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const copy = () => {
    tactile()
    void copyToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button onClick={copy} className="flex items-center cursor-pointer text-left" style={{ gap: 11, width: '100%', padding: '12px 13px', borderRadius: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
        {sub && <div className="truncate" style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <span className="flex items-center flex-shrink-0" style={{ gap: 5, padding: '7px 12px', borderRadius: 999, background: copied ? 'var(--color-green-soft)' : 'var(--color-accent)', color: copied ? 'var(--color-green-text)' : '#fff', fontSize: 12, fontWeight: 700, transition: 'background 0.18s' }}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? t('Готово') : t('Копировать')}
      </span>
    </button>
  )
}

export default function MobileTeacherHome({ onNavigate }: { onNavigate: (tab: MTab) => void }) {
  const t = useT()
  const home = useHomeData()
  const { submissions } = useHardSubmissions()
  const finance = useFinanceSummary()
  const journalPending = useJournalPending(null)

  const [linksOpen, setLinksOpen] = useState(false)
  const [assignments, setAssignments] = useState<TestAssignment[]>([])
  useEffect(() => { loadTestAssignments().then(setAssignments).catch(() => {}) }, [])
  const activeAssignments = assignments.filter(a => !a.closed)

  const hardReview = submissions.filter(s => s.status === 'submitted').length

  // Build the display model from real hooks; in local dev, when there's no
  // logged-in teacher and everything is empty, fall back to the demo so the
  // screen can be polished with realistic content. Real data always wins.
  const realEmpty = home.totalStudents === 0 && home.pendingCount === 0 && home.todaySchedule.length === 0
  const useDemo = import.meta.env.DEV && realEmpty

  const model: TeacherHomeModel = useDemo ? DEMO_TEACHER_HOME : {
    name: '',
    totalReview: home.pendingCount,
    hardReview,
    studentTotal: home.totalStudents,
    groupCount: home.groups.filter(g => !g.isIndividual).length,
    journalPending: journalPending.length,
    money: {
      received: finance.received,
      debt: finance.debt,
      debtorCount: home.allStudents.filter((s: any) => s.debt && s.debt > 0).length,
      forecast: finance.forecast,
      plannedLessons: home.todaySchedule.filter(s => s.status === 'upcoming').length,
    },
    schedule: home.todaySchedule,
    attention: deriveAttention(home.allStudents),
  }

  const heroState: 'overdue' | 'fresh' | 'calm' =
    model.totalReview === 0 ? 'calm'
    : model.attention.some(a => a.tagKind === 'danger') ? 'overdue'
    : 'fresh'
  const oldestDays = 2

  const nextLesson = model.schedule.find(s => s.status === 'live')
    ?? model.schedule.find(s => s.status === 'upcoming')
  const restSchedule = model.schedule.filter(s => s.id !== nextLesson?.id)

  const topZone = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <GlassPill>
        <span style={{ fontWeight: 750 }}>{model.name ? `${t('Привет')}, ${model.name}` : t('Кабинет учителя')}</span>
      </GlassPill>
      <GlassPill>
        <Users size={15} style={{ color: 'var(--color-accent)' }} /> {model.studentTotal}
      </GlassPill>
    </div>
  )

  return (
    <MobileScreen topZone={topZone} topPad={72} scrollKey="t-home">
      <style>{`@keyframes mth-confetti-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(240px) rotate(560deg);opacity:0}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 1 — what's on fire */}
        <Hero
          state={heroState}
          review={model.totalReview}
          hard={model.hardReview}
          oldestDays={oldestDays}
          onOpen={() => onNavigate('review')}
        />

        {/* 2 — money */}
        <MoneyStrip
          received={model.money.received}
          debt={model.money.debt}
          debtorCount={model.money.debtorCount}
          plannedLessons={model.money.plannedLessons}
          onOpen={() => onNavigate('students')}
        />

        {/* 3 — schedule */}
        {model.schedule.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>{t('Сегодня')}</SectionLabel>
            {nextLesson && <NextLessonCard item={nextLesson} onOpen={() => onNavigate('gradebook')} />}
            {restSchedule.length > 0 && (
              <div style={{ borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', padding: '2px 13px' }}>
                {restSchedule.map((s, i) => (
                  <ScheduleRow key={s.id} item={s} last={i === restSchedule.length - 1} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* журнал не заполнен */}
        {model.journalPending > 0 && (
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => { tactile(); onNavigate('gradebook') }}
            className="cursor-pointer"
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 16, background: PAIR.warning.bg }}
          >
            <AlertTriangle size={18} style={{ color: PAIR.warning.text, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: PAIR.warning.text }}>{t('Журнал не заполнен')}</span>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: PAIR.warning.text, opacity: 0.82, marginTop: 2 }}>{model.journalPending} {t('урок(а) ждут отметки')}</span>
            </span>
            <ChevronRight size={18} style={{ color: PAIR.warning.text, opacity: 0.7, flexShrink: 0 }} />
          </motion.button>
        )}

        {/* 4 — attention */}
        {model.attention.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel action={t('все ›')} onAction={() => onNavigate('students')}>{t('Требуют внимания')}</SectionLabel>
            <div style={{ borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', padding: '4px 13px' }}>
              {model.attention.map((a, i) => (
                <AttentionRow
                  key={a.id}
                  item={a}
                  last={i === model.attention.length - 1}
                  onOpen={() => onNavigate('students')}
                  onRemind={() => {
                    // Есть контакт ученика → открываем чат в Telegram/VK; иначе — карточка ученика.
                    if (a.contact) window.open(contactHref(a.contact), '_blank', 'noopener')
                    else onNavigate('students')
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* quick action — test links */}
        <button
          onClick={() => { tactile(); setLinksOpen(true) }}
          className="flex items-center cursor-pointer text-left"
          style={{ gap: 12, width: '100%', padding: '13px 14px', borderRadius: 16, background: PAIR.success.bg }}
        >
          <Link2 size={18} style={{ color: PAIR.success.text, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: PAIR.success.text }}>{t('Ссылки на тесты')}</span>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: PAIR.success.text, opacity: 0.82, marginTop: 2 }}>{t('скопировать ученикам — диагностики и назначения')}</span>
          </span>
          <ChevronRight size={18} style={{ color: PAIR.success.text, opacity: 0.7, flexShrink: 0 }} />
        </button>

        {/* desktop-only hint */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
          <BookOpen size={17} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)', lineHeight: 1.35 }}>
            {t('Полный конструктор курсов, тренажёров и редактор уроков — на компьютере.')}
          </span>
        </div>
      </div>

      {/* Test links sheet */}
      <MobileSheet open={linksOpen} onClose={() => setLinksOpen(false)} title={t('Ссылки на тесты')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
          {activeAssignments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('Активные назначения')}</div>
              {activeAssignments.map(a => (
                <LinkRow key={a.id} label={a.title} sub={`${a.assignType === 'trial' ? t('Пробник') : t('Тест')}${a.dueDate ? ` · ${t('до')} ${a.dueDate}` : ''}`} url={diagLink(a.subject, a.id)} />
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{t('Диагностики по предметам')}</div>
            {DIAG_SUBJECTS.map(s => (
              <LinkRow key={s.id} label={t(s.label)} sub={t('открытая диагностика')} url={diagLink(s.id)} />
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.4, padding: '0 2px' }}>
            {t('Ссылку можно отправить ученику в любом мессенджере — он откроет тест по ней.')}
          </div>
        </div>
      </MobileSheet>
    </MobileScreen>
  )
}
