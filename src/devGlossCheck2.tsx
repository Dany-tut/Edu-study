// ВРЕМЕННЫЙ стенд: покрытие словаря на настоящем тексте сцены.
import { createRoot } from 'react-dom/client'
import GlossedText from './components/GlossedText'
import { EN_SCENES } from './data/scenes/scenesEn'
import { buildLexicon } from './lib/lexicon'
import './index.css'

const scene = EN_SCENES[0]
const lex = buildLexicon('en', scene.glossary ?? [])
const segs = lex.segment(scene.body)
const words = segs.filter(s => s.word)
const miss = words.filter(s => !s.gloss).map(s => s.text)

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
    <div id="stat" style={{ marginBottom: 16, color: 'var(--color-muted)', fontSize: 13 }}>
      слов {words.length} · без перевода {miss.length} · {miss.join(', ') || '—'}
    </div>
    <GlossedText text={scene.body} lang="en" extra={scene.glossary ?? []} accent="#f0906a" />
  </div>,
)
