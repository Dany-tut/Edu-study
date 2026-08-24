// Временный дев-харнесс решателей «сборка тапами» — открывается как
// /dev-tiles.html, в прод-сборку не попадает. Удалить после проверки.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import CharTilesSolver from './components/CharTilesSolver'
import BlockOrderSolver from './components/BlockOrderSolver'
import JamoTypeSolver from './components/JamoTypeSolver'
import DialogGapSolver from './components/DialogGapSolver'
import SyllableBuilder from './components/SyllableBuilder'
import './index.css'

function Demo() {
  const [a, setA] = useState<string | undefined>(undefined)
  const [b, setB] = useState<string | undefined>(undefined)
  const [c, setC] = useState<string | undefined>(undefined)
  const [d, setD] = useState<string | undefined>(undefined)
  const [e, setE] = useState<string | undefined>(undefined)
  const [f, setF] = useState<string | undefined>(undefined)
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
        <div style={sub}>Банк и есть неправильное написание. Клик по слогу в строке — он улетает обратно</div>
        <CharTilesSolver mode="unscramble" answer="안녕하세요" value={a} showVerdict={verdict} onChange={setA} />
      </div>
      <div style={box}>
        <h3 style={h}>2 · «Ряд слогов» (charBank)</h3>
        <div style={sub}>Собери 감사합니다 — часть слогов нарочно похожие обманки</div>
        <CharTilesSolver mode="bank" answer="감사합니다" value={b} showVerdict={verdict} onChange={setB} />
      </div>
      <div style={box}>
        <h3 style={h}>3a · «Сборка из блоков» — реплики диалога (колонкой)</h3>
        <div style={sub}>Длинные блоки идут колонкой с номерами мест</div>
        <BlockOrderSolver
          items={['안녕하세요!', '만나서 반갑습니다.', '저는 다니예요.', '안녕히 가세요!']}
          value={c}
          showVerdict={verdict}
          onChange={setC}
        />
      </div>
      <div style={box}>
        <h3 style={h}>3b · «Сборка из блоков» — куски предложения (в строку)</h3>
        <div style={sub}>Короткие блоки собираются в строку, как само предложение</div>
        <BlockOrderSolver
          items={['저는', '한국어를', '공부해요']}
          value={d}
          showVerdict={verdict}
          onChange={setD}
        />
      </div>
      <div style={box}>
        <h3 style={h}>4 · «Набор по буквам» (jamoType)</h3>
        <div style={sub}>Клавиатура из букв: ㅇ+ㅏ+ㄴ → 안, слоги складываются на глазах</div>
        <JamoTypeSolver answer="안녕" value={e} showVerdict={verdict} onChange={setE} />
      </div>
      <div style={box}>
        <h3 style={h}>5 · «Пропуск в диалоге» (dialogGap)</h3>
        <div style={sub}>Реплики озвучены разными голосами; пропуск закрывает ученик</div>
        <DialogGapSolver
          dialog={[
            { speaker: 'A', text: '안녕하세요! 이름이 뭐예요?' },
            { speaker: 'B', text: '저는 다니예요. ____?' },
            { speaker: 'A', text: '저는 민수예요. 반갑습니다!' },
          ]}
          answer="이름이 뭐예요"
          distractors={['어디예요', '뭐 해요', '몇 시예요']}
          lang="ko"
          value={f}
          showVerdict={verdict}
          correct={f === '이름이 뭐예요'}
          onChange={setF}
        />
      </div>
      <div style={box}>
        <h3 style={h}>6 · «Собрать слог» — было раньше, проверка правки</h3>
        <div style={sub}>Кнопки «Убрать букву» больше нет: клик по слогу снимает последнюю</div>
        <SyllableBuilder syllable="김" value={undefined} onChange={() => {}} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={() => setVerdict(v => !v)} style={{ padding: '10px 18px', borderRadius: 12, cursor: 'pointer' }}>
          Вердикт: {verdict ? 'вкл' : 'выкл'}
        </button>
        <button
          onClick={() => { setA(undefined); setB(undefined); setC(undefined); setD(undefined); setE(undefined); setF(undefined); setVerdict(false) }}
          style={{ padding: '10px 18px', borderRadius: 12, cursor: 'pointer' }}
        >
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
