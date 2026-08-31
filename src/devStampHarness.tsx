// ВРЕМЕННЫЙ стенд печати обновления. Удаляется после съёмки.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import PullStamp from './components/PullStamp'
import { PULL_THRESHOLD } from './lib/usePullRefresh'
import './index.css'

function Stand() {
  const [p, setP] = useState(0)
  const locked = p >= PULL_THRESHOLD
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <input type="range" min={0} max={104} value={p} onChange={e => setP(+e.target.value)} style={{ width: 320 }} />
      <div style={{ marginBottom: 16 }}>{p} px {locked ? '· щелчок' : ''}</div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <PullStamp progress={p / PULL_THRESHOLD} locked={locked} size={96} />
        {[0.25, 0.5, 0.75, 1].map(v => (
          <PullStamp key={v} progress={v} locked={false} size={64} />
        ))}
        <PullStamp progress={1} locked size={64} />
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<Stand />)
