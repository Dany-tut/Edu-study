// ─────────────────────────────────────────────────────────────────────────────
// Наборы фраз — витрина разговорника внутри вкладки «Карточки»
//
// ЗАЧЕМ. Колода повторений набирается сама: слова уроков, ошибки домашки. Это
// правильно и это работает — но только для того, кто уже учится. Человек,
// открывший тренажёр в первый день, видел пустую стопку и надпись «карточки
// появятся сами», а тысяча готовых фраз лежала в data/survivalKo.ts и не была
// видна ниоткуда.
//
// ЧТО ЗДЕСЬ, А ЧТО В РЕЙЛЕ. Этот файл — только сетка стопок и прогон одной
// стопки. Полки, источник и настройки показа живут в рейле, который собирает
// LanguageTrainer: рейл общий на все режимы тренажёра, и класть половину его
// содержимого сюда значило бы, что при переключении режима часть рейла
// перерисовывается из другого места. Поэтому сюда приходят уже отфильтрованные
// темы, а фильтрация остаётся снаружи.
//
// ПРОГРЕСС ТЕМЫ — доля фраз, уже попавших в колоду повторений. Считается по
// одному запросу на весь экран (knownPrompts), а не по запросу на тему: тем 38.
//
// ПРОГОН СТОПКИ НЕ ДВИГАЕТ ИНТЕРВАЛЫ. Интервал имеет смысл для того, что ученик
// уже видел; фраза из разговорника попадает в расписание в момент, когда он
// честно нажал «не знаю» (см. onVerdict), и дальше живёт как всё остальное.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { ChevronLeft, Layers, Sparkles, Check, Volume2 } from 'lucide-react'
import type { SurvivalThemeCards, SurvivalBook, Phrase } from '../data/survivalPhrases'
import { addCards, captureMistake, type ReviewCard } from '../data/reviewDeck'
import { vocabImage } from '../data/vocabImages'
import { INITIAL_SRS } from '../lib/srs'
import { speechLocale, speechText } from '../lib/speech'
import { useT } from '../lib/i18n'
import CardDeck, { type DeckSource } from './CardDeck'
import { Tile, TileGrid, TileMeter, TileChip, Empty } from './trainer/TrainerShell'

type Owner = { studentId?: string; anonName?: string }

/** Настройки показа из рейла — общие для витрины и прогона. */
export interface PhraseView {
  /** Показывать романизацию вместе с ответом. */
  reading: boolean
  /** Лицевая сторона — перевод, а не оригинал. */
  reverse: boolean
}

/** Как проходят стопку: свайп-колодой или чтением списком. */
export type RunMode = 'swipe' | 'list'

/** Сколько фраз темы уже лежит в колоде повторений. */
export function inDeckCount(item: SurvivalThemeCards, known: Set<string>): number {
  return item.phrases.reduce((n, p) => n + (known.has(p.term) ? 1 : 0), 0)
}

/** Доля фраз темы, уже лежащих в колоде, 0…100. */
export function themeProgress(item: SurvivalThemeCards, known: Set<string>): number {
  if (item.phrases.length === 0) return 0
  return Math.round((inDeckCount(item, known) / item.phrases.length) * 100)
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

export default function PhraseDecks({ themes, known, accent, onOpen }: {
  /** Уже отфильтрованные темы — фильтрация живёт в рейле. */
  themes: SurvivalThemeCards[]
  known: Set<string>
  accent: string
  onOpen: (themeId: string) => void
}) {
  const t = useT()
  if (themes.length === 0) {
    return <Empty text="Ничего не нашлось. Сбрось фильтр слева или поищи другое слово." />
  }
  return (
    <TileGrid min={218}>
      {themes.map(x => {
        const pct = themeProgress(x, known)
        const inDeck = inDeckCount(x, known)
        return (
          <Tile key={x.theme.id} accent={accent} stack onClick={() => onOpen(x.theme.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TileChip>{x.phrases.length} {t('фраз')}</TileChip>
              {pct >= 100 && (
                <TileChip tone="accent" accent="var(--color-green-text)" soft="var(--color-green-soft)">
                  {t('выучено')}
                </TileChip>
              )}
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {t(x.theme.title)}
            </span>
            {/* Превью — настоящие фразы на изучаемом языке, а не пересказ темы:
                по трём строкам сразу видно и уровень, и содержимое. */}
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
              overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
            }}>
              {x.phrases.slice(0, 3).map(p => p.term).join(' · ')}
            </span>
            <TileMeter value={pct} />
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
              <span>{inDeck > 0 ? `${inDeck} ${t('в колоде')}` : t('не начата')}</span>
              <span style={{ color: pct > 0 ? 'var(--color-green-text)' : undefined, fontWeight: pct > 0 ? 700 : 400 }}>
                {pct > 0 ? `${pct}%` : '—'}
              </span>
            </span>
          </Tile>
        )
      })}
    </TileGrid>
  )
}

// ─── Прогон одной стопки ─────────────────────────────────────────────────────

export function ThemeSession({ book, item, lang, subjectId, accent, owner, view, run }: {
  book: SurvivalBook
  item: SurvivalThemeCards
  lang: string
  subjectId: string
  accent: string
  owner: Owner
  view: PhraseView
  run: RunMode
}) {
  const { theme, phrases } = item

  // Стабильный объект: он лежит в зависимостях загрузки стопки, и новый объект
  // на каждый рендер перезапускал бы сессию (см. DeckSource).
  const source: DeckSource = useMemo(() => ({
    load: async () => phrases.map((ph, i): ReviewCard => ({
      id: `sv-${book.key}-${theme.id}-${i}`,
      subject: subjectId,
      source: 'manual',
      // Обратное направление — это другой навык: вспомнить фразу по смыслу
      // труднее, чем узнать её глазами. Меняем местами обе стороны целиком, а
      // не только показ, иначе озвучка читала бы русский текст чужим голосом.
      prompt: view.reverse ? ph.ru : ph.term,
      answer: view.reverse ? ph.term : ph.ru,
      reading: view.reading ? ph.reading : undefined,
      note: ph.note,
      image: vocabImage(ph.ru),
      ease: INITIAL_SRS.ease,
      intervalDays: INITIAL_SRS.intervalDays,
      reps: INITIAL_SRS.reps,
      lapses: INITIAL_SRS.lapses,
      dueAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })),
    grading: 'binary',
    onVerdict: (card, known) => {
      if (known) return
      // Незнакомое уходит в колоду само — в этом весь смысл прогона: ученик не
      // выписывает слова руками, а честно жмёт «не знаю».
      captureMistake({
        ...owner, subject: subjectId, source: 'manual',
        // В колоду фраза всегда ложится оригиналом вперёд, как её положила бы
        // домашка: направление показа — настройка сессии, а не свойство слова.
        prompt: view.reverse ? card.answer : card.prompt,
        answer: view.reverse ? card.prompt : card.answer,
      }).catch(e => console.error('PhraseDecks capture:', e))
    },
    judge: true,
    label: theme.title,
    doneTitle: 'Стопка пройдена',
  }), [phrases, book.key, theme.id, theme.title, subjectId, owner, view.reverse, view.reading])

  if (run === 'list') return <PhraseList phrases={phrases} accent={accent} view={view} lang={lang} />

  return (
    <CardDeck
      key={`${theme.id}-${view.reverse ? 'r' : 'f'}`}
      owner={owner}
      accent={accent}
      lang={view.reverse ? undefined : lang}
      subject={subjectId}
      source={source}
    />
  )
}

/**
 * Стопка списком — чтение глазами перед прогоном.
 *
 * Нужен потому, что свайп проверяет память, а первый заход по новой теме
 * памяти ещё не имеет: карточка «봉투 필요하세요?» человеку, который видит фразу
 * впервые, — это сорок нажатий «не знаю» подряд. Список даёт прочитать тему
 * целиком за минуту и только потом идти в колоду.
 */
function PhraseList({ phrases, accent, view, lang }: {
  phrases: Phrase[]; accent: string; view: PhraseView; lang: string
}) {
  const t = useT()
  const [open, setOpen] = useState<number | null>(null)

  function say(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(speechText(text))
    u.lang = speechLocale(lang) ?? lang
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {phrases.map((p, i) => {
        const on = open === i
        return (
          <div
            key={`${p.term}-${i}`}
            onClick={() => setOpen(on ? null : i)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', borderRadius: 14,
              background: 'var(--color-bg-2)',
              border: `1px solid ${on ? `${accent}55` : 'var(--color-border-soft)'}`,
              cursor: p.note ? 'pointer' : 'default',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>{p.term}</div>
              {view.reading && p.reading && (
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 2 }}>{p.reading}</div>
              )}
              {/* Заметка раскрывается по клику, а не висит всегда: у половины
                  фраз она в три строки, и лист темы стал бы простынёй. */}
              {on && p.note && (
                <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 6, lineHeight: 1.5 }}>
                  {p.note}
                </div>
              )}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--color-text-2)', flexShrink: 0, maxWidth: '42%', textAlign: 'right', lineHeight: 1.4 }}>
              {p.ru}
            </div>
            <button
              onClick={e => { e.stopPropagation(); say(p.term) }}
              aria-label={t('Послушать')}
              style={{
                flexShrink: 0, display: 'flex', border: 'none', background: 'none',
                cursor: 'pointer', color: accent, padding: 0,
              }}
            >
              <Volume2 size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Части, которые собирает рейл и строка ───────────────────────────────────

/** Возврат к витрине — живёт в строке управления. */
export function BackToSets({ onBack }: { onBack: () => void }) {
  const t = useT()
  return (
    <button
      onClick={onBack}
      style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 999,
        border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.88)',
        cursor: 'pointer', fontSize: 12.5, fontWeight: 550, color: 'var(--color-text-2)', fontFamily: 'inherit',
      }}
    >
      <ChevronLeft size={14} /> {t('К наборам')}
    </button>
  )
}

/** «Всю тему в повторение» — в рейле сессии. */
export function TakeWholeTheme({ phrases, owner, subjectId, accent, onAdded }: {
  phrases: Phrase[]
  owner: Owner
  subjectId: string
  accent: string
  onAdded?: () => void
}) {
  const t = useT()
  const [added, setAdded] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  async function take() {
    setBusy(true)
    try {
      const n = await addCards(owner, phrases.map(ph => ({
        subject: subjectId, source: 'manual' as const, prompt: ph.term, answer: ph.ru,
      })))
      setAdded(n)
      if (n > 0) onAdded?.()
    } catch (e) {
      console.error('TakeWholeTheme:', e)
      setAdded(0)
    } finally {
      setBusy(false)
    }
  }

  const done = added !== null
  return (
    <button
      onClick={take}
      disabled={busy || done}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
        padding: '9px 12px', borderRadius: 12, cursor: busy || done ? 'default' : 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 650,
        border: `1px solid ${done ? 'var(--color-border-soft)' : `${accent}66`}`,
        background: 'transparent', color: done ? 'var(--color-muted)' : accent,
      }}
    >
      {done
        ? <><Check size={14} /> {added > 0 ? `${t('в колоде')} +${added}` : t('уже в колоде')}</>
        : <><Sparkles size={14} /> {busy ? t('Добавляю…') : t('Всю тему в повторение')}</>}
    </button>
  )
}

/** Подпись под колодой — что делает «не знаю». */
export function DeckHint() {
  const t = useT()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      fontSize: 11.5, color: 'var(--color-text-3)',
    }}>
      <Layers size={12} />
      {t('«Не знаю» кладёт фразу в колоду повторений — вернётся по расписанию.')}
    </div>
  )
}
