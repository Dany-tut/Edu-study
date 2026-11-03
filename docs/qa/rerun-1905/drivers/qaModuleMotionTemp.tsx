import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ModuleChain} from './components/CourseModuleBar'
import HScrollFade from './components/HScrollFade'
import {useTheme} from './store/themeStore'
import CourseNode from './components/CourseNode'
import './index.css'
const mods=[1,2,3,4,5].map(id=>({id,label:['Строение вещества','Химические реакции','Неорганическая химия','Органическая химия','Закрытый модуль'][id-1],lessons:Array.from({length:6},(_,i)=>({id:`${id}-${i}`,number:i,title:`Урок ${i+1}`,status:id===5?'locked':id===1?'completed':'available',shape:'circle',subject:'Химия'}))}))
function App(){const[id,set]=useState(2);const dark=useTheme(s=>s.dark);const theme=useTheme(s=>s.toggle);return <div data-theme={dark?'dark':'light'} style={{padding:24,minHeight:'100vh',background:'var(--color-bg)',color:'var(--color-text)'}}><button onClick={theme}>Тема</button><div style={{marginTop:32}}><HScrollFade padTop={10}><ModuleChain subject={{id:'qa',modules:mods} as any} activeId={id} onSelect={set} debtCounts={{2:7,3:12,4:100}}/></HScrollFade></div><div style={{display:'flex',gap:30,marginTop:60}}>{mods[id-1].lessons.map((l,i)=><CourseNode key={l.id} lesson={l as any} index={i} status="unviewed"/>)}</div></div>}
createRoot(document.getElementById('root')!).render(<App/>);
