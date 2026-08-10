import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, ChevronLeft, Check, X, RotateCcw, Ear, Sparkle } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { speechLocale, speechText } from '../../lib/speech'
import { addCards } from '../../data/reviewDeck'
import { nestAxisLabel, nestPrompt, type NestWord, type SoundNest } from '../../data/soundNests'
import { Tile, TileGrid, TileChip, TileMeter } from './TrainerShell'
import type { MaterialResult } from '../../lib/trainerProgress'

// Гнёзда созвучий: витрина и разбор одного гнезда.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ЭКРАН, А НЕ ЕЩЁ ОДИН ТИП КАРТОЧКИ В СТОПКЕ
// Стопка отвечает на вопрос «помню ли я это слово». Гнездо отвечает на другой:
// «слышу ли я разницу». Разница слышится только в сравнении, поэтому все слова
// гнезда должны стоять на экране ОДНОВРЕМЕННО — а карточка по устройству
// показывает ровно одну сторону одного слова.
//
// ЧТО УХОДИТ В СТОПКУ. Ошибки. Промахнулся на 불 против 뿔 — слово ложится в
// колоду повторений обычной карточкой и вернётся по расписанию SM-2. То есть
// гнездо не подменяет интервальные повторения, а поставляет им материал —
// ровно тот, на котором ученик реально спотыкается.

/** Сколько вопросов в прогоне на одно слово гнезда. */
const PASSES = 2

function speak(term: string, lang: string, rate = 0.85) {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(speechText(term))
  const locale = speechLocale(lang)
  if (locale) u.lang = locale
  u.rate = rate
  speechSynthesis.speak(u)
}

/** Кнопка-динамик. Одна на все места экрана. */
function SpeakBtn({ term, lang, accent, size = 30 }: {
  term: string
  lang: string
  accent: string
  size?: number
}) {
  const t = useT()
  return (
    <button
      onClick={e => { e.stopPropagation(); speak(term, lang) }}
      title={t('Произнести')}
      aria-label={t('Произнести')}
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: '50%', border: 'none',
        cursor: 'pointer', display: 'grid', placeItems: 'center',
        background: `${accent}22`, color: accent,
      }}
    >
      <Volume2 size={Math.round(size * 0.47)} />
    </button>
  )
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

export function NestGrid({ nests, results, accent, soft, onOpen }: {
  nests: SoundNest[]
  /** Прошлые прогоны по id гнезда — для полоски и счёта на плитке. */
  results: (id: string) => MaterialResult | undefined
  accent: string
  soft: string
  onOpen: (id: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={248}>
      {nests.map(nest => {
        const res = results(nest.id)
        return (
          <Tile key={nest.id} accent={accent} onClick={() => onOpen(nest.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{t(nestAxisLabel(nest.axis))}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {nest.words.length} {t('слова')}
              </span>
            </span>
            <span style={{
              flex: 1, fontSize: 17, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.35,
              letterSpacing: '-0.01em',
            }}>
              {nest.title}
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

// ─── Разбор одного гнезда ────────────────────────────────────────────────────

/** Строка слова в разборе: слово, чтение, перевод и чем отличается. */
function WordRow({ word, lang, accent, tone }: {
  word: NestWord
  lang: string
  accent: string
  /** Подсветка после ответа: верное зелёным, промах красным. */
  tone?: 'good' | 'bad'
}) {
  const border =
    tone === 'good' ? 'var(--color-green-accent)'
    : tone === 'bad' ? 'var(--color-red-border)'
    : 'var(--color-border-soft)'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
      borderRadius: 16, border: `1px solid ${border}`, background: 'var(--color-bg-2)',
    }}>
      <SpeakBtn term={word.term} lang={lang} accent={accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 19, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.25 }}>
            {word.term}
          </span>
          <span style={{ fontSize: 12.5, color: accent, opacity: 0.9 }}>{word.reading}</span>
          <span style={{ fontSize: 13.5, color: 'var(--color-text-2)' }}>{word.ru}</span>
        </div>
        {word.tip && (
          <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-3)', marginTop: 5, ...proseWrap }}>
            {word.tip}
          </div>
        )}
      </div>
    </div>
  )
}

/** Один вопрос прогона: какое слово прозвучало. */
interface Question {
  word: NestWord
  /** Порядок вариантов — свой у каждого вопроса, иначе ответ запоминается по месту. */
  options: NestWord[]
}

function buildRun(nest: SoundNest): Question[] {
  const shuffle = <T,>(list: T[]): T[] => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  // Каждое слово спрашивается PASSES раз: с одного попадания в четырёх
  // вариантах можно угадать, с двух подряд — уже вряд ли.
  const asked = shuffle(Array.from({ length: PASSES }, () => nest.words).flat())
  return asked.map(word => ({ word, options: shuffle(nest.words) }))
}

export function NestPage({ nest, lang, accent, soft, owner, subjectId, onFinished, onBack }: {
  nest: SoundNest
  lang: string
  accent: string
  soft: string
  owner: { studentId?: string; anonName?: string }
  subjectId: string
  /** Прогон закончен: счёт и всего — экран снаружи пишет результат. */
  onFinished: (score: number, total: number) => void
  onBack: () => void
}) {
  const t = useT()
  // Омонимы на слух не различаются по определению: спрашивать «какое
  // прозвучало» у них не имеет верного ответа. Остаётся разбор и колода.
  const audible = nest.axis !== 'homonym'

  const [run, setRun] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<NestWord | null>(null)
  const [score, setScore] = useState(0)
  const missed = useRef<NestWord[]>([])
  const [added, setAdded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const q = run?.[idx] ?? null
  const done = !!run && idx >= run.length

  // Слово звучит само при появлении вопроса: тыкать «слушать» перед каждым
  // ответом — лишний клик на ровном месте. Повторить можно кнопкой.
  useEffect(() => {
    if (!q || picked) return
    const timer = window.setTimeout(() => speak(q.word.term, lang), 220)
    return () => clearTimeout(timer)
  }, [q, picked, lang])

  useEffect(() => () => { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() }, [])

  const cards = useMemo(
    () => nest.words.map(w => ({
      subject: subjectId,
      source: 'trainer' as const,
      prompt: nestPrompt(nest, w),
      answer: `${w.term} — ${w.ru}`,
      options: nest.words.map(x => x.term),
    })),
    [nest, subjectId],
  )

  const takeAll = useCallback(async () => {
    setSaving(true)
    try {
      setAdded(await addCards(owner, cards))
    } catch (e) {
      console.error('nest takeAll:', e)
      setAdded(0)
    } finally {
      setSaving(false)
    }
  }, [owner, cards])

  /** Ошибки прогона уходят в колоду — по расписанию вернутся сами. */
  const pushMissed = useCallback(async (words: NestWord[]) => {
    if (words.length === 0) return
    const byTerm = new Map(words.map(w => [w.term, w]))
    try {
      await addCards(owner, [...byTerm.values()].map(w => ({
        subject: subjectId,
        source: 'trainer' as const,
        prompt: nestPrompt(nest, w),
        answer: `${w.term} — ${w.ru}`,
        options: nest.words.map(x => x.term),
      })))
    } catch (e) {
      console.error('nest pushMissed:', e)
    }
  }, [owner, subjectId, nest])

  function start() {
    missed.current = []
    setScore(0)
    setIdx(0)
    setPicked(null)
    setRun(buildRun(nest))
  }

  function pick(word: NestWord) {
    if (picked || !q) return
    setPicked(word)
    if (word.term === q.word.term) setScore(s => s + 1)
    else missed.current.push(q.word)
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
        <TileChip tone="accent" accent={accent} soft={soft}>{t(nestAxisLabel(nest.axis))}</TileChip>
        <span style={{ fontSize: 21, fontWeight: 780, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
          {nest.title}
        </span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-2)', margin: 0, ...proseWrap }}>
        {nest.why}
      </p>
    </div>
  )

  // ── Прогон ────────────────────────────────────────────────────────────────

  if (run && !done && q) {
    const right = picked?.term === q.word.term
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
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '26px 18px', borderRadius: 20,
          border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700 }}>
            {t('Какое слово прозвучало?')}
          </div>
          <button
            onClick={() => speak(q.word.term, lang)}
            style={{
              width: 68, height: 68, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', background: `${accent}22`, color: accent,
            }}
            title={t('Послушать ещё раз')}
            aria-label={t('Послушать ещё раз')}
          >
            <Volume2 size={28} />
          </button>
          <button
            onClick={() => speak(q.word.term, lang, 0.55)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700, color: 'var(--color-muted)',
            }}
          >
            {t('Помедленнее')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {q.options.map(o => {
            const isAnswer = o.term === q.word.term
            const chosen = picked?.term === o.term
            const show = !!picked && (isAnswer || chosen)
            return (
              <button
                key={o.term}
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
                {o.term}
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
              {right ? t('Верно') : `${t('Прозвучало')} ${q.word.term} — ${q.word.ru}`}
            </div>
            {/* Подпись различия показывается ровно в момент ошибки: тогда она
                читается как ответ на «а почему», а не как справка. */}
            <WordRow word={q.word} lang={lang} accent={accent} tone={right ? 'good' : 'bad'} />
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
    const weak = [...new Map(missed.current.map(w => [w.term, w])).values()]
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
              ? t('Ряд различается целиком. Гнездо вернётся на повторение позже — на слух это забывается быстрее, чем кажется.')
              : t('Слова, на которых промахнулся, уже в колоде повторений — они вернутся сами.')}
          </div>
        </div>
        {weak.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--color-muted)' }}>
              {t('Не расслышал')}
            </div>
            {weak.map(w => <WordRow key={w.term} word={w} lang={lang} accent={accent} tone="bad" />)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={start} style={primaryBtn(accent)}>
            <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
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
        <ChevronLeft size={14} /> {t('К гнёздам')}
      </button>

      {header}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nest.words.map(w => <WordRow key={w.term} word={w} lang={lang} accent={accent} />)}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {audible ? (
          <button onClick={start} style={primaryBtn(accent)}>
            <Ear size={15} style={{ marginRight: 7, verticalAlign: -3 }} />
            {t('Проверить на слух')}
          </button>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderRadius: 16,
            border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
            fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-muted)', ...proseWrap,
          }}>
            <Sparkle size={15} style={{ flexShrink: 0, marginTop: 1, color: accent }} />
            {t('Проверки на слух здесь нет и быть не может: слова звучат одинаково. Различает их только фраза, в которой они стоят.')}
          </div>
        )}
        <button onClick={takeAll} disabled={saving} style={ghostBtn(accent)}>
          {saving ? t('Добавляю…') : t('Взять гнездо в колоду')}
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
//
// Сплошная кнопка идёт на --grad-purple: --color-accent предмета светлый, он
// работает как цвет текста, а не как заливка под белые буквы.

const primaryBtn = (_accent: string): React.CSSProperties => ({
  padding: '11px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750,
  background: 'var(--grad-purple)', color: '#fff',
})

const ghostBtn = (accent: string): React.CSSProperties => ({
  padding: '11px 18px', borderRadius: 999, cursor: 'pointer',
  border: `1.5px solid ${accent}`, background: 'transparent', color: accent,
  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
})
