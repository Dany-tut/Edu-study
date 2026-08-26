import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Check, X, RotateCcw, BookOpenCheck } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useSwipeBack } from '../../lib/useSwipeBack'
import { proseWrap } from '../../lib/typography'
import { subjectFill } from '../../lib/subjects'
import { speak, speechText, stopSpeech } from '../../lib/speech'
import { transcribe } from '../../lib/translit'
import { addCards } from '../../data/reviewDeck'
import type { PronExample, PronRule } from '../../data/koreanPronRules'
import { Tile, TileGrid, TileChip, TileMeter } from './TrainerShell'
import type { MaterialResult } from '../../lib/trainerProgress'
import { SoundBadge } from '../SoundBadge'

// Правила чтения: витрина и разбор одного правила.
//
// УСТРОЙСТВО ТО ЖЕ, ЧТО У ГНЁЗД СОЗВУЧИЙ (SoundNestDrill), НО ВОПРОС ОБРАТНЫЙ.
// Гнездо спрашивает «что прозвучало?» — тренирует ухо. Правило спрашивает «как
// прозвучит написанное?» — тренирует глаз: ученик видит 꽃이 и выбирает между
// [꼬치], [꼬디] и [꼳이]. Звук здесь приходит ПОСЛЕ ответа, как подтверждение:
// сыграй его до — и вопрос отвечался бы ухом, а не правилом.
//
// ЧТО УХОДИТ В СТОПКУ. Промахи: слово, чьё чтение ученик собрал неверно,
// ложится карточкой «Как звучит 꽃이?» в колоду повторений и вернётся по
// расписанию — правило закрепляется на том самом слове, где споткнулся.

function say(term: string, lang: string, rate = 0.85) {
  speak(speechText(term), { lang, rate })
}

/** Что озвучивать: у правил звучания — написанное (TTS сам применит правило),
 *  у правила письма written содержит ханчу и стрелки — звучит готовое слово. */
const voiceOf = (rule: PronRule, ex: PronExample) =>
  rule.kind === 'sound' ? ex.written : ex.spoken

/** Ответ в плитке и в карточке: чтение — в скобках произношения, письмо — как есть. */
const spokenLabel = (rule: PronRule, s: string) =>
  rule.kind === 'sound' ? `[${s}]` : s

const questionOf = (rule: PronRule, t: (s: string) => string) =>
  rule.kind === 'sound' ? t('Как звучит написанное?') : t('Корень встал в начало слова — как пишется целое?')

// ─── Витрина ─────────────────────────────────────────────────────────────────

export function PronGrid({ rules, results, accent, soft, onOpen }: {
  rules: PronRule[]
  results: (id: string) => MaterialResult | undefined
  accent: string
  soft: string
  onOpen: (id: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={248}>
      {rules.map(rule => {
        const res = results(rule.id)
        return (
          <Tile key={rule.id} accent={accent} onClick={() => onOpen(rule.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{rule.ko}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {rule.examples.length} {t('слов')}
              </span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{
                fontSize: 16, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}>
                {t(rule.title)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5, ...proseWrap }}>
                {t(rule.tagline)}
              </span>
            </span>
            <TileMeter value={res ? Math.round((res.score / Math.max(res.total, 1)) * 100) : 0} />
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
              <span>{res ? t('прогон был') : t('ещё не проверял')}</span>
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

// ─── Разбор одного правила ───────────────────────────────────────────────────

/** Строка примера: написано → звучит, транскрипция, перевод и что сработало. */
function ExampleRow({ rule, ex, lang, accent, tone }: {
  rule: PronRule
  ex: PronExample
  lang: string
  accent: string
  tone?: 'good' | 'bad'
}) {
  const border =
    tone === 'good' ? 'var(--color-green-accent)'
    : tone === 'bad' ? 'var(--color-red-border)'
    : 'var(--color-border-soft)'
  const cyr = transcribe(ex.spoken, lang)
  return (
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', paddingRight: 48,
      borderRadius: 16, border: `1px solid ${border}`, background: 'var(--color-bg-2)',
    }}>
      <SoundBadge
        accent={accent}
        soft={`${accent}22`}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); say(voiceOf(rule, ex), lang) }}
        label="Произнести"
        size={30}
        inset={12}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 19, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.25 }}>
            {ex.written}
          </span>
          <span style={{ fontSize: 15, fontWeight: 750, color: accent }}>
            → {spokenLabel(rule, ex.spoken)}
          </span>
          {cyr && <span style={{ fontSize: 12.5, color: accent, opacity: 0.85 }}>{cyr}</span>}
          <span style={{ fontSize: 13.5, color: 'var(--color-text-2)' }}>{ex.ru}</span>
        </div>
        {ex.note && (
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-3)', marginTop: 5, ...proseWrap }}>
            {ex.note}
          </div>
        )}
      </div>
    </div>
  )
}

/** Один вопрос прогона: пример и перетасованные варианты чтения. */
interface Question {
  ex: PronExample
  options: string[]
}

function buildRun(rule: PronRule): Question[] {
  const shuffle = <T,>(list: T[]): T[] => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  // Каждый пример спрашивается один раз: у правила их пять-шесть, и второй круг
  // подряд отвечался бы по памяти позиций, а не по правилу. Возврат — через
  // колоду повторений и через «Ещё прогон» с новой тасовкой.
  return shuffle(rule.examples).map(ex => ({
    ex,
    options: shuffle([ex.spoken, ...ex.distractors]),
  }))
}

export function PronPage({ rule, lang, accent, soft, owner, subjectId, onFinished, onBack }: {
  rule: PronRule
  lang: string
  accent: string
  soft: string
  owner: { studentId?: string; anonName?: string }
  subjectId: string
  onFinished: (score: number, total: number) => void
  onBack: () => void
}) {
  const t = useT()
  // Свайп от левого края = кнопка «назад» дрилла (вложенный экран тренажёра).
  useSwipeBack(onBack)
  const [run, setRun] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const missed = useRef<PronExample[]>([])
  const [added, setAdded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const q = run?.[idx] ?? null
  const done = !!run && idx >= run.length

  useEffect(() => () => stopSpeech(), [])

  const cardOf = useCallback((ex: PronExample) => ({
    subject: subjectId,
    source: 'trainer' as const,
    prompt: rule.kind === 'sound' ? `${t('Как звучит')} ${ex.written}?` : `${t('Как пишется в начале слова:')} ${ex.written}?`,
    answer: `${spokenLabel(rule, ex.spoken)} — ${ex.ru}`,
    options: [ex.spoken, ...ex.distractors].map(s => spokenLabel(rule, s)),
  }), [rule, subjectId])

  const takeAll = useCallback(async () => {
    setSaving(true)
    try {
      setAdded(await addCards(owner, rule.examples.map(cardOf)))
    } catch (e) {
      console.error('pron takeAll:', e)
      setAdded(0)
    } finally {
      setSaving(false)
    }
  }, [owner, rule, cardOf])

  /** Ошибки прогона уходят в колоду — по расписанию вернутся сами. */
  const pushMissed = useCallback(async (list: PronExample[]) => {
    if (list.length === 0) return
    const byTerm = new Map(list.map(ex => [ex.written, ex]))
    try {
      await addCards(owner, [...byTerm.values()].map(cardOf))
    } catch (e) {
      console.error('pron pushMissed:', e)
    }
  }, [owner, cardOf])

  function start() {
    missed.current = []
    setScore(0)
    setIdx(0)
    setPicked(null)
    setRun(buildRun(rule))
  }

  function pick(option: string) {
    if (picked || !q) return
    setPicked(option)
    if (option === q.ex.spoken) setScore(s => s + 1)
    else missed.current.push(q.ex)
    // Звук — после ответа, как подтверждение: до ответа он выдал бы решение.
    window.setTimeout(() => say(voiceOf(rule, q.ex), lang), 250)
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
        <TileChip tone="accent" accent={accent} soft={soft}>{rule.ko}</TileChip>
        <span style={{ fontSize: 21, fontWeight: 780, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          {t(rule.title)}
        </span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: accent, ...proseWrap }}>
        {t(rule.tagline)}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-2)', margin: 0, ...proseWrap }}>
        {t(rule.why)}
      </p>
    </div>
  )

  // ── Прогон ────────────────────────────────────────────────────────────────

  if (run && !done && q) {
    const right = picked === q.ex.spoken
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

        {/* Написанное слово — сам вопрос. Без звука: озвучка сыграет после
            ответа, иначе правило можно не знать, а расслышать. */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
          padding: '20px 18px', borderRadius: 20,
          border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700 }}>
            {questionOf(rule, t)}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {q.ex.written}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-3)' }}>{q.ex.ru}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {q.options.map(o => {
            const isAnswer = o === q.ex.spoken
            const chosen = picked === o
            const show = !!picked && (isAnswer || chosen)
            return (
              <button
                key={o}
                onClick={() => pick(o)}
                disabled={!!picked}
                style={{
                  padding: '14px 12px', borderRadius: 16, cursor: picked ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: 20, fontWeight: 750, lineHeight: 1.2,
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
                {spokenLabel(rule, o)}
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
              {right ? t('Верно') : `${q.ex.written} → ${spokenLabel(rule, q.ex.spoken)}`}
            </div>
            {/* Разбор примера показывается ровно в момент ответа: тогда note
                читается как ответ на «а почему», а не как справка. */}
            <ExampleRow rule={rule} ex={q.ex} lang={lang} accent={accent} tone={right ? 'good' : 'bad'} />
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
    const weak = [...new Map(missed.current.map(ex => [ex.written, ex])).values()]
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
              ? t('Правило прочитано без промахов. Оно ещё вернётся в текстах — там и проверится по-настоящему.')
              : t('Слова, на которых промахнулся, уже в колоде повторений — они вернутся сами.')}
          </div>
        </div>
        {weak.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--color-muted)' }}>
              {t('Прочитал не так')}
            </div>
            {weak.map(ex => <ExampleRow key={ex.written} rule={rule} ex={ex} lang={lang} accent={accent} tone="bad" />)}
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
        <ChevronLeft size={14} /> {t('К правилам')}
      </button>

      {header}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rule.examples.map(ex => <ExampleRow key={ex.written} rule={rule} ex={ex} lang={lang} accent={accent} />)}
      </div>

      {rule.trap && (
        <div style={{
          padding: '12px 14px', borderRadius: 16,
          border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
          fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-muted)', ...proseWrap,
        }}>
          {t(rule.trap)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={start} style={primaryBtn(accent)}>
          <BookOpenCheck size={15} />
          {t('Проверить чтение')}
        </button>
        <button onClick={takeAll} disabled={saving} style={ghostBtn(accent)}>
          {saving ? t('Добавляю…') : t('Взять слова в колоду')}
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

// ─── Кнопки ──────────────────────────────────────────────────────────────────
// Геометрия и раскраска — те же, что у гнёзд созвучий (см. SoundNestDrill).

const BTN_H = 42

const btnBase: React.CSSProperties = {
  height: BTN_H, boxSizing: 'border-box', borderRadius: 999, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750, lineHeight: 1, whiteSpace: 'nowrap',
}

const primaryBtn = (accent: string): React.CSSProperties => ({
  ...btnBase,
  padding: '0 20px', border: 'none',
  background: subjectFill(accent), color: '#fff',
})

const ghostBtn = (accent: string): React.CSSProperties => ({
  ...btnBase,
  padding: '0 18px',
  border: `1.5px solid ${accent}`, background: 'transparent', color: accent,
})
