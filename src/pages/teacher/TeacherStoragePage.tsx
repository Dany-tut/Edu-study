import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Database, HardDrive, ImageIcon, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTeacher } from '../../store/teacherStore'

type Stats = {
  db_bytes: number
  db_limit_bytes: number
  storage_bytes: number
  storage_limit_bytes: number
  storage_objects: number
  attachments_bytes: number
  attachments_rows: number
  tables: { name: string; bytes: number; rows: number }[]
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} МБ`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ГБ`
}

function barColor(pct: number) {
  if (pct >= 85) return { fill: '#E04848', text: 'var(--color-red-text)', soft: 'var(--color-red-soft)' }
  if (pct >= 60) return { fill: '#D07020', text: 'var(--color-peach-text)', soft: 'var(--color-peach-soft)' }
  return { fill: '#3FA867', text: 'var(--color-green-text)', soft: 'var(--color-green-soft)' }
}

function BigUsageBar({ icon: Icon, label, used, limit, hint }: {
  icon: React.ElementType; label: string; used: number; limit: number; hint?: string
}) {
  const pct = Math.min(100, (used / limit) * 100)
  const c = barColor(pct)
  return (
    <div style={{
      background: 'var(--color-bg-2)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 20, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: c.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} strokeWidth={2} style={{ color: c.text }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
          {hint && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{hint}</div>}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: c.text, letterSpacing: '-0.5px' }}>
          {pct.toFixed(pct < 10 ? 1 : 0)}%
        </div>
      </div>
      <div style={{ height: 12, borderRadius: 8, background: 'var(--color-bg-4)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 8, background: c.fill }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--color-text-3)' }}>
        <span>Использовано: <b style={{ color: 'var(--color-text)' }}>{fmtBytes(used)}</b></span>
        <span>Лимит: <b style={{ color: 'var(--color-text)' }}>{fmtBytes(limit)}</b></span>
        <span style={{ color: c.text, fontWeight: 700 }}>Свободно: {fmtBytes(limit - used)}</span>
      </div>
    </div>
  )
}

export default function TeacherStoragePage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const { data, error } = await supabase.rpc('storage_stats')
    if (error || !data) { setError(true); setLoading(false); return }
    setStats(data as Stats)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const dbPct = stats ? (stats.db_bytes / stats.db_limit_bytes) * 100 : 0
  const maxTableBytes = stats ? Math.max(...stats.tables.map(t => t.bytes), 1) : 1

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}><div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>Хранилище</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>База данных и файлы</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={load}
          title="Обновить"
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--color-bg-3)', border: '1px solid var(--color-border)',
            cursor: 'pointer', color: 'var(--color-text-3)',
            fontSize: 12, fontWeight: 600,
          }}
        >
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          Обновить
        </motion.button>
      </div>

      {error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-3)', fontSize: 13, padding: '24px 0' }}>
          <AlertTriangle size={16} /> Не удалось загрузить статистику
        </div>
      ) : (
        <>
          {stats && <>
          {/* Usage bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BigUsageBar icon={Database} label="База данных (Postgres)" used={stats.db_bytes} limit={stats.db_limit_bytes} />
            <BigUsageBar icon={HardDrive} label="Файлы (Storage)" used={stats.storage_bytes} limit={stats.storage_limit_bytes} hint={`${stats.storage_objects} объект.`} />
          </div>

          {/* Photos note */}
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '14px 16px', borderRadius: 16,
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-border-soft)',
          }}>
            <ImageIcon size={16} strokeWidth={2} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              Фото и рисунки доски хранятся в строках ДЗ внутри базы данных (не в Storage):&nbsp;
              <b style={{ color: 'var(--color-text)' }}>{fmtBytes(stats.attachments_bytes)}</b> в {stats.attachments_rows} записях.
            </div>
          </div>

          {/* Warning */}
          {dbPct >= 60 && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '14px 16px', borderRadius: 16,
              background: 'var(--color-peach-soft)',
              border: '1px solid var(--color-peach-text)',
              fontSize: 12.5, color: 'var(--color-peach-text)', lineHeight: 1.6,
            }}>
              <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              База заполнена на {dbPct.toFixed(0)}%. Стоит перенести фото и доски в Storage, чтобы разгрузить Postgres.
            </div>
          )}

          {/* Per-table breakdown */}
          <div style={{
            background: 'var(--color-bg-2)',
            border: '1px solid var(--color-border-medium)',
            borderRadius: 20, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              По таблицам
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...stats.tables].sort((a, b) => b.bytes - a.bytes).map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--color-text-2)', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 5, background: 'var(--color-bg-4)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(t.bytes / maxTableBytes) * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: '100%', borderRadius: 5, background: 'var(--color-accent)', opacity: 0.75 }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)', width: 70, textAlign: 'right', flexShrink: 0 }}>{fmtBytes(t.bytes)}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-4)', width: 60, textAlign: 'right', flexShrink: 0 }}>{t.rows} стр.</span>
                </div>
              ))}
            </div>
          </div>
          </>}
          {!stats && <div style={{ color: 'var(--color-text-4)', fontSize: 13, padding: '24px 0' }}>Загрузка…</div>}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div></div>
  )
}
