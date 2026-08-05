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

  const wideTier = PLAN_TIERS.find(p => p.maxStudents == null)
  const gridTiers = PLAN_TIERS.filter(p => p !== wideTier)

  // высота фиксированной шапки → спейсер + scroll-margin для якорей
  const headerRef = useRef<HTMLElement>(null)
  const [headerH, setHeaderH] = useState(64)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight))
    ro.observe(el)
    setHeaderH(el.offsetHeight)
    return () => ro.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', overflowX: 'hidden' }}>
      {/* ── Top bar ── */}
      <header ref={headerRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center',
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
      {/* спейсер под фиксированную шапку */}
      <div aria-hidden style={{ height: headerH }} />

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
        {/* 4 основных тарифа сеткой + «Безлимит» широкой карточкой — иначе
            пятая карточка висит сиротой в ряду из четырёх */}
        <div className="lp-tariffs" style={{ marginTop: 46 }}>
          {gridTiers.map((p, i) => {
            const featured = p.code === 'pro'
            const limit = p.maxStudents == null ? 'Без лимита учеников' : `До ${p.maxStudents} учеников`
            return (
              <Reveal key={p.code} delay={i * 0.05} style={{ height: '100%' }}>
                <div className="lp-tariff" style={{
                  position: 'relative', display: 'flex', flexDirection: 'column', height: '100%',
                  padding: '26px 22px', borderRadius: 20,
                  background: featured ? `linear-gradient(180deg, color-mix(in srgb, ${ACCENT} 16%, var(--color-surface)), var(--color-surface))` : 'var(--color-surface)',
                  border: `1.5px solid ${featured ? ACCENT : 'var(--color-border)'}`,
                  boxShadow: featured ? `0 20px 46px -22px ${ACCENT}` : 'none',
                }}>
                  {featured && (
                    <div style={{ position: 'absolute', top: -11, left: 22, padding: '4px 12px', borderRadius: 999, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.2 }}>
                      Популярный
                    </div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{p.tagline}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '18px 0 3px' }}>
                    <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{planPrice(p, lang)}</span>
                    {p.priceRub > 0 && <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>/ мес</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{limit}</div>
                  <div style={{ height: 1, background: 'var(--color-border)', opacity: 0.7, margin: '18px 0' }} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {p.features.filter(f => f !== limit).map(f => <PlanFeature key={f} text={f} />)}
                  </ul>
                  <button onClick={() => openLead(`${p.name} · ${planPrice(p, lang)}`)}
                    style={{ ...(featured ? primaryBtn : outlineBtn), marginTop: 24, justifyContent: 'center', width: '100%', padding: '12px' }}>
                    {p.priceRub === 0 ? 'Начать бесплатно' : 'Оставить заявку'}
                  </button>
                </div>
              </Reveal>
            )
          })}
        </div>

        {wideTier && (
          <Reveal delay={0.2}>
            <div className="lp-tariff lp-tariff-wide" style={{
              marginTop: 16, padding: '26px 26px', borderRadius: 20,
              border: '1.5px solid var(--color-border)',
              background: `linear-gradient(120deg, color-mix(in srgb, ${ACCENT} 9%, var(--color-surface)), var(--color-surface) 62%)`,
              display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: 190 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{wideTier.name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{wideTier.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{planPrice(wideTier, lang)}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>/ мес</span>
                </div>
              </div>
              <ul style={{
                listStyle: 'none', padding: 0, margin: 0, flex: 1, minWidth: 260,
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 22px',
              }}>
                {wideTier.features.map(f => <PlanFeature key={f} text={f} />)}
              </ul>
              <button onClick={() => openLead(`${wideTier.name} · ${planPrice(wideTier, lang)}`)}
                style={{ ...outlineBtn, justifyContent: 'center', padding: '12px 26px', flexShrink: 0 }}>
                Оставить заявку
              </button>
            </div>
          </Reveal>
        )}
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
        #how, #features, #tariffs { scroll-margin-top: ${headerH + 16}px; }
        .lp-feature:hover { transform: translateY(-3px); border-color: color-mix(in srgb, ${ACCENT} 45%, var(--color-border)); }
        @media (max-width: 760px) { .lp-nav { display: none !important; } }

        .lp-tariffs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: stretch; }
        @media (max-width: 1020px) { .lp-tariffs { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .lp-tariffs { grid-template-columns: 1fr; } }
        .lp-tariff { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        .lp-tariff:hover { transform: translateY(-4px); border-color: color-mix(in srgb, ${ACCENT} 45%, var(--color-border)); }
        @media (max-width: 700px) { .lp-tariff-wide { flex-direction: column; align-items: stretch; } .lp-tariff-wide > button { width: 100%; } }
      `}</style>

      {/* ── Modals ── */}
      <AnimatePresence>
        {chooserOpen && <RoleChooser onClose={() => setChooserOpen(false)} />}
        {leadOpen && <LeadModal presetPlan={presetPlan} onClose={() => setLeadOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Интерактивный мок-кабинет: кликабельные вкладки показывают разделы ────────
const MOCK_TABS = [
  { key: 'Обзор', sub: 'Сегодня, 3 занятия · 5 работ на проверку' },
  { key: 'Группы', sub: '4 группы · 24 ученика' },
  { key: 'Домашки', sub: '5 работ ждут проверки' },
  { key: 'Журнал', sub: 'Посещаемость и оценки' },
  { key: 'Аналитика', sub: 'Прогресс за месяц' },
] as const

function ProductMock() {
  const [active, setActive] = useState(0)
  const tab = MOCK_TABS[active]
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
        <span className="lp-mock-hint" style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: OK, boxShadow: `0 0 0 3px color-mix(in srgb, ${OK} 25%, transparent)` }} />
          живое демо — кликайте разделы
        </span>
      </div>

      {/* мобильный таб-бар (вместо сайдбара на узких экранах) */}
      <div className="lp-mock-tabs" style={{ display: 'none', gap: 6, padding: '10px 12px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
        {MOCK_TABS.map((t, i) => (
          <button key={t.key} onClick={() => setActive(i)} style={{
            flexShrink: 0, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: active === i ? 700 : 500,
            border: `1px solid ${active === i ? ACCENT : 'var(--color-border)'}`,
            color: active === i ? '#fff' : 'var(--color-text-2)',
            background: active === i ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'transparent',
          }}>{t.key}</button>
        ))}
      </div>

      {/* тело */}
      <div style={{ display: 'flex', minHeight: 360 }}>
        {/* сайдбар */}
        <div className="lp-mock-side" style={{ width: 176, flexShrink: 0, borderRight: '1px solid var(--color-border)', padding: '16px 12px', background: 'color-mix(in srgb, var(--color-bg) 25%, var(--color-surface))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, marginBottom: 18, padding: '0 4px' }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` }} /> Искра
          </div>
          {MOCK_TABS.map((t, i) => {
            const on = active === i
            return (
              <button key={t.key} onClick={() => setActive(i)} className="lp-mock-nav" style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 9, marginBottom: 3, width: '100%',
                fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', border: 'none', textAlign: 'left',
                color: on ? ACCENT : 'var(--color-text-2)',
                background: on ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : 'transparent',
                transition: 'background .15s, color .15s',
              }}>
                <span style={{ width: 15, height: 15, borderRadius: 5, background: on ? ACCENT : 'var(--color-border)', transition: 'background .15s' }} /> {t.key}
              </button>
            )
          })}
        </div>

        {/* контент */}
        <div style={{ flex: 1, padding: 20, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{tab.key}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 16 }}>{tab.sub}</div>
          {/* key на смену вкладки → CSS-переход входа (framer-motion не годится:
              rAF в превью не срабатывает, AnimatePresence зависает — см. [[preview-no-raf]]) */}
          <div key={tab.key} className="lp-mock-panel">
            {active === 0 && <MockOverview />}
            {active === 1 && <MockGroups />}
            {active === 2 && <MockHomework />}
            {active === 3 && <MockJournal />}
            {active === 4 && <MockAnalytics />}
          </div>
        </div>
      </div>
      <style>{`
        .lp-mock-nav:hover { background: color-mix(in srgb, ${ACCENT} 8%, transparent); }
        .lp-mock-panel { animation: lpPanelIn .28s cubic-bezier(.22,1,.36,1); }
        @keyframes lpPanelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (max-width: 640px){
          .lp-mock-side{ display:none !important; }
          .lp-mock-tabs{ display:flex !important; }
          .lp-mock-hint{ display:none !important; }
        }
      `}</style>
    </div>
  )
}

// панель «Обзор» — KPI + недельный график + очередь проверки
function MockOverview() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { k: 'Учеников', v: '24', c: ACCENT },
          { k: 'На проверку', v: '5', c: ACCENT_L },
          { k: 'Средний балл', v: '4.3', c: '#E8A54F' },
        ].map(s => (
          <div key={s.k} style={mockCard}>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6 }}>{s.k}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ ...mockCard, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Сдачи домашек за неделю</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 64 }}>
          {[42, 58, 35, 72, 50, 88, 64].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 5, background: i === 5 ? `linear-gradient(180deg, ${ACCENT_L}, ${ACCENT})` : `color-mix(in srgb, ${ACCENT} 40%, transparent)` }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: 'Анна К.', t: 'ДЗ · Часть 2 — вариант 7', ok: false },
          { n: 'Марк В.', t: 'Курс · Урок 12', ok: true },
        ].map(r => (
          <div key={r.n} style={{ ...mockRow }}>
            <span style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_L})` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.t}</div>
            </div>
            <span style={pill(r.ok)}>{r.ok ? 'Принято' : 'Проверить'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// панель «Группы» — карточки групп с составом
function MockGroups() {
  const groups = [
    { n: 'ЕГЭ Математика', s: 'Профиль · пн/чт 18:00', cnt: 12, avg: '4.5' },
    { n: 'ОГЭ Русский', s: 'вт/сб 16:00', cnt: 8, avg: '4.1' },
    { n: 'Индивидуальные', s: '1:1 · гибкий график', cnt: 4, avg: '4.7' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map(g => (
        <div key={g.n} style={{ ...mockCard, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 15, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` }}>{g.n[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{g.n}</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>{g.s}</div>
          </div>
          {/* стопка аватарок */}
          <div style={{ display: 'flex' }}>
            {Array.from({ length: Math.min(g.cnt, 4) }).map((_, i) => (
              <span key={i} style={{ width: 22, height: 22, borderRadius: 999, marginLeft: i ? -7 : 0, border: '2px solid var(--color-surface)', background: `linear-gradient(135deg, ${ACCENT_L}, ${ACCENT})` }} />
            ))}
            {g.cnt > 4 && <span style={{ width: 22, height: 22, borderRadius: 999, marginLeft: -7, border: '2px solid var(--color-surface)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, color: 'var(--color-text-2)', background: 'var(--color-bg)' }}>+{g.cnt - 4}</span>}
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 9px', borderRadius: 999, color: '#E8A54F', background: 'color-mix(in srgb, #E8A54F 15%, transparent)' }}>★ {g.avg}</span>
        </div>
      ))}
    </div>
  )
}

// панель «Домашки» — проверка части 2 с аннотацией поверх работы ученика
function MockHomework() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 12 }} className="lp-mock-hw">
      {/* превью работы с аннотацией */}
      <div style={{ ...mockCard, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700 }}>Анна К. · Часть 2, задание 13</div>
        <div style={{ position: 'relative', padding: 14 }}>
          {/* строки «ответа ученика» */}
          {[92, 80, 88, 64].map((w, i) => (
            <div key={i} style={{ height: 8, width: `${w}%`, borderRadius: 4, marginBottom: 9, background: 'color-mix(in srgb, var(--color-text-3) 28%, transparent)' }} />
          ))}
          {/* вектор-аннотация учителя поверх */}
          <svg viewBox="0 0 200 90" style={{ position: 'absolute', inset: 14, width: 'calc(100% - 28px)', height: 'calc(100% - 28px)', pointerEvents: 'none' }}>
            <path d="M8,20 C40,10 70,34 120,18" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="150" cy="52" r="14" fill="none" stroke="#E8A54F" strokeWidth="2.4" />
            <path d="M150,66 L150,82" stroke="#E8A54F" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          {/* комментарий-выноска */}
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, fontSize: 11.5, lineHeight: 1.4, color: 'var(--color-text-2)', background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${ACCENT} 30%, transparent)` }}>
            <b style={{ color: ACCENT }}>Комментарий:</b> здесь потеряли ОДЗ — минус 1 балл.
          </div>
        </div>
      </div>
      {/* очередь + оценка */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: 'Анна К.', t: 'Часть 2 · вар. 7', st: 'now' },
          { n: 'Игорь П.', t: 'Часть 2 · вар. 5', st: 'now' },
          { n: 'Марк В.', t: 'Урок 12', st: 'ok' },
          { n: 'Лена С.', t: 'Тренажёр · линия 8', st: 'ok' },
        ].map(r => (
          <div key={r.n} style={mockRow}>
            <span style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_L})` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.n}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{r.t}</div>
            </div>
            <span style={pill(r.st === 'ok')}>{r.st === 'ok' ? 'Принято' : 'Проверить'}</span>
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 520px){ .lp-mock-hw{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

// панель «Журнал» — сетка посещаемости и оценок
function MockJournal() {
  const rows = [
    { n: 'Анна К.', cells: ['5', '4', '✓', '5', '5'] },
    { n: 'Игорь П.', cells: ['4', '✓', '3', '4', '✓'] },
    { n: 'Марк В.', cells: ['✓', '5', '5', '·', '4'] },
    { n: 'Лена С.', cells: ['3', '4', '✓', '5', '5'] },
  ]
  const dates = ['02.09', '05.09', '09.09', '12.09', '16.09']
  const cellColor = (v: string) => {
    if (v === '✓') return { c: OK, bg: `color-mix(in srgb, ${OK} 16%, transparent)` }
    if (v === '·') return { c: 'var(--color-text-3)', bg: 'transparent' }
    if (v === '5') return { c: ACCENT, bg: `color-mix(in srgb, ${ACCENT} 15%, transparent)` }
    if (v === '3') return { c: '#E8934F', bg: 'color-mix(in srgb, #E8934F 15%, transparent)' }
    return { c: '#E8A54F', bg: 'color-mix(in srgb, #E8A54F 14%, transparent)' }
  }
  return (
    <div style={{ ...mockCard, overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `92px repeat(${dates.length}, 1fr)`, gap: 6, minWidth: 320 }}>
        <div />
        {dates.map(d => <div key={d} style={{ fontSize: 10.5, color: 'var(--color-text-3)', textAlign: 'center', fontWeight: 600 }}>{d}</div>)}
        {rows.map(r => (
          <FragmentRow key={r.n} name={r.n} cells={r.cells} color={cellColor} />
        ))}
      </div>
    </div>
  )
}
function FragmentRow({ name, cells, color }: { name: string; cells: string[]; color: (v: string) => { c: string; bg: string } }) {
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
        <span style={{ width: 20, height: 20, borderRadius: 999, flexShrink: 0, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_L})` }} /> {name}
      </div>
      {cells.map((v, i) => {
        const { c, bg } = color(v)
        return <div key={i} style={{ height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 700, color: c, background: bg }}>{v}</div>
      })}
    </>
  )
}

// панель «Аналитика» — динамика + распределение оценок
function MockAnalytics() {
  const line = [30, 44, 40, 58, 52, 70, 66, 82]
  const pts = line.map((v, i) => `${(i / (line.length - 1)) * 100},${100 - v}`).join(' ')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={mockCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Средний балл потока</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: OK }}>▲ +0.6 за месяц</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
          <defs>
            <linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${pts} 100,100`} fill="url(#lpArea)" />
          <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={mockCard}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Распределение оценок</div>
          {/* столбики — прямые дети контейнера с фиксированной высотой (иначе % не резолвится) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 56 }}>
            {[{ g: '2', h: 12 }, { g: '3', h: 34 }, { g: '4', h: 78 }, { g: '5', h: 92 }].map(b => (
              <div key={b.g} style={{ flex: 1, height: `${b.h}%`, borderRadius: 5, background: `linear-gradient(180deg, ${ACCENT_L}, ${ACCENT})` }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {['2', '3', '4', '5'].map(g => (
              <div key={g} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: 'var(--color-text-3)' }}>{g}</div>
            ))}
          </div>
        </div>
        <div style={{ ...mockCard, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          {[{ k: 'Сдаваемость ДЗ', v: '92%' }, { k: 'Активных за неделю', v: '21 / 24' }].map(s => (
            <div key={s.k}>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{s.k}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// общие стили мок-панелей
const mockCard: React.CSSProperties = { padding: '14px 16px', borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }
const mockRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }
const pill = (ok: boolean): React.CSSProperties => ({
  fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap',
  color: ok ? OK : ACCENT,
  background: ok ? `color-mix(in srgb, ${OK} 16%, transparent)` : `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
})

// строка возможности тарифа (сетка и широкая карточка «Безлимита»)
function PlanFeature({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.4 }}>
      <span style={{ flexShrink: 0, marginTop: 1, width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${ACCENT} 22%, transparent)` }}>
        <Check size={12} style={{ color: ACCENT }} />
      </span>
      {text}
    </li>
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
