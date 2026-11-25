// Витрина курсов Искры: #/catalog (список) и #/catalog/<slug> (карточка).
//
// Открывается без входа. Запись и покупка — окно записи (EnrollDialog):
// вход или регистрация, отдельное согласие на ПДн, затем catalog_enroll.
// После записи курс открывается обычным кабинетом ученика (#/).
// Концепты: design/course-marketplace/concepts.html. Правила: docs/platforms.md.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { PLATFORM } from '../../lib/platform'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useScrollFades } from '../../lib/useScrollFades'
import { getStudentSession, setStudentSession } from '../../lib/studentSession'
import { rememberCabinet } from '../../lib/cabinetChoice'
import { authErrorRu } from '../../lib/authErrors'
import {
  CATALOG_CATEGORIES, categoryLabel, coverBackground, fetchCatalog, fetchCatalogCourse, enrollInCourse,
  formatPrice, lessonsLabel, modulesLabel, catalogHref, checkedOnLabel, CATALOG_DEMO, type CatalogCourse, type CatalogItem, type EnrollResult,
} from '../../lib/catalog'
import FloatField from '../../components/FloatField'
import Switch from '../../components/Switch'
import FadeText from '../../components/FadeText'
import MobileSheet from '../../components/MobileSheet'
import { WindowSoftEdges } from '../../components/SoftEdge'
import {
  ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, FileText, LayoutGrid, Lock, LogIn, Search, ShoppingBag, Star, User as UserIcon, X,
} from '../../components/icons/appIcons'
import './catalog.css'

type Shell = 'pc' | 'iphone' | 'ipad' | 'android'
const SHELL: Shell = PLATFORM

function useAuthUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    void supabase.auth.getSession().then(({ data }) => { if (alive) setUser(data.session?.user ?? null) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])
  if (user && user.is_anonymous) return null
  return user
}

/** Открыть курс в кабинете ученика. Сессию ученика ставим, только если её
 *  нет или она чужая: ученик репетитора остаётся в своём кабинете, курс
 *  автора приходит туда же (трек собирает все карточки аккаунта). */
async function openCabinet(student: EnrollResult['student']) {
  const current = getStudentSession()
  let keep = false
  if (current) {
    const { data } = await supabase.from('students').select('auth_user_id').eq('id', current.id).maybeSingle()
    const { data: { user } } = await supabase.auth.getUser()
    keep = !!user && data?.auth_user_id === user.id
  }
  if (!keep) setStudentSession({ id: student.id, name: student.name, groupId: student.groupId })
  // Согласие на ПДн уже записано в базе при записи — не спрашивать второй раз.
  try { localStorage.setItem(`student_consent_v1_${keep && current ? current.id : student.id}`, '1') } catch { /* no-op */ }
  rememberCabinet('student')
  window.location.hash = '#/'
  window.location.reload()
}

function Cover({ tone, category, glyph, height, badge }: { tone: string; category: string; glyph: string; height: number; badge?: string }) {
  return (
    <div className="cat-cover" style={{ height, background: coverBackground(tone, category) }} aria-hidden>
      {glyph && <span className="cat-cover-glyph">{glyph}</span>}
      {badge && <span className="cat-cover-badge">{badge}</span>}
    </div>
  )
}

export default function CatalogPage({ slug }: { slug: string | null }) {
  const isDesktop = useIsDesktop()
  const user = useAuthUser()
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollFades(rootRef, true, '.cat-chips')
  const layout = isDesktop ? 'desktop' : 'mobile'
  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  return (
    <div ref={rootRef} className="cat-root" data-layout={layout} data-shell={SHELL}>
      {(SHELL === 'iphone' || SHELL === 'ipad') && <WindowSoftEdges />}
      {SHELL === 'pc' && <PcTopBar user={user} />}
      {slug ? <CourseView slug={slug} user={user} /> : <ListView user={user} />}
    </div>
  )
}

function cabinetHref(user: User | null | undefined) {
  if (!user) return '#/login'
  return getStudentSession() ? '#/' : (user.app_metadata?.role === 'teacher' || user.app_metadata?.role === 'admin' ? '#/teacher' : '#/')
}

function PcTopBar({ user }: { user: User | null | undefined }) {
  return (
    <header className="cat-topbar">
      <div className="cat-topbar-in">
        <a className="cat-brand" href="#/landing"><span className="cat-brand-dot" />Искра</a>
        <a className="cat-nav-link" href={catalogHref()} aria-current="page">Каталог курсов</a>
        <span style={{ flex: 1 }} />
        {user
          ? <a className="cat-btn cat-btn-sec cat-btn-s" href={cabinetHref(user)}><UserIcon size={16} />Мой кабинет</a>
          : <a className="cat-btn cat-btn-sec cat-btn-s" href="#/login"><LogIn size={16} />Войти</a>}
      </div>
    </header>
  )
}

function IpadCapsule({ current, main }: { current: 'catalog'; main?: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean } }) {
  const user = useAuthUser()
  return (
    <nav className="cat-capsule" aria-label="Навигация">
      <div className="cat-capsule-body">
        <a className="cat-cell" href={catalogHref()} aria-current={current === 'catalog' ? 'page' : undefined} aria-label="Каталог"><LayoutGrid size={26} /></a>
        <a className="cat-cell" href={cabinetHref(user)} aria-label={user ? 'Мой кабинет' : 'Войти'}>{user ? <UserIcon size={26} /> : <LogIn size={26} />}</a>
      </div>
      {main && <button type="button" className="cat-cap-main" onClick={main.onClick} disabled={main.disabled} aria-label={main.label}>{main.icon}</button>}
    </nav>
  )
}

// ── Список ─────────────────────────────────────────────────────────────────

function ListView({ user }: { user: User | null | undefined }) {
  const [items, setItems] = useState<CatalogItem[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let alive = true
    fetchCatalog().then(list => { if (alive) setItems(list) }).catch(() => { if (alive) setError('Каталог не загрузился.\nПроверьте связь и обновите страницу.') })
    return () => { alive = false }
  }, [])
  const present = useMemo(() => new Set((items ?? []).map(i => i.category)), [items])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items ?? []).filter(i => (!category || i.category === category)
      && (!q || `${i.title} ${i.subtitle} ${i.author} ${categoryLabel(i.category)}`.toLowerCase().includes(q)))
  }, [items, query, category])
  const hero = !query && !category ? filtered[0] : undefined
  const rest = hero ? filtered.slice(1) : filtered
  const chips = [{ id: '', label: 'Все' }, ...CATALOG_CATEGORIES.filter(c => present.has(c.id))]

  const search = (
    <label className="cat-search">
      <Search size={18} />
      <input ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Курс, тема или автор" aria-label="Поиск курса" />
    </label>
  )
  return (
    <>
      <main className="cat-wrap" style={{ paddingTop: SHELL === 'pc' ? 28 : undefined }}>
        {SHELL === 'pc' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 className="cat-h1" style={{ flex: 1 }}>Каталог курсов</h1>
            {search}
          </div>
        ) : (
          <>
            <div className="cat-mhead">
              <h1 className="cat-mtitle">Каталог</h1>
              {SHELL !== 'ipad' && user !== undefined && (
                <a className="cat-circle" href={cabinetHref(user)} aria-label={user ? 'Мой кабинет' : 'Войти'}>{user ? <UserIcon size={20} /> : <LogIn size={20} />}</a>
              )}
            </div>
            {search}
          </>
        )}
        {chips.length > 2 && (
          <div className="cat-chips" role="toolbar" aria-label="Категории">
            {chips.map(c => (
              <button key={c.id || 'all'} type="button" className="cat-chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</button>
            ))}
          </div>
        )}
        {error && <p className="cat-error" style={{ whiteSpace: 'pre-line' }}>{error}</p>}
        {!items && !error && (
          <div className="cat-grid" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="cat-skel" style={{ height: 220 }} />)}</div>
        )}
        {items && items.length === 0 && (
          <div className="cat-panel" style={{ alignItems: 'flex-start' }}>
            <div className="cat-h2">Курсы скоро появятся</div>
            <p className="cat-sub">Авторы готовят первые курсы. Загляните позже.</p>
          </div>
        )}
        {items && items.length > 0 && filtered.length === 0 && (
          <p className="cat-sub">Ничего не нашлось. Попробуйте другое слово или категорию.</p>
        )}
        {hero && <HeroCard item={hero} />}
        {rest.length > 0 && <div className="cat-grid">{rest.map(i => <CourseCard key={i.slug} item={i} />)}</div>}
      </main>
      {SHELL === 'ipad' && <IpadCapsule current="catalog" main={{ icon: <Search size={28} />, label: 'Поиск', onClick: () => searchRef.current?.focus() }} />}
    </>
  )
}

function HeroCard({ item }: { item: CatalogItem }) {
  return (
    <a className="cat-hero" href={catalogHref(item.slug)}>
      <div className="cat-hero-text">
        <span className="cat-badge cat-badge-green">{categoryLabel(item.category)}</span>
        <h2 className="cat-h1" style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>{item.title}</h2>
        {item.subtitle && <p className="cat-sub">{item.subtitle}</p>}
        <div className="cat-card-meta">
          {item.module_count > 0 && <span>{modulesLabel(item.module_count)}</span>}
          {item.lesson_count > 0 && <span>{lessonsLabel(item.lesson_count)}</span>}
          {item.has_preview && item.price_kopecks > 0 && <span>первый модуль бесплатно</span>}
        </div>
        <div className="cat-price" style={{ fontSize: 20 }}>{formatPrice(item.price_kopecks)}</div>
      </div>
      <Cover tone={item.cover_tone} category={item.category} glyph={item.cover_glyph} height={240} />
    </a>
  )
}

function CourseCard({ item }: { item: CatalogItem }) {
  return (
    <a className="cat-card" href={catalogHref(item.slug)}>
      <Cover tone={item.cover_tone} category={item.category} glyph={item.cover_glyph} height={124} badge={item.has_preview && item.price_kopecks > 0 ? 'Есть пробный модуль' : undefined} />
      <div className="cat-card-body">
        <FadeText lines={2} className="cat-card-title">{item.title}</FadeText>
        <FadeText className="cat-muted">{item.author}</FadeText>
        <div className="cat-card-meta">
          {item.lesson_count > 0 && <span>{lessonsLabel(item.lesson_count)}</span>}
          <span style={{ flex: 1 }} />
          <span className="cat-price" style={{ fontSize: 15 }}>{formatPrice(item.price_kopecks)}</span>
        </div>
      </div>
    </a>
  )
}

// ── Карточка курса ─────────────────────────────────────────────────────────

type Intent = { mode: 'preview' | 'full' } | null

function CourseView({ slug, user }: { slug: string; user: User | null | undefined }) {
  const [course, setCourse] = useState<CatalogCourse | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [intent, setIntent] = useState<Intent>(null)
  const [openModule, setOpenModule] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  // Доступ уже есть: повторная запись идемпотентна и возвращает карточку ученика.
  const go = async (mode: 'preview' | 'full') => {
    setActionError('')
    try { await openCabinet((await enrollInCourse(slug, mode)).student) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Не получилось открыть курс.') }
  }
  const reload = () => fetchCatalogCourse(slug).then(setCourse).catch(() => setError('Курс не загрузился.\nПроверьте связь и обновите страницу.'))
  // Вход меняет ответ (доступ, заявка) — перечитываем при смене пользователя.
  useEffect(() => { void reload() }, [slug, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (course?.modules[0]) setOpenModule(m => m ?? course.modules[0].id) }, [course])

  if (error) return <main className="cat-wrap" style={{ paddingTop: 40 }}><p className="cat-error" style={{ whiteSpace: 'pre-line' }}>{error}</p></main>
  if (course === undefined) return <main className="cat-wrap" style={{ paddingTop: 40 }}><div className="cat-skel" style={{ height: 320 }} /></main>
  if (course === null) return (
    <main className="cat-wrap" style={{ paddingTop: 40 }}>
      <div className="cat-panel"><div className="cat-h2">Курс не найден</div><p className="cat-sub">Его сняли с витрины или ссылка неверная.</p>
        <a className="cat-btn cat-btn-sec" href={catalogHref()} style={{ alignSelf: 'flex-start' }}>В каталог</a></div>
    </main>
  )

  const paid = course.price_kopecks > 0
  const hasPreview = course.modules.some(m => m.preview)
  const access = course.viewer.access
  const requested = course.viewer.order_status === 'requested' || course.viewer.order_status === 'pending'
  const lessonTotal = course.modules.reduce((n, m) => n + m.lessons.length, 0)
  const cta = primaryAction(course, setIntent, go)
  const second = !course.is_owner && paid && hasPreview && access === 'none'
    ? { label: 'Попробовать бесплатно', onClick: () => setIntent({ mode: 'preview' }) }
    : !course.is_owner && access === 'preview' ? { label: 'Продолжить пробный модуль', onClick: () => void go('preview') } : null
  const outcomes = course.outcomes.filter(Boolean)

  // На телефоне цена и главная кнопка — в нижней плашке, на айпаде главная
  // кнопка — в капсуле (docs/platforms.md §1.1): здесь их не дублируем.
  const phone = SHELL === 'iphone' || SHELL === 'android'
  const buyBox = (
    <div className="cat-panel">
      {(!phone || access !== 'none') && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!phone && <span className="cat-price-big">{formatPrice(course.price_kopecks)}</span>}
        <span style={{ flex: 1 }} />
        {access === 'full' && <span className="cat-badge cat-badge-green">Курс открыт</span>}
        {access === 'preview' && <span className="cat-badge cat-badge-acc">Пробный доступ</span>}
      </div>}
      {(SHELL === 'pc' || course.is_owner) && <button type="button" className="cat-btn cat-btn-pri" onClick={cta.onClick} disabled={cta.disabled}>{cta.label}</button>}
      {second && <button type="button" className="cat-btn cat-btn-sec" onClick={second.onClick}>{second.label}</button>}
      {actionError && <p className="cat-error" style={{ margin: 0, whiteSpace: 'pre-line' }}>{actionError}</p>}
      {requested && access !== 'full' && <p className="cat-muted" style={{ margin: 0 }}>Заявка отправлена автору. Курс откроется полностью после оплаты.</p>}
      <div className="cat-muted" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BookOpen size={16} />{modulesLabel(course.modules.length)}, {lessonsLabel(lessonTotal)}</span>
        {course.certificate_note && <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Star size={16} />{course.certificate_note}</span>}
      </div>
    </div>
  )

  return (
    <>
      <main className="cat-wrap" style={{ paddingTop: SHELL === 'pc' ? 24 : undefined }}>
        {SHELL !== 'pc' && (
          <div className="cat-mhead">
            {SHELL !== 'ipad' && <a className="cat-circle" href={catalogHref()} aria-label="Назад в каталог"><ArrowLeft size={22} /></a>}
            <span style={{ flex: 1 }} />
          </div>
        )}
        {SHELL === 'pc' && (
          <nav className="cat-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <a href={catalogHref()} style={{ color: 'inherit' }}>Каталог</a><ChevronRight size={14} />{categoryLabel(course.category)}
          </nav>
        )}
        {course.status !== 'published' && (
          <div className="cat-banner">Предпросмотр. Курс видите только вы и модератор: {course.status === 'review' ? 'он на проверке' : course.status === 'rejected' ? 'модератор вернул его на доработку' : 'он ещё не отправлен на проверку'}.</div>
        )}
        <div className="cat-course">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            {SHELL !== 'pc' && <Cover tone={course.cover_tone} category={course.category} glyph={course.cover_glyph} height={SHELL === 'ipad' ? 200 : 180} />}
            <h1 className="cat-h1" style={{ fontSize: SHELL === 'pc' ? 38 : undefined }}>{course.title}</h1>
            {course.subtitle && <p className="cat-sub" style={{ fontSize: SHELL === 'pc' ? 18 : 16 }}>{course.subtitle}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span className="cat-badge cat-badge-mut">{categoryLabel(course.category)}</span>
              {course.level_label && <span className="cat-badge cat-badge-mut">{course.level_label}</span>}
              {course.duration_label && <span className="cat-badge cat-badge-mut">{course.duration_label}</span>}
              {course.content_checked_on && <span className="cat-badge cat-badge-green">Проверено на {checkedOnLabel(course.content_checked_on)}</span>}
              <span className="cat-muted">Автор: {course.author}</span>
            </div>
            {course.author_note && <p className="cat-muted" style={{ margin: 0 }}>{course.author_note}</p>}
            {SHELL !== 'pc' && SHELL !== 'ipad' && buyBox}
            {outcomes.length > 0 && (
              <section className="cat-panel">
                <h2 className="cat-h2" style={{ fontSize: 17 }}>Чему вы научитесь</h2>
                <div className="cat-outcomes">{outcomes.map(o => <div key={o} className="cat-check-row"><Check size={18} />{o}</div>)}</div>
              </section>
            )}
            {course.description && (
              <section className="cat-panel">
                <h2 className="cat-h2" style={{ fontSize: 17 }}>О курсе</h2>
                <p className="cat-prose">{course.description}</p>
              </section>
            )}
            <section className="cat-panel" style={{ paddingTop: 10, paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <h2 className="cat-h2" style={{ fontSize: 17, flex: 1 }}>Программа</h2>
                <span className="cat-muted">{modulesLabel(course.modules.length)} · {lessonsLabel(lessonTotal)}</span>
              </div>
              <div>
                {course.modules.map((m, i) => (
                  <div key={m.id} className="cat-module">
                    <button type="button" className="cat-module-head" aria-expanded={openModule === m.id} onClick={() => setOpenModule(openModule === m.id ? null : m.id)}>
                      <span className="cat-module-num">{i + 1}</span>
                      <FadeText className="cat-module-title">{m.label || `Модуль ${i + 1}`}</FadeText>
                      <span className="cat-muted" style={{ flexShrink: 0 }}>{lessonsLabel(m.lessons.length)}</span>
                      {m.preview && paid ? <span className="cat-badge cat-badge-green" style={{ flexShrink: 0 }}>Бесплатно</span>
                        : paid && access !== 'full' ? <Lock size={16} style={{ flexShrink: 0, color: 'var(--color-text-3)' }} /> : null}
                      <ChevronDown size={18} style={{ flexShrink: 0, transform: openModule === m.id ? 'rotate(180deg)' : undefined, transition: 'transform .16s' }} />
                    </button>
                    {openModule === m.id && m.lessons.length > 0 && (
                      <ol className="cat-module-lessons">{m.lessons.map((l, k) => <li key={k} style={{ display: 'flex', gap: 8 }}><FileText size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>{l}</span></li>)}</ol>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {course.audience && (
              <section className="cat-panel">
                <h2 className="cat-h2" style={{ fontSize: 17 }}>Для кого</h2>
                <p className="cat-prose">{course.audience}</p>
              </section>
            )}
            <p className="cat-muted" style={{ margin: 0, lineHeight: 1.5 }}>
              Записываясь, вы принимаете <a href="/offer.html" target="_blank" rel="noopener" style={{ color: 'var(--loop-ink)' }}>условия</a> и
              {' '}<a href="/consent.html" target="_blank" rel="noopener" style={{ color: 'var(--loop-ink)' }}>согласие на обработку персональных данных</a>.
            </p>
          </div>
          {(SHELL === 'pc' || SHELL === 'ipad') && (
            <aside className="cat-aside">
              {SHELL === 'pc' && <Cover tone={course.cover_tone} category={course.category} glyph={course.cover_glyph} height={200} />}
              {buyBox}
            </aside>
          )}
        </div>
      </main>

      {(SHELL === 'iphone' || SHELL === 'android') && !course.is_owner && (
        <div className="cat-buybar">
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span className="cat-price" style={{ fontSize: 20 }}>{formatPrice(course.price_kopecks)}</span>
            <FadeText className="cat-muted" style={{ fontSize: 12 }}>{access === 'full' ? 'курс открыт' : access === 'preview' ? 'пробный доступ' : paid && hasPreview ? 'первый модуль бесплатно' : 'доступ навсегда'}</FadeText>
          </div>
          <button type="button" className="cat-btn cat-btn-pri" onClick={cta.onClick} disabled={cta.disabled}>{cta.short}</button>
        </div>
      )}
      {SHELL === 'ipad' && <IpadCapsule current="catalog" main={course.is_owner ? undefined : { icon: access === 'full' ? <BookOpen size={28} /> : <ShoppingBag size={28} />, label: cta.label, onClick: cta.onClick, disabled: cta.disabled }} />}

      {intent && <EnrollDialog course={course} mode={intent.mode} user={user} onClose={() => setIntent(null)} onRequested={() => { setIntent(null); void reload() }} />}
    </>
  )
}

function primaryAction(course: CatalogCourse, setIntent: (i: Intent) => void, go: (mode: 'preview' | 'full') => Promise<void>) {
  const access = course.viewer.access
  const requested = course.viewer.order_status === 'requested' || course.viewer.order_status === 'pending'
  if (course.is_owner) return { label: 'Это ваш курс', short: 'Ваш курс', onClick: () => { window.location.hash = '#/teacher/storefront' }, disabled: false }
  if (access === 'full') return { label: 'Перейти к курсу', short: 'К курсу', onClick: () => void go('full'), disabled: false }
  if (course.price_kopecks === 0) return { label: 'Начать бесплатно', short: 'Начать', onClick: () => setIntent({ mode: 'full' }), disabled: false }
  if (requested) return { label: 'Заявка отправлена', short: 'Заявка отправлена', onClick: () => undefined, disabled: true }
  return { label: `Купить за ${formatPrice(course.price_kopecks)}`, short: 'Купить', onClick: () => setIntent({ mode: 'full' }), disabled: false }
}

// ── Окно записи ────────────────────────────────────────────────────────────

function EnrollDialog({ course, mode, user, onClose, onRequested }: {
  course: CatalogCourse; mode: 'preview' | 'full'; user: User | null | undefined; onClose: () => void; onRequested: () => void
}) {
  const paidOrder = mode === 'full' && course.price_kopecks > 0
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pd, setPd] = useState(false)
  const [offer, setOffer] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<EnrollResult | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const needAuth = !user && !CATALOG_DEMO
  const authValid = !needAuth || (email.includes('@') && password.length >= 6 && (authMode === 'signin' || name.trim().length > 0))
  const canSubmit = authValid && pd && (!paidOrder || offer) && !busy

  async function submit() {
    if (!canSubmit) return
    setBusy(true); setError('')
    try {
      if (needAuth) {
        if (authMode === 'signup') {
          const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } })
          if (e) throw new Error(/registered|already/i.test(e.message) ? 'Этот email уже зарегистрирован.\nВойдите с паролем.' : authErrorRu(e, 'Не удалось зарегистрироваться.'))
          if (!data.session) throw new Error('Аккаунт создан, но вход не выполнен.\nВойдите с паролем.')
        } else {
          const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
          if (e) throw new Error(authErrorRu(e, 'Не удалось войти.'))
        }
      }
      const result = await enrollInCourse(course.slug, mode, { name: name.trim() || undefined, note: note.trim() || undefined, offer: paidOrder })
      if (CATALOG_DEMO) { setDone({ ...result, order_status: paidOrder ? 'requested' : null }); return }
      if (result.access !== 'none' && !(paidOrder && result.order_status === 'requested')) { await openCabinet(result.student); return }
      setDone(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось. Попробуйте ещё раз.')
      if (/Войдите с паролем/.test(String((e as Error)?.message))) setAuthMode('signin')
    } finally { setBusy(false) }
  }

  const title = done ? 'Заявка отправлена' : paidOrder ? 'Покупка курса' : mode === 'preview' ? 'Пробный модуль' : 'Запись на курс'
  const body = done ? (
    <>
      <p className="cat-sub">Автор получил заявку и свяжется с вами по почте, чтобы договориться об оплате. После оплаты курс откроется полностью.</p>
      {done.access === 'preview' && <button type="button" className="cat-btn cat-btn-pri" onClick={() => void openCabinet(done.student)}>Начать пробный модуль</button>}
      <button type="button" className="cat-btn cat-btn-sec" onClick={onRequested}>Готово</button>
    </>
  ) : (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 56, flexShrink: 0 }}><Cover tone={course.cover_tone} category={course.category} glyph="" height={56} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <FadeText lines={2} style={{ fontWeight: 700 }}>{course.title}</FadeText>
          <span className="cat-muted">{mode === 'preview' ? 'Первый модуль бесплатно' : course.price_kopecks ? 'Доступ навсегда' : 'Бесплатный курс'}</span>
        </div>
        {paidOrder && <span className="cat-price" style={{ fontSize: 18 }}>{formatPrice(course.price_kopecks)}</span>}
      </div>
      {needAuth && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {authMode === 'signup' && <FloatField label="Как вас зовут" value={name} onChange={setName} autoComplete="name" />}
          <FloatField label="Почта" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} />
          <FloatField label="Пароль" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={setPassword}
            hint={authMode === 'signup' ? 'Не короче 6 символов' : undefined} />
          <button type="button" className="cat-linkbtn" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setError('') }}>
            {authMode === 'signup' ? 'У меня уже есть аккаунт' : 'Создать новый аккаунт'}
          </button>
        </div>
      )}
      {paidOrder && (
        <>
          <div className="cat-banner" style={{ background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--color-text-2)' }}>
            Онлайн-оплата подключается. Сейчас вы оставляете заявку, автор пришлёт реквизиты на почту. {course.modules.some(m => m.preview) ? 'Пробный модуль откроется сразу.' : ''}
          </div>
          <FloatField label="Комментарий автору (необязательно)" multiline rows={2} value={note} onChange={setNote} maxLength={1000} />
        </>
      )}
      <label className="cat-consent"><Switch checked={pd} onChange={setPd} label="Согласие на обработку персональных данных" />
        <span>Даю <a href="/consent.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a></span></label>
      {paidOrder && (
        <label className="cat-consent"><Switch checked={offer} onChange={setOffer} label="Принимаю условия" />
          <span>Принимаю <a href="/offer.html" target="_blank" rel="noopener">условия покупки и возврата</a></span></label>
      )}
      {error && <p className="cat-error" style={{ whiteSpace: 'pre-line', margin: 0 }}>{error}</p>}
      <button type="button" className="cat-btn cat-btn-pri" style={{ height: 56 }} disabled={!canSubmit} onClick={() => void submit()}>
        {busy ? 'Секунду…' : paidOrder ? 'Отправить заявку' : 'Начать учиться'}
      </button>
    </>
  )

  if (SHELL === 'iphone' || SHELL === 'android') {
    return <MobileSheet open onClose={onClose} title={title}><div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{body}</div></MobileSheet>
  }
  return (
    <div className="cat-scrim" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="cat-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="cat-dialog-head">
          <h2 className="cat-h2" style={{ flex: 1 }}>{title}</h2>
          <button type="button" className="cat-x" onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
        </div>
        {body}
      </div>
    </div>
  )
}
