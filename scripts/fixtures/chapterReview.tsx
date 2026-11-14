import React, {useState,useRef} from 'react'; import {createRoot} from 'react-dom/client';
import {TranscriptionAction,RecordingLines} from '../../src/components/teacher/LocalTranscription';
import {TimecodeRail} from '../../src/pages/teacher/TeacherCourseEditorPage';
import LessonVideoPlayer from '../../src/components/LessonVideoPlayer';
import {emptyWatch} from '../../src/lib/videoProgress';
import '../../src/index.css';
const source=location.origin+'/short.mp4';
const key='iskra.transcription.job.'+JSON.stringify(['qa','lesson-A']);
const codes=[{seconds:0,time:'00:00',label:'ТРИПАНОСОМА'},{seconds:4,time:'00:04',label:'V гч ···'},{seconds:8,time:'00:08',label:'ДРУГИЕ ЖГУТИКОНОСЦЫ'},{seconds:12,time:'00:12',label:'ДНК И РНК'},{seconds:16,time:'00:16',label:'mm ч ···'}];
if(!localStorage.getItem(key+'.chapter-variants')) localStorage.setItem(key+'.slides-draft',JSON.stringify({source,chapters:codes}));
const transcript={source,segments:[{start:0,end:5,text:'Первая реплика',speaker:0},{start:5,end:12,text:'Вторая реплика',speaker:0}]};
function App(){ const p=useRef<any>(null),w=useRef(emptyWatch()); const [at,setAt]=useState(0),[total,setTotal]=useState(18);const [saved,setSaved]=useState<any>(null);
return <div style={{display:'flex',height:'95vh',gap:12,padding:12}}><TranscriptionAction owner="qa" lessonKey="lesson-A" source={source} existing={{transcript,timecodes:[{seconds:0,time:'00:00',label:'По речи'}]}} onApply={async()=>true} onApplyChapters={async value=>{await new Promise(r=>setTimeout(r,300)); if((window as any).failSave) throw new Error('Проверка отказа. Черновик сохранён.');setSaved(value);return true}}>
{(action,rail,chapters)=><><aside style={{width:200}}>{rail&&<RecordingLines rail={rail} at={at} onSeek={s=>p.current?.playFrom(s)}/>}</aside><main style={{flex:1,minWidth:0}}><LessonVideoPlayer ref={p} source={{kind:'file',url:source}} title="QA запись" timecodes={chapters?.codes??[]} initialWatch={w.current} onTime={(t,d)=>{setAt(t);setTotal(d)}} onPersist={()=>{}}/><output data-testid="at">{at}</output><output hidden data-testid="saved">{JSON.stringify(saved)}</output></main><TimecodeRail codes={chapters?.codes??[]} chapters={chapters} rail={rail} transcriptionAction={action} at={at} total={total} onSeek={s=>p.current?.playFrom(s)} onChange={v=>chapters?.change(v)}/><aside style={{width:120}}>Уроки<br/>Урок A<br/>Урок B</aside></>}
</TranscriptionAction></div>}
createRoot(document.getElementById('root')!).render(<App/>);
