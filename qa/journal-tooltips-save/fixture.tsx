import '../../src/lib/polyfills'
import '../../src/lib/platform'
import '../../src/index.css'
import '../../src/components/teacher/courseJournal.css'
import '../../src/components/teacher/journalStand/journalStand.css'
import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import NativeTitleTooltips from '../../src/components/NativeTitleTooltips'
import Tooltip from '../../src/components/Tooltip'
import AttendanceEditor from '../../src/components/teacher/journalStand/AttendanceEditor'
import { journalDemo } from '../../src/data/courseJournalDemo'
import { applyConfirmedAttendance } from '../../src/lib/confirmedAttendance'
import { buildJournalIndex, journalColumns, journalCell } from '../../src/lib/courseJournal'
const data=journalDemo(), cell=journalCell(data,buildJournalIndex(data),data.students[0],journalColumns(data,data.courses[0].id)[0],'2026-12-31')
cell.present=null;cell.grade=null
function Fixture(){
  const [journal,setJournal]=useState(()=>({...data,marks:[],legacy:[]})),[open,setOpen]=useState(false),[saved,setSaved]=useState(0),[name,setName]=useState('Исходная подсказка'),[clicks,setClicks]=useState(0)
  const liveCell=journalCell(journal,buildJournalIndex(journal),data.students[0],journalColumns(journal,data.courses[0].id)[0],'2026-12-31')
  return <><NativeTitleTooltips/><main style={{padding:24,display:'grid',gap:16,maxWidth:'100%'}}>
    <h1>Журнал · fixture QA</h1>
    <button id="native" title={name} onClick={()=>setClicks(v=>v+1)}>Обычная кнопка {clicks}<span> · внутри</span></button>
    <button id="rename" onClick={()=>setName('Обновлённая подсказка')}>Изменить подпись</button>
    <Tooltip label="Кастомная подсказка" keys="Ctrl B"><button id="explicit">Иконка</button></Tooltip>
    <button id="cell" title="Вера · Простейшие · Был · Восклицательный знак — долг по ДЗ: просрочено">Был <span id="debt" title="Долг по ДЗ: просрочено">!</span></button>
    <button id="open" onClick={()=>setOpen(true)}>Открыть отметки</button><output id="saved">{saved}</output><output id="mark-state">{liveCell.present === null ? "Нет отметки" : liveCell.present ? "Был" : "Пропуск"}</output>
    <button id="edge" title={'Длинное пояснение у правого нижнего края. '.repeat(8)} style={{position:'fixed',bottom:4,right:4}}>?</button>
    <div id="scroll" style={{height:70,overflowY:'auto'}}><div style={{height:200}}>Прокрутка только для проверки скрытия подсказки</div></div>
  </main>{open&&<AttendanceEditor cells={[liveCell]} onCommitted={edits=>setJournal(current=>applyConfirmedAttendance(current,edits))} mobile={new URLSearchParams(location.search).has('mobile')} onSaved={()=>setSaved(v=>v+1)} onClose={()=>setOpen(false)}/>}</>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>)
