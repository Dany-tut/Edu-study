import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { setStudentSession } from '../lib/studentSession'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1.5px solid #E8E8EA', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', marginTop: 6,
}

export default function StudentLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')

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
    window.location.hash = '#/'
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#F4F4F6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: '#fff', borderRadius: 24, padding: 32,
          width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 750, color: '#0B0B0D' }}>Вход в кабинет</div>
          <div style={{ fontSize: 14, color: '#6F6F76', marginTop: 4 }}>Введите email и пароль</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3F', display: 'flex', flexDirection: 'column' }}>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alice@example.com"
              style={inputStyle}
              autoFocus
            />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#3A3A3F', display: 'flex', flexDirection: 'column' }}>
            Пароль
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </label>
        </div>

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#A8282D', background: '#FFE1E4', borderRadius: 10, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={!email.trim() || !password || loading}
          style={{
            marginTop: 22, width: '100%', padding: '13px 0',
            background: email.trim() && password ? '#9B6DFF' : '#e0d4ff',
            color: '#fff', fontWeight: 700, fontSize: 15,
            border: 'none', borderRadius: 14,
            cursor: email.trim() && password ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: '#9A9AA2', textAlign: 'center' }}>
          Если забыли пароль — обратитесь к учителю
        </div>
      </motion.div>
    </div>
  )
}
