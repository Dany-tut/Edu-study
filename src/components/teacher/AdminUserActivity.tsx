import TableScrollArea from '../TableScrollArea'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Segmented from '../Segmented'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, GraduationCap, Clock, RefreshCw, Eye, Trash2, ShieldAlert, UserPlus, SlidersHorizontal, Lock, Eraser } from '../icons/appIcons'
import { supabase } from '../../lib/supabase'
import {
  fetchUserActivity, fetchTeacherUsage,
  type UserActivityRow, type TeacherUsageRow,
} from '../../lib/plan'
import { t, useT, tn } from '../../lib/i18n'
import AssignPlanButton from './AssignPlanButton'
import AdminStudentsManager from './AdminStudentsManager'
import { confirmDialog } from '../ConfirmHost'
import AdminInactiveCleanup from './AdminInactiveCleanup'
import { AccessEditor, InviteModal, PendingInvites, fetchTeacherAdmin, type PendingInvite, type TeacherAccess } from './AdminTeacherAccess'
import { setViewAs, getViewAs } from '../../lib/owner'
import { Alert } from '../Alert'
import { btn as uiBtn } from '../../lib/pillStyles'

// Админский экран «По пользователям»: активное время, last seen, сессии по
// каждому пользователю + per-teacher usage (активные ученики = будущий счётчик
// тарифного лимита). Данные из analytics_events (миграция 0039).

const PLAN_LABEL: Record<string, string> = {
  free: 'Бесплатный', solo: 'Соло', pro: 'Про', school: 'Школа',
}

function fmtMin(min: number): string {
  if (min < 60) return `${min} ${t('мин')}`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} ${t('ч')} ${m} ${t('мин')}` : `${h} ${t('ч')}`
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = Date.now()
  const diffH = (now - d.getTime()) / 3_600_000
  if (diffH < 1) return t('сейчас')
  if (diffH < 24) return `${Math.floor(diffH)} ${t('ч')}`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD} ${t('д')}`
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const KIND_LABEL: Record<string, { label: string; color: string }> = {
  teacher: { label: 'Учитель', color: 'var(--color-purple)' },
  admin: { label: 'Админ', color: 'var(--color-peach-text)' },
  student: { label: 'Ученик', color: '#2E8F76' },
  anon: { label: 'Гость', color: 'var(--color-text-3)' },
}

/** Расшифровка колонки «Время»: цифра не про действия, а про открытую вкладку. */
const TIME_HINT = 'Минуты с открытой вкладкой: раз в минуту страница отмечается heartbeat-ом. Это не строго активные действия — вкладка могла просто висеть открытой.'

const DAYS = [7, 30, 90] as const

type View = 'people' | 'teachers' | 'students'
/** Ключ раздела в sessionStorage: F5 и переход из карточки «Обзора» открывают нужный. */
export const USERS_VIEW_KEY = 'admin_users_view'

export default function AdminUserActivity() {
  const t = useT()
  const [days, setDays] = useState<(typeof DAYS)[number]>(30)
  const [view, setView] = useState<View>(() => {
    const saved = sessionStorage.getItem(USERS_VIEW_KEY)
    return saved === 'teachers' || saved === 'students' ? saved : 'people'
  })
  useEffect(() => { sessionStorage.setItem(USERS_VIEW_KEY, view) }, [view])
  // Доступы и приглашения учителей — не зависят от периода, грузятся один раз.
  const [access, setAccess] = useState<Record<string, TeacherAccess>>({})
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  // Перезагрузка таблиц после удалений (тот же период).
  const [reloadKey, setReloadKey] = useState(0)
  function loadTeacherAdmin() {
    void fetchTeacherAdmin().then(r => { setAccess(r.access); setInvites(r.invites) })
  }
  useEffect(loadTeacherAdmin, [])
  const [people, setPeople] = useState<UserActivityRow[]>([])
  const [teachers, setTeachers] = useState<TeacherUsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([fetchUserActivity(days), fetchTeacherUsage(days)]).then(([p, t]) => {
      if (!alive) return
      setPeople(p); setTeachers(t); setLoading(false)
    })
    return () => { alive = false }
  }, [days, reloadKey])

  const totals = useMemo(() => ({
    people: people.length,
    activeMin: people.reduce((s, r) => s + r.active_min, 0),
    students: people.filter(p => p.actor_kind === 'student').length,
    teachers: teachers.length,
  }), [people, teachers])

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Segmented
          variant="mode" value={view} onChange={setView}
          items={[{ id: 'people', label: t('Все пользователи') }, { id: 'teachers', label: t('По учителям') }, { id: 'students', label: t('Ученики') }]}
        />
        {view === 'people' && (
          <button data-hover="layer" onClick={() => setCleanupOpen(true)} style={{ ...uiBtn('S', 'secondary'), marginLeft: 'auto' }}>
            <Eraser size={14} strokeWidth={2} />
            {t('Удалить неактивных')}
          </button>
        )}
        {view === 'teachers' && (
          <button data-hover="layer" onClick={() => setInviteOpen(true)} style={{ ...uiBtn('S', 'primary'), marginLeft: 'auto' }}>
            <UserPlus size={14} strokeWidth={2.5} />
            {t('Пригласить учителя')}
          </button>
        )}
        {view !== 'students' && (
        <Segmented
          variant="filter" value={String(days)} onChange={v => setDays(Number(v) as typeof days)}
          items={DAYS.map(d => ({ id: String(d), label: `${d} ${t('дн')}` }))}
        />
        )}
        {loading && view !== 'students' && <RefreshCw size={14} style={{ color: 'var(--color-text-3)', animation: 'spin 1s linear infinite' }} />}
      </div>

      {view === 'students' ? (
        <AdminStudentsManager />
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
            <Kpi icon={Users} label={t('Пользователей')} value={String(totals.people)} />
            <Kpi icon={GraduationCap} label={t('Учеников активно')} value={String(totals.students)} />
            <Kpi icon={Users} label={t('Учителей')} value={String(totals.teachers)} />
            <Kpi icon={Clock} label={t('Активное время')} value={fmtMin(totals.activeMin)} />
          </div>

          {view === 'people' ? (
            <PeopleTable rows={people} onDeleted={id => setPeople(prev => prev.filter(p => p.actor_id !== id))} />
          ) : (
            <>
            <PendingInvites invites={invites} onRevoked={token => setInvites(prev => prev.filter(p => p.token !== token))} />
            <TeachersTable
              rows={teachers}
              access={access}
              onAccessSaved={(id, hiddenTabs, hiddenWidgets, subjects) => setAccess(prev => ({ ...prev, [id]: { ...prev[id], hiddenTabs, hiddenWidgets, subjects } }))}
              onDeleted={(id, keepAccount) => setTeachers(prev => keepAccount
              ? prev.map(x => x.teacher_id === id ? { ...x, total_students: 0, active_students: 0 } : x)
              : prev.filter(x => x.teacher_id !== id))} />
            </>
          )}
        </>
      )}

      <AnimatePresence>
        {inviteOpen && <InviteModal onClose={() => { setInviteOpen(false); loadTeacherAdmin() }} />}
      </AnimatePresence>
      {cleanupOpen && (
        <AdminInactiveCleanup
          onClose={() => setCleanupOpen(false)}
          onDone={() => { setReloadKey(k => k + 1); loadTeacherAdmin() }}
        />
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 14, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={14} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.01em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
  color: 'var(--color-text-3)', textAlign: 'left', fontWeight: 600, padding: '10px 12px',
}
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 14, color: 'var(--color-text-2)', borderTop: '1px solid var(--color-border)' }
const numTd: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <TableScrollArea style={{ border: '1px solid var(--color-border-medium)', borderRadius: 14, background: 'var(--color-bg-2)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>{children}</table>
    </TableScrollArea>
  )
}

/**
 * Заголовок колонки с пояснением по наведению.
 *
 * Шапка таблицы должна читаться одним словом («Ученики»), а расшифровка
 * «активные за период / всего» — длиннее самой колонки и ломала ряд на три
 * строки. Поэтому расшифровка ушла в подсказку: пунктир под заголовком
 * подсказывает, что здесь есть что посмотреть.
 *
 * Подсказка рисуется в портале с position: fixed — внутри таблицы её съедал бы
 * overflow-x: auto у TableShell.
 */
function HintTh({ label, hint, align = 'left' }: { label: string; hint: string; align?: 'left' | 'right' }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const show = () => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left + r.width / 2, y: r.bottom + 8 })
  }
  return (
    <th style={{ ...thStyle, textAlign: align }}>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        style={{ borderBottom: '1px dotted var(--color-text-3)', cursor: 'help' }}
      >
        {label}
      </span>
      {pos && createPortal(
        <div
          style={{
            position: 'fixed', left: pos.x, top: pos.y, transform: 'translateX(-50%)',
            zIndex: 4000, pointerEvents: 'none', maxWidth: 260,
            background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
            borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-3)',
            fontSize: 13, lineHeight: 1.3, fontWeight: 500, letterSpacing: 0,
            textTransform: 'none', textAlign: 'left', color: 'var(--color-text-2)',
          }}
        >
          {hint}
        </div>,
        document.body,
      )}
    </th>
  )
}

/**
 * Имя с почтой под ним.
 *
 * Одного имени мало: «Даниил Макаренко» — это и учительский аккаунт с 24
 * учениками, и отдельная тестовая карточка ученика. Почта — единственное, что
 * здесь различает строки, поэтому она идёт второй строкой, а не отдельной
 * колонкой: таблица и так широкая.
 */
function NameCell({ name, email, badge }: { name: string; email: string | null; badge?: React.ReactNode }) {
  return (
    <td style={{ ...tdStyle, color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.3 }}>
      {tn(name)}{badge}
      {email && (
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)', marginTop: 2, lineHeight: 1.2 }}>
          {email}
        </div>
      )}
    </td>
  )
}

/**
 * Строка без аккаунта: события в аналитике есть, а ни профиля, ни ученика уже
 * нет (admin_user_activity отдаёт имя «—» и пустую почту). У настоящего
 * аккаунта почта есть всегда — у учителя из auth.users, у ученика логин.
 */
const isGhost = (r: UserActivityRow) => r.name === '—' && !r.email

function PeopleTable({ rows, onDeleted }: { rows: UserActivityRow[]; onDeleted: (id: string) => void }) {
  const t = useT()
  const [teacherToDelete, setTeacherToDelete] = useState<UserActivityRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  if (rows.length === 0) return <Empty />

  async function remove(r: UserActivityRow) {
    if (r.actor_kind !== 'student' && !isGhost(r)) { setTeacherToDelete(r); return }
    const ghost = isGhost(r)
    const ok = await confirmDialog({
      title: ghost ? t('Удалить след удалённого аккаунта?') : `${t('Удалить ученика')} ${tn(r.name)}?`,
      message: ghost
        ? t('Аккаунта уже нет — сотрутся только его события в аналитике.')
        : t('Ученик пропадёт из группы вместе с ДЗ, оценками и посещаемостью. Вернуть нельзя.'),
      confirmLabel: t('Удалить'), tone: 'danger',
    })
    if (!ok) return
    setBusyId(r.actor_id); setErr('')
    const { error } = await supabase.rpc('admin_delete_actors', { p_ids: [r.actor_id], p_months: null })
    setBusyId(null)
    if (error) { setErr(error.message); return }
    onDeleted(r.actor_id)
  }

  return (
    <>
    {err && <Alert tone="danger" text={err} style={{ marginBottom: 12 }} />}
  return (
    <TableShell>
      <thead>
        <tr>
          <th style={thStyle}>{t('Пользователь')}</th>
          <th style={thStyle}>{t('Роль')}</th>
          <HintTh align="right" label={t('Время')} hint={t(TIME_HINT)} />
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('Сессий')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('Входов')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('Был(а)')}</th>
          <th style={thStyle} />
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const k = KIND_LABEL[r.actor_kind] ?? KIND_LABEL.anon
          // Админов отсюда не удаляем; «аноним» без id не попадает в таблицу.
          const deletable = r.actor_kind !== 'admin'
          return (
            <tr key={r.actor_id}>
              <NameCell name={r.name} email={r.email} />
              <td style={tdStyle}><span style={{ color: k.color, fontWeight: 600, fontSize: 13 }}>{t(k.label)}</span></td>
              <td style={numTd}>{fmtMin(r.active_min)}</td>
              <td style={numTd}>{r.sessions}</td>
              <td style={numTd}>{r.logins || '—'}</td>
              <td style={numTd}>{fmtWhen(r.last_seen)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', width: 1 }}>
                {deletable && (
                  <button data-hover="layer"
                    onClick={() => { void remove(r) }}
                    disabled={busyId === r.actor_id}
                    title={isGhost(r) ? t('Удалить след удалённого аккаунта') : t('Удалить')}
                    aria-label={t('Удалить')}
                    style={uiBtn('S', 'secondary', { width: 32, padding: 0, color: 'var(--color-red-text)', opacity: busyId === r.actor_id ? 0.5 : 1 })}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </TableShell>
    {teacherToDelete && (
      <DeleteTeacherDialog
        teacher={{ teacher_id: teacherToDelete.actor_id, name: teacherToDelete.name, email: teacherToDelete.email }}
        onClose={() => setTeacherToDelete(null)}
        onDone={keepAccount => { if (!keepAccount) onDeleted(teacherToDelete.actor_id); setTeacherToDelete(null) }}
      />
    )}
    </>
  )
}

function TeachersTable({ rows, access, onAccessSaved, onDeleted }: {
  rows: TeacherUsageRow[]
  access: Record<string, TeacherAccess>
  onAccessSaved: (id: string, hiddenTabs: string[], hiddenWidgets: string[], subjects: string[]) => void
  onDeleted: (id: string, keepAccount: boolean) => void
}) {
  const t = useT()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [plans, setPlans] = useState<Record<string, { code: string | null; expires: string | null }>>({})
  const [toDelete, setToDelete] = useState<TeacherUsageRow | null>(null)
  if (rows.length === 0) return <Empty />
  return (
    <TableShell>
      <thead>
        <tr>
          <th style={thStyle}>{t('Учитель')}</th>
          <th style={thStyle}>{t('Тариф')}</th>
          <HintTh align="right" label={t('Ученики')} hint={t('Активные за период / всего у учителя. Активный — тот, кто заходил в кабинет за выбранный период.')} />
          <HintTh align="right" label={t('Время')} hint={t(TIME_HINT)} />
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('Сессий')}</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>{t('Был(а)')}</th>
          <th style={thStyle} />
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const acc = access[r.teacher_id]
          // Админу доступы не режутся — кнопку показываем только учителям.
          const editable = !!acc && acc.role !== 'admin'
          const restrictCount = acc ? acc.hiddenTabs.length + acc.hiddenWidgets.length : 0
          const expanded = editable && expandedId === r.teacher_id
          return (
          <Fragment key={r.teacher_id}>
          <tr>
            <NameCell
              name={r.name} email={r.email}
              badge={editable && restrictCount > 0 && (
                <span title={t('Скрыто разделов и виджетов')} style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', background: 'var(--color-bg-3)', borderRadius: 6, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                  <Lock size={12} strokeWidth={2.5} />{restrictCount}
                </span>
              )}
            />
            <td style={tdStyle}>
              <AssignPlanButton
                teacherId={r.teacher_id}
                currentCode={plans[r.teacher_id]?.code ?? (plans[r.teacher_id] ? null : r.plan_code)}
                expiresAt={plans[r.teacher_id] ? plans[r.teacher_id].expires : r.expires_at}
                onChanged={(code, expires) => setPlans(p => ({ ...p, [r.teacher_id]: { code, expires } }))}
                size="sm"
              />
            </td>
            <td style={numTd}><b style={{ color: 'var(--color-text)' }}>{r.active_students}</b> / {r.total_students}</td>
            <td style={numTd}>{fmtMin(r.active_min)}</td>
            <td style={numTd}>{r.sessions}</td>
            <td style={numTd}>{fmtWhen(r.last_seen)}</td>
            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {editable && (
                  <button data-hover="layer"
                    onClick={() => setExpandedId(expanded ? null : r.teacher_id)}
                    title={t('Настроить доступы')}
                    aria-expanded={expanded}
                    style={uiBtn('S', 'secondary', expanded ? { background: 'var(--color-purple-soft)', color: 'var(--color-purple)' } : undefined)}
                  >
                    <SlidersHorizontal size={14} strokeWidth={2} />
                    {t('Доступы')}
                  </button>
                )}
                {getViewAs()?.id === r.teacher_id ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-peach-text)' }}>{t('смотрите сейчас')}</span>
                ) : (
                  <button data-hover="layer"
                    onClick={() => setViewAs({ id: r.teacher_id, name: r.name })}
                    title={t('Посмотреть кабинет преподавателя')}
                    style={uiBtn('S', 'secondary')}
                  >
                    <Eye size={12} strokeWidth={2} />
                    {t('Кабинет')}
                  </button>
                )}
                <button data-hover="layer"
                  onClick={() => setToDelete(r)}
                  title={t('Стереть данные или удалить аккаунт')}
                  aria-label={t('Стереть данные или удалить аккаунт')}
                  style={uiBtn('S', 'secondary', { width: 32, padding: 0, flexShrink: 0, color: 'var(--color-red-text)' })}
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            </td>
          </tr>
          {editable && (
            <tr>
              <td colSpan={7} style={{ padding: 0 }}>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden', borderTop: '1px solid var(--color-border)' }}
                    >
                      <div style={{ paddingTop: 14 }}>
                        <AccessEditor
                          teacher={acc}
                          onSaved={(ht, hw, subs) => onAccessSaved(r.teacher_id, ht, hw, subs)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </td>
            </tr>
          )}
          </Fragment>
          )
        })}
      </tbody>
      {toDelete && (
        <DeleteTeacherDialog
          teacher={toDelete}
          onClose={() => setToDelete(null)}
          onDone={keepAccount => { onDeleted(toDelete.teacher_id, keepAccount); setToDelete(null) }}
        />
      )}
    </TableShell>
  )
}

// Учитель хочет начать с нуля: «Стереть данные» оставляет вход и тариф,
// «Удалить аккаунт» убирает и его (вернуться — по новому приглашению).
// Оба пути необратимы, поэтому сначала нужно вписать почту учителя.
function DeleteTeacherDialog({ teacher, onClose, onDone }: {
  teacher: Pick<TeacherUsageRow, 'teacher_id' | 'name' | 'email'>
  onClose: () => void
  onDone: (keepAccount: boolean) => void
}) {
  const t = useT()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState<'wipe' | 'delete' | null>(null)
  const [err, setErr] = useState('')
  const expected = (teacher.email ?? teacher.name).trim().toLowerCase()
  const armed = typed.trim().toLowerCase() === expected

  async function run(keepAccount: boolean) {
    setBusy(keepAccount ? 'wipe' : 'delete'); setErr('')
    const { error } = await supabase.rpc('admin_delete_teacher', { p_teacher: teacher.teacher_id, p_keep_account: keepAccount })
    setBusy(null)
    if (error) { setErr(error.message); return }
    onDone(keepAccount)
  }

  const btn = (danger: boolean): React.CSSProperties => ({
    padding: '10px 14px', borderRadius: 11, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    cursor: armed && !busy ? 'pointer' : 'default', opacity: armed ? 1 : 0.45,
    border: danger ? 'none' : '1px solid #E04848',
    background: danger ? 'var(--color-red-text)' : 'transparent', color: danger ? '#fff' : 'var(--color-red-text)',
  })

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border-medium)', borderRadius: 22, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShieldAlert size={18} strokeWidth={2} style={{ color: 'var(--color-red-text)' }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{tn(teacher.name)}: {t('начать с нуля')}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 14 }}>
          <b>{t('Стереть данные')}</b> — {t('удалятся группы с учениками, расписанием, ДЗ и журналом, курсы, тренажёры, задачи и оплаты. Вход и тариф останутся.')}
          <br />
          <b>{t('Удалить аккаунт')}</b> — {t('то же и сам аккаунт. Вернуться можно только по новому приглашению.')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>
          {t('Чтобы подтвердить, впишите')} <b style={{ color: 'var(--color-text)' }}>{teacher.email ?? teacher.name}</b>
        </div>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14 }}
        />
        {err && <Alert tone="danger" text={err} style={{ marginBottom: 12 }} />}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button data-hover="layer" onClick={onClose} style={uiBtn('M', 'secondary')}>{t('Отмена')}</button>
          <button data-hover="layer" disabled={!armed || !!busy} onClick={() => run(true)} style={btn(false)}>{busy === 'wipe' ? t('Стираем…') : t('Стереть данные')}</button>
          <button data-hover="layer" disabled={!armed || !!busy} onClick={() => run(false)} style={btn(true)}>{busy === 'delete' ? t('Удаляем…') : t('Удалить аккаунт')}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Empty() {
  const t = useT()
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
      {t('Нет данных за выбранный период.')}
    </div>
  )
}
