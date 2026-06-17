// Teacher view of a student's growth across repeated screenings/diagnostics over time.
// Reads diag_results history for a name+subject, plots overall % per attempt as an SVG
// sparkline. Embed in the student card: <GrowthChart name="Иванов" subject="logic" />

import { useEffect, useState } from 'react'
import { loadAnonResults, type AnonDiagResult } from '../../data/diagnosticData'

interface Point { t: number; pct: number; date: string }

function overallPct(r: AnonDiagResult): number {
  let c = 0, tot = 0
  for (const v of Object.values(r.results)) { c += v.correct; tot += v.total }
  return tot ? Math.round((c / tot) * 100) : 0
}

export default function GrowthChart({ name, subject }: { name: string; subject?: string }) {
  const [points, setPoints] = useState<Point[] | null>(null)

  useEffect(() => {
    loadAnonResults().then(all => {
      const mine = all
        .filter(r => r.name === name && (!subject || r.subject === subject))
        .map(r => ({ t: new Date(r.timestamp).getTime(), pct: overallPct(r), date: new Date(r.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) }))
        .sort((a, b) => a.t - b.t)
      setPoints(mine)
    })
  }, [name, subject])

  if (!points) return null
  if (points.length < 2) return (
    <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '8px 0' }}>
      Динамика появится после второго прохождения{points.length === 1 ? ` (сейчас 1 попытка, ${points[0].pct}%)` : ''}.
    </div>
  )

  const W = 280, H = 90, pad = 22
  const xs = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const ys = (p: number) => H - pad - (p / 100) * (H - pad * 2)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(p.pct).toFixed(1)}`).join(' ')
  const first = points[0].pct, last = points[points.length - 1].pct
  const delta = last - first
  const ACC = '#f59e0b'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Динамика ({points.length} прохожд.)</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>
          {delta >= 0 ? '▲ +' : '▼ '}{delta}%
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[0, 50, 100].map(g => (
          <line key={g} x1={pad} x2={W - pad} y1={ys(g)} y2={ys(g)} stroke="var(--color-border-soft)" strokeWidth="1" strokeDasharray="3 3" />
        ))}
        <path d={path} fill="none" stroke={ACC} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xs(i)} cy={ys(p.pct)} r="3.5" fill={ACC} />
            <text x={xs(i)} y={ys(p.pct) - 8} fontSize="9" fill="var(--color-text-2)" textAnchor="middle" fontWeight="700">{p.pct}%</text>
            <text x={xs(i)} y={H - 6} fontSize="8" fill="var(--color-text-3)" textAnchor="middle">{p.date}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
