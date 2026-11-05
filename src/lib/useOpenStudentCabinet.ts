import { useEffect, useState } from 'react'
import { linkedStudentProfile } from './authActions'
import { supabase } from './supabase'
import { getStudentSession, setStudentSession } from './studentSession'
import { useAsyncTask } from './useAsyncTask'
import { rememberCabinet } from './cabinetChoice'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'

export function useOpenStudentCabinet(visible = true) {
  const { busy, run, cancel } = useAsyncTask()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!visible) { cancel(); setFailed(false) }
  }, [visible, cancel])

  function open() {
    const source = window.location.hash
    setFailed(false)
    void run(async signal => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!session) return null
      const row = await linkedStudentProfile(supabase, session.user.id, signal)
      if (row) await import('../pages/DashboardPage')
      const { data: current } = await supabase.auth.getSession()
      if (current.session?.user.id !== session.user.id) throw new Error('Session changed')
      return row
    }, row => {
      if (window.location.hash !== source) return
      if (!row) {
        window.location.hash = '#/login?switch=student'
        return
      }
      if (getStudentSession()?.id !== row.id) {
        useStudentData.setState(useStudentData.getInitialState())
      }
      setStudentSession({ id: row.id, name: row.name, groupId: row.group_id ?? '' })
      rememberCabinet('student')
      useDashboard.getState().setActivePage('home')
      window.location.hash = '#/'
    }, () => setFailed(true))
  }

  return { open, busy, failed }
}
