import { useState, useRef, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Home, Users, BookOpen, Layers, Wallet, Plus, GraduationCap, ClipboardList,
  CheckSquare, UserPlus, LayoutDashboard, LogOut, Moon, Sun, UserCircle,
  Shield, MessageSquarePlus, Globe, type LucideIcon,
} from '../icons/appIcons'
import FadeText from '../FadeText'
import CountBadge from '../CountBadge'
import { AvatarPhotoFill } from '../AvatarPhoto'
import { useTeacher, type TeacherPage } from '../../store/teacherStore'
import { useTeacherAccess, type TeacherTabId } from '../../lib/teacherAccess'
import { useDeskStore } from '../../store/deskStore'
import { useJournalPending } from '../../lib/useGroups'
import { useTheme } from '../../store/themeStore'
import { useLang, useT, type Lang } from '../../lib/i18n'
import { getAuthUser } from '../../lib/owner'
import { signOutAndReload } from '../../lib/signOutAndReload'
import { trackNow } from '../../lib/analytics'
import { usePersistentState, clearDrafts } from '../../lib/useDraft'
import CreateTaskModal from './CreateTaskModal'
import FeedbackModal from '../FeedbackModal'
import './teacherIpadRail.css'

// ─────────────────────────────────────────────────────────────────────────────
// TeacherIpadRail — оболочка кабинета учителя для iPad (docs/platforms.md §1.1).
// Всё управление в одной стеклянной капсуле у правого края. Разделы приложения
// переехали сюда из десктопного топбара (TeacherTopBar монтируется только на ПК).
//   общее   — разделы + профиль;
//   экран   — 0–3 действия текущего раздела (заполняется в Фазе 1b);
//   главное — отдельный круг «+» под капсулой, ближе всех к пальцу.
// Поповеры открываются ВЛЕВО. Версия выбирается по PLATFORM==='ipad', не по ширине.
// ─────────────────────────────────────────────────────────────────────────────

const navItems: { id: TeacherPage; label: string; icon: LucideIcon }[] = [
  { id: 'home',        label: 'Главная',     icon: Home },
  { id: 'groups',      label: 'Группы',      icon: Users },
  { id: 'gradebook',   label: 'Журнал',      icon: BookOpen },
  { id: 'constructor', label: 'Конструктор', icon: Layers },
  { id: 'finances',    label: 'Финансы',     icon: Wallet },
]

type QuickAction = { type?: 'action'; icon: LucideIcon; label: string; sub: string; green?: boolean; page?: TeacherPage; action?: string }
type QuickItem = QuickAction | { type: 'separator' }

const quickActions: QuickItem[] = [
  { icon: BookOpen,      label: 'Создать курс',        sub: 'новый курс',          green: true, action: 'create-course' },
  { icon: GraduationCap, label: 'Создать урок',        sub: 'занятие в расписании', green: true, page: 'lesson-editor' },
  { icon: ClipboardList, label: 'Назначить домашку',   sub: 'группе / лично',       green: true, page: 'homework-create' },
  { icon: CheckSquare,   label: 'Добавить личную задачу', sub: 'для себя',          action: 'create-task' },
  { type: 'separator' },
  { icon: Users,         label: 'Создать группу',      sub: 'новая группа',         action: 'create-group' },
  { icon: UserPlus,      label: 'Добавить студента',   sub: 'в группу или без',     action: 'add-student' },
]

type PopId = 'profile' | 'primary' | null

export default function TeacherIpadRail() {
  const t = useT()
  const reduce = useReducedMotion()
  const [pop, setPop] = useState<PopId>(null)

  const activePage = useTeacher(s => s.activePage)
  const setActivePage = useTeacher(s => s.setActivePage)
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  const openHomeworkCreate = useTeacher(s => s.openHomeworkCreate)
  const openGroupForm = useTeacher(s => s.openGroupForm)
  const openConstructor = useTeacher(s => s.openConstructor)
  const triggerConstructorBack = useTeacher(s => s.triggerConstructorBack)

  const { dark, toggle: toggleTheme } = useTheme()
  const { lang, setLang } = useLang()

  const canTab = useTeacherAccess(s => s.canTab)
  const canPage = useTeacherAccess(s => s.canPage)
  useTeacherAccess(s => s.hiddenTabs) // re-render when access loads
  const visibleNav = navItems.filter(item => canTab(item.id as TeacherTabId))

  const pendingJournals = useJournalPending(null)
  const pendingJournalCount = pendingJournals.length

  const [teacherName, setTeacherName] = useState('')
  const [teacherRole, setTeacherRole] = useState<'admin' | 'teacher'>('teacher')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  useEffect(() => {
    getAuthUser().then(u => {
      if (!u) return
      setTeacherName(u.user_metadata?.name ?? u.email?.split('@')[0] ?? '')
      setTeacherRole(u.app_metadata?.role === 'admin' ? 'admin' : 'teacher')
      setAvatarPath(u.user_metadata?.avatarPath ?? null)
    })
  }, [])

  const [taskModalOpen, setTaskModalOpen] = usePersistentState('createTask.open', false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  // Esc закрывает поповер; клик вне — тоже.
  const railRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pop) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPop(null) }
    const onDown = (e: PointerEvent) => {
      if (!railRef.current?.contains(e.target as Node)) setPop(null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [pop])

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
  const keptQuick = quickActions.filter(it => it.type === 'separator' || quickAllowed(it as QuickAction))
  const visibleQuick = keptQuick.filter((it, idx) => {
    if (it.type !== 'separator') return true
    const before = keptQuick.slice(0, idx).some(x => x.type !== 'separator')
    const after = keptQuick.slice(idx + 1).some(x => x.type !== 'separator')
    return before && after
  })

  function runQuick(a: QuickAction) {
    if (a.action === 'create-task') setTaskModalOpen(true)
    else if (a.action === 'create-course') openConstructor('course')
    else if (a.action === 'create-group') openGroupForm('group')
    else if (a.action === 'add-student') openGroupForm('student')
    else if (a.page === 'lesson-editor') openLessonEditor(null)
    else if (a.page === 'homework-create') openHomeworkCreate()
    else if (a.page) setActivePage(a.page)
    setPop(null)
  }

  const profileMenu: { icon: LucideIcon; label: string; sub: string; action: string; group: number }[] = [
    ...(teacherRole === 'admin'
      ? [{ icon: Shield, label: t('Админка'), sub: t('аналитика, хранилище'), action: 'admin', group: 0 }]
      : []),
    { icon: UserCircle, label: t('Настройки профиля'), sub: t('имя, аватар'), action: 'profile', group: 1 },
    { icon: LayoutDashboard, label: t('Настроить виджеты'), sub: t('Рабочий стол'), action: 'widgets', group: 2 },
    { icon: dark ? Sun : Moon, label: dark ? t('Светлая тема') : t('Тёмная тема'), sub: t('переключить'), action: 'theme', group: 2 },
    { icon: Globe, label: t('Язык'), sub: lang === 'ru' ? 'Русский' : 'English', action: 'lang', group: 2 },
    { icon: MessageSquarePlus, label: t('Обратная связь'), sub: t('сообщить об ошибке'), action: 'feedback', group: 3 },
  ]

  function runProfile(action: string) {
    if (action === 'lang') { setLang((lang === 'ru' ? 'en' : 'ru') as Lang); return }
    if (action === 'theme') { toggleTheme(); return }
    if (action === 'widgets') {
      if (activePage === 'home') useDeskStore.getState().setShowWidgetLibrary(true)
      else useTeacher.getState().openDeskEditor()
    }
    if (action === 'profile') setActivePage('profile-settings')
    if (action === 'admin') setActivePage('admin')
    if (action === 'feedback') { setFeedbackOpen(true); setPop(null); return }
    setPop(null)
  }

  const popTransition = { duration: reduce ? 0 : 0.18 }
  const popMotion = {
    initial: { opacity: 0, x: reduce ? 0 : 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : 12 },
    transition: popTransition,
  }

  return (
    <>
      <div className="tir-rail" ref={railRef}>
        <div className="tir-capsule" role="toolbar" aria-orientation="vertical" aria-label={t('Разделы')}>
          {/* ОБЩЕЕ — разделы приложения */}
          {visibleNav.map(item => {
            const isActive = activePage === item.id
            const badge = item.id === 'gradebook' ? pendingJournalCount : 0
            return (
              <button
                key={item.id}
                type="button"
                className="tir-cell"
                aria-current={isActive ? 'page' : undefined}
                aria-label={badge > 0 ? `${t(item.label)}, ${badge}` : t(item.label)}
                onClick={() => {
                  if (item.id === 'constructor' && activePage === 'constructor') triggerConstructorBack()
                  else setActivePage(item.id)
                  setPop(null)
                }}
              >
                <item.icon size={isActive ? 22 : 23} strokeWidth={isActive ? 2.2 : 1.8} />
                {badge > 0 && <CountBadge count={badge} tone="danger" ring="var(--color-bg)" className="tir-badge" />}
                {isActive && <FadeText className="tir-cell-label">{t(item.label)}</FadeText>}
              </button>
            )
          })}

          <div className="tir-divider" />

          {/* ОБЩЕЕ — профиль */}
          <button
            type="button"
            className="tir-cell"
            aria-haspopup="menu"
            aria-expanded={pop === 'profile'}
            aria-pressed={pop === 'profile'}
            aria-label={t('Профиль')}
            onClick={() => setPop(p => (p === 'profile' ? null : 'profile'))}
          >
            <span className="tir-avatar" style={{ background: 'var(--grad-purple)', color: '#fff' }}>
              <UserCircle size={20} strokeWidth={1.8} />
              <AvatarPhotoFill path={avatarPath} />
            </span>
            {pop === 'profile' && <FadeText className="tir-cell-label">{t('Профиль')}</FadeText>}
          </button>
        </div>

        {/* ГЛАВНОЕ — отдельный круг под капсулой */}
        <button
          type="button"
          className="tir-primary"
          aria-haspopup="menu"
          aria-expanded={pop === 'primary'}
          aria-label={t('Действия')}
          onClick={() => setPop(p => (p === 'primary' ? null : 'primary'))}
        >
          <Plus size={24} strokeWidth={2.6} />
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {pop === 'primary' && (
            <motion.div key="primary" className="tir-popover" role="menu" aria-label={t('Действия')}
              style={{ bottom: '12%' }} {...popMotion}>
              <div className="tir-pop-head"><h3>{t('Действия')}</h3><p>{t('Быстрые действия')}</p></div>
              {visibleQuick.map((it, i) => it.type === 'separator'
                ? <div key={`sep-${i}`} className="tir-pop-sep" />
                : (() => { const a = it as QuickAction; return (
                  <button key={a.label} type="button" role="menuitem" className="tir-pop-row" onClick={() => runQuick(a)}>
                    <span className={`tir-pop-tile${a.green ? ' is-green' : ''}`}><a.icon size={16} strokeWidth={2} /></span>
                    <span style={{ minWidth: 0 }}><b>{t(a.label)}</b><span>{t(a.sub)}</span></span>
                  </button>
                ) })())}
            </motion.div>
          )}

          {pop === 'profile' && (
            <motion.div key="profile" className="tir-popover" role="menu" aria-label={t('Профиль')}
              style={{ top: '12%' }} {...popMotion}>
              <div className="tir-pop-head">
                <h3>{teacherName || (teacherRole === 'admin' ? t('Админ') : t('Учитель'))}</h3>
                <p>{teacherRole === 'admin' ? t('Админ') : t('Учитель')}</p>
              </div>
              {profileMenu.map((item, i) => (
                <Fragment key={item.action}>
                  {i > 0 && profileMenu[i - 1].group !== item.group && <div className="tir-pop-sep" />}
                  <button type="button" role="menuitem" className="tir-pop-row"
                    aria-label={item.action === 'lang' ? (lang === 'ru' ? 'Switch to English' : 'Переключить на русский') : undefined}
                    onClick={() => runProfile(item.action)}>
                    <span className="tir-pop-tile"><item.icon size={16} strokeWidth={2} /></span>
                    <span style={{ minWidth: 0 }}><b>{item.label}</b><span>{item.sub}</span></span>
                  </button>
                </Fragment>
              ))}
              <div className="tir-pop-sep" />
              <button type="button" role="menuitem" className="tir-pop-row"
                onClick={() => { void trackNow('logout', { role: 'teacher' }); setPop(null); void signOutAndReload('#/teacher') }}>
                <span className="tir-pop-tile"><LogOut size={16} strokeWidth={2} /></span>
                <span><b style={{ color: 'var(--color-red-text)' }}>{t('Выйти')}</b></span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {feedbackOpen && <FeedbackModal role="teacher" onClose={() => setFeedbackOpen(false)} />}
      {taskModalOpen && (
        <CreateTaskModal
          onClose={() => { setTaskModalOpen(false); clearDrafts('createTask.') }}
          onSave={async task => {
            const { error } = await useTeacher.getState().addTask({
              typeId: task.type?.id ?? null,
              typeLabel: task.type?.label ?? null,
              typeBg: task.type?.bg ?? null,
              typeColor: task.type?.textColor ?? null,
              title: task.title,
              date: task.date,
              time: task.time,
              comment: task.comment,
            })
            if (error) throw new Error(error)
          }}
        />
      )}
    </>
  )
}
