import { useState } from 'react'
import { Check, ListChecks, Play, Sparkles, X } from './icons/appIcons'
import type { LessonParagraph, SelfCheckQuestion } from '../data/lessonContent'
import { transcriptTime } from '../lib/localTranscription'
import { proseWrap, tidyProse } from '../lib/typography'
import { sameAnswer } from '../lib/answerForms'
import { useT } from '../lib/i18n'
import './lessonRecap.css'

// Вид ученика: «Итоги занятия» и «Проверь себя» из записи урока.
// Таймкод ведёт в видео урока: нажал — плеер встал на это место.
// «Проверь себя» без оценки: ответы не сохраняются и в прогресс не идут
// (решение 07.11.2026).

const card = {
  padding: 24, borderRadius: 24, background: 'rgba(var(--glass-rgb), 0.96)',
  border: '1px solid var(--color-border-soft)', boxShadow: 'var(--shadow-2)',
} as const

function TimeChip({ at, seek }: { at: number; seek?: (s: number) => void }) {
  const t = useT()
  const label = transcriptTime(at)
  return seek
    ? <button type="button" className="recap-tc" onClick={() => seek(at)} aria-label={t('Смотреть с') + ' ' + label}><Play size={11} />{label}</button>
    : <span className="recap-tc is-static">{label}</span>
}

export function RecapSummary({ paragraphs, seek, scale = 1 }: { paragraphs: LessonParagraph[]; seek?: (s: number) => void; scale?: number }) {
  const t = useT()
  if (!paragraphs.length) return null
  return <section className="recap-block" style={card} aria-label={t('Итоги занятия')}>
    <header className="recap-head">
      <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
      <span className="recap-title">{t('Итоги занятия')}</span>
      <small className="recap-sub">{t(seek ? 'Нажмите время — видео перемотается' : 'Из записи урока')}</small>
    </header>
    {paragraphs.map(p => <div key={p.id} className="recap-para">
      {p.title && <h3 className="recap-para-title" style={{ fontSize: 15 * scale }}>{p.title}</h3>}
      <p style={{ fontSize: 15 * scale, lineHeight: 1.6, color: 'var(--color-text)', fontWeight: 500, margin: 0, ...proseWrap }}>{tidyProse(p.text)}</p>
      {!!p.at?.length && <div className="recap-tcs">{p.at.slice(0, 3).map(t => <TimeChip key={t} at={t} seek={seek} />)}</div>}
    </div>)}
  </section>
}

export function SelfCheck({ questions, seek }: { questions: SelfCheckQuestion[]; seek?: (s: number) => void }) {
  const t = useT()
  if (!questions.length) return null
  return <section className="recap-block" style={card} aria-label={t('Проверь себя')}>
    <header className="recap-head">
      <ListChecks size={18} style={{ color: 'var(--color-accent)' }} />
      <span className="recap-title">{t('Проверь себя')}</span>
      <small className="recap-sub">{questions.length} · {t('без оценки')}</small>
    </header>
    <ol className="recap-qs">{questions.map((q, i) => <SelfCheckItem key={q.id} n={i + 1} q={q} seek={seek} />)}</ol>
  </section>
}

function SelfCheckItem({ n, q, seek }: { n: number; q: SelfCheckQuestion; seek?: (s: number) => void }) {
  const t = useT()
  const [picked, setPicked] = useState<number | null>(null)
  const [shown, setShown] = useState(false)
  const right = picked != null && q.options ? sameAnswer(q.options[picked], q.answer) : false
  return <li className="recap-q">
    <div className="recap-q-text"><span className="recap-q-n">{n}</span><span>{q.q}</span></div>
    {q.options?.length
      ? <div className="recap-opts" role="group" aria-label={t('Варианты ответа') + ' ' + n}>{q.options.map((o, i) => {
        const state = picked == null ? '' : sameAnswer(o, q.answer) ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim'
        return <button key={i} type="button" className={'recap-opt' + state} aria-pressed={picked === i} disabled={picked != null} onClick={() => setPicked(i)}>
          <span className="recap-opt-mark" aria-hidden>{picked != null && sameAnswer(o, q.answer) ? <Check size={14} /> : picked === i ? <X size={14} /> : null}</span>
          <span className="recap-opt-text">{o}</span>
        </button>
      })}</div>
      : shown
        ? <div className="recap-answer"><Check size={14} />{q.answer}</div>
        : <button type="button" className="recap-reveal" onClick={() => setShown(true)}>{t('Показать ответ')}</button>}
    {/* Строка результата держит место заранее: появляясь, она не сдвигает вопросы ниже. */}
    <div className="recap-q-foot">
      {picked != null && <span className={'recap-verdict' + (right ? ' is-right' : ' is-wrong')} role="status">{right ? t('Верно') : `${t('Верно:')} ${q.answer}`}</span>}
      {q.at != null && <span className="recap-q-where">{t('Где на уроке:')} <TimeChip at={q.at} seek={seek} /></span>}
    </div>
  </li>
}
