// Стенд рамки «Тестли в Искре» (dev-testly-frame.html).
//
// Лист Тестли здесь подменён имитатором dev-testly-sim.html, который говорит по
// протоколу v1 (testly:state / testly:done / testly:zoom, iskra:hello, iskra:cmd).
// ?p=pc|ipad|iphone|android — версия; ?theme=dark; остальные параметры уходят
// в имитатор: layout=cards|notebook|feed, back=0, nums=0, time=0, after=none|score|review,
// stage=review, offline=1, index=N.
import './lib/platform'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import TestlyFrame from './components/TestlyFrame'
import { PLATFORM, type Platform } from './lib/platform'
import type { TestlyDone } from './lib/testlyEmbed'
import './index.css'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
const platform = (q.get('p') as Platform | null) ?? PLATFORM
document.documentElement.dataset.platform = platform
const sim = new URLSearchParams(q); sim.delete('p'); sim.delete('theme')

function Stand() {
  const [open, setOpen] = useState(true)
  const [done, setDone] = useState<TestlyDone | null>(null)
  const phone = platform === 'iphone' || platform === 'android'
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: phone ? 16 : 24 }}>
      {open
        ? <TestlyFrame src={`/dev-testly-sim.html?${sim}`} title="Надкласс Рыбы" platform={platform} onClose={() => setOpen(false)} onDone={d => { setDone(d); setOpen(false) }} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
            <b>{done ? 'Тест сдан' : 'Тест закрыт'}</b>
            <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{done ? JSON.stringify(done, null, 1) : ''}</pre>
            <button type="button" onClick={() => { setDone(null); setOpen(true) }}>Открыть снова</button>
          </div>}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
