// «Финальный призыв» лендинга B (Figma «Искра», стр. «11 · Сайт — редизайн»,
// узел 303:541). Фиолетовая плашка 1100×360, Огонёк «радуется» выходит за её
// верхний край. «Зарегистрироваться» ведёт на вход преподавателя (#/teacher):
// вход через Яндекс или VK сам создаёт кабинет. «Войти в кабинет» — выбор роли:
// ученик → #/login, преподаватель → #/teacher.
//
// Здесь же живёт форма заявки (submitLead → feedback_requests, обязателен только
// контакт, ошибки через Alert) — она нужна для платных тарифов. Секции открывают
// её ссылкой #lead или событием:
//   window.dispatchEvent(new CustomEvent('iskra:lead', { detail: { plan: 'Про · 990 ₽' } }))

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLang, useT } from '../../../lib/i18n'
import { PLAN_TIERS, planPrice } from '../../../lib/plan'
import { submitLead } from '../../../lib/leads'
import { Alert } from '../../Alert'
import ScrollFade from '../../ScrollFade'
import { GraduationCap, User, X } from '../../icons/appIcons'
import { PrimaryButton, Section, asset } from './kit'
import OgonekImage from './OgonekImage'

const LEAD_EVENT = 'iskra:lead'
const LOGIN_EVENT = 'iskra:login'

export default function FinalCtaSection() {
  const t = useT()
  const [lead, setLead] = useState<{ plan: string } | null>(null)
  // Ссылка вида #/landing?role=choose сразу открывает выбор роли, как раньше.
  const [chooser, setChooser] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('role') === 'choose')

  // Окна заявки и входа на весь лендинг живут здесь: шапка, первый экран и
  // ссылки #lead / #login в секциях зовут их событиями (см. LandingPage).
  useEffect(() => {
    const onLead = (e: Event) => setLead({ plan: (e as CustomEvent<{ plan?: string }>).detail?.plan ?? '' })
    const onLogin = () => setChooser(true)
    window.addEventListener(LEAD_EVENT, onLead)
    window.addEventListener(LOGIN_EVENT, onLogin)
    return () => { window.removeEventListener(LEAD_EVENT, onLead); window.removeEventListener(LOGIN_EVENT, onLogin) }
  }, [])

  return (
    <Section id="lead" className="pt-[96px] pb-[10px] sm:pt-[110px]">
      <div
        className="relative mx-auto w-full max-w-[1100px] rounded-[28px] px-6 pb-8 pt-[96px] sm:rounded-[36px] md:h-[360px] md:px-16 md:pb-0 md:pt-[70px]"
        style={{ backgroundImage: 'linear-gradient(156.43deg, rgb(94, 79, 209) 0%, rgb(111, 63, 191) 39.286%, rgb(74, 46, 153) 71.429%)' }}
      >
        <div className="relative z-[1] flex max-w-[620px] flex-col items-start gap-4">
          <h2 className="m-0 text-[32px] font-bold leading-[1.06] tracking-[-0.616px] text-white sm:text-[44px]">
            {t('Зажгите Искру в своей практике')}
          </h2>
          <p className="m-0 max-w-[520px] text-[16px] leading-[1.55] text-[rgba(255,255,255,0.88)] sm:text-[17px]">
            {t('Войдите через Яндекс или VK — кабинет преподавателя откроется сразу. Первые два ученика — бесплатно.')}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <a
              href="#/teacher"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-[14px] bg-white px-7 py-4 text-[16px] font-semibold text-[#6f3fbf] shadow-[0_14px_34px_-12px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-px active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t('Зарегистрироваться')}
            </a>
            <button
              type="button"
              onClick={() => setChooser(true)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-[14px] border border-[rgba(255,255,255,0.4)] px-7 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[rgba(255,255,255,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t('Войти в кабинет')}
            </button>
          </div>
        </div>

        {/* Огонёк выходит за верх плашки, а низ уходит за её край — будто
            выглядывает. За ним белое свечение: оттеняет и даёт объём. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none"
          style={{ clipPath: 'inset(-320px -80px 0 -80px round 0 0 36px 36px)' }}
        >
          <div
            className="absolute right-[-10px] top-[-40px] size-[200px] rounded-full md:right-[-40px] md:top-[-30px] md:size-[440px] lg:right-[0px]"
            style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.8), rgba(255,255,255,0.32) 50%, rgba(255,255,255,0) 100%)', filter: 'blur(6px)' }}
          />
          <OgonekImage image="cta-ogonek-joy.webp" className="absolute right-4 top-[-80px] h-[160px] w-[96px] md:right-6 md:top-[-56px] md:h-[466px] md:w-[280px] lg:right-[60px]" />
        </div>
      </div>

      <AnimatePresence>
        {lead && <LeadModal key="lead" presetPlan={lead.plan} onClose={() => setLead(null)} />}
        {chooser && <RoleChooser key="role" onClose={() => setChooser(false)} />}
      </AnimatePresence>
    </Section>
  )
}

// ── Окно поверх страницы ─────────────────────────────────────────────────────

function Modal({ children, label, onClose }: { children: ReactNode; label: string; onClose: () => void }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onUpdate={() => {}}
      onClick={onClose}
      className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(11,11,13,0.55)] p-4 backdrop-blur-[4px]"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] shadow-[0_24px_60px_rgba(51,38,115,0.28)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Закрыть')}
          className="absolute right-4 top-4 z-[2] grid h-8 w-8 place-items-center rounded-[10px] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text)]"
        >
          <X size={20} />
        </button>
        <ScrollFade maxHeight="calc(100dvh - 32px)" bg="var(--color-bg-card)">
          <div className="p-6 sm:p-7">{children}</div>
        </ScrollFade>
      </motion.div>
    </motion.div>
  )
}

const fieldCls =
  'w-full rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-bg)] px-4 py-[13px] text-[16px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]'

function LeadModal({ presetPlan, onClose }: { presetPlan: string; onClose: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [plan, setPlan] = useState(presetPlan)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => { first.current?.focus({ preventScroll: true }) }, [])

  async function send() {
    if (sending) return
    if (!contact.trim()) { setError(t('Укажите контакт для связи')); return }
    setSending(true); setError('')
    const { error } = await submitLead({ name, contact, plan, message })
    setSending(false)
    if (error) { setError(t('Не удалось отправить. Попробуйте ещё раз.')); return }
    setDone(true)
  }

  return (
    <Modal label={t('Оставить заявку')} onClose={onClose}>
      {done ? (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <img src={asset('cta-ogonek-joy.webp')} alt="" aria-hidden width={84} height={140} className="h-[140px] w-[84px] object-contain" />
          <h3 className="m-0 mt-2 text-[22px] font-bold text-[var(--color-text)]">{t('Заявка отправлена')}</h3>
          <p className="m-0 mb-4 text-[15px] leading-[1.5] text-[var(--color-muted)]">{t('Спасибо! Мы свяжемся с вами по указанному контакту.')}</p>
          <PrimaryButton onClick={onClose} className="w-full">{t('Готово')}</PrimaryButton>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={e => { e.preventDefault(); void send() }}
          className="flex flex-col gap-3"
        >
          <h3 className="m-0 pr-10 text-[24px] font-bold tracking-[-0.3px] text-[var(--color-text)]">{t('Оставить заявку')}</h3>
          <p className="m-0 mb-2 text-[15px] leading-[1.5] text-[var(--color-muted)]">{t('Оставьте контакт — расскажем, как начать, и поможем с настройкой.')}</p>
          <input ref={first} value={name} onChange={e => setName(e.target.value)} placeholder={t('Как к вам обращаться')} aria-label={t('Как к вам обращаться')} autoComplete="name" className={fieldCls} />
          <input
            value={contact}
            onChange={e => { setContact(e.target.value); if (error) setError('') }}
            placeholder={t('Контакт для связи — email, телефон или Telegram *')}
            aria-label={t('Контакт для связи — email, телефон или Telegram *')}
            aria-required="true"
            className={fieldCls}
          />
          <div role="group" aria-label={t('Интересующий тариф')} className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))]">
            {PLAN_TIERS.map(p => {
              const label = `${p.name} · ${planPrice(p, lang)}`
              const active = plan === label
              return (
                <button
                  key={p.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPlan(active ? '' : label)}
                  className={`rounded-[12px] border px-2 py-2.5 text-center transition-colors ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border-soft)] bg-[var(--color-bg)] hover:border-[color-mix(in_srgb,var(--color-accent)_45%,transparent)]'
                  }`}
                >
                  <div className="text-[14px] font-bold text-[var(--color-text)]">{t(p.name)}</div>
                  <div className="text-[12px] text-[var(--color-muted)]">{planPrice(p, lang)}</div>
                </button>
              )
            })}
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('Сообщение — коротко о задаче (необязательно)')}
            aria-label={t('Сообщение — коротко о задаче (необязательно)')}
            rows={3}
            className={`${fieldCls} min-h-[84px] resize-y`}
          />
          {error && <Alert tone="danger" text={error} />}
          <button
            type="submit"
            disabled={sending}
            className="mt-1 inline-flex w-full items-center justify-center rounded-[14px] bg-gradient-to-r from-[#786bd6] to-[#6f3fbf] px-7 py-4 text-[16px] font-semibold text-white transition-[transform,opacity] hover:-translate-y-px active:translate-y-0 disabled:cursor-default disabled:opacity-70 disabled:hover:translate-y-0"
            style={{ filter: 'drop-shadow(0px 12px 15px rgba(120,107,214,0.45))' }}
          >
            {sending ? t('Отправляем…') : t('Отправить заявку')}
          </button>
        </form>
      )}
    </Modal>
  )
}

function RoleChooser({ onClose }: { onClose: () => void }) {
  const t = useT()
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => { first.current?.focus({ preventScroll: true }) }, [])
  const go = (hash: string) => { window.location.hash = hash; onClose() }
  const options = [
    { hash: '#/login', icon: User, title: 'Я ученик', text: 'Вход по логину и паролю от учителя' },
    { hash: '#/teacher', icon: GraduationCap, title: 'Я препод', text: 'Кабинет учителя и администратора' },
  ]
  return (
    <Modal label={t('Личный кабинет')} onClose={onClose}>
      <h3 className="m-0 pr-10 text-[22px] font-bold text-[var(--color-text)]">{t('Личный кабинет')}</h3>
      <p className="m-0 mb-5 mt-1 text-[15px] text-[var(--color-muted)]">{t('Кто вы?')}</p>
      <div className="grid gap-3">
        {options.map((o, i) => (
          <button
            key={o.hash}
            ref={i === 0 ? first : undefined}
            type="button"
            onClick={() => go(o.hash)}
            className="flex w-full items-center gap-3.5 rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-bg)] p-4 text-left transition-colors hover:border-[var(--color-accent)]"
          >
            <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[13px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <o.icon size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-bold text-[var(--color-text)]">{t(o.title)}</span>
              <span className="block text-[13px] text-[var(--color-muted)]">{t(o.text)}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
