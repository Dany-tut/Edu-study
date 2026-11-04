import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import '../../src/index.css'
import {TranscriptionAction} from '../../src/components/teacher/LocalTranscription'
const key='iskra.transcription.job.'+JSON.stringify(['recovery-fixture','lesson-a'])
localStorage.setItem('iskra.transcription.device.recovery-fixture','fixture')
localStorage.setItem(key,JSON.stringify({id:'job-a',source:'https://example.test/recording'}))
let mode='offline'
const requests:string[]=[]
const originalFetch=window.fetch
window.fetch=async (input,init)=>{
 const url=String(input)
 if(!url.startsWith('http://127.0.0.1:18764'))return originalFetch(input,init)
 requests.push((init?.method||'GET')+' '+url)
 document.getElementById('requests')!.textContent=requests.join('\n')
 if(mode==='offline')throw new TypeError('Failed to fetch')
 return new Response(JSON.stringify(mode==='missing'?{}:{done:true,stage:'Готово',segments:[{start:0,end:2,text:'Проверенный результат задания A'}],chapters:[{start:0,title:'Глава A'}]}),{status:mode==='missing'?404:200,headers:{'Content-Type':'application/json'}})
}
function Stand(){const [state,setState]=useState(mode);return <main style={{padding:24,maxWidth:1000,margin:'auto'}}>
 <h1>Стенд восстановления связи</h1><p>Состояние: {state}</p>
 {['offline','ready','missing'].map(value=><button key={value} onClick={()=>{mode=value;setState(value)}}>{value}</button>)}
 <pre id="requests" style={{whiteSpace:'pre-wrap'}}/>
 <TranscriptionAction owner="recovery-fixture" lessonKey="lesson-a" source="https://example.test/recording" onApply={async()=>true}>{(action,rail)=><>{action}<p>{rail?.draft.transcript.segments[0].text}</p></>}</TranscriptionAction>
 </main>}
createRoot(document.getElementById('root')!).render(<Stand/>);
