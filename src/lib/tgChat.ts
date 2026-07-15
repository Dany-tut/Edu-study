import { supabase } from './supabase'

// Диалоги с Telegram-ботом в Админке. Входящие пишет Edge Function tg-webhook,
// ответы админа — tg-reply. Клиент только читает (RLS: только админ) и шлёт ответы
// через функцию. См. миграцию 0044_tg_dialogs.sql.

export type TgStatus = 'new' | 'in_progress' | 'done'

export interface TgThread {
  id: string
  chat_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  status: TgStatus
  last_message_text: string | null
  last_message_at: string | null
  last_in_at: string | null
  admin_seen_at: string | null
  created_at: string
}

export interface TgMessage {
  id: string
  thread_id: string
  direction: 'in' | 'out'
  text: string
  tg_message_id: number | null
  created_at: string
}

export function threadName(t: TgThread): string {
  const full = [t.first_name, t.last_name].filter(Boolean).join(' ').trim()
  if (full) return full
  if (t.username) return `@${t.username}`
  return `#${t.chat_id}`
}

/** Непрочитано, если последнее входящее новее момента, когда админ открывал тред. */
export function isUnread(t: TgThread): boolean {
  if (!t.last_in_at) return false
  if (!t.admin_seen_at) return true
  return new Date(t.last_in_at).getTime() > new Date(t.admin_seen_at).getTime()
}

export async function fetchThreads(): Promise<TgThread[]> {
  const { data, error } = await supabase
    .from('tg_threads').select('*').order('last_message_at', { ascending: false, nullsFirst: false })
  if (error) { console.error('fetchThreads:', error); return [] }
  return (data ?? []) as TgThread[]
}

export async function fetchMessages(threadId: string): Promise<TgMessage[]> {
  const { data, error } = await supabase
    .from('tg_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true })
  if (error) { console.error('fetchMessages:', error); return [] }
  return (data ?? []) as TgMessage[]
}

export async function sendReply(threadId: string, text: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('tg-reply', { body: { thread_id: threadId, text } })
  if (error) return { error: error.message }
  if (data && (data as { ok?: boolean }).ok === false) return { error: 'Telegram отклонил сообщение' }
  return { error: null }
}

export async function setThreadStatus(threadId: string, status: TgStatus): Promise<void> {
  await supabase.from('tg_threads').update({ status }).eq('id', threadId)
}

export async function markThreadSeen(threadId: string): Promise<void> {
  await supabase.from('tg_threads').update({ admin_seen_at: new Date().toISOString() }).eq('id', threadId)
}
