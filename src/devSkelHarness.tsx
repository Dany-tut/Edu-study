import { createRoot } from 'react-dom/client'
import TrainerBootSkeleton from './components/trainer/TrainerBootSkeleton'
import TrainerSkeleton from './components/trainer/TrainerSkeleton'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'relative' }}>
    <div style={{ position: 'absolute', inset: 0, filter: 'hue-rotate(140deg)' }}>
      <TrainerBootSkeleton desktop />
    </div>
    <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
      <TrainerSkeleton />
    </div>
  </div>,
)
