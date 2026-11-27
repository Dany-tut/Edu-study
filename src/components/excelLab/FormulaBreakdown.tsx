// Живой разбор формулы (блок конспекта, Figma «Искра» стр. 28, раздел 2).
// Данные — те же, что у статичной схемы accFigures.formulaFig: части с
// подписями, шаги с промежуточными результатами; плюс необязательные refs и
// мини-таблица примера. Нажатие на часть — подпись и подсветка ячеек; шаги —
// как «Вычислить формулу» в Excel. Наведение ничего не прячет: всё по нажатию.

import { useMemo, useState } from 'react'
import { Workbook } from '../../lib/excelLab/formula'
import type { FormulaSpec } from '../../lib/excelLab/spec'
import MiniSheet, { markRefs, type CellMark } from './MiniSheet'
import { ArrowRight, Check } from '../icons/appIcons'
import './excelLab.css'

export default function FormulaBreakdown({ spec }: { spec: FormulaSpec }) {
  // Номер цвета у каждой подписанной части — по порядку, как номера на схеме.
  const parts = useMemo(() => {
    let n = 0
    return spec.parts.map(p => ({ ...p, n: p.label ? ++n : 0 }))
  }, [spec.parts])
  const labelled = parts.filter(p => p.n)
  const steps = spec.steps ?? []
  const sheets = useMemo(() => (spec.sample ? (Array.isArray(spec.sample) ? spec.sample : [spec.sample]) : []), [spec.sample])
  const wb = useMemo(() => (sheets.length ? new Workbook(sheets) : null), [sheets])

  const [sel, setSel] = useState<number | null>(null)
  const [step, setStep] = useState(-1)
  const [tab, setTab] = useState(0)
  const color = (n: number) => ((n - 1) % 6) + 1

  const marks = useMemo(() => {
    const m = new Map<string, CellMark>()
    if (!wb) return m
    if (sel !== null) {
      const p = labelled.find(x => x.n === sel)
      if (p?.refs) markRefs(wb, p.refs, color(p.n), m)
    } else if (step >= 0 && steps[step]?.[2]) {
      markRefs(wb, steps[step][2]!, 2, m)
    } else {
      // Ничего не выбрано — тихая подсветка всех ссылок формулы.
      for (const p of labelled) if (p.refs) markRefs(wb, p.refs, color(p.n), m)
      for (const [k, v] of m) m.set(k, { ...v, tint: true })
    }
    return m
  }, [wb, sel, step, labelled, steps])

  const selPart = sel !== null ? labelled.find(p => p.n === sel) : null
  const sheetName = wb ? wb.order[Math.min(tab, wb.order.length - 1)] : ''

  return (
    <div className="xl-root" data-kind="formula">
      <div className="xl-muted">Нажмите на часть формулы — появится подпись{wb ? ' и ячейки, на которые она ссылается' : ''}.</div>
      <div className="xl-fbar">
        <span className="xl-fx" aria-hidden>fx</span>
        <div className="xl-tokens" role="group" aria-label={spec.title}>
          {parts.map((p, i) => p.n ? (
            <button key={i} type="button" className={`xl-tok xl-c${color(p.n)}${sel === p.n ? ` xl-b${color(p.n)}` : ''}`}
              aria-pressed={sel === p.n} aria-label={`${p.text} — ${p.label}`}
              onClick={() => { setSel(sel === p.n ? null : p.n); setStep(-1) }}>
              {p.text}<sup aria-hidden>{p.n}</sup>
            </button>
          ) : (
            <span key={i} className="xl-tok" data-plain="">{p.text}</span>
          ))}
        </div>
      </div>

      {selPart ? (
        <div className={`xl-card xl-b${color(selPart.n)}`} aria-live="polite">
          <div className={`xl-title xl-c${color(selPart.n)}`}><span className="xl-mono">{selPart.text}</span></div>
          <div style={{ fontSize: 15, lineHeight: 1.45 }}>{selPart.label}</div>
        </div>
      ) : (
        <div className="xl-legend">
          {labelled.map(p => (
            <button key={p.n} type="button" aria-pressed={false} onClick={() => { setSel(p.n); setStep(-1) }}>
              <span className={`dot xl-b${color(p.n)}`} style={{ background: `var(--xl-f${color(p.n)})` }}>{p.n}</span>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="xl-cols">
        {steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div className="xl-title">Вычисление по шагам — как «Вычислить формулу» в Excel</div>
            <ol className="xl-steps">
              {steps.map(([expr, res], i) => {
                const state = step < 0 ? 'next' : i < step ? 'done' : i === step ? 'cur' : 'next'
                return (
                  <li key={i}>
                    <button type="button" className="xl-step" data-state={state} aria-current={state === 'cur' ? 'step' : undefined}
                      onClick={() => { setStep(i); setSel(null) }}>
                      <span className="num">{state === 'done' ? <Check size={12} aria-hidden /> : i + 1}</span>
                      <span className="expr">{expr}</span>
                      <ArrowRight size={14} aria-hidden style={{ flex: 'none', color: 'var(--color-muted)' }} />
                      <span className="res">{state === 'next' ? '?' : res}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="xl-nav">
              <button type="button" className="xl-btn" disabled={step < 0} onClick={() => setStep(s => s - 1)}>Шаг назад</button>
              <button type="button" className="xl-btn" data-primary="" onClick={() => { setSel(null); setStep(s => (s + 1 >= steps.length ? -1 : s + 1)) }}>
                {step < 0 ? 'Начать по шагам' : step + 1 >= steps.length ? 'Сначала' : 'Следующий шаг'}
              </button>
            </div>
          </div>
        )}
        {wb && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div className="xl-title">Пример</div>
            {wb.order.length > 1 && (
              <div className="xl-sheet-tabs" role="tablist">
                {wb.order.map((n, i) => <button key={n} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}>{n}</button>)}
              </div>
            )}
            <MiniSheet wb={wb} sheet={sheetName} marks={marks} headers={spec.headers} />
          </div>
        )}
      </div>
      {spec.note && <div className="xl-muted">{spec.note}</div>}
    </div>
  )
}
