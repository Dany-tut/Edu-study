import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Users, ClipboardList, BookOpen, Layers,
  Bell, ChevronLeft, ChevronRight,
  LayoutGrid, UserPlus, Send, CheckSquare, LayoutDashboard, LogOut, Moon, Sun, type LucideIcon,
} from 'lucide-react'
import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTeacher, type TeacherPage } from '../../store/teacherStore'
import { useHomework } from '../../lib/useHomework'
import CreateTaskModal from './CreateTaskModal'
import WidgetsModal from './WidgetsModal'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../store/themeStore'

const navItems: { id: TeacherPage; label: string; icon: React.ElementType }[] = [
  { id: 'home',        label: 'Главная',     icon: Home },
  { id: 'groups',      label: 'Группы',      icon: Users },
  { id: 'homework',    label: 'ДЗ',          icon: ClipboardList },
  { id: 'gradebook',   label: 'Журнал',      icon: BookOpen },
  { id: 'constructor', label: 'Конструктор', icon: Layers },
]

const EASE = [0.32, 0.72, 0, 1] as const
const transition = { duration: 0.32, ease: EASE }

type QuickAction = { type?: 'action'; icon: LucideIcon; label: string; sub: string; color: string; bg: string; page?: TeacherPage; action?: string }
type QuickSeparator = { type: 'separator' }
type QuickItem = QuickAction | QuickSeparator

const quickActions: QuickItem[] = [
  { icon: Layers,           label: 'Создать курс',      sub: 'новый курс',       color: '#7B3FCC', bg: 'var(--color-purple-soft)', action: 'create-course' },
  { icon: BookOpen,         label: 'Создать урок',      sub: 'новый урок',       color: '#1a7a3f', bg: 'var(--color-green-soft)', page: 'lesson-editor' },
  { icon: ClipboardList,    label: 'Создать домашку',   sub: 'группе / лично',   color: '#1a7a3f', bg: 'var(--color-green-soft)', page: 'homework-create' },
  { icon: CheckSquare,      label: 'Создать задачу',    sub: 'встреча, урок…',   color: '#16a87a', bg: '#d5f5e8', action: 'create-task' },
  { type: 'separator' },
  { icon: Users,            label: 'Создать группу',    sub: 'новая группа',     color: '#7B3FCC', bg: 'var(--color-purple-soft)', action: 'create-group' },
  { icon: UserPlus,         label: 'Добавить студента', sub: 'в группу',         color: '#7B3FCC', bg: 'var(--color-purple-soft)', action: 'add-student' },
  { icon: Send,             label: 'Пуш / СМС',         sub: 'уведомление',      color: '#8B4900', bg: 'var(--color-peach-soft)' },
  { type: 'separator' },
  { icon: LayoutDashboard,  label: 'Настроить виджеты', sub: 'как у учеников',   color: '#7B3FCC', bg: 'var(--color-purple-soft)', action: 'widgets' },
  { icon: Moon,             label: 'Тема',              sub: 'светлая / тёмная', color: '#5A4A8A', bg: '#EDEAF8', action: 'theme' },
  { type: 'separator' },
  { icon: LogOut,           label: 'Выйти',             sub: 'из аккаунта',      color: '#A8282D', bg: 'var(--color-red-soft)', action: 'logout' },
]

export default function TeacherTopBar() {
  const [collapsed, setCollapsed]       = useState(false)
  const [addOpen, setAddOpen]           = useState(false)
  const { homework } = useHomework()
  const reviews = useTeacher(s => s.reviews)
  const pendingHwCount = homework
    .filter(hw => hw.status === 'active')
    .reduce((acc, hw) => acc + Math.max(0, hw.submittedCount - Object.keys(reviews[hw.id] ?? {}).length), 0)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [widgetsOpen, setWidgetsOpen] = useState(false)
  const [anchor, setAnchor]             = useState<{ top: number; left: number } | null>(null)
  const addBtnRef  = useRef<HTMLButtonElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const activePage = useTeacher(s => s.activePage)
  const setActivePage = useTeacher(s => s.setActivePage)
  const addTask = useTeacher(s => s.addTask)
  const openConstructor = useTeacher(s => s.openConstructor)
  const { dark, toggle: toggleTheme } = useTheme()

  // Measure anchor on open / resize
  useLayoutEffect(() => {
    if (!addOpen) return
    const update = () => {
      const el = addBtnRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setAnchor({ top: r.bottom + 10, left: r.left })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [addOpen])

  // Close on outside click / Escape
  useEffect(() => {
    if (!addOpen) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (addBtnRef.current?.contains(t) || dropRef.current?.contains(t)) return
      setAddOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [addOpen])

  return (
    <>
    <motion.div
      layout
      style={{
        position: 'relative', zIndex: 60,
        borderRadius: 32, padding: '8px', height: 60, width: 'fit-content',
        boxSizing: 'border-box',
        background: 'rgba(var(--glass-rgb), 0.5)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 14px rgba(21,18,31,0.08)',
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8,
      }}
    >
      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
        {navItems.map(item => {
          const isActive = activePage === item.id
          const showBadge = item.id === 'homework' && pendingHwCount > 0
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActivePage(item.id)}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(155,109,255,0.14)'
                  el.style.color = '#6B2FCC'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'transparent'
                  el.style.color = 'var(--color-muted)'
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 16px', height: 44, borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#7B3FCC' : 'var(--color-muted)',
                background: isActive ? 'var(--color-purple-soft)' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap', position: 'relative',
              }}
            >
              <motion.span
                initial={false}
                animate={{ width: collapsed ? 'auto' : 0, opacity: collapsed ? 1 : 0 }}
                transition={transition}
                style={{ display: 'flex', overflow: 'hidden' }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </motion.span>
              <motion.span
                initial={false}
                animate={{ width: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
                transition={transition}
                style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {item.label}
              </motion.span>
              {showBadge && (
                <span style={{
                  position: 'absolute', top: 5, right: collapsed ? 2 : 4,
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: '#F48B91', color: '#fff',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {pendingHwCount}
                </span>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

        {/* Bell */}
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}
          aria-label="Уведомления"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-muted)', background: 'none', border: 'none',
          }}
        >
          <Bell size={16} />
        </motion.button>

        {/* Quick-actions grid button */}
        <motion.button
          ref={addBtnRef}
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}
          onClick={() => setAddOpen(o => !o)}
          aria-label="Действия"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 34,
            borderRadius: 12, border: 'none', cursor: 'pointer',
            background: addOpen ? 'var(--color-purple-soft)' : 'transparent',
            color: '#7B3FCC', transition: 'background 0.15s',
          }}
        >
          <LayoutGrid size={17} strokeWidth={2} />
        </motion.button>

        {/* Collapse */}
        <motion.button
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-muted)', background: 'none', border: 'none',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      </div>
    </motion.div>

    {/* + Dropdown — portaled to body */}
    {createPortal(
      <AnimatePresence>
        {addOpen && anchor && (
          <motion.div
            ref={dropRef}
            initial={{ scale: 0.88, opacity: 0, y: -6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 460, damping: 26, mass: 0.7 }}
            style={{
              position: 'fixed', top: anchor.top, left: anchor.left,
              zIndex: 1000, transformOrigin: 'top left',
              background: 'rgba(var(--glass-rgb), 0.92)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--color-border)',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              padding: 8, minWidth: 230,
              display: 'flex', flexDirection: 'column',
            }}
          >
            {quickActions.map((item, i) => {
              if (item.type === 'separator') {
                return <div key={`sep-${i}`} style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '4px 8px' }} />
              }
              const action = item as QuickAction
              const isLogout = action.action === 'logout'
              return (
                <motion.button
                  key={action.label}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (action.action === 'create-task') { setTaskModalOpen(true) }
                    if (action.action === 'widgets') { setWidgetsOpen(true) }
                    if (action.action === 'create-course') { openConstructor('course') }
                    if (action.action === 'logout') { supabase.auth.signOut() }
                    if (action.action === 'theme') { toggleTheme(); return }
                    if (action.action === 'create-group') {
                      setActivePage('groups')
                      setTimeout(() => window.dispatchEvent(new CustomEvent('teacher:open-add-group')), 80)
                    }
                    if (action.action === 'add-student') {
                      setActivePage('groups')
                      setTimeout(() => window.dispatchEvent(new CustomEvent('teacher:open-add-student')), 80)
                    }
                    if (action.page) setActivePage(action.page)
                    setAddOpen(false)
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = isLogout
                      ? 'rgba(220,38,38,0.08)'
                      : 'rgba(0,0,0,0.05)'
                  }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: 10,
                    border: 'none', cursor: 'pointer',
                    background: 'transparent', textAlign: 'left',
                    transition: 'background 0.12s', width: '100%',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: action.action === 'theme' ? (dark ? 'rgba(181,122,255,0.18)' : '#EDEAF8') : action.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {action.action === 'theme'
                      ? (dark
                          ? <Sun size={15} strokeWidth={2} style={{ color: '#7B3FCC' }} />
                          : <Moon size={15} strokeWidth={2} style={{ color: '#5A4A8A' }} />)
                      : <action.icon size={15} strokeWidth={2} style={{ color: action.color }} />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isLogout ? '#C53030' : 'var(--color-text)', lineHeight: 1.3 }}>
                      {action.action === 'theme' ? (dark ? 'Светлая тема' : 'Тёмная тема') : action.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>{action.sub}</div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    {widgetsOpen && <WidgetsModal onClose={() => setWidgetsOpen(false)} />}
    {taskModalOpen && (
      <CreateTaskModal
        onClose={() => setTaskModalOpen(false)}
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
