// Живой разбор формулы (блок конспекта, Figma «Искра» стр. 28, раздел 2).
// Данные — те же, что у статичной схемы accFigures.formulaFig: части с
// подписями, шаги с промежуточными результатами; плюс необязательные refs и
// мини-таблица примера. Нажатие на часть — подпись и подсветка ячеек; шаги —
// как «Вычислить формулу» в Excel. Наведение ничего не прячет: всё по нажатию.

import { useMemo, useState } from 'react'
import { Workbook, evaluate, formatValue, traceSteps, unsupportedIn, FormulaSyntaxError, type Val } from '../../lib/excelLab/formula'
import type { FormulaSpec } from '../../lib/excelLab/spec'
import MiniSheet, { markRefs, type CellMark } from './MiniSheet'
import { ArrowRight, Check, Lightbulb } from '../icons/appIcons'
import ExcelTrainer from './ExcelTrainer'
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
  const [ifOn, setIfOn] = useState(false)
  const [trainerOn, setTrainerOn] = useState(false)
  const formula = useMemo(() => spec.parts.map(p => p.text).join(''), [spec.parts])
  // «Что если…»: тот же пример с подменёнными значениями и пересчёт формулы.
  const whatIf = useMemo(() => {
    if (!ifOn || !spec.whatIf || !wb) return null
    const alt = wb.clone().set(spec.whatIf.edits)
    const supported = unsupportedIn(formula).length === 0
    let value: Val | undefined, steps: { expr: string; value: Val }[] = [], problem: string | undefined
    if (supported) {
      try {
        value = evaluate(formula, alt, alt.main, spec.whatIf.cell)
        steps = traceSteps(formula, alt, alt.main)
      } catch (e) { problem = e instanceof FormulaSyntaxError ? e.message : 'Формула не разбирается' }
    }
    return { alt, value, steps, problem, supported }
  }, [ifOn, spec.whatIf, wb, formula])
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
            <MiniSheet wb={whatIf ? whatIf.alt : wb} sheet={sheetName} marks={whatIf ? ifMarks(spec.whatIf!.edits, wb.main) : marks} headers={spec.headers} />
          </div>
        )}
      </div>
      {spec.whatIf && (
        <div className="xl-card" data-kind="what-if" style={{ border: '1px dashed var(--color-border)', background: 'transparent' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Lightbulb size={18} aria-hidden style={{ color: 'var(--color-accent)', flex: 'none', marginTop: 2 }} />
            <div style={{ flex: 1, fontSize: 14, lineHeight: 1.45 }}>{spec.whatIf.text}</div>
            <button type="button" className="xl-btn" onClick={() => setIfOn(v => !v)} aria-pressed={ifOn}>{ifOn ? 'Вернуть пример' : 'Проверить'}</button>
          </div>
          {whatIf && (
            <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {whatIf.supported && !whatIf.problem && (
                <>
                  {whatIf.steps.map((st, i) => (
                    <div key={i} className="xl-mono" style={{ fontSize: 13, color: 'var(--color-text-2)', overflowWrap: 'anywhere' }}>{st.expr} → <b>{formatValue(st.value) || 'пусто'}</b></div>
                  ))}
                  <div style={{ fontSize: 15 }}>Результат: <b>{formatValue(whatIf.value ?? null) || 'пусто'}</b></div>
                </>
              )}
              {whatIf.problem && <div className="xl-muted">{whatIf.problem}</div>}
              {spec.whatIf.expect && <div className="xl-muted" style={{ color: 'var(--color-text-2)' }}>{spec.whatIf.expect}</div>}
              {wb && <div className="xl-muted">В таблице примера подсвечены подменённые ячейки.</div>}
            </div>
          )}
        </div>
      )}
      {spec.trainer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><button type="button" className="xl-btn" data-primary={trainerOn ? undefined : ''} aria-expanded={trainerOn} onClick={() => setTrainerOn(v => !v)}>{trainerOn ? 'Скрыть тренажёр' : 'Открыть тренажёр'}</button></div>
          {trainerOn && <ExcelTrainer spec={spec.trainer} selfCheck />}
        </div>
      )}
      {spec.note && <div className="xl-muted">{spec.note}</div>}
    </div>
  )
}

/** Подменённые в «Что если» ячейки — рамкой акцента, с прежним значением не путаются. */
function ifMarks(edits: Record<string, unknown>, main: string): Map<string, CellMark> {
  const m = new Map<string, CellMark>()
  for (const k of Object.keys(edits)) {
    const bang = k.lastIndexOf('!')
    const key = (bang > 0 ? k.slice(0, bang) : main) + '!' + k.slice(bang + 1).replace(/\$/g, '').toUpperCase()
    m.set(key, { changed: true })
  }
  return m
}
