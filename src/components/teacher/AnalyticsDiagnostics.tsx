import { useEffect, useState } from 'react'
import { INCIDENT_EVENTS } from '../../lib/incidentTelemetry'
import { supabase } from '../../lib/supabase'
import { Alert } from '../Alert'
import ScrollFade from '../ScrollFade'

type Row = { id: number; created_at: string; event: string; path: string | null; role: string; session_id: string; meta: Record<string, unknown>; ua: string | null; user_id: string | null; student_id: string | null }
const columns = 'id,created_at,event,path,role,session_id,meta,ua,user_id,student_id'
const failures = [...INCIDENT_EVENTS, 'network_offline']
const box = { padding: 16, borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg-2)' }
const button = { minHeight: 44, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', color: 'var(--color-text)', cursor: 'pointer' }
export default function AnalyticsDiagnostics({ days }: { days: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [requests, setRequests] = useState<Row[]>([])
  const [timeline, setTimeline] = useState<Row[]>([])
  const [session, setSession] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [sessionBusy, setSessionBusy] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [updated, setUpdated] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setError(''); setRows([]); setRequests([]); setSession('')
    const since = new Date(Date.now() - days * 86400000).toISOString()
    void (async () => {
      try {
        const [issues, api] = await Promise.all([
          supabase.from('analytics_events').select(columns).gte('created_at', since).in('event', failures).order('created_at', { ascending: false }).limit(500).abortSignal(controller.signal),
          supabase.from('analytics_events').select(columns).gte('created_at', since).eq('event', 'api_request').order('created_at', { ascending: false }).limit(500).abortSignal(controller.signal),
        ])
        if (controller.signal.aborted) return
        if (issues.error || api.error) throw new Error(issues.error?.message ?? api.error?.message)
        setRows((issues.data ?? []) as Row[]); setRequests((api.data ?? []) as Row[])
        setUpdated(new Date().toLocaleString('ru-RU'))
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Не удалось загрузить журнал') }
      finally { if (!controller.signal.aborted) setBusy(false) }
    })()
    return () => controller.abort()
  }, [days, refresh])
  useEffect(() => {
    setTimeline([]); setSessionError('')
    if (!session) return
    const controller = new AbortController()
    setSessionBusy(true)
    void (async () => {
      try {
        const result = await supabase.from('analytics_events').select(columns).eq('session_id', session)
          .order('created_at', { ascending: false }).limit(200).abortSignal(controller.signal)
        if (controller.signal.aborted) return
        if (result.error) throw result.error
        setTimeline(((result.data ?? []) as Row[]).reverse())
      } catch { if (!controller.signal.aborted) setSessionError('Не удалось загрузить сессию. Выберите её повторно после обновления.') }
      finally { if (!controller.signal.aborted) setSessionBusy(false) }
    })()
    return () => controller.abort()
  }, [session, refresh])
  const bad = requests.filter(r => Number(r.meta.status) === 0 || Number(r.meta.status) >= 400)
  const slow = requests.filter(r => Number(r.meta.duration_ms) >= 3000)
  const incidents = [...rows, ...requests.filter(r => bad.includes(r) || slow.includes(r))].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const durations = requests.map(r => Number(r.meta.duration_ms)).filter(Number.isFinite).sort((a,b) => a-b)
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ product: 'Искра', exported_at: new Date().toISOString(), period_days: days, scope: 'Latest 500 incidents, 500 requests, 200 session events; client telemetry only', rows, requests, session, timeline }, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `iskra-diagnostics-${Date.now()}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section style={{ display: 'grid', gap: 16, color: 'var(--color-text)', overflowWrap: 'anywhere' }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <h3 style={{ margin: 0, flex: 1 }}>Диагностика Искры</h3>
      <button data-hover="layer" style={button} disabled={busy} onClick={() => setRefresh(n => n+1)}>Обновить</button>
      <button data-hover="layer" style={button} disabled={busy || !!error} onClick={download}>Скачать JSON</button>
    </div>
    <p style={{ margin: 0, color: 'var(--color-text-3)', fontSize: 13 }}>За {days} дней: последние 500 ошибок и отключений, 500 запросов. Показатели относятся только к этой выборке. Обновлено: {updated || '—'}. Клиентский журнал не подтверждает доступность сервера; при полном сбое доставки события могут отсутствовать. Тестли имеет отдельную базу и здесь не контролируется.</p>
    {error && <Alert tone="danger" title="Диагностика недоступна" text={error} />}
    {busy ? <p role="status">Загрузка диагностики…</p> : !error && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          ['Инциденты и отключения', rows.length], ['Неудачные API-запросы', `${bad.length} / ${requests.length}`],
          ['Медленнее 3 секунд', slow.length], ['API p95', durations.length ? `${durations[Math.ceil(durations.length * .95)-1]} мс` : 'Нет данных'],
          ['Затронутые сессии в выборке', new Set(incidents.map(r => r.session_id)).size],
        ].map(([label, value]) => <div key={label} style={box}><div style={{ fontSize: 12 }}>{label}</div><strong style={{ fontSize: 24 }}>{value}</strong></div>)}
      </div>
      <div style={box}>
        <h4 style={{ marginTop: 0 }}>Сбои · выберите сессию для разбора</h4>
        {!incidents.length && <p>В выборке сбоев нет. Это не гарантия отсутствия проблем.</p>}
        <ScrollFade maxHeight={420}>
          {incidents.map(r => <button data-hover="layer" key={r.id} style={{ ...button, display: 'block', width: '100%', textAlign: 'left', marginBottom: 8 }} onClick={() => setSession(r.session_id)}>
            <strong>{String(r.meta.msg ?? r.meta.endpoint ?? r.event)}</strong><br />
            {new Date(r.created_at).toLocaleString('ru-RU')} · {r.role} · {r.path} · {String(r.meta.app_version ?? 'Версия неизвестна')}
            {r.event === 'api_request' && <span> · HTTP {String(r.meta.status)} · {String(r.meta.duration_ms)} мс</span>}
          </button>)}
        </ScrollFade>
      </div>
      {session && <div style={box}>
        <h4 style={{ marginTop: 0 }}>Сессия {session}</h4>
        <p>Последние 200 событий сессии, от ранних к поздним. Клики и пульсы хранятся 14 дней; остальные события — до 180 дней. Журнал может быть неполным.</p>
        {sessionBusy && <p role="status">Загрузка сессии…</p>}
        {sessionError && <Alert tone="danger" title="Сессия недоступна" text={sessionError} />}
        <ScrollFade maxHeight={480}>
          {timeline.map(r => <details key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
            <summary style={{ cursor: 'pointer', minHeight: 44 }}>{new Date(r.created_at).toLocaleTimeString('ru-RU')} · {r.event} · {r.path}</summary>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>Пользователь: {r.user_id || '—'} · Ученик: {r.student_id || '—'} · {r.role}<br />{JSON.stringify(r.meta, null, 2)}<br />{r.ua}</div>
          </details>)}
        </ScrollFade>
      </div>}
      <div style={box}><strong>Порядок разбора</strong><ol style={{ paddingLeft: 20, marginBottom: 0 }}>
        <li>Уточните время, экран, роль и версию в событии; откройте цепочку сессии.</li>
        <li>HTTP 0: проверьте сеть; 401/403: сессию и права; 429: лимиты; 5xx: серверные логи Supabase и Vercel.</li>
        <li>Сопоставьте версию с релизом, сохраните JSON, воспроизведите действие и проверьте исправление на том же сценарии.</li>
      </ol></div>
    </>}
  </section>
}
