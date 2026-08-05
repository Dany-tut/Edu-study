import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, GraduationCap, User, Check, Sparkles, ArrowRight,
  BookOpen, ClipboardCheck, BarChart3, Users, Bell, PencilRuler,
  UserPlus, LayoutGrid, LineChart,
} from 'lucide-react'
import { PLAN_TIERS, planPrice } from '../lib/plan'
import { submitLead } from '../lib/leads'
import { useLang } from '../lib/i18n'
import ThemeToggleBtn from '../components/ThemeToggleBtn'

const ACCENT = '#786AD7'          // фирменный фиолетовый (как в кабинете)
const ACCENT_2 = '#6F3FBF'        // глубокий фиолет для градиента
const ACCENT_L = '#A99BF0'        // светлый лиловый — свечение, вторая точка градиента
const OK = '#4FBF9A'              // только семантика «принято/готово», не бренд

// ── УТП платформы ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: PencilRuler, title: 'Конструктор курсов', text: 'Собирайте уроки, конспекты и домашки в визуальном редакторе — без вёрстки.' },
  { icon: ClipboardCheck, title: 'Проверка ч.2 с аннотациями', text: 'Разбирайте развёрнутые ответы прямо поверх работы ученика — рисунком и комментарием.' },
  { icon: BarChart3, title: 'Аналитика по ученикам', text: 'Кто отстаёт, кто на потоке, где затык — видно сразу, а не в конце месяца.' },
  { icon: Users, title: 'Группы и назначенные ДЗ', text: 'Ведите поток и индивидуальных — единый журнал, посещаемость, оценки.' },
  { icon: Bell, title: 'Уведомления в реальном времени', text: 'Ученик сдал домашку — вы знаете. Открыли урок — ученик знает.' },
  { icon: BookOpen, title: 'Тренажёр и курсы', text: 'Банк заданий и готовые курсы — ученик занимается сам, вы контролируете.' },
]

// ── Как это работает ─────────────────────────────────────────────────────────
const STEPS = [
  { icon: UserPlus, title: 'Заведите учеников', text: 'Добавьте группы и индивидуальных — каждому создаётся личный кабинет со своим логином.' },
  { icon: LayoutGrid, title: 'Соберите курсы и ДЗ', text: 'В конструкторе — уроки, конспекты, тренажёр и домашки. Назначайте одним нажатием.' },
  { icon: LineChart, title: 'Проверяйте и следите', text: 'Домашки с проверкой части 2, журнал, аналитика и уведомления — всё в одном окне.' },
]

export default function LandingPage() {
  const { lang } = useLang()
  const [leadOpen, setLeadOpen] = useState(false)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [presetPlan, setPresetPlan] = useState<string>('')

  const openLead = (plan = '') => { setPresetPlan(plan); setLeadOpen(true) }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflowX: 'hidden' }}>
      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center',
        gap: 16, padding: '14px clamp(16px, 5vw, 56px)',
        background: 'color-mix(in srgb, var(--color-bg) 78%, transparent)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-border) 70%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontWeight: 800, fontSize: 20, letterSpacing: -0.3 }}>
          <img src="/icon.svg" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
          Искра
        </div>
        <nav style={{ marginLeft: 28, display: 'flex', gap: 22 }} className="lp-nav">
          <a href="#how" style={navLink}>Как работает</a>
          <a href="#features" style={navLink}>Возможности</a>
          <a href="#tariffs" style={navLink}>Тарифы</a>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggleBtn />
          <button onClick={() => setChooserOpen(true)} style={ghostBtn}>Личный кабинет</button>
          <button onClick={() => openLead()} style={primaryBtn}>Оставить заявку</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: 'clamp(44px, 8vw, 96px) clamp(16px, 5vw, 56px) 0' }}>
        {/* фоновое свечение */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 900, height: 520, background: `radial-gradient(ellipse at center, color-mix(in srgb, ${ACCENT} 34%, transparent), transparent 68%)`, filter: 'blur(20px)' }} />
          <div style={{ position: 'absolute', top: 40, right: '6%', width: 360, height: 360, background: `radial-gradient(circle, color-mix(in srgb, ${ACCENT_L} 30%, transparent), transparent 70%)`, filter: 'blur(24px)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 940, margin: '0 auto', textAlign: 'center' }}>
          <Reveal>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 999,
              background: `color-mix(in srgb, ${ACCENT} 14%, var(--color-surface))`, color: ACCENT,
              fontSize: 13, fontWeight: 600, marginBottom: 24,
              border: `1px solid color-mix(in srgb, ${ACCENT} 30%, transparent)`,
            }}>
              <Sparkles size={15} /> Платформа для репетиторов и учебных центров
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 style={{ fontSize: 'clamp(34px, 6.4vw, 64px)', lineHeight: 1.04, fontWeight: 800, letterSpacing: -1.4, margin: 0 }}>
              Вся преподавательская<br />
              операционка —{' '}
              <span style={{ background: `linear-gradient(120deg, ${ACCENT}, ${ACCENT_L})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                в одном окне
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontSize: 'clamp(16px, 2.4vw, 20px)', color: 'var(--color-text-2)', maxWidth: 640, margin: '24px auto 0', lineHeight: 1.55 }}>
              Курсы, домашки с проверкой части 2, журнал, аналитика и уведомления.
              Ученики занимаются, вы — управляете, а не тонете в чатах и таблицах.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34 }}>
              <button onClick={() => openLead()} style={{ ...primaryBtn, padding: '15px 30px', fontSize: 16, boxShadow: `0 12px 30px -10px ${ACCENT}` }}>
                <Send size={17} /> Оставить заявку
              </button>
              <button onClick={() => setChooserOpen(true)} style={{ ...ghostBtn, padding: '15px 28px', fontSize: 16 }}>
                Войти в кабинет <ArrowRight size={17} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* mock-скриншот продукта */}
        <Reveal delay={0.2}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '54px auto 0' }}>
            <ProductMock />
          </div>
        </Reveal>
      </section>

      {/* ── Как это работает ── */}
      <section id="how" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>Как это работает</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>Три шага от «завёл учеников» до «вижу прогресс каждого».</p></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginTop: 40 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div style={{ position: 'relative', padding: '26px 24px', borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: '100%' }}>
                <div style={{ position: 'absolute', top: 22, right: 22, fontSize: 40, fontWeight: 800, lineHeight: 1, color: `color-mix(in srgb, ${ACCENT} 20%, transparent)` }}>{i + 1}</div>
                <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: '#fff', marginBottom: 16, boxShadow: `0 8px 20px -8px ${ACCENT}` }}>
                  <s.icon size={22} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 7 }}>{s.title}</div>
                <div style={{ fontSize: 14.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{s.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── УТП ── */}
      <section id="features" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>Почему «Искра»</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>Не ещё один чат и не Google-таблица — цельная рабочая среда преподавателя.</p></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, marginTop: 40 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <div className="lp-feature" style={{ padding: '24px 22px', borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: '100%', transition: 'transform .18s ease, border-color .18s ease' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT, marginBottom: 15 }}>
                  <f.icon size={22} />
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 7 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{f.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Тарифы ── */}
      <section id="tariffs" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>Тарифы</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>Оплата подключается вручную: оставьте заявку — мы активируем нужный тариф.</p></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginTop: 40, alignItems: 'stretch' }}>
          {PLAN_TIERS.map((p, i) => {
            const featured = p.code === 'pro'
            return (
              <Reveal key={p.code} delay={i * 0.05} style={{ height: '100%' }}>
                <div style={{
                  position: 'relative', display: 'flex', flexDirection: 'column', height: '100%',
                  padding: '26px 22px', borderRadius: 20,
                  background: featured ? `linear-gradient(180deg, color-mix(in srgb, ${ACCENT} 16%, var(--color-surface)), var(--color-surface))` : 'var(--color-surface)',
                  border: `1.5px solid ${featured ? ACCENT : 'var(--color-border)'}`,
                  boxShadow: featured ? `0 20px 46px -22px ${ACCENT}` : 'none',
                  transform: featured ? 'translateY(-6px)' : 'none',
                }}>
                  {featured && (
                    <div style={{ position: 'absolute', top: -11, left: 22, padding: '4px 12px', borderRadius: 999, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.2 }}>
                      Популярный
                    </div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3, minHeight: 34 }}>{p.tagline}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '16px 0 4px' }}>
                    <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{planPrice(p, lang)}</span>
                    {p.priceRub > 0 && <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>/ мес</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 18 }}>
                    {p.maxStudents == null ? 'Без лимита учеников' : `До ${p.maxStudents} учеников`}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.4 }}>
                        <span style={{ flexShrink: 0, marginTop: 1, width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${ACCENT} 22%, transparent)` }}>
                          <Check size={12} style={{ color: ACCENT }} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => openLead(`${p.name} · ${planPrice(p, lang)}`)}
                    style={{ ...(featured ? primaryBtn : outlineBtn), marginTop: 22, justifyContent: 'center', width: '100%', padding: '12px' }}>
                    {p.priceRub === 0 ? 'Начать бесплатно' : 'Оставить заявку'}
                  </button>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 980, margin: '0 auto' }}>
        <Reveal>
          <div style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(34px, 6vw, 60px)', borderRadius: 28, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: '#fff', textAlign: 'center' }}>
            <div aria-hidden style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, background: `radial-gradient(circle, color-mix(in srgb, ${ACCENT_L} 55%, transparent), transparent 70%)`, filter: 'blur(10px)', opacity: 0.5 }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, margin: 0, letterSpacing: -0.6 }}>Готовы попробовать?</h2>
              <p style={{ fontSize: 16.5, opacity: 0.92, margin: '14px auto 28px', maxWidth: 500, lineHeight: 1.55 }}>
                Оставьте контакт — расскажем, как начать, и поможем перенести учеников.
              </p>
              <button onClick={() => openLead()} style={{ ...onAccentBtn, padding: '15px 32px', fontSize: 16, boxShadow: '0 14px 34px -12px rgba(0,0,0,0.4)' }}>
                <Send size={17} /> Оставить заявку
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer style={{ marginTop: 'clamp(64px, 9vw, 110px)', padding: '30px clamp(16px, 5vw, 56px) 44px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: 'var(--color-text-3)', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, color: 'var(--color-text-2)' }}>
          <img src="/icon.svg" alt="" width={22} height={22} style={{ borderRadius: 6 }} /> Искра
        </div>
        <span style={{ marginLeft: 'auto' }}>© Искра · Платформа для преподавателей</span>
      </footer>

      <style>{`
        .lp-nav a:hover { color: var(--color-text); }
        .lp-feature:hover { transform: translateY(-3px); border-color: color-mix(in srgb, ${ACCENT} 45%, var(--color-border)); }
        @media (max-width: 760px) { .lp-nav { display: none !important; } }
      `}</style>

      {/* ── Modals ── */}
      <AnimatePresence>
        {chooserOpen && <RoleChooser onClose={() => setChooserOpen(false)} />}
        {leadOpen && <LeadModal presetPlan={presetPlan} onClose={() => setLeadOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Мок-скриншот кабинета учителя ────────────────────────────────────────────
function ProductMock() {
  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden', border: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      boxShadow: '0 40px 90px -30px rgba(20, 12, 50, 0.45), 0 8px 30px -12px rgba(20,12,50,0.25)',
    }}>
      {/* браузерный бар */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: '1px solid var(--color-border)', background: 'color-mix(in srgb, var(--color-bg) 40%, var(--color-surface))' }}>
        <span style={{ width: 11, height: 11, borderRadius: 999, background: '#ED6A5E' }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: '#F4BF4F' }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: '#61C554' }} />
        <div style={{ marginLeft: 12, flex: 1, maxWidth: 320, height: 22, borderRadius: 7, background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, color: 'var(--color-text-3)' }}>
          iskra.app / кабинет
        </div>
      </div>
      {/* тело */}
      <div style={{ display: 'flex', minHeight: 340 }}>
        {/* сайдбар */}
        <div className="lp-mock-side" style={{ width: 176, flexShrink: 0, borderRight: '1px solid var(--color-border)', padding: '16px 12px', background: 'color-mix(in srgb, var(--color-bg) 25%, var(--color-surface))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, marginBottom: 18, padding: '0 4px' }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` }} /> Искра
          </div>
          {['Обзор', 'Группы', 'Домашки', 'Журнал', 'Аналитика'].map((n, i) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 9, marginBottom: 3,
              fontSize: 13, fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? ACCENT : 'var(--color-text-2)',
              background: i === 0 ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : 'transparent',
            }}>
              <span style={{ width: 15, height: 15, borderRadius: 5, background: i === 0 ? ACCENT : 'var(--color-border)' }} /> {n}
            </div>
          ))}
        </div>
        {/* контент */}
        <div style={{ flex: 1, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>Обзор</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 16 }}>Сегодня, 3 занятия · 5 работ на проверку</div>
          {/* стат-карточки */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { k: 'Учеников', v: '24', c: ACCENT },
              { k: 'На проверку', v: '5', c: ACCENT_L },
              { k: 'Средний балл', v: '4.3', c: '#E8A54F' },
            ].map(s => (
              <div key={s.k} style={{ padding: '12px 13px', borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6 }}>{s.k}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          {/* мини-график */}
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Сдачи домашек за неделю</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 64 }}>
              {[42, 58, 35, 72, 50, 88, 64].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 5, background: i === 5 ? `linear-gradient(180deg, ${ACCENT_L}, ${ACCENT})` : `color-mix(in srgb, ${ACCENT} 40%, transparent)` }} />
              ))}
            </div>
          </div>
          {/* очередь проверки */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { n: 'Анна К.', t: 'ДЗ · Часть 2 — вариант 7', ok: false },
              { n: 'Марк В.', t: 'Курс · Урок 12', ok: true },
            ].map(r => (
              <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <span style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_L})` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.t}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, color: r.ok ? OK : ACCENT, background: r.ok ? `color-mix(in srgb, ${OK} 16%, transparent)` : `color-mix(in srgb, ${ACCENT} 14%, transparent)` }}>
                  {r.ok ? 'Принято' : 'Проверить'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 640px){ .lp-mock-side{ display:none !important; } }`}</style>
    </div>
  )
}

// ── Reveal-on-scroll (scroll-слушатель + rect, без rAF/IO) ───────────────────
// IntersectionObserver в некоторых окружениях (в т.ч. превью) не досылает колбэки
// при скролле, поэтому появление считаем по getBoundingClientRect на событиях
// scroll/resize — они приходят надёжно. См. [[preview-no-raf]].
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let done = false
    const check = () => {
      if (done) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (r.top < vh * 0.9 && r.bottom > 0) {
        done = true
        setShown(true)
        window.removeEventListener('scroll', check)
        window.removeEventListener('resize', check)
      }
    }
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    check() // сразу для того, что уже в вьюпорте
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : 'translateY(20px)',
      transition: `opacity .6s ease ${delay}s, transform .7s cubic-bezier(.22,1,.36,1) ${delay}s`,
      willChange: 'opacity, transform',
      ...style,
    }}>
      {children}
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
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${ACCENT_L} 20%, transparent)`, color: ACCENT_L }}><User size={22} /></div>
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

// ── Форма заявки ─────────────────────────────────────────────────────────────
function LeadModal({ presetPlan, onClose }: { presetPlan: string; onClose: () => void }) {
  const { lang } = useLang()
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
            <div style={{ width: 60, height: 60, borderRadius: 999, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${OK} 22%, transparent)`, color: OK }}>
              <Check size={30} />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Заявка отправлена</h3>
            <p style={{ fontSize: 14.5, color: 'var(--color-text-2)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Спасибо! Мы свяжемся с вами по указанному контакту.
            </p>
            <button onClick={onClose} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '13px' }}>Готово</button>
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
                    const label = `${p.name} · ${planPrice(p, lang)}`
                    const active = plan === label
                    return (
                      <button key={p.code} type="button" onClick={() => setPlan(active ? '' : label)} style={{
                        padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        border: `1.5px solid ${active ? ACCENT : 'var(--color-border)'}`,
                        background: active ? `color-mix(in srgb, ${ACCENT} 15%, transparent)` : 'var(--color-surface)',
                        color: 'var(--color-text)', transition: 'all .12s',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{planPrice(p, lang)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Сообщение — коротко о задаче (необязательно)" rows={3} style={{ ...field, resize: 'vertical', minHeight: 84 }} />
              {error && <div style={{ fontSize: 13, color: '#E86A6A', fontWeight: 600 }}>{error}</div>}
              <button onClick={send} disabled={sending} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, opacity: sending ? 0.7 : 1, cursor: sending ? 'default' : 'pointer' }}>
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
