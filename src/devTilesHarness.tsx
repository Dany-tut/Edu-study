// Временный дев-харнесс трёх решателей «сборка тапами» — открывается как
// /dev-tiles.html, в прод-сборку не попадает. Удалить после проверки.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import CharTilesSolver from './components/CharTilesSolver'
import BlockOrderSolver from './components/BlockOrderSolver'
import './index.css'

function Demo() {
  const [a, setA] = useState<string | undefined>(undefined)
  const [b, setB] = useState<string | undefined>(undefined)
  const [c, setC] = useState<string | undefined>(undefined)
  const [verdict, setVerdict] = useState(false)
  const box: React.CSSProperties = {
    maxWidth: 560, margin: '0 auto 24px', padding: 18, borderRadius: 18,
    background: 'rgba(var(--glass-rgb), 0.7)', border: '1px solid var(--color-border-glass)',
  }
  const h: React.CSSProperties = { marginBottom: 4, fontSize: 15, fontWeight: 750 }
  const sub: React.CSSProperties = { marginBottom: 12, fontSize: 12.5, color: 'var(--color-muted)' }
  return (
    <div style={{ padding: '26px 16px 60px', fontFamily: 'Manrope, system-ui, sans-serif', color: 'var(--color-text)' }}>
      <div style={box}>
        <h3 style={h}>1 · «Написано неправильно» (unscramble)</h3>
        <div style={sub}>Банк плиток и есть неправильное написание — пересобери 안녕하세요 правильно</div>
        <CharTilesSolver mode="unscramble" answer="안녕하세요" value={a} showVerdict={verdict} onChange={setA} />
      </div>
      <div style={box}>
        <h3 style={h}>2 · «Ряд слогов» (charBank)</h3>
        <div style={sub}>Собери 감사합니다 — часть слогов в ряду нарочно похожие обманки (캄, 검, 가)</div>
        <CharTilesSolver mode="bank" answer="감사합니다" value={b} showVerdict={verdict} onChange={setB} />
      </div>
      <div style={box}>
        <h3 style={h}>3 · «Сборка из блоков» (blockOrder)</h3>
        <div style={sub}>Реплики диалога тапаются из банка в правильном порядке</div>
        <BlockOrderSolver
          items={['안녕하세요!', '만나서 반갑습니다.', '저는 다니예요.', '안녕히 가세요!']}
          value={c}
          showVerdict={verdict}
          onChange={setC}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => setVerdict(v => !v)} style={{ padding: '10px 18px', borderRadius: 12, cursor: 'pointer' }}>
          Вердикт: {verdict ? 'вкл' : 'выкл'}
        </button>
        <button onClick={() => { setA(undefined); setB(undefined); setC(undefined); setVerdict(false) }} style={{ padding: '10px 18px', borderRadius: 12, cursor: 'pointer' }}>
          Сбросить
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)
