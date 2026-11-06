import { useEffect, useState } from 'react'
import { friendsAction } from '../lib/desktopFriends'
import { getViewAs } from '../lib/teacherView'
import { useT } from '../lib/i18n'
import ScrollFade from '../components/ScrollFade'
import '../components/desktopFriends.css'

type Result = { status: string; handle?: string }
const messages: Record<string, string> = {
  missing: 'Ссылка закрыта или недействительна.',
  outgoing: 'Заявка отправлена.', sent: 'Заявка отправлена.',
  incoming: 'От этого человека уже есть входящая заявка.',
  friend: 'Вы уже друзья.', self: 'Это твой профиль для друзей.',
  limited: 'Слишком много попыток. Попробуй через минуту.',
  cooldown: 'Повторный запрос этому человеку можно отправить через сутки.',
}

export default function FriendProfilePage({ account, token, home }: { account: string; token: string; home: string }) {
  const t = useT()
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [nick, setNick] = useState('')
  useEffect(() => {
    let active = true
    setResult(null); setError('')
    if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(token) || getViewAs()) {
      setResult({ status: 'missing' })
      return
    }
    friendsAction<Result>(account, 'open_link', { token })
      .then(value => { if (active) setResult(value) })
      .catch(() => { if (active) setError('Не удалось загрузить профиль.') })
    return () => { active = false }
  }, [account, token, retry])

  async function send() {
    setBusy(true); setError('')
    try {
      const next = await friendsAction<Result>(account, 'send_link', { token, handle: nick })
      setResult({ ...next, handle: next.status === 'sent' ? result?.handle : next.handle })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить заявку.')
    } finally { setBusy(false) }
  }
  return <ScrollFade maxHeight="100dvh">
    <main className="desktop-friends friend-landing"><section>
      <h1>{t('Профиль для друзей')}</h1>
      {result?.handle && <h2>@{result.handle}</h2>}
      {!result && !error && <p role="status">{t('Загружаем профиль…')}</p>}
      {result?.status === 'handle_required' && <label>{t('Выбери свой ник')}
        <input value={nick} autoCapitalize="none" placeholder="@luna_7" maxLength={21} onChange={e => setNick(e.target.value)}/>
      </label>}
      {(result?.status === 'found' || result?.status === 'handle_required') && <button data-hover="layer" className="friend-primary" disabled={busy || (result.status === 'handle_required' && !/^[a-z][a-z0-9_]{3,19}$/i.test(nick.trim().replace(/^@/, '')))} onClick={send}>{t('Добавить в друзья')}</button>}
      {result && messages[result.status] && <p role="status">{t(messages[result.status])}</p>}
      {error && <p role="alert">{t(error)} <button data-hover="layer" onClick={() => setRetry(n => n + 1)}>{t('Повторить')}</button></p>}
      <a data-hover="link" href={home}>{t('В свой кабинет')}</a>
    </section></main>
  </ScrollFade>
}
