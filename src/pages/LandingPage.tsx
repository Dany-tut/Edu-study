import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { retryImport } from '../lib/chunkError'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, GraduationCap, User, Check } from '../components/icons/appIcons'
import { PLAN_TIERS, planPrice } from '../lib/plan'
import { submitLead } from '../lib/leads'
import { useLang, useT } from '../lib/i18n'
import { Alert } from '../components/Alert'
import HeroSection, { LandingHeader } from '../components/landing/b/HeroSection'

// Лендинг B · «Огонёк-проводник» (Figma «Искра», стр. «11 · Сайт — редизайн»).
// Первый экран — в главном куске, всё ниже — лениво (BelowFold): заголовок и
// Огонёк не ждут картинок устройств и постеров.
const BelowFold = lazy(() => retryImport(() => import('../components/landing/b/BelowFold')))

const ACCENT = '#786AD7'          // фирменный фиолетовый (как в кабинете)
const ACCENT_2 = '#6F3FBF'        // глубокий фиолет для градиента
const OK = '#4FBF9A'              // только семантика «принято/готово», не бренд

export default function LandingPage() {
  // Окна заявки и входа рисует финальная секция (FinalCtaSection, ленивый
  // кусок) — сюда приходят только события. Тариф можно передать через data-plan.
  const openLead = (plan = '') => window.dispatchEvent(new CustomEvent('iskra:lead', { detail: { plan } }))
  const openLogin = () => window.dispatchEvent(new Event('iskra:login'))

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href="#lead"], a[href="#login"]') as HTMLAnchorElement | null
      if (!a) return
      e.preventDefault()
      if (a.getAttribute('href') === '#login') openLogin()
      else openLead(a.dataset.plan ?? '')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text)]">
      <LandingHeader onLogin={openLogin} />
      <HeroSection onLogin={openLogin} />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <BelowFold />
      </Suspense>
    </div>
  )
}

// Ниже — прежние окна входа и заявки. Лендинг их больше не показывает, но
// LeadModal открывает гостевой тренажёр (GuestTrainerPage).

// ── Выбор роли для входа ─────────────────────────────────────────────────────
function RoleChooser({ onClose }: { onClose: () => void }) {
  const t = useT()
  const firstOption = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    firstOption.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  const go = (hash: string) => { window.location.hash = hash; onClose() }
  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={420}>
        <ModalClose onClose={onClose} />
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>{t('Личный кабинет')}</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 22px' }}>{t('Кто вы?')}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <button data-hover="layer" ref={firstOption} onClick={() => go('#/login')} style={roleBtn}>
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${ACCENT} 20%, transparent)`, color: ACCENT }}><User size={22} /></div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Я ученик')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('Вход по логину и паролю от учителя')}</div>
            </div>
          </button>
          <button data-hover="layer" onClick={() => go('#/teacher')} style={roleBtn}>
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${ACCENT} 20%, transparent)`, color: ACCENT }}><GraduationCap size={22} /></div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Я препод')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('Кабинет учителя и администратора')}</div>
            </div>
          </button>
        </div>
      </ModalCard>
    </Backdrop>
  )
}

// ── Форма заявки ─────────────────────────────────────────────────────────────
/**
 * Форма заявки. Наружу — ради гостевого тренажёра: человек, пришедший по
 * присланной ссылке, оставляет заявку прямо с материала, не возвращаясь на
 * лендинг за той же формой (см. GuestTrainerPage).
 */
export function LeadModal({ presetPlan, onClose }: { presetPlan: string; onClose: () => void }) {
  const { lang } = useLang()
  const t = useT()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [plan, setPlan] = useState(presetPlan)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!contact.trim()) { setError(t('Укажите контакт для связи')); return }
    setSending(true); setError('')
    const { error } = await submitLead({ name, contact, plan, message })
    setSending(false)
    if (error) { setError(t('Не удалось отправить. Попробуйте ещё раз.')); return }
    setDone(true)
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={520}>
        <ModalClose onClose={onClose} />
        {done ? (
          <div style={{ textAlign: 'center', padding: '18px 8px' }}>
            <div style={{ width: 60, height: 60, borderRadius: 999, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${OK} 22%, transparent)`, color: OK }}>
              <Check size={30} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>{t('Заявка отправлена')}</h3>
            <p style={{ fontSize: 14.5, color: 'var(--color-text-2)', margin: '0 0 24px', lineHeight: 1.5 }}>
              {t('Спасибо! Мы свяжемся с вами по указанному контакту.')}
            </p>
            <button data-hover="layer" onClick={onClose} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '13px' }}>{t('Готово')}</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 23, fontWeight: 800, margin: '0 0 6px' }}>{t('Оставить заявку')}</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
              {t('Оставьте контакт — расскажем, как начать, и поможем с настройкой.')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t('Как к вам обращаться')} style={field} />
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder={t('Контакт для связи — email, телефон или Telegram *')} style={field} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', margin: '4px 0 8px' }}>{t('Интересующий тариф')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                  {PLAN_TIERS.map(p => {
                    const label = `${p.name} · ${planPrice(p, lang)}`
                    const active = plan === label
                    return (
                      <button data-hover="layer" key={p.code} type="button" onClick={() => setPlan(active ? '' : label)} style={{
                        padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        border: `1.5px solid ${active ? ACCENT : 'var(--color-border)'}`,
                        background: active ? `color-mix(in srgb, ${ACCENT} 15%, transparent)` : 'var(--color-surface)',
                        color: 'var(--color-text)', transition: 'all .12s',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{t(p.name)}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{planPrice(p, lang)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('Сообщение — коротко о задаче (необязательно)')} rows={3} style={{ ...field, resize: 'vertical', minHeight: 84 }} />
              {error && <Alert tone="danger" text={error} />}
              <button data-hover="layer" onClick={send} disabled={sending} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, opacity: sending ? 0.7 : 1, cursor: sending ? 'default' : 'pointer' }}>
                <Send size={17} /> {sending ? t('Отправляем…') : t('Отправить заявку')}
              </button>
            </div>
          </>
        )}
      </ModalCard>
    </Backdrop>
  )
}

// ── Shared modal chrome ──────────────────────────────────────────────────────
function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', display: 'grid', placeItems: 'center' }}>{children}</div>
    </motion.div>
  )
}
function ModalCard({ children, width }: { children: React.ReactNode; width: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
      style={{ position: 'relative', width: '100%', maxWidth: width, background: 'var(--color-bg-2, var(--color-surface))', border: '1px solid var(--color-border)', borderRadius: 22, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
      {children}
    </motion.div>
  )
}
function ModalClose({ onClose }: { onClose: () => void }) {
  const t = useT()
  return (
    <button data-hover="layer" onClick={onClose} aria-label={t('Закрыть')} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
      <X size={20} />
    </button>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
  border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: '#fff',
  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
}
// на фиолетовой CTA-плашке фиолетовая кнопка сливается — там светлая
const onAccentBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
  border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: ACCENT_2,
  background: '#fff',
}
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12,
  border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 14.5, fontWeight: 600,
  color: 'var(--color-text)', background: 'transparent',
}
const outlineBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
  border: `1.5px solid ${ACCENT}`, cursor: 'pointer', fontSize: 14.5, fontWeight: 700,
  color: ACCENT, background: 'transparent',
}
const navLink: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', textDecoration: 'none', transition: 'color .15s',
}
const field: React.CSSProperties = {
  width: '100%', padding: '13px 15px', borderRadius: 13, border: '1.5px solid var(--color-border-medium, var(--color-border))',
  fontSize: 15, outline: 'none', boxSizing: 'border-box', color: 'var(--color-text)',
  background: 'var(--color-surface)', fontFamily: 'inherit',
}
const roleBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 15,
  border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', width: '100%',
}
const roleIcon: React.CSSProperties = { width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', flexShrink: 0 }
const sectionTitle: React.CSSProperties = { fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, textAlign: 'center', margin: 0, letterSpacing: -0.7 }
const sectionSub: React.CSSProperties = { fontSize: 15.5, color: 'var(--color-text-2)', textAlign: 'center', margin: '12px auto 0', maxWidth: 560, lineHeight: 1.5 }
