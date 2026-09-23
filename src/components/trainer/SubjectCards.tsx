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
// ЧЕМ ЭТА СТОПКА ПРОЩЕ ЯЗЫКОВОЙ. Она прогоняет набор целиком, а не сегодняшнюю
// выборку по расписанию: памяти повторений у предметных карточек ещё нет, её
// надо читать отдельным запросом на каждый набор. Ответы при этом В РАСПИСАНИЕ
// ПИШУТСЯ (gradePrompt) — то есть слова ложатся в общую колоду повторений и
// вернутся в ней по интервалам. Выборка «на сегодня» — следующий шаг, и делать
// её до того, как в базе появятся первые предметные наборы, рано.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Layers } from 'lucide-react'
import CardDeck, { type DeckSource } from '../CardDeck'
import { fetchCardGroups, setCards as allSetCards, isShelf, type CardGroup, type CardSet } from '../../lib/cardGroups'
import { deckOwner, gradePrompt, type ReviewCard } from '../../data/reviewDeck'
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

  useEffect(() => {
    let alive = true
    setGroups(undefined)
    fetchCardGroups(subjectId, owner.studentId).then(gs => { if (alive) setGroups(gs) })
    return () => { alive = false }
  }, [subjectId, owner.studentId])

  // Полки и одиночные наборы показываются ОДНИМ списком: у предметных карточек
  // полок пока единицы, и лишний уровень «зайти в полку» стоил бы щелчка на
  // ровном месте. Имя полки идёт подписью — чтобы два «Урок 1» из разных полок
  // не читались как один набор.
  const items: ShelfItem[] = useMemo(() => (groups ?? []).flatMap(g =>
    g.sets.map(set => ({ set, shelf: isShelf(g) ? g.title : undefined })),
  ), [groups])

  const open = items.find(x => x.set.id === openId) ?? null

  if (groups === undefined) return <Skeleton.Text lines={3} style={{ maxWidth: 420 }} />

  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" onClick={() => setOpenId('')} style={backBtn}>
          <ChevronLeft size={14} /> {t('К наборам')}
        </button>
        <SetRun item={open} subjectId={subjectId} accent={accent} owner={owner} />
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
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
      {items.map(({ set, shelf }) => {
        const n = allSetCards(set).length
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
  )
}

/**
 * Прогон одного набора.
 *
 * Стопка собирается один раз на монтировании — поэтому набор стоит в `key`
 * снаружи: вернуться к списку и открыть другой набор должно начинать сессию
 * заново, а не дочитывать предыдущую.
 */
function SetRun({ item, subjectId, accent, owner }: {
  item: ShelfItem
  subjectId: string
  accent: string
  owner: { studentId?: string; anonName?: string }
}) {
  const t = useT()
  const cards = useMemo(() => allSetCards(item.set), [item.set])

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

  return <CardDeck key={item.set.id} owner={owner} accent={accent} subject={subjectId} source={source} />
}

const backBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
  padding: '7px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
  border: '1px solid var(--color-border-soft)', background: 'transparent',
  color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600,
}
