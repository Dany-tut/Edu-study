import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, SUPABASE_URL } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'
import { confirmDialog } from '../ConfirmHost'
import { Alert } from '../Alert'
import { Copy, Sparkles } from '../icons/appIcons'
import './profileIntegrations.css'

type Grant = { client: { id: string; name: string } }
const endpoint = SUPABASE_URL + '/functions/v1/iskra-mcp'

export default function ClaudeAccessCard() {
  const t = useT()
  const [grants, setGrants] = useState<Grant[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [service, setService] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const probe = useRef<AbortController | null>(null)
  const [acting, setActing] = useState(false)
  const [notice, setNotice] = useState('')
  const sequence = useRef(0)
  const refresh = useCallback(async () => {
    const seq = ++sequence.current
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
      setGrants(data ?? [])
      setStatus('ready')
    } catch {
      if (seq === sequence.current) setStatus('error')
    }
  }, [])
  useEffect(() => {
    void refresh()
    const visible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { sequence.current++; probe.current?.abort(); document.removeEventListener('visibilitychange', visible) }
  }, [refresh])

  async function revoke(grant: Grant) {
    const ok = await confirmDialog({ title:t('Отозвать доступ?'), message:grant.client.name + ' · ' + grant.client.id, confirmLabel:t('Отозвать доступ'), tone:'danger' })
    if (!ok) return
    setActing(true); setNotice('')
    try {
      const {error} = await supabase.auth.oauth.revokeGrant({ clientId:grant.client.id })
      if (error) throw error
      setNotice('Доступ отозван.')
    } catch { setNotice('Не удалось отозвать доступ. Попробуйте ещё раз.') }
    finally { await refresh(); setActing(false) }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(endpoint); setNotice('Адрес скопирован.') }
    catch { setNotice('Не удалось скопировать адрес.') }
  }

  return <section className="claude-access" aria-label="Claude (MCP)">
    <header><Sparkles size={24}/><div><strong>Claude (MCP)</strong>
      <p role="status">{service === 'ready' ? t('Сервис MCP доступен') : service === 'loading' ? t('Проверяем доступность MCP…') : t('Сервис MCP пока недоступен')}</p>
      </div>
    </header>
    <p>{t('В Claude откройте Settings → Connectors → Add custom connector и вставьте адрес Искры.')}</p>
    <code>{endpoint}</code>
    <div className="claude-access-actions">
      <button type="button" style={btn('S','secondary')} onClick={copy}><Copy size={15}/>{t('Скопировать адрес')}</button>
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
