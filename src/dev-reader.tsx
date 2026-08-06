import { createRoot } from 'react-dom/client'
import './index.css'
import LanguageTrainer from './components/LanguageTrainer'

// Временная страница для проверки читалки в превью (удаляется после проверки).
createRoot(document.getElementById('root')!).render(
  <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: 24 }}>
    <LanguageTrainer lang="ko" subject="Корейский" subjectId="korean" dark={false} />
  </div>,
)
