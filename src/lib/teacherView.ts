import { personalDemoResponse } from './personalStudentDemo'

export const TEACHER_VIEW_KEY = 'iskra:viewAsTeacher'
export const TEACHER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export interface ViewAsTeacher { id: string; name: string }

export function getViewAs(): ViewAsTeacher | null {
  try {
    const raw = sessionStorage.getItem(TEACHER_VIEW_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as ViewAsTeacher
    return TEACHER_ID.test(value?.id) && typeof value.name === 'string' ? value : null
  } catch { return null }
}

const READ_RPCS = new Set([
  'admin_activity_heatmap_by_role', 'admin_analytics_overview_by_role', 'admin_analytics_reports',
  'admin_click_heatmap', 'admin_click_paths', 'admin_content_list', 'admin_daily_activity',
  'admin_event_breakdown', 'admin_group_options', 'admin_page_stats', 'admin_pending_teacher_invites',
  'admin_progress_funnel', 'admin_rage_hotspots', 'admin_recent_errors', 'admin_students_list',
  'admin_tasks_list', 'admin_teacher_content', 'admin_teacher_list', 'admin_teacher_plans',
  'admin_teacher_usage', 'admin_user_activity', 'is_staff', 'my_plan', 'person_student_rows',
  'storage_stats', 'student_lesson_participation', 'student_schedule_attendance', 'student_track',
  'subject_colors_for_student', 'teacher_finance_summary', 'teacher_journal_snapshot_v1',
])

/** Prevent accidental changes while viewing. Authorization still belongs to
 * the real admin's Auth session and server RLS; no teacher session is issued. */
export function teacherViewRequestAllowed(path: string, method: string, body?: unknown): boolean {
  if (path.startsWith('/auth/v1/')) {
    return (method === 'GET' && path === '/auth/v1/user')
      || (method === 'POST' && (path === '/auth/v1/token' || path === '/auth/v1/logout'))
  }
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true
  if (method !== 'POST') return false
  if (path === '/rest/v1/analytics_events') return true // audit the real administrator
  if (path.startsWith('/rest/v1/rpc/')) return READ_RPCS.has(path.slice('/rest/v1/rpc/'.length))
  if (path.startsWith('/storage/v1/object/sign/')) return true // signed downloads, including bulk signing
  if (path === '/functions/v1/testly-bridge') {
    const action = (body as { action?: unknown } | undefined)?.action
    return action === 'module' || action === 'tests' || action === 'results'
  }
  return false
}

export const teacherViewFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
  const preview = await personalDemoResponse(request)
  if (preview) return preview
  if (!getViewAs()) return fetch(request)
  const path = new URL(request.url).pathname
  const body = path === '/functions/v1/testly-bridge'
    ? await request.clone().json().catch(() => undefined) : undefined
  if (!teacherViewRequestAllowed(path, request.method, body)) {
    return Response.json({ code: 'VIEW_ONLY', message: 'В режиме просмотра нельзя изменять данные преподавателя.' }, { status: 403 })
  }
  return fetch(request)
}
