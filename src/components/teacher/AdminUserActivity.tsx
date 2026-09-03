import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Users, GraduationCap, Clock, RefreshCw } from 'lucide-react'
import {
  fetchUserActivity, fetchTeacherUsage,
  type UserActivityRow, type TeacherUsageRow,
} from '../../lib/plan'
import { t, useT } from '../../lib/i18n'
import AssignPlanButton from './AssignPlanButton'
import AdminStudentsManager from './AdminStudentsManager'

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
  if (diffH < 1) return t('только что')
  if (diffH < 24) return `${Math.floor(diffH)} ${t('ч назад')}`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD} ${t('дн назад')}`
  return d.toLocaleDateString('ru-RU')
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
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
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
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
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
            <TeachersTable rows={teachers} />
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
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'var(--color-text-3)', textAlign: 'left', fontWeight: 600, padding: '9px 12px',
}
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13.5, color: 'var(--color-text-2)', borderTop: '1px solid var(--color-border)' }
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
            fontSize: 12.5, lineHeight: 1.35, fontWeight: 500, letterSpacing: 0,
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
    <td style={{ ...tdStyle, color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.25 }}>
      {name}
      {email && (
        <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--color-text-3)', marginTop: 2, lineHeight: 1.2 }}>
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
              <td style={tdStyle}><span style={{ color: k.color, fontWeight: 600, fontSize: 12.5 }}>{t(k.label)}</span></td>
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

/**
 * Срок тарифа под кнопкой.
 *
 * Пустой expires_at — это «бессрочно», а не «неизвестно»: так тариф выдаётся
 * своим и на время беты. Поэтому прочерк не рисуем, пишем словом, иначе
 * бессрочный и месячный выглядят одинаково.
 *
 * Просроченный подсвечивается: строка, по которой давно пора было выставить
 * счёт, не должна выглядеть как действующая.
 */
function PlanExpiry({ iso, hasPlan }: { iso: string | null; hasPlan: boolean }) {
  const t = useT()
  if (!hasPlan) return null
  if (!iso) return <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 3 }}>{t('бессрочно')}</div>
  const end = new Date(iso)
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
  const over = days < 0
  return (
    <div style={{ fontSize: 11, marginTop: 3, color: over ? '#E86A6A' : 'var(--color-text-3)', lineHeight: 1.2 }}>
      {over ? t('истёк') : t('до')} {end.toLocaleDateString('ru-RU')}
      {!over && days <= 14 && <> · {days} {t('дн')}</>}
    </div>
  )
}

function TeachersTable({ rows }: { rows: TeacherUsageRow[] }) {
  const t = useT()
  const [plans, setPlans] = useState<Record<string, { code: string | null; expires: string | null }>>({})
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
                onChanged={(code, expires) => setPlans(p => ({ ...p, [r.teacher_id]: { code, expires } }))}
                size="sm"
              />
              <PlanExpiry
                iso={plans[r.teacher_id] ? plans[r.teacher_id].expires : r.expires_at}
                hasPlan={!!(plans[r.teacher_id] ? plans[r.teacher_id].code : r.plan_code)}
              />
            </td>
            <td style={numTd}><b style={{ color: 'var(--color-text)' }}>{r.active_students}</b> / {r.total_students}</td>
            <td style={numTd}>{fmtMin(r.active_min)}</td>
            <td style={numTd}>{r.sessions}</td>
            <td style={numTd}>{fmtWhen(r.last_seen)}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
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
