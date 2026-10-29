// ─────────────────────────────────────────────────────────────────────────────
// Результат пробника IELTS: баллы по секциям, итог и разбор
//
// Цифра без разбора ничему не учит: «Reading 6.0» говорит, что плохо, но не
// говорит, где. Поэтому под баллом каждой секции — её разбор: вопросы с
// отметкой и верным ответом, критерии письма с цитатами, расшифровка речи.
// Оценка модели может ещё ехать — экран подписан на хранилище оценок и
// дорисовывается сам, когда она придёт.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Layers, Loader2, RotateCcw } from 'lucide-react'
import { addCards, deckOwner } from '../../../data/reviewDeck'
import { useT } from '../../../lib/i18n'
import MockGroupView from './MockQuestions'
import { fmtBand, rawFor, wordCount } from '../../../lib/ieltsScore'
import {
  loadGrades, onGrades, isGrading, sectionBand, attemptOverall, runGrade,
  gradeWriting, gradeSpeaking, canGrade,
  type MockAttempt, type Grade, type GradeKey, type AttemptGrades,
} from '../../../lib/ieltsMocks'
import { SECTION_ORDER, SECTION_LABEL, type IeltsMock, type IeltsSection } from '../../../data/ieltsMocks'

/** Подписка на оценки одной попытки. */
export function useAttemptGrades(attemptId: string): AttemptGrades {
  const [g, setG] = useState(() => loadGrades(attemptId))
  useEffect(() => {
    setG(loadGrades(attemptId))
    return onGrades(() => setG(loadGrades(attemptId)))
  }, [attemptId])
  return g
}

/**
 * Запустить оценку Writing и Speaking попытки — то, что ещё не оценено и не
 * оценивается прямо сейчас. Зовётся сразу после сдачи секции и кнопкой
 * «Оценить заново».
 */
export function gradeAttempt(a: MockAttempt, mock: IeltsMock, only?: GradeKey[], opts: { onlyMissing?: boolean } = {}) {
  const have = opts.onlyMissing ? loadGrades(a.id) : null
  // «Только недостающие» — ни оценки, ни ошибки: упавшая оценка повторяется
  // кнопкой, а не сама на каждом рендере.
  const want = (k: GradeKey) => (!only || only.includes(k)) && !(have && (have.grades[k] || have.errors[k]))
  const gate = async () => {
    const why = await canGrade()
    if (why) throw new Error(why)
  }
  const w = a.sections.writing
  if (w?.finishedAt) {
    for (const task of [1, 2] as const) {
      const key: GradeKey = task === 1 ? 't1' : 't2'
      if (!want(key)) continue
      const spec = mock.writing.find(x => x.task === task)
      const text = w.texts?.[task] ?? ''
      if (!spec) continue
      void runGrade(a.id, key, async () => {
        if (wordCount(text) < 20) throw new Error('Ответ короче двадцати слов — оценивать нечего')
        await gate()
        return gradeWriting(task, spec.prompt, text, spec.facts)
      })
    }
  }
  const s = a.sections.speaking
  if (s?.finishedAt && want('speaking')) {
    void runGrade(a.id, 'speaking', async () => {
      const said = (s.speech ?? []).reduce((n, x) => n + wordCount(x.transcript), 0)
      if (said < 15) throw new Error('Распознано слишком мало речи — оценивать нечего')
      await gate()
      return gradeSpeaking(s.speech ?? [])
    })
  }
}

export default function MockResults({ attempt, mock, accent, soft }: {
  attempt: MockAttempt
  mock: IeltsMock
  accent: string
  soft: string
}) {
  const t = useT()
  const g = useAttemptGrades(attempt.id)
  const overall = attemptOverall(attempt, g)
  const sections = SECTION_ORDER.filter(s => attempt.sections[s]?.finishedAt)
  const [open, setOpen] = useState<IeltsSection | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Итог: четыре плитки и общий балл. Общий — только у полного пробника,
          где досчитаны все четыре: среднее по двум секциям ничего не значит. */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10,
      }}>
        {sections.map(s => (
          <BandTile key={s} label={t(SECTION_LABEL[s])} band={sectionBand(attempt, s, g)}
            pending={s === 'writing' ? (isGrading(attempt.id, 't1') || isGrading(attempt.id, 't2'))
              : s === 'speaking' ? isGrading(attempt.id, 'speaking') : false}
            note={s === 'speaking' ? t('без произношения') : undefined}
            accent={accent} />
        ))}
        {overall != null && <BandTile label={t('Итог')} band={overall} accent={accent} strong />}
      </div>

      <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-3)', margin: 0 }}>
        {t('Балл ориентировочный. Listening и Reading переведены в band по распространённым таблицам — на настоящем экзамене таблица своя у каждой версии теста. Writing и Speaking оценены моделью по публичным критериям; произношение по расшифровке не оценивается.')}
      </p>

      {sections.map(s => (
        <div key={s} style={{
          borderRadius: 18, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', overflow: 'hidden',
        }}>
          <button type="button" onClick={() => setOpen(open === s ? null : s)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{t(SECTION_LABEL[s])}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-2)', flex: 1 }}>{sectionLine(s, attempt, g, mock, t)}</span>
            {open === s ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {open === s && (
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {s === 'listening' && mock.listening.map((p, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>{p.title}</div>
                  {p.groups.map((gr, j) => (
                    <MockGroupView key={j} group={gr} answers={attempt.sections.listening?.answers ?? {}} review accent={accent} soft={soft} />
                  ))}
                  <Transcript lines={p.script.map(l => l.text)} />
                </div>
              ))}
              {s === 'reading' && mock.reading.map((p, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>{`Passage ${i + 1} · ${p.title}`}</div>
                  {p.groups.map((gr, j) => (
                    <MockGroupView key={j} group={gr} answers={attempt.sections.reading?.answers ?? {}} review accent={accent} soft={soft} />
                  ))}
                </div>
              ))}
              {s === 'writing' && ([1, 2] as const).map(task => (
                <GradeBlock key={task}
                  title={`Task ${task} · ${wordCount(attempt.sections.writing?.texts?.[task] ?? '')} ${t('слов')}`}
                  grade={g.grades[task === 1 ? 't1' : 't2']}
                  error={g.errors[task === 1 ? 't1' : 't2']}
                  pending={isGrading(attempt.id, task === 1 ? 't1' : 't2')}
                  onRetry={() => gradeAttempt(attempt, mock, [task === 1 ? 't1' : 't2'])}
                  answer={attempt.sections.writing?.texts?.[task] ?? ''}
                  accent={accent}
                />
              ))}
              {s === 'speaking' && (
                <GradeBlock
                  title={t('Speaking по расшифровке')}
                  grade={g.grades.speaking}
                  error={g.errors.speaking}
                  pending={isGrading(attempt.id, 'speaking')}
                  onRetry={() => gradeAttempt(attempt, mock, ['speaking'])}
                  answer={(attempt.sections.speaking?.speech ?? [])
                    .map(x => `Q: ${x.question}\nA: ${x.transcript || '—'}`).join('\n\n')}
                  accent={accent}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function sectionLine(s: IeltsSection, a: MockAttempt, g: AttemptGrades, _mock: IeltsMock, t: (x: string) => string): string {
  if (s === 'listening' || s === 'reading') {
    const raw = a.sections[s]?.raw ?? 0
    const band = sectionBand(a, s, g) ?? 0
    // Сколько не хватило до следующей ступени — самая полезная строка разбора:
    // «до 7.0 — три вопроса» говорит больше, чем «6.5».
    const next = rawFor(s, band + 0.5)
    const gap = next != null && next > raw ? ` · ${t('до')} ${fmtBand(band + 0.5)} — +${next - raw}` : ''
    return `${raw}/40${gap}`
  }
  return t('разбор по критериям')
}

function BandTile({ label, band, pending, note, accent, strong }: {
  label: string
  band: number | null
  pending?: boolean
  note?: string
  accent: string
  strong?: boolean
}) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 4,
      background: strong ? 'var(--grad-purple)' : 'var(--color-bg-2)',
      border: strong ? 'none' : '1px solid var(--color-border-soft)',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: strong ? 'rgba(255,255,255,0.85)' : 'var(--color-text-2)' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: strong ? '#fff' : band == null ? 'var(--color-text-3)' : accent }}>
        {pending && band == null ? <Loader2 size={24} className="spin" /> : fmtBand(band)}
      </span>
      {note && <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{note}</span>}
    </div>
  )
}

/**
 * Уровень CEFR по баллу IELTS — по сопоставлению, которое публикуют сами
 * организаторы экзамена. Нужен ради одной вещи: «6.5» мало что говорит
 * человеку вне экзамена, а «B2» он знает по любой школе.
 */
export function cefrOf(band: number): string {
  if (band >= 8.5) return 'C2'
  if (band >= 7) return 'C1'
  if (band >= 5.5) return 'B2'
  if (band >= 4) return 'B1'
  return 'A2'
}

type GradeTab = 'analysis' | 'fixes' | 'lexis' | 'answer'

function GradeBlock({ title, grade, error, pending, onRetry, answer, accent }: {
  title: string
  grade?: Grade
  error?: string
  pending: boolean
  onRetry: () => void
  answer: string
  accent: string
}) {
  const t = useT()
  const [tab, setTab] = useState<GradeTab>('analysis')
  const lexis = grade?.lexis ?? []
  const tabs: { id: GradeTab; label: string; n?: number }[] = [
    { id: 'analysis', label: 'Анализ' },
    { id: 'fixes', label: 'Исправления', n: grade?.fixes.length },
    ...(lexis.length ? [{ id: 'lexis' as const, label: 'Лексика', n: lexis.length }] : []),
    ...(answer ? [{ id: 'answer' as const, label: 'Мой ответ' }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>{title}</span>
        {grade && (
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
              background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
            }}>CEFR {cefrOf(grade.band)}</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: accent }}>{fmtBand(grade.band)}</span>
          </span>
        )}
      </div>

      {pending && !grade && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
          <Loader2 size={14} className="spin" /> {t('Модель проверяет ответ — обычно до минуты…')}
        </div>
      )}

      {!pending && !grade && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: error ? 'var(--color-red-text)' : 'var(--color-text-2)' }}>
            {error ? t(error) : t('Оценки ещё нет')}
          </span>
          <button type="button" onClick={onRetry} style={outlineBtn(accent)}>
            <RotateCcw size={14} /> {t('Оценить')}
          </button>
        </div>
      )}

      {grade && (
        <>
          {/* Критерии полосками: видно не только цифру, но и какой из четырёх
              держит балл внизу — с него и начинать. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            {grade.criteria.map(c => {
              const low = c.band === Math.min(...grade.criteria.map(x => x.band))
              return (
                <div key={c.key} style={{
                  padding: '10px 12px', borderRadius: 14, background: 'var(--color-bg)',
                  border: `1px solid ${low ? accent : 'var(--color-border-soft)'}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
                    {c.band}<span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}> / 9</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--color-bg-3)', marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${(c.band / 9) * 100}%`, height: '100%', background: accent }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: 4, borderRadius: 12, background: 'var(--color-bg-3)', alignSelf: 'flex-start' }}>
            {tabs.map(x => (
              <button key={x.id} type="button" onClick={() => setTab(x.id)} style={{
                height: 30, padding: '0 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 700,
                background: tab === x.id ? 'var(--color-bg-2)' : 'transparent',
                color: tab === x.id ? 'var(--color-text)' : 'var(--color-text-2)',
              }}>
                {t(x.label)}{x.n ? ` · ${x.n}` : ''}
              </button>
            ))}
          </div>

          {tab === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grade.summary && (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--color-text)', fontWeight: 600 }}>{grade.summary}</p>
              )}
              {grade.criteria.map(c => (
                <div key={c.key} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                  <b style={{ color: 'var(--color-text)' }}>{c.key} · {c.band}.</b> {c.comment}
                </div>
              ))}
              {grade.strengths.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: 'var(--color-green-text)' }}>
                  {grade.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
          )}

          {tab === 'fixes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grade.fixes.map((f, i) => (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)',
                  fontSize: 13, lineHeight: 1.5,
                }}>
                  <div style={{ color: 'var(--color-red-text)', textDecoration: 'line-through', textDecorationThickness: 1 }}>{f.quote}</div>
                  {f.better && <div style={{ color: 'var(--color-green-text)', fontWeight: 600 }}>{f.better}</div>}
                  <div style={{ color: 'var(--color-text-2)' }}>{f.issue}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'lexis' && <LexisList lexis={lexis} accent={accent} />}

          {tab === 'answer' && (
            <pre style={{
              margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5,
              color: 'var(--color-text)', padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg)',
              border: '1px solid var(--color-border-soft)',
            }}>{answer}</pre>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Лексика из разбора — сразу в карточки. Это то, чего нет у GoPrep: там
 * замены остаются строчками в отчёте, у нас уходят в ту же колоду
 * интервальных повторений, что и слова уроков, и возвращаются, пока не
 * закрепятся.
 */
function LexisList({ lexis, accent }: { lexis: NonNullable<Grade['lexis']>; accent: string }) {
  const t = useT()
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'known' | 'fail'>('idle')
  const save = async () => {
    setState('saving')
    try {
      const n = await addCards(deckOwner(), lexis.map(x => ({
        subject: 'Английский', source: 'manual' as const, prompt: x.to, answer: x.ru || x.from,
      })))
      setState(n > 0 ? 'done' : 'known')
    } catch (e) {
      console.error('LexisList:', e)
      setState('fail')
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lexis.map((x, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 12,
          background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)', fontSize: 14, lineHeight: 1.45,
        }}>
          <span style={{ color: 'var(--color-text-3)' }}>{x.from}</span>
          <span style={{ color: 'var(--color-text-3)' }}>→</span>
          <b style={{ color: 'var(--color-text)' }}>{x.to}</b>
          {x.ru && <span style={{ color: 'var(--color-text-2)' }}>· {x.ru}</span>}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <button type="button" onClick={save} disabled={state === 'saving' || state === 'done'} style={{
          ...outlineBtn(accent), opacity: state === 'saving' || state === 'done' ? 0.6 : 1,
        }}>
          <Layers size={14} /> {t('В карточки')}
        </button>
        <span style={{ fontSize: 13, color: state === 'fail' ? 'var(--color-red-text)' : 'var(--color-text-2)' }}>
          {state === 'done' ? t('Добавлено — слова придут в повторение')
            : state === 'known' ? t('Эти слова уже в колоде')
            : state === 'fail' ? t('Не получилось добавить')
            : ''}
        </span>
      </div>
    </div>
  )
}

const outlineBtn = (accent: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 999,
  border: `1.5px solid ${accent}`, background: 'transparent', color: accent, fontWeight: 700,
  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
})

/** Текст записи — открывается только в разборе, после экзамена. */
function Transcript({ lines }: { lines: string[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        border: 'none', background: 'transparent', padding: 0, color: 'var(--color-text-2)', fontWeight: 700,
        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
      }}>
        {open ? t('Скрыть текст записи') : t('Текст записи')}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
          {lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  )
}
