import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, BookOpen, Dumbbell, Bell, ChevronLeft, ChevronRight,
  Flower2, Cat, Rabbit, Bird, Fish, Bug, Rocket, Star,
  Settings, LayoutGrid, ArrowUpDown, GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { student, scheduleTodayIndex } from '../data/mockData'
import { playTransitionDrop } from '../lib/sound'
import { tactile } from '../lib/feedback'
import { useDashboard, type WidgetColumns } from '../store/dashboardStore'
import WidgetOrderModal from './WidgetOrderModal'

const navItems = [
  { id: 'home',    label: 'Главная',  icon: Home },
  { id: 'courses', label: 'Курсы',    icon: BookOpen },
  { id: 'trainer', label: 'Тренажер', icon: Dumbbell },
]

// One ease + duration shared by every animated element so the whole bar
// expands/collapses as a single synchronized motion (no competing timings).
const EASE = [0.32, 0.72, 0, 1] as const
const transition = { duration: 0.32, ease: EASE }

// Avatar: a flower glyph on a deterministic gradient generated from the name.
// The gradient stays as a per-user backdrop; an icon picker can swap the glyph later.
function nameToGradient(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  const hue2 = (hue + 38) % 360
  return `linear-gradient(135deg, hsl(${hue} 78% 70%), hsl(${hue2} 68% 56%))`
}

// Pickable avatars: a glyph + its own gradient backdrop. The default flower
// keeps the per-user generated colour; the rest carry a fixed themed gradient.
type AvatarOption = { id: string; Icon: LucideIcon; gradient: string }
const AVATARS: AvatarOption[] = [
  { id: 'flower', Icon: Flower2, gradient: nameToGradient(student.name) },
  { id: 'cat',    Icon: Cat,    gradient: 'linear-gradient(135deg, hsl(28 92% 68%), hsl(14 84% 56%))' },
  { id: 'rabbit', Icon: Rabbit, gradient: 'linear-gradient(135deg, hsl(330 88% 74%), hsl(345 76% 60%))' },
  { id: 'bird',   Icon: Bird,   gradient: 'linear-gradient(135deg, hsl(205 92% 70%), hsl(220 80% 58%))' },
  { id: 'fish',   Icon: Fish,   gradient: 'linear-gradient(135deg, hsl(180 72% 62%), hsl(196 78% 50%))' },
  { id: 'bug',    Icon: Bug,    gradient: 'linear-gradient(135deg, hsl(2 82% 70%), hsl(354 74% 56%))' },
  { id: 'rocket', Icon: Rocket, gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))' },
  { id: 'star',   Icon: Star,   gradient: 'linear-gradient(135deg, hsl(46 96% 66%), hsl(36 92% 54%))' },
]

// Shared visual box for each popover panel (main grid + the settings panel
// beside it), so both read as the same floating card.
const panelBox = {
  width: 224,
  padding: 14,
  borderRadius: 18,
  // Frosted-glass recipe like the module buttons / track-click card, but a
  // touch more opaque (0.72) so the label, divider and "Настройки" text keep
  // enough contrast even when the popover floats over a dark video backdrop.
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 12px 40px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.06)',
  boxSizing: 'border-box',
} as const

// Shared style for the small uppercase section labels in the avatar menu.
const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
  // Darker than the usual light grey so the label still reads when the glass
  // sits over a dark backdrop and overall contrast drops.
  color: '#7A7A82',
  marginBottom: 10,
} as const

// A navigable row in the settings menu (icon + label + chevron forward).
// `active` keeps the row highlighted while its panel is open to the side.
function SettingsRow({ icon: Icon, label, onClick, active = false }: { icon: LucideIcon; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      role="menuitem"
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.6)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px',
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        background: active ? 'rgba(123,63,204,0.1)' : 'transparent',
        color: '#0B0B0D',
        fontSize: 14,
        fontWeight: 550,
        textAlign: 'left',
        transition: 'background 0.15s',
      }}
    >
      <Icon size={17} strokeWidth={1.9} style={{ color: '#6F6F76', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={16} style={{ color: '#C2C2C8', flexShrink: 0 }} />
    </motion.button>
  )
}

// Header for a sub-view: a back button + the view title.
function MenuHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        aria-label="Назад"
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.6)', color: '#6F6F76',
        }}
      >
        <ChevronLeft size={15} />
      </motion.button>
      <span style={{ fontSize: 14, fontWeight: 650, color: '#0B0B0D' }}>{title}</span>
    </div>
  )
}

// Mini preview glyph: n equal vertical bars = "n blocks in a row".
function ColumnsGlyph({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, width: 20, height: 16 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ flex: 1, borderRadius: 2, background: 'currentColor' }} />
      ))}
    </div>
  )
}

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState('home')
  const [collapsed, setCollapsed] = useState(false)
  // When the lesson page auto-docks the bar (scrolled), the chevron can still
  // force it back open; this overrides the auto-compact, not the manual one.
  const [forceExpanded, setForceExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Which view the avatar popover shows: avatar grid (root) → settings panel.
  const [menuView, setMenuView] = useState<'root' | 'settings'>('root')
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const nameWrapRef = useRef<HTMLDivElement>(null)
  // Max width for the name when a widget pill shares the top-bar row; undefined
  // means "no cap" (home page, or when there's room for the full name).
  const [nameMaxWidth, setNameMaxWidth] = useState<number | undefined>(undefined)
  // Viewport coords for the portaled popover, measured from the avatar.
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const setScheduleIndex = useDashboard(state => state.setScheduleIndex)
  const avatarId = useDashboard(state => state.avatarId)
  const setAvatarId = useDashboard(state => state.setAvatarId)
  const widgetColumns = useDashboard(state => state.widgetColumns)
  const setWidgetColumns = useDashboard(state => state.setWidgetColumns)
  const activePage = useDashboard(state => state.activePage)
  const setActivePage = useDashboard(state => state.setActivePage)
  const openCourses = useDashboard(state => state.openCourses)
  const lessonScrolled = useDashboard(state => state.lessonScrolled)
  const setTopBarCompact = useDashboard(state => state.setTopBarCompact)
  const setTopBarBox = useDashboard(state => state.setTopBarBox)

  // The bar renders in its mini (icons-only) form when the user manually
  // collapsed it OR when a scrolled lesson page is forcing the compact dock —
  // unless the user has explicitly re-expanded it via the chevron.
  const autoCompact = (activePage === 'lesson' || activePage === 'homework') && lessonScrolled
  const isCompact = collapsed || (autoCompact && !forceExpanded)

  // Over the dark lesson dock the bar uses its more opaque glass even when
  // expanded, so a scrolled-and-expanded bar stays as contrasty as the
  // compact one (and matches the docked Back/title/date pills + widget pill).
  const contrasty = isCompact || autoCompact

  // Once the lesson scrolls back up (auto-dock condition gone), drop the
  // manual override so the next scroll-down re-docks the bar as expected.
  useEffect(() => { if (!autoCompact) setForceExpanded(false) }, [autoCompact])

  // Mirror the compact state into the store so the docked lesson date pill can
  // show the full date+icon when the bar is mini and just the day when it's wide.
  useEffect(() => { setTopBarCompact(isCompact) }, [isCompact, setTopBarCompact])

  // Keep the expanded bar + the widget pill within the viewport. On any
  // non-home page a 320px pill sits 20px to the right of the bar (see
  // DashboardPage), and the bar is centred — so space reserved for the pill on
  // the right must be mirrored on the left, hence reserving 2× its footprint.
  // Cap the name's width to whatever's left; if that's narrower than the name,
  // max-width turns the span into a definite box and it ellipsizes.
  useLayoutEffect(() => {
    const PILL = 320, GAP = 20, ROW_PAD = 32 // mirror DashboardPage / .topbar-row
    const apply = () => {
      const bar = barRef.current, nameWrap = nameWrapRef.current
      if (!bar || !nameWrap) return
      if (isCompact || activePage === 'home') { setNameMaxWidth(undefined); return }
      // rest-of-bar width is invariant to clipping the name (clipping shrinks
      // both `bar` and `nameWrap` by the same amount), so this converges.
      const rest = bar.offsetWidth - nameWrap.offsetWidth
      const maxBar = window.innerWidth - 2 * (PILL + GAP + ROW_PAD)
      setNameMaxWidth(Math.max(0, maxBar - rest))
    }
    apply()
    const ro = new ResizeObserver(apply)
    if (barRef.current) ro.observe(barRef.current)
    window.addEventListener('resize', apply)
    return () => { ro.disconnect(); window.removeEventListener('resize', apply) }
  }, [isCompact, activePage])

  // Report the centred bar's viewport left/right edges so the docked lesson
  // title can cap its width and keep a small gap to the bar (mirroring the
  // widget pill's gap on the right). The bar is *centred*, so expanding /
  // collapsing it both resizes it AND slides its left edge sideways. A
  // ResizeObserver catches the in-between animation frames, window resize
  // covers viewport changes, and re-running on the state that drives the bar's
  // size (compact toggle, page, name clamp) — with a measure after the ~320ms
  // expand/collapse settles — guarantees the resting box is never left stale
  // (which is what let the title slide under the expanded bar before).
  useLayoutEffect(() => {
    const apply = () => {
      const bar = barRef.current
      if (!bar) return
      const r = bar.getBoundingClientRect()
      setTopBarBox({ left: r.left, right: r.right })
    }
    apply()
    const settle = setTimeout(apply, 360)
    const ro = new ResizeObserver(apply)
    if (barRef.current) ro.observe(barRef.current)
    window.addEventListener('resize', apply)
    return () => { clearTimeout(settle); ro.disconnect(); window.removeEventListener('resize', apply) }
  }, [setTopBarBox, isCompact, activePage, nameMaxWidth])

  // Keep the nav highlight in sync when the page changes from elsewhere
  // (e.g. an "Открыть урок" button jumps straight to Courses).
  useEffect(() => { setActiveItem(activePage) }, [activePage])

  // Always reopen the popover at the avatar grid, never mid-flow.
  const closePicker = () => { setPickerOpen(false); setMenuView('root') }

  const handleNavClick = (id: string) => {
    if (id === activePage) return
    playTransitionDrop()
    setActiveItem(id)
    if (id === 'home') {
      // "Главная" returns to the dashboard and jumps the schedule back to today.
      setActivePage('home')
      setScheduleIndex(scheduleTodayIndex)
    } else if (id === 'courses') {
      // "Курсы" opens the general catalogue (no specific lesson focused).
      openCourses()
    } else if (id === 'trainer') {
      setActivePage('trainer')
    }
  }

  // The popover renders in a portal on <body>, so it's anchored to the avatar's
  // viewport rect (re-measured on open / resize / scroll). A portal keeps it
  // above every stacking context, so neighbouring cards can't paint over it.
  useLayoutEffect(() => {
    if (!pickerOpen) return
    const update = () => {
      const el = avatarRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // Drop the popover below the whole top bar (not just the avatar) so there's
      // a clear, even gap between the bar and the panel; keep its left edge under
      // the avatar.
      const barBottom = barRef.current?.getBoundingClientRect().bottom ?? r.bottom
      setAnchor({ top: barBottom + 10, left: r.left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [pickerOpen])

  // Close the avatar picker on an outside click or Escape. The popover lives in
  // a portal, so an "outside" click is one outside BOTH the avatar and popover.
  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (avatarRef.current?.contains(t) || popoverRef.current?.contains(t)) return
      closePicker()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePicker()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pickerOpen])

  const avatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0]

  return (
    <>
    <motion.div
      ref={barRef}
      style={{
        position: 'relative',
        zIndex: 60,            // lift bar (and its avatar-picker popover) above the rows below
        borderRadius: 32,
        padding: '12px',
        height: 60,                 // fixed → bar never twitches vertically
        width: 'fit-content',       // shrinks in length when collapsed
        boxSizing: 'border-box',
        // More opaque / contrasty whenever the bar floats over the dark scrolled
        // video (compact OR expanded) so it never washes out as faint glass;
        // light translucent glass everywhere else.
        background: contrasty ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: contrasty ? '1px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.7)',
        // Light, consistent drop shadow in both states so the bar reads as a
        // floating glass surface. The contrasty (over-video) form keeps a touch
        // more inset highlight; both share the same soft drop.
        boxShadow: contrasty
          ? 'inset 0 1px 1px rgba(255,255,255,0.9), 0 4px 14px rgba(21,18,31,0.10)'
          : 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 14px rgba(21,18,31,0.08)',
        transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Avatar (flower on a generated-color backdrop) + Name */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div ref={avatarRef} style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              // Sound + vibro on opening (and closing — same tick as the widget pill).
              tactile()
              if (pickerOpen) closePicker()
              else { setMenuView('root'); setPickerOpen(true) }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: avatar.gradient,
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: pickerOpen
                ? 'inset 0 0 0 1px rgba(255,255,255,0.35), 0 0 0 3px rgba(123,63,204,0.35)'
                : 'inset 0 0 0 1px rgba(255,255,255,0.35)',
              transition: 'box-shadow 0.15s',
            }}
            aria-label="Сменить аватар"
            aria-haspopup="menu"
            aria-expanded={pickerOpen}
          >
            <avatar.Icon size={20} strokeWidth={2} />
          </motion.button>

          {createPortal(
            <AnimatePresence>
              {pickerOpen && anchor && (
                <motion.div
                  ref={popoverRef}
                  key="avatar-picker"
                  // Springs open from the avatar corner with a light bounce, like
                  // the track-click card. We animate ONLY scale and hold opacity
                  // at 1: Chromium disables backdrop-filter while opacity < 1, but
                  // a scale transform leaves it intact — so the glass blur grows
                  // glued to the shape instead of snapping in late.
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  // Close as an eased tween (no spring overshoot) that only
                  // shrinks part-way while fading to transparent: it's gone via
                  // opacity before it ever gets tiny enough to jitter.
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.16, ease: EASE } }}
                  transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }}
                  style={{
                    position: 'fixed',
                    top: anchor.top,
                    left: anchor.left,
                    zIndex: 1000,
                    // Grow from the avatar (it sits at the popover's top-left).
                    transformOrigin: 'top left',
                    // Row so the settings panel sits beside (not over) the grid.
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  {/* Main panel: avatar grid + the Настройки entry. Always visible. */}
                  <div role="menu" style={panelBox}>
                    <div style={{ ...labelStyle, marginBottom: 18 }}>Выбери аватар</div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 10,
                      }}
                    >
                      {AVATARS.map(opt => {
                        const selected = opt.id === avatarId
                        return (
                          <motion.button
                            key={opt.id}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                              setAvatarId(opt.id)
                              closePicker()
                            }}
                            role="menuitemradio"
                            aria-checked={selected}
                            aria-label={opt.id}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: opt.gradient,
                              padding: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              border: 'none',
                              boxShadow: selected
                                ? 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 0 2px #fff, 0 0 0 4px #7B3FCC'
                                : 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                            }}
                          >
                            <opt.Icon size={20} strokeWidth={2} />
                          </motion.button>
                        )
                      })}
                    </div>
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.1)', margin: '14px -2px' }} />
                    <SettingsRow
                      icon={Settings}
                      label="Настройки"
                      active={menuView !== 'root'}
                      onClick={() => setMenuView(menuView === 'root' ? 'settings' : 'root')}
                    />
                  </div>

                  {/* Settings panel: slides out to the right of the main panel. */}
                  <AnimatePresence>
                    {menuView !== 'root' && (
                      <motion.div
                        key="settings-panel"
                        role="menu"
                        // Springs out from the main panel's left edge, same light
                        // bounce. Scale-only (opacity held at 1) so the glass blur
                        // never blinks off mid-animation.
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        // Same eased fade-out so it doesn't jitter when tiny.
                        exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.16, ease: EASE } }}
                        transition={{ type: 'spring', stiffness: 460, damping: 24, mass: 0.8 }}
                        style={{ ...panelBox, transformOrigin: 'left top' }}
                      >
                        {/* Settings open straight onto the Виджеты block — its
                            column-count types show inline, no extra drill-in. */}
                        <MenuHeader title="Настройки" onBack={() => setMenuView('root')} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <LayoutGrid size={15} strokeWidth={1.9} style={{ color: '#6F6F76', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D' }}>Виджеты</span>
                        </div>
                        <div style={labelStyle}>Блоков в строке</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {([1, 2, 3] as WidgetColumns[]).map(n => {
                            const selected = widgetColumns === n
                            return (
                              <motion.button
                                key={n}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => setWidgetColumns(n)}
                                role="menuitemradio"
                                aria-checked={selected}
                                aria-label={`${n} в строке`}
                                style={{
                                  flex: 1,
                                  height: 44,
                                  borderRadius: 12,
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: selected ? '#EEDBFF' : 'rgba(255,255,255,0.5)',
                                  color: selected ? '#7B3FCC' : '#9A9AA2',
                                  boxShadow: selected ? 'inset 0 0 0 1.5px #7B3FCC' : 'none',
                                  transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                                }}
                              >
                                <ColumnsGlyph n={n} />
                              </motion.button>
                            )
                          })}
                        </div>

                        {/* Switch to teacher view */}
                        <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '10px -2px' }} />
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { window.location.hash = '#/teacher'; closePicker() }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.8)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.5)' }}
                          style={{
                            width: '100%', marginBottom: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 8, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.5)', color: '#7B3FCC',
                            fontSize: 13.5, fontWeight: 600, transition: 'background 0.15s',
                          }}
                        >
                          <GraduationCap size={16} strokeWidth={1.9} style={{ color: '#7B3FCC' }} />
                          Режим учителя
                        </motion.button>

                        {/* Opens the list modal: reorder by drag + show/hide. */}
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setOrderModalOpen(true); closePicker() }}
                          aria-label="Настроить виджеты"
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.8)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.5)' }}
                          style={{
                            width: '100%',
                            marginTop: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            height: 42,
                            borderRadius: 12,
                            border: 'none',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.5)',
                            color: '#0B0B0D',
                            fontSize: 13.5,
                            fontWeight: 600,
                            transition: 'background 0.15s',
                          }}
                        >
                          <ArrowUpDown size={16} strokeWidth={1.9} style={{ color: '#6F6F76' }} />
                          Настроить виджеты
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}
        </div>
        {/* Width collapses to 0 (instead of popLayout's absolute exit) so the
            name tucks behind the avatar in flow — nothing detaches sideways. */}
        <motion.div
          ref={nameWrapRef}
          initial={false}
          animate={{
            width: isCompact ? 0 : 'auto',
            opacity: isCompact ? 0 : 1,
            marginLeft: isCompact ? 0 : 10,
          }}
          transition={transition}
          // When the widget pill sits beside the bar, `nameMaxWidth` caps the
          // name so the expanded bar + pill still fit the viewport. max-width
          // bounds the animated `width:auto`, turning the span into a definite
          // box that can ellipsize. undefined → no cap (plenty of room / home).
          style={{ overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: nameMaxWidth }}
        >
          <span
            style={{
              display: 'block',
              fontSize: 15,
              fontWeight: 600,
              color: '#0B0B0D',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {student.name}
          </span>
        </motion.div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
        {navItems.map(item => {
          const isActive = activeItem === item.id
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 16px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: isActive ? 600 : 500,
                // Inactive icons go darker in the compact dock for legibility on
                // the bright glass over the dark video.
                color: isActive ? '#7B3FCC' : (isCompact ? '#3A3A40' : '#6F6F76'),
                background: isActive ? '#EEDBFF' : 'transparent',
                transition: 'background 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  // Light lavender hover that previews the purple active state,
                  // so hover/active read as one theme instead of grey-on-lesson
                  // vs purple-on-home.
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = '#F4E9FC'
                  el.style.color = '#7B3FCC'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'transparent'
                  el.style.color = isCompact ? '#3A3A40' : '#6F6F76'
                }
              }}
            >
              {/* Icon and label are siblings that each collapse their own width
                  to 0 — only the active one occupies space, so the button morphs
                  size in flow and the two cross-fade. No absolute positioning,
                  so nothing slides off to the side. */}
              <motion.span
                initial={false}
                animate={{ width: isCompact ? 'auto' : 0, opacity: isCompact ? 1 : 0 }}
                transition={transition}
                style={{ display: 'flex', overflow: 'hidden' }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </motion.span>
              <motion.span
                initial={false}
                animate={{ width: isCompact ? 0 : 'auto', opacity: isCompact ? 0 : 1 }}
                transition={transition}
                style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {item.label}
              </motion.span>
            </motion.button>
          )
        })}
      </nav>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: isCompact ? '#3A3A40' : '#6F6F76',
            background: 'none', border: 'none',
          }}
          aria-label="Уведомления"
        >
          <Bell size={16} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            // A single visible toggle regardless of WHY the bar is compact:
            // expanding clears the manual collapse AND overrides the lesson
            // auto-dock; collapsing sets the manual flag and drops the override.
            if (isCompact) { setCollapsed(false); setForceExpanded(true) }
            else { setCollapsed(true); setForceExpanded(false) }
          }}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: isCompact ? '#3A3A40' : '#6F6F76',
            background: 'none', border: 'none',
          }}
          aria-label={isCompact ? 'Развернуть' : 'Свернуть'}
        >
          {isCompact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      </div>
    </motion.div>

    <WidgetOrderModal open={orderModalOpen} onClose={() => setOrderModalOpen(false)} />
    </>
  )
}
