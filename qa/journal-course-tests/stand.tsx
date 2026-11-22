import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import TeacherGroupsPage from '../../src/pages/teacher/TeacherGroupsPage'
import '../../src/index.css'
function App() {
  const [homework, setHomework] = useState(false)
  const [trials, setTrials] = useState(false)
  const [tests, setTests] = useState(false)
  return <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
    <div><button onClick={() => setTests(false)}>Курс без тестов</button><button onClick={() => setTests(true)}>Курс с тестом</button></div>
    <div><button onClick={() => setTrials(false)}>Без пробников</button><button onClick={() => setTrials(true)}>С пробником</button></div>
    <div><button onClick={() => setHomework(false)}>Без ДЗ</button><button onClick={() => setHomework(true)}>С ДЗ</button></div>
    <TeacherGroupsPage onOpenStudent={() => {}} rosterHasTests={() => tests} rosterHasTrials={() => trials} rosterHasHomework={() => homework} />
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
