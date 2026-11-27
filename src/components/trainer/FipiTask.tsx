// ─── Задание банка ФИПИ в карточке тренажёра ────────────────────────────────
//
// Концепт: Figma «Искра», стр. 27 (согласован 27.11.2026). Карточка задания
// остаётся прежней (TaskCard), меняется только блок ответа:
//   • соответствие и «X/Y» — бланк клетками под буквами, как в ЕГЭ;
//   • «выберите несколько» — номера вариантов, порядок не важен;
//   • короткий ответ — одно поле;
//   • часть 2 — ответ на экране и самопроверка по критериям, без «Неверно».
// Балл по правилу линии (lib/fipiGrade): «1 из 2 · одна ошибка».
//
// Ответ НЕ показывается до проверки или явного «Решение» — правило
// feedback-task-must-not-show-answer.
//
// Логика клеток бланка (автопереход, вставка «4543», стрелки, Backspace) —
// порт CorrespondenceAnswer из Тестли (web/src/ui/CorrespondenceAnswer.tsx).

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, X } from '../icons/appIcons'
import OpticalText from '../OpticalText'
import { useT } from '../../lib/i18n'
import { tactile } from '../../lib/feedback'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { cleanFipiHtml } from '../../lib/fipiHtml'
import { bindShortWordsHtml } from '../../lib/typography'
import type { Task } from '../../data/taskBankData'
import { fipiOf, gradeFipi, type FipiPayload } from '../../lib/fipiGrade'

export type FipiState = { value: string; correct: boolean | null; got?: number; max?: number; date?: string }

type Palette = { accent: string; soft: string; text: string; onAccent: string; ring: string }

const ru = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
}

/** Плашка вердикта: «Верно · 2 из 2», «1 из 2 · одна ошибка», «Самооценка 1 из 2». */
export function FipiVerdict({ state, self }: { state?: FipiState; self?: boolean }) {
  const t = useT()
  if (!state || state.got === undefined || state.max === undefined) return null
  const full = state.got >= state.max
  const zero = state.got <= 0
  const bg = self ? 'var(--color-accent-soft, rgba(126,110,230,0.14))' : full ? 'var(--color-green-soft)' : zero ? 'var(--color-red-soft)' : 'var(--color-yellow-soft)'
  const fg = self ? 'var(--color-accent)' : full ? 'var(--color-green-text)' : zero ? 'var(--color-red-text)' : 'var(--color-yellow-text)'
  const label = self
    ? `${t('Самооценка')} ${state.got} ${t('из')} ${state.max}`
    : full ? `${t('Верно')} · ${state.got} ${t('из')} ${state.max}`
      : zero ? `${t('Неверно')} · 0 ${t('из')} ${state.max}`
        : `${state.got} ${t('из')} ${state.max} · ${t('одна ошибка')}`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: bg, color: fg, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {!self && (full ? <CheckCircle2 size={16} /> : zero ? <X size={16} /> : null)}
      {label}
    </div>
  )
}

/** Общий текст группы заданий ФИПИ («Прочитайте текст и выполните задания»). */
function GroupText({ html, mobile }: { html: string; mobile?: boolean }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  // Кнопка нужна, только если текст правда не влез в свёрнутые 160 px: у
  // короткого ряда элементов «Показать целиком» ничего не показывало.
  const box = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const check = () => setOverflows(el.scrollHeight > COLLAPSED_H + 4)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [html])
  const clip = overflows && !open
  return (
    <div style={{ borderRadius: 16, background: 'var(--color-bg-input)', padding: mobile ? '10px 12px' : '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('Текст к заданию')}</div>
      <div ref={box} className="fipi-html" style={{ fontSize: mobile ? 14 : 15, lineHeight: 1.4, maxHeight: open ? 'none' : COLLAPSED_H, overflow: 'hidden', maskImage: clip ? 'linear-gradient(to bottom, #000 70%, transparent)' : undefined, WebkitMaskImage: clip ? 'linear-gradient(to bottom, #000 70%, transparent)' : undefined }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(cleanFipiHtml(html)) }} />
      {(overflows || open) && (
        <button data-hover="layer" onClick={() => setOpen(o => !o)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: '6px 10px', margin: '-6px -10px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', cursor: 'pointer' }}>
          <OpticalText as="iskra-button-label">{open ? t('Свернуть') : t('Показать текст целиком')}</OpticalText>
        </button>
      )}
    </div>
  )
}

const COLLAPSED_H = 160

/** Бланк: клетка под каждой буквой. Порт CorrespondenceAnswer из Тестли. */
function Blank({ labels, value, onChange, locked, wrong, checked, mobile, digits }: {
  labels: string[]; value: string; onChange: (v: string) => void; locked: boolean; wrong: number[]; checked: boolean; mobile?: boolean; digits: string[]
}) {
  const t = useT()
  const fields = useRef<(HTMLInputElement | null)[]>([])
  const [focus, setFocus] = useState(0)
  // Быстрый ввод: следующая цифра приходит раньше перерисовки, и `value` из
  // замыкания ещё старый — без ref вторая цифра затирала первую
  // (reference-stale-props-fast-taps).
  const live = useRef(value)
  live.current = value
  const put = (index: number, text: string) => {
    const typed = text.replace(/\D/g, '').slice(0, labels.length - index)
    const cur = live.current
    const next = Array.from({ length: labels.length }, (_, i) => cur[i] ?? ' ')
    if (!typed) next[index] = ' '
    else [...typed].forEach((d, off) => { next[index + off] = d })
    live.current = next.join('').trimEnd()
    onChange(live.current)
    if (typed) { const n = Math.min(index + typed.length, labels.length - 1); setFocus(n); fields.current[n]?.focus() }
  }
  const cellH = mobile ? 50 : 48
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="group" aria-label={t('Ответ по клеткам')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {labels.map((label, i) => {
          const bad = checked && wrong.includes(i)
          const ok = checked && !bad
          return (
            <label key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)' }}>{label}</span>
              <input
                ref={el => { fields.current[i] = el }}
                value={(value[i] ?? '').trim()}
                readOnly={locked || mobile}
                // На телефоне свои кнопки цифр (ниже) — системная клавиатура не нужна
                // и только двигает экран (skill no-jank-screen).
                inputMode={mobile ? 'none' : 'numeric'}
                maxLength={1}
                aria-label={`${t('Ответ')}: ${label}`}
                onFocus={e => { setFocus(i); e.target.select() }}
                onChange={e => put(i, e.target.value)}
                onPaste={e => { e.preventDefault(); put(i, e.clipboardData.getData('text')) }}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); fields.current[i - 1]?.focus() }
                  if (e.key === 'ArrowRight' && i < labels.length - 1) { e.preventDefault(); fields.current[i + 1]?.focus() }
                  if (e.key === 'Backspace' && !live.current[i]?.trim() && i > 0) { e.preventDefault(); put(i - 1, ''); fields.current[i - 1]?.focus() }
                }}
                style={{
                  width: cellH - 2, height: cellH, boxSizing: 'border-box', textAlign: 'center', padding: 0,
                  fontSize: 21, fontWeight: 700, borderRadius: 13, outline: 'none',
                  fontVariantNumeric: 'lining-nums tabular-nums',
                  background: bad ? 'var(--color-red-soft)' : ok ? 'var(--color-green-soft)' : 'var(--color-bg-input)',
                  color: bad ? 'var(--color-red-text)' : ok ? 'var(--color-green-text)' : 'var(--color-text)',
                  border: `${!checked && mobile && focus === i ? 2 : 1.5}px solid ${bad ? 'var(--color-red-border, #F48B91)' : ok ? 'var(--color-green-border, #6EE7A0)' : !checked && mobile && focus === i ? 'var(--color-accent)' : 'var(--color-border-medium)'}`,
                }}
              />
            </label>
          )
        })}
      </div>
      {mobile && !locked && (
        <div role="group" aria-label={t('Цифры')} style={{ display: 'flex', gap: 6 }}>
          {[...digits, '⌫'].map(d => (
            <button key={d} data-hover="layer"
              onClick={() => { tactile(); if (d === '⌫') { const at = live.current[focus]?.trim() ? focus : Math.max(0, focus - 1); put(at, ''); setFocus(at) } else put(focus, d) }}
              style={{ flex: 1, height: 46, borderRadius: 13, border: '1px solid var(--color-border-soft)', background: d === '⌫' ? 'var(--color-bg-input)' : 'rgba(var(--glass-rgb), 0.96)', fontSize: 20, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** «Выберите несколько»: номера вариантов, порядок не важен. */
function Choice({ options, n, value, onChange, locked, wrong, checked, mobile }: {
  options: string[]; n: number; value: string; onChange: (v: string) => void; locked: boolean; wrong: number[]; checked: boolean; mobile?: boolean
}) {
  const t = useT()
  const picked = new Set([...value])
  // Варианты у ФИПИ почти всегда вписаны в само условие («1) … 2) …»), отдельного
  // списка нет — тогда ответ собирается рядом номеров, как клетки бланка.
  if (!options.length) {
    return (
      <div role="group" aria-label={t('Номера выбранных вариантов')} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: n }, (_, i) => {
          const d = String(i + 1)
          const on = picked.has(d)
          const bad = checked && wrong.includes(i + 1)
          const ok = checked && on && !bad
          return (
            <button key={d} data-hover="layer" disabled={locked} aria-pressed={on}
              onClick={() => { tactile(); const s = new Set(picked); s.has(d) ? s.delete(d) : s.add(d); onChange([...s].sort().join('')) }}
              style={{ width: mobile ? 48 : 46, height: mobile ? 48 : 46, borderRadius: 13, fontSize: 19, fontWeight: 700, cursor: locked ? 'default' : 'pointer',
                fontVariantNumeric: 'lining-nums tabular-nums',
                background: bad ? 'var(--color-red-soft)' : ok ? 'var(--color-green-soft)' : on ? 'var(--color-accent)' : 'var(--color-bg-input)',
                color: bad ? 'var(--color-red-text)' : ok ? 'var(--color-green-text)' : on ? '#fff' : 'var(--color-text)',
                border: `1.5px solid ${bad ? '#F48B91' : ok ? '#6EE7A0' : on ? 'transparent' : 'var(--color-border-medium)'}` }}>
              {d}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map((html, i) => {
        const n = String(i + 1)
        const on = picked.has(n)
        const bad = checked && wrong.includes(i + 1)
        const ok = checked && on && !bad
        return (
          <button key={n} data-hover="layer" disabled={locked}
            onClick={() => { tactile(); const s = new Set(picked); s.has(n) ? s.delete(n) : s.add(n); onChange([...s].sort().join('')) }}
            style={{
              display: 'flex', alignItems: 'center', gap: mobile ? 8 : 10, textAlign: 'left', width: '100%',
              padding: mobile ? '8px 11px' : '10px 14px', minHeight: mobile ? 40 : 44, borderRadius: 12, cursor: locked ? 'default' : 'pointer',
              background: bad ? 'var(--color-red-soft)' : ok ? 'var(--color-green-soft)' : on ? 'var(--color-accent-soft, rgba(126,110,230,0.14))' : 'rgba(var(--glass-rgb),0.7)',
              border: `1px solid ${bad ? '#F48B91' : ok ? '#6EE7A0' : on ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
              color: 'var(--color-text)',
            }}>
            <span style={{ width: mobile ? 22 : 26, height: mobile ? 22 : 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
              background: on ? 'var(--color-accent)' : 'var(--color-bg-input)', color: on ? '#fff' : 'var(--color-text-2)', border: on ? 'none' : '1px solid var(--color-border-medium)' }}>{n}</span>
            <span className="fipi-html" style={{ fontSize: mobile ? 14 : 15, lineHeight: 1.35 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
          </button>
        )
      })}
    </div>
  )
}

/** Часть 2: ответ на экране → эталон и критерии → самооценка. */
function SelfCheck({ task, f, state, onAnswer, palette, mobile }: {
  task: Task; f: FipiPayload; state?: FipiState; onAnswer: (value: string, correct: boolean | null, got?: number, max?: number) => void; palette: Palette; mobile?: boolean
}) {
  const t = useT()
  const saved = useMemo(() => { try { return JSON.parse(state?.value || '{}') as { text?: string; marks?: number[] } } catch { return {} } }, [state?.value])
  const [text, setText] = useState(saved.text ?? '')
  const [open, setOpen] = useState(!!state)
  const criteria = f.criteria ?? []
  const [marks, setMarks] = useState<number[]>(saved.marks ?? criteria.map(() => 0))
  const max = criteria.reduce((s, c) => s + (c.max || 0), 0) || (task.maxPoints ?? 1)
  const got = marks.reduce((s, m) => s + m, 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea value={text} onChange={e => setText(e.target.value)} readOnly={open} rows={mobile ? 4 : 5}
        placeholder={t('Запишите решение: уравнения, расчёты, ответ')}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '12px 14px', borderRadius: 16, fontSize: mobile ? 16 : 14, lineHeight: 1.5, outline: 'none', fontFamily: 'inherit',
          background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', color: 'var(--color-text)' }} />
      {!open ? (
        <button data-hover="layer" onClick={() => { tactile(); setOpen(true) }}
          style={{ alignSelf: mobile ? 'stretch' : 'flex-start', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', borderRadius: 999, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${palette.ring}` }}>
          <Eye size={15} /><OpticalText as="iskra-button-label">{t('Сверить с эталоном')}</OpticalText>
        </button>
      ) : (
        <>
          <div style={{ padding: '12px 16px', borderRadius: 16, background: 'var(--color-green-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{t('Элементы ответа')}</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{f.reference}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Отметьте выполненные критерии — балл посчитается сам')}</div>
          {criteria.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: marks[i] ? 'var(--color-green-soft)' : 'var(--color-bg-input)' }}>
              <span style={{ padding: '2px 7px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: 'rgba(var(--glass-rgb),0.9)', color: marks[i] ? 'var(--color-green-text)' : 'var(--color-text-2)' }}>{c.label}</span>
              <span style={{ flex: 1, fontSize: 14, lineHeight: 1.35, color: 'var(--color-text)' }}>{c.text}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: (c.max || 1) + 1 }, (_, v) => (
                  <button key={v} data-hover="layer" onClick={() => { tactile(); setMarks(m => m.map((x, j) => j === i ? v : x)) }}
                    aria-label={`${c.label}: ${v} ${ru(v, 'балл', 'балла', 'баллов')}`}
                    style={{ minWidth: 34, height: 32, borderRadius: 10, border: '1px solid var(--color-border-soft)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      background: marks[i] === v ? palette.accent : 'rgba(var(--glass-rgb),0.9)', color: marks[i] === v ? palette.onAccent : 'var(--color-text-2)' }}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button data-hover="layer" onClick={() => { tactile(); onAnswer(JSON.stringify({ text, marks }), got >= max, got, max) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 999, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <CheckCircle2 size={15} /><OpticalText as="iskra-button-label">{`${t('Сохранить самооценку')} · ${got} ${t('из')} ${max}`}</OpticalText>
            </button>
            <button data-hover="layer" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', cursor: 'pointer' }}>
              <OpticalText as="iskra-button-label">{t('Изменить решение')}</OpticalText>
            </button>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Учитель сможет перепроверить')}</span>
          </div>
        </>
      )}
    </div>
  )
}

/** Тело задания ФИПИ: текст группы, варианты, бланк, проверка, решение. */
export default function FipiTaskBody({ task, state, onAnswer, palette, mobile }: {
  task: Task
  state?: FipiState
  onAnswer: (value: string, correct: boolean | null, got?: number, max?: number) => void
  palette: Palette
  mobile?: boolean
}) {
  const t = useT()
  const f = fipiOf(task)!
  const [value, setValue] = useState(state && f.kind !== 'extended' ? state.value : '')
  const [showSolution, setShowSolution] = useState(false)
  const checked = state !== undefined && state.correct !== null && state.value === value && !!value
  const result = useMemo(() => (checked ? gradeFipi(task, value) : null), [checked, task, value])
  const peeked = state?.correct === null && f.kind !== 'extended'
  const complete = f.kind === 'select' ? value.replace(/\s/g, '').length === (f.cells?.length ?? 0) : !!value.trim()

  function check() {
    tactile()
    const r = gradeFipi(task, value)
    onAnswer(value, r.full, r.got, r.max)
  }
  function peek() {
    tactile()
    if (state === undefined) onAnswer(value, null)
    setShowSolution(s => !s)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {f.groupHtml && <GroupText html={f.groupHtml} mobile={mobile} />}

      {f.kind === 'check' && <Choice options={f.options ?? []} n={f.n ?? 5} value={value} onChange={setValue} locked={checked || peeked} wrong={result?.wrong ?? []} checked={checked} mobile={mobile} />}

      {f.kind === 'extended' ? (
        <SelfCheck task={task} f={f} state={state} onAnswer={onAnswer} palette={palette} mobile={mobile} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          {f.kind === 'select' && !!f.options?.length && (
            // Варианты «X и Y» — нумерованным списком над бланком (в условии их нет).
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              {f.options.map((html, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: mobile ? '7px 10px' : '8px 12px', borderRadius: 12, background: 'var(--color-bg-input)' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: 'rgba(var(--glass-rgb),0.95)', border: '1px solid var(--color-border-medium)', color: 'var(--color-text-2)' }}>{i + 1}</span>
                  <span className="fipi-html" style={{ fontSize: mobile ? 14 : 15, lineHeight: 1.35 }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
                </li>
              ))}
            </ol>
          )}
          {f.kind === 'select' && (
            <Blank labels={f.cells ?? []} value={value} onChange={setValue} locked={checked || peeked} wrong={result?.wrong ?? []} checked={checked} mobile={mobile} digits={f.digits?.length ? f.digits : ['1', '2', '3', '4', '5']} />
          )}
          {f.kind === 'text' && (
            <input value={value} readOnly={checked || peeked} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && complete && check()}
              placeholder={peeked ? t('Ответ открыт') : t('Ответ')} inputMode={/^[\d,.\s-]+$/.test(task.answer) ? 'decimal' : 'text'}
              style={{ flex: '1 1 160px', maxWidth: mobile ? 'none' : 240, height: mobile ? 48 : 42, boxSizing: 'border-box', padding: '0 16px', borderRadius: 16, fontSize: mobile ? 16 : 15, outline: 'none',
                background: checked ? (result?.full ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
                border: `1px solid ${checked ? (result?.full ? '#6EE7A0' : '#F48B91') : 'var(--color-border-medium)'}`, color: 'var(--color-text)' }} />
          )}
          {f.kind === 'check' && <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Порядок номеров не важен')}</span>}
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {!checked && !peeked && complete && (
              <button data-hover="layer" onClick={check}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: mobile ? 48 : 42, padding: '0 20px', borderRadius: 16, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${palette.ring}` }}>
                <CheckCircle2 size={14} /><OpticalText as="iskra-button-label">{t('Проверить')}</OpticalText>
              </button>
            )}
            {checked && result && !result.full && (
              <button data-hover="layer" onClick={() => { setValue(''); onAnswer('', false, result.got, result.max) }}
                style={{ height: mobile ? 48 : 42, padding: '0 16px', borderRadius: 16, border: '1.5px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb),0.88)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', cursor: 'pointer' }}>
                <OpticalText as="iskra-button-label">{t('Ещё раз')}</OpticalText>
              </button>
            )}
            <button data-hover="layer" onClick={peek}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: mobile ? 48 : 42, padding: '0 16px', borderRadius: 16, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: showSolution ? palette.soft : 'rgba(var(--glass-rgb), 0.88)', border: `1.5px solid ${showSolution ? 'transparent' : 'var(--color-border-medium)'}`, color: showSolution ? palette.text : 'var(--color-muted)' }}>
              {showSolution ? <Eye size={14} /> : <EyeOff size={14} />}<OpticalText alignment="ink">{t('Решение')}</OpticalText>
            </button>
          </div>
        </div>
      )}

      {checked && result && !result.full && result.got > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 14, background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)', fontSize: 13, lineHeight: 1.4 }}>
          {f.kind === 'select'
            ? `${t('Одна ошибка — в клетке')} ${(f.cells ?? [])[result.wrong[0]] ?? ''}. ${t('Правило линии: всё верно — полный балл, одна ошибка — минус балл.')}`
            : t('Одна ошибка. Правило линии: всё верно — полный балл, одна ошибка — минус балл.')}
        </div>
      )}

      {showSolution && f.kind !== 'extended' && (
        <div style={{ padding: '14px 18px', background: palette.soft, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{t('Правильный ответ')}</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', letterSpacing: f.kind === 'text' ? 0 : 2 }}>{f.kind === 'check' ? [...task.answer].join(', ') : task.answer.split('|')[0]}</p>
          {task.solution && <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: bindShortWordsHtml(sanitizeHtml(task.solution)) }} />}
        </div>
      )}
    </div>
  )
}

/**
 * Вид «Линии КИМ»: плитка на каждый номер задания КИМ — баллы, название из
 * спецификации, сколько заданий в банке и сколько решено верно. Нажатие ставит
 * фильтр «Линия» и открывает список.
 */
export function LinesGrid({ lines, tasks, answered, part2, accent, onPick, mobile }: {
  lines: { number: number; title: string; points: number }[]
  tasks: Task[]
  answered: Map<number, FipiState>
  part2: Set<number>
  accent: string
  onPick: (label: string) => void
  mobile?: boolean
}) {
  const t = useT()
  const stat = useMemo(() => {
    const m = new Map<number, { total: number; done: number }>()
    for (const x of tasks) {
      const s = m.get(x.line) ?? { total: 0, done: 0 }
      s.total++
      if (answered.get(x.id)?.correct === true) s.done++
      m.set(x.line, s)
    }
    return m
  }, [tasks, answered])
  return (
    <div style={{ display: mobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: mobile ? 8 : 12 }}>
      {lines.map(l => {
        const s = stat.get(l.number) ?? { total: 0, done: 0 }
        const pct = s.total ? Math.round((s.done / s.total) * 100) : 0
        const empty = s.total === 0
        return (
          <button key={l.number} data-hover="card" disabled={empty} onClick={() => { tactile(); onPick(`${l.number} · ${l.title}`) }}
            style={{
              display: 'flex', flexDirection: mobile ? 'row' : 'column', alignItems: mobile ? 'center' : 'stretch', gap: mobile ? 12 : 8,
              textAlign: 'left', padding: mobile ? 12 : 16, borderRadius: mobile ? 18 : 22, minHeight: mobile ? 0 : 150,
              background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-soft)', cursor: empty ? 'default' : 'pointer',
              opacity: empty ? 0.5 : 1, color: 'var(--color-text)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ minWidth: 36, height: 32, padding: '0 6px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, background: `${accent}22` }}>{l.number}</span>
              {!mobile && <span style={{ flex: 1 }} />}
              {!mobile && <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>{part2.has(l.number) ? `${t('ч. 2')} · ` : ''}{l.points} {ru(l.points, 'балл', 'балла', 'баллов')}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: mobile ? 15 : 15, fontWeight: 650, lineHeight: 1.3 }}>{l.title}</span>
              {mobile && <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{l.points} {ru(l.points, 'балл', 'балла', 'баллов')} · {s.done}/{s.total}</span>}
            </div>
            {!mobile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                  <span>{s.done} / {s.total}</span><span>{empty ? t('нет заданий') : s.done ? `${pct}%` : t('не начато')}</span>
                </div>
                <span style={{ display: 'block', height: 4, borderRadius: 999, background: 'var(--color-bg-input)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: accent, borderRadius: 999 }} />
                </span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
