import 'clsx'
import React,{useState,useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import '../../src/index.css'
import Mini from '../../src/components/teacher/widgets/_MiniStatCard'
import Lessons from '../../src/components/teacher/widgets/WidgetStatLessons'
import Earnings from '../../src/components/teacher/widgets/WidgetStatEarnings'
import Reminders from '../../src/components/teacher/widgets/WidgetTodayReminders'
import Groups from '../../src/components/teacher/widgets/WidgetGroupsList'
import Overdue from '../../src/components/teacher/widgets/WidgetFinanceOverdue'
import Attention from '../../src/components/teacher/widgets/WidgetAttentionStudents'
import {Users} from '../../src/components/icons/appIcons'
import {useTeacher} from '../../src/store/teacherStore'
const initial=useTeacher.getState();useTeacher.setState({setActivePage:(p)=>{window.dispatchEvent(new CustomEvent('qa-action',{detail:'route:'+p}));initial.setActivePage(p)},openLessonEditor:(id)=>{window.dispatchEvent(new CustomEvent('qa-action',{detail:'lesson:'+id}));initial.openLessonEditor(id)}})
const ids=['stat-students','stat-hw','student-count','student-groups','student-active','student-debtors','finance-received','finance-expected','finance-debt','finance-forecast']
function App(){const [log,setLog]=useState<string[]>([]);useEffect(()=>{const add=(e:any)=>setLog(l=>[...l,e.detail]);window.addEventListener('qa-action',add);const unsub=useTeacher.subscribe((s,p)=>{if(s.activePage!==p.activePage||s.editingScheduleId!==p.editingScheduleId)setLog(l=>[...l,s.activePage+':'+(s.editingScheduleId??'')])});return()=>{window.removeEventListener('qa-action',add);unsub()}},[])
const card=(id:string,node:React.ReactNode,w=340,h=130)=><div key={id} style={{width:w,maxWidth:'100%'}}><label>{id}</label><div className="iskra-widget desk-widget-shell" data-testid={id} data-grid-w="2" data-grid-h="1" style={{width:'100%',maxWidth:'100%',height:h,containerType:'size',position:'relative'}}>{node}</div></div>
return <main style={{padding:20,paddingTop:100}}><header style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'var(--color-bg)',padding:10}}><button onClick={()=>{setLog([]);useTeacher.setState({activePage:'home',editingScheduleId:null})}}>Сброс</button><button onClick={()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'}>Тема</button><output aria-label="Результат">{JSON.stringify(log)}</output></header><div style={{display:'flex',flexWrap:'wrap',gap:16}}>{ids.map(id=>card(id,<Mini widgetId={id} icon={Users} label={id} value={12} sub="Контекст" accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"/>))}{card('stat-lessons',<Lessons/>)}{card('stat-earnings',<Earnings/>)}{card('attention-students',<Attention/>)}{card('groups-list',<Groups/>,500,270)}{card('finance-overdue',<Overdue/>,700,300)}{card('today-reminders',<Reminders/>,700,450)}</div></main>}
createRoot(document.getElementById('root')!).render(<App/>);
