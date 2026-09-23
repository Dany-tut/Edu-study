// ─────────────────────────────────────────────────────────────────────────────
// Карточки предмета в банке заданий
//
// ЗАЧЕМ. Пара «термин — значение» бывает не только языковой: разделы биологии,
// реактивы по химии, даты по истории. Учитель такие наборы уже собирает (в
// Конструкторе у набора выбирается предмет), а ученику-биологу их негде было
// открыть: полка карточек живёт внутри языкового тренажёра, а он попадает в
// банк заданий. Набор молча не показывался никому.
//
// ПОЧЕМУ НЕ ПЕРЕИСПОЛЬЗУЕМ ПОЛКУ ЯЗЫКОВОГО ТРЕНАЖЁРА. Та полка сплетена с его
// экраном: поиск по всем источникам, свайп между темами, разговорник, свои
// слова, гнёзда созвучий. Здесь источник ровно один — наборы учителя по этому
// предмету, — и копия того экрана была бы копией его проблем.
//
// ПАМЯТЬ ПОВТОРЕНИЙ ОБЩАЯ С ЯЗЫКОВОЙ. Состояние карточек читается одним
// запросом на предмет (deckStates) и служит двум вещам сразу: показать на
// плитке, сколько из набора уже выучено, и собрать стопку «на сегодня» — только
// те карточки, чей срок подошёл. Прогон набора целиком остаётся вторым
// режимом: новый набор незачем цедить через расписание, его надо один раз
// прочитать глазами.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Layers, Search } from 'lucide-react'
import CardDeck, { type DeckSource } from '../CardDeck'
import { fetchCardGroups, setCards as allSetCards, isShelf, type CardGroup, type CardSet } from '../../lib/cardGroups'
import { deckOwner, deckStates, gradePrompt, isDue, type CardState, type ReviewCard } from '../../data/reviewDeck'
import { INITIAL_SRS } from '../../lib/srs'
import { useT } from '../../lib/i18n'
import Skeleton from '../Skeleton'
import { plural } from './TrainerShell'

/** Набор витрины: сам набор и полка, на которой он лежит (если лежит). */
interface ShelfItem { set: CardSet; shelf?: string }

export default function SubjectCards({ subjectId, accent, soft }: {
  /** Слаг предмета из реестра: по нему набор и нашёлся. */
  subjectId: string
  accent: string
  soft: string
}) {
  const t = useT()
  const owner = useMemo(() => deckOwner(), [])
  const [groups, setGroups] = useState<CardGroup[] | undefined>(undefined)
  const [openId, setOpenId] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    setGroups(undefined)
    fetchCardGroups(subjectId, owner.studentId).then(gs => { if (alive) setGroups(gs) })
    return () => { alive = false }
  }, [subjectId, owner.studentId])

  /**
   * Память повторений по этому предмету — ключ карточки в ней это её термин
   * (см. deckStates). Один запрос на всю полку: у наборов десятки карточек, и
   * спрашивать состояние на каждый набор значило бы десяток запросов там, где
   * хватает одного.
   *
   * Пустая карта — законное состояние: ученик, который ещё ничего не отвечал,
   * должен видеть полку, а не ожидание.
   */
  const [states, setStates] = useState<Map<string, CardState>>(() => new Map())
  useEffect(() => {
    let alive = true
    deckStates(owner, [subjectId]).then(m => { if (alive) setStates(m) })
    return () => { alive = false }
  }, [subjectId, owner])

  // Полки и одиночные наборы показываются ОДНИМ списком: у предметных карточек
  // полок пока единицы, и лишний уровень «зайти в полку» стоил бы щелчка на
  // ровном месте. Имя полки идёт подписью — чтобы два «Урок 1» из разных полок
  // не читались как один набор.
  const items: ShelfItem[] = useMemo(() => (groups ?? []).flatMap(g =>
    g.sets.map(set => ({ set, shelf: isShelf(g) ? g.title : undefined })),
  ), [groups])

  const open = items.find(x => x.set.id === openId) ?? null

  // Поиск по названию набора и полки. Появляется, когда наборов становится
  // больше горсти: у трёх плиток строка поиска — лишний предмет на экране.
  const found = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(x =>
      x.set.title.toLowerCase().includes(q)
      || (x.shelf ?? '').toLowerCase().includes(q)
      || (x.set.about ?? '').toLowerCase().includes(q))
  }, [items, query])

  if (groups === undefined) return <Skeleton.Text lines={3} style={{ maxWidth: 420 }} />

  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" onClick={() => setOpenId('')} style={backBtn}>
          <ChevronLeft size={14} /> {t('К наборам')}
        </button>
        <SetRun item={open} subjectId={subjectId} accent={accent} owner={owner} states={states} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-3)', fontSize: 14, lineHeight: 1.5 }}>
        {t('Карточек по этому предмету пока нет — их собирает учитель.')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length > 5 && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          padding: '8px 12px', borderRadius: 999, background: 'var(--color-bg-input)',
          border: '1px solid var(--color-border-soft)', minWidth: 240,
        }}>
          <Search size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('Найти набор')}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13,
            }}
          />
        </label>
      )}

      {found.length === 0 && (
        <div style={{ padding: '24px 0', color: 'var(--color-text-3)', fontSize: 13 }}>
          {t('Ничего не нашлось — попробуйте другое слово.')}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
      {found.map(({ set, shelf }) => {
        const cards = allSetCards(set)
        const n = cards.length
        // Выучено — то, чему расписание назначило срок в будущем. Карточка, до
        // которой ещё не дошли, и карточка, которую забыли, одинаково ждут
        // сегодня — и обе считаются невыученными.
        const learned = cards.filter(c => !isDue(states.get(c.term))).length
        const due = n - learned
        return (
          <button
            key={set.id}
            type="button"
            onClick={() => setOpenId(set.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
              padding: 14, borderRadius: 16, cursor: 'pointer', textAlign: 'left',
              border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.94)',
              fontFamily: 'inherit',
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px',
              borderRadius: 999, background: soft, color: accent, fontSize: 11.5, fontWeight: 700,
            }}>
              <Layers size={12} /> {n} {t(plural(n, ['карточка', 'карточки', 'карточек']))}
            </span>
            {learned > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                <span style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--color-bg-2)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${Math.round((learned / n) * 100)}%`, background: accent }} />
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>
                  {due > 0 ? `${due} ${t('на сегодня')}` : t('всё выучено')}
                </span>
              </span>
            )}
            <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.25 }}>
              {set.title || t('Без названия')}
            </span>
            {(shelf || set.about) && (
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.3 }}>
                {shelf ? `${shelf}${set.about ? ' · ' : ''}` : ''}{set.about}
              </span>
            )}
          </button>
        )
      })}
      </div>
    </div>
  )
}

/**
 * Прогон одного набора.
 *
 * Стопка собирается один раз на монтировании — поэтому набор стоит в `key`
 * снаружи: вернуться к списку и открыть другой набор должно начинать сессию
 * заново, а не дочитывать предыдущую.
 */
function SetRun({ item, subjectId, accent, owner, states }: {
  item: ShelfItem
  subjectId: string
  accent: string
  owner: { studentId?: string; anonName?: string }
  /** Память повторений по предмету: из неё собирается сегодняшняя выборка. */
  states: Map<string, CardState>
}) {
  const t = useT()
  const all = useMemo(() => allSetCards(item.set), [item.set])
  const dueOnly = useMemo(() => all.filter(c => isDue(states.get(c.term))), [all, states])

  /**
   * Что крутить: сегодняшнюю выборку или набор целиком.
   *
   * Умолчание зависит от набора, а не от настройки: пока в наборе есть
   * неподошедшие карточки, выборка короче и полезнее; когда на сегодня не
   * осталось ничего, выборка была бы пустым экраном — и тогда честнее сразу
   * предложить весь набор.
   */
  const [whole, setWhole] = useState(dueOnly.length === 0)
  const cards = whole ? all : dueOnly

  const source: DeckSource = useMemo(() => ({
    load: async () => cards.map((c, i): ReviewCard => ({
      id: `set-${item.set.id}-${i}`,
      subject: subjectId,
      source: 'manual',
      prompt: c.term,
      answer: c.ru,
      note: c.note,
      ease: INITIAL_SRS.ease,
      intervalDays: INITIAL_SRS.intervalDays,
      reps: INITIAL_SRS.reps,
      lapses: INITIAL_SRS.lapses,
      dueAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    })),
    grading: 'binary',
    // Сохраняется ЛЮБОЙ ответ, а не только провал: «знаю» — это следующая
    // ступень интервала, и без него повторения не появятся вовсе.
    onVerdict: (card, known) => {
      gradePrompt(owner, { subject: subjectId, source: 'manual', prompt: card.prompt, answer: card.answer }, known ? 4 : 1)
        .catch(e => console.error('SubjectCards grade:', e))
    },
    judge: false,
    label: item.set.title || t('набор карточек'),
    emptyTitle: t('В наборе нет карточек'),
    emptyText: t('Набор завели, но карточки в него ещё не сложили.'),
    doneTitle: t('Набор пройден'),
  }), [cards, item.set.id, item.set.title, subjectId, owner, t])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Выбор виден, только когда выборка и набор различаются: одинаковые
          кнопки «12 на сегодня» и «12 всего» — выбор без разницы. */}
      {dueOnly.length > 0 && dueOnly.length < all.length && (
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
          <button type="button" onClick={() => setWhole(false)} style={pill(accent, !whole)}>
            {dueOnly.length} {t('на сегодня')}
          </button>
          <button type="button" onClick={() => setWhole(true)} style={pill(accent, whole)}>
            {t('Весь набор')} · {all.length}
          </button>
        </div>
      )}
      <CardDeck key={`${item.set.id}:${whole ? 'all' : 'due'}`} owner={owner} accent={accent} subject={subjectId} source={source} />
    </div>
  )
}

const pill = (accent: string, active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
  borderRadius: 11, border: `1px solid ${active ? accent : 'var(--color-border-soft)'}`,
  background: active ? `${accent}1f` : 'transparent',
  color: active ? accent : 'var(--color-text-2)',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
})

const backBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
  padding: '7px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
  border: '1px solid var(--color-border-soft)', background: 'transparent',
  color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600,
}
