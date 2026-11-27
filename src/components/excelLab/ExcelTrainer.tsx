// Тренажёр функции (Figma «Искра» стр. 28, раздел 3): маленькая таблица,
// ученик меняет значения — результат пересчитывается на глазах; режим
// «Исправьте формулу» проверяется по результату на скрытых наборах данных.
// Считает учебный вычислитель lib/excelLab/formula — честно: «не Excel».
//
// В задании (excelTrainer) ответ — строка JSON {cells, formula, hints}, оценку
// ставит поток ДЗ/теста; в конспекте (selfCheck) кнопка «Проверить» своя.

import { useMemo, useState, type ReactNode } from 'react'
import { display, isErr, parse, tokenize, unsupportedIn, FormulaSyntaxError, type Val, type XlValue } from '../../lib/excelLab/formula'
import { checkFix, editableSet, fixTargets, goalsMet, parseTrainerAnswer, placeFormula, trainerBook, type TrainerAnswer, type TrainerSpec } from '../../lib/excelLab/spec'
import MiniSheet, { cellKey, markRefs, type CellMark } from './MiniSheet'
import { Check, Info, Lightbulb } from '../icons/appIcons'
import './excelLab.css'

/** Формула цветом: функции по порядку, ссылки, константы. */
export function ColoredFormula({ formula, size }: { formula: string; size?: number }) {
  let toks: ReturnType<typeof tokenize>
  try { toks = tokenize(formula) } catch { return <span className="xl-mono">{formula}</span> }
  const out: ReactNode[] = []
  const stack: number[] = []
  let fnN = 0, last = 0
  const src = formula
  toks.forEach((t, i) => {
    if (t.s > last) out.push(src.slice(last, t.s))
    let c = 0
    if (t.k === 'fn') { c = (fnN++ % 3) + 1; stack.push(c) }
    else if (t.k === 'rp') c = stack.pop() ?? 0
    else if (t.k === 'sep') c = stack[stack.length - 1] ?? 0
    else if (t.k === 'ref') c = 4
    else if (t.k === 'str' || t.k === 'num' || t.k === 'bool') c = 5
    out.push(<span key={i} className={c ? `xl-c${c}` : undefined} style={c ? { fontWeight: t.k === 'fn' || t.k === 'rp' ? 700 : 600 } : { color: 'var(--color-muted)' }}>{t.text}</span>)
    last = t.e
  })
  if (last < src.length) out.push(src.slice(last))
  return <span className="xl-mono" style={{ fontSize: size, overflowWrap: 'anywhere' }}>{src.startsWith('=') ? <span style={{ color: 'var(--color-muted)' }}>=</span> : null}{out.map((x, i) => typeof x === 'string' && i === 0 && src.startsWith('=') ? x.slice(1) : x)}</span>
}

const shortRef = (ref: string, main: string) => ref.startsWith(main + '!') ? ref.slice(main.length + 1) : ref

export default function ExcelTrainer({ spec, value, onChange, disabled, selfCheck }: {
  spec: TrainerSpec
  value?: string
  onChange?: (v: string) => void
  /** Ответ сдан: правки закрыты, показан разбор. */
  disabled?: boolean
  /** Конспект: своя кнопка «Проверить», ответ никуда не сдаётся. */
  selfCheck?: boolean
}) {
  const main = spec.sheets[0].name
  const fix = spec.fix
  const initial = useMemo(() => parseTrainerAnswer(value), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [cells, setCells] = useState<Record<string, XlValue>>(initial.cells ?? {})
  const [formula, setFormula] = useState<string>(initial.formula ?? fix?.broken ?? '')
  const [hints, setHints] = useState(initial.hints ?? 0)
  const [mode, setMode] = useState<'values' | 'fix'>(fix && !selfCheck ? 'fix' : 'values')
  const [tab, setTab] = useState(0)
  const [checked, setChecked] = useState(false)

  const emit = (a: TrainerAnswer) => onChange?.(JSON.stringify(a))
  const editKeys = useMemo(() => editableSet(spec), [spec])
  const base = useMemo(() => trainerBook(spec), [spec])
  const patch = useMemo(() => {
    const p: Record<string, XlValue> = {}
    for (const [k, v] of Object.entries(cells)) p[k] = v
    return p
  }, [cells])

  const syntax = useMemo(() => {
    if (mode !== 'fix' || !formula.trim()) return null
    try { parse(formula.trim().startsWith('=') ? formula.trim() : '=' + formula.trim()); return null } catch (e) { return e instanceof FormulaSyntaxError ? e.message : 'Формула не разбирается' }
  }, [formula, mode])
  const unsupported = useMemo(() => (mode === 'fix' ? unsupportedIn(formula) : []), [formula, mode])

  const book = useMemo(() => {
    const wb = trainerBook(spec, patch)
    if (mode === 'fix' && fix) {
      // Пока формула не разбирается, в ячейках «?», а не эталон из данных:
      // иначе таблица показала бы верный результат и подсказала ответ.
      if (!syntax && formula.trim()) placeFormula(wb, fix, formula.trim().startsWith('=') ? formula.trim() : '=' + formula.trim())
      else wb.set(Object.fromEntries(fixTargets(fix).map(t => [t, '?'])))
    }
    return wb
  }, [spec, patch, mode, fix, formula, syntax])

  const marks = useMemo(() => {
    const m = new Map<string, CellMark>()
    for (const [k, v] of Object.entries(cells)) {
      const key = k.includes('!') ? k : cellKey(main, k)
      const [sh, a] = key.split('!')
      const was = base.raw(sh, a)
      if (String(was ?? '') !== String(v ?? '')) m.set(key, { changed: true, note: `было ${was === null ? 'пусто' : display(was)}` })
    }
    if (mode === 'fix' && fix) markRefs(book, fixTargets(fix), 2, m)
    else for (const w of spec.watch ?? []) markRefs(book, [w], 2, m)
    return m
  }, [cells, base, book, mode, fix, spec.watch, main])

  const met = useMemo(() => goalsMet(spec, patch), [spec, patch])
  const result = useMemo(() => (fix && (checked || disabled) && formula.trim() ? checkFix(spec, formula) : null), [fix, checked, disabled, formula, spec])

  function edit(key: string, v: XlValue) {
    const [sh, a] = key.split('!')
    const k = sh === main ? a : key
    const next = { ...cells, [k]: v }
    setCells(next); setChecked(false)
    emit({ cells: next, formula: fix ? formula : undefined, hints })
  }
  function setF(f: string) { setFormula(f); setChecked(false); emit({ cells, formula: f, hints }) }

  const sheetName = book.order[Math.min(tab, book.order.length - 1)]
  const showFormulaOf = mode === 'fix' && fix ? fix.cell : spec.watch?.[0]
  const rawShown = showFormulaOf ? String(book.raw(...(splitKey(showFormulaOf, main))) ?? '') : ''
  const lock = disabled ? undefined : edit

  return (
    <div className="xl-root" data-kind="trainer">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        {fix ? (
          <div className="xl-modes" role="tablist" aria-label="Режим тренажёра">
            <button type="button" role="tab" aria-selected={mode === 'values'} onClick={() => setMode('values')}>Меняйте значения</button>
            <button type="button" role="tab" aria-selected={mode === 'fix'} onClick={() => setMode('fix')}>Исправьте формулу</button>
          </div>
        ) : <span />}
        <span className="xl-honest"><Info size={14} aria-hidden /> Учебный тренажёр, не Excel</span>
      </div>

      {spec.title && <div className="xl-title" style={{ fontSize: 16 }}>{spec.title}</div>}

      {mode === 'values' ? (
        <>
          {rawShown.startsWith('=') && (
            <div className="xl-fbar"><span className="xl-fx">fx</span><span style={{ fontSize: 16, lineHeight: '28px' }}><span className="xl-muted" style={{ fontSize: 13 }}>{shortRef(showFormulaOf!, main)} </span><ColoredFormula formula={rawShown} /></span></div>
          )}
          <div className="xl-muted">Нажмите на ячейку и поменяйте значение — результат пересчитается сразу.</div>
        </>
      ) : fix && (
        <>
          <div className="xl-muted">Формула в {shortRef(fix.cell, main)}{fix.fill?.length ? ` (протянута в ${fix.fill.map(f => shortRef(f, main)).join(', ')})` : ''} считает неверно. Исправьте её — проверим на ваших и на других данных.</div>
          <textarea className="xl-input" aria-label="Формула" rows={2} spellCheck={false} autoCapitalize="off" autoCorrect="off"
            value={formula} disabled={disabled} onChange={e => setF(e.target.value)} />
          {formula.trim() && !syntax && <div style={{ fontSize: 15 }}><ColoredFormula formula={formula.trim().startsWith('=') ? formula.trim() : '=' + formula.trim()} /></div>}
          {syntax && <div className="xl-verdict" data-bad=""><b>Формула не разбирается</b>{syntax}</div>}
          {unsupported.length > 0 && <div className="xl-verdict" data-info="">В учебном тренажёре этой функции нет: {unsupported.join(', ')}. Решите задачу функциями урока.</div>}
        </>
      )}

      {book.order.length > 1 && (
        <div className="xl-sheet-tabs" role="tablist" aria-label="Листы">
          {book.order.map((n, i) => <button key={n} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}>{n}</button>)}
        </div>
      )}
      <MiniSheet wb={book} sheet={sheetName} marks={marks} editable={mode === 'values' && !disabled ? editKeys : undefined} onEdit={lock} headers={spec.headers} />

      {mode === 'values' && (spec.watch?.length ?? 0) > 0 && (
        <div className="xl-watch" aria-live="polite">
          {spec.watch!.map(w => {
            const now = book.get(w), was = base.get(w)
            const changed = display(now) !== display(was)
            return (
              <div key={w} className="xl-res" data-changed={changed || undefined}>
                <span className="k">{shortRef(w, main)}</span>
                <span className="v">{display(now) || 'пусто'}</span>
                {changed && <span className="was">было {display(was) || 'пусто'}</span>}
                {isErr(now) && now.why && <span className="was">{now.why}</span>}
              </div>
            )
          })}
        </div>
      )}

      {mode === 'values' && (spec.goals?.length ?? 0) > 0 && (
        <div className="xl-card">
          <div className="xl-title">Попробуйте</div>
          <ul className="xl-goals">
            {spec.goals!.map((g, i) => (
              <li key={i} data-done={met[i] || undefined}><span className="box" aria-hidden>{met[i] && <Check size={12} />}</span><span>{g.text}{met[i] ? ' — получилось' : ''}</span></li>
            ))}
          </ul>
        </div>
      )}

      {mode === 'fix' && fix && (
        <>
          {!disabled && (
            <div className="xl-nav">
              {(fix.hints?.length ?? 0) > hints && (
                <button type="button" className="xl-btn" onClick={() => { const h = hints + 1; setHints(h); emit({ cells, formula, hints: h }) }}>
                  Подсказка{fix.hints!.length - hints > 1 ? ` (ещё ${fix.hints!.length - hints})` : ''}
                </button>
              )}
              <button type="button" className="xl-btn" onClick={() => setF(fix.broken)}>Вернуть исходную</button>
              {selfCheck && <button type="button" className="xl-btn" data-primary="" disabled={!formula.trim() || !!syntax} onClick={() => setChecked(true)}>Проверить</button>}
            </div>
          )}
          {fix.hints?.slice(0, hints).map((h, i) => <div key={i} className="xl-verdict" data-info=""><span style={{ display: 'inline-flex', gap: 6 }}><Lightbulb size={16} aria-hidden style={{ flex: 'none', marginTop: 2 }} />{h}</span></div>)}
          {result && <FixVerdict result={result} mistake={fix.mistake} main={main} />}
        </>
      )}
    </div>
  )
}

function splitKey(ref: string, main: string): [string, string] {
  const bang = ref.lastIndexOf('!')
  return bang > 0 ? [ref.slice(0, bang), ref.slice(bang + 1)] : [main, ref]
}

function FixVerdict({ result, mistake, main }: { result: ReturnType<typeof checkFix>; mistake?: string; main: string }) {
  if (result.syntax) return <div className="xl-verdict" data-bad=""><b>Формула не разбирается</b>{result.syntax}</div>
  if (result.correct) return (
    <div className="xl-verdict" data-ok="" aria-live="polite">
      <b>Верно — формула считает правильно и на других данных</b>
      {mistake && <span>{mistake}</span>}
    </div>
  )
  const bad = result.runs.find(r => !r.ok)!
  const where = bad.dataset === 0 ? 'На данных из таблицы' : `На другом наборе данных (${bad.dataset} из ${Math.max(...result.runs.map(r => r.dataset))})`
  const v = (x: Val) => display(x) || 'пусто'
  return (
    <div className="xl-verdict" data-bad="" aria-live="polite">
      <b>Пока неверно</b>
      <span>{where} в {shortRef(bad.cell, main)} получилось {v(bad.got)}, а должно быть {v(bad.want)}.</span>
      {isErr(bad.got) && bad.got.why && <span className="xl-muted">{bad.got.why}</span>}
    </div>
  )
}
