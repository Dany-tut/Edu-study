import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { LessonAttendance } from './teacherLessonSession'

// Sessions are teacher-only. Student calendars use the narrow attendance RPC.
export function useEventAttendance(scheduleId?: string) {
  const [state, setState] = useState<{ id?: string; marks: LessonAttendance; loading: boolean; error: boolean }>({ marks: {}, loading: true, error: false })
  useEffect(() => {
    let active = true
    if (!scheduleId || scheduleId.startsWith('demo')) {
      setState({ id: scheduleId, marks: {}, loading: false, error: false })
      return
    }
    setState({ id: scheduleId, marks: {}, loading: true, error: false })
    void supabase.from('teacher_lesson_sessions').select('attendance').eq('schedule_id', scheduleId).maybeSingle()
      .then(({ data, error }) => {
        if (active) setState({ id: scheduleId, marks: data?.attendance ?? {}, loading: false, error: !!error })
      })
    return () => { active = false }
  }, [scheduleId])
  return state.id === scheduleId ? state : { marks: {}, loading: true, error: false }
}
