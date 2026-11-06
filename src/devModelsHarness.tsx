// Стенд 3D-моделей конспекта (dev-models.html).
// ?ref=model:atom:Fe — одна модель; ?dark — тёмная тема; ?chem / ?bio — один
// предмет. Без параметров — все образцы подряд, как они встанут в колонку
// конспекта (680 px).
import { createRoot } from 'react-dom/client'
import Model3DFigure from './components/Model3DFigure'
import { MODEL_PRESETS } from './lib/models3d/registry'
import './index.css'

const q = new URLSearchParams(location.search)
if (q.has('dark')) document.documentElement.dataset.theme = 'dark'
const refs = q.get('ref') ? [q.get('ref')!] : MODEL_PRESETS.filter(p => q.has('chem') ? p.subject === 'chem' : q.has('bio') ? p.subject === 'bio' : true).map(p => p.ref)

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28, background: 'var(--color-bg)', minHeight: '100vh', color: 'var(--color-text)' }}>
    {refs.map(ref => <Model3DFigure key={ref} src={ref} caption={`Маркер в конспекте: \`![подпись](${ref})\``} />)}
  </div>,
)
