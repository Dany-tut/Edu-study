import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import '../../src/index.css'
import RecordingLinkForm from '../../src/components/teacher/RecordingLinkForm'

function Stand() {
  const [open, setOpen] = useState(true)
  return open ? <RecordingLinkForm initialUrl="" onClose={() => setOpen(false)} onSave={url => new Promise(resolve => {
    window.dispatchEvent(new CustomEvent('recording-submit', { detail: url }))
    window.addEventListener('recording-result', e => resolve((e as CustomEvent<boolean>).detail), { once: true })
  })} /> : <button onClick={() => setOpen(true)}>Открыть</button>
}
document.documentElement.dataset.theme = location.search.includes('dark') ? 'dark' : 'light'
createRoot(document.getElementById('root')!).render(<Stand />)
