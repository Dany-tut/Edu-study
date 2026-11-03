import { Capacitor } from '@capacitor/core'
import { QRCodeSVG } from 'qrcode.react'
import { copyToClipboard } from '../lib/clipboard'
import ProfileChips from './ProfileChips'
import { useT } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { friendsAction, type Contact, type FriendsModel, type FriendsTab } from '../lib/desktopFriends'
import Modal from './Modal'
import { Users } from './icons/appIcons'
import './desktopFriends.css'

const titles: Record<FriendsTab, string> = { contacts: 'Друзья', requests: 'Заявки', search: 'Поиск', profile: 'Мой ник' }
const clean = (s: string) => s.trim().replace(/^@/, '').toLowerCase()
const valid = (s: string) => /^[a-z][a-z0-9_]{3,19}$/.test(clean(s))
type SearchResult = { status: string; handle?: string; key?: string }
const results: Record<string,string> = {
  missing: 'Ник не найден. Проверь написание или уточни ник у друга.',
  incoming: 'От этого человека уже есть входящая заявка.', outgoing: 'Ты уже отправил заявку.',
  friend: 'Вы уже друзья.', limited: 'Слишком много попыток. Попробуй через минуту.',
  cooldown: 'Повторный запрос этому человеку можно отправить через сутки.',
}

export default function DesktopFriends({ model }: { model: FriendsModel }) {
  const t = useT()
  const { account, snapshot, tab, setTab } = model
  const panel = useRef<HTMLDivElement>(null)
  const open = Boolean(account && tab)
  useEffect(() => {
    if (!open || !panel.current) return
    const dialog = panel.current.closest<HTMLElement>('[role="dialog"]')
    if (!dialog) return
    const previous = document.activeElement
    panel.current.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()
    const cycle = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const controls = dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    dialog.addEventListener('keydown',cycle)
    return () => { dialog.removeEventListener('keydown',cycle); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [open])
  if (!account || !tab) return null
  return <Modal title={t('Друзья')} subtitle={snapshot?.handle ? '@' + snapshot.handle : t('Профиль в Искре')} icon={<Users size={24}/>} width={660} zIndex={9200} onClose={() => setTab(null)}>
    <div ref={panel}><FriendsContent model={model}/></div>
  </Modal>
}

export function FriendsContent({ model }: { model: FriendsModel }) {
  const t = useT()
  const { account, snapshot, tab, setTab } = model
  if (!account || !tab) return null
  return (
    <div className="desktop-friends">
      <ProfileChips label={t('Разделы друзей')} value={tab} onChange={setTab}
        items={(Object.keys(titles) as FriendsTab[]).map(id => ({
          id, label: t(titles[id]) + (id === 'requests' && model.incoming.length ? ' · ' + model.incoming.length : ''),
        }))}/>

      {model.error && <p role="alert">{t(model.error)} <button onClick={model.refresh}>{t('Повторить')}</button></p>}
      {snapshot ? <FriendsPane key={account + tab} model={model} account={account} tab={tab}/> : !model.error && <p role="status">{t('Загружаем профиль…')}</p>}
    </div>
  )
}

function FriendsPane({ model, account, tab }: { model: FriendsModel; account: string; tab: FriendsTab }) {
  const t = useT()
  const snapshot = model.snapshot!
  const [nick,setNick] = useState(tab === 'profile' ? snapshot.handle ?? '' : '')
  const [visible,setVisible] = useState(snapshot.searchable)
  const [result,setResult] = useState<SearchResult | null>(null)
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState(false)
  const active = useRef(true)
  const locked = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  async function run(work: () => Promise<void>) {
    if (locked.current) return
    locked.current = true; setBusy(true); setMessage('')
    try { await work() } catch (e) { if (active.current) setMessage(e instanceof Error ? e.message : 'Попробуй ещё раз.') }
    finally { locked.current = false; if (active.current) setBusy(false) }
  }
  async function change(action: string, c: Contact) {
    const changed = await friendsAction<boolean>(account, action, { id:c.id })
    await model.refresh()
    if (active.current) setMessage(!changed ? 'Заявка уже изменилась.' : action === 'accept' ? t('@{handle} теперь в друзьях.').replace('{handle}', c.handle) : 'Заявка закрыта.')
  }
  function rows(state: Contact['state'], empty: string) {
    const contacts = snapshot.contacts.filter(c => c.state === state)
    return contacts.length ? contacts.map(c => <div className="friend-row" key={c.id}><strong>@{c.handle}</strong>
      {state === 'incoming' && <button className="friend-primary" disabled={busy} onClick={() => run(() => change('accept',c))}>{t('Принять')}</button>}
      {state !== 'friend' && <button disabled={busy} onClick={() => run(() => change(state === 'incoming' ? 'decline' : 'cancel',c))}>{state === 'incoming' ? t('Отклонить') : t('Отменить')}</button>}
    </div>) : <p>{t(empty)}</p>
  }
  return <section aria-label={t(titles[tab])}>
    {tab === 'profile' ? <><form onSubmit={e => { e.preventDefault(); void run(async () => {
      await friendsAction(account,'save',{ handle:clean(nick),searchable:visible }); await model.refresh()
      if (active.current) setMessage('Настройки сохранены.')
    }) }}>
      <h3>{t('Ник и видимость')}</h3><label>{t('Твой ник')}<input value={nick} onChange={e=>setNick(e.target.value)} placeholder="@luna_7" maxLength={21} disabled={busy} /></label>
      <p>{t('От 4 до 20 символов. Начни с латинской буквы. Можно добавить цифры и нижнее подчёркивание.')}</p>
      <label className="friend-check"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)} disabled={busy}/>{t('Можно найти меня по точному нику')}</label>
      <p>{t('Другие пользователи увидят только твой ник.')}</p>
      <button className="friend-primary" disabled={busy || !valid(nick)}>{t('Сохранить')}</button>
    </form>
      {snapshot.handle && <div className="friend-share">
        <h3>{t('Доступ по ссылке')}</h3>
        <label className="friend-check"><input type="checkbox" checked={!!snapshot.shareToken} disabled={busy} onChange={e => {
          const enabled = e.target.checked
          void run(async () => { await friendsAction(account, 'share', { enabled }); await model.refresh() })
        }}/>{t('Открыть профиль по ссылке и QR-коду')}</label>
        <p>{t(snapshot.shareToken ? 'После входа по ссылке виден только твой ник. Можно отправить заявку в друзья.' : 'Ссылка закрыта. Ранее отправленные ссылки и QR-коды недействительны.')}</p>
        {snapshot.shareToken && <ShareCode token={snapshot.shareToken} onCopy={setMessage}/>}
      </div>}
    </> : !snapshot.handle ? <><h3>{t('Выбери свой ник')}</h3><p>{t('По нему друзья узнают, от кого пришла заявка.')}</p><button className="friend-primary" onClick={()=>model.setTab('profile')}>{t('Выбрать ник')}</button></> :
    tab === 'contacts' ? <><h3>{t('Мои друзья')}</h3>{rows('friend','Пока здесь никого нет. Найди друга по его нику.')}<button onClick={()=>model.setTab('search')}>{t('Найти друга')}</button></> :
    tab === 'requests' ? <><h3>{t('Входящие')}</h3>{rows('incoming','Новых заявок нет.')}<h3>{t('Отправленные')}</h3>{rows('outgoing','Отправленных заявок нет.')}</> :
    <><h3>{t('Найти друга')}</h3><form onSubmit={e=>{e.preventDefault(); void run(async()=>{
      setResult(null)
      const found=await friendsAction<SearchResult>(account,'search',{handle:clean(nick)})
      if(active.current) setResult(found)
    })}}><label>{t('Точный ник')}<input placeholder="@sever_9" value={nick} maxLength={21} disabled={busy} onChange={e=>{setNick(e.target.value);setResult(null);setMessage('')}}/></label>
      <button className="friend-primary" disabled={busy || !valid(nick)}>{t('Найти')}</button></form>
      {result?.status === 'found' ? <div className="friend-row"><strong>@{result.handle}</strong><button disabled={busy} onClick={()=>run(async()=>{
        const response=await friendsAction<SearchResult>(account,'send',{handle:result.handle,key:result.key})
        await model.refresh()
        if (!active.current) return
        if (response.status === 'sent') model.setTab('requests')
        else setResult(response)
      })}>{t('Отправить заявку')}</button></div> : result && <p role="status">{t(results[result.status] ?? 'Попробуй ещё раз.')}</p>}
    </>}
    {message && <p role="status">{t(message)}</p>}
  </section>
}

function ShareCode({ token, onCopy }: { token: string; onCopy: (message: string) => void }) {
  const t = useT()
  const origin = Capacitor.isNativePlatform() ? 'https://edu-study-app.vercel.app' : location.origin
  const url = new URL('/#/friend?token=' + token, origin).href
  return <>
    <QRCodeSVG value={url} size={180} marginSize={4} title={t('QR-код профиля для друзей')}/>
    <input aria-label={t('Ссылка на профиль для друзей')} readOnly value={url} onFocus={e => e.target.select()}/>
    <button type="button" onClick={async () => onCopy(await copyToClipboard(url) ? 'Ссылка скопирована.' : 'Выдели и скопируй ссылку.')}>{t('Скопировать ссылку')}</button>
  </>
}
