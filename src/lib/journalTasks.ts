import { useTeacher, type TeacherTask } from '../store/teacherStore'

export interface JournalTaskContext { courseId: string; columnId: string; studentId: string }
const PREFIX = 'journal-followup:'
export const JOURNAL_CONTEXT_KEY = 'iskra:journal-context'
export const journalTaskType = (context: JournalTaskContext) => PREFIX + JSON.stringify(context)
export function journalTaskContext(typeId: string | null): JournalTaskContext | null {
  if (!typeId?.startsWith(PREFIX)) return null
  try {
    const value = JSON.parse(typeId.slice(PREFIX.length))
    return typeof value.courseId === 'string' && typeof value.columnId === 'string' && typeof value.studentId === 'string' ? value : null
  } catch { return null }
}
export function openJournalTask(task: TeacherTask): boolean {
  const context = journalTaskContext(task.typeId)
  if (!context) return false
  try { sessionStorage.setItem(JOURNAL_CONTEXT_KEY, JSON.stringify(context)) } catch { /* Navigation still opens the journal. */ }
  useTeacher.getState().openGradebook()
  return true
}
export function readJournalContext(): JournalTaskContext | null {
  try {
    const raw = sessionStorage.getItem(JOURNAL_CONTEXT_KEY)
    return raw ? journalTaskContext(PREFIX + raw) : null
  } catch { return null }
}
