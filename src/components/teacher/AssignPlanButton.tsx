import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { PLAN_TIERS, adminSetTeacherPlan, planPrice } from '../../lib/plan'
import { useT, useLang } from '../../lib/i18n'

// Админ назначает/повышает тариф учителю. Используется в таблице «По учителям»
// и в заявках от учителей («Хочу перейти на тариф …»). Дёргает admin_set_teacher_plan
// (RPC с внутренней проверкой is_admin), после успеха — onChanged().

export default function AssignPlanButton({ teacherId, currentCode, onChanged, size = 'md' }: {
  teacherId: string
  currentCode?: string | null
  onChanged?: (code: string | null) => void
  size?: 'sm' | 'md'
}) {
  const t = useT()
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = PLAN_TIERS.find(p => p.code === currentCode)

  async function apply(code: string | null) {
    setBusy(code ?? '—'); setErr('')
    const error = await adminSetTeacherPlan(teacherId, code)
    setBusy(null)
    if (error) { setErr(t('Ошибка')); return }
    setOpen(false)
    setOk(true); setTimeout(() => setOk(false), 1600)
    onChanged?.(code)
  }

  const pad = size === 'sm' ? '4px 9px' : '6px 11px'
  const fs = size === 'sm' ? 11.5 : 12.5

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: pad, borderRadius: 9,
        border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: fs, fontWeight: 600,
        background: current ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
        color: current ? 'var(--color-purple)' : 'var(--color-text-2)',
      }}>
        {ok ? <Check size={14} /> : current ? t(current.name) : t('Назначить тариф')}
        <ChevronDown size={13} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 220,
          background: 'var(--color-bg-2, var(--color-surface))', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: 6, boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
        }}>
          {PLAN_TIERS.map(p => {
            const sel = p.code === currentCode
            return (
              <button key={p.code} onClick={() => apply(p.code)} disabled={busy !== null} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: sel ? 'var(--color-purple-soft)' : 'transparent', color: 'var(--color-text)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t(p.name)}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                    {planPrice(p, lang)}{p.priceRub > 0 ? `/${t('мес')}` : ''} · {p.maxStudents == null ? t('безлимит') : `${t('до')} ${p.maxStudents}`}
                  </div>
                </div>
                {busy === p.code ? <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  : sel ? <Check size={15} style={{ color: 'var(--color-purple)' }} /> : null}
              </button>
            )
          })}
          <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 2px' }} />
          <button onClick={() => apply(null)} disabled={busy !== null} style={{
            width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none',
            cursor: 'pointer', background: 'transparent', color: 'var(--color-text-3)', fontSize: 12.5, fontWeight: 600,
          }}>
            {t('Снять тариф (бета)')}
          </button>
          {err && <div style={{ fontSize: 11.5, color: '#E86A6A', padding: '4px 10px' }}>{err}</div>}
        </div>
      )}
    </div>
  )
}
