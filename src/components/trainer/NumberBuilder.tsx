import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Check, X, RotateCcw, Blocks } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { stopSpeech } from '../../lib/speech'
import { addCards } from '../../data/reviewDeck'
import {
  CORE_NUMBERS, systemLabel, type NumberRow, type NumberSet, type NumberSystem,
} from '../../data/koreanNumbers'
import { Tile, TileGrid, TileChip, TileMeter } from './TrainerShell'
import { Block, SpeakBtn, TONE, say, shuffle, primaryBtn, ghostBtn } from './blockKit'
import type { EndingTone } from '../../data/koreanEndings'
import type { MaterialResult } from '../../lib/trainerProgress'
import { SoundBadge } from '../SoundBadge'

// Числа: два ряда счёта и счётные слова.
//
// ЗАЧЕМ ЭТО ЗДЕСЬ, А НЕ КАРТОЧКАМИ В КОЛОДЕ
// Числительное в карточке — это двадцать отдельных слов, из которых ученик
// потом всё равно не соберёт «세 시 삼십 분»: карточка не отвечает на вопрос,
// каким рядом считать сейчас. Ответ даёт ситуация, поэтому набор здесь — это
// ситуация («который час», «сколько стоит»), а не десяток чисел.
//
// ДВА РЯДА — ДВА ЦВЕТА. Исконный ряд везде одного цвета, китайский — другого, и
// цвет не меняется от набора к набору. Смотреть на 다섯 и 오 как на «разные
// слова для пятёрки» бесполезно; полезно видеть, из какого они ряда.
//
// ТАБЛИЦА 1–10 — ПЕРВЫЙ НАБОР И ЕДИНСТВЕННЫЙ ТАБЛИЧНЫЙ. Две системы рядом
// читаются только колонками; списком из двадцати строк это двадцать слов.

/** Цвет ряда. Исконный — тёплый, китайский — холодный, смешанный — оба. */
const SYSTEM_TONE: Record<NumberSystem, EndingTone> = {
  native: 'peach',
  sino: 'blue',
  mixed: 'purple',
}

/** Каким рядом записана форма — по ней и красится плитка. */
const NATIVE_FORMS = new Set([
  ...CORE_NUMBERS.map(n => n.native),
  ...CORE_NUMBERS.map(n => n.attr ?? n.native),
  '스물', '스무', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔',
])

/**
 * Цвет плитки числа.
 *
 * Считается по первому слогу: 스물한 и 마흔다섯 в списке исконных целиком не
 * лежат, но начинаются с исконного десятка, и красить их китайским рядом было
 * бы прямой дезинформацией.
 */
function numTone(num: string): EndingTone {
  const head = num.split(' ')[0]
  // Сравнение по началу, а не по целому слову: 열두, 스물한 и 마흔다섯 в списке
  // не лежат, но начинаются с исконного десятка. Ни одна форма китайского ряда
  // с исконного числительного не начинается, так что ложных срабатываний тут
  // нет — проверено на всех формах наборов.
  const native = NATIVE_FORMS.has(head) || [...NATIVE_FORMS].some(f => head.startsWith(f))
  return native ? SYSTEM_TONE.native : SYSTEM_TONE.sino
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

export function NumberGrid({ sets, results, accent, soft, onOpen }: {
  sets: NumberSet[]
  results: (id: string) => MaterialResult | undefined
  accent: string
  soft: string
  onOpen: (id: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={248}>
      {sets.map(set => {
        const res = results(set.id)
        return (
          <Tile key={set.id} accent={accent} onClick={() => onOpen(set.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{t(systemLabel(set.system))}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {set.rows.length} {t('форм')}
              </span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <span style={{
                fontSize: 16.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}>
                {t(set.title)}
              </span>
              <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {set.rows.slice(0, 3).map(row => (
                  <Block key={row.form} accent={accent} tone={numTone(row.num ?? row.form)} size="sm">
                    {row.form}
                  </Block>
                ))}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.45 }}>{t(set.when)}</span>
            </span>
            <TileMeter value={res ? Math.round((res.score / Math.max(res.total, 1)) * 100) : 0} />
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
              <span>{res ? t('прогон был') : t('ещё не считал')}</span>
              {res && (
                <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>
                  {res.score} / {res.total}
                </span>
              )}
            </span>
          </Tile>
        )
      })}
    </TileGrid>
  )
}

// ─── Таблица двух рядов ──────────────────────────────────────────────────────

/**
 * Счёт 1–10 колонками.
 *
 * Сетка, а не <table>: строки должны переноситься на узком экране, а таблица
 * этого не умеет — она уезжает вбок вместе со всей страницей.
 */
function CoreTable({ lang, accent, reading }: { lang: string; accent: string; reading: boolean }) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '38px 1fr 1fr', gap: 10, padding: '0 14px',
        fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase',
        color: 'var(--color-text-3)',
      }}>
        <span>№</span>
        <span style={{ color: TONE[SYSTEM_TONE.native].fg }}>{t('счётом вещей')}</span>
        <span style={{ color: TONE[SYSTEM_TONE.sino].fg }}>{t('числом')}</span>
      </div>
      {CORE_NUMBERS.map(n => (
        <div key={n.digit} style={{
          display: 'grid', gridTemplateColumns: '38px 1fr 1fr', gap: 10, alignItems: 'center',
          padding: '9px 14px', borderRadius: 16,
          border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-3)' }}>{n.digit}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Block accent={accent} tone={SYSTEM_TONE.native} size="sm">{n.native}</Block>
            {/* Короткая форма стоит рядом со словарной, а не в сноске: в живой
                речи «두 개» встречается чаще, чем само 둘. */}
            {n.attr && (
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {'→'} {n.attr} + {t('счётное слово')}
              </span>
            )}
            {reading && <span style={{ fontSize: 11.5, color: accent, opacity: 0.9 }}>{n.nativeReading}</span>}
            {/* Звук ячейки — в её правом краю: слева он вёл строку и спорил с
                самим числом, ради которого таблица и открыта. */}
            <SpeakBtn term={n.native} lang={lang} accent={accent} size={26} style={{ marginLeft: 'auto' }} />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Block accent={accent} tone={SYSTEM_TONE.sino} size="sm">{n.sino}</Block>
            {reading && <span style={{ fontSize: 11.5, color: accent, opacity: 0.9 }}>{n.sinoReading}</span>}
            <SpeakBtn term={n.sino} lang={lang} accent={accent} size={26} style={{ marginLeft: 'auto' }} />
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Строка набора ───────────────────────────────────────────────────────────

function NumberRowView({ row, lang, accent, tone, reading }: {
  row: NumberRow
  lang: string
  accent: string
  tone?: 'good' | 'bad'
  reading: boolean
}) {
  const t = useT()
  const border =
    tone === 'good' ? 'var(--color-green-accent)'
    : tone === 'bad' ? 'var(--color-red-border)'
    : 'var(--color-border-soft)'
  return (
    // Значок звука в правом верхнем углу строки — тот же угол, что у строк
    // остальных конструкторов, у карточки слова и у фразы разговорника.
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', paddingRight: 48,
      borderRadius: 16, border: `1px solid ${border}`, background: 'var(--color-bg-2)',
    }}>
      <SoundBadge
        accent={accent}
        soft={`${accent}22`}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); say(row.form, lang) }}
        label={t('Произнести')}
        size={30}
        inset={12}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {row.num && row.counter ? (
            <>
              <Block accent={accent} tone={numTone(row.num)}>{row.num}</Block>
              <Block accent={accent}>{row.counter}</Block>
            </>
          ) : (
            <Block accent={accent} tone={numTone(row.form)}>{row.form}</Block>
          )}
          <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', marginLeft: 4 }}>{row.ru}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          {reading && <span style={{ fontSize: 12, color: accent, opacity: 0.9 }}>{row.reading}</span>}
          {row.note && (
            <span style={{ fontSize: 12, color: 'var(--color-muted)', ...proseWrap }}>{row.note}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Разбор набора ───────────────────────────────────────────────────────────

/** Один вопрос: собрать форму по смыслу или понять услышанное. */
interface Question {
  kind: 'build' | 'sense'
  row: NumberRow
  options: NumberRow[]
}

/** Сколько вопросов в прогоне: больше десятка — уже не разминка, а экзамен. */
const RUN_MAX = 10

function buildRun(set: NumberSet): Question[] {
  const asked = shuffle(set.rows).slice(0, RUN_MAX)
  return asked.map((row, i) => {
    // Варианты берём из того же набора: «пять человек» против «пять штук»
    // проверяет счётное слово, а «다섯» против «오» — выбор ряда. Оба различия
    // живут внутри набора, а варианты из чужого набора отгадывались бы по теме.
    const pool = set.rows.filter(x => x.form !== row.form)
    return {
      kind: i % 2 === 0 ? 'build' : 'sense',
      row,
      options: shuffle([row, ...shuffle(pool).slice(0, 3)]),
    }
  })
}

export function NumberPage({ set, lang, accent, soft, owner, subjectId, reading, onFinished, onBack }: {
  set: NumberSet
  lang: string
  accent: string
  soft: string
  owner: { studentId?: string; anonName?: string }
  subjectId: string
  reading: boolean
  onFinished: (score: number, total: number) => void
  onBack: () => void
}) {
  const t = useT()

  const [run, setRun] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<NumberRow | null>(null)
  const [score, setScore] = useState(0)
  const missed = useRef<NumberRow[]>([])
  const [added, setAdded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const q = run?.[idx] ?? null
  const done = !!run && idx >= run.length

  // Форма звучит сама, когда вопрос про её смысл: числа на слух и подводят —
  // 사 и 오 в потоке речи различаются одной гласной.
  useEffect(() => {
    if (!q || picked || q.kind !== 'sense') return
    const timer = window.setTimeout(() => say(q.row.form, lang), 220)
    return () => clearTimeout(timer)
  }, [q, picked, lang])

  useEffect(() => () => stopSpeech(), [])

  const cardsFor = useCallback((list: NumberRow[]) => list.map(row => ({
    subject: subjectId,
    source: 'trainer' as const,
    prompt: `${row.ru} — как сказать? (${t(set.title)})`,
    answer: `${row.form} — ${row.ru}`,
    options: set.rows.map(x => x.form),
  })), [set, subjectId, t])

  const takeAll = useCallback(async () => {
    setSaving(true)
    try {
      setAdded(await addCards(owner, cardsFor(set.rows)))
    } catch (e) {
      console.error('numbers takeAll:', e)
      setAdded(0)
    } finally {
      setSaving(false)
    }
  }, [owner, cardsFor, set])

  const pushMissed = useCallback(async (list: NumberRow[]) => {
    if (list.length === 0) return
    const byForm = new Map(list.map(x => [x.form, x]))
    try {
      await addCards(owner, cardsFor([...byForm.values()]))
    } catch (e) {
      console.error('numbers pushMissed:', e)
    }
  }, [owner, cardsFor])

  function start() {
    missed.current = []
    setScore(0)
    setIdx(0)
    setPicked(null)
    setRun(buildRun(set))
  }

  function pick(row: NumberRow) {
    if (picked || !q) return
    setPicked(row)
    if (row.form === q.row.form) {
      setScore(s => s + 1)
      if (q.kind === 'build') say(q.row.form, lang)
    } else {
      missed.current.push(q.row)
    }
  }

  function next() {
    if (!run) return
    const last = idx + 1 >= run.length
    setPicked(null)
    setIdx(i => i + 1)
    if (last) {
      onFinished(score, run.length)
      void pushMissed(missed.current)
    }
  }

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <TileChip tone="accent" accent={accent} soft={soft}>{t(systemLabel(set.system))}</TileChip>
        <span style={{ fontSize: 21, fontWeight: 780, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          {t(set.title)}
        </span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-2)', margin: 0, ...proseWrap }}>
        {t(set.note)}
      </p>
    </div>
  )

  // ── Прогон ────────────────────────────────────────────────────────────────

  if (run && !done && q) {
    const right = picked?.form === q.row.form
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {header}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 700 }}>
            {idx + 1} / {run.length}
          </span>
          <span style={{ flex: 1 }}><TileMeter value={Math.round((idx / run.length) * 100)} /></span>
          <span style={{ fontSize: 12, color: 'var(--color-green-text)', fontWeight: 700 }}>{score}</span>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          padding: '26px 18px', borderRadius: 20,
          border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700, textAlign: 'center' }}>
            {q.kind === 'build' ? t('Как это сказать?') : t('Что прозвучало?')}
          </div>
          {q.kind === 'build' ? (
            <>
              <div style={{ fontSize: 19, fontWeight: 750, color: 'var(--color-text)', textAlign: 'center' }}>
                «{q.row.ru}»
              </div>
              {/* Счётное слово стоит на месте с самого начала: спрашиваем не
                  «что тут вообще», а выбор числа и ряда. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Block accent={accent} size="lg" dashed={!picked}
                  tone={picked ? numTone(q.row.num ?? q.row.form) : undefined}
                  state={picked && !right ? 'bad' : undefined}>
                  {picked ? (q.row.num ?? q.row.form) : '?'}
                </Block>
                {q.row.counter && <Block accent={accent} size="lg">{q.row.counter}</Block>}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Block accent={accent} tone={numTone(q.row.num ?? q.row.form)} size="lg">
                {q.row.num ?? q.row.form}
              </Block>
              {q.row.counter && <Block accent={accent} size="lg">{q.row.counter}</Block>}
              <SpeakBtn term={q.row.form} lang={lang} accent={accent} size={38} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {q.options.map(o => {
            const isAnswer = o.form === q.row.form
            const chosen = picked?.form === o.form
            const show = !!picked && (isAnswer || chosen)
            return (
              <button
                key={o.form}
                onClick={() => pick(o)}
                disabled={!!picked}
                style={{
                  padding: '13px 12px', borderRadius: 16, cursor: picked ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: q.kind === 'build' ? 19 : 14.5, fontWeight: 700, lineHeight: 1.3,
                  border: `1.5px solid ${
                    show && isAnswer ? 'var(--color-green-accent)'
                    : show ? 'var(--color-red-border)'
                    : 'var(--color-border-medium)'}`,
                  background: show && isAnswer ? 'var(--color-green-soft)'
                    : show ? 'var(--color-red-soft)'
                    : 'var(--color-bg-2)',
                  color: 'var(--color-text)',
                }}
              >
                {q.kind === 'build' ? (o.num ?? o.form) : o.ru}
              </button>
            )
          })}
        </div>

        {picked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 750,
              color: right ? 'var(--color-green-text)' : 'var(--color-red-text)',
            }}>
              {right ? <Check size={16} /> : <X size={16} />}
              {right ? t('Верно') : `${q.row.form} — ${q.row.ru}`}
            </div>
            <NumberRowView row={q.row} lang={lang} accent={accent} tone={right ? 'good' : 'bad'} reading={reading} />
            <button onClick={next} style={primaryBtn(accent)}>
              {idx + 1 >= run.length ? t('Итог') : t('Дальше')}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Итог прогона ──────────────────────────────────────────────────────────

  if (run && done) {
    const total = run.length
    const pct = Math.round((score / Math.max(total, 1)) * 100)
    const weak = [...new Map(missed.current.map(x => [x.form, x])).values()]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {header}
        <div style={{
          padding: '22px 18px', borderRadius: 20, textAlign: 'center',
          border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
        }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text)' }}>{score} / {total}</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 6, ...proseWrap }}>
            {pct === 100
              ? t('Набор взят. Числа забываются не пониманием, а скоростью — вернись к нему через пару дней.')
              : t('Формы, на которых промахнулся, уже в колоде повторений — они вернутся сами.')}
          </div>
        </div>
        {weak.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--color-muted)' }}>{t('Не сошлось')}</div>
            {weak.map(x => (
              <NumberRowView key={x.form} row={x} lang={lang} accent={accent} tone="bad" reading={reading} />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={start} style={primaryBtn(accent)}>
            <RotateCcw size={14} />
            {t('Ещё прогон')}
          </button>
          <button onClick={() => setRun(null)} style={ghostBtn(accent)}>{t('К разбору')}</button>
        </div>
      </div>
    )
  }

  // ── Разбор ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{
        alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px 6px 8px',
        borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-2)',
      }}>
        <ChevronLeft size={14} /> {t('К числам')}
      </button>

      {header}

      {set.table ? (
        <CoreTable lang={lang} accent={accent} reading={reading} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {set.rows.map(row => (
            <NumberRowView key={row.form} row={row} lang={lang} accent={accent} reading={reading} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={start} style={primaryBtn(accent)}>
          <Blocks size={15} />
          {t('Посчитать')}
        </button>
        <button onClick={takeAll} disabled={saving} style={ghostBtn(accent)}>
          {saving ? t('Добавляю…') : t('Взять числа в колоду')}
        </button>
        {added !== null && (
          <span style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>
            {added > 0 ? `${t('Добавлено карточек:')} ${added}` : t('Всё это уже в колоде.')}
          </span>
        )}
      </div>
    </div>
  )
}
