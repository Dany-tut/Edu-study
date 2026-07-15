import { supabase } from './supabase'
import { getStudentSession } from './studentSession'

// Обратная связь: ученик/учитель шлёт заявку об ошибке → таблица feedback_requests
// → вкладка «Заявки» в Админке. См. миграцию 0031_feedback_requests.sql.

export type FeedbackRole = 'teacher' | 'student' | 'lead'
export type FeedbackStatus = 'new' | 'in_progress' | 'done'

// Предустановленные разделы + «Свой вариант» для ручного ввода в форме.
export const FEEDBACK_SECTIONS = [
  'Главная',
  'Группы',
  'Домашние задания',
  'Журнал',
  'Курсы',
  'Тренажёр',
  'Конструктор',
  'Финансы',
  'Тариф',
  'Профиль',
  'Другое',
] as const

export type FeedbackRequest = {
  id: string
  author_role: FeedbackRole
  author_id: string | null
  author_name: string | null
  contact: string | null
  section: string | null
  message: string
  attachments: string[]
  status: FeedbackStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

// Определяем автора: учитель — из Supabase auth, ученик — из localStorage-сессии.
async function resolveAuthor(role: FeedbackRole): Promise<{ id: string | null; name: string | null }> {
  if (role === 'teacher') {
    const { data } = await supabase.auth.getUser()
    const u = data.user
    const name = (u?.user_metadata?.name as string | undefined)?.trim() || u?.email || null
    return { id: u?.id ?? null, name }
  }
  const s = getStudentSession()
  return { id: s?.id ?? null, name: s?.name?.trim() || null }
}

export async function submitFeedback(input: {
  role: FeedbackRole
  section: string
  message: string
  attachments: string[]
}): Promise<{ error: string | null }> {
  const author = await resolveAuthor(input.role)
  const { error } = await supabase.from('feedback_requests').insert({
    author_role: input.role,
    author_id: author.id,
    author_name: author.name,
    section: input.section.trim() || null,
    message: input.message.trim(),
    attachments: input.attachments,
  })
  return { error: error ? error.message : null }
}
