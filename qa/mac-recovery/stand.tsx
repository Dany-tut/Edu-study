import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import '../../src/index.css'
import {TranscriptionAction} from '../../src/components/teacher/LocalTranscription'
const uploaded = new URLSearchParams(location.search).has('uploaded')
const lesson = uploaded ? 'uploaded-lesson-a' : 'lesson-a'
const source = uploaded ? '' : 'https://example.test/recording'
const key='iskra.transcription.job.'+JSON.stringify(['recovery-fixture',lesson])
localStorage.setItem('iskra.transcription.device.recovery-fixture','fixture')
localStorage.setItem(key,JSON.stringify({id:'job-a',source, fileSignature: uploaded ? 'accepted-file' : undefined}))
let mode=localStorage.getItem('recovery-fixture-mode') || 'offline'
const requests:string[]=[]
const originalFetch=window.fetch
window.fetch=async (input,init)=>{
 const url=String(input)
 if(!url.startsWith('http://127.0.0.1:18764'))return originalFetch(input,init)
 requests.push((init?.method||'GET')+' '+url)
 document.getElementById('requests')!.textContent=requests.join('\n')
 if(mode==='offline')throw new TypeError('Failed to fetch')
 return new Response(JSON.stringify(mode==='missing'?{}:mode==='running'?{done:false,stage:'Распознаём речь',progress:{current:30,total:90,unit:'seconds'}}:{done:true,stage:'Готово',segments:[{start:0,end:2,text:'Проверенный результат задания A'}],chapters:[{start:0,title:'Глава A'}]}),{status:mode==='missing'?404:200,headers:{'Content-Type':'application/json'}})
}
function Stand(){const [state,setState]=useState(mode);return <main style={{padding:24,maxWidth:1000,margin:'auto'}}>
 <h1>Стенд восстановления связи</h1><p>Состояние: {state}</p>
 {['offline','running','ready','missing'].map(value=><button key={value} onClick={()=>{mode=value;localStorage.setItem('recovery-fixture-mode',value);setState(value)}}>{value}</button>)}
 <button onClick={()=>{localStorage.removeItem(key+'.draft');localStorage.setItem('recovery-fixture-mode','offline');location.reload()}}>Сбросить стенд</button>
 <pre id="requests" style={{whiteSpace:'pre-wrap'}}/>
 <TranscriptionAction owner="recovery-fixture" lessonKey={lesson} source={source} onApply={async()=>true}>{(action,rail)=><>{action}<p>{rail?.draft.transcript.segments[0].text}</p>{rail && <button onClick={()=>rail.change({...rail.draft,transcript:{...rail.draft.transcript,segments:[{start:0,end:2,text:'Правка пользователя A'}]}})}>Изменить реплику A</button>}</>}</TranscriptionAction>
 </main>}
createRoot(document.getElementById('root')!).render(<Stand/>);
