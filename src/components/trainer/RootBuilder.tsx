import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Check, X, RotateCcw, Blocks } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { stopSpeech } from '../../lib/speech'
import { addCards } from '../../data/reviewDeck'
import {
  wordBricks, allBricks, type HanjaBrick, type HanjaRoot, type HanjaWord,
} from '../../data/koreanHanja'
import { Tile, TileGrid, TileChip, TileMeter } from './TrainerShell'
import { TierChip } from '../GlossedText'
import { Block, SpeakBtn, TONE_ORDER, say, shuffle, primaryBtn, ghostBtn } from './blockKit'
import type { MaterialResult } from '../../lib/trainerProgress'

// Корни слов: одно знание — семь слов.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ЭКРАН, А НЕ СПИСОК СЛОВ
// 학교, 학생, 학원, 대학교, 학기, 방학, 유학 — это не семь слов, а один кирпич
// 학 «учёба» в семи сочетаниях. Списком они учатся семь раз; гнездом — один раз
// плюс шесть вторых кирпичей, каждый из которых сам откроет своё гнездо.
//
// ПОЧЕМУ СЛОВО ПОКАЗАНО ПЛИТКАМИ. Слог корейского слова китайского
// происхождения — это морфема с собственным значением, но по написанию она
// ничем не отделена от соседней. Плитки возвращают границу, которой нет в
// орфографии, и делают видимым то, что в тексте приходится знать заранее.
//
// ЦВЕТ КИРПИЧА ПОСТОЯНЕН. Слог 학 везде одного цвета — и в 학교, и в 장학금. Это
// не украшение: узнавание кирпича в незнакомом слове и есть навык, ради
// которого экран существует.

/** Цвет кирпича — свой у каждого слога и одинаковый во всех словах. */
function brickTone(ko: string) {
  let n = 0
  for (const ch of ko) n = (n + ch.charCodeAt(0)) % 997
  return TONE_ORDER[n % TONE_ORDER.length]
}

/** Слово, годное для сборки: разбор складывается в само слово. */
interface Buildable {
  word: HanjaWord
  bricks: HanjaBrick[]
  /** Какой кирпич прячем — не корень гнезда: его ученик и так видит в шапке. */
  gap: number
}

function buildable(root: HanjaRoot): Buildable[] {
  const out: Buildable[] = []
  for (const word of root.words) {
    const bricks = wordBricks(word)
    if (!bricks) continue
    const gap = bricks.findIndex(b => b.ko !== root.ko)
    if (gap < 0) continue
    out.push({ word, bricks, gap })
  }
  return out
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

export function RootGrid({ roots, results, accent, soft, onOpen }: {
  roots: HanjaRoot[]
  results: (ko: string) => MaterialResult | undefined
  accent: string
  soft: string
  onOpen: (ko: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={248}>
      {roots.map(root => {
        const res = results(root.ko)
        return (
          <Tile key={root.ko} accent={accent} onClick={() => onOpen(root.ko)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{t(root.group)}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {root.words.length} {t('слов')}
              </span>
            </span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Block accent={accent} tone={brickTone(root.ko)} size="lg">{root.ko}</Block>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 15.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
                  {root.ru}
                </span>
                {/* Иероглиф — опора, а не предмет заучивания, поэтому он мелкий
                    и приглушённый: узнать в заголовке газеты, не выписывать. */}
                <span style={{ fontSize: 12.5, color: 'var(--color-text-3)' }}>{root.cn}</span>
              </span>
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

// ─── Строка слова ────────────────────────────────────────────────────────────

function WordRow({ word, root, lang, accent, tone, reading }: {
  word: HanjaWord
  root: HanjaRoot
  lang: string
  accent: string
  tone?: 'good' | 'bad'
  reading: boolean
}) {
  const bricks = wordBricks(word)
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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Слово, у которого разбор не складывается в него самого (объяснение
              смысла, а не состава), показывается целиком одной плиткой — врать
              границами кирпичей нельзя. */}
          {bricks
            ? bricks.map((b, i) => (
                <Block key={i} accent={accent} tone={brickTone(b.ko)} title={b.ru}>{b.ko}</Block>
              ))
            : <Block accent={accent}>{word.term}</Block>}
          <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', marginLeft: 4 }}>{word.ru}</span>
          <TierChip term={word.term} lang={lang} accent={accent} style={{ marginTop: 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          {reading && <span style={{ fontSize: 12, color: accent, opacity: 0.9 }}>{word.reading}</span>}
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', ...proseWrap }}>{word.parts}</span>
        </div>
        {/* Корень звучит в слове не так, как в заголовке гнезда, — это правило,
            а не опечатка, и молчать о нём нельзя (두음법칙 и прочее). */}
        {word.alt && (
          <div style={{ fontSize: 12, color: 'var(--color-muted)', ...proseWrap }}>
            {root.ko} {'→'} {word.alt} {'— корень звучит здесь иначе'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Разбор одного корня ─────────────────────────────────────────────────────

interface Question {
  item: Buildable
  options: HanjaBrick[]
}

function buildRun(root: HanjaRoot, pool: HanjaBrick[]): Question[] {
  const items = shuffle(buildable(root))
  return items.map(item => {
    const answer = item.bricks[item.gap]
    const busy = new Set(item.bricks.map(b => b.ko))
    const wrong = shuffle(pool.filter(b => !busy.has(b.ko))).slice(0, 3)
    return { item, options: shuffle([answer, ...wrong]) }
  })
}

export function RootPage({ root, lang, accent, soft, owner, subjectId, reading, onFinished, onBack }: {
  root: HanjaRoot
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
  const pool = useMemo(() => allBricks(), [])
  const canRun = useMemo(() => buildable(root).length >= 2, [root])

  const [run, setRun] = useState<Question[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<HanjaBrick | null>(null)
  const [score, setScore] = useState(0)
  const missed = useRef<HanjaWord[]>([])
  const [added, setAdded] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const q = run?.[idx] ?? null
  const done = !!run && idx >= run.length

  useEffect(() => () => stopSpeech(), [])

  const cardsFor = useCallback((list: HanjaWord[]) => list.map(word => ({
    subject: subjectId,
    source: 'trainer' as const,
    prompt: `${word.term} — что значит? (${word.parts})`,
    answer: `${word.term} — ${word.ru}`,
  })), [subjectId])

  const takeAll = useCallback(async () => {
    setSaving(true)
    try {
      setAdded(await addCards(owner, cardsFor(root.words)))
    } catch (e) {
      console.error('roots takeAll:', e)
      setAdded(0)
    } finally {
      setSaving(false)
    }
  }, [owner, cardsFor, root])

  const pushMissed = useCallback(async (list: HanjaWord[]) => {
    if (list.length === 0) return
    const byTerm = new Map(list.map(w => [w.term, w]))
    try {
      await addCards(owner, cardsFor([...byTerm.values()]))
    } catch (e) {
      console.error('roots pushMissed:', e)
    }
  }, [owner, cardsFor])

  function start() {
    missed.current = []
    setScore(0)
    setIdx(0)
    setPicked(null)
    setRun(buildRun(root, pool))
  }

  function pick(brick: HanjaBrick) {
    if (picked || !q) return
    setPicked(brick)
    if (brick.ko === q.item.bricks[q.item.gap].ko) {
      setScore(s => s + 1)
      say(q.item.word.term, lang)
    } else {
      missed.current.push(q.item.word)
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Block accent={accent} tone={brickTone(root.ko)} size="lg">{root.ko}</Block>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 19, fontWeight: 780, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            {root.ru}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--color-text-3)' }}>
            {root.cn} · {t(root.group)}
          </span>
        </span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--color-text-2)', margin: 0, ...proseWrap }}>
        {t('Один кирпич — сразу столько слов:')} {root.words.length}.{' '}
        {t('Учить надо кирпич: он всплывёт и в тех словах, которых здесь нет.')}
      </p>
    </div>
  )

  // ── Прогон ────────────────────────────────────────────────────────────────

  if (run && !done && q) {
    const answer = q.item.bricks[q.item.gap]
    const right = picked?.ko === answer.ko
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
          <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 700 }}>{t('Собери слово')}</div>
          <div style={{ fontSize: 19, fontWeight: 750, color: 'var(--color-text)', textAlign: 'center' }}>
            «{q.item.word.ru}»
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {q.item.bricks.map((b, i) =>
              i === q.item.gap ? (
                <Block key={i} accent={accent} size="lg"
                  dashed={!picked}
                  tone={picked ? brickTone(b.ko) : undefined}
                  state={picked && !right ? 'bad' : undefined}>
                  {picked ? b.ko : '?'}
                </Block>
              ) : (
                <Block key={i} accent={accent} tone={brickTone(b.ko)} size="lg" title={b.ru}>{b.ko}</Block>
              ),
            )}
          </div>
          {/* Подсказка — значения известных кирпичей: задание про состав слова,
              а не про угадывание перевода по звучанию. */}
          <div style={{ fontSize: 12.5, color: 'var(--color-text-3)', textAlign: 'center', ...proseWrap }}>
            {q.item.bricks.map((b, i) => (i === q.item.gap && !picked ? '?' : `${b.ko} ${b.ru}`)).join(' + ')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {q.options.map(o => {
            const isAnswer = o.ko === answer.ko
            const chosen = picked?.ko === o.ko
            const show = !!picked && (isAnswer || chosen)
            return (
              <button
                key={o.ko}
                onClick={() => pick(o)}
                disabled={!!picked}
                style={{
                  padding: '13px 12px', borderRadius: 16, cursor: picked ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, lineHeight: 1.3,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
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
                <span style={{ fontSize: 21, fontWeight: 750 }}>{o.ko}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 650 }}>{o.ru}</span>
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
              {right ? t('Верно') : `${q.item.word.term} — ${q.item.word.ru}`}
            </div>
            <WordRow word={q.item.word} root={root} lang={lang} accent={accent}
              tone={right ? 'good' : 'bad'} reading={reading} />
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
              ? t('Гнездо собрано целиком. Вторые кирпичи этих слов открывают свои гнёзда — загляни в них.')
              : t('Слова, на которых промахнулся, уже в колоде повторений — они вернутся сами.')}
          </div>
        </div>
        {weak.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--color-muted)' }}>{t('Не собралось')}</div>
            {weak.map(w => (
              <WordRow key={w.term} word={w} root={root} lang={lang} accent={accent} tone="bad" reading={reading} />
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
        <ChevronLeft size={14} /> {t('К корням')}
      </button>

      {header}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {root.words.map(w => (
          <WordRow key={w.term} word={w} root={root} lang={lang} accent={accent} reading={reading} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {canRun && (
          <button onClick={start} style={primaryBtn(accent)}>
            <Blocks size={15} />
            {t('Собрать слова')}
          </button>
        )}
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
