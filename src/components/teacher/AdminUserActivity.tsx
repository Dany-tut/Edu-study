import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Users, GraduationCap, Clock, RefreshCw, Eye, Trash2, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  fetchUserActivity, fetchTeacherUsage,
  type UserActivityRow, type TeacherUsageRow,
} from '../../lib/plan'
import { t, useT, tn } from '../../lib/i18n'
import AssignPlanButton from './AssignPlanButton'
import AdminStudentsManager from './AdminStudentsManager'
import { setViewAs, getViewAs } from '../../lib/owner'
import { Alert } from '../Alert'

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
  admin: { label: 'Админ', color: '#D07020' },
  student: { label: 'Ученик', color: '#2E8F76' },
  anon: { label: 'Гость', color: 'var(--color-text-3)' },
}

/** Расшифровка колонки «Время»: цифра не про действия, а про открытую вкладку. */
const TIME_HINT = 'Минуты с открытой вкладкой: раз в минуту страница отмечается heartbeat-ом. Это не строго активные действия — вкладка могла просто висеть открытой.'

const DAYS = [7, 30, 90] as const

export default function AdminUserActivity() {
  const t = useT()
  const [days, setDays] = useState<(typeof DAYS)[number]>(30)
  const [view, setView] = useState<'people' | 'teachers' | 'students'>('people')
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
  }, [days])

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
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 10, padding: 3 }}>
          {(['people', 'teachers', 'students'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: view === v ? 'var(--color-purple-soft)' : 'transparent',
                color: view === v ? 'var(--color-purple)' : 'var(--color-text-3)',
              }}
            >
              {v === 'people' ? t('Все пользователи') : v === 'teachers' ? t('По учителям') : t('Ученики')}
            </button>
          ))}
        </div>
        {view !== 'students' && (
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', background: 'var(--color-bg-3)', borderRadius: 10, padding: 3 }}>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: days === d ? 'var(--color-purple-soft)' : 'transparent',
                color: days === d ? 'var(--color-purple)' : 'var(--color-text-3)',
              }}
            >
              {d} {t('дн')}
            </button>
          ))}
        </div>
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
            <PeopleTable rows={people} />
          ) : (
            <TeachersTable rows={teachers} onDeleted={(id, keepAccount) => setTeachers(prev => keepAccount
              ? prev.map(x => x.teacher_id === id ? { ...x, total_students: 0, active_students: 0 } : x)
              : prev.filter(x => x.teacher_id !== id))} />
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 14, padding: '13px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase',
  color: 'var(--color-text-3)', textAlign: 'left', fontWeight: 600, padding: '9px 12px',
}
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 14, color: 'var(--color-text-2)', borderTop: '1px solid var(--color-border)' }
const numTd: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-medium)', borderRadius: 14, background: 'var(--color-bg-2)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>{children}</table>
    </div>
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
            borderRadius: 10, padding: '8px 11px', boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
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
function NameCell({ name, email }: { name: string; email: string | null }) {
  return (
    <td style={{ ...tdStyle, color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.3 }}>
      {tn(name)}
      {email && (
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)', marginTop: 2, lineHeight: 1.2 }}>
          {email}
        </div>
      )}
    </td>
  )
}

function PeopleTable({ rows }: { rows: UserActivityRow[] }) {
  const t = useT()
  if (rows.length === 0) return <Empty />
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
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const k = KIND_LABEL[r.actor_kind] ?? KIND_LABEL.anon
          return (
            <tr key={r.actor_id}>
              <NameCell name={r.name} email={r.email} />
              <td style={tdStyle}><span style={{ color: k.color, fontWeight: 600, fontSize: 13 }}>{t(k.label)}</span></td>
              <td style={numTd}>{fmtMin(r.active_min)}</td>
              <td style={numTd}>{r.sessions}</td>
              <td style={numTd}>{r.logins || '—'}</td>
              <td style={numTd}>{fmtWhen(r.last_seen)}</td>
            </tr>
          )
        })}
      </tbody>
    </TableShell>
  )
}

function TeachersTable({ rows, onDeleted }: { rows: TeacherUsageRow[]; onDeleted: (id: string, keepAccount: boolean) => void }) {
  const t = useT()
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
        {rows.map(r => (
          <tr key={r.teacher_id}>
            <NameCell name={r.name} email={r.email} />
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
            <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {getViewAs()?.id === r.teacher_id ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D07020' }}>{t('смотрите сейчас')}</span>
              ) : (
                <button
                  onClick={() => setViewAs({ id: r.teacher_id, name: r.name })}
                  title={t('Открыть кабинет этого преподавателя')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px', borderRadius: 9, cursor: 'pointer',
                    background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)',
                    color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  <Eye size={12} strokeWidth={2} />
                  {t('Кабинет')}
                </button>
              )}
              <button
                onClick={() => setToDelete(r)}
                title={t('Стереть данные или удалить аккаунт')}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6,
                  width: 29, height: 29, borderRadius: 9, cursor: 'pointer', verticalAlign: 'middle',
                  background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', color: '#E04848',
                }}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </td>
          </tr>
        ))}
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
  teacher: TeacherUsageRow
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
    padding: '9px 14px', borderRadius: 11, fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    cursor: armed && !busy ? 'pointer' : 'default', opacity: armed ? 1 : 0.45,
    border: danger ? 'none' : '1px solid #E04848',
    background: danger ? '#E04848' : 'transparent', color: danger ? '#fff' : '#E04848',
  })

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border-medium)', borderRadius: 22, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShieldAlert size={18} strokeWidth={2} style={{ color: '#E04848' }} />
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
          style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 14 }}
        />
        {err && <Alert tone="danger" text={err} style={{ marginBottom: 12 }} />}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={{ padding: '9px 14px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{t('Отмена')}</button>
          <button disabled={!armed || !!busy} onClick={() => run(true)} style={btn(false)}>{busy === 'wipe' ? t('Стираем…') : t('Стереть данные')}</button>
          <button disabled={!armed || !!busy} onClick={() => run(false)} style={btn(true)}>{busy === 'delete' ? t('Удаляем…') : t('Удалить аккаунт')}</button>
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
