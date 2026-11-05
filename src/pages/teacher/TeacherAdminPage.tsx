import { textFadeStyle } from '../../lib/textFades'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import BackCircle from '../../components/BackCircle'
import { confirmDialog } from '../../components/ConfirmHost'
import Segmented from '../../components/Segmented'
import Skeleton from '../../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, HardDrive, Users, BookOpen, RefreshCw, BarChart3, ShieldAlert, Inbox, Sparkles, Ghost, ToggleRight, ChevronRight, X, GraduationCap, Activity } from '../../components/icons/appIcons'
import { supabase } from '../../lib/supabase'
import { useTeacher } from '../../store/teacherStore'
import TeacherAnalytics from '../../components/teacher/TeacherAnalytics'
import AdminUserActivity, { USERS_VIEW_KEY } from '../../components/teacher/AdminUserActivity'
import FeedbackRequestsManager from '../../components/teacher/FeedbackRequestsManager'
import TranscriptTermsManager from '../../components/teacher/TranscriptTermsManager'
import { AudioLines } from '../../components/icons/appIcons'
import Checkbox from '../../components/Checkbox'
import Switch from '../../components/Switch'
import { fetchAppFlags, setAppFlag } from '../../lib/cardGroups'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { useT, t as tGlobal, useTc } from '../../lib/i18n'
import { getAuthUser } from '../../lib/owner'
import SeasonAdmin from '../../components/teacher/SeasonAdmin'
import { PAGE_WIDTH } from '../../lib/pageWidth'
import { btn } from '../../lib/pillStyles'
import { StorageStatsPanel, type StorageStatsData } from './TeacherStoragePage'


type StorageStats = StorageStatsData

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

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ${tGlobal('КБ')}`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} ${tGlobal('МБ')}`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ${tGlobal('ГБ')}`
}

function pct(used: number, limit: number) {
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * Карточка сводки «Обзора». Каждая ведёт туда, где про это подробно:
 * учителя и ученики → «Пользователи», активность → «Аналитика»,
 * место → «Хранилище». `bar` — заполненность в процентах.
 */
function StatCard({ icon: Icon, label, value, sub, loading, onClick, bar }: { icon: React.ElementType; label: string; value: string; sub?: string; loading?: boolean; onClick?: () => void; bar?: number }) {
  const barColor = bar == null ? '' : bar >= 85 ? 'var(--color-red-text)' : bar >= 60 ? 'var(--color-peach-text)' : 'var(--color-green-text)'
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={onClick ? 'hover-row' : undefined}
      style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: '16px 20px', cursor: onClick ? 'pointer' : undefined, minWidth: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', ...textFadeStyle }}>{label}</span>
        {onClick && <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />}
      </div>
      {loading ? (
        <>
          <Skeleton w={72} h={26} radius={7} />
          {sub !== undefined && <Skeleton w={100} h={11} radius={5} style={{ marginTop: 8 }} />}
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', letterSpacing: '-0.01em', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4, overflow: 'hidden', whiteSpace: 'nowrap', ...textFadeStyle }}>{sub}</div>}
          {bar != null && (
            <div style={{ height: 4, borderRadius: 2, background: 'var(--color-bg-3)', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ width: `${bar}%`, height: '100%', borderRadius: 2, background: barColor, transition: 'width 0.38s ease' }} />
            </div>
          )}
        </>
      )}
    </div>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Sparkles size={14} strokeWidth={2.5} style={{ color: 'var(--color-purple)' }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                <div style={{ fontSize: 14, fontWeight: isMaster ? 700 : 600, color: 'var(--color-text)' }}>
                  {isMaster ? t('Обращения к модели разрешены') : (head(r.about) || r.key)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4, lineHeight: 1.45 }}>
                  {isMaster
                    ? t('Пока выключено, ни одна задача ниже не работает — даже поднятая.')
                    : tail(r.about)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', opacity: 0.7, marginTop: 4 }}>{r.key}</div>
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
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.5 }}>
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
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
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
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{r.about || r.key}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{r.key}</div>
              </div>
            </Checkbox>
          </div>
        ))}
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
  const { tc, tn } = useTc()
  const [rows, setRows] = useState<ContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Подтверждение удаления — общим окном приложения (ConfirmHost), а не своим.
  function askDelete(row: ContentRow) {
    void confirmDialog({
      title: t('Удалить безвозвратно?'),
      message: row.kind === 'course'
        ? `${t('Курс')} «${tc(row.title)}» ${t('и все его уроки/модули будут удалены навсегда.')}`
        : `${t('Группа')} «${tc(row.title)}» ${t('со всеми учениками, расписанием, ДЗ и журналом будет удалена навсегда.')}`,
      confirmLabel: t('Удалить'), tone: 'danger',
    }).then(ok => { if (ok) void doDelete(row) })
  }
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
    await load()
    setBusyId(null)
  }

  const shown = rows.filter(r => filter === 'all' || r.kind === filter)
  const orphanCount = rows.filter(r => !r.owner_id).length

  return (
    <div>
      {/* Filter + orphan warning */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Segmented
          variant="filter" value={filter} onChange={setFilter}
          items={([['all', 'Всё'], ['course', 'Курсы'], ['group', 'Группы']] as const).map(([id, label]) => ({ id, label: t(label) }))}
        />
        {orphanCount > 0 && (
          <span style={{ fontSize: 12, color: 'var(--color-peach-text)', fontWeight: 600 }}>
            {orphanCount} {t('без владельца')}
          </span>
        )}
        <button onClick={load} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
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
                {row.kind === 'course' ? <BookOpen size={16} strokeWidth={2} /> : <Users size={16} strokeWidth={2} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap' }}>
                  {tc(row.title) || '—'}
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
                  options={teachers.map(o => ({ value: o.id, label: `${tn(o.name)}${o.role === 'admin' ? ` (${t('Босс')})` : ''}` }))}
                  triggerStyle={{
                    padding: '8px 10px', borderRadius: 9, fontWeight: 600,
                    background: 'var(--color-bg-3)',
                    border: `1px solid ${row.owner_id ? 'var(--color-border-medium)' : 'var(--color-peach-text)'}`,
                  }}
                />
              </div>
              <button
                onClick={() => askDelete(row)}
                disabled={busyId === row.id}
                title={t('Удалить')}
                style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', color: 'var(--color-red-text)',
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
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
  const { tn } = useTc()
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
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {t('Задачи учителей')}
        </div>
        <button onClick={load} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {t('Обновить')}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ padding: '24px 0' }}><Skeleton.List rows={4} /></div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>{t('Ни у кого нет задач.')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[...groups.map(g => ({ label: tn(g.teacher.name), ownerId: g.teacher.id, tasks: g.tasks })),
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
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap', textDecoration: row.done ? 'line-through' : 'none' }}>
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
                        options={teachers.map(o => ({ value: o.id, label: `${tn(o.name)}${o.role === 'admin' ? ` (${t('Босс')})` : ''}` }))}
                        triggerStyle={{
                          padding: '8px 10px', borderRadius: 9, fontWeight: 600,
                          background: 'var(--color-bg-3)',
                          border: `1px solid ${row.owner_id ? 'var(--color-border-medium)' : 'var(--color-peach-text)'}`,
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
                        background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', color: 'var(--color-red-text)',
                      }}
                    >
                      <X size={16} strokeWidth={2} />
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

const OVERVIEW_SECTIONS = ['features', 'ai', 'themes', 'storage'] as const

type ActivityOverview = { dau: number; wau: number }
type OverviewSection = typeof OVERVIEW_SECTIONS[number]

export default function TeacherAdminPage() {
  const t = useT()
  const { tc, tn } = useTc()
  const setActivePage = useTeacher(s => s.setActivePage)
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  // Часть «Аналитики» в сводке: кто был за неделю (учителя и ученики).
  const [activity, setActivity] = useState<{ teacher: ActivityOverview | null; student: ActivityOverview | null }>({ teacher: null, student: null })
  const [groupCount, setGroupCount] = useState(0)
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'data' | 'analytics' | 'users' | 'requests' | 'dictionary'>(() => {
    const saved = sessionStorage.getItem('admin_tab')
    return saved === 'data' || saved === 'analytics' || saved === 'users' || saved === 'requests' || saved === 'dictionary' ? saved : 'overview'
  })
  // Второй уровень «Обзора», как разделы в «Аналитике»: каждый блок — своя вкладка.
  const [section, setSection] = useState<OverviewSection>(() => {
    const saved = sessionStorage.getItem('admin_overview_section')
    return OVERVIEW_SECTIONS.includes(saved as OverviewSection) ? (saved as OverviewSection) : 'features'
  })
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  // Смена раздела не кидает страницу наверх: прокрутка остаётся, где была.
  // Если новый раздел короче и туда уже не докрутить — встаём к вкладкам разделов.
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionTabsRef = useRef<HTMLDivElement>(null)
  const keepScroll = useRef<number | null>(null)
  function changeSection(next: OverviewSection) {
    keepScroll.current = scrollRef.current?.scrollTop ?? null
    setSection(next)
  }
  useLayoutEffect(() => {
    const el = scrollRef.current, tabsEl = sectionTabsRef.current, prev = keepScroll.current
    keepScroll.current = null
    if (!el || !tabsEl || prev == null) return
    const max = el.scrollHeight - el.clientHeight
    if (prev <= max) { el.scrollTop = prev; return }
    // Вкладки встают под верхнюю панель (она перекрывает первые 100 px прокрутки).
    const anchor = tabsEl.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 116
    el.scrollTop = Math.max(0, Math.min(anchor, max))
  }, [section])

  useEffect(() => {
    getAuthUser().then(u => {
      setIsAdmin(u?.app_metadata?.role === 'admin')
    })
  }, [])

  async function load() {
    setLoading(true)
    const [storageRes, groupsRes, studentsRes, teachersRes, invitesRes, actT, actS] = await Promise.all([
      supabase.rpc('storage_stats'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.rpc('admin_teacher_list'),
      supabase.rpc('admin_pending_teacher_invites'),
      supabase.rpc('admin_analytics_overview_by_role', { p_role: 'teacher', p_days: 7 }),
      supabase.rpc('admin_analytics_overview_by_role', { p_role: 'student', p_days: 7 }),
    ])
    setActivity({ teacher: (actT.data as ActivityOverview | null) ?? null, student: (actS.data as ActivityOverview | null) ?? null })

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
    setPendingCount(Array.isArray(invitesRes.data) ? invitesRes.data.length : 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Persist the active tab so F5 doesn't kick the admin back to «Обзор».
  useEffect(() => { sessionStorage.setItem('admin_tab', tab) }, [tab])
  useEffect(() => { sessionStorage.setItem('admin_overview_section', section) }, [section])

  const firstLoad = loading && !storage
  const dbPct = storage ? pct(storage.db_bytes, storage.db_limit_bytes) : 0
  const filesPct = storage ? pct(storage.storage_bytes, storage.storage_limit_bytes) : 0
  const weekActive = (activity.teacher?.wau ?? 0) + (activity.student?.wau ?? 0)
  const todayActive = (activity.teacher?.dau ?? 0) + (activity.student?.dau ?? 0)
  function openUsers(view: 'teachers' | 'students') {
    sessionStorage.setItem(USERS_VIEW_KEY, view)
    setTab('users')
  }

  // Admin-only area. Teachers never reach it (menu item is hidden), but guard
  // the page too in case activePage is set some other way.
  if (isAdmin === false) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-3)' }}>
          <ShieldAlert size={32} strokeWidth={1.5} style={{ opacity: 0.6 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 10 }}>{t('Раздел доступен только администратору')}</div>
          <button onClick={() => setActivePage('home')} style={{ ...btn('S', 'secondary'), marginTop: 16 }}>
            {t('На главную')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}>
      <div style={{ maxWidth: PAGE_WIDTH.wide, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <BackCircle onClick={() => setActivePage('home')} label="На главную" />
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
              <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {t('Обновить')}
            </motion.button>
          )}
        </div>

        {/* Tabs */}
        <Segmented
          variant="mode" value={tab} onChange={setTab} style={{ marginBottom: 24 }}
          items={([['overview', t('Обзор'), Database], ['data', t('Данные'), BookOpen], ['analytics', t('Аналитика'), BarChart3], ['users', t('Пользователи'), Users], ['requests', t('Заявки'), Inbox], ['dictionary', t('Словарь'), AudioLines]] as const).map(([id, label, icon]) => ({ id, label, icon }))}
        />

        {tab === 'analytics' && <TeacherAnalytics />}

        {tab === 'users' && <AdminUserActivity />}

        {tab === 'requests' && <FeedbackRequestsManager />}

        {tab === 'dictionary' && <TranscriptTermsManager />}

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
          <StatCard
            icon={Users} label={t('Учителей')} value={String(teachers.length)}
            sub={pendingCount > 0 ? `${pendingCount} ${t('приглаш. ждут входа')}` : t('активных аккаунтов')}
            loading={firstLoad} onClick={() => openUsers('teachers')}
          />
          <StatCard
            icon={GraduationCap} label={t('Учеников')} value={String(studentCount)}
            sub={`${t('в')} ${groupCount} ${t('группах')}`}
            loading={firstLoad} onClick={() => openUsers('students')}
          />
          <StatCard
            icon={Activity} label={t('Были за 7 дней')} value={String(weekActive)}
            sub={`${t('сегодня')} ${todayActive} · ${t('учеников')} ${activity.student?.wau ?? 0}`}
            loading={firstLoad} onClick={() => setTab('analytics')}
          />
          <StatCard
            icon={HardDrive} label={t('Хранилище')}
            value={storage ? fmtBytes(storage.db_bytes + storage.storage_bytes) : '—'}
            sub={storage ? `${t('база')} ${dbPct}% · ${t('файлы')} ${filesPct}%` : ''}
            bar={storage ? Math.max(dbPct, filesPct) : undefined}
            loading={firstLoad} onClick={() => changeSection('storage')}
          />
        </div>

        <div ref={sectionTabsRef} />
        <Segmented
          variant="mode" value={section} onChange={changeSection} style={{ marginBottom: 20 }}
          items={([['features', t('Функции'), ToggleRight], ['ai', t('ИИ'), Sparkles], ['themes', t('Темы'), Ghost], ['storage', t('Хранилище'), HardDrive]] as const).map(([id, label, icon]) => ({ id, label, icon }))}
        />

        {/* Блок выключен — он остаётся в коде и ждёт следующего сезона на своей вкладке. */}
        {section === 'themes' && <SeasonAdmin />}

        {section === 'ai' && <AiSwitches />}

        {section === 'features' && <FeatureFlags />}

        {/* Storage — the full breakdown right here, no separate page. */}
        {section === 'storage' && (
          <StorageStatsPanel stats={storage} error={!loading && !storage} />
        )}
        </>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
