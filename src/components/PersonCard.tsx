import MobileSheet from './MobileSheet'
import { useEffect, useRef, useState } from 'react'
import { Bird, Bug, Cat, Check, ChevronRight, Fish, Flower2, Rabbit, Rocket, Star, Users } from './icons/appIcons'
import { TeacherBook } from '../lib/teacherAvatarIcon'
import FadeText from './FadeText'
import Modal from './Modal'
import { AvatarPhotoFill } from './AvatarPhoto'
import { friendsAction, type FriendsModel, type PersonCard } from '../lib/desktopFriends'
import { useT } from '../lib/i18n'
import { focusQuietly } from '../lib/quietFocus'
import './personCard.css'

const icons = {flower:Flower2,cat:Cat,rabbit:Rabbit,bird:Bird,fish:Fish,bug:Bug,rocket:Rocket,star:Star,teacher:TeacherBook}
function gradient(person:PersonCard) {
  if(person.avatarId==='flower'&&person.role!=='teacher') {
    let hash=0; for(const char of person.name??person.handle) hash=(char.charCodeAt(0)+((hash<<5)-hash))|0
    const hue=Math.abs(hash)%360
    return `linear-gradient(135deg,hsl(${hue} 78% 70%),hsl(${(hue+38)%360} 68% 56%))`
  }
  const purple='linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))'
  const gold='linear-gradient(135deg, hsl(46 96% 66%), hsl(36 92% 54%))'
  const colors:Record<string,string>={
    flower:purple, teacher:'linear-gradient(135deg, hsl(228 78% 70%), hsl(248 64% 52%) 60%, hsl(262 60% 42%))',
    cat:'linear-gradient(135deg, hsl(28 92% 68%), hsl(14 84% 56%))', rabbit:'linear-gradient(135deg, hsl(330 88% 74%), hsl(345 76% 60%))',
    bird:'linear-gradient(135deg, hsl(205 92% 70%), hsl(220 80% 58%))', fish:'linear-gradient(135deg, hsl(180 72% 62%), hsl(196 78% 50%))',
    bug:'linear-gradient(135deg, hsl(2 82% 70%), hsl(354 74% 56%))', rocket:person.role==='teacher'?gold:purple,star:person.role==='teacher'?purple:gold,
  }
  return colors[person.avatarId??'flower']??purple
}
export function PersonAvatar({person,large=false}:{person:PersonCard;large?:boolean}) {
  const Icon=icons[person.avatarId as keyof typeof icons]??Flower2
  return <span className={`pc-avatar ${large?'pc-avatar-large':''}`} style={{background:gradient(person)}} aria-hidden="true"><Icon size={large?44:25}/><AvatarPhotoFill path={person.avatarPath}/></span>
}
function PersonRole({person}:{person:PersonCard}) {
  const t=useT()
  return <span className={`pc-role ${person.role==='teacher'?'pc-role-teacher':''}`}>{t(person.role==='teacher'?'Учитель':person.role==='student'?'Ученик':'Участник')}</span>
}
export function PersonRow({person,onOpen}:{person:PersonCard;onOpen:(p:PersonCard)=>void}) {
  const t=useT()
  return <button className="pc-person" type="button" onClick={()=>onOpen(person)} aria-label={t('Открыть профиль')+': '+(person.name??person.handle)}>
    <PersonAvatar person={person}/><span className="pc-person-label"><FadeText className="pc-person-name">{person.name??person.handle}</FadeText><FadeText className="pc-handle">@{person.handle}</FadeText></span><PersonRole person={person}/><ChevronRight size={18} className="pc-chevron"/>
  </button>
}
type Detail=PersonCard & {status:string;id?:string;state?:'friend'|'incoming'|'outgoing'|'none'}
export function PersonProfile({person,model,onClose,bottomSheet=false}:{person:PersonCard;model:FriendsModel;onClose:()=>void;bottomSheet?:boolean}) {
  const t=useT();const body=useRef<HTMLDivElement>(null)
  const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false)
  const alive=useRef(true),lock=useRef(false)
  const [retry,setRetry]=useState(0)
  useEffect(()=>{
    alive.current=true
    let cancelled=false
    setDetail(null);setError('');setConfirm(false)
    if(model.account&&person.personKey) void friendsAction<Detail>(model.account,'person',{personKey:person.personKey}).then(value=>{if(!cancelled)setDetail(value)},()=>{if(!cancelled)setError('Не удалось открыть профиль. Попробуйте ещё раз.')})
    else setError('Не удалось открыть профиль. Попробуйте ещё раз.')
    return()=>{cancelled=true;alive.current=false}
  },[model.account,person.personKey,retry])
  const closeRef=useRef(onClose);closeRef.current=onClose
  useEffect(()=>{
    if(bottomSheet)return
    const previous=document.activeElement
    const dialog=body.current?.closest<HTMLElement>('[role=dialog]')
    focusQuietly(dialog?.querySelector<HTMLButtonElement>('button'))
    const keys=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.stopImmediatePropagation();event.preventDefault();closeRef.current();return}
      if(event.key!=='Tab'||!dialog)return
      // Tab moves focus by hand: Safari by default skips buttons and would
      // leave the card for the search field underneath.
      const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled)')).filter(el=>el.getClientRects().length)
      if(!controls.length)return
      event.preventDefault()
      const index=controls.indexOf(document.activeElement as HTMLElement)
      const next=index<0?(event.shiftKey?controls.length-1:0):(index+(event.shiftKey?-1:1)+controls.length)%controls.length
      controls[next].focus()
    }
    window.addEventListener('keydown',keys,true)
    return()=>{window.removeEventListener('keydown',keys,true);if(previous instanceof HTMLElement&&previous.isConnected)focusQuietly(previous)}
  },[bottomSheet])
  useEffect(()=>{
    const root=body.current
    if(confirm){focusQuietly(root?.querySelector<HTMLButtonElement>('.pc-confirm button'));return}
    // React can remove the focused retry/confirm button after an async result.
    if(document.activeElement===document.body){
      const next=root?.querySelector<HTMLButtonElement>('.pc-remove')
        ??root?.closest('[role=dialog]')?.querySelector<HTMLButtonElement>('button')
      focusQuietly(next)
    }
  },[confirm,detail,error])
  const visible=detail?.status==='found'?detail:person
  async function remove(){
    if(lock.current||!detail?.id||!model.account)return
    lock.current=true;setBusy(true);setError('')
    try{
      await friendsAction<boolean>(model.account,'remove',{id:detail.id})
      await model.refresh()
      if(alive.current){setDetail({...detail,state:'none',id:undefined});setConfirm(false)}
    }catch{if(alive.current)setError(t('Не удалось удалить из друзей. Попробуйте ещё раз.'))}
    finally{lock.current=false;if(alive.current)setBusy(false)}
  }
  const content = (
    <div ref={body} className="pc-person-profile">
      <div className="pc-profile-cover"><span className="pc-cover-label">{t('Искра · вместе')}</span></div>
      <div className="pc-profile-identity"><PersonAvatar person={visible} large/><PersonRole person={visible}/><h2>{visible.name??visible.handle}</h2><button data-hover="layer" className="pc-copy" onClick={async()=>{try{await navigator.clipboard.writeText('@'+visible.handle);if(alive.current)setCopied(true)}catch{if(alive.current)setError(t('Не удалось скопировать'))}}}>@{visible.handle}</button><span className="pc-copy-status" role="status">{copied?t('Скопировано'):''}</span></div>
      {error&&<div className="pc-profile-error" role="alert"><p>{t(error)}</p>{!detail&&<button data-hover="layer" className="pc-secondary" onClick={()=>setRetry(value=>value+1)}>{t('Повторить')}</button>}</div>}
      {!detail&&!error&&<p role="status">{t('Загружаем профиль…')}</p>}
      {detail?.status==='missing'&&<p role="status">{t('Профиль больше недоступен.')}</p>}
      {detail?.status==='found'&&<>
        <div className="pc-relationship"><Users size={19}/><div><strong>{t(detail.state==='friend'?'Вы друзья':detail.state==='incoming'?'Входящая заявка':detail.state==='outgoing'?'Заявка отправлена':'Пока не в друзьях')}</strong><p>{t(detail.relationship==='my_teacher'?'Ваш преподаватель':detail.relationship==='my_student'?'Ваш ученик':detail.role==='teacher'?'Преподаватель в Искре':detail.role==='student'?'Ученик в Искре':'Участник Искры')}</p></div>{detail.state==='friend'&&<Check size={18}/>}</div>
        {confirm?<div className="pc-confirm" role="group" aria-label={t('Подтверждение удаления')}><h3>{t('Удалить из друзей?')}</h3><p>{t('Человек исчезнет из списка у вас обоих. Занятия и доступ к курсам сохранятся.')}</p><div><button data-hover="layer" className="pc-secondary" disabled={busy} onClick={()=>setConfirm(false)}>{t('Отмена')}</button><button data-hover="layer" className="pc-danger" disabled={busy} onClick={remove}>{t(busy?'Удаляем…':'Удалить')}</button></div></div>:detail.state==='friend'&&<button className="pc-remove" onClick={()=>setConfirm(true)}>{t('Удалить из друзей')}</button>}
      </>}
      <p className="pc-profile-note">{t('Здесь только публичная информация профиля.')}</p>
    </div>
  )
  return bottomSheet
    ? <MobileSheet open title={t('Профиль человека')} softEdge onClose={onClose}>{content}</MobileSheet>
    : <Modal title={t('Профиль человека')} width={480} zIndex={9500} onClose={onClose}>{content}</Modal>
}
