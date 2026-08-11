// ВРЕМЕННЫЙ стенд (dev-langcheck.html) — удаляется после проверки.
import { createRoot } from 'react-dom/client'
import TestFlow from './components/TestFlow'
import type { Lesson, TestTask } from './data/mockData'
import './index.css'

const task = (x: Partial<TestTask> & { id: string }): TestTask => ({
  type: 'extended', isHard: false, label: '', ...x,
} as TestTask)

const lesson: Lesson = {
  id: 'dev-lang', title: 'Стенд', number: 1, status: 'done', shape: 'circle',
  subject: 'korean', kind: 'test',
  testTasks: [
    task({ id: 't1', type: 'trace', question: 'Обведите букву ㄴ', chamo: 'ㄴ' }),
    task({ id: 't2', type: 'buildSyllable', question: 'Соберите слог 김', syllable: '김' }),
    task({ id: 't3', type: 'trace', question: 'Буква не задана — так выглядит незаполненное задание' }),
  ],
}

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24 }}>
    <TestFlow lesson={lesson} onBack={() => {}} />
  </div>,
)
