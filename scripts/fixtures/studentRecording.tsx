import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {CenterRecording, RecordingViewSplit} from '../../src/pages/teacher/TeacherCourseEditorPage'
import '../../src/index.css'
const params = new URLSearchParams(location.search)
const count = Number(params.get('n') ?? 4)
function lesson(id: string) {
  const source = location.origin + '/video.mp4?lesson=' + id
  const data = {id, title: 'Урок '+id, description:'', videoUrl:source,
    timecodes:Array.from({length:count},(_,i)=>({time:`${Math.floor(i*3/60)}:${String(i*3%60).padStart(2,'0')}`,seconds:i*3,label:count===40 && i%3!==0 ? `${id}: глава ${i+1}. Атомы и нейтроны в таблице Менделеева, электронное строение и вычисление атомной массы` : `${id}: глава ${i+1}`})),
    transcript:{source:params.has('stale') ? 'https://other.invalid/video.mp4' : source,
      segments:[{start:0,end:2,text:'Реплика '+id}],
      ...(params.has('montage') ? {montage:{duration:16,quiet:[{id:'cut',start:3,end:6,level:-60}],settings:{minPause:1,sensitivity:'normal',padding:0,quietAction:'keep',speed:4}}} : {})}}
  return {...data,chapterVariants:{source,active:'text',revision:1,text:data.timecodes,slides:data.timecodes.map(c=>({...c,label:c.label+' слайд'}))}}
}
function App() {
  const [id,setId]=useState('A'), [view,setView]=useState<'original'|'preview'>('original')
  const [lessons,setLessons]=useState(()=>({A:lesson('A'),B:lesson('B')}))
  const [slot,setSlot]=useState<HTMLDivElement|null>(null)
  const [writes,setWrites]=useState(0)
  const current=lessons[id as 'A'|'B']
  return <main style={{padding:20,height:'100vh',display:'flex',flexDirection:'column',gap:16}}>
    <header style={{display:'flex',gap:16}}><button onClick={()=>setId(id==='A'?'B':'A')}>Другой урок</button><output data-writes={writes}>Записей: {writes}</output>
      <div style={{position:'relative',width:270,height:44}}><RecordingViewSplit view={view} hasMontage={params.has('montage')} onView={setView} label="Запись"/></div>
    </header>
    <div style={{display:'flex',gap:16,flex:1,minHeight:0}}>
      <aside ref={setSlot} style={{display:view==='preview'?'none':undefined,width:200,flexShrink:0}}/>
      <CenterRecording key={id} lesson={current as any} courseKey="fixture-course" published={false} loading={false}
        linesSlot={slot} preview={view==='preview'}
        onUpdate={next=>{setWrites(n=>n+1);setLessons(s=>({...s,[id]:next as any}))}}
        onSaveTranscript={async()=>{setWrites(n=>n+1);return true}}
        onSaveChapters={async()=>{setWrites(n=>n+1);return true}}
        onSaveLink={async()=>{setWrites(n=>n+1);return true}} />
    </div>
  </main>
}
createRoot(document.getElementById('root')!).render(<App/>);
