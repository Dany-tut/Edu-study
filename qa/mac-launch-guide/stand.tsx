import {createRoot} from 'react-dom/client'
import '../../src/index.css'
import {TranscriptionModuleCard} from '../../src/components/teacher/LocalTranscription'
import ScrollFade from '../../src/components/ScrollFade'
document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') || 'light'
localStorage.setItem('iskra.transcription.downloadStarted.guide-fixture', '1')
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1100,margin:'auto',padding:16}}><ScrollFade maxHeight="calc(100dvh - 32px)"><TranscriptionModuleCard owner="guide-fixture" /></ScrollFade></main>)
