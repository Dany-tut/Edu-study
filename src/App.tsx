import { useState, useEffect } from 'react'
import DashboardPage from './pages/DashboardPage'
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

export default function App() {
  const hash = useHashRoute()
  if (hash === '#/teacher') return <TeacherDashboardPage />
  return <DashboardPage />
}
