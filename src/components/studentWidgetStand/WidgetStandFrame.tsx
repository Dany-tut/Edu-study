import { useEffect, useRef, useState } from 'react'
import { HomeWidgetPresentation } from '../HomeWidgetPresentation'
import NextWorkWidget from '../NextWorkWidget'
import WidgetFrame from '../WidgetFrame'
import { auditWidget, type AuditResult } from './audit'
import { homeCase, nextCase, sizes, statesFor, widgets } from './cases'
import type { CSSProperties } from 'react'
import './studentWidgetStand.css'

export default function WidgetStandFrame(){
 const params=new URLSearchParams(location.search),size=sizes.find(s=>s.key===params.get('size'))??sizes[0]
 const scanning=params.get('scan')==='1',dark=params.get('theme')==='dark'
 const cases=scanning?widgets.flatMap(widget=>statesFor(widget.id).map(([state])=>({widget:widget.id,state}))):[{widget:Number(params.get('widget')??13),state:params.get('state')??'ready'}]
 const [index,setIndex]=useState(0),item=cases[index],root=useRef<HTMLDivElement>(null)
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light'},[dark])
 useEffect(()=>{
  let cancelled=false,first=0,second=0
  const inspect=async()=>{
   await document.fonts.ready
   await Promise.all([...root.current!.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})))
   first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
    if(cancelled)return
    const card=root.current?.querySelector<HTMLElement>('[data-home-widget]');if(!card)return
    const rect=card.getBoundingClientRect()
    const result:AuditResult={...item,size:size.key,issues:auditWidget(card),width:rect.width,height:rect.height}
    parent.postMessage({type:'iskra-widget-audit',result,theme:dark?'dark':'light',done:scanning&&index===cases.length-1},location.origin)
    if(scanning&&index<cases.length-1)setIndex(value=>value+1)
   })})
  }
  void inspect()
  return()=>{cancelled=true;cancelAnimationFrame(first);cancelAnimationFrame(second)}
 },[index,item.widget,item.state,size.key,dark,scanning])
 const style={'--ihw-art-scale':size.columns===3?.84:size.columns===4?.72:1,width:size.width,height:size.height} as CSSProperties
 return <div className="widget-stand-frame" ref={root} style={style} data-no-art={item.state==='no-art'}><WidgetFrame id={item.widget} adaptive={item.widget!==13} style={{width:'100%',height:'100%',minWidth:0}}>{item.widget===13?<NextWorkWidget {...nextCase(item.state)}/>:<HomeWidgetPresentation {...homeCase(item.widget,item.state)}/>}</WidgetFrame></div>
}
