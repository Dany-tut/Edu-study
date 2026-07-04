import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, HardDrive, Users, BookOpen, RefreshCw, ChevronRight, ArrowLeft, UserPlus, X, Mail, Copy, Check, BarChart3, ShieldAlert, SlidersHorizontal, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { copyToClipboard } from '../../lib/clipboard'
import { useTeacher } from '../../store/teacherStore'
import TeacherAnalytics from '../../components/teacher/TeacherAnalytics'
import { TEACHER_TABS } from '../../lib/teacherAccess'
import { WIDGET_REGISTRY } from '../../components/teacher/widgets/registry'
import AccessConfigurator, { hiddenTabsFrom, hiddenWidgetsFrom, selectedTabsFrom, selectedWidgetsFrom, type CourseAssignment } from '../../components/teacher/AccessConfigurator'

type StorageStats = {
  db_bytes: number
  db_limit_bytes: number
  storage_bytes: number
  storage_limit_bytes: number
  attachments_bytes: number
}

type TeacherRow = {
  id: string
  name: string
  username: string | null
  subject: string | null
  role: string
  created_at: string
  groupCount: number
  studentCount: number
  hiddenTabs: string[]
  hiddenWidgets: string[]
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} МБ`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ГБ`
}

function pct(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100))
}

function MiniBar({ value }: { value: number }) {
  const color = value >= 85 ? '#E04848' : value >= 60 ? '#D07020' : '#3FA867'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-bg-3)' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-text-3)', minWidth: 28, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [selectedTabs, setSelectedTabs] = useState<string[]>(TEACHER_TABS.map(t => t.id))
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(WIDGET_REGISTRY.map(w => w.type))
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])

  async function createInvite() {
    setCreating(true); setError('')
    const { data, error: err } = await supabase.rpc('admin_create_teacher_invite', {
      p_email: email.trim() || null,
      p_hidden_tabs: hiddenTabsFrom(selectedTabs),
      p_hidden_widgets: hiddenWidgetsFrom(selectedWidgets),
      p_course_assignments: courseAssignments,
      p_group_ids: groupIds,
    })
    setCreating(false)
    if (err || !data) { setError(err?.message || 'Не удалось создать приглашение'); return }
    setLink(`${window.location.origin}${window.location.pathname}#/join-teacher?token=${data}`)
  }

  function copyLink() {
    void copyToClipboard(link).then(ok => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900, backdropFilter: 'blur(4px)' }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 901, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: 20 }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        style={{
          pointerEvents: 'auto',
          width: 560, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto',
          background: 'var(--color-bg-2)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 24, padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Пригласить учителя</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>Выберите доступ и контент — они «запекутся» в ссылку</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
            <X size={14} />
          </button>
        </div>

        {link ? (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={20} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Приглашение готово</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Отправьте ссылку учителю — доступ применится при регистрации.</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', borderRadius: 12, padding: '10px 12px', wordBreak: 'break-all', marginBottom: 12 }}>{link}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyLink} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} />}
                {copied ? 'Скопировано!' : 'Скопировать ссылку'}
              </button>
              <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Готово</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>Email учителя (необязательно, подставится в форму)</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 12, border: '1px solid var(--color-border-medium)',
                    background: 'var(--color-bg-3)', color: 'var(--color-text)',
                    fontSize: 14, outline: 'none',
                  }}
                />
              </div>
            </div>

            <AccessConfigurator
              selectedTabs={selectedTabs} onTabsChange={setSelectedTabs}
              selectedWidgets={selectedWidgets} onWidgetsChange={setSelectedWidgets}
              courseAssignments={courseAssignments} onCoursesChange={setCourseAssignments}
              groupIds={groupIds} onGroupsChange={setGroupIds}
            />

            {error && <div style={{ fontSize: 11, color: '#E04848', marginTop: 12 }}>{error}</div>}

            <button
              onClick={createInvite}
              disabled={creating}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none', marginTop: 18,
                background: 'var(--grad-purple)', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: creating ? 'wait' : 'pointer',
              }}
            >
              {creating ? 'Создаём…' : 'Создать пригласительную ссылку'}
            </button>
          </>
        )}
      </motion.div>
      </div>
    </>,
    document.body
  )
}


function AccessEditor({ teacher, onSaved }: { teacher: TeacherRow; onSaved: (hiddenTabs: string[], hiddenWidgets: string[]) => void }) {
  const [selectedTabs, setSelectedTabs] = useState<string[]>(selectedTabsFrom(teacher.hiddenTabs))
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(selectedWidgetsFrom(teacher.hiddenWidgets))
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    // 1. Access deny-lists (complement of the selected sections/widgets).
    const hiddenTabs = hiddenTabsFrom(selectedTabs)
    const hiddenWidgets = hiddenWidgetsFrom(selectedWidgets)
    const { error: err } = await supabase.rpc('admin_set_teacher_access', {
      p_teacher: teacher.id,
      p_hidden_tabs: hiddenTabs,
      p_hidden_widgets: hiddenWidgets,
    })
    if (err) { setSaving(false); setError(err.message); return }

    // 2. Provision selected content to this teacher (incremental — cleared after).
    try {
      for (const a of courseAssignments) {
        if (a.mode === 'copy') {
          const { error: e } = await supabase.rpc('admin_duplicate_course', { p_course_id: a.course_id, p_new_owner: teacher.id })
          if (e) throw e
        } else {
          const { error: e } = await supabase.from('course_shares').upsert({ course_id: a.course_id, teacher_id: teacher.id })
          if (e) throw e
        }
      }
      for (const gid of groupIds) {
        const { error: e } = await supabase.rpc('admin_reassign_content', { p_kind: 'group', p_id: gid, p_new_owner: teacher.id })
        if (e) throw e
      }
    } catch (e: any) {
      setSaving(false); setError('Доступы сохранены, но контент выдать не удалось: ' + (e?.message ?? e)); return
    }

    setSaving(false)
    setCourseAssignments([]); setGroupIds([])
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    onSaved(hiddenTabs, hiddenWidgets)
  }

  return (
    <div style={{ padding: '4px 18px 18px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 14, lineHeight: 1.5 }}>
        Отметьте разделы/виджеты, которые учитель <b>видит</b>, и курсы/группы, которые ему <b>выдать</b>. Курсы/группы применяются при сохранении.
      </div>

      <AccessConfigurator
        selectedTabs={selectedTabs} onTabsChange={setSelectedTabs}
        selectedWidgets={selectedWidgets} onWidgetsChange={setSelectedWidgets}
        courseAssignments={courseAssignments} onCoursesChange={setCourseAssignments}
        groupIds={groupIds} onGroupsChange={setGroupIds}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '9px 20px', borderRadius: 12, border: 'none',
            background: 'var(--grad-purple)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {saved ? <Check size={14} strokeWidth={2.6} /> : null}
          {saving ? 'Сохраняем…' : saved ? 'Сохранено' : 'Сохранить'}
        </button>
        {error && <span style={{ fontSize: 11, color: '#E04848' }}>{error}</span>}
      </div>
    </div>
  )
}

type ContentRow = {
  kind: 'course' | 'group'
  id: string
  short_id: string | null
  title: string
  status: string | null
  owner_id: string | null
  owner_name: string
  detail: number
}

// Admin-only cross-teacher content manager: see every course / group with its
// owner, reassign ownership, or delete it. Backed by admin_* RPCs (RLS-bypassing
// but is_admin()-gated). This is how the admin cleans up ownerless/legacy data
// that would otherwise leak into new teachers' cabinets.
function ContentManager({ teachers }: { teachers: TeacherRow[] }) {
  const [rows, setRows] = useState<ContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<ContentRow | null>(null)
  const [filter, setFilter] = useState<'all' | 'course' | 'group'>('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('admin_content_list')
    setRows(Array.isArray(data) ? (data as ContentRow[]) : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function reassign(row: ContentRow, newOwner: string) {
    if (newOwner === (row.owner_id ?? '')) return
    setBusyId(row.id)
    await supabase.rpc('admin_reassign_content', { p_kind: row.kind, p_id: row.id, p_new_owner: newOwner })
    await load()
    setBusyId(null)
  }

  async function doDelete(row: ContentRow) {
    setBusyId(row.id)
    await supabase.rpc('admin_delete_content', { p_kind: row.kind, p_id: row.id })
    setConfirmDel(null)
    await load()
    setBusyId(null)
  }

  const shown = rows.filter(r => filter === 'all' || r.kind === filter)
  const orphanCount = rows.filter(r => !r.owner_id).length

  return (
    <div>
      {/* Filter + orphan warning */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 10, padding: 3 }}>
          {([['all', 'Всё'], ['course', 'Курсы'], ['group', 'Группы']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: filter === id ? 'var(--color-purple-soft)' : 'transparent',
              color: filter === id ? 'var(--color-purple)' : 'var(--color-text-3)',
            }}>{label}</button>
          ))}
        </div>
        {orphanCount > 0 && (
          <span style={{ fontSize: 12, color: '#D07020', fontWeight: 600 }}>
            {orphanCount} без владельца
          </span>
        )}
        <button onClick={load} title="Обновить" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Обновить
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>Загрузка…</div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>Пусто.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(row => (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
              borderRadius: 14, padding: '12px 14px',
              opacity: busyId === row.id ? 0.5 : 1,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-bg-3)', color: 'var(--color-text-3)',
              }}>
                {row.kind === 'course' ? <BookOpen size={15} strokeWidth={2} /> : <Users size={15} strokeWidth={2} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.title || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                  {row.kind === 'course'
                    ? `Курс · ${row.detail} уроков${row.status ? ` · ${row.status === 'published' ? 'опубликован' : 'черновик'}` : ''}`
                    : `Группа · ${row.detail} учеников`}
                </div>
              </div>
              {/* Owner select */}
              <select
                value={row.owner_id ?? ''}
                disabled={busyId === row.id}
                onChange={e => reassign(row, e.target.value)}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 8px', borderRadius: 9,
                  border: `1px solid ${row.owner_id ? 'var(--color-border-medium)' : '#D07020'}`,
                  background: 'var(--color-bg-3)', color: 'var(--color-text)', cursor: 'pointer',
                  maxWidth: 160,
                }}
              >
                {!row.owner_id && <option value="">— без владельца —</option>}
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.role === 'admin' ? ' (Босс)' : ''}</option>
                ))}
              </select>
              <button
                onClick={() => setConfirmDel(row)}
                disabled={busyId === row.id}
                title="Удалить"
                style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', color: '#E04848',
                }}
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDel && createPortal(
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDel(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 380, maxWidth: '90vw', background: 'var(--color-bg)', border: '1px solid var(--color-border-medium)', borderRadius: 18, padding: 22 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <ShieldAlert size={18} strokeWidth={2} style={{ color: '#E04848' }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>Удалить безвозвратно?</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 18 }}>
                {confirmDel.kind === 'course'
                  ? <>Курс <b>«{confirmDel.title}»</b> и все его уроки/модули будут удалены навсегда.</>
                  : <>Группа <b>«{confirmDel.title}»</b> со всеми учениками, расписанием, ДЗ и журналом будет удалена навсегда.</>}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDel(null)} style={{ padding: '8px 16px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
                <button onClick={() => doDelete(confirmDel)} style={{ padding: '8px 16px', borderRadius: 11, border: 'none', background: '#E04848', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Удалить</button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TeacherAdminPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [groupCount, setGroupCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tab, setTab] = useState<'overview' | 'data' | 'analytics'>('overview')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(data.user?.user_metadata?.role === 'admin')
    })
  }, [])

  async function load() {
    setLoading(true)
    const [storageRes, groupsRes, studentsRes, teachersRes] = await Promise.all([
      supabase.rpc('storage_stats'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.rpc('admin_teacher_list'),
    ])

    if (storageRes.data) setStorage(storageRes.data as StorageStats)
    setGroupCount(groupsRes.count ?? 0)
    setStudentCount(studentsRes.count ?? 0)

    if (Array.isArray(teachersRes.data)) {
      setTeachers((teachersRes.data as any[]).map(t => ({
        id: t.id,
        name: t.name ?? '—',
        username: t.username ?? null,
        subject: t.subject ?? null,
        role: t.role ?? 'teacher',
        created_at: t.created_at,
        groupCount: Number(t.group_count ?? 0),
        studentCount: Number(t.student_count ?? 0),
        hiddenTabs: (t.hidden_tabs as string[] | null) ?? [],
        hiddenWidgets: (t.hidden_widgets as string[] | null) ?? [],
      })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const dbPct = storage ? pct(storage.db_bytes, storage.db_limit_bytes) : 0
  const storagePct = storage ? pct(storage.storage_bytes, storage.storage_limit_bytes) : 0

  // Admin-only area. Teachers never reach it (menu item is hidden), but guard
  // the page too in case activePage is set some other way.
  if (isAdmin === false) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-3)' }}>
          <ShieldAlert size={32} strokeWidth={1.6} style={{ opacity: 0.6 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 10 }}>Раздел доступен только администратору</div>
          <button onClick={() => setActivePage('home')} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            На главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setActivePage('home')}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'var(--color-bg-3)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--color-text-3)', flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>Администрирование</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>Управление платформой</div>
          </div>
          {tab === 'overview' && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={load}
              title="Обновить"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Обновить
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 12, padding: 3, marginBottom: 24, width: 'fit-content' }}>
          {([['overview', 'Обзор', Database], ['data', 'Данные', BookOpen], ['analytics', 'Аналитика', BarChart3]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: tab === id ? 'var(--color-purple-soft)' : 'transparent',
                color: tab === id ? 'var(--color-purple)' : 'var(--color-text-3)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'analytics' && <TeacherAnalytics />}

        {tab === 'data' && <ContentManager teachers={teachers} />}

        {tab === 'overview' && (
        <>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard icon={Users} label="Учителей" value={String(teachers.length)} sub="активных аккаунтов" />
          <StatCard icon={BookOpen} label="Групп" value={String(groupCount)} sub={`${studentCount} учеников`} />
          <StatCard
            icon={Database}
            label="База данных"
            value={storage ? fmtBytes(storage.db_bytes) : '—'}
            sub={storage ? `${dbPct}% занято` : 'загрузка…'}
          />
        </div>

        {/* Teachers */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Учителя</div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setInviteOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 12, border: 'none',
                background: 'var(--grad-purple)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(106,90,230,0.35)',
              }}
            >
              <UserPlus size={13} strokeWidth={2.5} />
              Добавить учителя
            </motion.button>
          </div>
          <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
            {teachers.map((t, i) => {
              const initials = t.name.slice(0, 2).toUpperCase()
              const isTeacher = t.role !== 'admin'
              const expanded = expandedId === t.id
              const restrictCount = t.hiddenTabs.length + t.hiddenWidgets.length
              return (
                <div key={t.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {t.name}
                        {t.role === 'admin' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-purple)', background: 'rgba(155,109,255,0.12)', borderRadius: 6, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: 0.3 }}>admin</span>
                        )}
                        {isTeacher && restrictCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', background: 'var(--color-bg-3)', borderRadius: 6, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Lock size={9} strokeWidth={2.6} />{restrictCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {t.username && <span>@{t.username}</span>}
                        {t.subject && <><span>·</span><span>{t.subject}</span></>}
                        <span>·</span>
                        <span>{t.groupCount} групп · {t.studentCount} учеников</span>
                      </div>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : t.id)}
                        title="Настроить доступы"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                          padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                          border: '1px solid var(--color-border-medium)',
                          background: expanded ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                          color: expanded ? 'var(--color-purple)' : 'var(--color-text-3)',
                          fontSize: 12, fontWeight: 600, transition: 'all 0.12s',
                        }}
                      >
                        <SlidersHorizontal size={13} strokeWidth={2} />
                        Доступы
                      </button>
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <AccessEditor
                          teacher={t}
                          onSaved={(ht, hw) => setTeachers(prev => prev.map(x => x.id === t.id ? { ...x, hiddenTabs: ht, hiddenWidgets: hw } : x))}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
            {teachers.length === 0 && (
              <div style={{ padding: '20px 18px', color: 'var(--color-text-3)', fontSize: 13 }}>{loading ? 'Загрузка…' : 'Нет данных'}</div>
            )}
          </div>
        </div>

        {/* Storage */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Хранилище</div>
          <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Database size={16} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>База данных</div>
                <MiniBar value={dbPct} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>{storage ? fmtBytes(storage.db_bytes) : '—'}</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <HardDrive size={16} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Файловое хранилище</div>
                <MiniBar value={storagePct} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', flexShrink: 0 }}>{storage ? fmtBytes(storage.storage_bytes) : '—'}</span>
            </div>
            <div
              onClick={() => setActivePage('storage')}
              style={{ padding: '10px 18px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}
            >
              Подробная статистика <ChevronRight size={13} />
            </div>
          </div>
        </div>
        </>
        )}

      </div>

      <AnimatePresence>
        {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
