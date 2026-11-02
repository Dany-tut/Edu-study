import type { ReactNode } from 'react'
import FadeText from './FadeText'
import HomeWidgetObject from './HomeWidgetObject'
import Skeleton from './Skeleton'
import { ChevronRight } from './icons/appIcons'
import { useT } from '../lib/i18n'
import './studentHomeWidget.css'
import './studentHome.css'

export type NextWorkWidgetProps = {
 title:string; meta?:string; due?:ReactNode; overdue?:boolean
 status?:'ready'|'loading'|'empty'|'error'; action?:string; secondary?:boolean; onOpen?:()=>void
}
export default function NextWorkWidget({title,meta,due,overdue,status='ready',action,secondary,onOpen}:NextWorkWidgetProps) {
 const t=useT()
 return <article className="ihw-card lh-next-card" data-home-widget="13">
  <header className="ihw-heading"><h2>{t('Следующий шаг')}</h2></header>
  <div className="ihw-body"><div className="lh-next-copy">
   {status==='loading'?<div className="ihw-loading" role="status" aria-label={t('Загрузка')}><Skeleton w="80%" h={20}/><Skeleton w="60%" h={12}/></div>:<>
    <h3 className="lh-next-title"><FadeText>{title}</FadeText></h3>
    {meta&&<p className="lh-next-meta"><FadeText>{meta}</FadeText></p>}
    {due&&<span className="lh-next-due" data-overdue={overdue}><FadeText>{due}</FadeText></span>}
   </>}
  </div></div>
  <HomeWidgetObject id={13}/>
  <footer className="ihw-footer lh-next-footer">{action&&<button type="button" className={`lh-next-action${secondary?' is-secondary':''}`} onClick={onOpen}><FadeText>{action}</FadeText><ChevronRight size={18}/></button>}</footer>
 </article>
}
