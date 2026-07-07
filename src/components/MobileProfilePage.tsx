import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { LogOut, Flame, CheckCircle2, Star, TrendingUp, Zap, Moon, Sun, MessageSquarePlus, Download, ChevronDown, ChevronRight, Check, BookOpen, ListChecks } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileSheet from './MobileSheet'
import { DynamicIsland } from './mobileChrome'
import MobileBell from './MobileBell'
import SubjectSwitcher from './SubjectSwitcher'
import FeedbackModal from './FeedbackModal'
import { getStudentSession, clearStudentSession } from '../lib/studentSession'
import { supabase } from '../lib/supabase'
import { useStudentData } from '../store/studentDataStore'
import { useTheme } from '../store/themeStore'
import { PAIR } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'
import { requestShowInstall, isStandalone } from '../lib/pwaInstall'
import type { LucideIcon } from 'lucide-react'
import type { Subject } from '../data/mockData'

// MOBILE ONLY profile. Desktop has no profile screen. Floating glass chrome
// (Dynamic Island streak/XP) + identity + level/XP hero + stats + settings.

const XP_PER_LEVEL = 200
const RANKS = ['Старт', 'Атомы', 'Молекулы', 'Реакции', 'Растворы', 'Эксперт', 'Мастер']

// Soft colour pairs cycled across the subject chips under the name.
const CHIP_PALETTE = [PAIR.focus, PAIR.accent2, PAIR.info, PAIR.warning, PAIR.rose, PAIR.success]

// Per-subject stats derived from the subject's own lessons (the global `stats`
// covers every subject at once). Streak/stars are account-wide, so the subject
// view swaps in progress % + lesson count instead.
function computeSubjectStats(subject: Subject) {
  const lessons = subject.modules.flatMap(m => m.lessons)
  const completed = lessons.filter(l => l.status === 'completed').length
  const graded = lessons.filter(l => typeof l.points === 'number')
  const avg = graded.length ? Math.round(graded.reduce((s, l) => s + (l.points ?? 0), 0) / graded.length) : 0
  return { completed, total: lessons.length, avg, progress: subject.progress }
}

function StatCard({ icon: Icon, value, label, pair }: { icon: LucideIcon; value: string | number; label: string; pair: { bg: string; text: string } }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '16px 14px', borderRadius: 18, background: pair.bg, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Icon size={18} style={{ color: pair.text }} />
      <div style={{ fontSize: 24, fontWeight: 750, color: pair.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: pair.text, opacity: 0.85, lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}

export default function MobileProfilePage() {
  const name = getStudentSession()?.name?.trim() || 'Ученик'
  const initial = name.charAt(0).toUpperCase()
  const stats = useStudentData(s => s.stats)
  const subjects = useStudentData(s => s.subjects)
  const { dark, toggle } = useTheme()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Stats scope: 'all' = account-wide totals, or a single subject's own numbers.
  const [statScope, setStatScope] = useState<'all' | string>('all')
  const [scopeSheet, setScopeSheet] = useState(false)

  // Show the "install app" row only when not already running as an installed PWA.
  const canInstall = !isStandalone()

  const scopeSubject = statScope === 'all' ? null : subjects.find(s => s.id === statScope) ?? null
  const scopeLabel = scopeSubject ? scopeSubject.name : 'Все предметы'
  const subjectStats = useMemo(() => scopeSubject ? computeSubjectStats(scopeSubject) : null, [scopeSubject])

  const level = Math.floor(stats.totalPoints / XP_PER_LEVEL) + 1
  const xpInLevel = stats.totalPoints % XP_PER_LEVEL
  const rank = RANKS[Math.min(level - 1, RANKS.length - 1)]

  const logout = () => {
    tactile()
    clearStudentSession()
    void supabase.auth.signOut()
    window.location.hash = '#/'
    window.location.reload()
  }

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <div style={{ width: 38, flexShrink: 0 }} />
      <DynamicIsland>
        <Flame size={15} style={{ color: '#F8A23B' }} />
        <span>{stats.streak} дней</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <Zap size={14} style={{ color: 'var(--color-accent)' }} />
        <span>{stats.totalPoints}</span>
      </DynamicIsland>
      <MobileBell />
    </div>
  )

  return (
    <>
      <MobileScreen topZone={topZone} topPad={72}>
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* Identity */}
          <div className="flex items-center" style={{ gap: 14, paddingTop: 4 }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 60, height: 60, borderRadius: 999, background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', color: '#fff', fontSize: 26, fontWeight: 700, boxShadow: '0 8px 22px rgba(123,63,204,0.3)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1 }}>{name}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', marginTop: 3 }}>Уровень {level} · {rank}</div>
            </div>
          </div>

          {/* Subject chips — full names wrap onto multiple rows, never truncated. */}
          {subjects.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: 6, marginTop: -4 }}>
              {subjects.map((s, i) => {
                const c = CHIP_PALETTE[i % CHIP_PALETTE.length]
                return (
                  <span key={s.id} style={{ background: c.bg, color: c.text, fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 999 }}>
                    {s.name}
                  </span>
                )
              })}
            </div>
          )}

          {/* Переключатель предметов (для учеников 1:1 с несколькими карточками) */}
          <SubjectSwitcher />

          {/* Level / XP hero */}
          <div style={{ borderRadius: 20, padding: '14px 16px', background: 'var(--color-purple-soft)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-purple-text)' }}>Уровень {level} · {rank}</span>
              <span className="flex items-center" style={{ gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-purple-text)' }}>
                <Zap size={13} />{xpInLevel}/{XP_PER_LEVEL} XP
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${Math.round((xpInLevel / XP_PER_LEVEL) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#9B6FE8,#C58BFF)', borderRadius: 99 }} />
            </div>
          </div>

          {/* Stats — header clarifies the scope; the selector switches between
              account-wide totals and a single subject's own numbers. */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div className="flex items-center justify-between" style={{ paddingRight: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Статистика</span>
              {subjects.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { tactile(); setScopeSheet(true) }}
                  className="flex items-center cursor-pointer"
                  style={{ gap: 5, height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', color: 'var(--color-accent)', fontSize: 12.5, fontWeight: 600 }}
                >
                  {scopeLabel}
                  <ChevronDown size={14} />
                </motion.button>
              )}
            </div>
            {subjectStats ? (
              <>
                <div className="flex" style={{ gap: 10 }}>
                  <StatCard icon={CheckCircle2} value={subjectStats.completed} label="Выполнено уроков" pair={PAIR.success} />
                  <StatCard icon={TrendingUp} value={subjectStats.avg ? `${subjectStats.avg}%` : '—'} label="Средний балл" pair={PAIR.info} />
                </div>
                <div className="flex" style={{ gap: 10 }}>
                  <StatCard icon={ListChecks} value={`${subjectStats.progress}%`} label="Пройдено курса" pair={PAIR.focus} />
                  <StatCard icon={BookOpen} value={subjectStats.total} label="Всего уроков" pair={PAIR.review} />
                </div>
              </>
            ) : (
              <>
                <div className="flex" style={{ gap: 10 }}>
                  <StatCard icon={CheckCircle2} value={stats.completedTasks} label="Выполнено заданий" pair={PAIR.success} />
                  <StatCard icon={TrendingUp} value={`${stats.avgScore}%`} label="Средний балл" pair={PAIR.info} />
                </div>
                <div className="flex" style={{ gap: 10 }}>
                  <StatCard icon={Flame} value={stats.streak} label="Дней подряд" pair={PAIR.review} />
                  <StatCard icon={Star} value={stats.stars} label="Звёзды" pair={PAIR.focus} />
                </div>
              </>
            )}
          </div>

          {/* Settings — grouped into one card with hairline dividers instead of
              separate full-width plates. */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 2px' }}>
              Настройки
            </div>
            <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
              {/* Theme — inline Светлая/Тёмная segment */}
              <div className="flex items-center justify-between" style={{ padding: '12px 15px', borderBottom: '1px solid var(--color-border-soft)' }}>
                <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>Тема оформления</span>
                <button
                  onClick={() => { tactile(); toggle() }}
                  className="flex items-center cursor-pointer"
                  style={{ gap: 2, padding: 3, borderRadius: 999, background: 'var(--color-bg-5)', border: 'none' }}
                  aria-label="Переключить тему"
                >
                  {([false, true] as const).map(d => {
                    const active = dark === d
                    return (
                      <span key={String(d)} className="flex items-center" style={{ gap: 5, height: 28, padding: '0 11px', borderRadius: 999, background: active ? 'rgba(var(--glass-rgb),0.98)' : 'transparent', color: active ? 'var(--color-accent)' : 'var(--color-text-3)', fontSize: 12.5, fontWeight: 600, boxShadow: active ? 'var(--shadow-xs)' : 'none', transition: 'background 0.2s, color 0.2s' }}>
                        {d ? <Moon size={13} strokeWidth={1.9} /> : <Sun size={13} strokeWidth={1.9} />}
                        {d ? 'Тёмная' : 'Светлая'}
                      </span>
                    )
                  })}
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => { tactile(); setFeedbackOpen(true) }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '14px 15px', background: 'transparent', border: 'none', borderBottom: canInstall ? '1px solid var(--color-border-soft)' : 'none' }}
              >
                <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
                  <MessageSquarePlus size={18} style={{ color: 'var(--color-muted)' }} />Обратная связь
                </span>
                <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />
              </motion.button>

              {canInstall && (
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { tactile(); requestShowInstall() }}
                  className="flex items-center justify-between cursor-pointer"
                  style={{ width: '100%', padding: '14px 15px', background: 'transparent', border: 'none' }}
                >
                  <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
                    <Download size={18} style={{ color: 'var(--color-muted)' }} />Установить приложение
                  </span>
                  <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />
                </motion.button>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              className="flex items-center justify-center cursor-pointer"
              style={{ gap: 8, padding: '13px', borderRadius: 16, background: 'transparent', color: PAIR.error.text, border: 'none', fontSize: 14.5, fontWeight: 600 }}
            >
              <LogOut size={17} />
              Выйти из аккаунта
            </motion.button>
          </div>
        </div>
      </MobileScreen>
      <MobileBottomNav />
      {feedbackOpen && <FeedbackModal role="student" onClose={() => setFeedbackOpen(false)} />}

      {/* Stats scope picker */}
      <MobileSheet open={scopeSheet} onClose={() => setScopeSheet(false)} title="Статистика по">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[{ id: 'all', name: 'Все предметы' }, ...subjects].map(o => {
            const active = statScope === o.id
            return (
              <button
                key={o.id}
                onClick={() => { tactile(); setStatScope(o.id); setScopeSheet(false) }}
                className="flex items-center justify-between cursor-pointer"
                style={{ padding: '13px 15px', borderRadius: 14, background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-input)', border: 'none', textAlign: 'left', color: active ? 'var(--color-accent)' : 'var(--color-text)', fontSize: 15, fontWeight: active ? 650 : 500 }}
              >
                {o.name}
                {active && <Check size={18} />}
              </button>
            )
          })}
        </div>
      </MobileSheet>
    </>
  )
}
