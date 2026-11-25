import OpticalText from '../OpticalText'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import { confirmDialog } from '../ConfirmHost'
import { Alert } from '../Alert'
import { Copy, ExternalLink, Filter, Sparkles } from '../icons/appIcons'
import Switch from '../Switch'
import ScrollFade from '../ScrollFade'
import MobileSheet from '../MobileSheet'
import { PLATFORM } from '../../lib/platform'
import {
  type CallLogRow, effectiveScopes, type GrantScopesRow, loadMcpAccess, MCP_SCOPES, MCP_TOOL_LABEL,
  type McpScope, revokeMcpScopes, setMcpScopes,
} from '../../lib/mcpAccess'
import './profileIntegrations.css'

// «ИИ-помощники» в Интеграциях: подключения OAuth (Supabase), их права
// (mcp_grant_scopes) и журнал вызовов (mcp_call_log). ПК и iPad — две колонки
// «список | карточка»; iPhone и Android — список, карточка в листе снизу.
// Все действия видны без наведения (айпад получает десктопную разметку).

type Grant = { owner: string; client: { id: string; name: string; uri?: string }; grantedAt: string }
const endpoint = SUPABASE_URL + '/functions/v1/iskra-mcp'
const phone = PLATFORM === 'iphone' || PLATFORM === 'android'

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}
const hostOf = (uri?: string) => { try { return uri ? new URL(uri).host : '' } catch { return '' } }

export default function ClaudeAccessCard() {
  const t = useT()
  const [grants, setGrants] = useState<Grant[]>([])
  const [rows, setRows] = useState<Map<string, GrantScopesRow>>(new Map())
  const [log, setLog] = useState<CallLogRow[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [service, setService] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [selected, setSelected] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [onlyProblems, setOnlyProblems] = useState(false)
  const probe = useRef<AbortController | null>(null)
  const owner = useRef<string | null>(null)
  const { busy: acting, run: runAction, cancel: cancelAction } = useAsyncTask()
  const { run: runCopy, cancel: cancelCopy } = useAsyncTask()
  const [notice, setNotice] = useState('')
  const sequence = useRef(0)

  const refresh = useCallback(async () => {
    const account = owner.current
    if (!account) return
    const seq = ++sequence.current
    cancelAction()
    cancelCopy()
    setStatus('loading')
    setService('loading')
    probe.current?.abort()
    const controller = new AbortController()
    probe.current = controller
    const timer = window.setTimeout(() => controller.abort(), 8000)
    void fetch(endpoint + '/oauth-protected-resource', {
      credentials: 'omit', cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error()
      const metadata = await response.json()
      const matches = metadata.resource === endpoint && Array.isArray(metadata.authorization_servers)
        && metadata.authorization_servers.includes(SUPABASE_URL + '/auth/v1')
      if (seq === sequence.current) setService(matches ? 'ready' : 'unavailable')
    }).catch(() => {
      if (seq === sequence.current) setService('unavailable')
    }).finally(() => clearTimeout(timer))
    try {
      const [{ data, error }, access] = await Promise.all([supabase.auth.oauth.listGrants(), loadMcpAccess()])
      if (error) throw error
      if (seq !== sequence.current) return
      const list = (data ?? []).map(g => ({ owner: account, client: g.client, grantedAt: g.granted_at }))
      setGrants(list)
      setRows(access.scopes)
      setLog(access.log)
      setSelected(prev => prev && list.some(g => g.client.id === prev) ? prev : list[0]?.client.id ?? null)
      setStatus('ready')
    } catch {
      if (seq === sequence.current) setStatus('error')
    }
  }, [cancelAction, cancelCopy])

  useEffect(() => {
    let scheduled: ReturnType<typeof setTimeout>
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null
      if (next === owner.current) return
      owner.current = next
      sequence.current++
      cancelAction(); cancelCopy(); probe.current?.abort()
      setGrants([]); setRows(new Map()); setLog([]); setNotice(''); setStatus('loading'); setSheetOpen(false)
      clearTimeout(scheduled)
      // Auth callbacks run under the SDK session lock.
      if (next) scheduled = setTimeout(refresh, 0)
    })
    const visible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => {
      sequence.current++; owner.current = null
      clearTimeout(scheduled); probe.current?.abort(); data.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh, cancelAction, cancelCopy])

  const lastCall = useMemo(() => {
    const m = new Map<string, CallLogRow>()
    for (const r of log) if (!m.has(r.client_id)) m.set(r.client_id, r)
    return m
  }, [log])

  function removeScope(grant: Grant, scope: McpScope) {
    if (grant.owner !== owner.current) return
    const generation = sequence.current
    const next = effectiveScopes(rows.get(grant.client.id)).filter(s => s !== scope)
    setNotice('')
    void runAction(async signal => {
      const saved = await setMcpScopes(grant.client.id, next)
      signal.throwIfAborted()
      return generation === sequence.current ? saved : null
    }, saved => {
      if (!saved) return
      setNotice('Право снято. Вернуть его можно, переподключив помощника.')
      void refresh()
    }, () => { setNotice('Не удалось изменить права. Попробуйте ещё раз.'); void refresh() })
  }

  function revoke(grant: Grant) {
    if (grant.owner !== owner.current) return
    const generation = sequence.current
    cancelCopy()
    setNotice('')
    void runAction(async signal => {
      const ok = await confirmDialog({ title: t('Отозвать доступ?'), message: grant.client.name + ' · ' + grant.client.id, confirmLabel: t('Отозвать доступ'), tone: 'danger' })
      signal.throwIfAborted()
      if (!ok || generation !== sequence.current) return false
      const { data: { session } } = await supabase.auth.getSession()
      signal.throwIfAborted()
      if (!session || session.user.id !== grant.owner || owner.current !== grant.owner || generation !== sequence.current) return false
      // Сначала отметка отзыва в Искре: уже выданный токен перестаёт работать
      // на следующем же вызове, а не через час, когда истечёт сам.
      await revokeMcpScopes(grant.client.id)
      signal.throwIfAborted()
      // Bind the DELETE to the confirmed account. The shared SDK helper would
      // look up the current session again and cannot take an AbortSignal.
      const url = new URL(SUPABASE_URL + '/auth/v1/user/oauth/grants')
      url.searchParams.set('client_id', grant.client.id)
      const response = await fetch(url, { method: 'DELETE', signal, headers: {
        apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token,
      } })
      if (!response.ok) throw new Error()
      return true
    }, revoked => {
      if (revoked) { setNotice('Доступ отозван.'); setSheetOpen(false); void refresh() }
    }, () => { setNotice('Не удалось отозвать доступ. Попробуйте ещё раз.'); void refresh() })
  }

  function copy() {
    setNotice('')
    void runCopy(() => navigator.clipboard.writeText(endpoint),
      () => setNotice('Адрес скопирован.'), () => setNotice('Не удалось скопировать адрес.'))
  }

  const current = grants.find(g => g.client.id === selected) ?? null

  const grantItem = (grant: Grant) => {
    const scopes = effectiveScopes(rows.get(grant.client.id))
    const last = lastCall.get(grant.client.id)
    const active = !phone && grant.client.id === selected
    return <button type="button" key={grant.client.id} className="ai-assist-item" data-active={active || undefined}
      aria-pressed={phone ? undefined : active}
      onClick={() => { setSelected(grant.client.id); if (phone) setSheetOpen(true) }}>
      <span className="ai-assist-avatar" aria-hidden><Sparkles size={16} /></span>
      <span className="ai-assist-item-text">
        <span><strong>{grant.client.name}</strong> <small>{t('назвался так')}</small></span>
        <small>{t('подключён')} {fmtTime(grant.grantedAt)}{last ? ` · ${t('вызов')} ${fmtTime(last.created_at)}` : ''}</small>
        <span className="ai-assist-chips">{MCP_SCOPES.filter(s => scopes.includes(s.id)).map(s =>
          <span key={s.id} className="ai-assist-chip">{t(s.label)}</span>)}</span>
      </span>
    </button>
  }

  const detail = (grant: Grant) => {
    const row = rows.get(grant.client.id)
    const scopes = effectiveScopes(row)
    const entries = log.filter(r => r.client_id === grant.client.id && (!onlyProblems || !['ok', 'started'].includes(r.status)))
    return <div className="ai-assist-detail">
      <div className="ai-assist-detail-head">
        <div><strong>{grant.client.name}</strong>
          <small><code>{grant.client.id}</code>{hostOf(grant.client.uri) ? ` · ${hostOf(grant.client.uri)}` : ''}</small></div>
        {!phone && <button type="button" disabled={acting} onClick={() => revoke(grant)} className="integration-action integration-disconnect"><OpticalText as="iskra-button-label">{t('Отозвать доступ')}</OpticalText></button>}
      </div>
      {!row && <p className="ai-assist-hint">{t('Подключён до выбора прав: действуют прежние права. Переподключите помощника, чтобы выбрать права и открыть ленту событий.')}</p>}
      <div className="ai-assist-section">{t('Права')}</div>
      <div className="ai-assist-rights">
        {MCP_SCOPES.map(s => {
          const on = scopes.includes(s.id)
          return <div key={s.id} className="ai-assist-right">
            <span><span>{t(s.label)}</span><small>{t(s.hint)}</small></span>
            <Switch checked={on} disabled={!on || acting} label={t(s.label)} onChange={v => { if (!v) removeScope(grant, s.id) }} />
          </div>
        })}
      </div>
      <p className="ai-assist-hint">{t('Снять право можно здесь. Добавить — только новым согласием в самом помощнике.')}</p>
      <div className="ai-assist-section ai-assist-log-head">
        <span>{t('Журнал вызовов')}</span>
        <button type="button" className="integration-action ai-assist-filter" data-primary={onlyProblems || undefined}
          aria-pressed={onlyProblems} onClick={() => setOnlyProblems(v => !v)}><Filter size={14} /><OpticalText as="iskra-button-label">{t('Только отказы')}</OpticalText></button>
      </div>
      {entries.length ? <LogScroll>
        <ul className="ai-assist-log">
          {entries.slice(0, 100).map(r => <li key={r.id}>
            <time dateTime={r.created_at}>{fmtTime(r.created_at)}</time>
            <span><b>{t(MCP_TOOL_LABEL[r.tool] ?? r.tool)}</b>{r.result_count != null && r.status === 'ok' ? ` · ${r.result_count}` : ''}</span>
            <span className="ai-assist-status" data-tone={r.status === 'ok' ? 'ok' : r.status === 'started' ? 'muted' : 'bad'}>{t(statusLabel(r.status))}</span>
          </li>)}
        </ul>
      </LogScroll> : <p className="ai-assist-hint">{onlyProblems ? t('Отказов нет.') : t('Вызовов пока не было.')}</p>}
    </div>
  }

  return <section className="claude-access" aria-label={t('ИИ-помощники')}>
    <header><Sparkles size={24} /><div><strong>{t('ИИ-помощники')}</strong>
      <p role="status">{service === 'ready' ? t('Сервис MCP доступен') : service === 'loading' ? t('Проверяем доступность MCP…') : t('Сервис MCP пока недоступен')}</p>
    </div>
    </header>
    <p>{t('Claude и другие приложения с поддержкой MCP читают данные ваших учеников от вашего имени и только в пределах выданных прав. Тексты учеников передаются как данные, а не как команды.')}</p>
    <code>{endpoint}</code>
    <div className="claude-access-actions">
      <button type="button" className="integration-action" disabled={acting} onClick={copy}><Copy size={15} /><OpticalText as="iskra-button-label">{t('Скопировать адрес')}</OpticalText></button>
      <a href="https://claude.ai/customize/connectors/yours?modal=add-custom-connector" target="_blank" rel="noopener noreferrer"
        className="integration-action"><ExternalLink size={15} />{t('Открыть Claude')}</a>
      <button type="button" className="integration-action" disabled={acting || status === 'loading'} onClick={() => { setNotice(''); void refresh() }}><OpticalText as="iskra-button-label">{t('Обновить статус')}</OpticalText></button>
    </div>
    <div><strong>{t('Подключённые помощники')}</strong>
      <p role="status">{status === 'loading' && !grants.length ? t('Проверяем подключение…') : status === 'error' ? t('Не удалось проверить разрешения приложений.') : grants.length ? t('Имя помощник сообщает о себе сам — сверяйте адрес и id.') : t('Помощники не подключены. Скопируйте адрес и добавьте Искру в помощнике.')}</p>
    </div>
    {/* При обновлении список остаётся на месте: иначе страница прыгает к началу. */}
    {status !== 'error' && grants.length > 0 && <div className="ai-assist-cols" data-phone={phone || undefined}>
      <div className="ai-assist-list">{grants.map(grantItem)}</div>
      {!phone && current && detail(current)}
    </div>}
    {notice && <div role="status"><Alert tone={notice.startsWith('Не удалось') ? 'danger' : 'info'} text={t(notice)} /></div>}
    {phone && current && <MobileSheet open={sheetOpen} onClose={() => setSheetOpen(false)} softEdge title={current.client.name}
      footer={<button type="button" disabled={acting} onClick={() => revoke(current)} className="integration-action integration-disconnect ai-assist-revoke-pill"><OpticalText as="iskra-button-label">{t('Отозвать доступ')}</OpticalText></button>}>
      {detail(current)}
    </MobileSheet>}
  </section>
}

// На телефоне журнал листается вместе с листом (у листа свои фейды): вложенная
// прокрутка внутри прокрутки на пальце неудобна. На ПК и iPad — своя область.
function LogScroll({ children }: { children: React.ReactNode }) {
  return phone ? <>{children}</> : <ScrollFade maxHeight={260} bg="var(--color-bg-2)">{children}</ScrollFade>
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ok': return 'ок'
    case 'started': return 'выполняется'
    case 'denied': return 'нет права'
    case 'rate_limited': return 'лимит'
    case 'revoked': return 'отозван'
    default: return 'ошибка'
  }
}
