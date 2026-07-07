import { useState, useEffect, useCallback } from 'react'
import Skeleton from '../Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, HardDrive, ImageIcon, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Mirrors the JSON returned by the `storage_stats()` Postgres RPC.
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

// Green → amber → red as the bar fills toward the quota.
function barColor(pct: number): { fill: string; text: string; soft: string } {
  if (pct >= 85) return { fill: '#E04848', text: 'var(--color-red-text)', soft: 'var(--color-red-soft)' }
  if (pct >= 60) return { fill: '#D07020', text: 'var(--color-peach-text)', soft: 'var(--color-peach-soft)' }
  return { fill: '#3FA867', text: 'var(--color-green-text)', soft: 'var(--color-green-soft)' }
}

function UsageBar({
  icon: Icon, label, used, limit, hint,
}: { icon: React.ElementType; label: string; used: number; limit: number; hint?: string }) {
  const pct = Math.min(100, (used / limit) * 100)
  const c = barColor(pct)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: c.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} strokeWidth={2} style={{ color: c.text }} />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--color-text)' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: c.text }}>
          {pct.toFixed(pct < 10 ? 1 : 0)}%
        </span>
      </div>
      <div style={{ height: 9, borderRadius: 6, background: 'var(--color-bg-4)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 6, background: c.fill }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          {fmtBytes(used)} из {fmtBytes(limit)}
        </span>
        {hint && <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>{hint}</span>}
      </div>
    </div>
  )
}

export default function StorageUsagePanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Детали (заметка о фото + разбивка по таблицам) свёрнуты по умолчанию и
  // помнят своё состояние между перезагрузками. Полоски использования видны
  // всегда. Обновление данных свёрнутость не трогает.
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('storagePanelOpen') === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('storagePanelOpen', open ? '1' : '0') } catch { /* private mode */ }
  }, [open])

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const { data, error } = await supabase.rpc('storage_stats')
    if (error || !data) { setError(true); setLoading(false); return }
    setStats(data as Stats)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const cardStyle: React.CSSProperties = {
    background: 'rgba(var(--glass-rgb), 0.88)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid var(--color-border-medium)',
    borderRadius: 24,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.15)',
    padding: 20,
  }

  const dbPct = stats ? (stats.db_bytes / stats.db_limit_bytes) * 100 : 0
  const maxTableBytes = stats ? Math.max(...stats.tables.map(t => t.bytes), 1) : 1

  return (
    <div style={cardStyle}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.2, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
      >
        <Database size={14} strokeWidth={2} />
        Хранилище базы данных
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', color: 'var(--color-text-4)' }}
        >
          <ChevronDown size={15} strokeWidth={2.2} />
        </motion.span>
        <button
          onClick={e => { e.stopPropagation(); load() }}
          title="Обновить"
          style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}
        >
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      {error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-3)', fontSize: 12.5, padding: '16px 0 4px' }}>
          <AlertTriangle size={15} /> Не удалось загрузить статистику
        </div>
      ) : (
        <>
          {stats && <>
          {/* Полоски использования — видны всегда (даже в свёрнутом виде) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 16 }}>
            <UsageBar
              icon={Database} label="База данных (Postgres)"
              used={stats.db_bytes} limit={stats.db_limit_bytes}
              hint={`свободно ${fmtBytes(stats.db_limit_bytes - stats.db_bytes)}`}
            />
            <UsageBar
              icon={HardDrive} label="Файлы (Storage)"
              used={stats.storage_bytes} limit={stats.storage_limit_bytes}
              hint={`${stats.storage_objects} объект.`}
            />
          </div>

          {/* Детали (заметка + разбивка по таблицам) — сворачиваются */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 18 }}>
                  {/* Where photos & whiteboards actually live */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
                    <ImageIcon size={15} strokeWidth={2} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                      Фото и рисунки доски сейчас хранятся прямо в базе (внутри строк ДЗ): <b style={{ color: 'var(--color-text)' }}>{fmtBytes(stats.attachments_bytes)}</b> в {stats.attachments_rows} записях.
                    </div>
                  </div>

                  {/* Per-table breakdown */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      По таблицам
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[...stats.tables].sort((a, b) => b.bytes - a.bytes).slice(0, 6).map(t => (
                        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--color-text-2)', width: 120, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                          <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--color-bg-4)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(t.bytes / maxTableBytes) * 100}%`, borderRadius: 4, background: 'var(--color-accent)', opacity: 0.7 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-3)', width: 58, textAlign: 'right', flexShrink: 0 }}>{fmtBytes(t.bytes)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {dbPct >= 60 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: 'var(--color-peach-soft)', fontSize: 11.5, color: 'var(--color-peach-text)', lineHeight: 1.5 }}>
                      <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                      База заполнена на {dbPct.toFixed(0)}%. Стоит перенести фото и доски в Storage, чтобы разгрузить Postgres.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </>}
          {!stats && <div style={{ padding: '16px 0 4px' }}><Skeleton.Text lines={3} /></div>}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
