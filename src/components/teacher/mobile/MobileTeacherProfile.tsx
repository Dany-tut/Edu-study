import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Monitor } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import ThemeToggleBtn from '../../ThemeToggleBtn'
import { PAIR } from '../../../lib/mobileTokens'
import { tactile } from '../../../lib/feedback'
import { supabase } from '../../../lib/supabase'

// MOBILE ONLY teacher profile: identity, theme, logout, and a note that the
// authoring tools live on desktop.

export default function MobileTeacherProfile() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  const name = email ? email.split('@')[0] : 'Учитель'
  const initial = name.charAt(0).toUpperCase()

  const logout = async () => {
    tactile()
    await supabase.auth.signOut()
    window.location.hash = '#/teacher'
    window.location.reload()
  }

  return (
    <MobileScreen scrollKey="t-profile">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1, textTransform: 'capitalize' }}>{name}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email || 'Учительский кабинет'}</div>
          </div>
        </div>

        {/* Desktop tools note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 16, background: PAIR.info.bg }}>
          <Monitor size={20} style={{ color: PAIR.info.text, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 550, color: PAIR.info.text, lineHeight: 1.4 }}>
            Конструктор курсов, тренажёров и редактор уроков — на компьютере. На телефоне: проверка, ученики и журнал.
          </span>
        </div>

        {/* Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, padding: '4px 2px' }}>НАСТРОЙКИ</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Тема оформления</span>
            <ThemeToggleBtn />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="flex items-center justify-center cursor-pointer"
            style={{ gap: 8, padding: 14, borderRadius: 16, background: PAIR.error.bg, color: PAIR.error.text, border: '1px solid transparent', fontSize: 15, fontWeight: 650 }}
          >
            <LogOut size={18} /> Выйти из аккаунта
          </motion.button>
        </div>
      </div>
    </MobileScreen>
  )
}
