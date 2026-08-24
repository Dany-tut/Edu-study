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
// ПРОГОН ДВИГАЕТ РАСПИСАНИЕ, И ДВИГАЕТ ЕГО ЛЮБОЙ ОТВЕТ. Сначала сохранялось
// только «не знаю»: фраза падала в колоду, а «знаю» не значило ничего. Отсюда
// росли сразу три странности, и все три ученик видел своими глазами.
//   — Пройденная стопка после F5 начиналась заново: она собиралась из всех фраз
//     темы, а память о том, что их уже разобрали, нигде не хранилась.
//   — Плитка показывала процентом ДОЛЮ НЕЗНАНИЯ: «33%» означало «пять фраз я
//     завалил», а тема, пройденная целиком на «знаю», оставалась «не начатой».
//   — Число повторений подряд не копилось, то есть интервального повторения по
//     сути не было: были «фразы, которые я однажды не знал».
// Теперь каждый ответ уходит в SM-2 (gradePrompt): «знаю» = grade 4, «не знаю» =
// grade 1. Интервал растёт 1 → 6 → ~15 → ~37 дней и обнуляется на ошибке, а
// счётчики reps/lapses и есть «сколько раз подряд вспомнил» и «сколько раз
// забыл».
//
// СТОПКА — ЭТО ДОЛГ НА СЕГОДНЯ, А НЕ ВСЯ ТЕМА. В прогон попадают фразы, которых
// ученик ещё не видел, и те, чей срок подошёл. Поэтому «Стопка пройдена»
// переживает перезагрузку: разобранные фразы стоят в расписании на завтра и
// позже. Прогнать тему вне расписания можно кнопкой «Пройти заново».
//
// ПРОГРЕСС ТЕМЫ — насколько крепко она сидит: доля от «выучено» по каждой фразе,
// где выученной считается фраза с интервалом от трёх недель. Считается по одному
// запросу на весь экран (deckStates), а не по запросу на тему: тем 38.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, Layers, Sparkles, Check, RotateCcw, Trash2 } from 'lucide-react'
import type { SurvivalThemeCards, SurvivalBook, Phrase } from '../data/survivalPhrases'
import { addCards, gradePrompt, isDue, type CardState, type ReviewCard } from '../data/reviewDeck'
import { vocabImage } from '../data/vocabImages'
import { INITIAL_SRS } from '../lib/srs'
import { useT } from '../lib/i18n'
import CardDeck, { DECK_CTA, type DeckSource } from './CardDeck'
import GlossedText from './GlossedText'
import { SoundBadge, SoundTrack, useSpeakOne } from './SoundBadge'
import { type CoachStep } from './Coachmarks'
import Skeleton from './Skeleton'
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

/**
 * С какого интервала фраза считается выученной.
 *
 * Три недели — граница, на которой карточка в SM-2 перестаёт быть «свежей»:
 * до неё она возвращается почти каждый заход, после — раз в месяц и реже. Взято
 * из практики Anki (mature card), а не выведено из нашей формулы: смысл границы
 * в том, что фразу пронесли через забывание, а не в конкретном числе шагов.
 */
const LEARNED_DAYS = 21

/**
 * Стопка витрины: имя и список карточек.
 *
 * Структурный тип, а не SurvivalThemeCards, — и это не мелочь. Витрина умеет
 * ровно две вещи: посчитать по списку карточек состояние памяти и нарисовать
 * плитку с именем. Ни ситуация разговорника, ни уровень, ни сценарий ролевой
 * игры ей для этого не нужны. Пока в сигнатуре стояла тема разговорника, любой
 * второй источник стопок (наборы слов, гнёзда, личный словарь) обязан был либо
 * притвориться темой разговорника, либо завести вторую копию этой витрины.
 * SurvivalThemeCards подходит под этот тип как есть — менять его не пришлось.
 */
export interface DeckCard {
  theme: { id: string; title: string }
  phrases: Phrase[]
}

export interface ThemeStats {
  total: number
  /** Ни разу не отвечали. */
  fresh: number
  /** Отвечали, но срок ещё не подошёл и до «выучено» не дотянуло. */
  learning: number
  /** Интервал от трёх недель. */
  learned: number
  /** Срок подошёл — ждёт в стопке сегодня. */
  due: number
  /** Сколько раз по теме отвечали «не знаю» за всё время. */
  lapses: number
  /** Крепость темы, 0…100. */
  pct: number
}

/**
 * Насколько тема выучена.
 *
 * Процент считается не по числу задетых фраз, а по КРЕПОСТИ каждой: вклад фразы
 * — это её интервал, поделённый на «выучено» (три недели). Так шкала растёт от
 * каждого удачного повторения и проседает после ошибки — то есть показывает
 * состояние памяти, а не пройденные экраны. Раньше та же полоска показывала
 * долю фраз, попавших в колоду, — и честно пройденная на «знаю» тема висела с
 * нулём.
 */
export function themeStats(
  item: DeckCard,
  states: Map<string, CardState>,
  nowMs = Date.now(),
): ThemeStats {
  const out: ThemeStats = { total: item.phrases.length, fresh: 0, learning: 0, learned: 0, due: 0, lapses: 0, pct: 0 }
  let strength = 0
  for (const p of item.phrases) {
    const s = states.get(p.term)
    if (!s) { out.fresh++; out.due++; continue }
    out.lapses += s.lapses
    if (s.intervalDays >= LEARNED_DAYS) out.learned++
    else out.learning++
    if (isDue(s, nowMs)) out.due++
    strength += Math.min(1, s.intervalDays / LEARNED_DAYS)
  }
  out.pct = out.total === 0 ? 0 : Math.round((strength / out.total) * 100)
  return out
}

/** Фразы, которые попадут в сегодняшнюю стопку: новые и те, чей срок подошёл. */
export function duePhrases(phrases: Phrase[], states: Map<string, CardState>, nowMs = Date.now()): Phrase[] {
  return phrases.filter(p => isDue(states.get(p.term), nowMs))
}

// ─── Витрина ─────────────────────────────────────────────────────────────────

export default function PhraseDecks<T extends DeckCard>({ themes, states, accent, soft, levelLabel, early, lead, onOpen }: {
  /** Уже отфильтрованные стопки — фильтрация живёт в рейле. */
  themes: T[]
  /** Что колода помнит про каждую фразу; ключ — оригинал фразы. */
  states: Map<string, CardState>
  accent: string
  soft: string
  /**
   * Ступень темы в шкале языка. Приходит функцией, а не лежит в теме готовой
   * строкой: сетка ситуаций одна на все языки, а подписывается по-разному —
   * «B1» у английского и «TOPIK 3급» у корейского.
   */
  levelLabel: (item: T) => string
  /**
   * Тема выше глубины ученика по курсу.
   *
   * ПОМЕЧАЕМ, А НЕ ПРЯЧЕМ. Разговорник существует ровно для случая «завтра
   * вылет»: закрыть человеку «Больницу» на том основании, что он на седьмом
   * юните, значит отнять у него то, ради чего он сюда и пришёл. Но и молчать
   * нельзя — витрина из тридцати восьми одинаковых плиток не даёт понять, с
   * чего начинать. Поэтому плитка гасится и подписывается, а открывается как
   * все.
   */
  early?: (item: T) => boolean
  /**
   * Закреплённая плитка перед сеткой — личный словарь (см. trainer/MyWords).
   *
   * Приходит готовым узлом, а не данными: витрина знает про темы разговорника
   * и не должна знать про колоду ученика, а место у плитки одно и постоянное —
   * первое. Фильтры и поиск её не двигают: она не тема.
   */
  lead?: React.ReactNode
  onOpen: (themeId: string) => void
}) {
  const t = useT()
  if (themes.length === 0) {
    // Закреплённая плитка остаётся и при пустой выдаче: она не участвует в
    // фильтре, и убирать её вместе с темами значило бы, что словарь пропадает
    // от поиска, который его и не искал.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {lead && <TileGrid min={218}>{lead}</TileGrid>}
        <Empty text="Ничего не нашлось. Сбрось фильтр слева или поищи другое слово." />
      </div>
    )
  }
  return (
    <TileGrid min={218}>
      {lead}
      {themes.map(x => {
        const st = themeStats(x, states)
        const pct = st.pct
        const started = st.total - st.fresh > 0
        const ahead = early?.(x) ?? false
        return (
          <Tile key={x.theme.id} accent={accent} stack onClick={() => onOpen(x.theme.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: ahead ? 0.75 : 1 }}>
              {/* Ступень первой и цветом: по ней тему выбирают или пропускают,
                  а число фраз — уже подробность внутри выбранного. */}
              <TileChip tone="accent" accent={accent} soft={soft}>{levelLabel(x)}</TileChip>
              <TileChip>{x.phrases.length} {t('фраз')}</TileChip>
              {ahead && !started && <TileChip>{t('на вырост')}</TileChip>}
              {st.learned === st.total && st.total > 0 ? (
                <TileChip tone="accent" accent="var(--color-green-text)" soft="var(--color-green-soft)">
                  {t('выучено')}
                </TileChip>
              ) : started && st.due > 0 && st.due < st.total ? (
                // Долг по расписанию — единственная причина открыть тему именно
                // сейчас, поэтому он и стоит чипсом, а не строкой внизу.
                <TileChip tone="accent" accent="#f59e0b" soft="#f59e0b22">
                  {/* Круговые стрелки вместо слов «к повторению»: чипс стоял
                      втрое шире соседних и перетягивал на себя всю плитку,
                      хотя читается в нём только число. Подпись остаётся в
                      title/aria — из одной иконки смысл не восстановить. */}
                  <span
                    title={`${t('к повторению')} ${st.due}`}
                    aria-label={`${t('к повторению')} ${st.due}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <RotateCcw size={11} aria-hidden /> {st.due}
                  </span>
                </TileChip>
              ) : null}
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
            {/* Внизу — состояние памяти по теме, а не «сколько раз я ошибся»:
                выучено из скольки, и сколько ждёт сегодня. */}
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
              <span>
                {!started
                  ? t('не начата')
                  : `${st.learned} ${t('из')} ${st.total} ${t('выучено')}${st.learning > 0 ? ` · ${st.learning} ${t('на повторе')}` : ''}`}
              </span>
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

/**
 * Прогон одной стопки — общая машинка тем разговорника и личного словаря.
 *
 * ПОЧЕМУ ОБЩАЯ. Стопка — это не «тема»: это список фраз, расписание по ним и
 * два способа их пройти (глазами списком, памятью свайпом). Тема даёт этому
 * списку имя и стикер, словарь — своё имя и право вычеркнуть слово; всё
 * остальное у них совпадает до строчки, и вторая копия разъезжалась бы с
 * первой ровно там, где чинят одну (направление показа, сборка стопки, запись
 * ответа в SM-2).
 */
export function PhraseRun({
  runId, phrases, label, reward, doneTitle, emptyTitle, emptyText, intro,
  lang, subjectId, accent, owner, view, run, states, statesReady, onGraded, onRemove, tourExtra,
}: {
  /** Ключ стопки: и синтетический id карточек, и ключ перезапуска колоды. */
  runId: string
  phrases: Phrase[]
  /** Подпись над карточкой — что именно сейчас крутится. */
  label: string
  /** Стикер за чистый прогон. Не задан — награды нет (состав стопки плавает). */
  reward?: { key: string; title: string; size: number }
  doneTitle: string
  emptyTitle: string
  emptyText: string
  /** Строка над списком: чем эта стопка является. */
  intro?: React.ReactNode
  lang: string
  subjectId: string
  accent: string
  owner: Owner
  view: PhraseView
  run: RunMode
  /** Память колоды по фразам стопки — из неё собирается сегодняшняя очередь. */
  states: Map<string, CardState>
  /** Память уже прочитана из базы. До этого стопку собирать нельзя. */
  statesReady: boolean
  /** Ответ сохранён: экран обновляет свою копию памяти, не перечитывая базу. */
  onGraded: (prompt: string, state: CardState) => void
  /** Задан — в списке появляется «убрать» (личный словарь чистят руками). */
  onRemove?: (phrase: Phrase) => void
  /**
   * Шаг онбординга от экрана-владельца: переключатель «Свайп / Списком» живёт
   * в строке управления тренажёра, а подсказки — в стопке.
   */
  tourExtra?: CoachStep
}) {
  // «Пройти заново» — прогон вне расписания. Счётчик, а не флаг: каждое нажатие
  // должно пересобирать стопку, в том числе когда её уже прогнали разок.
  const [drill, setDrill] = useState(0)

  // Стопка фиксируется на момент открытия: пересчитывать её на каждый ответ
  // значило бы, что карточка исчезает из-под пальца ровно в тот момент, когда
  // её оценили. Поэтому память читается из снимка — зависимость от `states`
  // перезапускала бы сессию после каждого ответа.
  const statesRef = useRef(states)
  statesRef.current = states

  // Стабильный объект: он лежит в зависимостях загрузки стопки, и новый объект
  // на каждый рендер перезапускал бы сессию (см. DeckSource).
  const source: DeckSource = useMemo(() => ({
    load: async () => {
      const pick = drill > 0 ? phrases : duePhrases(phrases, statesRef.current)
      return pick.map((ph, i): ReviewCard => ({
        id: `sv-${runId}-${i}`,
        subject: subjectId,
        source: 'manual',
        // Обратное направление — это другой навык: вспомнить фразу по смыслу
        // труднее, чем узнать её глазами. Меняем местами обе стороны целиком, а
        // не только показ, иначе озвучка читала бы русский текст чужим голосом.
        prompt: view.reverse ? ph.ru : ph.term,
        answer: view.reverse ? ph.term : ph.ru,
        reading: view.reading ? ph.reading : undefined,
        note: ph.note,
        ex: ph.ex,
        image: vocabImage(ph.ru),
        ease: INITIAL_SRS.ease,
        intervalDays: INITIAL_SRS.intervalDays,
        reps: INITIAL_SRS.reps,
        lapses: INITIAL_SRS.lapses,
        dueAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }))
    },
    grading: 'binary',
    onVerdict: (card, known) => {
      // Сохраняется ЛЮБОЙ ответ, а не только провал: «знаю» — это следующая
      // ступень интервала, и без него никакого интервального повторения нет.
      // В колоду фраза всегда ложится оригиналом вперёд: направление показа —
      // настройка сессии, а не свойство слова.
      const prompt = view.reverse ? card.answer : card.prompt
      const answer = view.reverse ? card.prompt : card.answer
      gradePrompt(owner, { subject: subjectId, source: 'manual', prompt, answer }, known ? 4 : 1)
        .then(st => { if (st) onGraded(prompt, st) })
        .catch(e => console.error('PhraseDecks grade:', e))
    },
    judge: true,
    label,
    doneTitle,
    reward,
    emptyTitle,
    emptyText,
  }), [phrases, drill, runId, label, doneTitle, emptyTitle, emptyText, reward, subjectId, owner, view.reverse, view.reading, onGraded])

  if (run === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {intro}
        <PhraseList phrases={phrases} accent={accent} view={view} lang={lang} onRemove={onRemove} />
      </div>
    )
  }

  // Список читается и без памяти колоды, а стопка — нет: пустая память сложила
  // бы её из всей темы.
  if (!statesReady) return <Skeleton.Text lines={3} style={{ maxWidth: 420 }} />

  return (
    <CardDeck
      // Смена направления показа и «пройти заново» пересобирают сессию с нуля.
      key={`${runId}-${view.reverse ? 'r' : 'f'}-${drill}`}
      owner={owner}
      accent={accent}
      lang={view.reverse ? undefined : lang}
      subject={subjectId}
      source={source}
      emptyExtra={<DrillButton accent={accent} onClick={() => setDrill(d => d + 1)} />}
      tourExtra={tourExtra}
    />
  )
}

export function ThemeSession({ book, item, lang, subjectId, accent, owner, view, run, states, statesReady, onGraded, tourExtra }: {
  book: SurvivalBook
  item: SurvivalThemeCards
  lang: string
  subjectId: string
  accent: string
  owner: Owner
  view: PhraseView
  run: RunMode
  states: Map<string, CardState>
  statesReady: boolean
  onGraded: (prompt: string, state: CardState) => void
  tourExtra?: CoachStep
}) {
  const { theme, phrases } = item
  // Стикер за тему. Ключ без направления показа: прямой и обратный прогон —
  // один и тот же материал, и второй стикер за него был бы фармом.
  const reward = useMemo(
    () => ({ key: `sv:${book.key}:${theme.id}`, title: theme.title, size: phrases.length }),
    [book.key, theme.id, theme.title, phrases.length],
  )
  return (
    <PhraseRun
      runId={`${book.key}-${theme.id}`}
      phrases={phrases}
      label={theme.title}
      reward={reward}
      doneTitle="Стопка пройдена"
      // Пустая стопка здесь — не «нечего учить», а «всё стоит в расписании»:
      // формулировка по умолчанию («карточки набираются сами») в этом месте
      // читалась бы как поломка.
      emptyTitle="На сегодня тема закрыта"
      emptyText={'Все фразы этой темы уже разобраны и ждут своего дня.\nМожно прогнать её заново — расписание при этом продолжит считаться.'}
      lang={lang}
      subjectId={subjectId}
      accent={accent}
      owner={owner}
      view={view}
      run={run}
      states={states}
      statesReady={statesReady}
      onGraded={onGraded}
      tourExtra={tourExtra}
    />
  )
}

/** «Пройти заново» — стопка вне расписания, под пустой и под пройденной колодой. */
function DrillButton({ accent, onClick }: { accent: string; onClick: () => void }) {
  const t = useT()
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: DECK_CTA.gap, borderRadius: 999,
        height: DECK_CTA.height, padding: DECK_CTA.padding,
        border: `1px solid ${accent}66`, background: 'transparent', color: accent,
        fontFamily: 'inherit', fontSize: DECK_CTA.fontSize, fontWeight: DECK_CTA.fontWeight, cursor: 'pointer',
      }}
    >
      <RotateCcw size={DECK_CTA.icon} /> {t('Пройти заново')}
    </button>
  )
}

/**
 * Стопка списком — чтение глазами перед прогоном.
 *
 * Нужен потому, что свайп проверяет память, а первый заход по новой теме
 * памяти ещё не имеет: карточка «봉투 필요하세요?» человеку, который видит фразу
 * впервые, — это сорок нажатий «не знаю» подряд. Список даёт прочитать тему
 * целиком за минуту и только потом идти в колоду.
 *
 * КЛИК РАСКРЫВАЕТ ФРАЗУ ЦЕЛИКОМ. Строка списка набрана мелко — сорок фраз
 * должны помещаться на экран, — но чужое письмо мелким кеглем не читается:
 * в 받침 не видно, 을 там или 슬. Поэтому клик по строке плавно раздувает
 * оригинал вдвое прямо на его месте (кегль анимируется, а не transform: строка
 * должна раздвинуть соседние, а не наехать на них) и открывает под ним заметку
 * и пример употребления.
 */
function PhraseList({ phrases, accent, view, lang, onRemove }: {
  phrases: Phrase[]; accent: string; view: PhraseView; lang: string
  /**
   * Вычеркнуть строку. Задан только у личного словаря: тему разговорника
   * ученик не редактирует, а своё слово, взятое по ошибке, обязан уметь убрать
   * — иначе оно возвращается по расписанию годами.
   */
  onRemove?: (phrase: Phrase) => void
}) {
  const t = useT()
  const [open, setOpen] = useState<number | null>(null)

  // Озвучка строки — общая на весь продукт (components/SoundBadge): говорит
  // одна фраза, второй тап по ней же — «замолчи», речь глохнет при уходе со
  // списка. Раньше это была своя ручка speak() на файл.
  const { speaking, say } = useSpeakOne()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {phrases.map((p, i) => {
        const on = open === i
        const sp = speaking?.id === `p${i}` ? speaking : null
        return (
          <div
            key={`${p.term}-${i}`}
            onClick={() => setOpen(on ? null : i)}
            style={{
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 14,
              // Место под значок звука в правом верхнем углу — как у карточки
              // слова и у карточки стопки: один угол на весь продукт.
              padding: '11px 14px', paddingRight: 46,
              background: 'var(--color-bg-2)',
              border: `1px solid ${sp ? accent : on ? `${accent}55` : 'var(--color-border-soft)'}`,
              cursor: 'pointer',
              transition: 'border-color 0.2s ease',
            }}
          >
            {/* Звук строки — в её правом верхнем углу. Здесь значок сам кнопка:
                тап по строке уже занят — им её раскрывают. */}
            <SoundBadge
              accent={accent}
              soft={`${accent}22`}
              on={!!sp && !sp.done}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); say(`p${i}`, p.term, lang) }}
              label={t('Послушать')}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Раскрытая фраза разбирается по клику на слово: 데워 주세요 —
                  это «разогрейте» плюс вежливая просьба, и без разбора формула
                  заучивается заклинанием (см. GlossedText и lib/lexicon.ts).

                  Только в раскрытом виде: в свёрнутой строке клик принадлежит
                  самой строке — им её и открывают. Клик по слову дальше не
                  идёт, иначе разбор тут же схлопывал бы карточку. */}
              <div
                onClick={on ? e => e.stopPropagation() : undefined}
                style={{
                  fontSize: on ? 30 : 15, fontWeight: 650, color: 'var(--color-text)',
                  lineHeight: 1.3, letterSpacing: on ? 0.2 : 0,
                  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  transition: 'font-size 0.24s cubic-bezier(0.2, 0.7, 0.3, 1), letter-spacing 0.24s ease',
                }}
              >
                {on
                  ? <GlossedText text={p.term} lang={lang} accent={accent} />
                  : p.term}
              </div>
              {view.reading && p.reading && (
                <div style={{
                  fontSize: on ? 14 : 11.5, color: 'var(--color-text-3)', marginTop: on ? 4 : 2,
                  transition: 'font-size 0.24s cubic-bezier(0.2, 0.7, 0.3, 1), margin-top 0.24s ease',
                }}>
                  {p.reading}
                </div>
              )}
              {/* Заметка раскрывается по клику, а не висит всегда: у половины
                  фраз она в три строки, и лист темы стал бы простынёй. */}
              {on && p.note && (
                <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 8, lineHeight: 1.5 }}>
                  {p.note}
                </div>
              )}
              {/* Пример — та же фраза внутри предложения. Оригинал крупнее
                  перевода: смотреть надо на него, перевод только подтверждает
                  догадку. Пример слушают отдельно от заглавной фразы, поэтому
                  кнопка у него своя — и, как у фразы, стоит вплотную к тексту:
                  оба динамика ищут в одном месте, слева, а не по краям. */}
              {on && p.ex && (
                <div style={{
                  position: 'relative', marginTop: 10, paddingLeft: 10, paddingRight: 34,
                  borderLeft: `2px solid ${accent}55`,
                }}>
                  {/* Пример слушают отдельно от заглавной фразы — и значок у
                      него в СВОЁМ правом верхнем углу, той же формы. */}
                  <SoundBadge
                    accent={accent}
                    soft={`${accent}22`}
                    on={speaking?.id === `x${i}` && !speaking.done}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); say(`x${i}`, p.ex!.term, lang) }}
                    label={t('Послушать пример')}
                    size={24}
                    inset={0}
                  />
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      fontSize: 17, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.35,
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    }}
                  >
                    <GlossedText text={p.ex.term} lang={lang} accent={accent} />
                  </div>
                  {view.reading && p.ex.reading && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{p.ex.reading}</div>
                  )}
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.45 }}>
                    {p.ex.ru}
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--color-text-2)', flexShrink: 0, maxWidth: '42%', textAlign: 'right', lineHeight: 1.4 }}>
              {p.ru}
            </div>
            {/* «Убрать» — только у раскрытой строки: корзина у каждого из
                четырёхсот слов превратила бы словарь в панель управления, а
                нужна она раз в сто строк. Раскрытая строка — это и есть «я
                сейчас разбираюсь именно с этим словом». */}
            {/* Бегунок озвучки по нижнему краю строки — общий на весь продукт. */}
            {sp && <SoundTrack state={sp} accent={accent} soft={`${accent}33`} />}

            {onRemove && on && (
              <button
                onClick={e => { e.stopPropagation(); onRemove(p) }}
                title={t('Убрать из словаря')}
                aria-label={t('Убрать из словаря')}
                style={{
                  flexShrink: 0, display: 'flex', border: 'none', background: 'none', padding: 0,
                  cursor: 'pointer', color: 'var(--color-text-3)',
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
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

/** Подпись под колодой — что делает ответ. */
export function DeckHint() {
  const t = useT()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      fontSize: 11.5, color: 'var(--color-text-3)',
    }}>
      <Layers size={12} />
      {t('Каждый ответ двигает расписание: «знаю» отодвигает фразу дальше, «не знаю» возвращает её завтра.')}
    </div>
  )
}
