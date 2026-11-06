import { createRoot } from 'react-dom/client'
import { useMemo, useState } from 'react'
import AiBatchBar from './components/teacher/AiBatchBar'
import ConfirmHost from './components/ConfirmHost'
import { summarizeAgreement, type AiBatchItem, type AiBatchSource, type AiCorrection } from './lib/aiBatch'
import './index.css'

// DEV-only стенд «Применить все уверенные» и сводки расхождений: данные в памяти,
// база и ученики не затрагиваются. ?scenario=mixed|none|all|fail|missed|empty&theme=dark
const q = new URLSearchParams(location.search)
document.documentElement.dataset.theme = q.get('theme') === 'dark' ? 'dark' : 'light'

const item = (n: number, doubt: AiBatchItem['doubt'] = null): AiBatchItem => ({ id: `g${n}`, progressId: `p${n}`, score: 50 + n, doubt })
const SCENARIOS: Record<string, AiBatchItem[]> = {
  mixed: [item(1), item(2), item(3), item(4, 'partial'), item(5, 'photo'), item(6, 'partial')],
  none: [item(4, 'partial'), item(5, 'author')],
  all: Array.from({ length: 12 }, (_, i) => item(i + 1)),
  fail: [item(1), item(2)],
  missed: [item(1), item(2), item(3)],
  empty: [],
}
const corrections: AiCorrection[] = [
  { gradeId: 'a', kind: 'basic', kimN: 34, diff: 'score', aiScore: 75, teacherScore: 50, aiMark: null, teacherMark: null, createdAt: '' },
  { gradeId: 'b', kind: 'basic', kimN: 34, diff: 'score', aiScore: 50, teacherScore: 75, aiMark: null, teacherMark: null, createdAt: '' },
  { gradeId: 'c', kind: 'hard', kimN: 34, diff: 'score', aiScore: 5, teacherScore: 3, aiMark: 5, teacherMark: 3, createdAt: '' },
  { gradeId: 'd', kind: 'basic', kimN: 33, diff: 'comment', aiScore: 80, teacherScore: 80, aiMark: null, teacherMark: null, createdAt: '' },
  { gradeId: 'e', kind: 'basic', kimN: null, diff: 'score', aiScore: 90, teacherScore: 60, aiMark: null, teacherMark: null, createdAt: '' },
]

function Harness() {
  const scenario = q.get('scenario') ?? 'mixed'
  const [items, setItems] = useState(SCENARIOS[scenario] ?? SCENARIOS.mixed)
  const [log, setLog] = useState<string[]>([])
  const source = useMemo<AiBatchSource>(() => ({
    preview: async () => ({ preview: { sure: items.filter(i => !i.doubt), disputed: items.filter(i => i.doubt) }, known: scenario !== 'empty' || q.has('known') }),
    apply: async ids => {
      await new Promise(r => setTimeout(r, 400))
      setLog(l => [...l, `apply ${ids.join(',')}`])
      if (scenario === 'fail') throw new Error('offline')
      const done = scenario === 'missed' ? ids.slice(1) : ids
      setItems(list => list.filter(i => !done.includes(i.id)))
      return done
    },
    agreement: async () => {
      await new Promise(r => setTimeout(r, 300))
      if (q.get('summary') === 'fail') throw new Error('offline')
      return q.get('summary') === 'empty' ? summarizeAgreement([], 0) : summarizeAgreement(corrections, 9)
    },
  }), [items, scenario])
  return <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 16, boxSizing: 'border-box' }}>
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '2px 4px 12px' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Нужно проверить</span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'var(--color-peach-soft)', color: 'var(--color-peach-text)' }}>{items.length}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)' }}>по дедлайну</span>
      </div>
      <AiBatchBar queueKey={items.map(i => i.id).join('|')} onApplied={() => setLog(l => [...l, 'reload'])} source={source} />
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(i => <div key={i.id} style={{ background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-soft)', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: 'var(--color-text)' }}>
          Работа {i.id} · ИИ {i.score}% · {i.doubt ? `спорная (${i.doubt})` : 'уверенная'}
        </div>)}
      </div>
      <output data-testid="log" style={{ display: 'block', marginTop: 16, fontSize: 11, color: 'var(--color-text-3)' }}>{log.join(' · ')}</output>
    </div>
    <ConfirmHost />
  </div>
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Harness />)
