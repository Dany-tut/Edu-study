import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, GraduationCap, User, Check, Sparkles,
  BookOpen, ClipboardCheck, BarChart3, Users, Bell, PencilRuler,
} from 'lucide-react'
import { PLAN_TIERS } from '../lib/plan'
import { submitLead } from '../lib/leads'

const ACCENT = '#786AD7'          // фирменный фиолетовый
const MINT_A = '#7FE7C4'          // мятный CTA (как на макете)
const MINT_B = '#57C9A6'

// ── УТП платформы ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: PencilRuler, title: 'Конструктор курсов', text: 'Собирайте уроки, конспекты и домашки в визуальном редакторе — без вёрстки.' },
  { icon: ClipboardCheck, title: 'Проверка ч.2 с аннотациями', text: 'Разбирайте развёрнутые ответы прямо поверх работы ученика — рисунком и комментарием.' },
  { icon: BarChart3, title: 'Аналитика по ученикам', text: 'Кто отстаёт, кто на потоке, где затык — видно сразу, а не в конце месяца.' },
  { icon: Users, title: 'Группы и назначенные ДЗ', text: 'Ведите поток и индивидуальных — единый журнал, посещаемость, оценки.' },
  { icon: Bell, title: 'Уведомления в реальном времени', text: 'Ученик сдал домашку — вы знаете. Открыли урок — ученик знает.' },
  { icon: BookOpen, title: 'Тренажёр и курсы', text: 'Банк заданий и готовые курсы — ученик занимается сам, вы контролируете.' },
]

const money = (n: number) => n === 0 ? '0 ₽' : `${n.toLocaleString('ru-RU')} ₽`

export default function LandingPage() {
  const [leadOpen, setLeadOpen] = useState(false)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [presetPlan, setPresetPlan] = useState<string>('')

  const openLead = (plan = '') => { setPresetPlan(plan); setLeadOpen(true) }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center',
        gap: 16, padding: '16px clamp(16px, 5vw, 56px)',
        background: 'color-mix(in srgb, var(--color-bg) 82%, transparent)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontWeight: 800, fontSize: 20, letterSpacing: -0.3 }}>
          <img src="/icon.svg" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
          Искра
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setChooserOpen(true)} style={ghostBtn}>Личный кабинет</button>
          <button onClick={() => openLead()} style={mintBtn}>Оставить заявку</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: 'clamp(48px, 9vw, 110px) clamp(16px, 5vw, 56px) 40px', maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 999,
          background: `color-mix(in srgb, ${ACCENT} 16%, transparent)`, color: ACCENT,
          fontSize: 13, fontWeight: 600, marginBottom: 22,
        }}>
          <Sparkles size={15} /> Платформа для репетиторов и учебных центров
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 58px)', lineHeight: 1.05, fontWeight: 800, letterSpacing: -1, margin: 0 }}>
          Вся ваша преподавательская<br />операционка — в одном окне
        </h1>
        <p style={{ fontSize: 'clamp(15px, 2.4vw, 19px)', color: 'var(--color-text-2)', maxWidth: 620, margin: '22px auto 0', lineHeight: 1.55 }}>
          Курсы, домашки с проверкой части 2, журнал, аналитика и уведомления.
          Ученики занимаются, вы — управляете, а не тонете в чатах и таблицах.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34 }}>
          <button onClick={() => openLead()} style={{ ...mintBtn, padding: '14px 28px', fontSize: 16 }}>
            <Send size={17} /> Оставить заявку
          </button>
          <button onClick={() => setChooserOpen(true)} style={{ ...ghostBtn, padding: '14px 26px', fontSize: 16 }}>
            Войти в кабинет
          </button>
        </div>
      </section>

      {/* ── Тарифы ── */}
      <section id="tariffs" style={{ padding: '40px clamp(16px, 5vw, 56px) 24px', maxWidth: 1180, margin: '0 auto' }}>
        <h2 style={sectionTitle}>Тарифы</h2>
        <p style={sectionSub}>Оплата подключается вручную: оставьте заявку — мы активируем нужный тариф.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginTop: 30 }}>
          {PLAN_TIERS.map((p, i) => {
            const featured = p.code === 'pro'
            return (
              <div key={p.code} style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                padding: '24px 22px', borderRadius: 18,
                background: featured ? `linear-gradient(180deg, color-mix(in srgb, ${ACCENT} 14%, var(--color-surface)), var(--color-surface))` : 'var(--color-surface)',
                border: `1.5px solid ${featured ? ACCENT : 'var(--color-border)'}`,
              }}>
                {featured && (
                  <div style={{ position: 'absolute', top: -11, left: 22, padding: '3px 11px', borderRadius: 999, background: ACCENT, color: '#fff', fontSize: 11.5, fontWeight: 700 }}>
                    Популярный
                  </div>
                )}
                <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{p.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '18px 0 4px' }}>
                  <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{money(p.priceRub)}</span>
                  {p.priceRub > 0 && <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>/ мес</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
                  {p.maxStudents == null ? 'Без лимита учеников' : `До ${p.maxStudents} учеников`}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.4 }}>
                      <Check size={16} style={{ color: MINT_B, flexShrink: 0, marginTop: 1 }} /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => openLead(`${p.name} · ${money(p.priceRub)}`)}
                  style={{ ...(featured ? mintBtn : outlineBtn), marginTop: 20, justifyContent: 'center', width: '100%' }}>
                  {p.priceRub === 0 ? 'Начать бесплатно' : 'Оставить заявку'}
                </button>
                {/* i помогает линтеру-ключу оставаться стабильным */}
                <span hidden>{i}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── УТП ── */}
      <section style={{ padding: '48px clamp(16px, 5vw, 56px) 20px', maxWidth: 1180, margin: '0 auto' }}>
        <h2 style={sectionTitle}>Почему «Искра»</h2>
        <p style={sectionSub}>Не ещё один чат и не Google-таблица — цельная рабочая среда преподавателя.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 30 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: '22px 20px', borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT, marginBottom: 14 }}>
                <f.icon size={21} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section style={{ padding: 'clamp(40px, 7vw, 80px) clamp(16px, 5vw, 56px)', maxWidth: 900, margin: '20px auto 0', textAlign: 'center' }}>
        <div style={{ padding: 'clamp(30px, 5vw, 52px)', borderRadius: 24, background: `linear-gradient(135deg, ${ACCENT}, #6F3FBF)`, color: '#fff' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Готовы попробовать?</h2>
          <p style={{ fontSize: 16, opacity: 0.9, margin: '12px auto 26px', maxWidth: 480, lineHeight: 1.5 }}>
            Оставьте контакт — расскажем, как начать, и поможем перенести учеников.
          </p>
          <button onClick={() => openLead()} style={{ ...mintBtn, padding: '14px 30px', fontSize: 16 }}>
            <Send size={17} /> Оставить заявку
          </button>
        </div>
      </section>

      <footer style={{ padding: '30px clamp(16px, 5vw, 56px) 44px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
        © {'Искра'} · Платформа для преподавателей
      </footer>

      {/* ── Modals ── */}
      <AnimatePresence>
        {chooserOpen && <RoleChooser onClose={() => setChooserOpen(false)} />}
        {leadOpen && <LeadModal presetPlan={presetPlan} onClose={() => setLeadOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Выбор роли для входа ─────────────────────────────────────────────────────
function RoleChooser({ onClose }: { onClose: () => void }) {
  const go = (hash: string) => { window.location.hash = hash; onClose() }
  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={420}>
        <ModalClose onClose={onClose} />
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Личный кабинет</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 22px' }}>Кто вы?</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <button onClick={() => go('#/login')} style={roleBtn}>
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${MINT_B} 20%, transparent)`, color: MINT_B }}><User size={22} /></div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Я ученик</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Вход по логину и паролю от учителя</div>
            </div>
          </button>
          <button onClick={() => go('#/teacher')} style={roleBtn}>
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${ACCENT} 20%, transparent)`, color: ACCENT }}><GraduationCap size={22} /></div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Я преподаватель</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Кабинет учителя и администратора</div>
            </div>
          </button>
        </div>
      </ModalCard>
    </Backdrop>
  )
}

// ── Форма заявки (как на макете) ─────────────────────────────────────────────
function LeadModal({ presetPlan, onClose }: { presetPlan: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [plan, setPlan] = useState(presetPlan)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!contact.trim()) { setError('Укажите контакт для связи'); return }
    setSending(true); setError('')
    const { error } = await submitLead({ name, contact, plan, message })
    setSending(false)
    if (error) { setError('Не удалось отправить. Попробуйте ещё раз.'); return }
    setDone(true)
  }

  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={520}>
        <ModalClose onClose={onClose} />
        {done ? (
          <div style={{ textAlign: 'center', padding: '18px 8px' }}>
            <div style={{ width: 60, height: 60, borderRadius: 999, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${MINT_B} 22%, transparent)`, color: MINT_B }}>
              <Check size={30} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Заявка отправлена</h3>
            <p style={{ fontSize: 14.5, color: 'var(--color-text-2)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Спасибо! Мы свяжемся с вами по указанному контакту.
            </p>
            <button onClick={onClose} style={{ ...mintBtn, width: '100%', justifyContent: 'center', padding: '13px' }}>Готово</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 23, fontWeight: 800, margin: '0 0 6px' }}>Оставить заявку</h3>
            <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Оставьте контакт — расскажем, как начать, и поможем с настройкой.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Как к вам обращаться" style={field} />
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Контакт для связи — email, телефон или Telegram *" style={field} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', margin: '4px 0 8px' }}>Интересующий тариф</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                  {PLAN_TIERS.map(p => {
                    const label = `${p.name} · ${money(p.priceRub)}`
                    const active = plan === label
                    return (
                      <button key={p.code} type="button" onClick={() => setPlan(active ? '' : label)} style={{
                        padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        border: `1.5px solid ${active ? ACCENT : 'var(--color-border)'}`,
                        background: active ? `color-mix(in srgb, ${ACCENT} 15%, transparent)` : 'var(--color-surface)',
                        color: 'var(--color-text)', transition: 'all .12s',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{money(p.priceRub)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Сообщение — коротко о задаче (необязательно)" rows={3} style={{ ...field, resize: 'vertical', minHeight: 84 }} />
              {error && <div style={{ fontSize: 13, color: '#E86A6A', fontWeight: 600 }}>{error}</div>}
              <button onClick={send} disabled={sending} style={{ ...mintBtn, width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, opacity: sending ? 0.7 : 1, cursor: sending ? 'default' : 'pointer' }}>
                <Send size={17} /> {sending ? 'Отправляем…' : 'Отправить заявку'}
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
  return (
    <button onClick={onClose} aria-label="Закрыть" style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
      <X size={20} />
    </button>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const mintBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
  border: 'none', cursor: 'pointer', fontSize: 14.5, fontWeight: 700, color: '#0C2A22',
  background: `linear-gradient(135deg, ${MINT_A}, ${MINT_B})`,
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
const sectionTitle: React.CSSProperties = { fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, textAlign: 'center', margin: 0, letterSpacing: -0.5 }
const sectionSub: React.CSSProperties = { fontSize: 15, color: 'var(--color-text-2)', textAlign: 'center', margin: '10px auto 0', maxWidth: 540, lineHeight: 1.5 }
