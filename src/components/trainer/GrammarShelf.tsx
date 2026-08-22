import { useMemo, useState } from 'react'
import { Check, X, Sparkle, AlertTriangle, ArrowRight, GraduationCap } from 'lucide-react'
import { Tile, TileGrid, TileChip, TileMeter, Empty } from './TrainerShell'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import GlossedText from '../GlossedText'
import type { GrammarForm, GrammarRef } from '../../data/grammar'

// ─────────────────────────────────────────────────────────────────────────────
// Витрина справочника: разделы → форма → её карточка
//
// ПОЧЕМУ ПЛОСКО, А НЕ КАК КУРС. Курс ведёт по порядку и знает, что идёт дальше.
// В справочник приходят с конкретным вопросом — «чем 은/는 отличается от 이/가»,
// — и лестница уроков здесь только мешает: нужную форму надо УВИДЕТЬ, а не
// дойти до неё. Отсюда разделы вместо уровней в качестве главного деления:
// человек помнит, что искал что-то «про частицы», а не что это было 1급.
//
// ПОЧЕМУ ПРИМЕР С ПОДПИСЬЮ, А НЕ ПРОСТО ПЕРЕВОД. Вопрос, с которым приходят в
// справочник, почти всегда звучит как «когда так говорят». Перевод на него не
// отвечает: десять переведённых фраз с одной формой выглядят одинаково. Отвечает
// строка контекста под переводом — по ней видно, что форма нейтральна здесь и
// невозможна там.
//
// ПОЧЕМУ ТЕСТ ПРЯМО В КАРТОЧКЕ. Чтение объяснения заканчивается ощущением
// «понятно», и это ощущение ничем не проверено. Три вопроса на месте стоят
// дешевле, чем обнаружить пробел через неделю в домашке.
// ─────────────────────────────────────────────────────────────────────────────

/** Сколько вопросов формы взято — по общим результатам тренажёра. */
export const quizTotal = (f: GrammarForm) => f.quiz.length

// ─── Сетка форм ──────────────────────────────────────────────────────────────

export function GrammarGrid({ groups, result, accent, soft, onOpen }: {
  /** Разделы с формами — уже отфильтрованные и в нужном порядке. */
  groups: { chapter: string; forms: GrammarForm[] }[]
  /** Результат самопроверки формы, если она уже пройдена. */
  result: (formId: string) => { score: number; total: number } | undefined
  accent: string
  soft: string
  onOpen: (formId: string) => void
}) {
  const t = useT()

  if (groups.length === 0) {
    return <Empty text={t('Под выбранные фильтры ничего не подошло. Сбрось один из них.')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {groups.map(g => (
        <section key={g.chapter} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <header>
            <h2 style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)', margin: 0 }}>
              {t(g.chapter)}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: '3px 0 0', lineHeight: 1.5 }}>
              {g.forms.length} {t(formsWord(g.forms.length))}
            </p>
          </header>

          <TileGrid min={248}>
            {g.forms.map(f => {
              const r = result(f.id)
              return (
                <Tile key={f.id} accent={accent} onClick={() => onOpen(f.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <TileChip tone="accent" accent={accent} soft={soft}>{f.level}</TileChip>
                    <TileChip tone="mute">{f.examples.length} {t('примеров')}</TileChip>
                  </span>

                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Сама форма крупно и своим письмом: её и ищут глазами,
                        а не русское название. */}
                    <span style={{ fontSize: 17, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.25 }}>
                      {f.form}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-2)', lineHeight: 1.3 }}>
                      {f.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.45 }}>
                      {f.short}
                    </span>
                  </span>

                  {r && (
                    <>
                      <TileMeter value={r.total ? Math.round((r.score / r.total) * 100) : 0} />
                      <span style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: 'var(--color-green-text)', fontWeight: 700 }}>
                        {r.score} / {r.total}
                      </span>
                    </>
                  )}
                </Tile>
              )
            })}
          </TileGrid>
        </section>
      ))}
    </div>
  )
}

function formsWord(n: number): string {
  const t = n % 10, h = n % 100
  if (t === 1 && h !== 11) return 'форма'
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return 'формы'
  return 'форм'
}

// ─── Карточка формы ──────────────────────────────────────────────────────────

export function GrammarPage({ form, all, lang, subject, accent, soft, onOpenForm, onQuizDone }: {
  form: GrammarForm
  /**
   * Весь справочник — нужен для подписей к формам в блоке сравнения.
   *
   * Имя `all`, а не `ref`: у функционального компонента `ref` — служебный проп
   * React, и обычный объект под этим именем React попытается разобрать как
   * ссылку на узел.
   */
  all: GrammarRef
  lang: string
  /** Предмет для кнопки «в словарь» в примерах. */
  subject?: string
  accent: string
  soft: string
  onOpenForm: (formId: string) => void
  onQuizDone: (formId: string, score: number, total: number) => void
}) {
  const t = useT()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Шапка: форма, к чему клеится, где проходят */}
      <div style={{
        padding: '18px 20px', borderRadius: 18,
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {form.form}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-2)', marginTop: 4 }}>
            {form.title}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <TileChip tone="accent" accent={accent} soft={soft}>{form.level}</TileChip>
          <TileChip tone="mute">{form.chapter}</TileChip>
        </div>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-3)', ...proseWrap }}>
          {t('Клеится')}: {bindShortWords(form.attach)}
        </p>
      </div>

      {/* Правило */}
      <Section title={t('Как это работает')}>
        {form.rule.split('\n\n').map((p, i) => (
          <p key={i} style={{
            margin: 0, fontSize: 14.5, lineHeight: 1.7,
            color: 'var(--color-text-2)', ...proseWrap,
          }}>
            {bindShortWords(p)}
          </p>
        ))}
      </Section>

      {form.table && <FormTable table={form.table} accent={accent} soft={soft} />}

      {/* Примеры — сердцевина карточки */}
      <Section
        title={`${t('Когда так говорят')} · ${form.examples.length}`}
        hint={t('Под каждым примером — ситуация, а не только перевод: одна и та же форма в разных местах звучит по-разному.')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {form.examples.map((ex, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 14,
              background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              <GlossedText text={ex.text} lang={lang} accent={accent} subject={subject} />
              <div style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                {ex.ru}
              </div>
              <div style={{
                display: 'flex', gap: 6, alignItems: 'flex-start',
                fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.5,
              }}>
                <Sparkle size={12} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
                <span style={proseWrap}>{bindShortWords(ex.when)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Ошибка русскоязычного */}
      {form.pitfall && (
        <div style={{
          display: 'flex', gap: 10, padding: '13px 16px', borderRadius: 14,
          background: 'var(--color-amber-soft)', border: '1px solid var(--color-amber-border)',
        }}>
          <AlertTriangle size={15} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
            <b style={{ color: 'var(--color-text)' }}>{t('Типичная ошибка')}. </b>
            {bindShortWords(form.pitfall)}
          </span>
        </div>
      )}

      {/* Сравнение с соседями — половина вопросов к грамматике именно такие */}
      {form.contrast && form.contrast.length > 0 && (
        <Section title={t('Не путать с')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {form.contrast.map(c => {
              const other = all.forms.find(f => f.id === c.with)
              return (
                <button
                  key={c.with}
                  type="button"
                  onClick={() => other && onOpenForm(other.id)}
                  style={{
                    textAlign: 'left', cursor: other ? 'pointer' : 'default',
                    padding: '12px 14px', borderRadius: 14,
                    background: soft, border: `1px solid ${accent}33`,
                    display: 'flex', flexDirection: 'column', gap: 5,
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 14.5, fontWeight: 750, color: accent,
                  }}>
                    {other ? other.form : c.with}
                    {other && <ArrowRight size={13} />}
                  </span>
                  <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
                    {bindShortWords(c.note)}
                  </span>
                </button>
              )
            })}
          </div>
        </Section>
      )}

      <Quiz form={form} accent={accent} soft={soft} onDone={onQuizDone} />

      {form.unit && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--color-text-3)',
        }}>
          <GraduationCap size={14} style={{ color: accent }} />
          {t('В курсе эту форму проходят в юните')} {form.unit}
        </div>
      )}
    </div>
  )
}

// ─── Части карточки ──────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <header>
        <h3 style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)', margin: 0 }}>{title}</h3>
        {hint && (
          <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '3px 0 0', lineHeight: 1.5, ...proseWrap }}>
            {bindShortWords(hint)}
          </p>
        )}
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  )
}

function FormTable({ table, accent, soft }: {
  table: NonNullable<GrammarForm['table']>
  accent: string
  soft: string
}) {
  return (
    // Таблица шире экрана листается ВНУТРИ себя: горизонтальная прокрутка
    // страницы из-за одной таблицы ломает всю раскладку тренажёра.
    <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--color-border-soft)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
        <thead>
          <tr style={{ background: soft }}>
            {table.head.map((h, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '10px 13px', fontSize: 12,
                fontWeight: 750, color: accent, whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--color-border-soft)' }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '10px 13px', fontSize: 13, lineHeight: 1.5,
                  color: j === 0 ? 'var(--color-text)' : 'var(--color-text-2)',
                  fontWeight: j === 0 ? 650 : 400,
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Quiz({ form, accent, soft, onDone }: {
  form: GrammarForm
  accent: string
  soft: string
  onDone: (formId: string, score: number, total: number) => void
}) {
  const t = useT()
  // Ответы держим по индексу вопроса: сбрасываются вместе со сменой формы,
  // потому что key карточки — id формы.
  const [picked, setPicked] = useState<Record<number, number>>({})

  const answered = Object.keys(picked).length
  const score = useMemo(
    () => form.quiz.reduce((n, q, i) => n + (picked[i] === q.answer ? 1 : 0), 0),
    [picked, form],
  )

  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== undefined) return   // ответ даётся один раз
    const next = { ...picked, [qi]: oi }
    setPicked(next)
    if (Object.keys(next).length === form.quiz.length) {
      const s = form.quiz.reduce((n, q, i) => n + (next[i] === q.answer ? 1 : 0), 0)
      onDone(form.id, s, form.quiz.length)
    }
  }

  return (
    <Section
      title={t('Проверьте себя')}
      hint={t('Ответ даётся один раз — разбор появляется сразу после него.')}
    >
      {form.quiz.map((q, qi) => (
        <div key={qi} style={{
          padding: '14px 16px', borderRadius: 16,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
          display: 'flex', flexDirection: 'column', gap: 9,
        }}>
          <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.5, ...proseWrap }}>
            {bindShortWords(q.q)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {q.options.map((o, oi) => {
              const chosen = picked[qi] === oi
              const done = picked[qi] !== undefined
              const right = oi === q.answer
              // Верный вариант подсвечивается только ПОСЛЕ ответа: до него
              // подсказка обесценивает вопрос.
              const tone = !done ? 'idle' : right ? 'right' : chosen ? 'wrong' : 'idle'
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => pick(qi, oi)}
                  style={{
                    textAlign: 'left', cursor: done ? 'default' : 'pointer',
                    padding: '10px 13px', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 9,
                    fontSize: 13.5, lineHeight: 1.5,
                    color: 'var(--color-text-2)',
                    background: tone === 'right' ? 'var(--color-green-soft)'
                      : tone === 'wrong' ? 'var(--color-red-soft)'
                      : chosen ? soft : 'var(--color-bg-3)',
                    border: `1px solid ${
                      tone === 'right' ? 'var(--color-green-border)'
                      : tone === 'wrong' ? 'var(--color-red-border)'
                      : 'var(--color-border-soft)'}`,
                  }}
                >
                  {tone === 'right' && <Check size={14} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />}
                  {tone === 'wrong' && <X size={14} style={{ color: 'var(--color-red-text)', flexShrink: 0 }} />}
                  <span style={proseWrap}>{o}</span>
                </button>
              )
            })}
          </div>

          {picked[qi] !== undefined && (
            <div style={{
              fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-2)',
              padding: '10px 13px', borderRadius: 12, background: soft, ...proseWrap,
            }}>
              {bindShortWords(q.why)}
            </div>
          )}
        </div>
      ))}

      {answered === form.quiz.length && (
        <div style={{
          padding: '12px 16px', borderRadius: 14, background: soft,
          border: `1px solid ${accent}33`,
          fontSize: 13.5, fontWeight: 700, color: accent,
        }}>
          {score} / {form.quiz.length} — {score === form.quiz.length
            ? t('форма разобрана')
            : t('перечитайте примеры выше: разбор ответа объясняет, где сбились')}
        </div>
      )}
    </Section>
  )
}
