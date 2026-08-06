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
import { Chips } from './LanguageTrainer'
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
  // Полка по умолчанию — первая, а не «все»: тридцать восемь наборов сразу это
  // стена, из которой ученик не выбирает, а закрывает вкладку.
  const [shelf, setShelf] = useState(0)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  // Поиск идёт по ВСЕМ полкам и молча отменяет выбор раздела: человек, который
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
  const shelfTitles = shelves.map(s => t(s.title))

  return (
    <div>
      {/* Разделы — тем же фильтром-чипсами, что «Уровень» и «Тема» в чтении.
          Раньше здесь была своя боковая колонка, и наборы фраз выглядели чужим
          экраном внутри тренажёра, хотя это такой же список материала. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Chips
          label={t('Раздел')}
          value={q ? '' : shelfTitles[shelf] ?? ''}
          options={shelfTitles}
          onChange={v => {
            setQuery('')
            const i = shelfTitles.indexOf(v)
            // Повторный клик по выбранному разделу гасит его (Chips отдаёт ''),
            // но состояния «ничего не выбрано» здесь нет — возвращаем первый.
            setShelf(i >= 0 ? i : 0)
          }}
          accent={accent}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
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
      </div>

      {!q && shelves[shelf] && (
        <p style={{ fontSize: 12.5, color: 'var(--color-muted)', textAlign: 'center', marginBottom: 12 }}>
          {t(shelves[shelf].subtitle)}
        </p>
      )}

      {visible.length === 0 ? (
        <div style={{
          padding: '30px 20px', borderRadius: 16, textAlign: 'center',
          border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
          fontSize: 13, color: 'var(--color-muted)',
        }}>
          {t('Ничего не нашлось. Попробуй другое слово или выбери другой раздел.')}
        </div>
      ) : (
        // Один столбец — как тексты в чтении и записи в аудировании. Плитками
        // наборы читались как отдельный раздел приложения, хотя это ровно
        // такой же список материала.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(x => <Stack key={x.theme.id} item={x} accent={accent} onOpen={onOpen} t={t} />)}
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11.5, color: 'var(--color-text-3)' }}>
        {t('Всего в разговорнике')}: {total} {t('фраз')}
      </div>
    </div>
  )
}

/**
 * Один набор — строка списка: чипс с числом фраз, цель, название и примеры.
 *
 * Раньше набор рисовался «стопкой» с двумя подложками сзади. Идея была
 * показать, что за плашкой пачка карточек, но рядом с плоскими списками
 * чтения и аудирования это выглядело другим приложением. Число фраз в чипсе
 * говорит то же самое и не ломает строй.
 */
function Stack({ item, accent, onOpen, t }: {
  item: SurvivalThemeCards
  accent: string
  onOpen: (id: string) => void
  t: (s: string) => string
}) {
  const { theme, phrases } = item
  const preview = phrases.slice(0, 3).map(p => p.term).join(' · ')

  return (
    <button
      onClick={() => onOpen(theme.id)}
      style={{
        textAlign: 'left', padding: '16px 18px', borderRadius: 18, cursor: 'pointer',
        border: '1px solid var(--color-border)', background: 'var(--color-bg-2)',
        fontFamily: 'inherit', width: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999,
          background: `${accent}22`, color: accent,
        }}>
          <Layers size={11} /> {phrases.length} {t('фраз')}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t(theme.goal)}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
        {t(theme.title)}
      </div>
      {/* Примеры на изучаемом языке: по ним набор узнаётся быстрее, чем по
          названию — сразу видно, что именно придётся говорить. */}
      <div style={{
        fontSize: 12.5, color: 'var(--color-text-3)', lineHeight: 1.5,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {preview}
      </div>
    </button>
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
