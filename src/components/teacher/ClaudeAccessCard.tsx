import { useCallback, useEffect, useRef, useState } from 'react'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'
import { confirmDialog } from '../ConfirmHost'
import { Alert } from '../Alert'
import { Copy, ExternalLink, Sparkles } from '../icons/appIcons'
import './profileIntegrations.css'

type Grant = { owner: string; client: { id: string; name: string } }
const endpoint = SUPABASE_URL + '/functions/v1/iskra-mcp'

export default function ClaudeAccessCard() {
  const t = useT()
  const [grants, setGrants] = useState<Grant[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [service, setService] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const probe = useRef<AbortController | null>(null)
  const owner = useRef<string | null>(null)
  const { busy: acting, run: runRevoke, cancel: cancelRevoke } = useAsyncTask()
  const { run: runCopy, cancel: cancelCopy } = useAsyncTask()
  const [notice, setNotice] = useState('')
  const sequence = useRef(0)
  const refresh = useCallback(async () => {
    const account = owner.current
    if (!account) return
    const seq = ++sequence.current
    cancelRevoke()
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
      const {data, error} = await supabase.auth.oauth.listGrants()
      if (error) throw error
      if (seq !== sequence.current) return
      setGrants((data ?? []).map(g => ({ owner: account, client: g.client })))
      setStatus('ready')
    } catch {
      if (seq === sequence.current) setStatus('error')
    }
  }, [cancelRevoke, cancelCopy])
  useEffect(() => {
    let scheduled: ReturnType<typeof setTimeout>
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null
      if (next === owner.current) return
      owner.current = next
      sequence.current++
      cancelRevoke(); cancelCopy(); probe.current?.abort()
      setGrants([]); setNotice(''); setStatus('loading')
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
  }, [refresh, cancelRevoke, cancelCopy])

  function revoke(grant: Grant) {
    if (grant.owner !== owner.current) return
    const generation = sequence.current
    cancelCopy()
    setNotice('')
    void runRevoke(async signal => {
      const ok = await confirmDialog({ title:t('Отозвать доступ?'), message:grant.client.name + ' · ' + grant.client.id, confirmLabel:t('Отозвать доступ'), tone:'danger' })
      signal.throwIfAborted()
      if (!ok || generation !== sequence.current) return false
      const { data: { session } } = await supabase.auth.getSession()
      signal.throwIfAborted()
      if (!session || session.user.id !== grant.owner || owner.current !== grant.owner || generation !== sequence.current) return false
      // Bind the DELETE to the confirmed account. The shared SDK helper would
      // look up the current session again and cannot take an AbortSignal.
      const url = new URL(SUPABASE_URL + '/auth/v1/user/oauth/grants')
      url.searchParams.set('client_id', grant.client.id)
      const response = await fetch(url, { method:'DELETE', signal, headers:{
        apikey:SUPABASE_KEY, Authorization:'Bearer ' + session.access_token,
      } })
      if (!response.ok) throw new Error()
      return true
    }, revoked => {
      if (revoked) { setNotice('Доступ отозван.'); void refresh() }
    }, () => { setNotice('Не удалось отозвать доступ. Попробуйте ещё раз.'); void refresh() })
  }

  function copy() {
    setNotice('')
    void runCopy(() => navigator.clipboard.writeText(endpoint),
      () => setNotice('Адрес скопирован.'), () => setNotice('Не удалось скопировать адрес.'))
  }

  return <section className="claude-access" aria-label="Claude (MCP)">
    <header><Sparkles size={24}/><div><strong>Claude (MCP)</strong>
      <p role="status">{service === 'ready' ? t('Сервис MCP доступен') : service === 'loading' ? t('Проверяем доступность MCP…') : t('Сервис MCP пока недоступен')}</p>
      </div>
    </header>
    <p>{t('Скопируйте адрес Искры и вставьте его в поле MCP server URL в Claude. Форма также доступна в Customize → Connectors → Add custom connector.')}</p>
    <code>{endpoint}</code>
    <div className="claude-access-actions">
      <button type="button" style={btn('S','secondary')} disabled={acting} onClick={copy}><Copy size={15}/>{t('Скопировать адрес')}</button>
      <a href="https://claude.ai/customize/connectors/yours?modal=add-custom-connector" target="_blank" rel="noopener noreferrer"
        style={{ ...btn('S','secondary'), minHeight:44, textDecoration:'none' }}><ExternalLink size={15}/>{t('Открыть Claude')}</a>
      <button type="button" style={btn('S','secondary')} disabled={acting || status === 'loading'} onClick={() => { setNotice(''); void refresh() }}>{t('Обновить статус')}</button>
    </div>
    <div><strong>{t('Подключённые приложения')}</strong>
      <p role="status">{status === 'loading' ? t('Проверяем подключение…') : status === 'error' ? t('Не удалось проверить разрешения приложений.') : grants.length ? t('Приложения с доступом к вашему аккаунту') : t('Доступ не выдан')}</p>
    </div>
    {status === 'ready' && grants.map(grant => <div className="claude-access-grant" key={grant.client.id}>
      <span>{grant.client.name}<br/><code>{grant.client.id}</code></span><button type="button" disabled={acting} onClick={() => void revoke(grant)} style={btn('S','secondary')}>{t('Отозвать доступ')}</button>
    </div>)}
    {notice && <div role="status"><Alert tone={notice.startsWith('Не удалось')?'danger':'info'} text={t(notice)}/></div>}
  </section>
}
