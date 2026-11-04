import HScrollFade from './HScrollFade'
import FadeText from './FadeText'
import ProfileChips from './ProfileChips'
import { useT } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { friendsAction, type Contact, type FriendsModel, type FriendsTab } from '../lib/desktopFriends'
import Modal from './Modal'
import { Search, Users } from './icons/appIcons'
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
    dialog.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus()
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
  return <Modal title={<div className="friends-modal-heading">
    <div className="friends-modal-identity">
      <FadeText>{t('Друзья')}</FadeText>
      <FadeText className="friends-modal-subtitle">{snapshot?.handle ? '@' + snapshot.handle : t('Профиль в Искре')}</FadeText>
    </div>
    <HScrollFade fadeWidth={22} padX={2}><FriendsTabs model={model}/></HScrollFade>
  </div>} icon={<Users size={24}/>} width={760} zIndex={9200} onClose={() => setTab(null)}>
    <div ref={panel} className="desktop-friends">
      <FriendsContent model={model}/>
    </div>
  </Modal>
}

export function FriendsTabs({ model }: { model: FriendsModel }) {
  const t = useT()
  if (!model.tab) return null
  return <ProfileChips label={t('Разделы друзей')} value={model.tab} onChange={model.setTab}
    items={(Object.keys(titles) as FriendsTab[]).map(id => ({
      id, label: t(titles[id]) + (id === 'requests' && model.incoming.length ? ' · ' + model.incoming.length : ''),
    }))}/>
}

export function FriendsContent({ model, overview = false, polished = false, suggestedName = '' }: { model: FriendsModel; overview?: boolean; polished?: boolean; suggestedName?: string }) {
  const t = useT()
  const { account, snapshot, tab } = model
  if (!account || !tab) return null
  const panes: (FriendsTab | 'outgoing')[] = overview ? ['search', 'requests', 'contacts', 'outgoing'] : [tab]
  return (
    <div className={overview ? "desktop-friends friends-overview" : "desktop-friends"}>
      {model.error && <p role="alert">{t(model.error)} <button onClick={model.refresh}>{t('Повторить')}</button></p>}
      {snapshot ? panes.map(pane =>
        <FriendsPane key={account + pane} model={model} account={account} tab={pane} overview={overview} polished={polished} suggestedHandle={valid(suggestedName) ? clean(suggestedName) : ''}/>
      ) : !model.error && <p role="status">{t('Загружаем профиль…')}</p>}
    </div>
  )
}

function FriendsPane({ model, account, tab, overview, polished, suggestedHandle }: { model: FriendsModel; account: string; tab: FriendsTab | 'outgoing'; overview: boolean; polished?: boolean; suggestedHandle: string }) {
  const t = useT()
  const snapshot = model.snapshot!
  const [nickDraft,setNick] = useState<string | null>(null)
  const nick = nickDraft ?? (tab === 'profile' ? snapshot.handle ?? suggestedHandle : '')
  const [visibilityDraft,setVisible] = useState<boolean | null>(null)
  const visible = visibilityDraft ?? (snapshot.handle ? snapshot.searchable : overview)
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
    return contacts.length ? contacts.map(c => <div className="friend-row" key={c.id}> {overview && <span className="friend-avatar" aria-hidden="true">{c.handle[0].toUpperCase()}</span>}<strong>@{c.handle}</strong>
      {state === 'incoming' && <button className="friend-primary" disabled={busy} onClick={() => run(() => change('accept',c))}>{t('Принять')}</button>}
      {state !== 'friend' && <button disabled={busy} onClick={() => run(() => change(state === 'incoming' ? 'decline' : 'cancel',c))}>{state === 'incoming' ? t('Отклонить') : t('Отменить')}</button>}
    </div>) : <p>{t(empty)}</p>
  }
  const count = (state: Contact['state']) => snapshot.contacts.filter(contact => contact.state === state).length
  if (overview && ((tab === 'requests' && !count('incoming') && !message) || (tab === 'outgoing' && !count('outgoing') && !message))) return null
  return <section aria-label={t(tab === 'outgoing' ? 'Отправленные' : titles[tab])}>
    {tab === 'profile' ? <form onSubmit={e => { e.preventDefault(); void run(async () => {
      await friendsAction(account,'save',{ handle:clean(nick),searchable:visible }); await model.refresh()
      if (active.current) { setNick(null); setVisible(null); setMessage('Настройки сохранены.') }
    }) }}>
      <h3>{t('Ник и видимость')}</h3><label>{t('Твой ник')}<input value={nick} onChange={e=>setNick(e.target.value)} placeholder="@luna_7" maxLength={21} disabled={busy} /></label>
      <p>{t('От 4 до 20 символов. Начни с латинской буквы. Можно добавить цифры и нижнее подчёркивание.')}</p>
      <label className="friend-check"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)} disabled={busy}/>{t('Можно найти меня по точному нику')}</label>
      <p>{t('Другие пользователи увидят только твой ник.')}</p>
      <button className="friend-primary" disabled={busy || !valid(nick)}>{t('Сохранить')}</button>
    </form> : !snapshot.handle && !overview ? <><h3>{t('Выбери свой ник')}</h3><p>{t('По нему друзья узнают, от кого пришла заявка.')}</p><button className="friend-primary" onClick={()=>model.setTab('profile')}>{t('Выбрать ник')}</button></> :
    tab === 'contacts' ? <><h3>{t('Мои друзья')} {overview && <small>{count('friend')}</small>}</h3>{polished && !count('friend') ? <div className="friend-empty"><div className="friend-empty-mark"><Users size={32} aria-hidden="true"/></div><strong>{t('Добавьте первого друга')}</strong><p>{t('Введите ник друга в поиске выше. После принятия заявки он появится здесь.')}</p></div> : rows('friend',overview ? 'Пока нет друзей' : 'Пока здесь никого нет. Найди друга по его нику.')}{!overview && <button onClick={()=>model.setTab('search')}>{t('Найти друга')}</button>}</> :
    tab === 'outgoing' ? <><h3>{t('Отправленные')}</h3>{rows('outgoing','Отправленных заявок нет.')}</> :
    tab === 'requests' ? <><h3>{t(overview ? 'Входящие заявки' : 'Входящие')} {overview && <small>{count('incoming')}</small>}</h3>{rows('incoming','Новых заявок нет.')}{!overview && <><h3>{t('Отправленные')}</h3>{rows('outgoing','Отправленных заявок нет.')}</>}</> :
    <><h3>{t(overview ? 'Друзья' : 'Найти друга')}</h3><form className={overview ? 'friend-search' : undefined} onSubmit={e=>{e.preventDefault(); void run(async()=>{
      setResult(null)
      const found=await friendsAction<SearchResult>(account,'search',{handle:clean(nick)})
      if(active.current) setResult(found)
    })}}><label>{overview ? <Search size={18} aria-hidden="true"/> : t('Точный ник')}<input aria-label={t('Точный ник')} placeholder={overview ? t('Найти друга по нику') : '@sever_9'} value={nick} maxLength={21} disabled={busy} onChange={e=>{setNick(e.target.value);setResult(null);setMessage('')}}/></label>
      <button className="friend-primary" hidden={overview && !nick} disabled={busy || !valid(nick)}>{t('Найти')}</button></form>
      {result?.status === 'found' ? <div className="friend-row"><strong>@{result.handle}</strong>{!snapshot.handle ? <button onClick={()=>model.setTab('profile')}>{t('Выбрать ник для заявки')}</button> : <button disabled={busy} onClick={()=>run(async()=>{
        const response=await friendsAction<SearchResult>(account,'send',{handle:result.handle,key:result.key})
        await model.refresh()
        if (!active.current) return
        if (response.status === 'sent' && overview) { setResult(null); setMessage('Заявка отправлена.') }
        else if (response.status === 'sent') model.setTab('requests')
        else setResult(response)
      })}>{t('Отправить заявку')}</button>}</div> : result && <p role="status">{t(results[result.status] ?? 'Попробуй ещё раз.')}</p>}
    </>}
    {message && <p role="status">{t(message)}</p>}
  </section>
}
