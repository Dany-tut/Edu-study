import { useState, useEffect } from 'react'
import Skeleton from '../../components/Skeleton'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, HardDrive, Users, BookOpen, RefreshCw, ChevronRight, ArrowLeft, UserPlus, X, Mail, Copy, Check, BarChart3, ShieldAlert, SlidersHorizontal, Lock, KeyRound, Trash2, Inbox, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { copyToClipboard } from '../../lib/clipboard'
import { useTeacher } from '../../store/teacherStore'
import TeacherAnalytics from '../../components/teacher/TeacherAnalytics'
import AdminUserActivity from '../../components/teacher/AdminUserActivity'
import FeedbackRequestsManager from '../../components/teacher/FeedbackRequestsManager'
import { TEACHER_TABS } from '../../lib/teacherAccess'
import { WIDGET_REGISTRY } from '../../components/teacher/widgets/registry'
import Checkbox from '../../components/Checkbox'
import Switch from '../../components/Switch'
import { fetchAppFlags, setAppFlag } from '../../lib/cardGroups'
import AccessConfigurator, { hiddenTabsFrom, hiddenWidgetsFrom, selectedTabsFrom, selectedWidgetsFrom, type CourseAssignment } from '../../components/teacher/AccessConfigurator'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { PLAN_OPTIONS, adminSetTeacherPlan, type TeacherPlanRow } from '../../lib/plan'
import { useT, t as tGlobal } from '../../lib/i18n'
import { authErrorRu } from '../../lib/authErrors'
import { getAuthUser } from '../../lib/owner'

// Маркер «без тарифа» для дропдауна (в БД это NULL).
const NO_PLAN = '__no_plan__'

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
  subjects: string[]
}

// A teacher who was invited but hasn't signed up yet — lives only in
// teacher_invites (consumed_at IS NULL), not in profiles.
type PendingInvite = {
  token: string
  email: string | null
  createdAt: string
  createdByName: string | null
}

// A course/group the teacher already has (from admin_teacher_content).
type TeacherContentRow = {
  kind: 'course' | 'group'
  id: string
  title: string
  via: 'owned' | 'shared'
  detail: number
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ${tGlobal('КБ')}`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} ${tGlobal('МБ')}`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ${tGlobal('ГБ')}`
}

function pct(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100))
}

function StorageTile({ icon: Icon, label, value, pct: value_pct }: { icon: React.ElementType; label: string; value: string; pct: number }) {
  const color = value_pct >= 85 ? '#E04848' : value_pct >= 60 ? '#D07020' : '#3FA867'
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-3)', fontSize: 12, fontWeight: 500 }}>
        <Icon size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0 8px' }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>· {value_pct}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
        <div style={{ width: `${value_pct}%`, height: '100%', borderRadius: 2, background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, loading }: { icon: React.ElementType; label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      {loading ? (
        <>
          <Skeleton w={72} h={26} radius={7} />
          {sub !== undefined && <Skeleton w={100} h={11} radius={5} style={{ marginTop: 8 }} />}
        </>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
        </>
      )}
    </div>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [selectedTabs, setSelectedTabs] = useState<string[]>(TEACHER_TABS.map(t => t.id))
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(WIDGET_REGISTRY.map(w => w.type))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]) // empty = all subjects
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
      p_subjects: selectedSubjects,
    })
    setCreating(false)
    if (err || !data) { setError(t(authErrorRu(err, 'Не удалось создать приглашение'))); return }
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
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t('Пригласить учителя')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{t('Выберите доступ и контент — они «запекутся» в ссылку')}</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Приглашение готово')}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Отправьте ссылку учителю — доступ применится при регистрации.')}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', borderRadius: 12, padding: '10px 12px', wordBreak: 'break-all', marginBottom: 12 }}>{link}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyLink} style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <Check size={15} strokeWidth={2.5} /> : <Copy size={15} />}
                {copied ? t('Скопировано!') : t('Скопировать ссылку')}
              </button>
              <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('Готово')}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>{t('Email учителя (необязательно, подставится в форму)')}</label>
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
              subjects={selectedSubjects} onSubjectsChange={setSelectedSubjects}
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
              {creating ? t('Создаём…') : t('Создать пригласительную ссылку')}
            </button>
          </>
        )}
      </motion.div>
      </div>
    </>,
    document.body
  )
}


/**
 * Функции продукта — переключатели из app_flags.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ПАНЕЛЬ, А НЕ КОНСТАНТА В КОДЕ. Часть возможностей выкатывают
 * раньше, чем решают, показывать ли их всем: «ученик собирает свои наборы
 * карточек» написан целиком и лежит выключенным. Переключить его — решение
 * продуктовое, а не сборочное, и приниматься оно должно в проде, без деплоя.
 *
 * ТОЛЬКО У АДМИНА. Это рубильник на весь продукт: учитель не должен включать
 * фичу чужим ученикам (политика на app_flags так и написана).
 */
/**
 * Рубильники платных обращений к модели.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ БЛОКОМ, А НЕ СТРОКОЙ В «ФУНКЦИЯХ». Остальные флаги отвечают
 * на вопрос «показывать ли это ученику» и ничего не стоят. Эти — про деньги:
 * пока они подняты, платформа сама ходит в модель по ночам. Такое нельзя
 * прятать среди настроек видимости, и форма другая по той же причине —
 * переключатель («работает или нет»), а не галочка («выбрано из списка»).
 *
 * СВЯЗКА. Верхний ряд — стоп-кран: пока он опущен, остальные не работают, и
 * экран это показывает (гасит их и подписывает). Так рубильник читается как
 * «выключить всё», а не как «ещё один флаг из списка».
 */
// Первая фраза описания — название задачи, остальное — что будет, если её
// выключить. Печатать `about` целиком нельзя: заголовок повторялся бы строкой
// ниже слово в слово.
const head = (about: string) => about.split(/(?<=\.)\s+/)[0]?.replace(/\.$/, '') ?? ''
const tail = (about: string) => about.split(/(?<=\.)\s+/).slice(1).join(' ')

function AiSwitches() {
  const t = useT()
  const [rows, setRows] = useState<Array<{ key: string; enabled: boolean; about: string }>>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchAppFlags().then(list => {
      if (!alive) return
      // Общий рубильник — всегда первой строкой, остальные по алфавиту следом.
      const ai = list.filter(r => r.key.startsWith('ai_'))
      setRows([...ai.filter(r => r.key === 'ai_enabled'), ...ai.filter(r => r.key !== 'ai_enabled')])
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  async function toggle(key: string, on: boolean) {
    setBusy(key)
    // Как и в «Функциях»: показываем сразу, откатываем, если база отказала.
    setRows(list => list.map(r => (r.key === key ? { ...r, enabled: on } : r)))
    const ok = await setAppFlag(key, on)
    if (!ok) setRows(list => list.map(r => (r.key === key ? { ...r, enabled: !on } : r)))
    setBusy(null)
  }

  if (loading || rows.length === 0) return null
  const master = rows.find(r => r.key === 'ai_enabled')?.enabled ?? true

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <Sparkles size={13} strokeWidth={2.5} style={{ color: 'var(--color-purple)' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('Расход на ИИ')}
        </div>
      </div>
      <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
        {rows.map((r, i) => {
          const isMaster = r.key === 'ai_enabled'
          const muted = !isMaster && !master
          return (
            <div
              key={r.key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 18px',
                borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                background: isMaster ? 'var(--color-bg-3)' : undefined,
                opacity: muted ? 0.45 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: isMaster ? 700 : 600, color: 'var(--color-text)' }}>
                  {isMaster ? t('Обращения к модели разрешены') : (head(r.about) || r.key)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 3, lineHeight: 1.45 }}>
                  {isMaster
                    ? t('Пока выключено, ни одна задача ниже не работает — даже поднятая.')
                    : tail(r.about)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', opacity: 0.7, marginTop: 3 }}>{r.key}</div>
              </div>
              <Switch
                checked={r.enabled}
                disabled={busy === r.key}
                onChange={v => toggle(r.key, v)}
                label={r.about || r.key}
              />
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.5 }}>
        {t('Ночная сборка ленты читает эти рубильники перед первым запросом к модели: выключенная задача стоит ноль. Изменение действует со следующего прогона (04:30 UTC).')}
      </div>
    </div>
  )
}

function FeatureFlags() {
  const t = useT()
  const [rows, setRows] = useState<Array<{ key: string; enabled: boolean; about: string }>>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    // Рубильники ИИ отсюда убраны намеренно: у них свой блок выше. Здесь —
    // «что показывать ученику», там — «на что тратить деньги».
    fetchAppFlags().then(list => { if (alive) { setRows(list.filter(r => !r.key.startsWith('ai_'))); setLoading(false) } })
    return () => { alive = false }
  }, [])

  async function toggle(key: string, on: boolean) {
    setBusy(key)
    // Экран показывает новое состояние сразу, но откатывается, если база
    // отказала: молчаливо соврать про рубильник хуже, чем моргнуть галочкой.
    setRows(list => list.map(r => (r.key === key ? { ...r, enabled: on } : r)))
    const ok = await setAppFlag(key, on)
    if (!ok) setRows(list => list.map(r => (r.key === key ? { ...r, enabled: !on } : r)))
    setBusy(null)
  }

  if (loading || rows.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
        {t('Функции')}
      </div>
      <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.key} style={{ padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
            <Checkbox
              checked={r.enabled}
              disabled={busy === r.key}
              align="start"
              onChange={v => toggle(r.key, v)}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>{r.about || r.key}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 2 }}>{r.key}</div>
              </div>
            </Checkbox>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccessEditor({ teacher, onSaved }: { teacher: TeacherRow; onSaved: (hiddenTabs: string[], hiddenWidgets: string[], subjects: string[]) => void }) {
  const t = useT()
  const [selectedTabs, setSelectedTabs] = useState<string[]>(selectedTabsFrom(teacher.hiddenTabs))
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(selectedWidgetsFrom(teacher.hiddenWidgets))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(teacher.subjects) // empty = all
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  // Password reset (admin-only): teachers pick their own password on sign-up and
  // it's an unreadable Auth hash — this issues a NEW one, shown once to relay.
  const [pwLoading, setPwLoading] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwCopied, setPwCopied] = useState(false)
  // What the teacher ALREADY has (read-only) — owned/shared courses + owned groups.
  const [current, setCurrent] = useState<TeacherContentRow[] | null>(null)
  // Тариф (0037): null = подписка не назначена (бета-аккаунт, без лимитов).
  const [plan, setPlan] = useState<string | null>(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [planSaved, setPlanSaved] = useState(false)
  const [planError, setPlanError] = useState('')

  useEffect(() => {
    let alive = true
    supabase.rpc('admin_teacher_content', { p_teacher: teacher.id }).then(({ data }) => {
      if (!alive) return
      setCurrent(Array.isArray(data) ? (data as TeacherContentRow[]) : [])
    })
    supabase.rpc('admin_teacher_plans').then(({ data }) => {
      if (!alive) return
      const row = (Array.isArray(data) ? (data as TeacherPlanRow[]) : []).find(r => r.teacher_id === teacher.id)
      setPlan(row?.plan_code ?? null)
    })
    return () => { alive = false }
  }, [teacher.id])

  async function savePlan(next: string | null) {
    setPlan(next)
    setPlanSaving(true); setPlanError(''); setPlanSaved(false)
    const err = await adminSetTeacherPlan(teacher.id, next)
    setPlanSaving(false)
    if (err) { setPlanError(err); return }
    setPlanSaved(true)
    setTimeout(() => setPlanSaved(false), 1800)
  }

  async function resetPassword() {
    setPwLoading(true); setPwError(''); setPwValue('')
    const { data, error: err } = await supabase.functions.invoke('reset-teacher-password', {
      body: { teacherId: teacher.id },
    })
    setPwLoading(false)
    if (err || !data?.password) {
      const msg = (data as { error?: string } | null)?.error || t(authErrorRu(err, 'Не удалось сбросить пароль'))
      setPwError(msg); return
    }
    setPwValue(data.password as string)
  }

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
    if (err) { setSaving(false); setError(t(authErrorRu(err))); return }

    // 1b. Subject scope (empty = all).
    const { error: sErr } = await supabase.rpc('admin_set_teacher_subjects', {
      p_teacher: teacher.id,
      p_subjects: selectedSubjects,
    })
    if (sErr) { setSaving(false); setError(t(authErrorRu(sErr))); return }

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
      setSaving(false); setError(t('Доступы сохранены, но контент выдать не удалось:') + ' ' + t(authErrorRu(e))); return
    }

    setSaving(false)
    setCourseAssignments([]); setGroupIds([])
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    onSaved(hiddenTabs, hiddenWidgets, selectedSubjects)
  }

  return (
    <div style={{ padding: '4px 18px 18px' }}>
      {/* Read-only: what the teacher ALREADY has. The picker below is "give more". */}
      {current && current.length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--color-bg-3)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{t('Уже у учителя')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {current.map(r => (
              <span key={`${r.kind}-${r.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 8, padding: '4px 9px' }}>
                {r.kind === 'course' ? <BookOpen size={12} strokeWidth={2} /> : <Users size={12} strokeWidth={2} />}
                {r.title}
                <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}>
                  · {r.kind === 'course' ? `${r.detail} ${t('ур.')}` : `${r.detail} ${t('уч.')}`}{r.via === 'shared' ? ' · share' : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 14, lineHeight: 1.5 }}>
        {t('Отметьте разделы/виджеты, которые учитель')} <b>{t('видит')}</b>{t(', и курсы/группы, которые ему')} <b>{t('выдать')}</b>{t('. Курсы/группы применяются при сохранении.')}
      </div>

      <AccessConfigurator
        selectedTabs={selectedTabs} onTabsChange={setSelectedTabs}
        selectedWidgets={selectedWidgets} onWidgetsChange={setSelectedWidgets}
        courseAssignments={courseAssignments} onCoursesChange={setCourseAssignments}
        groupIds={groupIds} onGroupsChange={setGroupIds}
        subjects={selectedSubjects} onSubjectsChange={setSelectedSubjects}
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
          {saving ? t('Сохраняем…') : saved ? t('Сохранено') : t('Сохранить')}
        </button>
        {error && <span style={{ fontSize: 11, color: '#E04848' }}>{error}</span>}
      </div>

      {/* Тариф (0037): ручное назначение админом; «без тарифа» = бета-аккаунт,
          лимит учеников не применяется. Оплата пока вне системы (ручные счета). */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{t('Тариф')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* NO_PLAN — свой маркер вместо '': пустую строку TeacherSelect трактует
              как «нет выбора» и такую опцию не показывает. */}
          <div style={{ width: 260, pointerEvents: planSaving ? 'none' : undefined, opacity: planSaving ? 0.6 : 1 }}>
            <TeacherSelect
              value={plan ?? NO_PLAN}
              onChange={v => { void savePlan(v === NO_PLAN ? null : v) }}
              options={PLAN_OPTIONS.map(o => ({ value: o.code ?? NO_PLAN, label: t(o.label) }))}
              clearable={false}
              triggerStyle={{
                padding: '8px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)',
                color: 'var(--color-text-2)',
              }}
            />
          </div>
          {planSaving && <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('Сохраняем…')}</span>}
          {planSaved && <Check size={14} strokeWidth={2.6} style={{ color: '#3FA867' }} />}
          {planError && <span style={{ fontSize: 11, color: '#E04848' }}>{planError}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.5 }}>
          {t('Лимит учеников применяется при добавлении новых. «Без тарифа» — внутренний/бета-аккаунт без ограничений.')}
        </div>
      </div>

      {/* Password reset — teachers have no readable password (self-chosen Auth
          hash); admin can issue a new one and relay it. */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={resetPassword}
            disabled={pwLoading}
            style={{
              padding: '8px 16px', borderRadius: 12, cursor: pwLoading ? 'wait' : 'pointer',
              border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)',
              color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <KeyRound size={13} strokeWidth={2} />
            {pwLoading ? t('Сбрасываем…') : t('Сбросить пароль')}
          </button>
          {pwValue && (
            <div
              onClick={() => { void copyToClipboard(pwValue).then(ok => { if (ok) { setPwCopied(true); setTimeout(() => setPwCopied(false), 1500) } }) }}
              title={t('Скопировать')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '7px 12px', borderRadius: 10,
                background: 'var(--color-purple-soft)', border: '1px solid rgba(155,109,255,0.3)',
              }}
            >
              <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-purple)', letterSpacing: 0.4 }}>{pwValue}</code>
              {pwCopied ? <Check size={13} strokeWidth={2.6} style={{ color: 'var(--color-purple)' }} /> : <Copy size={13} style={{ color: 'var(--color-purple)' }} />}
            </div>
          )}
          {pwError && <span style={{ fontSize: 11, color: '#E04848' }}>{pwError}</span>}
        </div>
        {pwValue && (
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.5 }}>
            {t('Новый пароль показан один раз — скопируйте и передайте учителю. Он войдёт с ним и сможет сменить его сам.')}
          </div>
        )}
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
  const t = useT()
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
            }}>{t(label)}</button>
          ))}
        </div>
        {orphanCount > 0 && (
          <span style={{ fontSize: 12, color: '#D07020', fontWeight: 600 }}>
            {orphanCount} {t('без владельца')}
          </span>
        )}
        <button onClick={load} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {t('Обновить')}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ padding: '24px 0' }}><Skeleton.List rows={4} /></div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>{t('Пусто.')}</div>
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
                    ? `${t('Курс')} · ${row.detail} ${t('уроков')}${row.status ? ` · ${row.status === 'published' ? t('опубликован') : t('черновик')}` : ''}`
                    : `${t('Группа')} · ${row.detail} ${t('учеников')}`}
                </div>
              </div>
              {/* Owner select — canonical styled dropdown */}
              <div style={{ width: 168, flexShrink: 0, pointerEvents: busyId === row.id ? 'none' : 'auto' }}>
                <TeacherSelect
                  small
                  clearable={false}
                  placeholder={t('— без владельца —')}
                  value={row.owner_id ?? ''}
                  onChange={v => reassign(row, v)}
                  options={teachers.map(tc => ({ value: tc.id, label: `${tc.name}${tc.role === 'admin' ? ` (${t('Босс')})` : ''}` }))}
                  triggerStyle={{
                    padding: '7px 10px', borderRadius: 9, fontWeight: 600,
                    background: 'var(--color-bg-3)',
                    border: `1px solid ${row.owner_id ? 'var(--color-border-medium)' : '#D07020'}`,
                  }}
                />
              </div>
              <button
                onClick={() => setConfirmDel(row)}
                disabled={busyId === row.id}
                title={t('Удалить')}
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
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{t('Удалить безвозвратно?')}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 18 }}>
                {confirmDel.kind === 'course'
                  ? <>{t('Курс')} <b>«{confirmDel.title}»</b> {t('и все его уроки/модули будут удалены навсегда.')}</>
                  : <>{t('Группа')} <b>«{confirmDel.title}»</b> {t('со всеми учениками, расписанием, ДЗ и журналом будет удалена навсегда.')}</>}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDel(null)} style={{ padding: '8px 16px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('Отмена')}</button>
                <button onClick={() => doDelete(confirmDel)} style={{ padding: '8px 16px', borderRadius: 11, border: 'none', background: '#E04848', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('Удалить')}</button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}

type AdminTaskRow = {
  id: string
  owner_id: string | null
  owner_name: string
  type_label: string | null
  title: string
  date: string | null
  time: string | null
  comment: string | null
  done: boolean
}

// Admin-only cross-teacher tasks manager: see every teacher's "Мои задачи",
// reassign a task to another teacher, or delete it. Backed by admin_tasks_*
// RPCs (RLS-bypassing but is_admin()-gated).
function TasksManager({ teachers }: { teachers: TeacherRow[] }) {
  const t = useT()
  const [rows, setRows] = useState<AdminTaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('admin_tasks_list')
    setRows(Array.isArray(data) ? (data as AdminTaskRow[]) : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function reassign(row: AdminTaskRow, newOwner: string) {
    if (newOwner === (row.owner_id ?? '')) return
    setBusyId(row.id)
    await supabase.rpc('admin_reassign_task', { p_id: row.id, p_new_owner: newOwner })
    await load()
    setBusyId(null)
  }

  async function doDelete(row: AdminTaskRow) {
    setBusyId(row.id)
    await supabase.rpc('admin_delete_task', { p_id: row.id })
    await load()
    setBusyId(null)
  }

  // Group tasks under their owner for a clear per-teacher view.
  const groups = teachers
    .map(tt => ({ teacher: tt, tasks: rows.filter(r => r.owner_id === tt.id) }))
    .filter(g => g.tasks.length > 0)
  const orphans = rows.filter(r => !r.owner_id || !teachers.some(tt => tt.id === r.owner_id))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('Задачи учителей')}
        </div>
        <button onClick={load} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {t('Обновить')}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ padding: '24px 0' }}><Skeleton.List rows={4} /></div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>{t('Ни у кого нет задач.')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[...groups.map(g => ({ label: g.teacher.name, ownerId: g.teacher.id, tasks: g.tasks })),
            ...(orphans.length ? [{ label: t('Без владельца'), ownerId: null as string | null, tasks: orphans }] : [])]
            .map(group => (
            <div key={group.ownerId ?? 'orphan'}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 8 }}>
                {group.label} <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}>· {group.tasks.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.tasks.map(row => (
                  <div key={row.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
                    borderRadius: 14, padding: '12px 14px',
                    opacity: busyId === row.id ? 0.5 : (row.done ? 0.6 : 1),
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: row.done ? 'line-through' : 'none' }}>
                        {row.type_label ? `${row.type_label} · ` : ''}{row.title || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                        {[row.date, row.time].filter(Boolean).join(' · ') || t('без даты')}{row.done ? ` · ${t('выполнено')}` : ''}
                      </div>
                    </div>
                    <div style={{ width: 168, flexShrink: 0, pointerEvents: busyId === row.id ? 'none' : 'auto' }}>
                      <TeacherSelect
                        small
                        clearable={false}
                        placeholder={t('— без владельца —')}
                        value={row.owner_id ?? ''}
                        onChange={v => reassign(row, v)}
                        options={teachers.map(tc => ({ value: tc.id, label: `${tc.name}${tc.role === 'admin' ? ` (${t('Босс')})` : ''}` }))}
                        triggerStyle={{
                          padding: '7px 10px', borderRadius: 9, fontWeight: 600,
                          background: 'var(--color-bg-3)',
                          border: `1px solid ${row.owner_id ? 'var(--color-border-medium)' : '#D07020'}`,
                        }}
                      />
                    </div>
                    <button
                      onClick={() => doDelete(row)}
                      disabled={busyId === row.id}
                      title={t('Удалить')}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherAdminPage() {
  const t = useT()
  const setActivePage = useTeacher(s => s.setActivePage)
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [groupCount, setGroupCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tab, setTab] = useState<'overview' | 'data' | 'analytics' | 'users' | 'requests'>(() => {
    const saved = sessionStorage.getItem('admin_tab')
    return saved === 'data' || saved === 'analytics' || saved === 'users' || saved === 'requests' ? saved : 'overview'
  })
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    getAuthUser().then(u => {
      setIsAdmin(u?.app_metadata?.role === 'admin')
    })
  }, [])

  async function load() {
    setLoading(true)
    const [storageRes, groupsRes, studentsRes, teachersRes, invitesRes] = await Promise.all([
      supabase.rpc('storage_stats'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.rpc('admin_teacher_list'),
      supabase.rpc('admin_pending_teacher_invites'),
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
        subjects: (t.subjects as string[] | null) ?? [],
      })))
    }
    setPendingInvites(Array.isArray(invitesRes.data)
      ? (invitesRes.data as any[]).map(r => ({
          token: r.token as string,
          email: (r.email as string | null) ?? null,
          createdAt: r.created_at as string,
          createdByName: (r.created_by_name as string | null) ?? null,
        }))
      : [])
    setLoading(false)
  }

  async function revokeInvite(token: string) {
    await supabase.rpc('admin_revoke_teacher_invite', { p_token: token })
    setPendingInvites(prev => prev.filter(p => p.token !== token))
  }

  useEffect(() => { load() }, [])

  // Persist the active tab so F5 doesn't kick the admin back to «Обзор».
  useEffect(() => { sessionStorage.setItem('admin_tab', tab) }, [tab])

  const firstLoad = loading && !storage
  const dbPct = storage ? pct(storage.db_bytes, storage.db_limit_bytes) : 0
  const storagePct = storage ? pct(storage.storage_bytes, storage.storage_limit_bytes) : 0

  // Admin-only area. Teachers never reach it (menu item is hidden), but guard
  // the page too in case activePage is set some other way.
  if (isAdmin === false) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-3)' }}>
          <ShieldAlert size={32} strokeWidth={1.6} style={{ opacity: 0.6 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 10 }}>{t('Раздел доступен только администратору')}</div>
          <button onClick={() => setActivePage('home')} style={{ marginTop: 16, padding: '8px 18px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('На главную')}
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
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>{t('Администрирование')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>{t('Управление платформой')}</div>
          </div>
          {tab === 'overview' && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={load}
              title={t('Обновить')}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {t('Обновить')}
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 12, padding: 3, marginBottom: 24, width: 'fit-content' }}>
          {([['overview', t('Обзор'), Database], ['data', t('Данные'), BookOpen], ['analytics', t('Аналитика'), BarChart3], ['users', t('Пользователи'), Users], ['requests', t('Заявки'), Inbox]] as const).map(([id, label, Icon]) => (
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

        {tab === 'users' && <AdminUserActivity />}

        {tab === 'requests' && <FeedbackRequestsManager />}

        {tab === 'data' && (
          <>
            <ContentManager teachers={teachers} />
            <div style={{ height: 1, background: 'var(--color-border)', margin: '28px 0' }} />
            <TasksManager teachers={teachers} />
          </>
        )}

        {tab === 'overview' && (
        <>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard icon={Users} label={t('Учителей')} value={String(teachers.length)} sub={t('активных аккаунтов')} loading={firstLoad} />
          <StatCard icon={BookOpen} label={t('Групп')} value={String(groupCount)} sub={`${studentCount} ${t('учеников')}`} loading={firstLoad} />
          <StatCard
            icon={Database}
            label={t('База данных')}
            value={storage ? fmtBytes(storage.db_bytes) : '—'}
            sub={storage ? `${dbPct}% ${t('занято')}` : ''}
            loading={firstLoad}
          />
        </div>

        <AiSwitches />

        <FeatureFlags />

        {/* Teachers */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('Учителя')}</div>
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
              {t('Добавить учителя')}
            </motion.button>
          </div>
          <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
            {firstLoad && (
              <div style={{ padding: '16px 18px' }}><Skeleton.List rows={3} /></div>
            )}
            {!firstLoad && teachers.map((tr, i) => {
              const initials = tr.name.slice(0, 2).toUpperCase()
              const isTeacher = tr.role !== 'admin'
              const expanded = expandedId === tr.id
              const restrictCount = tr.hiddenTabs.length + tr.hiddenWidgets.length
              return (
                <div key={tr.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {tr.name}
                        {tr.role === 'admin' && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-purple)', background: 'rgba(155,109,255,0.12)', borderRadius: 6, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: 0.3 }}>admin</span>
                        )}
                        {isTeacher && restrictCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', background: 'var(--color-bg-3)', borderRadius: 6, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Lock size={9} strokeWidth={2.6} />{restrictCount}
                          </span>
                        )}
                        {isTeacher && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#1F9B6B', background: 'rgba(31,155,107,0.12)', borderRadius: 6, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }} title={t('Учитель зарегистрирован')}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1F9B6B' }} />{t('активен')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {tr.username && <span>@{tr.username}</span>}
                        {tr.subject && <><span>·</span><span>{tr.subject}</span></>}
                        <span>·</span>
                        <span>{tr.groupCount} {t('групп')} · {tr.studentCount} {t('учеников')}</span>
                      </div>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => setExpandedId(expanded ? null : tr.id)}
                        title={t('Настроить доступы')}
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
                        {t('Доступы')}
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
                          teacher={tr}
                          onSaved={(ht, hw, subs) => setTeachers(prev => prev.map(x => x.id === tr.id ? { ...x, hiddenTabs: ht, hiddenWidgets: hw, subjects: subs } : x))}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
            {!firstLoad && teachers.length === 0 && (
              <div style={{ padding: '20px 18px', color: 'var(--color-text-3)', fontSize: 13 }}>{t('Нет данных')}</div>
            )}
          </div>
        </div>

        {/* Pending invites — teachers sent a link who haven't signed up yet. */}
        {pendingInvites.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
              {t('Приглашения · не активированы')}
            </div>
            <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, overflow: 'hidden' }}>
              {pendingInvites.map((inv, i) => {
                const link = `${window.location.origin}${window.location.pathname}#/join-teacher?token=${inv.token}`
                return (
                  <div key={inv.token} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}>
                      <Mail size={15} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {inv.email || t('Без email')}
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#C77700', background: 'rgba(199,119,0,0.12)', borderRadius: 6, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C77700' }} />{t('не активировано')}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                        {t('Создано')} {new Date(inv.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        {inv.createdByName ? ` · ${inv.createdByName}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => { void copyToClipboard(link) }}
                      title={t('Скопировать ссылку')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '7px 12px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600 }}
                    >
                      <Copy size={13} strokeWidth={2} />{t('Ссылка')}
                    </button>
                    <button
                      onClick={() => revokeInvite(inv.token)}
                      title={t('Отозвать приглашение')}
                      style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '7px 9px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: '#E04848' }}
                    >
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Storage — compact tiles on the same 3-column grid as the stat cards above. */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{t('Хранилище')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StorageTile icon={Database} label={t('База данных')} value={storage ? fmtBytes(storage.db_bytes) : '—'} pct={dbPct} />
            <StorageTile icon={HardDrive} label={t('Файловое хранилище')} value={storage ? fmtBytes(storage.storage_bytes) : '—'} pct={storagePct} />
            <div
              onClick={() => setActivePage('storage')}
              style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', color: 'var(--color-accent)', fontSize: 13, fontWeight: 600 }}
            >
              {t('Подробная статистика')} <ChevronRight size={15} />
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
