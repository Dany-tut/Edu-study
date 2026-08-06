// ─────────────────────────────────────────────────────────────────────────────
// Наборы фраз — витрина разговорника внутри вкладки «Карточки»
//
// ЗАЧЕМ. Колода повторений набирается сама: слова уроков, ошибки домашки. Это
// правильно и это работает — но только для того, кто уже учится. Человек,
// который открыл тренажёр в первый день, видел пустую стопку и надпись
// «карточки появятся сами». Тысяча готовых фраз при этом лежала в
// data/survivalKo.ts и не была видна ниоткуда.
//
// Поэтому здесь витрина: полки слева, стопки справа. Стопка — это тема
// разговорника целиком (кофейня, метро, аптека), и её можно прогнать прямо
// сейчас, ничего не сдав и ничего не открыв.
//
// ДВА РЕЖИМА ОДНОЙ ВКЛАДКИ. «Повторение» — старая колода по расписанию, она
// осталась главной и стоит первой. Стопки — это материал, а не расписание:
// прогон стопки НЕ двигает интервалы, потому что интервал имеет смысл только
// для того, что ученик уже видел. Незнакомое из стопки уходит в колоду
// повторений (см. onVerdict) — и дальше живёт по расписанию, как всё остальное.
//
// ПОЧЕМУ ПОЛКИ СЛЕВА, А НЕ ЧИПСАМИ СВЕРХУ. Тем тридцать восемь. Ряд чипсов на
// такое количество переносится в четыре строки и съедает экран до того, как
// покажется первая карточка; вертикальный список читается одним движением
// глаз и не двигает сетку при выборе.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Layers, Search, Sparkles, Check } from 'lucide-react'
import {
  survivalShelves, type SurvivalShelf, type SurvivalThemeCards, type SurvivalBook,
} from '../data/survivalPhrases'
import { loadSurvivalBook } from '../data/survivalBooks'
import { addCards, captureMistake, type ReviewCard } from '../data/reviewDeck'
import { vocabImage } from '../data/vocabImages'
import { INITIAL_SRS } from '../lib/srs'
import { useT } from '../lib/i18n'
import CardDeck, { type DeckSource } from './CardDeck'
import Skeleton from './Skeleton'

type Owner = { studentId?: string; anonName?: string }

export default function PhraseDecks({ lang, subjectId, accent, owner }: {
  lang: string
  subjectId: string
  accent: string
  owner: Owner
}) {
  const t = useT()
  const [book, setBook] = useState<SurvivalBook | null | undefined>(undefined)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setBook(undefined)
    loadSurvivalBook(lang).then(b => { if (alive) setBook(b ?? null) })
    return () => { alive = false }
  }, [lang])

  const shelves = useMemo(() => survivalShelves(book ?? undefined), [book])
  const open = useMemo(
    () => shelves.flatMap(s => s.themes).find(x => x.theme.id === openId) ?? null,
    [shelves, openId],
  )

  if (book === undefined) return <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
  if (!book || shelves.length === 0) return null

  if (open) {
    return (
      <ThemeSession
        book={book}
        item={open}
        lang={lang}
        subjectId={subjectId}
        accent={accent}
        owner={owner}
        onBack={() => setOpenId(null)}
      />
    )
  }

  return <Hub shelves={shelves} accent={accent} onOpen={setOpenId} t={t} />
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

function Hub({ shelves, accent, onOpen, t }: {
  shelves: SurvivalShelf[]
  accent: string
  onOpen: (themeId: string) => void
  t: (s: string) => string
}) {
  // Полка по умолчанию — первая, а не «все»: тридцать восемь стопок сразу это
  // стена, из которой ученик не выбирает, а закрывает вкладку.
  const [shelf, setShelf] = useState(0)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  // Поиск идёт по ВСЕМ полкам и молча отменяет выбор слева: человек, который
  // ищет «аптеку», не должен ещё и угадывать, в каком она разделе.
  const visible = useMemo(() => {
    const pool = q ? shelves.flatMap(s => s.themes) : (shelves[shelf]?.themes ?? [])
    if (!q) return pool
    return pool.filter(x =>
      x.theme.title.toLowerCase().includes(q) ||
      x.theme.vocabTheme.toLowerCase().includes(q) ||
      x.theme.goal.toLowerCase().includes(q))
  }, [shelves, shelf, q])

  const total = shelves.reduce((s, x) => s + x.count, 0)

  return (
    <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
      {/* Левая колонка: поиск и полки.
          sticky, потому что сетка стопок длиннее экрана, и выбор раздела не
          должен уезжать вверх вместе с ней. */}
      <aside style={{
        width: 232, flexShrink: 0, position: 'sticky', top: 8,
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }}
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('Найти тему')}
            style={{
              width: '100%', padding: '9px 12px 9px 32px', borderRadius: 12,
              border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-input)',
              color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13, outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {shelves.map((s, i) => {
            const on = !q && i === shelf
            return (
              <button
                key={s.title}
                onClick={() => { setQuery(''); setShelf(i) }}
                style={{
                  textAlign: 'left', padding: '9px 12px', borderRadius: 12, cursor: 'pointer',
                  border: '1px solid transparent', fontFamily: 'inherit',
                  background: on ? 'var(--color-bg-3)' : 'transparent',
                  borderColor: on ? `${accent}55` : 'transparent',
                }}
              >
                <div style={{
                  fontSize: 13.5, fontWeight: 700, marginBottom: 2,
                  color: on ? accent : 'var(--color-text)',
                }}>
                  {t(s.title)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
                  {s.themes.length} {t('тем')} · {s.count} {t('фраз')}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.5, padding: '0 12px' }}>
          {t('Всего в разговорнике')}: {total} {t('фраз')}
        </div>
      </aside>

      {/* Правая часть: стопки. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!q && shelves[shelf] && (
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginBottom: 3 }}>
              {t(shelves[shelf].title)}
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{t(shelves[shelf].subtitle)}</p>
          </div>
        )}

        {visible.length === 0 ? (
          <div style={{
            padding: '30px 20px', borderRadius: 16, textAlign: 'center',
            border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
            fontSize: 13, color: 'var(--color-muted)',
          }}>
            {t('Ничего не нашлось. Попробуй другое слово или выбери раздел слева.')}
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(186px, 1fr))', gap: 14,
          }}>
            {visible.map(x => <Stack key={x.theme.id} item={x} accent={accent} onOpen={onOpen} t={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Одна стопка. Две подложки сзади — не украшение: они сообщают, что за плашкой
 * лежит пачка карточек, а не ещё одна кнопка перехода. Подложки статичные и
 * pointer-events: none, иначе они ловили бы клик мимо цели у края.
 */
function Stack({ item, accent, onOpen, t }: {
  item: SurvivalThemeCards
  accent: string
  onOpen: (id: string) => void
  t: (s: string) => string
}) {
  const [hover, setHover] = useState(false)
  const { theme, phrases } = item
  const preview = phrases.slice(0, 3).map(p => p.term).join(' · ')

  return (
    <div style={{ position: 'relative', paddingTop: 8, paddingRight: 8 }}>
      {[2, 1].map(k => (
        <div
          key={k}
          aria-hidden
          style={{
            position: 'absolute', inset: 0, left: k * 4, top: 8 - k * 4, right: 8 - k * 4, bottom: k * 4,
            borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
            opacity: k === 1 ? 0.85 : 0.5, pointerEvents: 'none',
            transform: hover ? `translate(${k * 2}px, ${-k * 2}px)` : 'none',
            transition: 'transform .16s',
          }}
        />
      ))}
      <button
        onClick={() => onOpen(theme.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative', width: '100%', minHeight: 128, textAlign: 'left',
          padding: '13px 15px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', flexDirection: 'column', gap: 6,
          background: 'var(--color-bg-2)',
          border: `1px solid ${hover ? accent : 'var(--color-border)'}`,
          transition: 'border-color .16s',
        }}
      >
        <span style={{
          alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999,
          background: 'var(--color-bg-3)', color: 'var(--color-muted)', letterSpacing: 0.2,
        }}>
          {phrases.length} {t('фраз')}
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
          {t(theme.title)}
        </span>
        {/* Превью — на изучаемом языке, а не перевод названия темы: по трём
            настоящим фразам сразу видно, что внутри и на каком уровне. */}
        <span style={{
          fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
          overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
        }}>
          {preview}
        </span>
      </button>
    </div>
  )
}

// ─── Прогон одной стопки ─────────────────────────────────────────────────────

function ThemeSession({ book, item, lang, subjectId, accent, owner, onBack }: {
  book: SurvivalBook
  item: SurvivalThemeCards
  lang: string
  subjectId: string
  accent: string
  owner: Owner
  onBack: () => void
}) {
  const t = useT()
  const { theme, phrases } = item
  const note = book.notes[theme.id]
  const [added, setAdded] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)

  // Стабильный объект: он лежит в зависимостях загрузки стопки, и новый объект
  // на каждый рендер перезапускал бы сессию (см. DeckSource).
  const source: DeckSource = useMemo(() => ({
    load: async () => phrases.map((ph, i): ReviewCard => ({
      id: `sv-${book.key}-${theme.id}-${i}`,
      subject: subjectId,
      source: 'manual',
      prompt: ph.term,
      answer: ph.ru,
      reading: ph.reading,
      note: ph.note,
      // У фразы картинки обычно нет — рисуются предметы, а не «разогрейте,
      // пожалуйста». Но однословные карточки разговорника её получают.
      image: vocabImage(ph.ru),
      ease: INITIAL_SRS.ease,
      intervalDays: INITIAL_SRS.intervalDays,
      reps: INITIAL_SRS.reps,
      lapses: INITIAL_SRS.lapses,
      dueAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })),
    // Прогон материала, а не повторение по расписанию: интервалов у фразы из
    // разговорника ещё нет — они появятся, когда она попадёт в колоду.
    grading: 'binary',
    onVerdict: (card, known) => {
      if (known) return
      // Незнакомое уходит в колоду повторений само. Это главный смысл прогона:
      // ученик не выписывает слова руками, а просто честно жмёт «не знаю».
      captureMistake({
        ...owner, subject: subjectId, source: 'manual',
        prompt: card.prompt, answer: card.answer,
      }).catch(e => console.error('PhraseDecks capture:', e))
    },
    judge: true,
    label: theme.title,
    doneTitle: 'Стопка пройдена',
  }), [phrases, book.key, theme.id, theme.title, subjectId, owner])

  async function takeAll() {
    setAdding(true)
    try {
      const n = await addCards(owner, phrases.map(ph => ({
        subject: subjectId, source: 'manual' as const, prompt: ph.term, answer: ph.ru,
      })))
      setAdded(n)
    } catch (e) {
      console.error('PhraseDecks takeAll:', e)
      setAdded(0)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999,
            border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={15} /> {t('К наборам')}
        </button>
        <button
          onClick={takeAll}
          disabled={adding || added !== null}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999,
            border: `1px solid ${added !== null ? 'var(--color-border-soft)' : `${accent}66`}`,
            background: 'transparent', cursor: adding || added !== null ? 'default' : 'pointer',
            fontSize: 13, fontWeight: 650, fontFamily: 'inherit',
            color: added !== null ? 'var(--color-muted)' : accent,
          }}
        >
          {added !== null
            ? <><Check size={14} /> {added > 0 ? `${t('в колоде')} +${added}` : t('уже в колоде')}</>
            : <><Sparkles size={14} /> {adding ? t('Добавляю…') : t('Всю тему в повторение')}</>}
        </button>
      </div>

      <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
        {t(theme.title)}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: 12 }}>
        {t(theme.goal)}
      </p>

      {/* Формула темы над стопкой, а не внутри карточек: это то, что
          переставляется под себя, и его нужно держать перед глазами всю
          сессию, а не вспоминать по одной карточке. */}
      {note && (
        <div style={{
          padding: '11px 14px', borderRadius: 14, marginBottom: 18,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 4, lineHeight: 1.45 }}>
            {note.formula}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-2)' }}>
            {note.note}
          </div>
        </div>
      )}

      <CardDeck
        key={theme.id}
        owner={owner}
        accent={accent}
        lang={lang}
        subject={subjectId}
        source={source}
      />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 14, fontSize: 11.5, color: 'var(--color-text-3)',
      }}>
        <Layers size={12} />
        {t('«Не знаю» кладёт фразу в колоду повторений — вернётся по расписанию.')}
      </div>
    </div>
  )
}
