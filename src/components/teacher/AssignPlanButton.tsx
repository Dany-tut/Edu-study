import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { PLAN_TIERS, adminSetTeacherPlan, planPrice } from '../../lib/plan'
import { dropdownSurface } from '../../lib/dropdownStyle'
import { useT, useLang } from '../../lib/i18n'

// Админ назначает/повышает тариф учителю. Используется в таблице «По учителям»
// и в заявках от учителей («Хочу перейти на тариф …»). Дёргает admin_set_teacher_plan
// (RPC с внутренней проверкой is_admin), после успеха — onChanged().

// Ширина поля фиксирована и не зависит от подписи: в таблице кнопки стоят
// столбцом, и «Бесплатный» рядом с «Тариф» не должны разъезжаться по ширине,
// а длинная подпись не должна переноситься на вторую строку и растить строку.
const TRIGGER_W = { sm: 122, md: 142 }

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
  const [pos, setPos] = useState<{ top: number; bottom: number; left: number; up: boolean } | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const MENU_W = 220

  // Список — в портале с position: fixed: таблица «По учителям» скроллится
  // по горизонтали (overflowX: auto), и вложенный absolute-список она обрезала,
  // а его ширина рождала лишний скролл — сетка дёргалась на клике.
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const estH = PLAN_TIERS.length * 46 + 60
    const up = r.bottom + estH + 12 > window.innerHeight && r.top - estH - 12 > 0
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8))
    setPos({ top: r.bottom + 6, bottom: window.innerHeight - r.top + 6, left, up })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // resize приходит с target === window, а window — не Node: contains() на нём
    // бросал «Failed to execute 'contains' on 'Node'». Меню на ресайзе и так
    // положено закрыть, поэтому не-Node просто считаем «клик мимо».
    const onScroll = (e: Event) => {
      const tgt = e.target instanceof Node ? e.target : null
      if (tgt && menuRef.current?.contains(tgt)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
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

  const pad = size === 'sm' ? '5px 9px' : '7px 11px'
  const fs = size === 'sm' ? 11.5 : 12.5

  return (
    <>
      <button ref={btnRef} onClick={() => (open ? setOpen(false) : openMenu())} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        width: TRIGGER_W[size], boxSizing: 'border-box', padding: pad, borderRadius: 9,
        border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: fs, fontWeight: 600,
        fontFamily: 'inherit', lineHeight: 1.3,
        background: current ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
        color: current ? 'var(--color-purple)' : 'var(--color-text-2)',
      }}>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ok ? <Check size={14} /> : current ? t(current.name) : t('Тариф')}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.6 }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menuRef}
              initial={{ scale: 0.94, opacity: 0, y: pos.up ? 6 : -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: pos.up ? 6 : -6 }}
              transition={{ type: 'spring', stiffness: 460, damping: 26, mass: 0.7 }}
              style={{
                position: 'fixed', zIndex: 2000, left: pos.left, width: MENU_W,
                ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }),
                transformOrigin: pos.up ? 'bottom right' : 'top right',
                ...dropdownSurface,
              }}
            >
              {PLAN_TIERS.map(p => {
                const sel = p.code === currentCode
                return (
                  <button key={p.code} onClick={() => apply(p.code)} disabled={busy !== null} style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                    padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                    background: sel ? 'var(--color-purple-soft)' : 'transparent', color: 'var(--color-text)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                cursor: 'pointer', background: 'transparent', color: 'var(--color-text-3)',
                fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
              }}>
                {t('Снять тариф (бета)')}
              </button>
              {err && <div style={{ fontSize: 11.5, color: '#E86A6A', padding: '4px 10px' }}>{err}</div>}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
