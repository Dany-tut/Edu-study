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
  return <Modal title="Друзья" subtitle={snapshot?.handle ? '@' + snapshot.handle : 'Профиль в Искре'} icon={<Users size={24}/>} width={660} zIndex={9200} onClose={() => setTab(null)}>
    <div className="desktop-friends" ref={panel}>
      <nav aria-label="Разделы друзей">{(Object.keys(titles) as FriendsTab[]).map(key => <button type="button" key={key} aria-pressed={key === tab} onClick={() => setTab(key)}>{titles[key]}{key === 'requests' && model.incoming.length > 0 && ' · ' + model.incoming.length}</button>)}</nav>
      {model.error && <p role="alert">{model.error} <button onClick={model.refresh}>Повторить</button></p>}
      {snapshot ? <FriendsPane key={account + tab} model={model} account={account} tab={tab}/> : !model.error && <p role="status">Загружаем профиль…</p>}
    </div>
  </Modal>
}

function FriendsPane({ model, account, tab }: { model: FriendsModel; account: string; tab: FriendsTab }) {
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
    if (active.current) setMessage(!changed ? 'Заявка уже изменилась.' : action === 'accept' ? '@'+c.handle+' теперь в друзьях.' : 'Заявка закрыта.')
  }
  function rows(state: Contact['state'], empty: string) {
    const contacts = snapshot.contacts.filter(c => c.state === state)
    return contacts.length ? contacts.map(c => <div className="friend-row" key={c.id}><strong>@{c.handle}</strong>
      {state === 'incoming' && <button className="friend-primary" disabled={busy} onClick={() => run(() => change('accept',c))}>Принять</button>}
      {state !== 'friend' && <button disabled={busy} onClick={() => run(() => change(state === 'incoming' ? 'decline' : 'cancel',c))}>{state === 'incoming' ? 'Отклонить' : 'Отменить'}</button>}
    </div>) : <p>{empty}</p>
  }
  return <section aria-label={titles[tab]}>
    {tab === 'profile' ? <form onSubmit={e => { e.preventDefault(); void run(async () => {
      await friendsAction(account,'save',{ handle:clean(nick),searchable:visible }); await model.refresh()
      if (active.current) setMessage('Настройки сохранены.')
    }) }}>
      <h3>Ник и видимость</h3><label>Твой ник<input value={nick} onChange={e=>setNick(e.target.value)} placeholder="@luna_7" maxLength={21} disabled={busy} /></label>
      <p>От 4 до 20 символов. Начни с латинской буквы. Можно добавить цифры и нижнее подчёркивание.</p>
      <label className="friend-check"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)} disabled={busy}/>Можно найти меня по точному нику</label>
      <p>Другие пользователи увидят только твой ник.</p>
      <button className="friend-primary" disabled={busy || !valid(nick)}>Сохранить</button>
    </form> : !snapshot.handle ? <><h3>Выбери свой ник</h3><p>По нему друзья узнают, от кого пришла заявка.</p><button className="friend-primary" onClick={()=>model.setTab('profile')}>Выбрать ник</button></> :
    tab === 'contacts' ? <><h3>Мои друзья</h3>{rows('friend','Пока здесь никого нет. Найди друга по его нику.')}<button onClick={()=>model.setTab('search')}>Найти друга</button></> :
    tab === 'requests' ? <><h3>Входящие</h3>{rows('incoming','Новых заявок нет.')}<h3>Отправленные</h3>{rows('outgoing','Отправленных заявок нет.')}</> :
    <><h3>Найти друга</h3><form onSubmit={e=>{e.preventDefault(); void run(async()=>{
      setResult(null)
      const found=await friendsAction<SearchResult>(account,'search',{handle:clean(nick)})
      if(active.current) setResult(found)
    })}}><label>Точный ник<input placeholder="@sever_9" value={nick} maxLength={21} disabled={busy} onChange={e=>{setNick(e.target.value);setResult(null);setMessage('')}}/></label>
      <button className="friend-primary" disabled={busy || !valid(nick)}>Найти</button></form>
      {result?.status === 'found' ? <div className="friend-row"><strong>@{result.handle}</strong><button disabled={busy} onClick={()=>run(async()=>{
        const response=await friendsAction<SearchResult>(account,'send',{handle:result.handle,key:result.key})
        await model.refresh()
        if (!active.current) return
        if (response.status === 'sent') model.setTab('requests')
        else setResult(response)
      })}>Отправить заявку</button></div> : result && <p role="status">{results[result.status]}</p>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>
}
