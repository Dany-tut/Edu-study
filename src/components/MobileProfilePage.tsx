import { motion } from 'framer-motion'
import { LogOut, Flame, CheckCircle2, Star, TrendingUp } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import ThemeToggleBtn from './ThemeToggleBtn'
import { getStudentSession, clearStudentSession } from '../lib/studentSession'
import { useStudentData } from '../store/studentDataStore'
import { PAIR } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'
import type { LucideIcon } from 'lucide-react'

// MOBILE ONLY profile. Desktop has no profile screen. Avatar + name, stats,
// theme toggle, logout.

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

  const logout = () => {
    tactile()
    clearStudentSession()
    window.location.hash = '#/'
    window.location.reload()
  }

  return (
    <>
      <MobileScreen>
        <div className="flex flex-col" style={{ gap: 18 }}>
          {/* Identity */}
          <div className="flex items-center" style={{ gap: 14, paddingTop: 4 }}>
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontSize: 28, fontWeight: 700, boxShadow: 'var(--shadow-md)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1 }}>{name}</div>
              <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-muted)', marginTop: 3 }}>{subjectLine}</div>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, padding: '4px 2px' }}>
              НАСТРОЙКИ
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
