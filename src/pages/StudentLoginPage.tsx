import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { setStudentSession } from '../lib/studentSession'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 12,
  border: '1.5px solid #E8E8EA', fontSize: 16, outline: 'none',
  boxSizing: 'border-box',
}

export default function StudentLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

    // 1) Preferred path — Supabase Auth (students carry auth_user_id).
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (authData?.user) {
      // A 1:1 student can own several subject cards (rows) sharing one auth_user_id,
      // so fetch all and open the earliest (primary) one. maybeSingle() would throw
      // on multiple rows — hence the ordered list + first.
      const { data: srows } = await supabase
        .from('students')
        .select('id, name, group_id, created_at')
        .eq('auth_user_id', authData.user.id)
        .order('created_at', { ascending: true })
      const srow = srows?.[0]
      if (srow) {
        setLoading(false)
        setStudentSession({ id: srow.id, name: srow.name, groupId: srow.group_id })
        window.location.reload()
        return
      }
      // Authed but not a student account — sign back out to avoid a stray session.
      await supabase.auth.signOut()
    }

    // 2) Fallback — legacy temp_password login for students not yet migrated.
    const { data, error: rpcError } = await supabase.rpc('student_login', {
      p_email: email.trim(),
      p_password: password,
    })
    setLoading(false)
    if (rpcError || !data || data.length === 0) {
      setError('Неверный email или пароль')
      return
    }
    const s = data[0] as { id: string; name: string; group_id: string }
    setStudentSession({ id: s.id, name: s.name, groupId: s.group_id })
    window.location.reload()
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'var(--color-bg-input)', borderRadius: 24, padding: 28,
          width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)' }}>Вход в кабинет</div>
          <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>Введите email и пароль</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            style={inputStyle}
            autoFocus
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Пароль"
              aria-label="Пароль"
              style={{ ...inputStyle, paddingRight: 44 }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, color: 'var(--color-muted)',
              }}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#A8282D', background: 'var(--color-red-soft)', borderRadius: 10, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!email.trim() || !password || loading}
          style={{
            marginTop: 22, width: '100%', padding: '13px 0',
            background: email.trim() && password ? 'var(--color-purple)' : 'rgba(155,109,255,0.35)',
            color: '#fff', fontWeight: 700, fontSize: 15,
            border: 'none', borderRadius: 14,
            cursor: email.trim() && password ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
          Если забыли пароль — обратитесь к учителю
        </div>
      </motion.div>
    </div>
  )
}
