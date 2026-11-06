// Карточка ученика → «Напоминания в Telegram»: подключить бота одноразовой
// ссылкой, увидеть, кем подключён, отвязать. Видно только с функцией
// reminders (без неё блока нет вовсе).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Copy, Check } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { useFeature } from '../../lib/teacherFeatures'
import { btn, tile } from '../../lib/pillStyles'
import { textFadeLines } from '../../lib/textFades'
import { confirmDialog } from '../ConfirmHost'
import { createTgLink, fetchTgLinkStatus, unlinkTg, type TgLinkStatus } from '../../lib/tgReminders'

export default function StudentTgLink({ studentId }: { studentId: string }) {
  const on = useFeature('reminders')
  if (!on || !studentId) return null
  return <StudentTgLinkInner key={studentId} studentId={studentId} />
}

function StudentTgLinkInner({ studentId }: { studentId: string }) {
  const t = useT()
  const [status, setStatus] = useState<TgLinkStatus | null>(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  const load = useCallback(async () => {
    const s = await fetchTgLinkStatus(studentId)
    if (alive.current) setStatus(s)
  }, [studentId])
  useEffect(() => { void load() }, [load])
  // Ученик жмёт «Start» в другом приложении — вернулись на вкладку, обновили.
  useEffect(() => {
    if (!url) return
    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [url, load])

  if (!status) return null

  async function makeLink() {
    setBusy(true); setError('')
    const res = await createTgLink(studentId)
    if (!alive.current) return
    setBusy(false)
    if ('url' in res) { setUrl(res.url); setCopied(false) }
    else setError(res.error === 'not_configured' || res.error === 'bot_unavailable'
      ? t('Бот сейчас недоступен.\nПопробуйте позже.')
      : t('Не удалось создать ссылку.\nПопробуйте ещё раз.'))
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); if (alive.current) setCopied(true) }
    catch { if (alive.current) setError(t('Не удалось скопировать')) }
  }

  async function unlink() {
    if (!await confirmDialog({
      title: t('Отключить напоминания?'),
      message: t('Ученик перестанет получать сообщения бота. Подключить снова можно новой ссылкой.'),
      confirmLabel: t('Отключить'), tone: 'danger',
    })) return
    setBusy(true)
    const ok = await unlinkTg(studentId)
    if (!alive.current) return
    setBusy(false)
    if (ok) { setUrl(''); void load() } else setError(t('Не удалось отключить.\nПопробуйте ещё раз.'))
  }

  const linked = status.linked && !status.blocked
  const who = status.username ? '@' + status.username : status.firstName ?? ''
  const title = linked ? t('Напоминания в Telegram подключены')
    : status.blocked ? t('Ученик заблокировал бота')
    : t('Напоминания в Telegram')
  const sub = linked ? who
    : status.blocked ? t('Сообщения не доходят. Пришлите новую ссылку.')
    : url ? t('Отправьте ссылку ученику. Она одноразовая и действует 7 дней.')
    : t('Урок скоро, ДЗ завтра, ДЗ просрочено — бот Искры напомнит сам.')

  return (
    <section className="student-tg-link" aria-label={t('Напоминания в Telegram')} style={{
      display: 'flex', flexDirection: 'column', gap: 12, padding: 16, marginBottom: 14,
      border: '1px solid var(--color-border-soft)', borderRadius: 18, background: 'var(--color-bg-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={tile(linked ? 'green' : status.blocked ? 'red' : 'blue', 36)}><Send size={18} /></span>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-3)', marginTop: 2 }}>{sub}</div>
        </div>
        {linked
          ? <button type="button" data-hover="layer" disabled={busy} onClick={unlink} style={btn('S', 'secondary', { opacity: busy ? 0.6 : 1 })}>{t('Отключить')}</button>
          : !url && <button type="button" disabled={busy} onClick={makeLink} style={btn('S', 'primary', { opacity: busy ? 0.6 : 1 })}>{status.blocked ? t('Новая ссылка') : t('Подключить')}</button>}
      </div>
      {url && !linked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div title={url} style={{
            flex: 1, minWidth: 0, height: 32, display: 'flex', alignItems: 'center', padding: '0 12px',
            borderRadius: 10, background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ ...textFadeLines(1), minWidth: 0 }}>{url}</span>
          </div>
          <button type="button" onClick={copy} style={btn('S', copied ? 'secondary' : 'primary', { flexShrink: 0 })}>
            {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? t('Скопировано') : t('Скопировать')}
          </button>
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 12, color: 'var(--color-red-text)', whiteSpace: 'pre-line' }}>{error}</div>}
    </section>
  )
}
