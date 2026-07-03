import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Save, User,
  Flower2, Cat, Rabbit, Bird, Fish, Bug, Rocket, Star, type LucideIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTeacher } from '../../store/teacherStore'
import { usePersistentState, readDraft, clearDrafts } from '../../lib/useDraft'

type AvatarOption = { id: string; Icon: LucideIcon; gradient: string }

const AVATARS: AvatarOption[] = [
  { id: 'flower', Icon: Flower2, gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))' },
  { id: 'cat',    Icon: Cat,    gradient: 'linear-gradient(135deg, hsl(28 92% 68%), hsl(14 84% 56%))' },
  { id: 'rabbit', Icon: Rabbit, gradient: 'linear-gradient(135deg, hsl(330 88% 74%), hsl(345 76% 60%))' },
  { id: 'bird',   Icon: Bird,   gradient: 'linear-gradient(135deg, hsl(205 92% 70%), hsl(220 80% 58%))' },
  { id: 'fish',   Icon: Fish,   gradient: 'linear-gradient(135deg, hsl(180 72% 62%), hsl(196 78% 50%))' },
  { id: 'bug',    Icon: Bug,    gradient: 'linear-gradient(135deg, hsl(2 82% 70%), hsl(354 74% 56%))' },
  { id: 'rocket', Icon: Rocket, gradient: 'linear-gradient(135deg, hsl(46 96% 66%), hsl(36 92% 54%))' },
  { id: 'star',   Icon: Star,   gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))' },
]

export default function TeacherProfileSettingsPage() {
  const setActivePage = useTeacher(s => s.setActivePage)

  // Snapshot before usePersistentState mirrors initial values into storage —
  // an existing draft must win over the async profile load below.
  const [hadDraft] = useState(() => ({
    name: readDraft('profile.name') !== null,
    avatarId: readDraft('profile.avatarId') !== null,
  }))
  // Draft-backed: survives a page reload; cleared on successful save.
  const [name,     setName]     = usePersistentState('profile.name', '')
  const [avatarId, setAvatarId] = usePersistentState('profile.avatarId', 'flower')
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState<'admin' | 'teacher'>('teacher')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      if (!hadDraft.name) setName(u.user_metadata?.name ?? u.email?.split('@')[0] ?? '')
      setEmail(u.email ?? '')
      setRole(u.user_metadata?.role === 'admin' ? 'admin' : 'teacher')
      if (!hadDraft.avatarId) setAvatarId(u.user_metadata?.avatarId ?? 'flower')
    })
  }, [])

  const selectedAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0]
  const AvatarIcon = selectedAvatar.Icon

  async function handleSave() {
    setSaving(true); setSaved(false); setError('')
    const { error: err } = await supabase.auth.updateUser({
      data: { name: name.trim(), avatarId },
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    clearDrafts('profile.')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 12,
    border: '1px solid var(--color-border-medium)',
    background: 'var(--color-bg-3)', color: 'var(--color-text)',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setActivePage('home')}
            style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--color-bg-3)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-3)', flexShrink: 0 }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>Настройки профиля</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>Имя, аватар и данные аккаунта</div>
          </div>
        </div>

        {/* Avatar preview + picker */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <motion.div
            key={avatarId}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 460, damping: 22 }}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: selectedAvatar.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(106,90,230,0.35)',
              marginBottom: 12,
            }}
          >
            <AvatarIcon size={38} strokeWidth={1.8} style={{ color: '#fff' }} />
          </motion.div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 16 }}>
            {role === 'admin' ? 'Администратор' : 'Учитель'}
          </div>

          {/* Avatar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {AVATARS.map(opt => {
              const Ic = opt.Icon
              const isSelected = avatarId === opt.id
              return (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setAvatarId(opt.id)}
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: opt.gradient,
                    border: isSelected ? '2.5px solid #fff' : '2.5px solid transparent',
                    cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 0 3px var(--color-accent)' : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                >
                  <Ic size={24} strokeWidth={1.8} style={{ color: '#fff' }} />
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 7 }}>Имя</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Ваше имя"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 7 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <input value={email} readOnly style={{ ...inputStyle, color: 'var(--color-text-3)', cursor: 'not-allowed' }} />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--color-text-3)', background: 'var(--color-bg-3)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                только чтение
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 5 }}>Для смены email обратитесь в поддержку</div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 7 }}>Роль</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)' }}>
              <User size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
              <span style={{ fontSize: 14, color: 'var(--color-text-3)' }}>{role === 'admin' ? 'Администратор' : 'Учитель'}</span>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#E04848', background: 'rgba(224,72,72,0.08)', borderRadius: 10, padding: '8px 12px' }}>{error}</div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              padding: '12px', borderRadius: 13, border: 'none',
              background: saved ? 'var(--color-green-soft)' : 'var(--grad-purple)',
              color: saved ? 'var(--color-green-text)' : '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'background 0.2s, color 0.2s',
              boxShadow: saved ? 'none' : '0 3px 12px rgba(106,90,230,0.35)',
            }}
          >
            <Save size={15} strokeWidth={2.5} />
            {saving ? 'Сохраняем…' : saved ? 'Сохранено!' : 'Сохранить'}
          </motion.button>
        </div>

      </div>
    </div>
  )
}
