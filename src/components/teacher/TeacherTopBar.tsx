import { motion } from 'framer-motion'
import {
  Home, Users, ClipboardList, BookOpen, Layers,
  Bell, ChevronLeft, ChevronRight, GraduationCap,
} from 'lucide-react'
import { useState } from 'react'
import { teacher, pendingHomework, getTotalPendingHw } from '../../data/teacherMockData'
import { useTeacher, type TeacherPage } from '../../store/teacherStore'

const navItems: { id: TeacherPage; label: string; icon: React.ElementType }[] = [
  { id: 'home',        label: 'Главная',     icon: Home },
  { id: 'groups',      label: 'Группы',      icon: Users },
  { id: 'homework',    label: 'ДЗ',          icon: ClipboardList },
  { id: 'gradebook',   label: 'Журнал',      icon: BookOpen },
  { id: 'constructor', label: 'Конструктор', icon: Layers },
]

const EASE = [0.32, 0.72, 0, 1] as const
const transition = { duration: 0.32, ease: EASE }

const pendingHwCount = getTotalPendingHw(pendingHomework)

export default function TeacherTopBar() {
  const [collapsed, setCollapsed] = useState(false)
  const activePage = useTeacher(s => s.activePage)
  const setActivePage = useTeacher(s => s.setActivePage)

  return (
    <motion.div
      layout
      style={{
        position: 'relative',
        zIndex: 60,
        borderRadius: 32,
        padding: '12px',
        height: 60,
        width: 'fit-content',
        boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 14px rgba(21,18,31,0.08)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
                  el.style.background = '#F4E9FC'
                  el.style.color = '#7B3FCC'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'transparent'
                  el.style.color = '#6F6F76'
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: isActive ? 600 : 500,
                color: isActive ? '#7B3FCC' : '#6F6F76',
                background: isActive ? '#EEDBFF' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap', position: 'relative',
              }}
            >
              {/* Icon (compact mode) */}
              <motion.span
                initial={false}
                animate={{ width: collapsed ? 'auto' : 0, opacity: collapsed ? 1 : 0 }}
                transition={transition}
                style={{ display: 'flex', overflow: 'hidden' }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </motion.span>
              {/* Label (expanded mode) */}
              <motion.span
                initial={false}
                animate={{ width: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
                transition={transition}
                style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {item.label}
              </motion.span>
              {/* Badge */}
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
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          aria-label="Уведомления"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#6F6F76', background: 'none', border: 'none',
          }}
        >
          <Bell size={16} />
        </motion.button>

        {/* Switch to student view */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => { window.location.hash = '' }}
          aria-label="Перейти к дашборду студента"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.05)', color: '#6F6F76',
            fontSize: 12, fontWeight: 600, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.09)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)' }}
        >
          <GraduationCap size={14} />
          <motion.span
            initial={false}
            animate={{ width: collapsed ? 0 : 'auto', opacity: collapsed ? 0 : 1 }}
            transition={transition}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            Студент
          </motion.span>
        </motion.button>

        {/* Collapse toggle */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#6F6F76', background: 'none', border: 'none',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      </div>
    </motion.div>
  )
}
