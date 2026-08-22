// ─────────────────────────────────────────────────────────────────────────────
// Мои слова — личный словарь ученика во вкладке «Карточки»
//
// ЗАЧЕМ. Слово, взятое из текста, до сих пор уходило в колоду и там исчезало:
// колода отдаёт только СЕГОДНЯШНИЙ долг, и посмотреть «а что я вообще набрал»
// было негде. Получалось, что личных слов у ученика как бы и нет — есть
// расписание, которое иногда подсовывает знакомое. Словарь возвращает им место:
// одна закреплённая плитка, в ней всё собранное, новое сверху.
//
// ЧЕМ ЭТО НЕ ЯВЛЯЕТСЯ. Не второй колодой: расписание у слова ровно одно, то же
// самое (review_cards + SM-2). Словарь — это ВИД на неё, а прогон стопки идёт
// общей машинкой разговорника (PhraseRun), поэтому «знаю» здесь и «знаю» в
// теме двигают один и тот же интервал.
//
// ЧТО СЧИТАЕТСЯ МОИМ СЛОВОМ. Всё, что ученик собрал руками или получил уроком
// (см. WORD_SOURCES), МИНУС фразы готового разговорника: те уже разложены по
// своим тридцати восьми плиткам, и словарь, включающий их, был бы копией всей
// витрины в одной стопке. Формулировки заданий из домашки сюда не попадают
// вовсе — это вопросы, а не слова.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { BookMarked } from 'lucide-react'
import type { Phrase } from '../../data/survivalPhrases'
import type { CardState, ReviewCard } from '../../data/reviewDeck'
import { isDue } from '../../data/reviewDeck'
import { wordReading } from '../../lib/lexicon'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import { PhraseRun, type PhraseView, type RunMode } from '../PhraseDecks'
import { Tile, TileChip, TileMeter } from './TrainerShell'
import type { CoachStep } from '../Coachmarks'

/**
 * Ключ словаря в тех же местах, где лежат id тем.
 *
 * Открытая тема живёт в sessionStorage строкой (`trainer.<lang>.theme`), и
 * словарю нужен свой идентификатор в том же поле — иначе после F5 он не
 * восстановится. Префикс `my-` не может совпасть с id темы разговорника: те
 * пронумерованы по сетке ситуаций (`greetings`, `taxi`, …).
 */
export const MY_WORDS_ID = 'my-words'

/** Слово словаря — та же фраза плюс строка колоды, из которой она пришла. */
export interface MyWord extends Phrase {
  /** id строки review_cards — по нему слово вычёркивают. */
  cardId: string
}

/** С какого интервала слово считается выученным — та же граница, что у тем. */
const LEARNED_DAYS = 21

/**
 * Карточки колоды → слова словаря.
 *
 * `known` — оригиналы фраз разговорника: их отсюда вычитаем (см. шапку файла).
 * Чтение считается на месте, а не хранится: в review_cards его колонки нет и не
 * будет, а для корейского и японского слово без чтения — это просто картинка.
 */
export function myWordsFrom(cards: ReviewCard[], lang: string, known: Set<string>): MyWord[] {
  const out: MyWord[] = []
  const seen = new Set<string>()
  for (const c of cards) {
    if (known.has(c.prompt) || seen.has(c.prompt)) continue
    seen.add(c.prompt)
    // Пусто у языков, которым чтение не нужно: у латиницы transcribe()
    // возвращает пустую строку, и строка чтения просто не рисуется.
    const reading = wordReading(c.prompt, lang) || undefined
    out.push({
      cardId: c.id,
      term: c.prompt,
      // Кнопка «В словарь» в тексте кладёт чтение ВНУТРЬ оборота («мост —
      // тари»): колонки для него в review_cards нет, а на карточке оно нужно.
      // В списке чтение стоит своей строкой, и оставить его ещё и в переводе
      // значило бы напечатать его дважды подряд.
      ru: stripReading(c.answer, reading),
      reading,
    })
  }
  return out
}

/** Убрать из оборота хвост «— чтение», если это ровно то же чтение. */
function stripReading(answer: string, reading?: string): string {
  if (!reading) return answer
  const tail = ` — ${reading}`
  return answer.endsWith(tail) ? answer.slice(0, -tail.length) : answer
}

export interface MyWordsStats {
  total: number
  learned: number
  due: number
  pct: number
}

/** Состояние словаря: сколько слов, сколько держится, сколько ждёт сегодня. */
export function myWordsStats(words: MyWord[], states: Map<string, CardState>, nowMs = Date.now()): MyWordsStats {
  const out: MyWordsStats = { total: words.length, learned: 0, due: 0, pct: 0 }
  let strength = 0
  for (const w of words) {
    const s = states.get(w.term)
    if (!s) { out.due++; continue }
    if (s.intervalDays >= LEARNED_DAYS) out.learned++
    if (isDue(s, nowMs)) out.due++
    strength += Math.min(1, s.intervalDays / LEARNED_DAYS)
  }
  out.pct = out.total === 0 ? 0 : Math.round((strength / out.total) * 100)
  return out
}

/**
 * Закреплённая плитка словаря — всегда первой в сетке наборов.
 *
 * ПОЧЕМУ ЗАКРЕПЛЁННОЙ, А НЕ ОБЫЧНОЙ. Порядок сетки задают фильтры, поиск и
 * сортировка; словарь под ними уезжал бы то на третий экран, то из выдачи
 * вовсе — а он единственная плитка, состав которой ученик собрал сам, и искать
 * её он будет глазами на одном и том же месте.
 *
 * ПУСТАЯ ПЛИТКА ТОЖЕ ОТКРЫВАЕТСЯ. Иначе про словарь узнаёт только тот, кто уже
 * умеет его наполнять; внутри как раз написано, откуда берутся слова.
 */
export function MyWordsTile({ words, states, accent, soft, onOpen }: {
  words: MyWord[]
  states: Map<string, CardState>
  accent: string
  soft: string
  onOpen: () => void
}) {
  const t = useT()
  const st = useMemo(() => myWordsStats(words, states), [words, states])
  return (
    <Tile accent={accent} stack onClick={onOpen}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <TileChip tone="accent" accent={accent} soft={soft}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <BookMarked size={11} aria-hidden /> {t('Словарь')}
          </span>
        </TileChip>
        {st.total > 0 && <TileChip>{st.total} {t('слов')}</TileChip>}
      </span>
      <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
        {t('Мои слова')}
      </span>
      <span style={{
        flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
        overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
      }}>
        {st.total > 0
          ? words.slice(0, 4).map(w => w.term).join(' · ')
          : t('Слова, которые ты забираешь из текстов и уроков. Пока пусто.')}
      </span>
      <TileMeter value={st.pct} />
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
        <span>
          {st.total === 0
            ? t('как наполнить')
            : `${st.learned} ${t('из')} ${st.total} ${t('выучено')}${st.due > 0 ? ` · ${st.due} ${t('на сегодня')}` : ''}`}
        </span>
        <span style={{ color: st.pct > 0 ? 'var(--color-green-text)' : undefined, fontWeight: st.pct > 0 ? 700 : 400 }}>
          {st.pct > 0 ? `${st.pct}%` : '—'}
        </span>
      </span>
    </Tile>
  )
}

/**
 * Открытый словарь: те же «Свайп / Списком», что у темы.
 *
 * Списком — это и есть словарь в прямом смысле: строка со словом, чтением и
 * переводом, клик раскрывает разбор и даёт вычеркнуть. Свайпом — стопка на
 * сегодня по общему расписанию.
 *
 * Стикера за прогон здесь нет намеренно: состав словаря меняется каждый день,
 * и «пройти без ошибок» значило бы разное на каждой неделе (то же правило, что
 * у колоды повторений, — см. DeckSource.reward).
 */
export function MyWordsSession({
  words, lang, subjectId, accent, owner, view, run, states, statesReady, onGraded, onForget, tourExtra,
}: {
  words: MyWord[]
  lang: string
  subjectId: string
  accent: string
  owner: { studentId?: string; anonName?: string }
  view: PhraseView
  run: RunMode
  states: Map<string, CardState>
  statesReady: boolean
  onGraded: (prompt: string, state: CardState) => void
  onForget: (word: MyWord) => void
  tourExtra?: CoachStep
}) {
  const t = useT()

  if (words.length === 0) {
    return (
      <div style={{
        padding: '22px 24px', borderRadius: 18, background: 'var(--color-bg-2)',
        border: '1px solid var(--color-border-soft)', maxWidth: 560,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Словарь пока пуст')}</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, ...proseWrap }}>
          {bindShortWords(t('Открой любой текст во «Чтении» и нажми на слово — в подсказке будет «В словарь». Там же есть кнопка «Забрать слова текста»: она кладёт сюда весь его словарик разом. Слова уроков приходят сами.'))}
        </div>
      </div>
    )
  }

  return (
    <PhraseRun
      runId="my-words"
      phrases={words}
      label={t('Мои слова')}
      doneTitle="Слова на сегодня разобраны"
      emptyTitle="На сегодня словарь закрыт"
      emptyText={'Все слова уже разобраны и ждут своего дня.\nМожно прогнать словарь заново — расписание при этом продолжит считаться.'}
      intro={
        <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: 0, lineHeight: 1.6, ...proseWrap }}>
          {bindShortWords(t('Новое сверху. Нажми на строку, чтобы разобрать слово по частям, послушать его или убрать из словаря.'))}
        </p>
      }
      lang={lang}
      subjectId={subjectId}
      accent={accent}
      owner={owner}
      view={view}
      run={run}
      states={states}
      statesReady={statesReady}
      onGraded={onGraded}
      onRemove={p => onForget(p as MyWord)}
      tourExtra={tourExtra}
    />
  )
}
