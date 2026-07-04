import { useState, useEffect } from 'react'
import DashboardPage from './pages/DashboardPage'
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage'
import TeacherLoginPage from './pages/teacher/TeacherLoginPage'
import JoinPage from './pages/JoinPage'
import JoinTeacherPage from './pages/JoinTeacherPage'
import StudentLoginPage from './pages/StudentLoginPage'
import DiagnosticTestPage from './pages/DiagnosticTestPage'
import ReviewSession from './components/ReviewSession'
import { supabase } from './lib/supabase'
import { getStudentSession } from './lib/studentSession'
import { initAnalytics, trackPath } from './lib/analytics'
import type { Session } from '@supabase/supabase-js'
import './store/themeStore' // initialise theme + apply data-theme before first render
import { useStudentData } from './store/studentDataStore'
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
  const [recovery, setRecovery] = useState(false)
  const loadStudentData = useStudentData(s => s.load)

  // Behavioural telemetry: init once, then log every route change.
  useEffect(() => { initAnalytics() }, [])
  useEffect(() => { trackPath(hash || '#/') }, [hash])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
    })
    // Re-check the session when the tab regains focus: if the token silently
    // expired while backgrounded, this refreshes it (or flips to logged-out)
    // instead of leaving a "dead" cabinet that 401s on the next request.
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data }) => setSession(data.session))
      }
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => { subscription.unsubscribe(); document.removeEventListener('visibilitychange', onFocus) }
  }, [])

  // Load real Supabase data whenever a student session exists
  useEffect(() => {
    const sess = getStudentSession()
    if (!sess) return
    loadStudentData()
    // Realtime: re-sync when teacher opens a lesson (lesson_progress changes for this student)
    const channel = supabase
      .channel('student-lesson-progress')
      .on('postgres_changes', {
        // '*' (not just UPDATE): opening a lesson for a not-yet-enrolled student
        // INSERTs a fresh lesson_progress row, so an UPDATE-only filter would
        // never re-sync the live student screen.
        event: '*',
        schema: 'public',
        table: 'lesson_progress',
        filter: `student_id=eq.${sess.id}`,
      }, () => loadStudentData())
      .subscribe(status => {
        // Surface realtime failures instead of silently never updating.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[realtime] lesson_progress subscription:', status)
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [loadStudentData])

  if (hash.startsWith('#/join-teacher')) return <JoinTeacherPage />
  if (hash.startsWith('#/join')) return <JoinPage />
  if (hash.startsWith('#/diagnostic')) return <DiagnosticTestPage />
  if (hash.startsWith('#/review')) {
    const q = new URLSearchParams(hash.split('?')[1] ?? '')
    const sid = getStudentSession()?.id
    const owner = sid ? { studentId: sid } : { anonName: q.get('name') ?? undefined }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <ReviewSession owner={owner} onDone={() => { window.location.hash = '#/' }} />
      </div>
    )
  }

  if (hash.startsWith('#/teacher')) {
    if (recovery) return <TeacherLoginPage onLogin={() => setRecovery(false)} recovery />
    if (session === undefined && !import.meta.env.DEV) return null
    // A student's Supabase session must not unlock the teacher cabinet.
    const isStudentAccount = session?.user?.user_metadata?.role === 'student'
    if ((!session || isStudentAccount) && !import.meta.env.DEV) return <TeacherLoginPage onLogin={() => {}} />
    return <TeacherDashboardPage />
  }

  // Student routes
  const studentSession = getStudentSession()
  if (!studentSession) return <StudentLoginPage />
  return <DashboardPage />
}
