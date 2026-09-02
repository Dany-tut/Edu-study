import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { retryImport } from '../lib/chunkError'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, X, GraduationCap, User, Check, Sparkles, ArrowRight,
  BookOpen, ClipboardCheck, BarChart3, Users, Bell, PencilRuler,
  UserPlus, LayoutGrid, LineChart,
} from 'lucide-react'
import { PLAN_TIERS, planPrice } from '../lib/plan'
import { submitLead } from '../lib/leads'
import { useLang, useT } from '../lib/i18n'
import ThemeToggleBtn from '../components/ThemeToggleBtn'

// Мокап продукта — 81 КБ рисованного интерфейса, и он стоит ПОД первым экраном
// (внутри Reveal, который и так ждёт прокрутки). Держать его в главном чанке
// значит задерживать заголовок ради картинки, которую ещё не видно. Место под
// него зарезервировано коробкой той же пропорции, чтобы страница не прыгнула.
const ProductMock = lazy(() => retryImport(() => import('../components/landing/ProductMock')))

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

// ── Режимы заданий языкового курса ───────────────────────────────────────────
//
// Порядок и названия — из реестра типов (src/data/taskTypes.ts), цвет — из
// семьи ответа (src/data/taskTypeVisuals.ts): выбор зелёный, ввод персиковый,
// сборка жёлтая, слух синий, речь фиолетовая, словарь бирюзовый. Список
// витрины держим руками: сюда попадают все 27 типов, но подписи короче
// редакторских — это лендинг, а не палитра учителя.
const TASK_FAMILIES = [
  {
    title: 'На слух', color: 'var(--color-blue-pill-text)',
    modes: ['Диктант', 'Диктант с подсказкой', 'Похожие звуки', 'Пропуск в диалоге', 'Видео с зачётом просмотра'],
    text: 'Второй темп для тех, кто не разобрал. Реплики диалога озвучены разными голосами.',
  },
  {
    title: 'Сборка тапами', color: 'var(--color-yellow-text)',
    modes: ['Собрать предложение', 'Написано неправильно', 'Сборка из блоков', 'Ряд слогов', 'Собрать слог', 'Последовательность'],
    text: 'Без клавиатуры: порядок слов и состав слога ставятся руками, обманки — из того же поля.',
  },
  {
    title: 'Ввод и припоминание', color: 'var(--color-peach-text)',
    modes: ['Вписать ответ', 'Дрилл по шаблону', 'Пропуски по банку слов', 'Набор слова по буквам', 'Заполнить таблицу'],
    text: 'Банк один на десяток строк: ошибка в первой строке отнимает слово у седьмой.',
  },
  {
    // --color-accent, а не --color-purple: последний в светлой теме #9C8CF0 —
    // на белой карточке чипсы в 13px читаются на грани.
    title: 'Речь и развёрнутый ответ', color: 'var(--color-accent)',
    modes: ['Записать голос', 'Описать картинку', 'Сравнить картинки', 'Развёрнутый ответ', 'Доска'],
    text: 'Ученик говорит — распознанное сверяется с эталоном. Письменное проверяете вы, с аннотациями.',
  },
  {
    title: 'Словарь и письменность', color: 'var(--color-teal-pill-text)',
    modes: ['Карточка со словом', 'Кроссворд', 'Обвести букву'],
    text: 'Значение картинкой, повторение по расписанию, порядок черт — как в прописи.',
  },
  {
    title: 'Выбор и пары', color: 'var(--color-green-text)',
    modes: ['Один ответ', 'Несколько верных', 'Сопоставление'],
    text: 'База, с которой начинается любой курс, — и единственное, что умеют остальные платформы.',
  },
]

// ── Как это работает ─────────────────────────────────────────────────────────
const STEPS = [
  { icon: UserPlus, title: 'Заведите учеников', text: 'Добавьте группы и индивидуальных — каждому создаётся личный кабинет со своим логином.' },
  { icon: LayoutGrid, title: 'Соберите курсы и ДЗ', text: 'В конструкторе — уроки, конспекты, тренажёр и домашки. Назначайте одним нажатием.' },
  { icon: LineChart, title: 'Проверяйте и следите', text: 'Домашки с проверкой части 2, журнал, аналитика и уведомления — всё в одном окне.' },
]

export default function LandingPage() {
  const { lang } = useLang()
  const t = useT()
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
        // Верхний отступ с safe-area: в установленном PWA шапка стояла
        // вплотную к вырезу. Спейсер ниже мерит её высоту по факту и
        // подстраивается сам.
        gap: 16, padding: `calc(env(safe-area-inset-top, 0px) + 14px) clamp(16px, 5vw, 56px) 14px`,
        background: 'color-mix(in srgb, var(--color-bg) 78%, transparent)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid color-mix(in srgb, var(--color-border) 70%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontWeight: 800, fontSize: 20, letterSpacing: -0.3 }}>
          <img src="/icon.svg" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
          Искра
        </div>
        <nav style={{ marginLeft: 28, display: 'flex', gap: 22 }} className="lp-nav">
          <a href="#how" style={navLink}>{t('Как работает')}</a>
          <a href="#features" style={navLink}>{t('Возможности')}</a>
          <a href="#modes" style={navLink}>{t('Задания')}</a>
          <a href="#tariffs" style={navLink}>{t('Тарифы')}</a>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggleBtn />
          <button onClick={() => setChooserOpen(true)} style={ghostBtn}>{t('Личный кабинет')}</button>
          <button onClick={() => openLead()} style={primaryBtn}>{t('Оставить заявку')}</button>
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
              <Sparkles size={15} /> {t('Платформа для репетиторов и учебных центров')}
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 style={{ fontSize: 'clamp(34px, 6.4vw, 64px)', lineHeight: 1.04, fontWeight: 800, letterSpacing: -1.4, margin: 0 }}>
              {t('Вся преподавательская')}<br />
              {t('операционка —')}{' '}
              <span style={{ background: `linear-gradient(120deg, ${ACCENT}, ${ACCENT_L})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                {t('в одном окне')}
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontSize: 'clamp(16px, 2.4vw, 20px)', color: 'var(--color-text-2)', maxWidth: 640, margin: '24px auto 0', lineHeight: 1.55 }}>
              {t('Курсы, домашки с проверкой части 2, журнал, аналитика и уведомления. Ученики занимаются, вы — управляете, а не тонете в чатах и таблицах.')}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34 }}>
              <button onClick={() => openLead()} style={{ ...primaryBtn, padding: '15px 30px', fontSize: 16, boxShadow: `0 12px 30px -10px ${ACCENT}` }}>
                <Send size={17} /> {t('Оставить заявку')}
              </button>
              <button onClick={() => setChooserOpen(true)} style={{ ...ghostBtn, padding: '15px 28px', fontSize: 16 }}>
                {t('Войти в кабинет')} <ArrowRight size={17} />
              </button>
            </div>
          </Reveal>
        </div>

        {/* mock-скриншот продукта */}
        <Reveal delay={0.2}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '54px auto 0' }}>
            <Suspense fallback={<div style={{ aspectRatio: '16 / 10', borderRadius: 18, background: 'var(--color-bg-2)' }} />}>
              <ProductMock />
            </Suspense>
          </div>
        </Reveal>
      </section>

      {/* ── Как это работает ── */}
      <section id="how" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>{t('Как это работает')}</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>{t('Три шага от «завёл учеников» до «вижу прогресс каждого».')}</p></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginTop: 40 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div style={{ position: 'relative', padding: '26px 24px', borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: '100%' }}>
                <div style={{ position: 'absolute', top: 22, right: 22, fontSize: 40, fontWeight: 800, lineHeight: 1, color: `color-mix(in srgb, ${ACCENT} 20%, transparent)` }}>{i + 1}</div>
                <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: '#fff', marginBottom: 16, boxShadow: `0 8px 20px -8px ${ACCENT}` }}>
                  <s.icon size={22} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 7 }}>{t(s.title)}</div>
                <div style={{ fontSize: 14.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{t(s.text)}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── УТП ── */}
      <section id="features" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>{t('Почему «Искра»')}</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>{t('Не ещё один чат и не Google-таблица — цельная рабочая среда преподавателя.')}</p></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, marginTop: 40 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <div className="lp-feature" style={{ padding: '24px 22px', borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: '100%', transition: 'transform .18s ease, border-color .18s ease' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`, color: ACCENT, marginBottom: 15 }}>
                  <f.icon size={22} />
                </div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 7 }}>{t(f.title)}</div>
                <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{t(f.text)}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Режимы заданий ── */}
      <section id="modes" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>{t('27 режимов заданий')}</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>
          {t('Языковой курс собирается не из «тестов с четырьмя вариантами». Слух, речь, письмо, сборка тапами и вспоминание по значению — каждый навык тренируется своим экраном.')}
        </p></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16, marginTop: 40 }}>
          {TASK_FAMILIES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <div className="lp-feature" style={{
                padding: '24px 22px', borderRadius: 18, background: 'var(--color-surface)',
                border: '1px solid var(--color-border)', height: '100%',
                transition: 'transform .18s ease, border-color .18s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: f.color }} />
                  <span style={{ fontSize: 16.5, fontWeight: 700 }}>{t(f.title)}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: f.color }}>{f.modes.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {f.modes.map(m => (
                    <span key={m} style={{
                      padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                      color: f.color, border: `1px solid color-mix(in srgb, ${f.color} 34%, transparent)`,
                      background: `color-mix(in srgb, ${f.color} 11%, transparent)`,
                    }}>{t(m)}</span>
                  ))}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.5, marginTop: 14 }}>{t(f.text)}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div style={{
            marginTop: 18, padding: '22px 24px', borderRadius: 18,
            border: `1px solid color-mix(in srgb, ${ACCENT} 30%, transparent)`,
            background: `color-mix(in srgb, ${ACCENT} 9%, var(--color-surface))`,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <Sparkles size={18} color={ACCENT} />
            <span style={{ fontSize: 15, lineHeight: 1.5 }}>
              {t('Лестница памяти: алфавит → слог → слово → фраза. Урок вводит не больше четырёх новых слов, каждое получает шесть касаний разными режимами, ошибки возвращаются очередью внутри того же урока.')}
            </span>
          </div>
        </Reveal>
      </section>

      {/* ── Тарифы ── */}
      <section id="tariffs" style={{ padding: 'clamp(64px, 9vw, 110px) clamp(16px, 5vw, 56px) 0', maxWidth: 1180, margin: '0 auto' }}>
        <Reveal><h2 style={sectionTitle}>{t('Тарифы')}</h2></Reveal>
        <Reveal delay={0.05}><p style={sectionSub}>{t('Оплата подключается вручную: оставьте заявку — мы активируем нужный тариф.')}</p></Reveal>
        {/* 4 основных тарифа сеткой + «Безлимит» широкой карточкой — иначе
            пятая карточка висит сиротой в ряду из четырёх */}
        <div className="lp-tariffs" style={{ marginTop: 46 }}>
          {gridTiers.map((p, i) => {
            const featured = p.code === 'pro'
            const limit = p.maxStudents == null ? 'Без лимита учеников' : `До ${p.maxStudents} учеников`
            const limitLabel = p.maxStudents == null ? t('Без лимита учеников') : `${t('До')} ${p.maxStudents} ${t('учеников')}`
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
                      {t('Популярный')}
                    </div>
                  )}
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{t(p.name)}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{t(p.tagline)}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '18px 0 3px' }}>
                    <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{planPrice(p, lang)}</span>
                    {p.priceRub > 0 && <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('/ мес')}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{limitLabel}</div>
                  <div style={{ height: 1, background: 'var(--color-border)', opacity: 0.7, margin: '18px 0' }} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {p.features.filter(f => f !== limit).map(f => <PlanFeature key={f} text={f} />)}
                  </ul>
                  <button onClick={() => openLead(`${p.name} · ${planPrice(p, lang)}`)}
                    style={{ ...(featured ? primaryBtn : outlineBtn), marginTop: 24, justifyContent: 'center', width: '100%', padding: '12px' }}>
                    {p.priceRub === 0 ? t('Начать бесплатно') : t('Оставить заявку')}
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
                <div style={{ fontSize: 17, fontWeight: 700 }}>{t(wideTier.name)}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{t(wideTier.tagline)}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{planPrice(wideTier, lang)}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('/ мес')}</span>
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
                {t('Оставить заявку')}
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
              <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, margin: 0, letterSpacing: -0.6 }}>{t('Готовы попробовать?')}</h2>
              <p style={{ fontSize: 16.5, opacity: 0.92, margin: '14px auto 28px', maxWidth: 500, lineHeight: 1.55 }}>
                {t('Оставьте контакт — расскажем, как начать, и поможем перенести учеников.')}
              </p>
              <button onClick={() => openLead()} style={{ ...onAccentBtn, padding: '15px 32px', fontSize: 16, boxShadow: '0 14px 34px -12px rgba(0,0,0,0.4)' }}>
                <Send size={17} /> {t('Оставить заявку')}
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer style={{ marginTop: 'clamp(64px, 9vw, 110px)', padding: '30px clamp(16px, 5vw, 56px) 44px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: 'var(--color-text-3)', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, color: 'var(--color-text-2)' }}>
          <img src="/icon.svg" alt="" width={22} height={22} style={{ borderRadius: 6 }} /> Искра
        </div>
        <span style={{ marginLeft: 'auto' }}>© Искра · {t('Платформа для преподавателей')}</span>
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

// строка возможности тарифа (сетка и широкая карточка «Безлимита»)
function PlanFeature({ text }: { text: string }) {
  const t = useT()
  return (
    <li style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.4 }}>
      <span style={{ flexShrink: 0, marginTop: 1, width: 18, height: 18, borderRadius: 999, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${ACCENT} 22%, transparent)` }}>
        <Check size={12} style={{ color: ACCENT }} />
      </span>
      {t(text)}
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
  const t = useT()
  const go = (hash: string) => { window.location.hash = hash; onClose() }
  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={420}>
        <ModalClose onClose={onClose} />
        <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>{t('Личный кабинет')}</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 22px' }}>{t('Кто вы?')}</p>
        <div style={{ display: 'grid', gap: 12 }}>
          <button onClick={() => go('#/login')} style={roleBtn}>
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${ACCENT_L} 20%, transparent)`, color: ACCENT_L }}><User size={22} /></div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Я ученик')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('Вход по логину и паролю от учителя')}</div>
            </div>
          </button>
          <button onClick={() => go('#/teacher')} style={roleBtn}>
            <div style={{ ...roleIcon, background: `color-mix(in srgb, ${ACCENT} 20%, transparent)`, color: ACCENT }}><GraduationCap size={22} /></div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t('Я преподаватель')}</div>
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
            <button onClick={onClose} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '13px' }}>{t('Готово')}</button>
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
                      <button key={p.code} type="button" onClick={() => setPlan(active ? '' : label)} style={{
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
              {error && <div style={{ fontSize: 13, color: '#E86A6A', fontWeight: 600 }}>{error}</div>}
              <button onClick={send} disabled={sending} style={{ ...primaryBtn, width: '100%', justifyContent: 'center', padding: '14px', fontSize: 16, opacity: sending ? 0.7 : 1, cursor: sending ? 'default' : 'pointer' }}>
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
    <button onClick={onClose} aria-label={t('Закрыть')} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
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
