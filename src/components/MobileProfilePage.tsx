import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { LogOut, Flame, CheckCircle2, Star, TrendingUp, Zap, Moon, Sun, MessageSquarePlus, Download, ChevronRight, BookOpen, ListChecks } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileDock, { DockSegment } from './MobileDock'
import { DynamicIsland } from './mobileChrome'
import MobileBell from './MobileBell'
import SubjectSwitcher from './SubjectSwitcher'
import FeedbackModal from './FeedbackModal'
import { getStudentSession, clearStudentSession } from '../lib/studentSession'
import { supabase } from '../lib/supabase'
import { trackNow } from '../lib/analytics'
import { useStudentData } from '../store/studentDataStore'
import { useTheme } from '../store/themeStore'
import { useT, useLang, type Lang } from '../lib/i18n'
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

export default function MobileProfilePage() {
  const t = useT()
  const { lang, setLang } = useLang()
  const name = getStudentSession()?.name?.trim() || t('Ученик')
  const initial = name.charAt(0).toUpperCase()
  const stats = useStudentData(s => s.stats)
  const subjects = useStudentData(s => s.subjects)
  const { dark, toggle } = useTheme()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Stats scope: 'all' = account-wide totals, or a single subject's own numbers.
  const [statScope, setStatScope] = useState<'all' | string>('all')

  // Show the "install app" row only when not already running as an installed PWA.
  const canInstall = !isStandalone()

  const scopeSubject = statScope === 'all' ? null : subjects.find(s => s.id === statScope) ?? null
  const scopeLabel = scopeSubject ? scopeSubject.name : t('Все предметы')
  const subjectStats = useMemo(() => scopeSubject ? computeSubjectStats(scopeSubject) : null, [scopeSubject])

  // Recent graded scores → sparkline trend. In-order proxy for a time series
  // (lessons carry no timestamp): the last dozen graded lessons' points.
  const trend = useMemo(() => {
    const src = scopeSubject ? [scopeSubject] : subjects
    return src
      .flatMap(s => s.modules.flatMap(m => m.lessons))
      .filter(l => typeof l.points === 'number')
      .map(l => l.points as number)
      .slice(-12)
  }, [scopeSubject, subjects])

  const heroAvg = subjectStats ? subjectStats.avg : stats.avgScore

  const level = Math.floor(stats.totalPoints / XP_PER_LEVEL) + 1
  const xpInLevel = stats.totalPoints % XP_PER_LEVEL
  const rank = t(RANKS[Math.min(level - 1, RANKS.length - 1)])

  const logout = () => {
    tactile()
    clearStudentSession()
    void trackNow('logout', { role: 'student' })
    void supabase.auth.signOut()
    window.location.hash = '#/'
    window.location.reload()
  }

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <div style={{ width: 38, flexShrink: 0 }} />
      <DynamicIsland>
        <Flame size={15} style={{ color: '#F8A23B' }} />
        <span>{stats.streak} {t('дней')}</span>
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
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', marginTop: 3 }}>{t('Уровень')} {level} · {rank}</div>
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
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-purple-text)' }}>{t('Уровень')} {level} · {rank}</span>
              <span className="flex items-center" style={{ gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-purple-text)' }}>
                <Zap size={13} />{xpInLevel}/{XP_PER_LEVEL} XP
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${Math.round((xpInLevel / XP_PER_LEVEL) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#9B6FE8,#C58BFF)', borderRadius: 99 }} />
            </div>
          </div>

          {/* Stats (В4 redesign) — one hero metric (средний балл + спарклайн)
              leads, secondary numbers sit compactly below. Scope switches via
              the bottom dock, not a hidden header dropdown. */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('Статистика')} · {scopeLabel}
            </span>

            {/* Hero — средний балл + trend */}
            <div style={{ borderRadius: 20, padding: 16, color: '#fff', background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', boxShadow: '0 10px 26px rgba(123,63,204,0.28)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('Средний балл')}</div>
                  <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, marginTop: 6 }}>{heroAvg ? `${heroAvg}%` : '—'}</div>
                </div>
                <TrendingUp size={22} style={{ opacity: 0.9 }} />
              </div>
              <Sparkline data={trend} />
            </div>

            {/* Secondary metrics — compact grid */}
            {subjectStats ? (
              <div className="flex" style={{ gap: 8 }}>
                <MiniStat icon={CheckCircle2} value={subjectStats.completed} label={t('Выполнено')} pair={PAIR.success} />
                <MiniStat icon={ListChecks} value={`${subjectStats.progress}%`} label={t('Пройдено')} pair={PAIR.focus} />
                <MiniStat icon={BookOpen} value={subjectStats.total} label={t('Всего уроков')} pair={PAIR.review} />
              </div>
            ) : (
              <div className="flex" style={{ gap: 8 }}>
                <MiniStat icon={CheckCircle2} value={stats.completedTasks} label={t('Заданий')} pair={PAIR.success} />
                <MiniStat icon={Flame} value={stats.streak} label={t('Дней')} pair={PAIR.warning} />
                <MiniStat icon={Star} value={stats.stars} label={t('Звёзды')} pair={PAIR.focus} />
              </div>
            )}
          </div>

          {/* Settings — grouped into one card with hairline dividers instead of
              separate full-width plates. */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 2px' }}>
              {t('Настройки')}
            </div>
            <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
              {/* Тема — весь ряд кликабелен, один тап меняет тему */}
              <button
                onClick={() => { tactile(); toggle() }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '12px 15px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border-soft)' }}
                aria-label={t('Переключить тему')}
              >
                <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t('Тема оформления')}</span>
                <span className="flex items-center" style={{ gap: 5, height: 34, padding: '0 15px', borderRadius: 999, background: 'var(--color-bg-5)', color: 'var(--color-accent)', fontSize: 12.5, fontWeight: 600 }}>
                  {dark ? <Moon size={13} strokeWidth={1.9} /> : <Sun size={13} strokeWidth={1.9} />}
                  {dark ? t('Тёмная') : t('Светлая')}
                </span>
              </button>

              {/* Язык — весь ряд кликабелен, один тап меняет язык */}
              <button
                onClick={() => { tactile(); setLang((lang === 'ru' ? 'en' : 'ru') as Lang) }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '12px 15px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border-soft)' }}
                aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              >
                <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t('Язык')}</span>
                <span className="flex items-center" style={{ height: 34, padding: '0 15px', borderRadius: 999, background: 'var(--color-bg-5)', color: 'var(--color-accent)', fontSize: 12.5, fontWeight: 600 }}>
                  {lang === 'ru' ? 'Русский' : 'English'}
                </span>
              </button>

              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => { tactile(); setFeedbackOpen(true) }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '14px 15px', background: 'transparent', border: 'none', borderBottom: canInstall ? '1px solid var(--color-border-soft)' : 'none' }}
              >
                <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
                  <MessageSquarePlus size={18} style={{ color: 'var(--color-muted)' }} />{t('Обратная связь')}
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
                    <Download size={18} style={{ color: 'var(--color-muted)' }} />{t('Установить приложение')}
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
              {t('Выйти из аккаунта')}
            </motion.button>
          </div>
        </div>
      </MobileScreen>

      {/* В2 — stats scope switcher (замена спрятанной кнопки в заголовке) */}
      {subjects.length > 0 && (
        <MobileDock>
          <DockSegment
            options={[{ id: 'all', label: t('Все') }, ...subjects.map(s => ({ id: s.id, label: s.name }))]}
            value={statScope}
            onChange={setStatScope}
          />
        </MobileDock>
      )}

      <MobileBottomNav />
      {feedbackOpen && <FeedbackModal role="student" onClose={() => setFeedbackOpen(false)} />}
    </>
  )
}

// Compact sparkline for the стат-hero. Points map to 0–100 range; endpoint dot
// emphasised. Pure SVG — no rAF (unsupported in preview).
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div style={{ height: 30, marginTop: 12 }} />
  const w = 260, h = 30
  const max = Math.max(...data, 100), min = Math.min(...data, 0)
  const span = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / span) * h
    return [x, y] as const
  })
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const [ex, ey] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 30, marginTop: 12, display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} vectorEffect="non-scaling-stroke" />
      <circle cx={ex} cy={ey} r={3} fill="#fff" />
    </svg>
  )
}

function MiniStat({ icon: Icon, value, label, pair }: { icon: LucideIcon; value: string | number; label: string; pair: { bg: string; text: string } }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 12px', borderRadius: 16, background: pair.bg, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Icon size={16} style={{ color: pair.text }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: pair.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: pair.text, opacity: 0.85, lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}
