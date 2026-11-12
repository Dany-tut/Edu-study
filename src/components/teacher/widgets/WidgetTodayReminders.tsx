import { useRef, useState, useId } from 'react'
import { Bell, ChevronRight, CheckCircle2 } from '../../icons/appIcons'
import WidgetOpenButton from './WidgetOpenButton'
import { useHomeData } from '../../../lib/useHomeData'
import { useT, useLang } from '../../../lib/i18n'
import { useScrollFades } from '../../../lib/useScrollFades'
import { metricObjects } from '../../../lib/widgetMetricObjects'
import type { Reminder } from '../../../data/teacherMockData'
import './remindersWidget.css'

const categories: {type:Reminder['type'];label:string;action:string;art:string}[] = [
  {type:'check-hw',label:'ДЗ на проверку',action:'Проверить ДЗ',art:metricObjects['stat-hw']},
  {type:'payment-debt',label:'Оплата',action:'Оплата',art:metricObjects['finance-expected']},
  {type:'fill-journal',label:'Журнал',action:'Журнал',art:metricObjects['stat-lessons']},
  {type:'fill-widget',label:'Виджет',action:'Виджет',art:'/widget-objects-v2-shadows/ui/stats.png'},
  {type:'make-trainer',label:'Тренажёр',action:'Тренажёр',art:'/widget-objects-v2-shadows/ui/trainer.png'},
  {type:'send-push',label:'Уведомление',action:'Уведомление',art:'/widget-objects-v2-shadows/ui/reminders.png'},
]

export default function WidgetTodayReminders() {
  const queueId=useId()
  const t=useT(), lang=useLang(s=>s.lang)
  const {reminders,reminderAction,reminderDone,loading}=useHomeData()
  const [selected,setSelected]=useState<Reminder['type']>('check-hw')
  const nav=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null)
  useScrollFades(nav,true,':scope')
  useScrollFades(body,true,':scope')
  const groups=categories.map(c=>({...c,items:reminders.filter(r=>r.type===c.type).sort((a,b)=>Number(reminderDone(a))-Number(reminderDone(b))||Number(b.urgency==='high')-Number(a.urgency==='high'))})).filter(c=>c.items.length)
  const active=groups.find(c=>c.type===selected)??groups[0]
  const count=(items:Reminder[])=>items.reduce((n,r)=>n+(reminderDone(r)?0:r.type==='check-hw'?(r.pendingCount??1):1),0)
  const action=active?.items.map(reminderAction).find(Boolean)
  // «Горит» — просрочено или ждёт дольше суток: подсвечиваем янтарём строку и счётчик вкладки.
  const hot=(r:Reminder)=>!reminderDone(r)&&r.urgency==='high'
  return <section className="teacher-reminders-panel" aria-label={t('Напоминания')}>
    <header className="widget-panel-header"><Bell size={17}/><h3>{t('Напоминания')}</h3>{action&&<WidgetOpenButton onOpen={action}/>}</header>
    {active&&<div className="reminder-category-tabs" ref={nav} role="tablist" aria-label={t('Напоминания')}>
      {groups.map(c=><button data-hover="layer" key={c.type} type="button" role="tab" aria-selected={active.type===c.type} aria-controls={queueId} onClick={()=>{setSelected(c.type);body.current?.scrollTo({top:0})}}><span data-label={t(c.label)}>{t(c.label)}</span><b data-hot={c.items.some(hot)||undefined}>{count(c.items)}</b></button>)}
    </div>}
    <div ref={body} id={queueId} className="teacher-reminder-queue" role="tabpanel" aria-label={active?t(active.label):t('Напоминания')}>
      {!active?<div className="widget-panel-empty" role="status">{loading?t('Загрузка…'):t('Нет напоминаний')}</div>:<>
        <div className="reminder-queue-hero"><div><span>{t('Напоминания')}</span><strong>{t(active.action)}</strong><small>{active.type==='check-hw'?`${count(active.items)} ${t('работ')} · ${active.items.length} ${t('ДЗ')}`:`${active.items.length} ${lang==='en'?'items':t('записей')}`}</small></div><img src={active.art} alt="" aria-hidden="true" decoding="async"/></div>
        {active.items.map((item,index)=>{const done=reminderDone(item),onAction=reminderAction(item);return <button data-hover="row" key={item.id} type="button" className="reminder-queue-row" data-reminder-row={item.id} data-done={done||undefined} data-hot={hot(item)||undefined} disabled={!onAction} onClick={onAction}>
          <span className="reminder-queue-index">{done?<CheckCircle2 size={14}/>:String(index+1).padStart(2,'0')}</span>
          <span className="reminder-queue-copy"><strong>{item.text}</strong>{item.detail&&<span>{item.detail}</span>}{(item.statusLabel||done)&&<small>{done?t('Готово'):item.statusLabel}</small>}</span>
          {onAction&&<ChevronRight size={16}/>}</button>})}
      </>}
    </div>
    {/* «Открыть раздел» — одна кнопка в шапке (WidgetOpenButton). Второй
        «Открыть ↗» в подвале был дублем той же ссылки. */}
  </section>
}
