import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import GrowTextarea from '../../src/components/GrowTextarea'
import { FIELD } from '../../src/lib/fieldStyle'
import '../../src/index.css'
import '../../src/styles/android.css'

function Fixture() {
  const [value, setValue] = useState('Одна строка')
  const [minimum, setMinimum] = useState(0)
  const [panelWidth, setPanelWidth] = useState('100%')
  const events = ((window as any).growEvents ??= [])
  ;(window as any).growQa = { setMinimum, setPanelWidth }
  return <main style={{ padding: 16, maxWidth: 520 }}>
    <div style={{ width: panelWidth, maxWidth: '100%' }}>
      {(['border-box', 'content-box'] as const).map(boxSizing => <section key={boxSizing} style={{ marginBottom: 16 }}>
        <GrowTextarea aria-label={boxSizing} value={value} minHeight={minimum}
          onChange={next => { events.push(next); setValue(next) }}
          style={{ ...FIELD, boxSizing, width: boxSizing === 'content-box' ? 'calc(100% - 26px)' : '100%' }} />
      </section>)}
    </div>
  </main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
