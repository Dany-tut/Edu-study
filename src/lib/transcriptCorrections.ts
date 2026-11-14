import { termEditPairs } from './transcriptTerms'
import { supabase } from './supabase'

export type CorrectionKind = 'speech' | 'text-title' | 'slide-title'
export interface Correction {
  id: string; owner_id: string; subject: string; kind: CorrectionKind
  before_text: string; after_text: string; context_key: string
}
const key = (owner: string) => 'iskra.transcription.corrections.' + owner
const changed = 'iskra:transcript-corrections'
const running = new Map<string, Promise<void>>()
export function pendingCorrections(owner: string): Correction[] {
  const value = JSON.parse(localStorage.getItem(key(owner)) || '[]')
  if (!Array.isArray(value)) throw new Error('Не удалось прочитать очередь исправлений.')
  return value.filter((x: Correction) => x.owner_id === owner)
}
function write(owner: string, items: Correction[]) {
  localStorage.setItem(key(owner), JSON.stringify(items))
  window.dispatchEvent(new Event(changed))
}
export function rememberCorrection(owner: string, subject: string, kind: CorrectionKind, before: string, after: string, context: string) {
  if (before === after || !owner) return
  // Keep spelling, case, punctuation and long edits exactly as entered.
  const item: Correction = { id: crypto.randomUUID(), owner_id: owner, subject: subject || 'other', kind, before_text: before, after_text: after, context_key: context }
  write(owner, [...pendingCorrections(owner), item])
}
export function flushCorrections(owner: string): Promise<void> {
  const existing = running.get(owner)
  if (existing) return existing
  const task = (async () => {
    while (true) {
      const item = pendingCorrections(owner)[0]
      if (!item) break
      const { data, error } = await supabase.rpc('remember_transcript_correction', {
        p_id: item.id, p_owner: owner, p_subject: item.subject, p_kind: item.kind,
        p_before: item.before_text, p_after: item.after_text, p_context: item.context_key,
      })
      if (error || data !== item.id) throw new Error('Исправления сохранены в браузере, но ещё не подтверждены сервером.')
      // Re-read: newer edits can arrive while this request is in flight.
      write(owner, pendingCorrections(owner).filter(x => x.id !== item.id))
    }
  })().finally(() => { running.delete(owner) })
  running.set(owner, task)
  return task
}
export function observeCorrections(callback: () => void) {
  window.addEventListener(changed, callback)
  return () => window.removeEventListener(changed, callback)
}
export async function readCorrections(owner: string, subject: string): Promise<Correction[]> {
  const records: Correction[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('transcript_corrections')
      .select('id,owner_id,subject,kind,before_text,after_text,context_key')
      .eq('owner_id', owner).eq('subject', subject || 'other').neq('status', 'rejected')
      .order('created_at').order('id').range(offset, offset + 499)
    if (error) throw new Error('Не удалось загрузить сохранённые исправления. Повторите попытку.')
    records.push(...(data ?? []) as Correction[])
    if (!data || data.length < 500) break
  }
  return [...records, ...pendingCorrections(owner)]
}
/** Exact full-title/utterance memory. No fuzzy replacement of unrelated prose. */
export function correctedText(text: string, kind: CorrectionKind, memory: readonly Correction[]): string {
  let value = text
  const latest = new Map<string, Correction>()
  for (const item of memory) { const key = item.kind + ':' + item.before_text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru'); latest.delete(key); latest.set(key, item) }
  for (const item of latest.values()) {
    if (item.kind !== kind || !item.before_text.trim() || !item.after_text.trim()) continue
    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru')
    if (norm(value) === norm(item.before_text)) { value = item.after_text; continue }
    if (kind === 'speech') for (const pair of termEditPairs(item.before_text, item.after_text)) {
      const escaped = pair.heard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Match whole words, retaining the surrounding punctuation; no fuzzy OCR substitution.
      const rx = new RegExp('(^|[^\\p{L}\\p{N}_])(' + escaped + ')(?=$|[^\\p{L}\\p{N}_])', 'giu')
      value = value.replace(rx, (_all, prefix: string) => prefix + pair.written)
    }
  }
  return value
}
