import { supabase } from './supabase'

// Права ИИ-помощников (MCP) и журнал их вызовов. Хранятся в
// public.mcp_grant_scopes / mcp_call_log (миграция 20261126090000); менять
// права может только сам учитель в Искре — функция mcp_set_scopes отказывает
// токену ИИ-клиента. Проект: docs/analysis/iskra-mcp-v2-2026-11-25.md.

export type McpScope = 'courses:read' | 'students:read' | 'progress:read' | 'events:read' | 'attachments:read' | 'courses:write'

export const MCP_SCOPES: { id: McpScope; label: string; hint: string; byDefault: boolean }[] = [
  { id: 'courses:read', label: 'Курсы и уроки', hint: 'Ваши курсы и уроки, без ответов учеников', byDefault: true },
  { id: 'students:read', label: 'Ученики: имя и группа', hint: 'Без телефонов, почты, контактов родителей и оплат', byDefault: true },
  { id: 'progress:read', label: 'Прогресс и ответы', hint: 'Пройденные уроки, баллы, ответы по заданиям, сводки', byDefault: true },
  { id: 'events:read', label: 'Лента событий', hint: 'Кто прошёл урок, сдал работу или оставил комментарий', byDefault: true },
  { id: 'attachments:read', label: 'Фото к ответам', hint: 'Изображения из ответов и комментариев учеников', byDefault: false },
  { id: 'courses:write', label: 'Черновики курсов', hint: 'Создавать курсы, уроки и тесты как черновики', byDefault: false },
]

/** Права подключений, выданных до появления выбора прав (строки ещё нет). */
export const LEGACY_SCOPES: McpScope[] = ['courses:read', 'courses:write', 'students:read', 'progress:read']

export const MCP_TOOL_LABEL: Record<string, string> = {
  list_events: 'Лента событий', get_lesson_answers: 'Ответы урока', get_attachment: 'Фото к ответу',
  course_progress: 'Прогресс курса', list_my_groups: 'Мои группы', list_my_students: 'Мои ученики',
  student_summary: 'Сводка ученика', mistakes_by_topic: 'Ошибки по темам', test_results: 'Результаты тестов',
  list_my_courses: 'Мои курсы', create_course: 'Создание курса', add_course_lesson: 'Добавление урока',
  create_test_for_lesson: 'Добавление теста', attach_lesson_file: 'Файл к уроку',
}

export interface GrantScopesRow { client_id: string; scopes: McpScope[]; granted_at: string; updated_at: string; revoked_at: string | null }
export interface CallLogRow { id: number; client_id: string; tool: string; scope: string | null; status: string; result_count: number | null; created_at: string }

export async function loadMcpAccess(signal?: AbortSignal): Promise<{ scopes: Map<string, GrantScopesRow>; log: CallLogRow[] }> {
  let sq = supabase.from('mcp_grant_scopes').select('client_id, scopes, granted_at, updated_at, revoked_at')
  let lq = supabase.from('mcp_call_log').select('id, client_id, tool, scope, status, result_count, created_at')
    .order('id', { ascending: false }).limit(300)
  if (signal) { sq = sq.abortSignal(signal); lq = lq.abortSignal(signal) }
  const [s, l] = await Promise.all([sq, lq])
  if (s.error) throw s.error
  if (l.error) throw l.error
  return {
    scopes: new Map(((s.data ?? []) as GrantScopesRow[]).map(r => [r.client_id, r])),
    log: (l.data ?? []) as CallLogRow[],
  }
}

/** Действующие права подключения: отозвано → пусто; строки нет → прежние. */
export function effectiveScopes(row: GrantScopesRow | undefined): McpScope[] {
  if (!row) return LEGACY_SCOPES
  if (row.revoked_at) return []
  return row.scopes
}

export async function setMcpScopes(clientId: string, scopes: McpScope[]): Promise<McpScope[]> {
  const { data, error } = await supabase.rpc('mcp_set_scopes', { p_client_id: clientId, p_scopes: scopes })
  if (error) throw error
  return (data ?? []) as McpScope[]
}

export async function revokeMcpScopes(clientId: string): Promise<void> {
  const { error } = await supabase.rpc('mcp_revoke', { p_client_id: clientId })
  if (error) throw error
}
