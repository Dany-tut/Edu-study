import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, HardDrive, Users, BookOpen, RefreshCw, Eye, EyeOff, ChevronRight, ArrowLeft, UserPlus, X, Mail, Copy, Check, BarChart3, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTeacher } from '../../store/teacherStore'
import TeacherAnalytics from '../../components/teacher/TeacherAnalytics'

type StorageStats = {
  db_bytes: number
  db_limit_bytes: number
  storage_bytes: number
  storage_limit_bytes: number
  attachments_bytes: number
}

type TeacherRow = {
  id: string
  email: string
  name: string
  created_at: string
  groupCount: number
  studentCount: number
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} МБ`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ГБ`
}

function pct(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100))
}

function MiniBar({ value }: { value: number }) {
  const color = value >= 85 ? '#E04848' : value >= 60 ? '#D07020' : '#3FA867'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-bg-3)' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-3)', minWidth: 28, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!email.trim()) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        data: { role: 'teacher' },
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#/teacher`,
      },
    })
    setSending(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  function copyLink() {
    const link = `${window.location.origin}${window.location.pathname}#/teacher`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900, backdropFilter: 'blur(4px)' }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 901, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        style={{
          pointerEvents: 'auto',
          width: 380,
          background: 'var(--color-bg-2)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 24, padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Пригласить учителя</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>Отправить ссылку-приглашение на email</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
            <X size={14} />
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Check size={24} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Приглашение отправлено!</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5 }}>
              Письмо с ссылкой отправлено на <b style={{ color: 'var(--color-text)' }}>{email}</b>.<br />
              Учитель перейдёт по ссылке и попадёт в платформу.
            </div>
            <button onClick={onClose} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Готово
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Email учителя</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  placeholder="teacher@example.com"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 12, border: '1px solid var(--color-border-medium)',
                    background: 'var(--color-bg-3)', color: 'var(--color-text)',
                    fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              {error && <div style={{ fontSize: 11, color: '#E04848', marginTop: 6 }}>{error}</div>}
            </div>

            <button
              onClick={handleInvite}
              disabled={!email.trim() || sending}
              style={{
                width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                background: email.trim() ? 'var(--grad-purple)' : 'var(--color-bg-3)',
                color: email.trim() ? '#fff' : 'var(--color-text-3)',
                fontSize: 14, fontWeight: 600, cursor: email.trim() ? 'pointer' : 'not-allowed',
                marginBottom: 12, transition: 'background 0.15s, color 0.15s',
              }}
            >
              {sending ? 'Отправляем…' : 'Отправить приглашение'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--color-text-3)', marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              или
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            <button
              onClick={copyLink}
              style={{
                width: '100%', padding: '10px', borderRadius: 12,
                border: '1px solid var(--color-border-medium)',
                background: 'var(--color-bg-3)', color: 'var(--color-text)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 0.12s',
              }}
            >
              {copied ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} /> : <Copy size={14} />}
              {copied ? 'Ссылка скопирована!' : 'Скопировать ссылку на платформу'}
            </button>
          </>
        )}
      </motion.div>
      </div>
    </>,
    document.body
  )
}

export default function TeacherAdminPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [groupCount, setGroupCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tab, setTab] = useState<'overview' | 'analytics'>('overview')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(data.user?.user_metadata?.role === 'admin')
    })
  }, [])

  async function load() {
    setLoading(true)
    const [storageRes, groupsRes, studentsRes, userRes] = await Promise.all([
      supabase.rpc('storage_stats'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.auth.getUser(),
    ])

    if (storageRes.data) setStorage(storageRes.data as StorageStats)
    setGroupCount(groupsRes.count ?? 0)
    setStudentCount(studentsRes.count ?? 0)

    if (userRes.data.user) {
      const u = userRes.data.user
      setTeachers([{
        id: u.id,
        email: u.email ?? '—',
        name: u.user_metadata?.name ?? u.email?.split('@')[0] ?? '—',
        created_at: u.created_at,
        groupCount: groupsRes.count ?? 0,
        studentCount: studentsRes.count ?? 0,
      }])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const dbPct = storage ? pct(storage.db_bytes, storage.db_limit_bytes) : 0
  const storagePct = storage ? pct(storage.storage_bytes, storage.storage_limit_bytes) : 0

  // Admin-only area. Teachers never reach it (menu item is hidden), but guard
  // the page too in case activePage is set some other way.
  if (isAdmin === false) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-3)' }}>
          <ShieldAlert size={32} strokeWidth={1.6} style={{ opacity: 0.6 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 10 }}>Раздел доступен только администратору</div>
          <button onClick={() => setActivePage('home')} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            На главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setActivePage('home')}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'var(--color-bg-3)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-3)', flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>Администрирование</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>Управление платформой</div>
          </div>
          {tab === 'overview' && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={load}
              title="Обновить"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Обновить
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 12, padding: 3, marginBottom: 24, width: 'fit-content' }}>
          {([['overview', 'Обзор', Database], ['analytics', 'Аналитика', BarChart3]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: tab === id ? 'var(--color-accent)' : 'transparent',
                color: tab === id ? '#fff' : 'var(--color-text-3)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'analytics' && <TeacherAnalytics />}

        {tab === 'overview' && (
        <>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard icon={Users} label="Учителей" value={String(teachers.length)} sub="активных аккаунтов" />
          <StatCard icon={BookOpen} label="Групп" value={String(groupCount)} sub={`${studentCount} учеников`} />
          <StatCard
            icon={Database}
            label="База данных"
            value={storage ? fmtBytes(storage.db_bytes) : '—'}
            sub={storage ? `${dbPct}% занято` : 'загрузка…'}
          />
        </div>

        {/* Teachers */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Учителя</div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setInviteOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 12, border: 'none',
                background: 'var(--grad-purple)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(106,90,230,0.35)',
              }}
            >
              <UserPlus size={13} strokeWidth={2.5} />
              Добавить учителя
            </motion.button>
          </div>
          <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
            {teachers.map((t, i) => {
              const initials = t.name.slice(0, 2).toUpperCase()
              const shown = revealedIds.has(t.id)
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{shown ? t.email : t.email.replace(/(.{2}).*(@.*)/, '$1••••$2')}</span>
                      <span>·</span>
                      <span>{t.groupCount} групп · {t.studentCount} учеников</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRevealedIds(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n })}
                    title={shown ? 'Скрыть' : 'Показать email'}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                  >
                    {shown ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )
            })}
            {teachers.length === 0 && (
              <div style={{ padding: '20px 18px', color: 'var(--color-text-3)', fontSize: 13 }}>{loading ? 'Загрузка…' : 'Нет данных'}</div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Хранилище</div>
          <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Database size={16} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>База данных</div>
                <MiniBar value={dbPct} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>{storage ? fmtBytes(storage.db_bytes) : '—'}</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <HardDrive size={16} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Файловое хранилище</div>
                <MiniBar value={storagePct} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>{storage ? fmtBytes(storage.storage_bytes) : '—'}</span>
            </div>
            <div
              onClick={() => setActivePage('storage')}
              style={{ padding: '10px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}
            >
              Подробная статистика <ChevronRight size={13} />
            </div>
          </div>
        </div>
        </>
        )}

      </div>

      <AnimatePresence>
        {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
