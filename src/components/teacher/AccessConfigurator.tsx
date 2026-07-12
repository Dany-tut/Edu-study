import { useEffect, useState } from 'react'
import { Lock, BookOpen, Users, LayoutGrid, Copy, Share2, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TEACHER_TABS } from '../../lib/teacherAccess'
import { WIDGET_REGISTRY } from './widgets/registry'
import { useT } from '../../lib/i18n'

// Shared admin control for "what a teacher sees and owns". Works in SELECTED
// (allowed) terms in the UI; callers convert tabs/widgets to the hidden
// complement at save time. Reused by the invite modal (bakes into a token) and
// the per-teacher access editor. Course/group options come from admin_content_list.

export type CourseMode = 'copy' | 'share'
export type CourseAssignment = { course_id: string; mode: CourseMode }

type ContentOpt = { kind: 'course' | 'group'; id: string; title: string; owner_name: string; detail: number }

const ALL_TAB_IDS = TEACHER_TABS.map(t => t.id)
const ALL_WIDGET_TYPES = WIDGET_REGISTRY.map(w => w.type)

// Complement helpers — the single conversion point between UI (selected) and
// storage (hidden deny-list).
export const hiddenTabsFrom = (selected: string[]) => ALL_TAB_IDS.filter(id => !selected.includes(id))
export const hiddenWidgetsFrom = (selected: string[]) => ALL_WIDGET_TYPES.filter(t => !selected.includes(t))
export const selectedTabsFrom = (hidden: string[]) => ALL_TAB_IDS.filter(id => !hidden.includes(id))
export const selectedWidgetsFrom = (hidden: string[]) => ALL_WIDGET_TYPES.filter(t => !hidden.includes(t))

function Chip({ label, on, onToggle, dimmed }: { label: string; on: boolean; onToggle: () => void; dimmed?: boolean }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 11px', borderRadius: 10, cursor: 'pointer',
        border: `1px solid ${on ? 'var(--color-purple)' : 'var(--color-border)'}`,
        background: on ? 'var(--color-purple-soft)' : 'transparent',
        color: on ? 'var(--color-purple)' : 'var(--color-text-3)',
        fontSize: 12.5, fontWeight: 600, transition: 'all 0.12s',
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      {!on && <Lock size={11} strokeWidth={2.4} />}
      {label}
    </button>
  )
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
    {children}
  </div>
)

export default function AccessConfigurator({
  selectedTabs, onTabsChange,
  selectedWidgets, onWidgetsChange,
  courseAssignments, onCoursesChange,
  groupIds, onGroupsChange,
  showContent = true,
}: {
  selectedTabs: string[]
  onTabsChange: (v: string[]) => void
  selectedWidgets: string[]
  onWidgetsChange: (v: string[]) => void
  courseAssignments: CourseAssignment[]
  onCoursesChange: (v: CourseAssignment[]) => void
  groupIds: string[]
  onGroupsChange: (v: string[]) => void
  showContent?: boolean
}) {
  const tr = useT()
  const [courses, setCourses] = useState<ContentOpt[]>([])
  const [groups, setGroups] = useState<ContentOpt[]>([])

  useEffect(() => {
    if (!showContent) return
    supabase.rpc('admin_content_list').then(({ data }) => {
      const rows = (Array.isArray(data) ? data : []) as ContentOpt[]
      setCourses(rows.filter(r => r.kind === 'course'))
      setGroups(rows.filter(r => r.kind === 'group'))
    })
  }, [showContent])

  const homeShown = selectedTabs.includes('home')

  const toggleTab = (id: string) =>
    onTabsChange(selectedTabs.includes(id) ? selectedTabs.filter(x => x !== id) : [...selectedTabs, id])
  const toggleWidget = (t: string) =>
    onWidgetsChange(selectedWidgets.includes(t) ? selectedWidgets.filter(x => x !== t) : [...selectedWidgets, t])

  const courseAssign = (id: string) => courseAssignments.find(c => c.course_id === id)
  const toggleCourse = (id: string) => {
    const cur = courseAssign(id)
    onCoursesChange(cur
      ? courseAssignments.filter(c => c.course_id !== id)
      : [...courseAssignments, { course_id: id, mode: 'copy' as CourseMode }])
  }
  const setCourseMode = (id: string, mode: CourseMode) =>
    onCoursesChange(courseAssignments.map(c => c.course_id === id ? { ...c, mode } : c))

  const toggleGroup = (id: string) =>
    onGroupsChange(groupIds.includes(id) ? groupIds.filter(x => x !== id) : [...groupIds, id])

  const bentoTiles: { key: string; label: string; icon: React.ReactNode; badge?: string }[] = [
    ...TEACHER_TABS.filter(t => selectedTabs.includes(t.id)).map(t => ({ key: `t-${t.id}`, label: t.label, icon: <LayoutGrid size={13} /> })),
    ...courseAssignments.map(a => {
      const c = courses.find(x => x.id === a.course_id)
      return { key: `c-${a.course_id}`, label: c?.title ?? tr('Курс'), icon: <BookOpen size={13} />, badge: a.mode === 'copy' ? tr('копия') : tr('общий') }
    }),
    ...groupIds.map(id => {
      const g = groups.find(x => x.id === id)
      return { key: `g-${id}`, label: g?.title ?? tr('Группа'), icon: <Users size={13} /> }
    }),
  ]

  return (
    <div>
      {/* Sections */}
      <SectionTitle>{tr('Разделы (что видит)')}</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
        {TEACHER_TABS.map(t => (
          <Chip key={t.id} label={t.label} on={selectedTabs.includes(t.id)} onToggle={() => toggleTab(t.id)} />
        ))}
      </div>

      {/* Widgets */}
      <SectionTitle>
        {tr('Виджеты «Главной»')}
        {!homeShown && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-3)', textTransform: 'none', letterSpacing: 0 }}>{tr('· раздел «Главная» скрыт целиком')}</span>}
      </SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: showContent ? 18 : 0, opacity: homeShown ? 1 : 0.45, transition: 'opacity 0.15s' }}>
        {WIDGET_REGISTRY.map(def => (
          <Chip key={def.type} label={def.label} on={selectedWidgets.includes(def.type)} onToggle={() => toggleWidget(def.type)} />
        ))}
      </div>

      {showContent && (
        <>
          {/* Courses */}
          <SectionTitle><BookOpen size={12} /> {tr('Курсы (что получит)')}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {courses.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{tr('Нет курсов.')}</div>
              : courses.map(c => {
                const a = courseAssign(c.id)
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 11, border: `1px solid ${a ? 'var(--color-purple)' : 'var(--color-border)'}`, background: a ? 'var(--color-purple-soft)' : 'transparent' }}>
                    <button onClick={() => toggleCourse(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${a ? 'var(--color-purple)' : 'var(--color-border-medium)'}`, background: a ? 'var(--color-purple)' : 'transparent', color: '#fff' }}>
                        {a && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || '—'}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>· {c.owner_name}</span>
                    </button>
                    {a && (
                      <div style={{ display: 'flex', gap: 3, background: 'var(--color-bg-3)', borderRadius: 8, padding: 2, flexShrink: 0 }}>
                        {([['copy', tr('Копия'), Copy], ['share', tr('Общий'), Share2]] as const).map(([m, label, Icon]) => (
                          <button key={m} onClick={() => setCourseMode(c.id, m)} title={m === 'copy' ? tr('Независимый дубликат') : tr('Общий доступ (read-only)')} style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 600,
                            background: a.mode === m ? 'var(--color-bg)' : 'transparent',
                            color: a.mode === m ? 'var(--color-purple)' : 'var(--color-text-3)',
                          }}>
                            <Icon size={11} strokeWidth={2.2} />{label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>

          {/* Groups */}
          <SectionTitle><Users size={12} /> {tr('Группы / ученики (передать)')}</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
            {groups.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{tr('Нет групп.')}</div>
              : groups.map(g => (
                <Chip key={g.id} label={`${g.title} · ${g.detail}`} on={groupIds.includes(g.id)} onToggle={() => toggleGroup(g.id)} />
              ))}
          </div>
        </>
      )}

      {/* Bento summary */}
      {bentoTiles.length > 0 && (
        <>
          <SectionTitle>{tr('Итог доступа')}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {bentoTiles.map(tile => (
              <div key={tile.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)' }}>
                <span style={{ color: 'var(--color-purple)', flexShrink: 0 }}>{tile.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tile.label}</span>
                {tile.badge && <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--color-purple)', background: 'var(--color-purple-soft)', padding: '2px 5px', borderRadius: 5, flexShrink: 0 }}>{tile.badge}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
