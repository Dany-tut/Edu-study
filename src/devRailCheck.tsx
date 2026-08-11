// ВРЕМЕННЫЙ стенд: карточки рейла — проверяем, что длинная подпись уходит на
// вторую строку, а не обрывается многоточием на первой.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ListChecks, SlidersHorizontal, BookOpen, Headphones, Mic } from 'lucide-react'
import { RailCard, RailList, RailModes, RailSegment } from './components/trainer/TrainerShell'
import './index.css'

const accent = '#8b7bf7'
const soft = 'rgba(139,123,247,0.18)'

const WORDS = [
  { id: '인력거꾼', label: '인력거꾼', sub: 'иллёккоккун', hint: 'рикша (человек, тянущий коляску)' },
  { id: '노릇을 하다', label: '노릇을 하다', sub: 'норысыль хада', hint: 'выполнять роль, притворяться кем-то' },
  { id: '운수', label: '운수', sub: 'унсу', hint: 'везение, удача, судьба' },
  { id: '어정어정하다', label: '어정어정하다', sub: 'оджоноджонхада', hint: 'слоняться, топтаться без дела' },
  { id: '설렁탕', label: '설렁탕', sub: 'соллонтхан', hint: 'соллонтхан — суп на говяжьей кости' },
  { id: '달포', label: '달포', sub: 'тальпхо', hint: 'больше месяца' },
]

function Stand() {
  const [word, setWord] = useState('노릇을 하다')
  const [mode, setMode] = useState('reading')
  const [seg, setSeg] = useState('short')
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24, width: 300, flexDirection: 'column' }}>
      <RailCard title="Режим" accent={accent} icon={<SlidersHorizontal size={15} />}>
        <RailModes
          items={[
            { id: 'reading', label: 'Чтение с разбором слов', Icon: BookOpen },
            { id: 'listening', label: 'Аудирование', Icon: Headphones, count: 12 },
            { id: 'speaking', label: 'Говорение', Icon: Mic },
          ]}
          value={mode}
          onChange={setMode}
          accent={accent}
          soft={soft}
        />
        <RailSegment
          options={[{ value: 'short', label: 'до 3 мин' }, { value: 'mid', label: 'до 10 мин' }, { value: 'long', label: 'больше 10 мин' }]}
          value={seg}
          onChange={setSeg}
          accent={accent}
          soft={soft}
        />
      </RailCard>

      <RailCard title="Словарь текста" accent={accent} icon={<ListChecks size={15} />}>
        <RailList items={WORDS} value={word} onChange={setWord} accent={accent} soft={soft} />
      </RailCard>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
