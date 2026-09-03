import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronLeft, Loader2 } from 'lucide-react'
import { PLAN_TIERS, adminSetTeacherPlan, planPrice } from '../../lib/plan'
import { dropdownSurface } from '../../lib/dropdownStyle'
import { useT, useLang } from '../../lib/i18n'

// Админ назначает/повышает тариф учителю. Используется в таблице «По учителям»
// и в заявках от учителей («Хочу перейти на тариф …»). Дёргает admin_set_teacher_plan
// (RPC с внутренней проверкой is_admin), после успеха — onChanged().

// Ширина поля фиксирована и не зависит от подписи: в таблице кнопки стоят
// столбцом, и «Бесплатный» рядом с «Тариф» не должны разъезжаться по ширине,
// а длинная подпись не должна переноситься на вторую строку и растить строку.
//
// Считана по самому длинному варианту — «Бесплатный · до 03.12.26»: срок
// переехал внутрь кнопки, и обрезать его многоточием значило бы прятать ровно
// то, ради чего он тут появился.
const TRIGGER_W = { sm: 196, md: 216 }

// Сроки выдачи. `months: null` — бессрочно (expires_at остаётся пустым): так
// выдаётся тариф своим и на время беты, и это не то же самое, что «год».
const PERIODS: { months: number | null; label: string }[] = [
  { months: 1, label: '1 месяц' },
  { months: 3, label: '3 месяца' },
  { months: 12, label: 'Год' },
  { months: null, label: 'Бессрочно' },
]

/** Дата окончания через N месяцев. Полночь по местному — время дня здесь роли
 *  не играет, а ровная дата читается в таблице лучше, чем «до 14:37». */
function expiryFromNow(months: number | null): string | null {
  if (months == null) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function AssignPlanButton({ teacherId, currentCode, expiresAt, onChanged, size = 'md' }: {
  teacherId: string
  currentCode?: string | null
  expiresAt?: string | null
  onChanged?: (code: string | null, expiresAt: string | null) => void
  size?: 'sm' | 'md'
}) {
  const t = useT()
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  // Второй шаг меню: тариф выбран, осталось назначить срок. Разводить их по
  // шагам, а не спрашивать срок кнопкой рядом, — потому что тариф без срока
  // выдать нельзя, а забыть про отдельный контрол легко.
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
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

  // Срок — в той же строке, что и название: отдельной подписью снизу он
  // растил высоту строки таблицы и читался как чужой комментарий.
  //
  // Показываем ДАТУ, а не «3 месяца». Срок выдачи — это то, что выбрали
  // однажды; со временем оно перестаёт быть правдой, а дата верна всегда.
  const term = (() => {
    if (!current) return null
    if (!expiresAt) return { text: t('бессрочно'), over: false }
    const end = new Date(expiresAt)
    if (end.getTime() < Date.now()) return { text: t('истёк'), over: true }
    return {
      text: `${t('до')} ${end.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}`,
      over: false,
    }
  })()

  async function apply(code: string | null, months: number | null = null) {
    setBusy(code ?? '—'); setErr('')
    const expires = expiryFromNow(months)
    const error = await adminSetTeacherPlan(teacherId, code, expires)
    setBusy(null)
    if (error) { setErr(t('Ошибка')); return }
    setOpen(false); setPendingPlan(null)
    setOk(true); setTimeout(() => setOk(false), 1600)
    onChanged?.(code, expires)
  }

  const pad = size === 'sm' ? '5px 9px' : '7px 11px'
  const fs = size === 'sm' ? 11.5 : 12.5

  return (
    <>
      <button ref={btnRef} onClick={() => (open ? (setOpen(false), setPendingPlan(null)) : openMenu())} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        width: TRIGGER_W[size], boxSizing: 'border-box', padding: pad, borderRadius: 9,
        border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: fs, fontWeight: 600,
        fontFamily: 'inherit', lineHeight: 1.3,
        background: current ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
        color: current ? 'var(--color-purple)' : 'var(--color-text-2)',
      }}>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ok ? <Check size={14} /> : current ? (
            <>
              {t(current.name)}
              {term && (
                <span style={{ fontWeight: 500, opacity: term.over ? 1 : 0.75, color: term.over ? '#E86A6A' : undefined }}>
                  {' · '}{term.text}
                </span>
              )}
            </>
          ) : t('Тариф')}
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
              {pendingPlan !== null ? (
                <>
                  <button
                    onClick={() => setPendingPlan(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, width: '100%', textAlign: 'left',
                      padding: '6px 8px', marginBottom: 2, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'transparent', color: 'var(--color-text-3)',
                      fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                    }}
                  >
                    <ChevronLeft size={13} />
                    {t(PLAN_TIERS.find(p => p.code === pendingPlan)?.name ?? '')} · {t('на сколько?')}
                  </button>
                  {PERIODS.map(per => (
                    <button
                      key={per.label}
                      onClick={() => apply(pendingPlan, per.months)}
                      disabled={busy !== null}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                        padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', background: 'transparent', color: 'var(--color-text)',
                        fontSize: 13, fontWeight: 700,
                      }}
                    >
                      <span style={{ flex: 1 }}>{t(per.label)}</span>
                      {busy !== null && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                    </button>
                  ))}
                </>
              ) : (
              <>
              {PLAN_TIERS.map(p => {
                const sel = p.code === currentCode
                return (
                  <button key={p.code} onClick={() => setPendingPlan(p.code)} disabled={busy !== null} style={{
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
              </>
              )}
              {err && <div style={{ fontSize: 11.5, color: '#E86A6A', padding: '4px 10px' }}>{err}</div>}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
