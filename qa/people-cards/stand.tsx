import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Flower2, Cat, Bird, Rabbit, Search, ChevronRight, Check, Users, Sun, Moon, RotateCcw } from '../../src/components/icons/appIcons'
import Modal from '../../src/components/Modal'
import FadeText from '../../src/components/FadeText'
import HScrollFade from '../../src/components/HScrollFade'
import ProfileChips from '../../src/components/ProfileChips'
import { OverlayScrollArea } from '../../src/components/teacher/OverlayScroll'
import '../../src/index.css'
import './style.css'

type Person = {id:string;name:string;handle:string;role:'Учитель'|'Ученик';avatar:typeof Flower2;tone:string;relation?:string}
const PEOPLE:Person[] = [
  {id:'daniil',name:'Даниил',handle:'dany_tut',role:'Учитель',avatar:Flower2,tone:'violet',relation:'Ваш преподаватель'},
  {id:'anna',name:'Анна',handle:'anna_learn',role:'Ученик',avatar:Cat,tone:'peach'},
  {id:'misha',name:'Михаил',handle:'misha_chem',role:'Ученик',avatar:Bird,tone:'blue'},
  {id:'sonya',name:'Софья',handle:'sonya_9',role:'Ученик',avatar:Rabbit,tone:'pink'},
  {id:'alena',name:'Алёна Константинопольская',handle:'alena_chemistry',role:'Учитель',avatar:Flower2,tone:'violet'},
]
const INITIAL = ['daniil','anna','misha']
const params = new URLSearchParams(location.search)
function Avatar({person,large=false}:{person:Person;large?:boolean}) {
  const Icon=person.avatar
  return <span className={`pc-avatar pc-${person.tone} ${large?'pc-avatar-large':''}`} aria-hidden="true"><Icon size={large?44:25}/></span>
}
function Role({person}:{person:Person}) {return <span className={`pc-role ${person.role==='Учитель'?'pc-role-teacher':''}`}>{person.role}</span>}
function PersonRow({person,open,action}:{person:Person;open:()=>void;action?:React.ReactNode}) {
  return <div className="pc-row"><button className="pc-person" onClick={open} aria-label={`Открыть профиль: ${person.name}`}>
    <Avatar person={person}/><span className="pc-person-label"><FadeText className="pc-person-name">{person.name}</FadeText><FadeText className="pc-handle">@{person.handle}</FadeText></span>
    <Role person={person}/><ChevronRight size={18} className="pc-chevron"/></button>{action}</div>
}
function Stand(){
  const [theme,setTheme]=useState(params.get('theme')??'light')
  const [friends,setFriends]=useState(params.has('empty')?[]:INITIAL)
  const [incoming,setIncoming]=useState(true)
  const [sent,setSent]=useState<string[]>([])
  const [query,setQuery]=useState('')
  const [searched,setSearched]=useState<string|null>(null)
  const [selected,setSelected]=useState<Person|null>(null)
  const [confirm,setConfirm]=useState(false)
  const [notice,setNotice]=useState('')
  const [copied,setCopied]=useState(false)
  const trigger=useRef<HTMLElement|null>(null)
  const dialogContent=useRef<HTMLDivElement>(null)
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme])
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(timer)},[notice])
  useEffect(()=>{
    if(!selected)return
    const dialog=dialogContent.current?.closest<HTMLElement>('[role=dialog]')
    dialog?.querySelector<HTMLButtonElement>('button')?.focus()
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||!dialog)return
      const buttons=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input')).filter(el=>el.getClientRects().length)
      if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1)?.focus()}
      else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0]?.focus()}
    }
    dialog?.addEventListener('keydown',trap)
    return()=>{dialog?.removeEventListener('keydown',trap);trigger.current?.focus()}
  },[selected])
  useEffect(()=>{if(confirm)dialogContent.current?.querySelector<HTMLButtonElement>('.pc-confirm button')?.focus()},[confirm])
  const open=(p:Person)=>{trigger.current=document.activeElement as HTMLElement;setSelected(p);setConfirm(false);setCopied(false)}
  const reset=()=>{setFriends(INITIAL);setIncoming(true);setSent([]);setQuery('');setSearched(null);setSelected(null);setConfirm(false);setNotice('Стенд сброшен')}
  const found=PEOPLE.find(p=>p.handle===searched)
  const send=(p:Person)=>{setSent(prev=>prev.includes(p.id)?prev:[...prev,p.id]);setNotice(`Заявка для ${p.name} отправлена`)}
  return <div className="pc-app">
    <div className="pc-demo"><span>Искра <span className="pc-demo-label">Визуальный стенд · пример данных</span></span><div><button aria-label="Сменить тему" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><button onClick={reset}><RotateCcw size={16}/>Сбросить</button></div></div>
    <OverlayScrollArea style={{flex:1}} padding="0" showScrollbar={false}>
      <main className="pc-page">
        <header className="pc-header"><div className="pc-identity"><div className="pc-self-mark"><Flower2 size={24}/></div><div><h1>Профиль</h1><p>@mita12222</p></div></div>
          <HScrollFade fadeWidth={22}><ProfileChips label="Разделы профиля" value="friends" items={[{id:'main',label:'Главное'},{id:'friends',label:'Друзья'},{id:'settings',label:'Настройки'}]} onChange={id=>id!=='friends'&&setNotice('На этом стенде показан раздел «Друзья»')}/></HScrollFade>
        </header>
        <div className="pc-intro"><div><h2>Свои люди в Искре</h2><p>Учитесь вместе. Находите друг друга по нику.</p></div><span className="pc-total"><Users size={17}/>{friends.length} в друзьях</span></div>
        <div className="pc-columns"><div className="pc-list">
          <section className="pc-surface pc-search-card" aria-label="Поиск людей"><form onSubmit={e=>{e.preventDefault();setSearched(query.trim().replace(/^@/,'').toLowerCase())}}><Search size={21}/><input aria-label="Ник для поиска" placeholder="Найти человека по @нику" value={query} onChange={e=>{setQuery(e.target.value);setSearched(null)}}/><button className="pc-primary" disabled={!query.trim()} type="submit">Найти</button></form>
            {searched!==null&&(found?<PersonRow person={found} open={()=>open(found)} action={<div className="pc-row-action">{friends.includes(found.id)?<span className="pc-connected"><Check size={15}/>В друзьях</span>:sent.includes(found.id)?<span className="pc-muted">Заявка отправлена</span>:<button className="pc-secondary" onClick={()=>send(found)}>Добавить</button>}</div>}/>:<p className="pc-search-empty">Ник не найден. Проверьте написание.</p>)}
          </section>
          {incoming&&<section className="pc-surface"><div className="pc-section-title"><h3>Заявки</h3><span className="pc-count">1</span></div><PersonRow person={PEOPLE[3]} open={()=>open(PEOPLE[3])}/><div className="pc-request-actions"><span>Хочет добавить вас в друзья</span><button className="pc-secondary" onClick={()=>{setIncoming(false);setNotice('Заявка отклонена')}}>Отклонить</button><button className="pc-primary" onClick={()=>{setFriends(prev=>[...new Set([...prev,'sonya'])]);setIncoming(false);setNotice('Софья теперь в друзьях')}}>Принять</button></div></section>}
          <section className="pc-surface"><div className="pc-section-title"><h3>Мои друзья</h3><span className="pc-count">{friends.length}</span></div>
            {friends.length?PEOPLE.filter(p=>friends.includes(p.id)).map(p=><PersonRow key={p.id} person={p} open={()=>open(p)}/>):<div className="pc-empty"><Users size={36}/><h3>Здесь будут ваши друзья</h3><p>Найдите человека по нику и отправьте заявку.</p></div>}
          </section>
          <p className="pc-list-hint">Нажмите на человека, чтобы открыть его профиль.</p>
        </div><aside className="pc-surface pc-aside"><div className="pc-at" aria-hidden="true">@</div><h3>Ваш ник в Искре</h3><p>Поделитесь ником, чтобы вас было проще найти.</p><strong>@mita12222</strong><button className="pc-secondary" onClick={async()=>{try{await navigator.clipboard.writeText('@mita12222');setNotice('Ник скопирован')}catch{setNotice('Не удалось скопировать ник')}}}>Скопировать ник</button><div className="pc-visibility"><span/>Поиск по нику включён</div></aside></div>
        <footer className="pc-footnote">Сценарии для проверки: @dany_tut · @anna_learn · @alena_chemistry</footer>
      </main>
    </OverlayScrollArea>
    {notice&&<div className="pc-toast" role="status">{notice}</div>}
    {selected&&<Modal onClose={()=>setSelected(null)} width={480} title="Профиль человека" cardStyle={{background:'var(--color-bg-2)'}}>
      <div ref={dialogContent} className="pc-person-profile">
        <div className={`pc-profile-cover pc-${selected.tone}`}><span className="pc-cover-label">Искра · вместе</span></div>
        <div className="pc-profile-identity"><Avatar person={selected} large/><Role person={selected}/><h2>{selected.name}</h2><button className="pc-copy" onClick={async()=>{try{await navigator.clipboard.writeText('@'+selected.handle);setCopied(true)}catch{setNotice('Не удалось скопировать ник')}}}>@{selected.handle}</button><span className="pc-copy-status" role="status">{copied?'Скопировано':''}</span></div>
        <div className="pc-relationship"><Users size={19}/><div><strong>{friends.includes(selected.id)?'Вы друзья':sent.includes(selected.id)?'Заявка отправлена':incoming && selected.id==='sonya'?'Входящая заявка':'Пока не в друзьях'}</strong><p>{selected.relation??(selected.role==='Учитель'?'Преподаватель в Искре':'Ученик в Искре')}</p></div>{friends.includes(selected.id)&&<Check size={18}/>}</div>
        {confirm?<div className="pc-confirm" role="group" aria-label="Подтверждение удаления"><h3>Удалить из друзей?</h3><p>Человек исчезнет из списка у вас обоих. Занятия и доступ к курсам сохранятся.</p><div><button className="pc-secondary" onClick={()=>setConfirm(false)}>Отмена</button><button className="pc-danger" onClick={()=>{setFriends(prev=>prev.filter(id=>id!==selected.id));setConfirm(false);setNotice(`Удалено из друзей: ${selected.name}`)}}>Удалить</button></div></div>:friends.includes(selected.id)?<button className="pc-remove" onClick={()=>setConfirm(true)}>Удалить из друзей</button>:incoming&&selected.id==='sonya'?<button className="pc-primary pc-wide" onClick={()=>{setFriends(prev=>[...new Set([...prev,'sonya'])]);setIncoming(false);setNotice('Софья теперь в друзьях')}}>Принять заявку</button>:<button className="pc-primary pc-wide" disabled={sent.includes(selected.id)} onClick={()=>send(selected)}>{sent.includes(selected.id)?'Заявка отправлена':'Добавить в друзья'}</button>}
        <p className="pc-profile-note">Публичный профиль. Контакты и учебные результаты видны только их владельцу и преподавателю с доступом.</p>
      </div>
    </Modal>}
  </div>
}
createRoot(document.getElementById('root')!).render(<Stand/> )
