// Редактор задания «Тренажёр Excel»: данные тренажёра одним блоком JSON
// (формат — docs/courses/accounting/excel-lab.md) с проверкой и предпросмотром.
// Наборы курса пишутся в коде (data/accounting/excelLabSets.ts); здесь автор
// может вставить готовый набор или поправить числа.

import { useMemo, useState } from 'react'
import { checkFix, trainerGradable, type TrainerSpec } from '../../lib/excelLab/spec'
import { unsupportedIn } from '../../lib/excelLab/formula'
import ExcelTrainer from '../excelLab/ExcelTrainer'
import type { EditorAccent } from './ExtraTaskEditors'

function problems(spec: TrainerSpec): string[] {
  const out: string[] = []
  if (!spec.sheets?.length) out.push('Нет ни одного листа (sheets).')
  if (!spec.fix && !spec.goals?.length) out.push('Нужен режим «исправь формулу» (fix) или мини-задания (goals) — иначе нечего проверять.')
  for (const sh of spec.sheets ?? []) for (const b of sh.blocks ?? []) for (const v of b.rows.flat()) {
    if (typeof v === 'string' && v.startsWith('=')) { const u = unsupportedIn(v); if (u.length) out.push(`В формуле ${v} функции нет в тренажёре: ${u.join(', ')}.`) }
  }
  if (spec.fix) {
    if (!checkFix(spec, spec.fix.answer).correct) out.push('Эталон fix.answer не проходит собственную проверку.')
    const br = checkFix(spec, spec.fix.broken)
    if (br.correct) out.push('Ошибочная формула fix.broken проходит проверку — она не ошибочная на этих данных.')
    else if (!br.runs.some(r => r.dataset === 0 && !r.ok)) out.push('Ошибка fix.broken не видна на показанных данных — ученику нечего исправлять.')
    if ((spec.fix.datasets?.length ?? 0) < 2) out.push('Добавьте 2–3 скрытых набора данных (fix.datasets).')
  }
  return out
}

export default function ExcelTrainerEditor({ value, onChange, accent }: { value?: TrainerSpec; onChange: (v: TrainerSpec | undefined) => void; accent: EditorAccent }) {
  const [text, setText] = useState(() => (value ? JSON.stringify(value, null, 2) : ''))
  const parsed = useMemo(() => {
    if (!text.trim()) return { spec: undefined, error: null as string | null }
    try { return { spec: JSON.parse(text) as TrainerSpec, error: null } } catch (e) { return { spec: undefined, error: (e as Error).message } }
  }, [text])
  const issues = parsed.spec ? problems(parsed.spec) : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: accent.color }}>Данные тренажёра (JSON)</label>
      <textarea
        value={text}
        spellCheck={false}
        rows={10}
        onChange={e => {
          setText(e.target.value)
          try { const s = JSON.parse(e.target.value) as TrainerSpec; onChange(trainerGradable(s) ? s : undefined) } catch { /* ждём, пока JSON станет целым */ }
        }}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, padding: 10, borderRadius: 10, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', color: 'var(--color-text)' }}
      />
      {parsed.error && <div style={{ fontSize: 13, color: 'var(--color-red-text)' }}>JSON не разбирается: {parsed.error}</div>}
      {issues.map((m, i) => <div key={i} style={{ fontSize: 13, color: 'var(--color-amber-text)' }}>{m}</div>)}
      {parsed.spec && trainerGradable(parsed.spec) && (
        <div style={{ border: '1px dashed var(--color-border)', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 8 }}>Так увидит ученик</div>
          <ExcelTrainer key={text} spec={parsed.spec} selfCheck />
        </div>
      )}
    </div>
  )
}
