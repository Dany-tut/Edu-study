import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import MobileHomeworkReview from './components/teacher/mobile/MobileHomeworkReview'
import { DEMO_HW } from './data/teacherDevDemo'
import { DEMO_REGULAR_SUBMISSIONS } from './data/mobileReviewDemo'
import type { reviewHomework } from './lib/useHomework'
import './index.css'

// Isolated DEV-only adapter: all publications stay in memory, including failures.
// ?shot — чистый кадр для скринов (SMM): без панели стенда и плашки «Учебный пример».
const SHOT = new URLSearchParams(location.search).has('shot')

function Harness() {
  const [taskMode, setTaskMode] = useState(false)
  const [fail, setFail] = useState(!SHOT)
  const [calls, setCalls] = useState<Parameters<typeof reviewHomework>[]>([])
  return <>
    {!SHOT && <div style={{position:'fixed',top:0,left:0,zIndex:200,fontSize:12,background:'var(--color-bg)',color:'var(--color-text)'}}>
      <label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/>Ошибка сохранения</label>
      <label><input type="checkbox" checked={taskMode} onChange={e=>setTaskMode(e.target.checked)}/>Баллы по заданиям</label>
      <output aria-label="Число запросов">{calls.length}</output>
    </div>}
    <MobileHomeworkReview homework={{...DEMO_HW[0],tasks:taskMode?[{id:'first',title:'Первое задание',maxScore:2},{id:'second',title:'Второе задание',maxScore:3}]:undefined}} demoSubmissions={DEMO_REGULAR_SUBMISSIONS} demoNote={!SHOT} onBack={()=>{}} onPublished={()=>{}}
      onReview={async (...args)=>{setCalls(old=>[...old,args]);await new Promise(resolve=>setTimeout(resolve,500));return !fail}}/>
  </>
}
if(import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Harness/> )
