import { motion } from 'framer-motion'
import { LogOut, Flame, CheckCircle2, Star, TrendingUp, Zap, Bell } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import ThemeToggleBtn from './ThemeToggleBtn'
import { DynamicIsland, GlassIconButton } from './mobileChrome'
import { getStudentSession, clearStudentSession } from '../lib/studentSession'
import { useStudentData } from '../store/studentDataStore'
import { PAIR } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'
import type { LucideIcon } from 'lucide-react'

// MOBILE ONLY profile. Desktop has no profile screen. Floating glass chrome
// (Dynamic Island streak/XP) + identity + level/XP hero + stats + settings.

const XP_PER_LEVEL = 200
const RANKS = ['Старт', 'Атомы', 'Молекулы', 'Реакции', 'Растворы', 'Эксперт', 'Мастер']

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

  const subjectLine = subjects.length > 0 ? subjects.map(s => s.name).join(' · ') : 'Ученик'

  const level = Math.floor(stats.totalPoints / XP_PER_LEVEL) + 1
  const xpInLevel = stats.totalPoints % XP_PER_LEVEL
  const rank = RANKS[Math.min(level - 1, RANKS.length - 1)]

  const logout = () => {
    tactile()
    clearStudentSession()
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
      <GlassIconButton icon={<Bell size={16} />} dot ariaLabel="Уведомления" />
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
              style={{ width: 64, height: 64, borderRadius: 999, background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', color: '#fff', fontSize: 28, fontWeight: 700, boxShadow: '0 8px 22px rgba(123,63,204,0.3)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1 }}>{name}</div>
              <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-muted)', marginTop: 3 }}>{subjectLine}</div>
            </div>
          </div>

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

          {/* Stats */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div className="flex" style={{ gap: 10 }}>
              <StatCard icon={CheckCircle2} value={stats.completedTasks} label="Выполнено заданий" pair={PAIR.success} />
              <StatCard icon={TrendingUp} value={`${stats.avgScore}%`} label="Средний балл" pair={PAIR.info} />
            </div>
            <div className="flex" style={{ gap: 10 }}>
              <StatCard icon={Flame} value={stats.streak} label="Дней подряд" pair={PAIR.review} />
              <StatCard icon={Star} value={stats.stars} label="Звёзды" pair={PAIR.focus} />
            </div>
          </div>

          {/* Settings */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 2px' }}>
              Настройки
            </div>
            <div
              className="flex items-center justify-between"
              style={{ padding: '12px 16px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Тема оформления</span>
              <ThemeToggleBtn />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              className="flex items-center justify-center cursor-pointer"
              style={{ gap: 8, padding: '14px', borderRadius: 16, background: PAIR.error.bg, color: PAIR.error.text, border: '1px solid transparent', fontSize: 15, fontWeight: 650 }}
            >
              <LogOut size={18} />
              Выйти из аккаунта
            </motion.button>
          </div>
        </div>
      </MobileScreen>
      <MobileBottomNav />
    </>
  )
}
