// ─────────────────────────────────────────────────────────────────────────────
// Вопросы пробника IELTS: группа вопросов так, как она стоит на листе экзамена
//
// Один компонент на четыре вида, а не четыре компонента: у всех общая рамка
// (инструкция, номер, отметка в разборе), и разницы между ними — одна строка
// разметки ответа. Варианты — кнопки, а не нативные radio и select: те
// рисуются системой и выпадают из палитры (правило проекта).
//
// РАЗБОР. В режиме `review` ответы не меняются, у каждого вопроса стоит
// отметка и правильный ответ — ровно то, чего не хватает после настоящего
// экзамена, где узнаёшь только итоговую цифру.
// ─────────────────────────────────────────────────────────────────────────────

import { Check, X } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import GrowTextarea from '../../GrowTextarea'
import { isCorrect } from '../../../lib/ieltsScore'
import type { MockGroup, MockQuestion } from '../../../data/ieltsMocks'

interface Props {
  group: MockGroup
  answers: Record<number, string>
  onAnswer?: (n: number, v: string) => void
  review?: boolean
  accent: string
  soft: string
}

const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN']
const YNNG = ['YES', 'NO', 'NOT GIVEN']

export default function MockGroupView({ group, answers, onAnswer, review, accent, soft }: Props) {
  const t = useT()
  const first = group.questions[0]?.n
  const last = group.questions[group.questions.length - 1]?.n

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
          {t('Вопросы')} {first}{last !== first ? `–${last}` : ''}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)', fontStyle: 'italic' }}>
          {group.instructions}
        </div>
      </div>

      {group.title && (
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{group.title}</div>
      )}

      {/* Общий список у «сопоставления»: на листе экзамена он стоит один раз над
          вопросами, а в кнопках под каждым вопросом — только буквы. */}
      {group.kind === 'match' && group.options && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', borderRadius: 14,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          {group.options.map(o => (
            <div key={o.key} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text)' }}>
              <b style={{ minWidth: 22, color: accent }}>{o.key}</b>
              <span>{o.text}</span>
            </div>
          ))}
        </div>
      )}

      {group.questions.map(q => (
        <QuestionRow key={q.n} q={q} group={group} value={answers[q.n] ?? ''}
          onAnswer={onAnswer} review={review} accent={accent} soft={soft} />
      ))}
    </section>
  )
}

function QuestionRow({ q, group, value, onAnswer, review, accent, soft }: {
  q: MockQuestion
  group: MockGroup
  value: string
  onAnswer?: (n: number, v: string) => void
  review?: boolean
  accent: string
  soft: string
}) {
  const t = useT()
  const ok = review ? isCorrect(q, value) : null
  const set = (v: string) => { if (!review) onAnswer?.(q.n, v) }

  const choices =
    group.kind === 'tfng' ? TFNG.map(k => ({ key: k, text: '' }))
    : group.kind === 'ynng' ? YNNG.map(k => ({ key: k, text: '' }))
    : group.kind === 'mcq' ? group.choices?.[q.n] ?? []
    : group.kind === 'match' ? (group.options ?? []).map(o => ({ key: o.key, text: '' }))
    : null

  return (
    <div id={`mock-q-${q.n}`} style={{
      display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 14, scrollMarginTop: 80,
      background: review ? (ok ? 'rgba(29,185,125,0.08)' : 'rgba(228,87,58,0.08)') : 'transparent',
      border: '1px solid var(--color-border-soft)',
    }}>
      <span style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: 8, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
        background: value ? soft : 'var(--color-bg-3)', color: value ? accent : 'var(--color-text-2)',
      }}>
        {q.n}
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.kind === 'gap'
          ? <GapText text={q.text} value={value} onChange={set} disabled={review} accent={accent} />
          : <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--color-text)' }}>{q.text}</div>}

        {choices && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexDirection: group.kind === 'mcq' ? 'column' : 'row' }}>
            {choices.map(c => {
              const on = value === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  disabled={review}
                  onClick={() => set(on ? '' : c.key)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left',
                    padding: group.kind === 'mcq' ? '8px 12px' : '6px 12px',
                    borderRadius: 10, cursor: review ? 'default' : 'pointer', fontFamily: 'inherit',
                    fontSize: 14, lineHeight: 1.4, fontWeight: on ? 700 : 500,
                    background: on ? soft : 'var(--color-bg-2)',
                    color: on ? accent : 'var(--color-text)',
                    border: `1.5px solid ${on ? accent : 'var(--color-border-soft)'}`,
                  }}
                >
                  <b style={{ minWidth: group.kind === 'mcq' ? 14 : undefined }}>{c.key}</b>
                  {c.text && <span>{c.text}</span>}
                </button>
              )
            })}
          </div>
        )}

        {review && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexWrap: 'wrap' }}>
            {ok
              ? <><Check size={14} style={{ color: 'var(--color-green-text)' }} /><span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>{t('Верно')}</span></>
              : <>
                  <X size={14} style={{ color: 'var(--color-red-text)' }} />
                  <span style={{ color: 'var(--color-red-text)', fontWeight: 700 }}>
                    {value ? `${t('Ваш ответ')}: ${value}` : t('Нет ответа')}
                  </span>
                  <span style={{ color: 'var(--color-text-2)' }}>· {t('Верно')}: <b>{q.answer[0]}</b></span>
                </>}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Предложение с пропуском. Поле стоит прямо на месте `___`, как на бланке:
 * отдельное поле под предложением заставляло бы держать в голове, куда именно
 * идёт ответ. Enter не переносит строку — ответ в пропуск всегда однострочный,
 * а поле всё равно растёт, если ответ не влез в ширину.
 */
function GapText({ text, value, onChange, disabled, accent }: {
  text: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  accent: string
}) {
  const [before, after = ''] = text.split('___')
  return (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)' }}>
      {before}
      <GrowTextarea
        value={value}
        onChange={v => onChange(v.replace(/\n/g, ' '))}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
        style={{
          display: 'inline-block', verticalAlign: 'middle', width: 170, maxWidth: '100%',
          margin: '0 4px', padding: '4px 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 15,
          background: 'var(--color-bg-2)', color: 'var(--color-text)',
          border: `1.5px solid ${value ? accent : 'var(--color-border-soft)'}`, outline: 'none',
        }}
      />
      {after}
    </div>
  )
}
