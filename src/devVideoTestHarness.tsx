import { createRoot } from 'react-dom/client'
import { ChevronRight } from 'lucide-react'

// Замер прозрачного поля глифа стрелки: ink пути против рамки svg.
function App() {
  return (
    <div style={{ padding: 20, color: '#fff' }}>
      <span id="chev" style={{ display: 'inline-flex' }}><ChevronRight size={14} /></span>
      <pre id="out" style={{ color: '#0f0', fontSize: 13 }} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

setTimeout(() => {
  const svg = document.querySelector('#chev svg') as SVGSVGElement | null
  const path = svg?.querySelector('path') as SVGPathElement | null
  if (!svg || !path) return
  const b = path.getBBox()          // без обводки, в единицах viewBox
  const sw = Number(getComputedStyle(path).strokeWidth.replace('px', '')) || 2
  const vb = svg.viewBox.baseVal
  const size = svg.getBoundingClientRect().width
  const inkLeft = (b.x - sw / 2) / vb.width * size
  const inkRight = (vb.width - (b.x + b.width + sw / 2)) / vb.width * size
  const el = document.getElementById('out')
  if (el) el.textContent = JSON.stringify({ size, viewBox: vb.width, bbox: { x: b.x, w: b.width }, strokeWidth: sw, inkLeftPx: +inkLeft.toFixed(2), inkRightPx: +inkRight.toFixed(2), sizeOverThree: +(size / 3).toFixed(2) }, null, 1)
}, 0)
