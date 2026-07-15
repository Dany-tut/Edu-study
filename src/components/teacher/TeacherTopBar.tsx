import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Users, ClipboardList, BookOpen, Layers, GraduationCap, Wallet,
  ChevronLeft, ChevronRight,
  LayoutGrid, UserPlus, CheckSquare, LayoutDashboard, LogOut, Moon, Sun,
  CreditCard, UserCircle, Shield, MessageSquarePlus, MessageCircle, Globe,
  Flower2, Cat, Rabbit, Bird, Fish, Bug, Rocket, Star,
  type LucideIcon,
} from 'lucide-react'
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTeacher, type TeacherPage } from '../../store/teacherStore'
import { useTeacherAccess, type TeacherTabId } from '../../lib/teacherAccess'
import { useHomework, useHardSubmissions } from '../../lib/useHomework'
import { useJournalPending } from '../../lib/useGroups'
import { lockSnap, lockRelease, springTopbar } from '../../lib/feedback'
import { usePersistentState, clearDrafts } from '../../lib/useDraft'
import CreateTaskModal from './CreateTaskModal'
import WidgetsModal from './WidgetsModal'
import FeedbackModal from '../FeedbackModal'
import { supabase } from '../../lib/supabase'
import { trackNow } from '../../lib/analytics'
import { useTheme } from '../../store/themeStore'
import NotificationBell from '../NotificationBell'
import NotificationPopup from '../NotificationPopup'
import { useNotificationsStore } from '../../store/notificationsStore'
import { useT, useLang, type Lang } from '../../lib/i18n'

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
const transition = { duration: 0.32, ease: EASE }

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
      body: `${p.date.slice(5).replace('-', '.')} · ${p.title}`,
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
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (!u) return
      const name = u.user_metadata?.name ?? u.email?.split('@')[0] ?? ''
      const role: 'admin' | 'teacher' = u.app_metadata?.role === 'admin' ? 'admin' : 'teacher'
      setTeacherName(name)
      setTeacherEmail(u.email ?? '')
      setTeacherRole(role)
      setAvatarId(u.user_metadata?.avatarId ?? 'flower')
    })
  }, [])

  const selectedAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0]
  const AvatarIcon = selectedAvatar.Icon

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

  const headerDocked = useTeacher(s => s.headerDocked)
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

  const isHome = activePage === 'home'

  const dropdownStyle: React.CSSProperties = {
    background: 'rgba(var(--glass-rgb), 0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid var(--color-border)',
    borderRadius: 18,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    padding: 8, minWidth: 230,
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
    <motion.div
      ref={teacherBarRef}
      style={{
        position: 'relative', zIndex: 60,
        borderRadius: 32, padding: '8px', height: 60, width: 'fit-content',
        boxSizing: 'border-box',
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
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
                padding: '0 16px', height: 44, borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--color-muted)',
                background: 'transparent',
                transition: 'color 0.18s, font-weight 0.18s',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 20,
                    background: 'var(--grad-purple)',
                    boxShadow: isActive ? '0 4px 14px rgba(106,90,230,0.42)' : 'none',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.22s ease, box-shadow 0.22s ease',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                />
              <span style={{
                position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden',
                maxWidth: collapsed ? 22 : 0, opacity: collapsed ? 1 : 0,
                transition: 'max-width 0.42s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
              }}>
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span style={{
                position: 'relative', zIndex: 1, display: 'block', overflow: 'hidden', whiteSpace: 'nowrap',
                maxWidth: collapsed ? 0 : 200, opacity: collapsed ? 0 : 1,
                transition: 'max-width 0.5s cubic-bezier(0.42,0,0.58,1), opacity 0.28s ease-in-out',
              }}>
                {t(item.label)}
              </span>
              {badgeCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: collapsed ? 1 : 3, minWidth: 17, height: 17, borderRadius: 9, padding: '0 5px', background: 'linear-gradient(135deg, #E5484D, #A8282D)', color: '#fff', fontSize: 10.5, fontWeight: 800, lineHeight: 1, letterSpacing: '0.2px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: '0 2px 6px rgba(168,40,45,0.5), 0 0 0 1.5px var(--color-bg)' }}>
                  {badgeCount}
                </span>
              )}
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
          <LayoutGrid size={17} strokeWidth={2} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08, backgroundColor: 'rgba(155,109,255,0.14)' }}
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
        style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 7px', height: 44, cursor: 'pointer', borderRadius: 14, userSelect: 'none' }}
      >
        <motion.div
          whileHover={{ scale: 1.10, boxShadow: '0 0 0 3px rgba(120,106,215,0.35), 0 4px 16px rgba(106,90,230,0.55)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{ width: 30, height: 30, borderRadius: '50%', background: selectedAvatar.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(106,90,230,0.35)' }}
        >
          <AvatarIcon size={16} strokeWidth={1.8} style={{ color: '#fff' }} />
        </motion.div>
        <div style={{
          overflow: 'hidden', whiteSpace: 'nowrap',
          maxWidth: (isHome && teacherName) ? 208 : 0,
          opacity: (isHome && teacherName) ? 1 : 0,
          transition: 'max-width 0.5s cubic-bezier(0.42,0,0.58,1), opacity 0.28s ease-in-out',
        }}>
          <div style={{ paddingLeft: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>{teacherName}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 1.2 }}>{teacherRole === 'admin' ? t('Админ') : t('Учитель')}</div>
          </div>
        </div>
      </motion.div>
    </motion.div>

    {/* Quick-actions dropdown */}
    {createPortal(
      <AnimatePresence>
        {addOpen && addAnchor && (
          <div ref={dropRef} style={{ position: 'fixed', top: addAnchor.top, left: addAnchor.left, zIndex: 1000, transform: 'translateX(-50%)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.16, ease: EASE } }} transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }} style={{ transformOrigin: 'top center', ...dropdownStyle }}>
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
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.12s', width: '100%' }}
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
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.16, ease: EASE } }} transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }} style={{ transformOrigin: 'top center', ...dropdownStyle, width: 252, minWidth: 252 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedAvatar.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(106,90,230,0.35)' }}>
                <AvatarIcon size={18} strokeWidth={1.8} style={{ color: '#fff' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>{teacherName || (teacherRole === 'admin' ? t('Админ') : t('Учитель'))}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacherEmail}</div>
              </div>
            </div>
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
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.12s', width: '100%' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={15} strokeWidth={2} style={{ color: 'var(--color-text-2)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</div>
                </div>
              </motion.button>
            ))}

            {/* Language — whole row toggles between RU/EN; the pill just shows
                the current language. */}
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => setLang((lang === 'ru' ? 'en' : 'ru') as Lang)}
              aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.12s', width: '100%' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={15} strokeWidth={2} style={{ color: 'var(--color-text-2)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('Язык')}</div>
              <span style={{ flexShrink: 0, height: 28, display: 'inline-flex', alignItems: 'center', padding: '0 13px', borderRadius: 999, background: 'var(--color-bg-5)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}>
                {lang === 'ru' ? 'Русский' : 'English'}
              </span>
            </motion.button>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 8px' }} />
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => { void trackNow('logout', { role: 'teacher' }); supabase.auth.signOut(); setProfileOpen(false) }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = dark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', transition: 'background 0.12s', width: '100%' }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: dark ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={15} strokeWidth={2} style={{ color: dark ? '#FC8181' : '#C53030' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: dark ? '#FC8181' : '#C53030', lineHeight: 1.3 }}>{t('Выйти')}</div>
            </motion.button>
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
