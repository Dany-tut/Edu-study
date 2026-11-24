import { textFadeLines } from '../../lib/textFades'
import OpticalText from '../OpticalText'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Segmented from '../Segmented'
import HScrollFade from '../HScrollFade'
import MobileSheet from '../MobileSheet'
import { Alert } from '../Alert'
import { RefreshCw, ChevronRight, Users } from '../icons/appIcons'
import { supabase } from '../../lib/supabase'
import { PLATFORM } from '../../lib/platform'
import { t, useT } from '../../lib/i18n'

// Админка → «Сейчас на сайте»: кто из учеников и учителей онлайн прямо сейчас,
// по группам, и когда кто был. Концепт — Figma «Искра», стр. 17.
// Данные — analytics_events (heartbeat раз в минуту), RPC admin_online_people /
// admin_online_timeline (миграция 20261123180000_admin_online_now.sql).

/** Heartbeat раз в 60 с: свежее 3 минут — вкладка открыта прямо сейчас. */
const ONLINE_MS = 3 * 60_000
const REFRESH_MS = 60_000
const LONG_AWAY_DAYS = 5

type Period = 'now' | 'today' | 'week'

export interface OnlinePerson {
  actor_kind: 'student' | 'teacher' | 'admin'
  actor_id: string
  name: string
  group_id: string | null
  group_name: string | null
  subject: string | null
  last_seen: string
  last_path: string | null
  session_from: string | null
  viewport_w: number | null
  today_min: number
  period_min: number
  hours: number[]
  auth_failed_today: number
  last_login: string | null
  last_login_method: string | null
}

interface TimelineSession {
  from: string; to: string; minutes: number; auth_failed: number
  login_method: string | null; provider: string | null; viewport: string | null; paths: string[]
}
interface Timeline { sessions: TimelineSession[]; days: { day: string; minutes: number }[] }

const SCREENS: [RegExp, string][] = [
  [/^#\/?$/, 'Главная'], [/^#\/homework/, 'Домашка'], [/^#\/trainer/, 'Тренажёр'], [/^#\/diary/, 'Дневник'],
  [/^#\/profile/, 'Профиль'], [/^#\/course/, 'Курс'], [/^#\/lesson/, 'Урок'], [/^#\/schedule/, 'Расписание'],
  [/^#\/join/, 'Приглашение'], [/^#\/login/, 'Вход'], [/^\/auth\/vk/, 'Вход через VK'], [/^\/auth\/yandex/, 'Вход через Яндекс'],
  [/^#\/teacher\/gradebook/, 'Журнал'], [/^#\/teacher\/constructor/, 'Конструктор'], [/^#\/teacher\/groups/, 'Группы'],
  [/^#\/teacher\/homework/, 'Проверка ДЗ'], [/^#\/teacher\/admin/, 'Админка'], [/^#\/teacher/, 'Кабинет учителя'],
]
function screenName(path: string | null): string {
  if (!path) return ''
  const hit = SCREENS.find(([re]) => re.test(path))
  return hit ? t(hit[1]) : path.replace(/^#\//, '')
}
function compactPaths(paths: string[]): string {
  const names: string[] = []
  for (const p of paths) { const n = screenName(p); if (n && names[names.length - 1] !== n) names.push(n) }
  return names.slice(0, 6).join(' → ') + (names.length > 6 ? ' → …' : '')
}
function device(w: number | null): string {
  if (!w) return '—'
  return w < 600 ? t('Телефон') : w < 1024 ? t('Планшет') : t('Компьютер')
}
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
function fmtMin(min: number): string {
  if (min < 60) return `${min} ${t('мин')}`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} ${t('ч')} ${m} ${t('мин')}` : `${h} ${t('ч')}`
}
function loginLabel(method: string | null): string {
  if (!method) return ''
  if (method === 'oauth') return t('соцсеть')
  if (method === 'password' || method === 'auth') return t('пароль')
  if (method === 'passkey') return t('ключ')
  return method
}
const isOnline = (p: OnlinePerson) => Date.now() - new Date(p.last_seen).getTime() < ONLINE_MS
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }

function statusText(p: OnlinePerson): string {
  const where = screenName(p.last_path)
  if (isOnline(p)) return [t('Сейчас'), where, p.session_from ? `${t('с')} ${hhmm(p.session_from)}` : ''].filter(Boolean).join(' · ')
  const diff = Date.now() - new Date(p.last_seen).getTime()
  const min = Math.floor(diff / 60_000)
  const fem = /а$|я$/.test(p.name.split(' ')[0] ?? '')
  const was = fem ? t('Была') : t('Был')
  let when: string
  if (min < 60) when = `${min} ${t('мин')} ${t('назад')}`
  else if (diff < 24 * 3_600_000 && new Date(p.last_seen).getTime() >= startOfToday()) when = `${t('в')} ${hhmm(p.last_seen)}`
  else if (diff < 48 * 3_600_000) when = `${t('вчера в')} ${hhmm(p.last_seen)}`
  else when = new Date(p.last_seen).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return [`${was} ${when}`, where].filter(Boolean).join(' · ')
}
function badgeText(p: OnlinePerson): { text: string; tone: 'warn' } | null {
  if (p.auth_failed_today > 0) return { text: `${p.auth_failed_today} ${t('сбоя входа')}`, tone: 'warn' }
  const days = (Date.now() - new Date(p.last_seen).getTime()) / 86_400_000
  if (p.actor_kind === 'student' && days >= LONG_AWAY_DAYS) return { text: t('Давно не был'), tone: 'warn' }
  return null
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

export default function AdminOnlineNow() {
  const t = useT()
  const [period, setPeriod] = useState<Period>('now')
  const [group, setGroup] = useState<string>('all')
  const [rows, setRows] = useState<OnlinePerson[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const phone = PLATFORM === 'iphone' || PLATFORM === 'android'

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_online_people', { p_days: 7 })
    if (error) { setErr(/does not exist|schema cache/i.test(error.message) ? t('Миграция «Сейчас на сайте» ещё не применена.') : t('Не удалось загрузить: ') + error.message); setLoading(false); return }
    setErr(''); setRows((data ?? []) as OnlinePerson[]); setLoading(false)
  }, [t])
  useEffect(() => { void load() }, [load])
  // Раз в минуту — пока вкладка видна; секундный тик обновляет «N мин назад».
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') { void load(); setTick(x => x + 1) } }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  const inPeriod = useMemo(() => {
    void tick
    const today = startOfToday()
    return rows.filter(p => period === 'week' ? true : period === 'today' ? new Date(p.last_seen).getTime() >= today : isOnline(p))
  }, [rows, period, tick])
  const students = inPeriod.filter(p => p.actor_kind === 'student')
  const staff = inPeriod.filter(p => p.actor_kind !== 'student')
  const onlineCount = rows.filter(isOnline).length

  const groups = useMemo(() => {
    const m = new Map<string, { id: string; name: string; people: OnlinePerson[]; total: number }>()
    for (const p of rows.filter(r => r.actor_kind === 'student')) {
      const id = p.group_id ?? 'none'
      const g = m.get(id) ?? { id, name: p.group_name ?? t('Без группы'), people: [], total: 0 }
      g.total += 1
      m.set(id, g)
    }
    for (const p of students) m.get(p.group_id ?? 'none')?.people.push(p)
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [rows, students, t])
  const shownGroups = groups.filter(g => (group === 'all' || group === g.id) && g.people.length > 0)
  const person = rows.find(r => r.actor_id === selected) ?? null

  const filterItems = [{ id: 'all', label: t('Все группы') }, ...groups.map(g => ({ id: g.id, label: g.name })), { id: 'staff', label: t('Учителя') }]

  const list = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      {group !== 'staff' && shownGroups.map(g => (
        <section key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 4px 4px' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>{g.name}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-green-text)', whiteSpace: 'nowrap' }}>
              {g.people.filter(isOnline).length} {t('из')} {g.total} {t('онлайн')}
            </span>
          </div>
          {g.people.map(p => <PersonRow key={p.actor_id} p={p} phone={phone} active={selected === p.actor_id} onOpen={() => setSelected(p.actor_id)} />)}
        </section>
      ))}
      {group === 'staff' && staff.map(p => <PersonRow key={p.actor_id} p={p} phone={phone} active={selected === p.actor_id} onOpen={() => setSelected(p.actor_id)} />)}
      {group !== 'staff' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', fontSize: 13, color: 'var(--color-text-3)' }}>
          <Users size={15} strokeWidth={2} />
          <span>{t('Учителя онлайн')}: {staff.filter(isOnline).length}{staff.filter(isOnline).length ? ' · ' + staff.filter(isOnline).map(s => `${s.name} — ${screenName(s.last_path)}`).join(', ') : ''}</span>
        </div>
      )}
      {!loading && !err && students.length === 0 && group !== 'staff' && (
        <div style={{ padding: '28px 12px', textAlign: 'center', fontSize: 14, color: 'var(--color-text-3)' }}>
          {period === 'now' ? t('Сейчас никого из учеников нет на сайте.') : t('За этот период учеников не было.')}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-3)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontWeight: 600, fontSize: 12 }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
              {onlineCount} {t('онлайн')}
            </span>
            <span>{t('обновляется раз в минуту')}</span>
            {loading && <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
        </div>
        <Segmented variant="filter" value={period} onChange={setPeriod}
          items={[{ id: 'now', label: t('Сейчас') }, { id: 'today', label: t('Сегодня') }, { id: 'week', label: t('7 дней') }]} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <HScrollFade fade="var(--color-bg)">
          {filterItems.map(it => (
            <button key={it.id} type="button" data-hover="layer" onClick={() => setGroup(it.id)}
              style={{ flexShrink: 0, minHeight: 32, padding: '6px 12px', borderRadius: 999, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: group === it.id ? 600 : 500,
                background: group === it.id ? 'var(--grad-purple)' : 'var(--color-bg-3)', color: group === it.id ? '#fff' : 'var(--color-text-2)', whiteSpace: 'nowrap' }}>
              <OpticalText as="iskra-button-label">{it.label}</OpticalText>
            </button>
          ))}
        </HScrollFade>
      </div>
      {err && <Alert tone="danger" text={err} style={{ marginBottom: 12 }} />}

      {phone ? (
        <>
          {list}
          <MobileSheet open={!!person} onClose={() => setSelected(null)} softEdge>
            {person && <PersonDetail p={person} />}
          </MobileSheet>
        </>
      ) : (
        <>
        <style>{'@media (max-width: 960px) { .admin-online-grid { grid-template-columns: minmax(0, 1fr) !important } }'}</style>
        <div className="admin-online-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 460px)', gap: 24, alignItems: 'start' }}>
          {list}
          <div style={{ position: 'sticky', top: 12 }}>
            {person ? <PersonDetail p={person} card /> : (
              <div style={{ border: '1px dashed var(--color-border-medium)', borderRadius: 20, padding: '40px 24px', textAlign: 'center', fontSize: 14, color: 'var(--color-text-3)' }}>
                {t('Выберите человека — здесь будет, когда и как он заходил.')}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}

function PersonRow({ p, phone, active, onOpen }: { p: OnlinePerson; phone: boolean; active: boolean; onOpen: () => void }) {
  const online = isOnline(p)
  const badge = badgeText(p)
  const hours = new Set(p.hours)
  const nowH = new Date().getHours()
  return (
    <button type="button" data-hover="layer" onClick={onOpen} aria-pressed={active}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', minHeight: 60, border: 0, borderRadius: 14, cursor: 'pointer', textAlign: 'left',
        background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-2)', boxShadow: active ? 'inset 0 0 0 1px var(--color-accent)' : 'none', color: 'var(--color-text)' }}>
      <span style={{ position: 'relative', flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
        {initials(p.name)}
        {online && <span aria-label={t('онлайн')} style={{ position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: '50%', background: '#34C759', boxShadow: '0 0 0 2px var(--color-bg-2)' }} />}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, ...textFadeLines(1) }}>{p.name}</span>
        <span style={{ fontSize: 13, lineHeight: 1.3, color: online ? 'var(--color-green-text)' : 'var(--color-text-3)', ...textFadeLines(1) }}>{statusText(p)}</span>
      </span>
      {badge && (
        <span style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 999, background: 'var(--color-amber-soft)', color: 'var(--color-amber-text)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{badge.text}</span>
      )}
      {!phone && (
        <span aria-label={t('Активность за 24 часа')} title={t('Активность за 24 часа')} style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {Array.from({ length: 24 }, (_, i) => (nowH + 1 + i) % 24).map(h => (
            <span key={h} style={{ width: 4, height: 18, borderRadius: 2, background: hours.has(h) ? (online && h === nowH ? '#34C759' : 'var(--color-accent)') : 'var(--color-border-medium)', opacity: hours.has(h) ? 1 : 0.6 }} />
          ))}
        </span>
      )}
      {!phone && <span style={{ width: 76, flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)' }}>{device(p.viewport_w)}</span>}
      <ChevronRight size={16} style={{ flexShrink: 0, color: 'var(--color-text-3)' }} />
    </button>
  )
}

function PersonDetail({ p, card = false }: { p: OnlinePerson; card?: boolean }) {
  const t = useT()
  const [tl, setTl] = useState<Timeline | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    setTl(null); setErr('')
    void supabase.rpc('admin_online_timeline', { p_actor: p.actor_id, p_days: 7 }).then(({ data, error }) => {
      if (!alive) return
      if (error) setErr(error.message); else setTl(data as Timeline)
    })
    return () => { alive = false }
  }, [p.actor_id, p.last_seen])
  const online = isOnline(p)
  const weekMin = tl ? tl.days.reduce((s, d) => s + d.minutes, 0) : p.period_min
  const today = startOfToday()
  const todaySessions = (tl?.sessions ?? []).filter(s => new Date(s.to).getTime() >= today)
  const pos = (iso: string) => { const d = new Date(iso); const h = Math.max(8, d.getHours() + d.getMinutes() / 60); return Math.min(100, (h - 8) / 16 * 100) }
  const maxDay = Math.max(1, ...(tl?.days ?? []).map(d => d.minutes))
  const subtitle = [p.actor_kind === 'student' ? (p.group_name ?? t('Без группы')) : (p.actor_kind === 'admin' ? t('Администратор') : t('Учитель')), p.subject].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...(card ? { padding: '22px 24px', borderRadius: 20, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)' } : { padding: '4px 2px 16px' }) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: '50%', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>{initials(p.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{subtitle}</div>
        </div>
        {online && (
          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12, fontWeight: 600 }}>
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759' }} />
            {t('Онлайн')}{p.session_from ? ` · ${fmtMin(Math.max(1, Math.round((Date.now() - new Date(p.session_from).getTime()) / 60_000)))}` : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Stat label={t('Сегодня')} value={fmtMin(p.today_min)} />
        <Stat label={t('За 7 дней')} value={fmtMin(weekMin)} />
        <Stat label={t('Вход')} value={p.last_login ? `${hhmm(p.last_login)}${p.last_login_method ? ' · ' + loginLabel(p.last_login_method) : ''}` : '—'} />
      </div>

      {err && <Alert tone="danger" text={err} />}

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>{t('Сегодня')}</div>
        <div style={{ position: 'relative', height: 22, borderRadius: 6, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
          {todaySessions.map((s, i) => {
            const a = pos(s.from), b = pos(s.to)
            return <span key={i} title={`${hhmm(s.from)}–${hhmm(s.to)}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${a}%`, width: `max(5px, ${b - a}%)`, borderRadius: 6,
              background: s.auth_failed > 0 && s.minutes === 0 ? 'var(--color-amber)' : (online && i === 0 ? '#34C759' : 'var(--color-accent)') }} />
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
          {['08', '12', '16', '20', '24'].map(h => <span key={h}>{h}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {!tl && !err && <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('Загружаю…')}</div>}
        {tl?.sessions.slice(0, 8).map((s, i) => <SessionLines key={i} s={s} />)}
      </div>

      {tl && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>{t('7 дней')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 76 }}>
            {tl.days.map((d, i) => (
              <div key={d.day} title={fmtMin(d.minutes)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 18, height: Math.max(4, Math.round(d.minutes / maxDay * 52)), borderRadius: 4, background: d.minutes ? (i === tl.days.length - 1 ? '#34C759' : 'var(--color-accent)') : 'var(--color-border-medium)', opacity: d.minutes ? 1 : 0.6 }} />
                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{new Date(d.day + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SessionLines({ s }: { s: TimelineSession }) {
  const t = useT()
  const lines: { at: string; text: string; tone: 'ok' | 'warn' | 'plain' }[] = []
  const w = s.viewport ? Number(s.viewport.split(/[×x]/)[0]) : null
  const day = new Date(s.from).getTime() < startOfToday() ? new Date(s.from).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ', ' : ''
  if (s.login_method) lines.push({ at: hhmm(s.from), text: `${t('Вход')}: ${loginLabel(s.login_method)} · ${device(w)}`, tone: 'ok' })
  if (s.auth_failed > 0) lines.push({ at: hhmm(s.from), text: `${s.auth_failed} ${t('сбоя входа')}${s.provider ? ` (${s.provider === 'vk' ? 'VK' : s.provider})` : ''}${s.minutes === 0 ? ' — ' + t('кабинет не открылся') : ''}`, tone: 'warn' })
  const route = compactPaths(s.paths)
  if (route) lines.push({ at: hhmm(s.from), text: `${day}${route}${s.minutes ? ` · ${fmtMin(s.minutes)}` : ''}`, tone: 'plain' })
  if (!lines.length) return null
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0', fontSize: 13, lineHeight: 1.35 }}>
          <span style={{ width: 40, flexShrink: 0, fontWeight: 600, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>{l.at}</span>
          <span aria-hidden style={{ width: 7, height: 7, marginTop: 6, flexShrink: 0, borderRadius: '50%', background: l.tone === 'ok' ? '#34C759' : l.tone === 'warn' ? 'var(--color-amber)' : 'var(--color-text-3)' }} />
          <span style={{ flex: 1, minWidth: 0, color: l.tone === 'ok' ? 'var(--color-green-text)' : l.tone === 'warn' ? 'var(--color-amber-text)' : 'var(--color-text)' }}>{l.text}</span>
        </div>
      ))}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-3)', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, ...textFadeLines(1) }}>{value}</div>
    </div>
  )
}
