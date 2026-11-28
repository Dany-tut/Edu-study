// ─────────────────────────────────────────────────────────────────────────────
// Ответы тренажёра банка ФИПИ на сервере (таблица trainer_answers)
//
// localStorage остаётся быстрым кэшем и работает без сети и без входа (гость).
// Вошедший ученик дополнительно пишет каждое изменённое задание на сервер:
//   • очередь id заданий лежит в localStorage (OUTBOX) — переживает F5,
//     закрытие вкладки и выгрузку приложения из памяти;
//   • запись — upsert по (user_id, task_id), повтор безопасен (docs/saving.md, SAVE-04);
//   • сбой — задание остаётся в очереди; досылаем при возврате сети и вкладки.
// При входе подтягиваем серверные ответы и склеиваем с локальными по заданию
// (mergeFipiState): так прогресс с телефона виден на ПК и наоборот, а локальный
// прогресс, накопленный до этой версии, сам уезжает на сервер.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import type { FipiState } from '../components/trainer/FipiTask'

const OUTBOX = 'trainer_answers_outbox_v1'
/** Чей прогресс лежит в локальном кэше (последний вошедший на устройстве). */
const SEEDED = 'trainer_answers_seeded_v1'

function readOutbox(): Set<number> {
  try { return new Set((JSON.parse(localStorage.getItem(OUTBOX) || '[]') as number[]).filter(Number.isFinite)) } catch { return new Set() }
}
function writeOutbox(s: Set<number>) {
  try { localStorage.setItem(OUTBOX, JSON.stringify([...s])) } catch { /* приватный режим */ }
}

const rank = (s: FipiState) => [s.attempts ?? (s.correct !== null ? 1 : 0), s.at ?? 0, s.date ?? ''] as const
function newer(a: FipiState, b: FipiState): boolean {
  const ra = rank(a), rb = rank(b)
  if (ra[0] !== rb[0]) return ra[0] > rb[0]
  if (ra[1] !== rb[1]) return ra[1] > rb[1]
  return ra[2] > rb[2]
}

/** Склейка двух записей одного задания (два устройства). */
export function mergeFipiState(a: FipiState | undefined, b: FipiState | undefined): FipiState | undefined {
  if (!a) return b
  if (!b) return a
  const cur = newer(a, b) ? a : b
  // Первая попытка — самая ранняя из известных; открытое решение не снимается.
  const firsts = [a.first, b.first].filter(Boolean) as NonNullable<FipiState['first']>[]
  const first = firsts.sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''))[0]
  const out: FipiState = { ...cur }
  if (first) out.first = first
  if (a.revealed || b.revealed) out.revealed = true
  const att = Math.max(a.attempts ?? 0, b.attempts ?? 0)
  if (att) out.attempts = att
  return out
}

const same = (a: FipiState | undefined, b: FipiState | undefined) => JSON.stringify(a) === JSON.stringify(b)

async function userId(): Promise<string | null> {
  try { return (await supabase.auth.getSession()).data.session?.user.id ?? null } catch { return null }
}

/** Все серверные ответы ученика (страницами по 1000). null — нет входа или ошибка. */
export async function loadServerAnswers(): Promise<{ uid: string; rows: Map<number, FipiState> } | null> {
  const uid = await userId()
  if (!uid) return null
  const rows = new Map<number, FipiState>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('trainer_answers')
      .select('task_id, state').eq('user_id', uid).order('task_id').range(from, from + 999)
    if (error) return null
    for (const r of data ?? []) rows.set(Number(r.task_id), r.state as FipiState)
    if (!data || data.length < 1000) break
  }
  return { uid, rows }
}

/**
 * Склеить локальные и серверные ответы. Возвращает новую карту для экрана и
 * ставит в очередь задания, где локальная запись новее серверной (или её нет
 * на сервере). Первый вход пользователя на этом устройстве заливает весь
 * локальный прогресс.
 */
export function mergeWithServer(local: Map<number, FipiState>, server: Map<number, FipiState>, uid: string): Map<number, FipiState> {
  const out = new Map(server)
  let owner: string | null = null
  try { owner = localStorage.getItem(SEEDED) } catch { /* */ }
  try { localStorage.setItem(SEEDED, uid) } catch { /* */ }
  // Локальный кэш другого аккаунта (на устройстве сменили вход) чужому не
  // заливаем: экран показывает серверные ответы этого ученика.
  if (owner && owner !== uid) { writeOutbox(new Set()); return out }
  const outbox = readOutbox()
  for (const [id, s] of local) {
    const srv = server.get(id)
    const m = mergeFipiState(s, srv)!
    out.set(id, m)
    if (!same(m, srv)) outbox.add(id)
  }
  writeOutbox(outbox)
  return out
}

/** Поставить задание в очередь на запись. */
export function queueAnswer(id: number) {
  const o = readOutbox(); o.add(id); writeOutbox(o)
}

let flushing: Promise<void> | null = null

/** Дослать очередь. get — текущее состояние экрана по id. */
export function flushAnswers(get: (id: number) => FipiState | undefined): Promise<void> {
  if (flushing) return flushing.then(() => flushAnswers(get))
  flushing = (async () => {
    const ids = [...readOutbox()]
    if (!ids.length) return
    if (!(await userId())) return
    const sent = new Map<number, FipiState>()
    const rows = ids.flatMap(id => { const s = get(id); if (!s) return []; sent.set(id, s); return [{ task_id: id, state: s }] })
    const dropped = ids.filter(id => !sent.has(id))
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200)
      const { data, error } = await supabase.from('trainer_answers')
        .upsert(chunk, { onConflict: 'user_id,task_id' }).select('task_id')
      if (error) break
      // Снимаем из очереди только подтверждённое базой (SAVE-01) и не
      // изменившееся, пока запрос летел.
      const ok = new Set((data ?? []).map(r => Number(r.task_id)))
      const o = readOutbox()
      for (const r of chunk) if (ok.has(r.task_id) && same(get(r.task_id), sent.get(r.task_id))) o.delete(r.task_id)
      writeOutbox(o)
    }
    if (dropped.length) { const o = readOutbox(); dropped.forEach(id => o.delete(id)); writeOutbox(o) }
  })().finally(() => { flushing = null })
  return flushing
}
