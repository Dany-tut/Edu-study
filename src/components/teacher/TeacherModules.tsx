// Профиль → «Модули»: подключаемые продукты. Пока один — Тестли.
// Подключение — кодом из Тестли (меню профиля → «Подключить к Искре»):
// код меняет на ключ сервер (testly-bridge), в браузер ключ не попадает.
import { useEffect, useState } from 'react'
import { Check, ClipboardPaste, Copy, ExternalLink, Loader2, Sparkles } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { connectTestly, disconnectTestly, plural, useTestlyModule, TESTLY_SITE } from '../../lib/testlyModule'
import { confirmDialog } from '../ConfirmHost'
import { Alert } from '../Alert'
import { TestlyTile } from '../TestlyMark'
import { btn } from '../../lib/pillStyles'
import { supabase, SUPABASE_URL } from '../../lib/supabase'

export default function TeacherModules() {
  const t = useT()
  const { loaded, connected, email, tests, load } = useTestlyModule()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [claudeGrants, setClaudeGrants] = useState<Array<{ client: { id: string; name: string }; granted_at: string }>>([])
  const [claudeLoaded, setClaudeLoaded] = useState(false)
  const [claudeError, setClaudeError] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { void load() }, [load])

  const claudeMcpUrl = `${SUPABASE_URL}/functions/v1/iskra-mcp`
  async function loadClaudeGrants() {
    setClaudeError('')
    try {
      const { data, error } = await supabase.auth.oauth.listGrants()
      if (error) throw error
      setClaudeGrants((data ?? []).filter(g => /claude|anthropic/i.test(g.client.name)))
      setClaudeLoaded(true)
    } catch {
      setClaudeGrants([])
      setClaudeLoaded(true)
      setClaudeError(t('Проверка подключения Claude пока недоступна.'))
    }
  }
  useEffect(() => {
    void loadClaudeGrants()
    const onFocus = () => { if (document.visibilityState === 'visible') void loadClaudeGrants() }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [])

  // Код набирают как угодно — «k5b ajd», «K5B-AJD»: оставляем шесть букв и цифр.
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

  async function connect(value = code) {
    if (busy || value.length < 6) return
    setBusy(true); setError('')
    try { await connectTestly(value); setCode('') }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  /** Вставили целый код — подключаем сразу, «Подключить» жать не нужно. */
  function take(raw: string) {
    const v = clean(raw)
    setCode(v); setError('')
    if (v.length === 6) void connect(v)
  }

  async function pasteFromClipboard() {
    try { take(await navigator.clipboard.readText()) }
    catch { setError(t('Браузер не дал прочитать буфер — вставьте код в поле сочетанием ⌘V.')) }
  }

  async function disconnect() {
    const ok = await confirmDialog({
      title: t('Отключить Тестли?'),
      message: t('Кнопки «Из Тестли» пропадут. Тесты, уже поставленные в домашки, останутся — ученики их пройдут.'),
      confirmLabel: t('Отключить'),
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true); setError('')
    try { await disconnectTestly() }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }

  async function disconnectClaude() {
    const ok = await confirmDialog({
      title: t('Отключить Claude от Искры?'),
      message: t('Claude больше не сможет читать и создавать материалы в вашем кабинете. Курсы, уроки и тесты останутся в Искре.'),
      confirmLabel: t('Отключить'),
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true); setClaudeError('')
    try {
      for (const grant of claudeGrants) {
        const { error } = await supabase.auth.oauth.revokeGrant({ clientId: grant.client.id })
        if (error) throw error
      }
      await loadClaudeGrants()
    } catch {
      setClaudeError(t('Не удалось отозвать доступ Claude. Попробуйте ещё раз.'))
    } finally {
      setBusy(false)
    }
  }

  async function copyClaudeUrl() {
    try {
      await navigator.clipboard.writeText(claudeMcpUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setClaudeError(t('Не удалось скопировать адрес.'))
    }
  }

  const pill = (bg: string, color: string, text: string) => (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: bg, color, flexShrink: 0 }}>{text}</span>
  )

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>{t('Модули')}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-3)', marginBottom: 12 }}>
        {t('Подключённый модуль появляется в домашке, уроках курса и Конструкторе: через него можно добавлять задания.')}
      </div>

      <div style={{
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 20,
        padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TestlyTile size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Тестли')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
              {connected
                ? `${email || t('аккаунт Тестли')} · ${tests} ${t(plural(tests, 'тест', 'теста', 'тестов'))}`
                : t('Тесты, контрольные и пробники с баллами как на экзамене')}
            </div>
          </div>
          {!loaded ? null : connected
            ? pill('var(--color-green-soft)', 'var(--color-green-text)', t('Подключён'))
            : pill('var(--color-bg-3)', 'var(--color-text-3)', t('Не подключён'))}
        </div>

        <div style={{ height: 1, background: 'var(--color-border-soft)' }} />

        {connected ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>{t('Где появилось')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[t('ДЗ → «Из Тестли»'), t('Уроки курса'), t('Конструктор → Тесты')].map(s => (
                  <span key={s} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px 6px 10px', borderRadius: 999,
                    background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600,
                  }}><Check size={12} strokeWidth={2.4} /> {s}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={`${TESTLY_SITE}/app`} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)',
                color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}><ExternalLink size={13} /> {t('Открыть Тестли')}</a>
              <button onClick={() => void disconnect()} disabled={busy} style={btn('S', 'secondary')}>{t('Отключить')}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                <input
                  value={code}
                  onChange={e => { setCode(clean(e.target.value)); setError('') }}
                  onPaste={e => { e.preventDefault(); take(e.clipboardData.getData('text')) }}
                  onKeyDown={e => { if (e.key === 'Enter') void connect() }}
                  placeholder={t('Код из Тестли, например K7P29Q')}
                  autoComplete="off"
                  style={{
                    flex: 1, padding: '10px 96px 10px 14px', borderRadius: 12, border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit',
                    outline: 'none', letterSpacing: code ? 1.5 : 0, fontVariantNumeric: 'tabular-nums',
                  }}
                />
                {/* Вставить из буфера: код копируют в Тестли кнопкой «Скопировать». */}
                <button onClick={() => void pasteFromClipboard()} disabled={busy} style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 9,
                  border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <ClipboardPaste size={13} /> {t('Вставить')}
                </button>
              </div>
              <button onClick={() => void connect()} disabled={busy || code.length < 6} style={{
                padding: '10px 18px', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 6, opacity: busy || code.length < 6 ? 0.6 : 1,
              }}>
                {busy && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {t('Подключить')}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {t('Код — в Тестли: Профиль → «Подключить к Искре». Он действует 10 минут.')}
            </div>
          </>
        )}
        {error && <Alert tone="danger" text={error} />}
      </div>

      <div style={{
        marginTop: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 20,
        padding: 18, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 14, background: 'var(--color-purple-soft)', color: 'var(--color-accent)' }}><Sparkles size={21} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Claude</div>
            <div style={{ fontSize: 12, color: claudeGrants.length ? 'var(--color-green-text)' : 'var(--color-text-3)', marginTop: 2 }}>
              {!claudeLoaded ? t('Проверяем подключение…') : claudeGrants.length ? `${t('Подключён к Искре')} · ${claudeGrants.length}` : t('Не подключён')}
            </div>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', flexShrink: 0 }}>MCP</span>
        </div>

        <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-3)' }}>
          {t('Добавляйте курсы, уроки и тесты в Искру прямо из Claude. Доступ ограничен вашим аккаунтом преподавателя.')}
        </div>

        {claudeGrants.length ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[t('Ваши курсы'), t('Черновики курсов и уроков'), t('Тесты к черновым урокам')].map(s => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}><Check size={12} strokeWidth={2.4} />{s}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text-3)' }}>{t('Публикация и доступ ученикам остаются под вашим контролем.')}</div>
            <div><button type="button" onClick={() => void disconnectClaude()} disabled={busy} style={btn('S', 'secondary')}>{busy ? <Loader2 size={14} /> : null}{t('Отключить Claude')}</button></div>
          </>
        ) : (
          <>
            <div style={{ padding: 13, borderRadius: 14, background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 12, lineHeight: 1.45 }}>
              {t('В Claude откройте Settings → Connectors → Add custom connector и вставьте адрес Искры.')}
              <div style={{ marginTop: 8, overflowWrap: 'anywhere', color: 'var(--color-text-3)', fontFamily: 'monospace', fontSize: 11 }}>{claudeMcpUrl}</div>
            </div>
            <div><button type="button" onClick={() => void copyClaudeUrl()} style={btn('S', 'secondary')}><Copy size={14} />{copied ? t('Скопировано') : t('Скопировать адрес для Claude')}</button></div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('После добавления подтвердите вход и доступ в окне Искры. Это можно отменить в любой момент.')}</div>
          </>
        )}
        {claudeError && <Alert tone="danger" text={claudeError} />}
      </div>
    </div>
  )
}
