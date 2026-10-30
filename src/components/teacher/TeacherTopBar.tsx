import { motion, AnimatePresence } from 'framer-motion'
import { dropdownSurface } from '../../lib/dropdownStyle'
import CountBadge from '../CountBadge'
import {
  Home, Users, ClipboardList, BookOpen, Layers, GraduationCap, Wallet,
  ChevronLeft, ChevronRight,
  LayoutGrid, UserPlus, CheckSquare, LayoutDashboard, LogOut, Moon, Sun,
  CreditCard, UserCircle, Shield, MessageSquarePlus, MessageCircle, Globe, Zap,
  Flower2, Cat, Rabbit, Bird, Fish, Bug, Rocket, Star,
  CalendarDays, type LucideIcon,
} from 'lucide-react'
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TeacherBook } from '../../lib/teacherAvatarIcon'
import { useTeacher, type TeacherPage } from '../../store/teacherStore'
import { useTeacherAccess, type TeacherTabId } from '../../lib/teacherAccess'
import { useHomework, useHardSubmissions } from '../../lib/useHomework'
import { useJournalPending } from '../../lib/useGroups'
import ViewAsBanner from './ViewAsBanner'
import { lockSnap, lockRelease, springTopbar } from '../../lib/feedback'
import { usePersistentState, clearDrafts } from '../../lib/useDraft'
import CreateTaskModal from './CreateTaskModal'
import WidgetsModal from './WidgetsModal'
import FeedbackModal from '../FeedbackModal'
import AppVersionRow from '../AppVersionRow'
import { supabase } from '../../lib/supabase'
import { trackNow } from '../../lib/analytics'
import { useTheme } from '../../store/themeStore'
import NotificationBell from '../NotificationBell'
import { PILL_WIDTH } from './TeacherCompactPill'
import NotificationPopup from '../NotificationPopup'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useT, useLang, type Lang, useTc } from '../../lib/i18n'
import { fetchMyPlan, PLAN_TIERS, type MyPlan } from '../../lib/plan'
import { getAuthUser } from '../../lib/owner'
import { AvatarPhotoFill } from '../AvatarPhoto'
import { useDashboard } from '../../store/dashboardStore'

const navItems: { id: TeacherPage; label: string; icon: React.ElementType }[] = [
  { id: 'home',        label: 'Главная',     icon: Home },
  { id: 'groups',      label: 'Группы',      icon: Users },
  { id: 'homework',    label: 'ДЗ',          icon: ClipboardList },
  { id: 'gradebook',   label: 'Журнал',      icon: BookOpen },
  { id: 'constructor', label: 'Конструктор', icon: Layers },
  { id: 'finances',    label: 'Финансы',     icon: Wallet },
]

type AvatarOption = { id: string; Icon: LucideIcon; gradient: string }
const AVATARS: AvatarOption[] = [
  { id: 'teacher', Icon: TeacherBook, gradient: 'linear-gradient(135deg, hsl(228 78% 70%), hsl(248 64% 52%) 60%, hsl(262 60% 42%))' },
  { id: 'flower', Icon: Flower2, gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))' },
  { id: 'cat',    Icon: Cat,    gradient: 'linear-gradient(135deg, hsl(28 92% 68%), hsl(14 84% 56%))' },
  { id: 'rabbit', Icon: Rabbit, gradient: 'linear-gradient(135deg, hsl(330 88% 74%), hsl(345 76% 60%))' },
  { id: 'bird',   Icon: Bird,   gradient: 'linear-gradient(135deg, hsl(205 92% 70%), hsl(220 80% 58%))' },
  { id: 'fish',   Icon: Fish,   gradient: 'linear-gradient(135deg, hsl(180 72% 62%), hsl(196 78% 50%))' },
  { id: 'bug',    Icon: Bug,    gradient: 'linear-gradient(135deg, hsl(2 82% 70%), hsl(354 74% 56%))' },
  { id: 'rocket', Icon: Rocket, gradient: 'linear-gradient(135deg, hsl(46 96% 66%), hsl(36 92% 54%))' },
  { id: 'star',   Icon: Star,   gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))' },
]

const EASE = [0.32, 0.72, 0, 1] as const
// Правая пилюля-сводка в тесноте: обычный нижний предел и крайний (профиль уже кружок).
const PILL_SOFT_MIN = 272
const PILL_MIN = 200
// Последняя ступень тесноты: вкладки остаются со словами, но с меньшими полями.
const NAV_PAD = 16
const NAV_PAD_TIGHT = 10
const transition = { duration: 0.38, ease: EASE }

type QuickAction = { type?: 'action'; icon: LucideIcon; label: string; sub: string; color: string; bg: string; page?: TeacherPage; action?: string }
type QuickSeparator = { type: 'separator' }
type QuickItem = QuickAction | QuickSeparator

const quickActions: QuickItem[] = [
  { icon: BookOpen,      label: 'Создать курс',      sub: 'новый курс',       color: 'var(--color-green-text)', bg: 'var(--color-green-soft)', action: 'create-course' },
  { icon: GraduationCap, label: 'Создать урок',      sub: 'новый урок',       color: 'var(--color-green-text)', bg: 'var(--color-green-soft)', page: 'lesson-editor' },
  { icon: ClipboardList, label: 'Создать домашку',   sub: 'группе / лично',   color: 'var(--color-green-text)', bg: 'var(--color-green-soft)', page: 'homework-create' },
  { icon: CheckSquare,   label: 'Создать задачу',    sub: 'встреча, урок…',   color: '#4B8EF1', bg: 'rgba(75,142,241,0.13)', action: 'create-task' },
  { type: 'separator' },
  { icon: Users,         label: 'Создать группу',    sub: 'новая группа',     color: 'var(--color-purple-text)', bg: 'var(--color-purple-soft)', action: 'create-group' },
  { icon: UserPlus,      label: 'Добавить студента', sub: 'в группу / 1:1',   color: 'var(--color-purple-text)', bg: 'var(--color-purple-soft)', action: 'add-student' },
]

export default function TeacherTopBar() {
  const t = useT()
  const { tc, tn } = useTc()
  const [collapsed, setCollapsed]     = useState(false)
  const [addOpen, setAddOpen]         = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const teacherBarRef = useRef<HTMLDivElement>(null)
  const snapMountRef  = useRef(false)
  const { homework } = useHomework()
  const { submissions: hardSubs } = useHardSubmissions()
  const pendingHwCount = homework
    .filter(hw => hw.status === 'active')
    .reduce((acc, hw) => acc + Math.max(0, hw.submittedCount - hw.reviewedCount), 0)
    + hardSubs.filter(s => s.status === 'submitted').length
  const pendingJournals = useJournalPending(null)
  const pendingJournalCount = pendingJournals.length
  const syncJournalNotifs = useNotificationsStore(s => s.syncJournalNotifs)
  useEffect(() => {
    syncJournalNotifs(pendingJournals.map(p => ({
      id: p.scheduleId,
      title: `${t('Журнал')} — ${p.scopeName}`,
      body: `${p.date.slice(5).replace('-', '.')} · ${tc(p.title)}`,
    })))
  }, [pendingJournals, syncJournalNotifs])

  // Persisted so an open modal (and its draft) re-opens after a page reload.
  const [taskModalOpen, setTaskModalOpen] = usePersistentState('createTask.open', false)
  const [widgetsOpen, setWidgetsOpen]     = useState(false)
  const [feedbackOpen, setFeedbackOpen]   = useState(false)
  const [notifOpen, setNotifOpen]         = useState(false)

  const [addAnchor, setAddAnchor]         = useState<{ top: number; left: number } | null>(null)
  const [profileAnchor, setProfileAnchor] = useState<{ top: number; left: number } | null>(null)

  const bellRef        = useRef<HTMLDivElement>(null)
  const addBtnRef      = useRef<HTMLButtonElement>(null)
  const dropRef        = useRef<HTMLDivElement>(null)
  const profileBtnRef  = useRef<HTMLDivElement>(null)
  const profileDropRef = useRef<HTMLDivElement>(null)

  const activePage             = useTeacher(s => s.activePage)
  const setActivePage          = useTeacher(s => s.setActivePage)
  const addTask                = useTeacher(s => s.addTask)
  const openConstructor        = useTeacher(s => s.openConstructor)
  const triggerConstructorBack = useTeacher(s => s.triggerConstructorBack)
  const { dark, toggle: toggleTheme } = useTheme()
  const { lang, setLang } = useLang()

  // Admin-configured access — hide revoked tabs & quick actions.
  const canTab = useTeacherAccess(s => s.canTab)
  const canPage = useTeacherAccess(s => s.canPage)
  // Subscribe to the raw lists so this bar re-renders when access loads/changes
  // (canTab/canPage are stable method refs and wouldn't trigger on their own).
  useTeacherAccess(s => s.hiddenTabs)
const visibleNav = navItems.filter(item => canTab(item.id as TeacherTabId))
  const quickAllowed = (a: QuickAction): boolean => {
    if (a.page) return canPage(a.page)
    switch (a.action) {
      case 'create-course': return canTab('constructor')
      case 'create-group':
      case 'add-student':   return canTab('groups')
      case 'create-task':   return canTab('home')
      default:              return true
    }
  }
  // Keep only allowed actions, then drop separators left without neighbours.
  const keptQuick = quickActions.filter(it => it.type === 'separator' || quickAllowed(it as QuickAction))
  const visibleQuick = keptQuick.filter((it, idx) => {
    if (it.type !== 'separator') return true
    const before = keptQuick.slice(0, idx).some(x => x.type !== 'separator')
    const after  = keptQuick.slice(idx + 1).some(x => x.type !== 'separator')
    return before && after
  })

  const [teacherName,  setTeacherName]  = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [teacherRole,  setTeacherRole]  = useState<'admin' | 'teacher'>('teacher')
  const [avatarId,     setAvatarId]     = useState('flower')
  const [avatarPath,   setAvatarPath]   = useState<string | null>(null)
  useEffect(() => {
    getAuthUser().then(u => {
      if (!u) return
      const name = u.user_metadata?.name ?? u.email?.split('@')[0] ?? ''
      const role: 'admin' | 'teacher' = u.app_metadata?.role === 'admin' ? 'admin' : 'teacher'
      setTeacherName(name)
      setTeacherEmail(u.email ?? '')
      setTeacherRole(role)
      setAvatarId(u.user_metadata?.avatarId ?? 'flower')
      setAvatarPath(u.user_metadata?.avatarPath ?? null)
    })
    // Профиль правят на соседней странице — бар подхватывает имя, иконку и
    // фото сразу, без перезагрузки.
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt !== 'USER_UPDATED' || !session?.user) return
      const m = session.user.user_metadata ?? {}
      if (m.name) setTeacherName(m.name)
      setAvatarId(m.avatarId ?? 'flower')
      setAvatarPath(m.avatarPath ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const [myPlan, setMyPlan] = useState<MyPlan | null>(null)
  useEffect(() => { fetchMyPlan().then(setMyPlan) }, [])

  const selectedAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0]
  const AvatarIcon = selectedAvatar.Icon

  // Края центрованного бара — закреплённое название страницы (редактор теста)
  // обрезается у левого края, а не заезжает под бар. Бар при сворачивании
  // меняет ширину и съезжает — ловим кадры анимации ResizeObserver'ом.
  const headerDocked = useTeacher(s => s.headerDocked)
  const isHome = activePage === 'home'

  const setTopBarBox = useDashboard(s => s.setTopBarBox)
  useLayoutEffect(() => {
    const apply = () => {
      const bar = teacherBarRef.current
      if (!bar) return
      const r = bar.getBoundingClientRect()
      setTopBarBox({ left: r.left, right: r.right })
    }
    apply()
    const settle = setTimeout(apply, 360)
    const ro = new ResizeObserver(apply)
    if (teacherBarRef.current) ro.observe(teacherBarRef.current)
    window.addEventListener('resize', apply)
    return () => { clearTimeout(settle); ro.disconnect(); window.removeEventListener('resize', apply) }
  }, [setTopBarBox, collapsed])

  // Тесно (пилюля справа не влезает) → сжимаются профиль и пилюля, навигацию
  // не трогаем — её сворачивает только шеврон. Ступени профиля: имя + роль →
  // одно «Учитель» → кружок аватарки → кружок и вкладки с узкими полями. На
  // каждой ступени пилюля сперва ужимается до PILL_SOFT_MIN и только потом бар
  // переходит на следующую; на последней пилюля может уйти до PILL_MIN.
  const [squeeze, setSqueeze] = useState<0 | 1 | 2 | 3>(0)
  const setTopPillW = useDashboard(s => s.setTopPillW)
  const profileTextRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const bar = teacherBarRef.current
    const row = bar?.closest('.topbar-row') as HTMLElement | null
    if (!bar || !row) return
    const slot = row.lastElementChild as HTMLElement | null
    const fit = () => {
      const cs = getComputedStyle(row)
      const inner = row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const slotPad = slot ? parseFloat(getComputedStyle(slot).paddingLeft) : 0
      const pill = slot?.firstElementChild as HTMLElement | null
      // Резиновая только сводка; у других пилюль (навигация ревью) ширина своя.
      const fluid = !!slot?.querySelector('[data-fluid-pill]')
      const fixedNeed = pill && !fluid ? pill.offsetWidth + slotPad : 0
      // Бар без подписи профиля и с обычными полями вкладок.
      const navSave = 2 * (NAV_PAD - NAV_PAD_TIGHT) * visibleNav.length
      // Поля вкладок читаем как есть сейчас: посреди перехода они промежуточные.
      const navBtn = bar.querySelector('nav button')
      const navPad = navBtn ? parseFloat(getComputedStyle(navBtn).paddingLeft) : NAV_PAD
      const base = bar.offsetWidth - (profileTextRef.current?.offsetWidth ?? 0)
        + 2 * (NAV_PAD - navPad) * visibleNav.length
      const nameW = nameRef.current?.offsetWidth ?? 0
      const roleW = roleRef.current?.offsetWidth ?? 0
      const widths = [8 + Math.max(nameW, roleW), 8 + roleW, 0, -navSave]
      // Бар по центру: справа остаётся половина того, что он не занял.
      const room = (w: number) => (inner - base - w) / 2 - slotPad
      let level = widths.findIndex((w, i) => {
        // Короткое имя («Босс») уже подписи «Учитель» крупным — ступень 1 не сжимает.
        if (i === 1 && w >= widths[0]) return false
        if (!fluid) return base + w + 2 * fixedNeed <= inner
        return room(w) >= (i === 3 ? PILL_MIN : PILL_SOFT_MIN)
      })
      if (level < 0) level = 3
      setSqueeze(level as 0 | 1 | 2 | 3)
      setTopPillW(fluid ? Math.max(PILL_MIN, Math.min(PILL_WIDTH, Math.floor(room(widths[level])))) : null)
    }
    fit()
    // Пилюля въезжает анимацией, подпись и поля вкладок тоже — досчитываем после (0.5s).
    const settle = setTimeout(fit, 560)
    const ro = new ResizeObserver(fit)
    ro.observe(row)
    // Пилюля монтируется позже бара (данные расписания) — ширина ряда при этом
    // не меняется, поэтому следим за слотом отдельно.
    const mo = new MutationObserver(fit)
    if (slot) mo.observe(slot, { childList: true })
    window.addEventListener('resize', fit)
    return () => { clearTimeout(settle); ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', fit) }
  }, [activePage, headerDocked, collapsed, teacherName, teacherRole, setTopPillW, visibleNav.length, squeeze])

  useLayoutEffect(() => {
    if (!addOpen) return
    const update = () => {
      const el = addBtnRef.current; if (!el) return
      const r = el.getBoundingClientRect()
      setAddAnchor({ top: r.bottom + 10, left: r.left + r.width / 2 })
    }
    update(); window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [addOpen])

  useLayoutEffect(() => {
    if (!profileOpen) return
    const update = () => {
      const el = profileBtnRef.current; if (!el) return
      const r = el.getBoundingClientRect()
      setProfileAnchor({ top: r.bottom + 10, left: r.left + r.width / 2 })
    }
    update(); window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [profileOpen])

  useEffect(() => {
    if (!addOpen) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (addBtnRef.current?.contains(t) || dropRef.current?.contains(t)) return
      setAddOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddOpen(false) }
    document.addEventListener('pointerdown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [addOpen])

  useEffect(() => {
    if (!profileOpen) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (profileBtnRef.current?.contains(t) || profileDropRef.current?.contains(t)) return
      setProfileOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false) }
    document.addEventListener('pointerdown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [profileOpen])

  useEffect(() => {
    if (!snapMountRef.current) { snapMountRef.current = true; return }
    headerDocked ? lockSnap() : lockRelease()
    springTopbar(headerDocked)
    const el = teacherBarRef.current; if (!el) return
    el.classList.remove('topbar-snap-down', 'topbar-snap-up')
    void el.offsetWidth
    el.classList.add(headerDocked ? 'topbar-snap-down' : 'topbar-snap-up')
    const id = setTimeout(() => el.classList.remove('topbar-snap-down', 'topbar-snap-up'), 460)
    return () => clearTimeout(id)
  }, [headerDocked])

  // Тариф для бейджа в меню профиля: name + ползунок учеников + число дней.
  const planTier = PLAN_TIERS.find(p => p.code === (myPlan?.plan_code ?? 'free')) ?? PLAN_TIERS[0]
  const planLimit = myPlan?.max_students ?? planTier.maxStudents
  const planUsed = myPlan?.students_used ?? null
  const planPct = planLimit != null && planUsed != null ? Math.min(100, Math.round((planUsed / planLimit) * 100)) : null
  const planDaysLeft = myPlan?.expires_at
    ? Math.max(0, Math.ceil((new Date(myPlan.expires_at).getTime() - Date.now()) / 86400000))
    : null
  const dayWord = (n: number) => {
    const a = n % 10, b = n % 100
    if (a === 1 && b !== 11) return t('день')
    if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return t('дня')
    return t('дней')
  }
  const planEnding = (planDaysLeft != null && planDaysLeft <= 7) || (planPct != null && planPct >= 90)

  // Общая поверхность меню (lib/dropdownStyle): стекло 0.96, радиус 14,
  // отступ 6, тень из темы; пункты — радиус 8 (концентрично 14 − 6).
  const dropdownStyle: React.CSSProperties = {
    ...dropdownSurface,
    overflow: 'visible', minWidth: 230,
    display: 'flex', flexDirection: 'column',
  }

  const profileMenuItems = [
    { icon: UserCircle,  label: t('Настройки профиля'), sub: t('имя, аватар'),         action: 'profile' },
    { icon: LayoutDashboard, label: t('Настроить виджеты'), sub: t('как у учеников'),  action: 'widgets' },
    { icon: dark ? Sun : Moon, label: dark ? t('Светлая тема') : t('Тёмная тема'), sub: t('переключить'), action: 'theme' },
    { icon: CreditCard,  label: t('Тарифы'),             sub: t('подписка и счета'),   action: 'payment' },
    { icon: MessageSquarePlus, label: t('Обратная связь'), sub: t('сообщить об ошибке'), action: 'feedback' },
    // Диалоги + Админка — только для админа; у учителей пункты не появляются.
    ...(teacherRole === 'admin'
      ? [
          { icon: MessageCircle, label: t('Диалоги'), sub: t('чат с ботом и заявки'), action: 'dialogs' },
          { icon: Shield, label: t('Админка'), sub: t('аналитика, хранилище'), action: 'admin' },
        ]
      : []),
  ]

  return (
    <>
    <ViewAsBanner />
    <motion.div
      ref={teacherBarRef}
      style={{
        position: 'relative', zIndex: 60,
        borderRadius: 32, padding: '8px', height: 60, width: 'fit-content',
        boxSizing: 'border-box',
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-pill)',
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8,
        overflow: 'hidden',
      }}
    >
      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
        {visibleNav.map(item => {
          const isActive = activePage === item.id
          const badgeCount = item.id === 'homework' ? pendingHwCount : item.id === 'gradebook' ? pendingJournalCount : 0
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (item.id === 'constructor' && activePage === 'constructor') {
                  triggerConstructorBack()
                } else {
                  setActivePage(item.id)
                }
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = 'var(--color-text)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = 'var(--color-muted)'
                }
              }}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: `0 ${squeeze === 3 ? NAV_PAD_TIGHT : NAV_PAD}px`, height: 44, borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--color-muted)',
                background: 'transparent',
                transition: 'color 0.15s, font-weight 0.15s, padding 0.38s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 22,
                    background: 'var(--grad-purple)',
                    boxShadow: isActive ? '0 4px 14px rgba(var(--accent-rgb), 0.42)' : 'none',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.22s ease, box-shadow 0.22s ease',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                />
              <span style={{
                position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden',
                maxWidth: collapsed ? 22 : 0, opacity: collapsed ? 1 : 0,
                transition: 'max-width 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
              }}>
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span style={{
                position: 'relative', zIndex: 1, display: 'block', overflow: 'hidden', whiteSpace: 'nowrap',
                maxWidth: collapsed ? 0 : 200, opacity: collapsed ? 0 : 1,
                transition: 'max-width 0.38s cubic-bezier(0.42,0,0.58,1), opacity 0.22s ease-in-out',
              }}>
                {t(item.label)}
              </span>
              <CountBadge count={badgeCount} tone="danger" ring="var(--color-bg)" style={{ position: 'absolute', top: 4, right: collapsed ? 1 : 3, zIndex: 2, boxShadow: '0 2px 6px rgba(168,40,45,0.5)' }} />
            </motion.button>
          )
        })}
      </nav>

      <div style={{ width: 1, height: 28, background: 'var(--color-border)', flexShrink: 0 }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <div ref={bellRef} style={{ display: 'inline-flex' }}>
          <NotificationBell onClick={() => setNotifOpen(o => !o)} />
        </div>

        <motion.button
          ref={addBtnRef}
          whileHover={{ scale: 1.06, backgroundColor: 'rgba(155,109,255,0.14)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setAddOpen(o => !o)}
          aria-label={t('Действия')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 44, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--color-muted)' }}
        >
          <LayoutGrid size={18} strokeWidth={2} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.06, backgroundColor: 'rgba(155,109,255,0.14)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? t('Развернуть') : t('Свернуть')}
          style={{ width: 36, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-muted)', background: 'none', border: 'none' }}
        >
          <motion.span
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.8 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={16} />
          </motion.span>
        </motion.button>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--color-border)', flexShrink: 0 }} />

      {/* Avatar / profile pill */}
      <motion.div
        ref={profileBtnRef}
        onClick={() => setProfileOpen(o => !o)}
        whileTap={{ scale: 0.97 }}
        style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 8px', height: 44, cursor: 'pointer', borderRadius: 14, userSelect: 'none' }}
      >
        <motion.div
          whileHover={{ scale: 1.10, boxShadow: '0 0 0 3px rgba(120,106,215,0.35), 0 4px 16px rgba(106,90,230,0.55)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{ position: 'relative', width: 30, height: 30, borderRadius: '50%', background: selectedAvatar.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(106,90,230,0.35)' }}
        >
          <AvatarIcon size={16} strokeWidth={1.8} style={{ color: '#fff' }} />
          <AvatarPhotoFill path={avatarPath} />
        </motion.div>
        <div ref={profileTextRef} style={{
          overflow: 'hidden', whiteSpace: 'nowrap',
          maxWidth: (isHome && teacherName && squeeze < 2) ? 208 : 0,
          opacity: (isHome && teacherName && squeeze < 2) ? 1 : 0,
          transition: 'max-width 0.38s cubic-bezier(0.42,0,0.58,1), opacity 0.22s ease-in-out',
        }}>
          <div style={{ paddingLeft: 8, width: 'max-content' }}>
            {/* Имя меряется всегда (для расчёта тесноты); при сжатии вынуто из потока */}
            <div style={squeeze === 0 ? undefined : { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
              <div ref={nameRef} style={{ width: 'max-content', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>{tn(teacherName)}</div>
            </div>
            <div style={{
              width: 'max-content', lineHeight: 1.2,
              fontSize: squeeze === 0 ? 10 : 13, fontWeight: squeeze === 0 ? 400 : 600,
              color: squeeze === 0 ? 'var(--color-muted)' : 'var(--color-text)',
            }}>{teacherRole === 'admin' ? t('Админ') : t('Учитель')}</div>
          </div>
          {/* Мерка одиночной подписи (ступень 1) — шрифт там крупнее, чем под именем */}
          <div ref={roleRef} aria-hidden style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 'max-content', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
            {teacherRole === 'admin' ? t('Админ') : t('Учитель')}
          </div>
        </div>
      </motion.div>
    </motion.div>

    {/* Quick-actions dropdown */}
    {createPortal(
      <AnimatePresence>
        {addOpen && addAnchor && (
          <div ref={dropRef} style={{ position: 'fixed', top: addAnchor.top, left: addAnchor.left, zIndex: 1000, transform: 'translateX(-50%)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15, ease: EASE } }} transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }} style={{ transformOrigin: 'top center', ...dropdownStyle }}>
            {visibleQuick.map((item, i) => {
              if (item.type === 'separator') return <div key={`sep-${i}`} style={{ height: 1, background: 'var(--color-border)', margin: '4px 8px' }} />
              const action = item as QuickAction
              return (
                <motion.button key={action.label} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (action.action === 'create-task') setTaskModalOpen(true)
                    if (action.action === 'create-course') openConstructor('course')
                    if (action.action === 'create-group') { setActivePage('groups'); setTimeout(() => window.dispatchEvent(new CustomEvent('teacher:open-add-group')), 80) }
                    if (action.action === 'add-student') { setActivePage('groups'); setTimeout(() => window.dispatchEvent(new CustomEvent('teacher:open-add-student')), 80) }
                    if (action.page) setActivePage(action.page)
                    setAddOpen(false)
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <action.icon size={15} strokeWidth={2} style={{ color: action.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>{t(action.label)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>{t(action.sub)}</div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

    {/* Profile dropdown */}
    {createPortal(
      <AnimatePresence>
        {profileOpen && profileAnchor && (
          <div ref={profileDropRef} style={{ position: 'fixed', top: profileAnchor.top, left: profileAnchor.left, zIndex: 1000, transform: 'translateX(-50%)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15, ease: EASE } }} transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }} style={{ transformOrigin: 'top center', ...dropdownStyle, width: 252, minWidth: 252 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
              <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: selectedAvatar.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(106,90,230,0.35)' }}>
                <AvatarIcon size={18} strokeWidth={1.8} style={{ color: '#fff' }} />
                <AvatarPhotoFill path={avatarPath} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>{teacherName || (teacherRole === 'admin' ? t('Админ') : t('Учитель'))}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacherEmail}</div>
              </div>
            </div>

            {/* Тариф: название + ползунок учеников + число дней до конца */}
            <button
              onClick={() => { setActivePage('payment'); setProfileOpen(false) }}
              style={{ display: 'block', width: 'calc(100% - 16px)', margin: '2px 8px 8px', padding: '10px 12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--color-purple-soft)', border: '1px solid var(--color-border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: planPct != null ? 8 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Zap size={14} strokeWidth={2} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(planTier.name)}</span>
                </div>
                {planDaysLeft != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: planEnding ? 'var(--color-red-text)' : 'var(--color-text-3)' }}>
                    {planDaysLeft === 0 ? t('истекает сегодня') : `${t('осталось')} ${planDaysLeft} ${dayWord(planDaysLeft)}`}
                  </span>
                )}
              </div>
              {planPct != null && (
                <>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden' }}>
                    <div style={{ width: `${planPct}%`, height: '100%', borderRadius: 999, background: planEnding ? 'var(--color-red-text)' : 'var(--grad-purple)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{planUsed} / {planLimit} {t('учеников')}</div>
                </>
              )}
            </button>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '0 8px 4px' }} />

            {profileMenuItems.map(item => (
              <motion.button key={item.action} whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (item.action === 'widgets') setWidgetsOpen(true)
                  if (item.action === 'theme') toggleTheme()
                  if (item.action === 'profile') setActivePage('profile-settings')
                  if (item.action === 'payment') setActivePage('payment')
                  if (item.action === 'admin') setActivePage('admin')
                  if (item.action === 'dialogs') {
                    // Открыть Админку сразу на «Заявки» → «Диалоги».
                    sessionStorage.setItem('admin_tab', 'requests')
                    sessionStorage.setItem('feedback_view', 'dialogs')
                    setActivePage('admin')
                  }
                  if (item.action === 'feedback') setFeedbackOpen(true)
                  setProfileOpen(false)
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-5)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={15} strokeWidth={2} style={{ color: 'var(--color-text-2)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                </div>
              </motion.button>
            ))}

            {/* Язык — такой же ряд, как остальные пункты: подпись снизу
                показывает текущий язык, клик по ряду переключает. */}
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => setLang((lang === 'ru' ? 'en' : 'ru') as Lang)}
              aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-5)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={16} strokeWidth={2} style={{ color: 'var(--color-text-2)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('Язык')}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lang === 'ru' ? 'Русский' : 'English'}</div>
              </div>
            </motion.button>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 8px' }} />
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => { void trackNow('logout', { role: 'teacher' }); supabase.auth.signOut(); setProfileOpen(false) }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.15s', width: '100%' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: dark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={16} strokeWidth={2} style={{ color: 'var(--color-red-text)' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-red-text)', lineHeight: 1.3 }}>{t('Выйти')}</div>
            </motion.button>

            {/* Подвал меню: номер сборки этого устройства + проверка обновления */}
            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 8px' }} />
            <AppVersionRow variant="compact" />
          </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

    <NotificationPopup open={notifOpen} anchorRef={bellRef} onClose={() => setNotifOpen(false)} />
    {widgetsOpen && <WidgetsModal onClose={() => setWidgetsOpen(false)} />}
    {feedbackOpen && <FeedbackModal role="teacher" onClose={() => setFeedbackOpen(false)} />}
    {taskModalOpen && (
      <CreateTaskModal
        onClose={() => { setTaskModalOpen(false); clearDrafts('createTask.') }}
        onSave={task => {
          addTask({
            typeId: task.type?.id ?? null,
            typeLabel: task.type?.label ?? null,
            typeBg: task.type?.bg ?? null,
            typeColor: task.type?.textColor ?? null,
            title: task.title,
            date: task.date,
            time: task.time,
            comment: task.comment,
          })
          setTaskModalOpen(false)
        }}
      />
    )}
    </>
  )
}
