import {createRoot} from 'react-dom/client'
import '../../src/index.css'
import {TranscriptionAction} from '../../src/components/teacher/LocalTranscription'
localStorage.setItem('iskra.transcription.device.fixture','fixture')
document.documentElement.dataset.theme=location.search.includes('dark')?'dark':'light'
createRoot(document.getElementById('root')!).render(<div style={{display:'grid',maxWidth:820,margin:'8px auto'}}><TranscriptionAction owner="fixture" lessonKey="fixture-lesson" source="" onApply={()=>{}} /></div>)
