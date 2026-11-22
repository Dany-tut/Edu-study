import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import TeacherGroupsPage from '../../src/pages/teacher/TeacherGroupsPage'
import '../../src/index.css'
function App() {
  const [tests, setTests] = useState(false)
  return <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
    <div><button onClick={() => setTests(false)}>Курс без тестов</button><button onClick={() => setTests(true)}>Курс с тестом</button></div>
    <TeacherGroupsPage onOpenStudent={() => {}} rosterHasTests={() => tests} />
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
