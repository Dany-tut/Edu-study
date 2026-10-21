// ─────────────────────────────────────────────────────────────────────────────
// Журнал «Не смог сказать» — данные
//
// ЗАЧЕМ. Переход домашнего разговора на изучаемый язык срывается на конкретных
// репликах. Их записывают по-русски в момент срыва, потом находят английский
// (руками или подсказкой модели) и отправляют в «Мои слова» — дальше фраза
// живёт в колоде, как любое собранное слово. Таблица — phrase_gaps (миграция
// 0100), подсказка — Edge Function phrase-help.
//
// ТОЛЬКО ВОШЕДШИМ. У гостя журнала нет (см. шапку миграции): экран честно
// предлагает войти, а не пишет в никуда.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { t } from './i18n'
import { appFlag } from './cardGroups'
import { addCards } from '../data/reviewDeck'

export interface PhraseGap {
  id: string
  ru: string
  en?: string
  note?: string
  createdAt: string
  doneAt?: string
}

export interface PhraseVariant { term: string; note?: string }

const rowToGap = (r: Record<string, unknown>): PhraseGap => ({
  id: r.id as string,
  ru: r.ru as string,
  en: (r.en as string | null) ?? undefined,
  note: (r.note as string | null) ?? undefined,
  createdAt: r.created_at as string,
  doneAt: (r.done_at as string | null) ?? undefined,
})

export async function listGaps(studentId: string, lang: string): Promise<PhraseGap[]> {
  const { data, error } = await supabase
    .from('phrase_gaps')
    .select('id, ru, en, note, created_at, done_at')
    .eq('student_id', studentId)
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) { console.error('listGaps:', error); throw error }
  return (data ?? []).map(rowToGap)
}

export async function addGap(studentId: string, lang: string, ru: string): Promise<PhraseGap | null> {
  const { data, error } = await supabase
    .from('phrase_gaps')
    .insert({ student_id: studentId, lang, ru: ru.trim() })
    .select('id, ru, en, note, created_at, done_at')
    .single()
  if (error) { console.error('addGap:', error); return null }
  return rowToGap(data)
}

export async function saveGap(id: string, patch: { ru?: string; en?: string | null; note?: string | null }): Promise<boolean> {
  const { error } = await supabase.from('phrase_gaps').update(patch).eq('id', id)
  if (error) { console.error('saveGap:', error); return false }
  return true
}

export async function deleteGap(id: string): Promise<boolean> {
  const { error } = await supabase.from('phrase_gaps').delete().eq('id', id)
  if (error) { console.error('deleteGap:', error); return false }
  return true
}

/**
 * Фраза — в «Мои слова».
 *
 * Карточка ложится тем же путём, что слово из текста (source 'manual'), значит
 * попадает и в словарь, и в расписание повторения. Запись журнала после этого
 * не удаляется, а закрывается: done_at — видимый след того, что срыв разобран.
 * Пояснение остаётся в журнале: колонки под него в колоде нет.
 */
export async function gapToCards(
  gap: PhraseGap, owner: { studentId?: string }, subject: string,
): Promise<boolean> {
  const en = gap.en?.trim()
  if (!en || !owner.studentId) return false
  await addCards(owner, [{ subject, source: 'manual', prompt: en, answer: gap.ru.trim() }])
  // addCards возвращает ноль и тогда, когда фраза уже лежит в колоде, — для
  // журнала это тоже успех: срыв разобран, карточка есть.
  const { error } = await supabase.from('phrase_gaps')
    .update({ done_at: new Date().toISOString() }).eq('id', gap.id)
  if (error) { console.error('gapToCards:', error); return false }
  return true
}

/** Показывать ли «Как сказать?»: общий рубильник ИИ и свой. */
export async function phraseHelpEnabled(): Promise<boolean> {
  const [master, own] = await Promise.all([appFlag('ai_enabled'), appFlag('ai_phrase_help')])
  return master && own
}

export async function askPhrase(lang: string, ru: string): Promise<PhraseVariant[]> {
  const { data, error } = await supabase.functions.invoke('phrase-help', { body: { lang, ru } })
  if (error) {
    // Та же развилка, что в cardImport: context — Response, только если до
    // функции достучались.
    const context = (error as { context?: unknown }).context
    const said = context instanceof Response
      ? await context.clone().json().then(b => b?.error as string | undefined).catch(() => undefined)
      : undefined
    throw new Error(said || error.message || t('Подсказка не ответила'))
  }
  if (data?.error) throw new Error(data.error as string)
  return ((data?.variants ?? []) as PhraseVariant[])
    .map(v => ({ term: String(v.term ?? '').trim(), note: v.note?.trim() || undefined }))
    .filter(v => v.term)
}
