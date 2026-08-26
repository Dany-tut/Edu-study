import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Check, X, RotateCcw, Blocks } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useSwipeBack } from '../../lib/useSwipeBack'
import { proseWrap } from '../../lib/typography'
import { stopSpeech } from '../../lib/speech'
import { addCards } from '../../data/reviewDeck'
import {
  KO_ENDINGS, isMerged, tailOf, type Ending, type EndingVerb,
} from '../../data/koreanEndings'
import { Tile, TileGrid, TileChip, TileMeter } from './TrainerShell'
import { Block, SpeakBtn, TONE, say, shuffle, primaryBtn, ghostBtn } from './blockKit'
import type { MaterialResult } from '../../lib/trainerProgress'
import { SoundBadge } from '../SoundBadge'

// Конструктор форм: одна основа и восемь хвостов.
//
// ЧТО ЗДЕСЬ ПОКАЗЫВАЕТСЯ И ПОЧЕМУ ИМЕННО ТАК
// Таблица спряжений отвечает на вопрос «как выглядит форма». Этот экран
// отвечает на другой: «из чего она собрана». Поэтому основа стоит слева
// НЕПОДВИЖНО, а меняется только правая плитка — ровно то движение, которое и
// нужно запомнить. Восемь строк одной колонкой читаются как одно правило, а не
// как восемь слов.
//
// ХВОСТ В СТРОКЕ — КОНКРЕТНЫЙ, В РЕЙЛЕ — ОБЩИЙ. В шапке справочника написано
// «았/었어요», в строке основы 먹 стоит «었어요». Разница между общим видом и
// конкретным — это и есть гармония гласных, и увидеть её в двух соседних
// строках проще, чем прочитать правилом.
//
// ЧТО УХОДИТ В КОЛОДУ. Ошибки прогона — обычными карточками SM-2, как в гнёздах
// созвучий. Конструктор не подменяет повторения, он поставляет им материал.

/** Один вопрос прогона. */
type Question =
  /** Дан смысл — поставь хвост. */
  | { kind: 'build'; ending: Ending; options: Ending[] }
  /** Дана форма — что она значит. */
  | { kind: 'sense'; ending: Ending; options: Ending[] }

function buildRun(verb: EndingVerb): Question[] {
  const asked = shuffle(KO_ENDINGS.filter(e => verb.forms[e.id]))
  return asked.map((ending, i) => {
    // Оба направления в одном прогоне: только «собери форму» тренирует руку и
    // не трогает понимание, только «что это значит» — наоборот.
    //
    // Слитую форму собрать из плиток нельзя (봐요 — это не 보 + что-то), поэтому
    // её всегда спрашиваем со стороны смысла. Иначе в вариантах ответа она
    // отличалась бы от остальных длиной и выдавала себя без всякого знания.
    const kind: Question['kind'] = isMerged(verb, ending.id) ? 'sense' : i % 2 === 0 ? 'build' : 'sense'
    // В «собери форму» вариантами могут быть только отделимые хвосты: у слитой
    // формы хвоста нет, и кнопка с ней вышла бы пустой.
    const pool = asked.filter(e => e.id !== ending.id && (kind === 'sense' || !isMerged(verb, e.id)))
    return { kind, ending, options: shuffle([ending, ...shuffle(pool).slice(0, 3)]) }
  })
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

export function StemGrid({ verbs, results, accent, soft, onOpen }: {
  verbs: EndingVerb[]
  results: (dict: string) => MaterialResult | undefined
  accent: string
  soft: string
  onOpen: (dict: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={248}>
      {verbs.map(verb => {
        const res = results(verb.dict)
        const shown = KO_ENDINGS.filter(e => verb.forms[e.id])
        return (
          <Tile key={verb.dict} accent={accent} onClick={() => onOpen(verb.dict)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{verb.ru}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {shown.length} {t('форм')}
              </span>
            </span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Block accent={accent} size="md">{verb.stem}</Block>
              {/* Хвосты плитками прямо на витрине: по ним видно, что основа у
                  всех глаголов одна, а разница живёт справа. */}
              {shown.slice(0, 4).map(e => (
                <Block key={e.id} accent={accent} tone={e.tone} size="sm">
                  {tailOf(verb, e.id) || verb.forms[e.id].form}
                </Block>
              ))}
              {shown.length > 4 && (
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 700 }}>
                  +{shown.length - 4}
                </span>
              )}
            </span>
            <TileMeter value={res ? Math.round((res.score / Math.max(res.total, 1)) * 100) : 0} />
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
              <span>{res ? t('прогон был') : t('ещё не собирал')}</span>
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

// ─── Строка формы ────────────────────────────────────────────────────────────

/** Одна собранная форма: основа + хвост, перевод и озвучка. */
function FormRow({ verb, ending, lang, accent, tone, reading }: {
  verb: EndingVerb
  ending: Ending
  lang: string
  accent: string
  tone?: 'good' | 'bad'
  /** Показывать ли романизацию — общий тумблер тренажёра. */
  reading: boolean
}) {
  const t = useT()
  const form = verb.forms[ending.id]
  const merged = isMerged(verb, ending.id)
  if (!form) return null
  const border =
    tone === 'good' ? 'var(--color-green-accent)'
    : tone === 'bad' ? 'var(--color-red-border)'
    : 'var(--color-border-soft)'
  return (
    // Кружок звука ведёт строку слева — так разбор и читается: сначала
    // послушал, потом разглядываешь состав. Форма кружка общая на весь продукт
    // (components/SoundBadge): мягкая заливка, цветная иконка, приглушён до
    // наведения. Место своё, вид общий.
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      borderRadius: 16, border: `1px solid ${border}`, background: 'var(--color-bg-2)',
    }}>
      <SoundBadge
        accent={accent}
        soft={`${accent}22`}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); say(form.form, lang) }}
        label={t('Произнести')}
        size={30}
        style={{ position: 'static', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Слитая форма — одна плитка, а не две: границы кирпичей в ней нет,
              и показывать её значило бы учить тому, чего в языке не написано. */}
          {merged ? (
            <Block accent={accent} tone={ending.tone}>{form.form}</Block>
          ) : (
            <>
              <Block accent={accent}>{verb.stem}</Block>
              <Block accent={accent} tone={ending.tone}>{tailOf(verb, ending.id)}</Block>
            </>
          )}
          <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', marginLeft: 4 }}>{form.ru}</span>
        </div>
        {merged && (
          <div style={{ fontSize: 12, color: 'var(--color-muted)', ...proseWrap }}>
            {verb.stem} + {ending.block} {'→'} {form.form} {t('— основа слилась с хвостом')}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--color-text-3)' }}>{ending.label}</span>
          {reading && <span style={{ fontSize: 12, color: accent, opacity: 0.9 }}>{form.reading}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Разбор одной основы ─────────────────────────────────────────────────────

export function StemPage({ verb, lang, accent, soft, owner, subjectId, reading, onFinished, onBack }: {
  verb: EndingVerb
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
  // Свайп от левого края = кнопка «назад» дрилла (вложенный экран тренажёра).
  useSwipeBack(onBack)
  const endings = useMemo(() => KO_ENDINGS.filter(e => verb.forms[e.id]), [verb])

  const [run, setRun] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<Ending | null>(null)
  const [score, setScore] = useState(0)
  const missed = useRef<Ending[]>([])
  const [added, setAdded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const q = run?.[idx] ?? null
  const done = !!run && idx >= run.length

  // Форма звучит сама, когда вопрос про её смысл: услышать и понять — это и
  // есть проверяемое умение. В вопросе «собери» звучать нечему: формы ещё нет.
  useEffect(() => {
    if (!q || picked || q.kind !== 'sense') return
    const timer = window.setTimeout(() => say(verb.forms[q.ending.id].form, lang), 220)
    return () => clearTimeout(timer)
  }, [q, picked, lang, verb])

  useEffect(() => () => stopSpeech(), [])

  const cardsFor = useCallback((list: Ending[]) => list.map(e => ({
    subject: subjectId,
    source: 'trainer' as const,
    prompt: `${verb.dict} · ${t(e.label)} — ${t('как сказать?')}`,
    answer: `${verb.forms[e.id].form} — ${verb.forms[e.id].ru}`,
    options: endings.map(x => verb.forms[x.id].form),
  })), [verb, endings, subjectId])

  const takeAll = useCallback(async () => {
    setSaving(true)
    try {
      setAdded(await addCards(owner, cardsFor(endings)))
    } catch (e) {
      console.error('endings takeAll:', e)
      setAdded(0)
    } finally {
      setSaving(false)
    }
  }, [owner, cardsFor, endings])

  /** Ошибки прогона уходят в колоду — по расписанию вернутся сами. */
  const pushMissed = useCallback(async (list: Ending[]) => {
    if (list.length === 0) return
    const byId = new Map(list.map(e => [e.id, e]))
    try {
      await addCards(owner, cardsFor([...byId.values()]))
    } catch (e) {
      console.error('endings pushMissed:', e)
    }
  }, [owner, cardsFor])

  function start() {
    missed.current = []
    setScore(0)
    setIdx(0)
    setPicked(null)
    setRun(buildRun(verb))
  }

  function pick(ending: Ending) {
    if (picked || !q) return
    setPicked(ending)
    if (ending.id === q.ending.id) {
      setScore(s => s + 1)
      if (q.kind === 'build') say(verb.forms[q.ending.id].form, lang)
    } else {
      missed.current.push(q.ending)
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
        <TileChip tone="accent" accent={accent} soft={soft}>{verb.ru}</TileChip>
        <span style={{ fontSize: 21, fontWeight: 780, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          {verb.dict}
        </span>
        {reading && <span style={{ fontSize: 13, color: accent, opacity: 0.9 }}>{verb.reading}</span>}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-2)', margin: 0, ...proseWrap }}>
        {t('Основа')} <b>{verb.stem}</b>{' '}
        {t('не меняется ни в одной форме — меняется только хвост справа. Выучить нужно хвосты, а не формы.')}
      </p>
    </div>
  )

  // ── Прогон ────────────────────────────────────────────────────────────────

  if (run && !done && q) {
    const right = picked?.id === q.ending.id
    const form = verb.forms[q.ending.id]
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
            {q.kind === 'build' ? t('Собери форму') : t('Что это значит?')}
          </div>
          {q.kind === 'build' ? (
            <>
              <div style={{ fontSize: 19, fontWeight: 750, color: 'var(--color-text)', textAlign: 'center' }}>
                «{form.ru}»
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Block accent={accent} size="lg">{verb.stem}</Block>
                <Block accent={accent} size="lg" dashed={!picked} tone={picked ? q.ending.tone : undefined}
                  state={picked && !right ? 'bad' : undefined}>
                  {picked ? tailOf(verb, q.ending.id) : '?'}
                </Block>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isMerged(verb, q.ending.id) ? (
                <Block accent={accent} tone={q.ending.tone} size="lg">{form.form}</Block>
              ) : (
                <>
                  <Block accent={accent} size="lg">{verb.stem}</Block>
                  <Block accent={accent} tone={q.ending.tone} size="lg">{tailOf(verb, q.ending.id)}</Block>
                </>
              )}
              <SpeakBtn term={form.form} lang={lang} accent={accent} size={38} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {q.options.map(o => {
            const isAnswer = o.id === q.ending.id
            const chosen = picked?.id === o.id
            const show = !!picked && (isAnswer || chosen)
            return (
              <button
                key={o.id}
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
                {q.kind === 'build' ? tailOf(verb, o.id) : verb.forms[o.id].ru}
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
              {right ? t('Верно') : `${form.form} — ${form.ru}`}
            </div>
            {/* Подпись хвоста показывается ровно в момент ответа: тогда она
                читается как объяснение, а не как справка на полях. */}
            <div style={{
              fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-3)',
              padding: '10px 14px', borderRadius: 14,
              border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)', ...proseWrap,
            }}>
              <b style={{ color: TONE[q.ending.tone].fg }}>{q.ending.block}</b> — {q.ending.note}
            </div>
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
    const weak = [...new Map(missed.current.map(e => [e.id, e])).values()]
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
              ? t('Основа собрана целиком. Те же хвосты цепляются к любому глаголу — попробуй следующий.')
              : t('Формы, на которых промахнулся, уже в колоде повторений — они вернутся сами.')}
          </div>
        </div>
        {weak.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--color-muted)' }}>
              {t('Не собралось')}
            </div>
            {weak.map(e => (
              <FormRow key={e.id} verb={verb} ending={e} lang={lang} accent={accent} tone="bad" reading={reading} />
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
        <ChevronLeft size={14} /> {t('К основам')}
      </button>

      {header}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {endings.map(e => (
          <FormRow key={e.id} verb={verb} ending={e} lang={lang} accent={accent} reading={reading} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={start} style={primaryBtn(accent)}>
          <Blocks size={15} />
          {t('Собрать формы')}
        </button>
        <button onClick={takeAll} disabled={saving} style={ghostBtn(accent)}>
          {saving ? t('Добавляю…') : t('Взять формы в колоду')}
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
