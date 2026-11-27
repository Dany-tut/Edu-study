// Версия Excel ученика и выбор способа решения «ваш вариант».
//
// Версия — свойство компьютера ученика, а не курса: одна на ученика. Хранится
// в students.preferences.excel через отдельную функцию save_student_excel
// (миграция 20261127150000): общая save_student_preferences принимает только
// свой список ключей и отвергла бы весь пакет настроек с новым ключом.
// Пока функции нет в базе (миграция не применена) — версия живёт в этом
// браузере, ошибка сохранения не теряет выбор и не трогает другие настройки.

import { useSyncExternalStore } from 'react'
import { availableIn, type ExcelVersion } from '../../data/accounting/excelCompat'
import type { MethodId, MethodSpec, MethodsSpec } from './spec'

export type ExcelChoice = ExcelVersion | 'unknown'
export interface ExcelPrefs { version: ExcelChoice | null; macros: boolean | null; updatedAt?: string }

export const EXCEL_CHOICES: { id: ExcelChoice; label: string }[] = [
  { id: '2007', label: '2007' }, { id: '2010', label: '2010' }, { id: '2013', label: '2013' },
  { id: '2016', label: '2016' }, { id: '2019', label: '2019' }, { id: '2021', label: '2021' },
  { id: '2024', label: '2024' }, { id: '365', label: 'Microsoft 365' }, { id: 'mac', label: 'Excel для Mac' },
]
export const versionLabel = (v: ExcelChoice | null) => v === 'unknown' ? 'Excel не уточнён' : v ? `Excel ${EXCEL_CHOICES.find(c => c.id === v)?.label ?? v}`.replace('Excel Excel', 'Excel') : 'Excel не выбран'

const KEY = 'iskra.excel'
let state: ExcelPrefs = read()
const subs = new Set<() => void>()

function read(): ExcelPrefs {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (v && typeof v === 'object') return { version: v.version ?? null, macros: v.macros ?? null, updatedAt: v.updatedAt } } catch { /* приватное окно */ }
  return { version: null, macros: null }
}
function publish(next: ExcelPrefs) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* без хранилища — только в памяти */ }
  subs.forEach(f => f())
}

export function useExcelPrefs(): ExcelPrefs {
  return useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => state, () => state)
}

let loaded = false
/** Подтянуть версию из профиля ученика (один раз за сессию). Новее — та, что сохранена позже. */
export async function loadExcelPrefs(): Promise<void> {
  if (loaded) return
  loaded = true
  try {
    const [{ supabase }, { getStudentSession }] = await Promise.all([import('../supabase'), import('../studentSession')])
    const s = getStudentSession()
    if (!s?.id) return
    const { data } = await supabase.from('students').select('preferences').eq('id', s.id).single()
    const remote = (data as { preferences?: { excel?: ExcelPrefs } } | null)?.preferences?.excel
    if (remote?.version && (!state.updatedAt || (remote.updatedAt ?? '') > state.updatedAt)) publish({ version: remote.version, macros: remote.macros ?? null, updatedAt: remote.updatedAt })
  } catch { /* офлайн или нет сессии ученика — остаётся локальная версия */ }
}

/** Сохранить выбор: сразу локально, потом в профиль. Ошибка базы выбор не откатывает. */
export async function saveExcelPrefs(patch: Partial<ExcelPrefs>): Promise<'saved' | 'local'> {
  const next = { ...state, ...patch, updatedAt: new Date().toISOString() }
  publish(next)
  try {
    const [{ supabase }, { getStudentSession }] = await Promise.all([import('../supabase'), import('../studentSession')])
    const s = getStudentSession()
    if (!s?.id) return 'local'
    const { error } = await supabase.rpc('save_student_excel', { p_student: s.id, p_excel: next })
    return error ? 'local' : 'saved'
  } catch { return 'local' }
}

// ─── Доступность способа и «ваш вариант» ─────────────────────────────────────

export type MethodStatus = 'ok' | 'check' | 'addin' | 'permission' | 'no'
export const STATUS_TEXT: Record<MethodStatus, string> = {
  ok: 'доступно', check: 'проверьте в своей версии', addin: 'надстройка', permission: 'нужно разрешение', no: 'нет в вашей версии',
}

function featureStatus(id: string, v: ExcelChoice | null): MethodStatus {
  if (!v || v === 'unknown') {
    // Версия не названа: по скриншоту учащейся — 2016 или новее. Что есть в
    // 2016 — доступно; что появилось позже — «проверьте в своей версии».
    const a16 = availableIn(id, '2016')
    if (a16 === 'yes') return 'ok'
    const a365 = availableIn(id, '365')
    return a365 === 'yes' || a365 === 'partial' ? 'check' : 'no'
  }
  const a = availableIn(id, v)
  return a === 'yes' ? 'ok' : a === 'addin' ? 'addin' : a === 'partial' || a === 'unknown' ? 'check' : 'no'
}

/** Хуже всех требований способа; VBA — ещё и разрешение макросов. */
export function methodStatus(m: MethodSpec, prefs: ExcelPrefs): MethodStatus {
  const order: MethodStatus[] = ['ok', 'check', 'addin', 'permission', 'no']
  let worst: MethodStatus = 'ok'
  const req = [...(m.requires ?? [])]
  if (m.id === 'vba' && !req.includes('vba')) req.push('vba')
  if (m.id === 'powerQuery' && !req.includes('power-query')) req.push('power-query')
  for (const f of req) { const s = featureStatus(f, prefs.version); if (order.indexOf(s) > order.indexOf(worst)) worst = s }
  if (m.id === 'vba' && worst !== 'no' && prefs.macros !== true) worst = 'permission'
  return worst
}

/** «Ваш вариант»: автоматизация — Power Query при 2016+ или «не знаю»; разовый расчёт — формулы версии. */
export function pickMethod(spec: MethodsSpec, prefs: ExcelPrefs): MethodId | null {
  const has = (id: MethodId) => spec.methods.find(m => m.id === id)
  const st = (id: MethodId) => { const m = has(id); return m ? methodStatus(m, prefs) : 'no' }
  if (spec.task === 'automation') {
    const v = prefs.version
    const modernVersion = !v || v === 'unknown' || ['2016', '2019', '2021', '2024', '365'].includes(v)
    if (has('powerQuery') && modernVersion && st('powerQuery') === 'ok') return 'powerQuery'
  }
  if (has('modern') && st('modern') === 'ok') return 'modern'
  if (has('formulas') && st('formulas') !== 'no') return 'formulas'
  if (has('simple')) return 'simple'
  return spec.methods[0]?.id ?? null
}

export const METHOD_TITLES: Record<MethodId, string> = {
  simple: 'Простой', formulas: 'Формулы', powerQuery: 'Power Query', vba: 'VBA', modern: 'Современный',
}
