import { useState, useEffect } from 'react'
import DashboardPage from './pages/DashboardPage'
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage'
import TeacherLoginPage from './pages/teacher/TeacherLoginPage'
import JoinPage from './pages/JoinPage'
import StudentLoginPage from './pages/StudentLoginPage'
import { supabase } from './lib/supabase'
import { getStudentSession } from './lib/studentSession'
import type { Session } from '@supabase/supabase-js'
import './store/themeStore' // initialise theme + apply data-theme before first render
import { useStudentData } from './store/studentDataStore'
import NotificationToastContainer from './components/NotificationToast'

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
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const loadStudentData = useStudentData(s => s.load)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Load real Supabase data whenever a student session exists
  useEffect(() => {
    if (getStudentSession()) loadStudentData()
  }, [loadStudentData])

  if (hash.startsWith('#/join')) return <JoinPage />

  if (hash.startsWith('#/teacher')) {
    if (session === undefined) return null
    if (!session) return <TeacherLoginPage onLogin={() => {}} />
    return <><TeacherDashboardPage /><NotificationToastContainer /></>
  }

  // Student routes
  const studentSession = getStudentSession()
  if (!studentSession) return <StudentLoginPage />
  return <><DashboardPage /><NotificationToastContainer /></>
}
