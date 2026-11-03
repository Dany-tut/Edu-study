import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import MobileHomeworkReview from './components/teacher/mobile/MobileHomeworkReview'
import { DEMO_HW } from './data/teacherDevDemo'
import { DEMO_REGULAR_SUBMISSIONS } from './data/mobileReviewDemo'
import type { reviewHomework } from './lib/useHomework'
import './index.css'

// Isolated DEV-only adapter: all publications stay in memory, including failures.
function Harness() {
  const [rows, setRows] = useState(DEMO_REGULAR_SUBMISSIONS)
  const [refreshFails, setRefreshFails] = useState(false)
  const [taskMode, setTaskMode] = useState(false)
  const [fail, setFail] = useState(true)
  const [calls, setCalls] = useState<Parameters<typeof reviewHomework>[]>([])
  return <>
    <div style={{position:'fixed',top:0,left:0,zIndex:200,fontSize:12,background:'var(--color-bg)',color:'var(--color-text)'}}>
      <label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/>Ошибка сохранения</label>
      <label><input type="checkbox" checked={taskMode} onChange={e=>setTaskMode(e.target.checked)}/>Баллы по заданиям</label>
      <label><input type="checkbox" checked={refreshFails} onChange={e=>setRefreshFails(e.target.checked)}/>Ошибка обновления очереди</label>
      <button type="button" onClick={()=>setRows(old=>old.map((s,i)=>i===0?{...s,verdict:'pending',submittedAt:new Date().toISOString(),answers:s.answers?{...s.answers,attemptId:'retry-'+Date.now()}:null}:s))}>Новая попытка первого ученика</button>
      <output aria-label="Последняя отправка">{calls.length ? JSON.stringify(calls[calls.length-1]) : ''}</output>
      <output aria-label="Число запросов">{calls.length}</output>
    </div>
    <MobileHomeworkReview homework={{...DEMO_HW[0],tasks:taskMode?[{id:'first',title:'Первое задание',maxScore:2},{id:'second',title:'Второе задание',maxScore:3}]:undefined}} demoSubmissions={rows} onBack={()=>{}} onPublished={()=>{if(refreshFails)throw new Error('refresh')}}
      onReview={async (...args)=>{setCalls(old=>[...old,args]);await new Promise(resolve=>setTimeout(resolve,500));return !fail}}/>
  </>
}
if(import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Harness/> )
