// Карточный режим тренажёра — стопка карточек, которую разбирают свайпом.
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ ReviewSession. Планировщик тот же (SM-2 из lib/srs) и
// колода та же (review_cards), но механика ввода другая: там кнопки под
// карточкой, здесь жест. Разница не косметическая — карточка на свайпе стоит
// одно движение вместо «прочитал → нашёл кнопку → прицелился», и на телефоне
// это разница между «повторил 40 слов в метро» и «не открыл».
//
// ДВА ТИПА КАРТОЧЕК В ОДНОЙ КОЛОДЕ.
//   recall — классика: тап переворачивает, дальше сам оцениваешь, помнил или нет.
//   judge  — утверждение «слово = перевод», свайп СРАЗУ и есть ответ, переворот
//            не нужен. Перевод либо настоящий, либо занят у соседней карточки.
// Чередование важнее, чем кажется: сорок одинаковых карточек подряд ученик
// домалывает на автопилоте, а смена формата заставляет каждый раз читать.
// Оба типа сводятся к грейду SM-2, поэтому расписание одно на всю колоду.
//
// ЧЕГО ЗДЕСЬ НЕТ. Карточка не удаляется жестом — смахивание обязано быть
// обратимым, поэтому вниз это «отложить до конца сессии», а не «убрать».

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { RotateCcw, Volume2, Undo2, Layers, HelpCircle } from 'lucide-react'
import { dueCards, gradeCard, type ReviewCard } from '../data/reviewDeck'
import { subjectAliases, useStudentData } from '../store/studentDataStore'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { intervalLabel, review, type ReviewGrade } from '../lib/srs'
import { haptic } from '../lib/feedback'
import { speechLocale, speechMs, speechText } from '../lib/speech'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap, balancedWrap } from '../lib/typography'
import { awardDeckSticker, markSeen, stickerLabel, type EarnedSticker } from '../lib/stickers'
import { tierOf } from '../lib/holo/presets'
import Coachmarks, { type CoachStep } from './Coachmarks'
import DeckDoneMark from './DeckDoneMark'
import HoloSticker from './HoloSticker'
import GlossedText from './GlossedText'
import Skeleton from './Skeleton'

type Kind = 'recall' | 'judge'
/** Направление броска. Вниз — «отложить», грейда не даёт. */
type Dir = 'left' | 'right' | 'up' | 'down'

interface Seat {
  /** Уникален на место в очереди: повтор той же карточки должен быть новым ключом. */
  key: string
  card: ReviewCard
  kind: Kind
  /** judge: показанный перевод — настоящий или чужой. */
  shown?: string
  /** judge: правда ли то, что написано на карточке. */
  truth?: boolean
  /** Карточка вернулась внутри сессии после ошибки. */
  again?: boolean
}

const TONE: Record<string, string> = {
  bad: 'var(--color-red-text)', hard: '#f59e0b', good: 'var(--color-green-accent)', easy: 'var(--color-green-text)',
}

const SWIPE_PX = 96      // порог срыва по смещению
const SWIPE_V = 460      // ...или по скорости броска

/**
 * Высота ряда кнопок под стопкой резервируется заранее и НЕ зависит от того,
 * перевёрнута карточка или нет: «Показать ответ» — одна кнопка, оценка — две
 * или четыре, и без резерва строка «вернуть · тяни карточку» подпрыгивала на
 * каждый переворот. Числа согласованы с minHeight у ActionButton.
 */
const ACT_H = 52         // кнопка без подсказки об интервале
const ACT_H_HINT = 56    // ...и с подсказкой

/**
 * Половина переворота: до ребра, где стороны и меняются местами. Полный поворот
 * вдвое дольше — держать в согласии с `deckFlipA/B` в index.css.
 */
const FLIP_MS = 160

/**
 * Демо-колода для DEV: без неё режим нечем проверить локально — карточки
 * приходят из review_cards, а там пусто, пока ученик не поучился на живой базе.
 * Тем же приёмом банк заданий держит DEV_SEED_TASKS. Такие карточки не пишутся
 * в базу при оценке (строки с их id не существует) — см. isDemo.
 */
const DEMO_CARDS: ReviewCard[] = [
  ['사과', 'яблоко'], ['물', 'вода'], ['학교', 'школа'],
  ['친구', 'друг'], ['책', 'книга'], ['시간', 'время'],
].map(([prompt, answer], i) => ({
  id: `demo-${i}`, source: 'manual' as const, prompt, answer,
  ease: 2.5, intervalDays: 0, reps: 0, lapses: 0,
  dueAt: new Date().toISOString(), createdAt: new Date().toISOString(),
}))

const isDemo = (card: ReviewCard) => card.id.startsWith('demo-')

/**
 * Онбординг стопки проходится один раз на браузер, дальше только по кнопке
 * «подсказки» под колодой.
 *
 * ЗАЧЕМ ОН ЗДЕСЬ. Стопка — единственный экран тренажёра, где главная механика
 * не нарисована: то, что карточку тянут в четыре стороны и что тап её
 * переворачивает, ниоткуда не видно. Ученик вместо жестов жмёт кнопки внизу,
 * а «отложить» не находит вовсе. Одна строка-подпись под колодой это не
 * лечила: её читают уже после того, как способ работы выбран.
 */
const TOUR_KEY = 'card-deck-tour-v1'

/**
 * Собирает очередь сессии. Каждая третья карточка становится judge — при
 * условии, что есть у кого занять чужой перевод: без дистрактора утверждение
 * всегда истинно, и ученик через минуту свайпает вправо не читая.
 */
function buildQueue(cards: ReviewCard[], judge: boolean): Seat[] {
  return cards.map((card, i) => {
    const others = cards.filter(c => c.id !== card.id && c.answer !== card.answer)
    if (judge && i % 3 === 2 && others.length > 0) {
      const lie = Math.random() < 0.5
      const shown = lie ? others[Math.floor(Math.random() * others.length)].answer : card.answer
      return { key: `${card.id}-${i}`, card, kind: 'judge' as const, shown, truth: !lie }
    }
    return { key: `${card.id}-${i}`, card, kind: 'recall' as const }
  })
}

/**
 * Откуда колода берёт карточки и что делает с ответом.
 *
 * Без source стопка работает как раньше: колода повторений ученика и SM-2.
 * С source тем же движком можно прогнать что угодно — банк заданий, слова
 * урока, подборку учителя, — не заводя вторую копию стопки со свайпом.
 *
 * ВАЖНО: объект должен быть стабильным (useMemo). Он лежит в зависимостях
 * загрузки, и новый объект на каждый рендер перезапускал бы сессию.
 */
export interface DeckSource {
  load: () => Promise<ReviewCard[]>
  /**
   * 'srs' — четыре кнопки самооценки, ответ двигает расписание повторений.
   * 'binary' — «знаю / не знаю» без расписания: прогон материала, у которого
   * своего интервала нет (задания банка живут в собственной статистике).
   */
  grading?: 'srs' | 'binary'
  /** Вердикт в режиме binary — например, положить незнакомое в колоду повторений. */
  onVerdict?: (card: ReviewCard, known: boolean) => void
  /** Подмешивать ли judge-карточки. У заданий банка они бессмысленны. */
  judge?: boolean
  /** Подпись над карточкой вместо автоматической («повторение», «ошибка…»). */
  label?: string
  emptyTitle?: string
  emptyText?: string
  doneTitle?: string
  /**
   * Стопка награждается стикером за ЧИСТЫЙ прогон (см. lib/stickers).
   *
   * Задан только там, где стопка = обозримая тема с постоянным составом:
   * разговорник, слова урока. Колода повторений своей награды не имеет —
   * её состав меняется каждый день, и «пройти без ошибок» там значит разное.
   *
   * size — сколько карточек в теме ЦЕЛИКОМ. Загруженная стопка обычно меньше
   * (расписание отдаёт только созревшие фразы), и без сверки стикер выдавался
   * бы за три карточки, доехавшие до повторения сегодня.
   */
  reward?: { key: string; title: string; size: number }
}

/**
 * Метрики кнопок под пустой и под пройденной стопкой. Общие, потому что
 * `emptyExtra` приходит снаружи и встаёт в один ряд с «вернуть последнюю»:
 * без единой высоты ряд выглядит сломанным.
 */
export const DECK_CTA = {
  height: 34,
  padding: '0 14px',
  fontSize: 12.5,
  fontWeight: 650,
  gap: 6,
  icon: 14,
} as const

export default function CardDeck({ owner, accent, lang, subject, emptyExtra, source, tourExtra }: {
  owner?: { studentId?: string; anonName?: string }
  accent: string
  /** Код языка для озвучки (en, ko, ja). Без него кнопка «послушать» не рисуется. */
  lang?: string
  /**
   * Предмет экрана (слаг реестра или русское имя). Задан — колода читается
   * только по нему: в языковом тренажёре чужие карточки и лимит сессии съедают,
   * и озвучиваются голосом не того языка. Не задан — вся колода, как на общем
   * экране повторения.
   */
  subject?: string
  /** Что показать под пустой колодой — например «загрузить слова из текстов». */
  emptyExtra?: React.ReactNode
  /**
   * Шаг онбординга от экрана-владельца. Нужен для того, что к стопке относится,
   * но живёт снаружи неё, — например переключатель «Свайп / Списком» в строке
   * управления. Встаёт вторым, сразу после вводного: это выбор способа работы,
   * и узнать о нём надо до жестов, а не после.
   */
  tourExtra?: CoachStep
  /** Своя стопка вместо колоды повторений. */
  source?: DeckSource
}) {
  const t = useT()
  const [queue, setQueue] = useState<Seat[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState({ right: 0, wrong: 0 })
  // Снимки для «вернуть»: очередь целиком, потому что ошибка меняет её хвост.
  const undoStack = useRef<{ queue: Seat[]; idx: number; stats: { right: number; wrong: number } }[]>([])

  const binary = source?.grading === 'binary'

  // ── Онбординг ──────────────────────────────────────────────────────────────
  const headRef = useRef<HTMLDivElement | null>(null)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const actionsRef = useRef<HTMLDivElement | null>(null)
  const undoRef = useRef<HTMLDivElement | null>(null)
  const [tour, setTour] = useState(false)
  // Открыть можно только один раз за монтирование: эффект висит на готовности
  // колоды, а та меняется и дальше по ходу сессии.
  const tourShown = useRef(false)

  /**
   * Показ жестов вместо их описания.
   *
   * Фраза «тяни влево — не помню, вправо — помню» на бумаге понятна, а руками
   * не запоминается: ученик дочитывает её и всё равно жмёт кнопки. Поэтому на
   * шаге про жесты карточка ездит сама — по очереди в каждую сторону, с той же
   * плашкой, которая появляется при настоящем свайпе. Легенда в подсказке при
   * этом подсвечивает ту строку, которую карточка показывает сейчас.
   */
  const [demoDir, setDemoDir] = useState<Dir | null>(null)
  const [tourStep, setTourStep] = useState<string | null>(null)
  const onTourStep = useCallback((id: string | null) => setTourStep(id), [])

  useEffect(() => {
    if (tourStep !== 'gestures') { setDemoDir(null); return }
    // Вверх («легко») бывает только у самооценки: в режиме «знаю / не знаю»
    // верх и право — один и тот же ответ, и показывать их отдельно значило бы
    // выдумать жест, которого нет.
    const dirs: Dir[] = binary ? ['left', 'right', 'down'] : ['left', 'right', 'up', 'down']
    let k = 0
    setDemoDir(dirs[0])
    const id = window.setInterval(() => { k = (k + 1) % dirs.length; setDemoDir(dirs[k]) }, 2100)
    return () => { window.clearInterval(id); setDemoDir(null) }
  }, [tourStep, binary])

  // Синонимы предмета зависят от курсов ученика, а те приезжают асинхронно:
  // считать список один раз на монтировании значит на холодной загрузке
  // потерять карточки, записанные под short_id курса. Поэтому подписываемся на
  // курсы — колода перечитается, когда список приедет.
  const courses = useStudentData(s => s.subjects)
  const subjects = useMemo(() => subject ? subjectAliases(subject) : undefined, [subject, courses])

  useEffect(() => {
    let alive = true
    const load = source ? source.load() : dueCards(owner ?? {}, 20, subjects)
    load.then(cards => {
      if (!alive) return
      // Демо-подмена только у колоды повторений: своя стопка пустая значит
      // пустая, и подсовывать в неё корейские слова было бы враньём.
      const use = cards.length === 0 && import.meta.env.DEV && !source ? DEMO_CARDS : cards
      setQueue(buildQueue(use, source ? source.judge ?? false : true))
    })
    return () => { alive = false }
  }, [owner?.studentId, owner?.anonName, source, subjects])

  const seat = queue && idx < queue.length ? queue[idx] : null

  /**
   * Стикер за чистый прогон стопки.
   *
   * ВЫДАЁМ ЗДЕСЬ, А НЕ В ИСТОЧНИКЕ: «стопка закрыта» знает только сама стопка —
   * у источника есть onVerdict по карточке, но нет момента, когда очередь
   * кончилась. Условие строгое: ни одного «не знаю» за сессию, включая те, что
   * ученик потом отыграл возвратом карточки, — иначе стикер выдавался бы за
   * умение доскроллить.
   *
   * Награду показываем сразу на этом же экране и тут же помечаем просмотренной,
   * иначе StickerRevealGate покажет её второй раз при заходе на главную.
   */
  const [award, setAward] = useState<EarnedSticker | null>(null)
  const awarded = useRef(false)

  useEffect(() => {
    if (seat || awarded.current) return
    const studentId = owner?.studentId
    const reward = source?.reward
    if (!reward || !studentId || !queue?.length) return
    if (stats.wrong > 0 || stats.right < queue.length) return
    if (queue.length < reward.size) return
    awarded.current = true
    awardDeckSticker({
      studentId, deckKey: reward.key, title: reward.title, subject, cards: queue.length,
    })
      .then(sticker => {
        if (!sticker) return
        markSeen(studentId, [sticker.id])
        setAward(sticker)
      })
      .catch(e => console.error('deck sticker:', e))
  }, [seat, queue, stats, owner?.studentId, source, subject])

  // Ждём первую карточку на экране: без неё подсвечивать нечего, а на пустой
  // колоде онбординг про жесты не нужен вовсе.
  useEffect(() => {
    if (!seat || tourShown.current) return
    tourShown.current = true
    try {
      if (!localStorage.getItem(TOUR_KEY)) setTour(true)
    } catch { /* приватный режим — просто без онбординга */ }
  }, [seat])

  const closeTour = useCallback(() => {
    setTour(false)
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* не критично */ }
  }, [])

  /**
   * Ответ по карточке. Грейд уходит в SM-2 сразу, а ошибочная карточка
   * возвращается ЧЕРЕЗ НЕСКОЛЬКО МЕСТ в этой же сессии: без такого возврата
   * сессия из двадцати карточек с восемью провалами не учит ничему — всё
   * забытое ученик увидит только завтра.
   *
   * Повтор внутри сессии расписание уже не двигает: интервал определяет первый
   * ответ, иначе достаточно «провалить и тут же вспомнить», чтобы карточка
   * улетела на неделю.
   */
  const answer = useCallback((grade: ReviewGrade | null) => {
    if (!queue || !seat) return
    undoStack.current.push({ queue, idx, stats })

    if (grade === null) {
      // Отложено: карточка уезжает в конец очереди, не тронув расписание.
      const rest = queue.filter((_, i) => i !== idx)
      setQueue([...rest, { ...seat, key: seat.key + '-later' }])
      setRevealed(false)
      return
    }

    if (!seat.again) {
      if (binary) source?.onVerdict?.(seat.card, grade >= 3)
      else if (!isDemo(seat.card)) gradeCard(seat.card, grade).catch(e => console.error('gradeCard:', e))
      setStats(s => grade < 3 ? { ...s, wrong: s.wrong + 1 } : { ...s, right: s.right + 1 })
      // Виджет прогресса в верхней строке. Считаем здесь, а не в каждом
      // экране-владельце колоды: карточка — единственная единица работы,
      // общая и разговорнику, и повторению, и прогону банка.
      useTrainerProgress.getState().noteAnswer(grade >= 3)
    }

    let next = queue
    if (grade < 3) {
      // Возврат — всегда recall: провалившуюся карточку нужно увидеть с ответом.
      const at = Math.min(idx + 5, queue.length)
      next = [...queue]
      next.splice(at, 0, { key: seat.key + '-again', card: seat.card, kind: 'recall', again: true })
    }
    setQueue(next)
    setIdx(i => i + 1)
    setRevealed(false)
  }, [queue, seat, idx, stats, binary, source])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    // Расписание карточки при этом уже записано; следующий ответ его перезапишет.
    setQueue(prev.queue); setIdx(prev.idx); setStats(prev.stats); setRevealed(false)
  }, [])

  /**
   * Заберёт ли жест карточку из стопки. Нужно самой карточке: свайп, который
   * её НЕ забирает (вправо по неперевёрнутой — это «покажи ответ»), не имеет
   * права улетать за край. Улетевшую никто не размонтирует — ключ места не
   * поменялся, — и она застревает за экраном, а на её месте остаётся пустая
   * карточка из-под низа стопки. Снаружи это и выглядит как «свайп подвис».
   */
  const consumes = useCallback((dir: Dir) => {
    if (!seat) return false
    if (dir === 'down' || seat.kind === 'judge') return true
    return revealed || dir === 'left'
  }, [seat, revealed])

  /** Свайп → грейд. У judge направление и ЕСТЬ ответ, у recall — самооценка. */
  const swipe = useCallback((dir: Dir) => {
    if (!seat) return
    haptic(12)
    if (dir === 'down') return answer(null)
    if (seat.kind === 'judge') {
      const said = dir !== 'left'          // вправо и вверх = «верно»
      return answer(said === seat.truth ? 4 : 1)
    }
    if (!consumes(dir)) { setRevealed(true); return }  // сначала покажи ответ
    answer(dir === 'left' ? 1 : dir === 'up' ? 5 : 4)
  }, [seat, consumes, answer])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Пока идёт онбординг, стрелки листают подсказки: иначе один нажатый
      // «вправо» и шаг пролистнёт, и карточку смахнёт.
      if (!seat || tour) return
      if (e.key === 'ArrowLeft') swipe('left')
      else if (e.key === 'ArrowRight') swipe('right')
      else if (e.key === 'ArrowUp') swipe('up')
      else if (e.key === 'ArrowDown') swipe('down')
      else if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r) }
      else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [seat, swipe, tour])

  if (queue === null) return <Shell><Skeleton.Text lines={3} style={{ maxWidth: 320 }} /></Shell>

  if (queue.length === 0) return (
    <Shell>
      <Empty
        icon={<Layers size={26} style={{ color: 'var(--color-text-3)' }} />}
        title={source?.emptyTitle ? t(source.emptyTitle) : t('Колода пуста')}
        text={source?.emptyText
          ? t(source.emptyText)
          : t('Карточки набираются сами: слова из текстов и уроков, ошибки из тренажёра. Как только что-то появится — вернётся сюда.')}
        extra={emptyExtra}
      />
    </Shell>
  )

  if (!seat) return (
    <Shell>
      <Empty
        // Стикер вытесняет знак: два «поздравительных» рисунка на одном экране
        // спорят, а стикер и есть главное событие этого кадра.
        icon={award
          ? <DeckAward sticker={award} />
          : <DeckDoneMark accent={accent} />}
        title={award
          ? t('Стикер за тему')
          : source?.doneTitle ? t(source.doneTitle) : t('На сегодня всё повторено')}
        // Имя тира идёт первой строкой награды: балл нарисован на самом
        // стикере, а словами он объясняет, чем этот стикер лучше предыдущего.
        text={[
          award ? `«${t(tierOf(award.score).name)}» · ${t('вся тема без ошибок')}` : '',
          binary
            ? `${t('Знаю:')} ${stats.right} · ${t('в повторение:')} ${stats.wrong}`
            : `${t('Верно с первого раза:')} ${stats.right} · ${t('ошибок:')} ${stats.wrong}`,
        ].filter(Boolean).join('\n')}
        // Промах на ПОСЛЕДНЕЙ карточке иначе не отменить: сессия уже закрыта,
        // а кнопка «вернуть» живёт только под стопкой.
        extra={<>
          {undoStack.current.length > 0 && <UndoButton onClick={undo} label={t('вернуть последнюю')} big />}
          {emptyExtra}
        </>}
      />
    </Shell>
  )

  const done = queue.filter((_, i) => i < idx).length
  const progress = Math.round((done / queue.length) * 100)

  // Шаги онбординга. Собираются по фактическому составу стопки: рассказывать
  // про утверждения «слово = перевод» там, где judge-карточек нет, значит
  // обещать механику, которой ученик не увидит.
  const hasJudge = queue.some(s => s.kind === 'judge')
  const steps: CoachStep[] = [
    {
      title: t('Стопка на жестах'),
      text: t('Карточка проходится одним движением: посмотрел, вспомнил, смахнул. Полминуты на подсказки — дальше сам.'),
    },
    ...(tourExtra ? [tourExtra] : []),
    {
      ref: stackRef,
      title: t('Тап переворачивает'),
      text: lang
        ? t('Нажми на карточку — на обороте перевод, чтение и пример. Динамик внизу читает вслух, его можно жать сколько угодно.')
        : t('Нажми на карточку — на обороте перевод и разбор. Сначала вспомни сам, потом переворачивай: в этом весь смысл.'),
    },
    {
      ref: stackRef,
      id: 'gestures',
      title: t('Смотри, что делает карточка'),
      text: (
        <>
          <div style={{ marginBottom: 9 }}>
            {t('Она сейчас показывает каждый жест сама. Плашка на карточке — это ответ, который уйдёт в расписание.')}
          </div>
          <SwipeLegend rows={swipeRows(binary, t)} active={demoDir} accent={accent} />
        </>
      ),
    },
    ...(hasJudge ? [{
      ref: stackRef,
      title: t('Иногда — утверждение'),
      text: t('Часть карточек приходит в виде «слово = перевод». Переворачивать нечего: свайп влево или вправо и есть ответ — верно там написано или нет.'),
    }] : []),
    {
      ref: actionsRef,
      title: t('То же самое кнопками'),
      text: binary
        ? t('Если тянуть неудобно — те же ответы кнопками. «Не знаю» кладёт карточку в колоду повторений, и она вернётся по расписанию.')
        : t('Если тянуть неудобно — те же ответы кнопками. Под каждой написано, через сколько карточка вернётся: ответ двигает расписание.'),
    },
    {
      ref: headRef,
      title: t('Сколько осталось'),
      text: t('Полоса — прогресс стопки, справа — сколько карточек в очереди. Ошибка не пропадает: карточка вернётся через несколько мест в этой же сессии с пометкой «ещё раз».'),
    },
    {
      ref: undoRef,
      title: t('Смахнул не туда'),
      text: t('«Вернуть» отменяет последний ответ вместе с оценкой. Работает и на последней карточке, когда стопка уже закрылась.'),
    },
  ]

  return (
    <Shell>
      <div ref={headRef}>
        {/* Полоса вместо счётчика «3 / 20»: точное число оставшегося ученик
            начинает считать и обрывает сессию на «ещё пять». */}
        <div style={{ height: 4, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden', marginBottom: 7 }}>
          <motion.div
            animate={{ width: `${Math.max(progress, 3)}%` }}
            transition={{ duration: 0.25 }}
            style={{ height: '100%', borderRadius: 999, background: accent }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <RotateCcw size={12} /> {seat.again ? t('возврат после ошибки') : source?.label ? t(source.label) : sourceLabel(seat, t)}
          </span>
          <span>{t('осталось')} {queue.length - idx}</span>
        </div>
      </div>

      {/* Высота стопки фиксирована (карточки не должны прыгать при перевороте),
          но считается по самой полной обороте: перевод + заметка + пример
          употребления. На 262 пикселях пример уходил под нижний край, на 300 —
          не влезала полная оборота карточки с рисунком: место под перевод
          резервируется и на лицевой стороне, и картинка с фразой съедали его
          вдвоём. */}
      <div ref={stackRef} style={{ position: 'relative', height: 364, touchAction: 'none' }}>
        {/* Задние карточки — статичные, только намёк на глубину стопки. */}
        {queue.slice(idx + 1, idx + 3).map((s, k) => (
          <div
            key={s.key}
            style={{
              position: 'absolute', inset: 0, borderRadius: 20,
              background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
              transform: `translateY(${(k + 1) * 9}px) scale(${1 - (k + 1) * 0.035})`,
              opacity: k === 0 ? 0.75 : 0.4, zIndex: 1,
            }}
          />
        ))}
        <Card
          key={seat.key}
          seat={seat}
          accent={accent}
          lang={lang}
          revealed={revealed}
          binary={binary}
          onFlip={() => setRevealed(r => !r)}
          onSwipe={swipe}
          consumes={consumes}
          demo={demoDir}
        />
      </div>

      {/* Место под кнопки зарезервировано по САМОМУ высокому набору для этого
          режима: «Показать ответ» — одна кнопка, оценка — две или четыре с
          подсказкой об интервале, и без резерва строка «вернуть · тяни
          карточку» прыгала на каждый переворот. Одинокая кнопка растягивается
          в слот, а не висит в нём с провалом снизу. */}
      <div
        ref={actionsRef}
        style={{
          marginTop: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          minHeight: seat.kind === 'judge' || binary ? ACT_H : ACT_H_HINT * 2 + 8,
        }}
      >
        {seat.kind === 'judge' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ActionButton tone="bad" label={t('Неверно')} onClick={() => swipe('left')} />
            <ActionButton tone="good" label={t('Верно')} onClick={() => swipe('right')} />
          </div>
        ) : !revealed ? (
          <button
            onClick={() => setRevealed(true)}
            style={{
              width: '100%', padding: 14, borderRadius: 14, border: 'none', background: accent,
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              // Тянется по слоту, но не превращается в плашку во всю его высоту.
              flex: '1 1 auto', minHeight: ACT_H, maxHeight: 72,
            }}
          >
            {t('Показать ответ')}
          </button>
        ) : binary ? (
          // Прогон банка: интервалов у задания нет, поэтому и четырёх градаций
          // не нужно — «не знаю» отправляет задание в колоду повторений.
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <ActionButton tone="bad" label={t('Не знаю')} onClick={() => answer(1)} />
            <ActionButton tone="good" label={t('Знаю')} onClick={() => answer(4)} />
          </div>
        ) : (
          // Два столбца, а не четыре: «Не помню» в четверть ширины телефона
          // переносится на две строки и рвёт ряд, да и палец в узкую колонку
          // целится хуже. Та же сетка, что у кнопок повторения в ReviewSession.
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              { grade: 1 as ReviewGrade, label: t('Не помню'), tone: 'bad' },
              { grade: 3 as ReviewGrade, label: t('Трудно'), tone: 'hard' },
              { grade: 4 as ReviewGrade, label: t('Хорошо'), tone: 'good' },
              { grade: 5 as ReviewGrade, label: t('Легко'), tone: 'easy' },
            ]).map(g => (
              <ActionButton
                key={g.grade}
                tone={g.tone}
                label={g.label}
                hint={intervalLabel(review(seat.card, g.grade, Date.now()).intervalDays)}
                onClick={() => answer(g.grade)}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
        <div ref={undoRef} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <UndoButton onClick={undo} label={t('вернуть')} disabled={undoStack.current.length === 0} />
          {/* Онбординг проходят один раз, а забывают, какой свайп что значит, на
              третий день. Поэтому подсказки должны вызываться, и вызываться
              отсюда: строка про жесты уже здесь. */}
          <button
            onClick={() => setTour(true)}
            aria-label={t('Показать подсказки')}
            style={{
              display: 'flex', alignItems: 'center', padding: 6, borderRadius: 999,
              border: '1px solid var(--color-border-soft)', background: 'transparent',
              color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <HelpCircle size={13} />
          </button>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          {t('тяни карточку · вниз — отложить')}
        </span>
      </div>

      <Coachmarks steps={steps} open={tour} onClose={closeTour} accent={accent} onStepChange={onTourStep} />
    </Shell>
  )
}

// ─── Карточка ────────────────────────────────────────────────────────────────

function Card({ seat, accent, lang, revealed, binary, onFlip, onSwipe, consumes, demo }: {
  seat: Seat; accent: string; lang?: string; revealed: boolean; binary: boolean
  onFlip: () => void; onSwipe: (d: Dir) => void
  /** Заберёт ли жест карточку из стопки — от этого зависит, улетать ей или нет. */
  consumes: (d: Dir) => boolean
  /** Онбординг просит показать жест: карточка отъезжает в эту сторону и назад. */
  demo?: Dir | null
}) {
  const t = useT()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-260, 260], [-16, 16])
  const yesOpacity = useTransform(x, [26, 110], [0, 1])
  const noOpacity = useTransform(x, [-110, -26], [1, 0])
  const laterOpacity = useTransform(y, [26, 110], [0, 1])
  const easyOpacity = useTransform(y, [-110, -26], [1, 0])
  const dragged = useRef(false)

  // Показ жеста для онбординга. Уезжаем НЕ до порога срыва, а чуть дальше того
  // места, где загорается плашка: смысл в том, чтобы ученик увидел ответ
  // подписанным, а не в том, чтобы карточку смахнуть. Обратно — сами, ответ при
  // этом не засчитывается: onSwipe отсюда не зовётся вовсе.
  // Поза ДЕРЖИТСЯ, пока подсказка показывает этот жест, и меняется только вместе
  // с ней. Сначала было иначе — карточка отъезжала и сама возвращалась по
  // таймеру, — и стоило анимации чуть отстать, как на карточке горело «знаю», а
  // в легенде подсвечивалась уже другая строка. Один источник времени: смена
  // `demo`.
  useEffect(() => {
    if (!demo) {
      animate(x, 0, { duration: 0.3 })
      animate(y, 0, { duration: 0.3 })
      return
    }
    // Вниз — короче остальных: карточка подсказки стоит под стопкой, и на
    // большом смещении и сама карточка, и плашка «отложить» уезжают ей за
    // спину — жест показан, а увидеть его нельзя.
    const to = demo === 'left' ? { mx: -165, my: 0 }
      : demo === 'right' ? { mx: 165, my: 0 }
      : demo === 'up' ? { mx: 0, my: -118 }
      : { mx: 0, my: 88 }
    // Через центр: из «вправо» сразу в «вниз» карточка ехала бы по диагонали,
    // то есть показывала бы жест, которого нет.
    animate(x, 0, { duration: 0.18 })
    animate(y, 0, { duration: 0.18 })
    const go = window.setTimeout(() => {
      animate(x, to.mx, { duration: 0.42 })
      animate(y, to.my, { duration: 0.42 })
    }, 190)
    return () => window.clearTimeout(go)
  }, [demo, x, y])

  // ── Переворот ───────────────────────────────────────────────────────────────
  // Карточка именно поворачивается, а не меняет содержимое на месте: уходит
  // ребром к зрителю, на этом кадре стороны меняются местами, и она
  // доворачивается обратно. Через ±90° не проходим — иначе видна изнанка с
  // зеркальным текстом.
  //
  // На положение фразы поворот не влияет: место под оборот зарезервировано на
  // обеих сторонах (см. ниже), и после поворота слово стоит на том же пикселе.
  // `face` — сторона, которая СЕЙЧАС нарисована; она отстаёт от `revealed` на
  // первую половину анимации, в этом весь смысл.
  //
  // ПОЧЕМУ CSS-АНИМАЦИЯ, А НЕ animate() ИЗ FRAMER. Смена стороны привязана к
  // середине поворота, а framer крутит анимации на requestAnimationFrame: там,
  // где rAF не идёт, onComplete не приходит вовсе — и карточка не просто теряет
  // анимацию, а перестаёт открывать ответ. У @keyframes покой — это отсутствие
  // анимации, поэтому любой сбой отдаёт карточку зрителю ровной, а не ребром.
  //
  // `flips` — счётчик поворотов; по его чётности берётся одно из двух одинаковых
  // имён анимации. Без чередования второй переворот подряд не проигрывается.
  const [flips, setFlips] = useState(0)
  const [face, setFace] = useState(revealed)
  const faceRef = useRef(revealed)

  useEffect(() => {
    if (faceRef.current === revealed) return
    faceRef.current = revealed
    setFlips(n => n + 1)
    const t = setTimeout(() => setFace(revealed), FLIP_MS)
    return () => clearTimeout(t)
  }, [revealed])

  /** Идёт ли озвучка: по низу карточки на это время заполняется линия.
   *  `done` — слово уже смолкло: длительность синтеза известна лишь прикидкой,
   *  и линию по факту окончания дотягиваем до конца, а не бросаем на середине. */
  const [speaking, setSpeaking] = useState<{ run: number; ms: number; done?: boolean } | null>(null)
  const runRef = useRef(0)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Карточку смахнули, пока она говорила — звук обрываем: слово уже улетело с
  // экрана. Следующая карточка зазвучать раньше не может, ей нужен клик.
  useEffect(() => () => {
    if (runRef.current > 0 && typeof window !== 'undefined') window.speechSynthesis?.cancel()
    if (hideRef.current) clearTimeout(hideRef.current)
  }, [])

  const judge = seat.kind === 'judge'
  const len = seat.card.prompt.length
  const promptSize = len <= 24 ? 30 : len <= 60 ? 22 : len <= 160 ? 16 : 14

  function onDragEnd(_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    const { offset, velocity } = info
    const horizontal = Math.abs(offset.x) >= Math.abs(offset.y)
    const dir: Dir | null = horizontal
      ? (offset.x > SWIPE_PX || velocity.x > SWIPE_V ? 'right'
        : offset.x < -SWIPE_PX || velocity.x < -SWIPE_V ? 'left' : null)
      : (offset.y > SWIPE_PX || velocity.y > SWIPE_V ? 'down'
        : offset.y < -SWIPE_PX || velocity.y < -SWIPE_V ? 'up' : null)

    // Палец отпущен — жест кончился. Флаг снимаем всегда, а не только в клике:
    // клика после броска может не быть вовсе (палец ушёл мимо карточки), и
    // застрявший флаг съедал следующий тап — переворот срабатывал со второго раза.
    setTimeout(() => { dragged.current = false }, 60)

    if (!dir) { animate(x, 0, { duration: 0.18 }); animate(y, 0, { duration: 0.18 }); return }

    // Жест, который карточку не забирает (вправо или вверх по неперевёрнутой —
    // это «покажи ответ»), обязан вернуть её на место. Улетевшую никто не
    // размонтирует — место в очереди то же, ключ тот же, — и она застревает за
    // краем экрана, а в стопке остаётся пустая карточка из-под низа. Снаружи
    // это выглядело как «свайп подвис, приходится помогать».
    if (!consumes(dir)) {
      animate(x, 0, { duration: 0.18 })
      animate(y, 0, { duration: 0.18 })
      onSwipe(dir)
      return
    }

    // Карточка улетает, и только потом очередь сдвигается — иначе следующая
    // карточка появляется под пальцем раньше, чем предыдущая ушла с экрана.
    const fly = dir === 'left' ? { mx: -620, my: 0 } : dir === 'right' ? { mx: 620, my: 0 }
      : dir === 'up' ? { mx: 0, my: -520 } : { mx: 0, my: 520 }
    animate(x, fly.mx, { duration: 0.24 })
    animate(y, fly.my, { duration: 0.24 })
    setTimeout(() => onSwipe(dir), 170)
  }

  function say(e: React.MouseEvent) {
    e.stopPropagation()
    if (!lang || typeof window === 'undefined' || !window.speechSynthesis) return
    // Романизация из «아이 (ai)» в озвучку не идёт: иначе слышно слово и следом
    // его латинскую запись — как будто оно произнеслось дважды.
    const text = speechText(seat.card.prompt)
    const u = new SpeechSynthesisUtterance(text)
    u.lang = speechLocale(lang) ?? lang
    // Номер запуска: cancel() ниже добьёт предыдущую озвучку, и её onend придёт
    // уже после старта новой. Без сверки номера этот запоздалый onend погасил бы
    // индикатор слова, которое только что зазвучало.
    const run = ++runRef.current
    // Слово смолкло — линию не гасим на полпути, а докатываем до края и уже
    // потом снимаем: прикидка длительности всегда мимо, и обрыв в середине
    // читается как «бегунок не успел».
    const done = () => {
      setSpeaking(cur => (cur?.run === run ? { ...cur, done: true } : cur))
      if (hideRef.current) clearTimeout(hideRef.current)
      hideRef.current = setTimeout(() => {
        setSpeaking(cur => (cur?.run === run ? null : cur))
      }, 260)
    }
    u.onend = done
    u.onerror = done
    if (hideRef.current) clearTimeout(hideRef.current)
    setSpeaking({ run, ms: speechMs(text) })
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    // Поворот живёт на отдельной обёртке, а не на самой карточке: transform
    // карточки занят перетаскиванием (framer пишет туда x/y/поворот в плоскости
    // и переписал бы rotateY на первом же кадре драга). Перспектива обязательна,
    // без неё rotateY — это просто сжатие по горизонтали, а не разворот листа.
    <div
      className={flips === 0 ? undefined : flips % 2 ? 'deck-flip-a' : 'deck-flip-b'}
      style={{ position: 'absolute', inset: 0, zIndex: 2 }}
    >
    <motion.div
      drag
      dragElastic={0.55}
      dragMomentum={false}
      style={{
        x, y, rotate, position: 'absolute', inset: 0,
        borderRadius: 20, background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
        // Обрезка по скруглению: линия озвучки идёт по самому низу карточки, и
        // без неё её прямые концы вылезают за дугу нижних углов — полоса читается
        // как отдельный элемент под карточкой, а не как её край.
        overflow: 'hidden',
        padding: 22,
        // Кнопка озвучки висит абсолютом по нижнему краю, и место под неё
        // резервируется НА ОБЕИХ сторонах: разные отступы у лица и оборота —
        // это разная высота содержимого, то есть скачок при перевороте.
        paddingBottom: lang ? 46 : 22,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', cursor: 'grab', userSelect: 'none',
      }}
      whileTap={{ cursor: 'grabbing' }}
      onDragStart={() => { dragged.current = true }}
      onDragEnd={onDragEnd}
      // Тап переворачивает — но только если это был тап, а не конец перетаскивания.
      onClick={() => { if (dragged.current) { dragged.current = false; return } if (!judge) onFlip() }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16 }}
    >
      <Overlay side="left" opacity={noOpacity} label={judge ? t('неверно') : binary ? t('не знаю') : t('не помню')} tone="bad" />
      {/* Подписи сторон парные: слева «не знаю»/«не помню» — значит справа
          «знаю»/«помню». Разнобой («не помню» слева и «знаю» справа) читается
          как два разных вопроса. */}
      <Overlay side="right" opacity={yesOpacity} label={judge ? t('верно') : binary ? t('знаю') : t('помню')} tone="good" />
      <Overlay side="bottom" opacity={laterOpacity} label={t('отложить')} tone="mute" />
      {/* «Легко» — только у самооценки: в режимах «знаю / не знаю» и «верно или
          нет» верх это тот же ответ, что и вправо, и подписывать его отдельно
          значило бы обещать оценку, которой нет. */}
      {!judge && !binary && (
        <Overlay side="top" opacity={easyOpacity} label={t('легко')} tone="good" />
      )}

      {judge ? (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.35, ...balancedWrap }}>
            {bindShortWords(seat.card.prompt)} <span style={{ color: 'var(--color-text-3)' }}>=</span> {bindShortWords(seat.shown ?? '')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 10 }}>{t('верно или нет?')}</div>
        </>
      ) : (
        <>
          {/* Карточка поделена на две доли ФИКСИРОВАННОГО размера, и фраза
              прижата к их границе снизу. Так она стоит примерно по центру
              карточки независимо от того, что на обороте: раньше место под
              оборот резервировалось по её содержимому, и карточка с чтением,
              заметкой и примером задирала слово к самому верху.
              Доли неравные (56/44): верхней нужно вместить рисунок с фразой,
              а однострочная фраза при таком делении садится ровно в центр. */}
          <div style={{
            flex: '56 1 0', minHeight: 0, width: '100%',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* marginTop: auto вместо justifyContent: flex-end — прижатое
                флексом содержимое, когда оно не влезло, обрезается сверху и до
                него не доскроллить. */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              {/* Предметный рисунок на лицевой стороне: слово вспоминается от
                  предмета, а не от русского перевода — перевод и есть ответ,
                  который сейчас закрыт. Размер один на обе стороны: раньше
                  картинка ужималась под переворот, и вместе с ней ползло вверх
                  само слово. */}
              {seat.card.image && (
                <img
                  src={seat.card.image}
                  alt=""
                  style={{
                    display: 'block', width: 92, height: 'auto',
                    borderRadius: 12, background: '#fff', marginBottom: 10, flexShrink: 0,
                  }}
                />
              )}
              {/* Кегль по длине: слово должно читаться через всю комнату, а
                  условие задания на 300 знаков тем же кеглем не влезет. */}
              <div style={{
                fontSize: promptSize, fontWeight: promptSize > 20 ? 700 : 550,
                color: 'var(--color-text)', lineHeight: promptSize > 20 ? 1.3 : 1.45,
                textAlign: promptSize > 20 ? 'center' : 'left', width: '100%',
                // Крупное слово по центру — строки поровну; длинное условие
                // слева читается абзацем, там pretty.
                ...(promptSize > 20 ? balancedWrap : proseWrap),
              }}>
                {bindShortWords(seat.card.prompt)}
              </div>
            </div>
          </div>
          {/* Нижняя доля — оборот. Она своя ВСЕГДА, и на лицевой стороне тоже,
              просто прозрачная: переворот не меняет ни одной высоты, поэтому
              фраза стоит на том же пикселе, а под ней проявляются черта и
              перевод. Раньше блока на лицевой не было вовсе, колонка на
              перевороте становилась выше и слово подскакивало; плавно это
              выглядело только у карточек с картинкой, где высоту меняла её
              анимация ширины и скачок размазывался по этим 180 мс.

              Прокручивается оборот целиком, а не по кускам: перевод, заметка и
              пример вместе бывают выше своей доли. Отдельные maxHeight внутри
              для этого не годятся — они режут каждый блок по своей мерке. */}
          <div style={{
            position: 'relative', width: '100%',
            marginTop: 12, paddingTop: 12,
            // Черта нарисована на обеих сторонах, но на лицевой прозрачная:
            // убрать её вовсе значит отдать пиксель высоты и сдвинуть слово.
            borderTop: `1px solid ${face ? 'var(--color-border-soft)' : 'transparent'}`,
            flex: '44 1 0', minHeight: 0, overflowY: face ? 'auto' : 'hidden',
          }}>
            <div
              aria-hidden={!face}
              style={{
                // Без плавности: стороны меняются на кадре, где карточка стоит
                // ребром и не видна вовсе. Проявляться поверх поворота значит
                // показать перевод сквозь ещё не довёрнутое лицо.
                opacity: face ? 1 : 0,
                pointerEvents: face ? undefined : 'none',
              }}
            >
              {/* Чтение стоит ВЫШЕ перевода и мельче: оно относится к тому, что
                  написано на лицевой стороне, а не к ответу. Показывается
                  только после переворота — иначе фразу читают латиницей и
                  оригинал перестаёт запоминаться. */}
              {seat.card.reading && (
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: 0.2 }}>
                  {seat.card.reading}
                </div>
              )}
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-green-text)', lineHeight: 1.4, ...balancedWrap }}>
                {bindShortWords(seat.card.answer)}
              </div>
              {/* Заметка — то, ради чего фразу и стоило учить: когда так
                  говорить нельзя и что ответят. Прокручивается, а не растит
                  карточку: высота стопки фиксирована. */}
              {seat.card.note && (
                <div style={{
                  marginTop: 8,
                  fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-muted)', ...proseWrap,
                }}>
                  {seat.card.note}
                </div>
              )}
              {/* Пример — фраза внутри живого предложения. Стоит последним и
                  прижат к левому краю: это не ответ, а иллюстрация к нему, и
                  читается он строкой, а не заголовком. */}
              {seat.card.ex && (
                <div
                  // Клик по слову примера разбирает его, а не переворачивает
                  // карточку: на обороте переворот уже сделал своё дело, и
                  // единственное, зачем сюда тычут пальцем, — «что это за кусок
                  // в середине предложения».
                  onClick={e => e.stopPropagation()}
                  style={{
                    marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--color-border-soft)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.4 }}>
                    {lang
                      ? <GlossedText text={seat.card.ex.term} lang={lang} accent={accent} />
                      : seat.card.ex.term}
                  </div>
                  {seat.card.ex.reading && (
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 2, letterSpacing: 0.2 }}>
                      {seat.card.ex.reading}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', marginTop: 3, lineHeight: 1.45 }}>
                    {seat.card.ex.ru}
                  </div>
                </div>
              )}
            </div>
            {/* Подсказка лежит поверх зарезервированного места, а не в потоке:
                в потоке она добавляла бы свою высоту к высоте оборота. */}
            <div
              aria-hidden={face}
              style={{
                position: 'absolute', left: 0, right: 0, top: 12,
                fontSize: 12, color: 'var(--color-text-3)', pointerEvents: 'none',
                opacity: face ? 0 : 1,
              }}
            >
              {t('нажми, чтобы перевернуть')}
            </div>
          </div>
        </>
      )}

      {seat.again && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: 'var(--color-bg-3)', color: 'var(--color-muted)',
        }}>
          {t('ещё раз')}
        </div>
      )}

      {lang && (
        <button
          onClick={say}
          aria-label={t('Послушать')}
          style={{
            position: 'absolute', bottom: 14, padding: '7px 11px', borderRadius: 999, cursor: 'pointer',
            border: '1px solid var(--color-border-soft)', background: 'transparent', color: accent,
            display: 'flex', alignItems: 'center', fontFamily: 'inherit',
          }}
        >
          <Volume2 size={15} />
        </button>
      )}

      {/* Индикатор озвучки — тот же, что у слов урока: линия по нижнему краю
          заполняется, пока слово произносится. Ключ по номеру запуска, иначе
          повторный клик по уже звучащей карточке не перезапустил бы анимацию.
          Анимация чисто CSS: rAF в превью не срабатывает. */}
      {speaking && (
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 3,
            background: `${accent}33`, overflow: 'hidden',
            opacity: speaking.done ? 0 : 1, transition: 'opacity 240ms linear',
          }}
        >
          <span
            key={speaking.run}
            className={`vocab-speak-fill${speaking.done ? ' vocab-speak-fill--done' : ''}`}
            style={{ background: accent, animationDuration: `${speaking.ms}ms` }}
          />
        </span>
      )}
    </motion.div>
    </div>
  )
}

// ─── Легенда жестов в онбординге ─────────────────────────────────────────────

interface SwipeRow { dir: Dir; arrow: string; label: string; note: string; tone: 'bad' | 'good' | 'mute' }

/**
 * Что означает каждая сторона. Порядок тот же, в котором карточка показывает
 * жесты, — легенда читается сверху вниз вместе с показом.
 */
function swipeRows(binary: boolean, t: (s: string) => string): SwipeRow[] {
  return [
    binary
      ? { dir: 'left', arrow: '←', label: t('не знаю'), note: t('уйдёт в колоду повторений'), tone: 'bad' }
      : { dir: 'left', arrow: '←', label: t('не помню'), note: t('вернётся сегодня же'), tone: 'bad' },
    binary
      ? { dir: 'right', arrow: '→', label: t('знаю'), note: t('вернётся через день и позже'), tone: 'good' }
      : { dir: 'right', arrow: '→', label: t('помню'), note: t('интервал вырастет'), tone: 'good' },
    ...(binary ? [] : [{ dir: 'up' as Dir, arrow: '↑', label: t('легко'), note: t('интервал прыгнет дальше'), tone: 'good' as const }]),
    { dir: 'down', arrow: '↓', label: t('отложить'), note: t('уедет в конец стопки'), tone: 'mute' },
  ]
}

function SwipeLegend({ rows, active, accent }: {
  rows: SwipeRow[]
  /** Жест, который карточка показывает прямо сейчас. */
  active: Dir | null
  accent: string
}) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {rows.map(r => {
        const on = r.dir === active
        const color = r.tone === 'bad' ? 'var(--color-red-text)'
          : r.tone === 'good' ? 'var(--color-green-text)'
          : 'var(--color-muted)'
        return (
          <div
            key={r.dir}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 7,
              padding: '5px 8px', borderRadius: 10,
              // Подсветка строки, а не смена её цвета: цвет здесь уже занят
              // смыслом ответа (красный — забыл, зелёный — вспомнил).
              background: on ? `${accent}22` : 'transparent',
              transition: 'background 0.25s ease',
            }}
          >
            <span style={{
              width: 13, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: 800,
              color: on ? accent : 'var(--color-text-3)', transition: 'color 0.25s ease',
            }}>
              {r.arrow}
            </span>
            <span style={{ fontSize: 13, fontWeight: 750, color, flexShrink: 0 }}>{r.label}</span>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-3)' }}>— {r.note}</span>
          </div>
        )
      })}
    </div>
  )
}

function Overlay({ side, opacity, label, tone }: {
  side: 'left' | 'right' | 'top' | 'bottom'
  opacity: ReturnType<typeof useTransform<number, number>>
  label: string
  tone: 'bad' | 'good' | 'mute'
}) {
  const color = tone === 'bad' ? 'var(--color-red-text)' : tone === 'good' ? 'var(--color-green-text)' : 'var(--color-muted)'
  const bg = tone === 'bad' ? 'var(--color-red-soft)' : tone === 'good' ? 'var(--color-green-soft)' : 'var(--color-bg-3)'
  return (
    <motion.span
      style={{
        opacity, position: 'absolute',
        // Верхняя и нижняя плашки стоят по центру и с отступом от края: сверху
        // на самом краю уже живёт метка «ещё раз», и две подписи налезали бы
        // друг на друга ровно на возвращённой карточке.
        ...(side === 'bottom' ? { bottom: 54, left: '50%', transform: 'translateX(-50%)' }
          : side === 'top' ? { top: 54, left: '50%', transform: 'translateX(-50%)' }
          : { top: 16, [side]: 16 }),
        padding: '6px 14px', borderRadius: 999, background: bg, color,
        border: `1px solid ${color}`, fontSize: 12, fontWeight: 800, pointerEvents: 'none',
      }}
    >
      {label}
    </motion.span>
  )
}

/**
 * `big` — вариант под пройденной стопкой: там кнопка стоит в ряд с «Пройти
 * заново», и обе обязаны быть одной высоты. В строке под колодой она мелкая,
 * вровень с кнопкой подсказок.
 */
function UndoButton({ onClick, label, disabled, big }: {
  onClick: () => void; label: string; disabled?: boolean; big?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: big ? DECK_CTA.gap : 5, borderRadius: 999,
        ...(big
          ? { height: DECK_CTA.height, padding: DECK_CTA.padding, fontSize: DECK_CTA.fontSize, fontWeight: DECK_CTA.fontWeight }
          : { padding: '6px 12px', fontSize: 12, fontWeight: 600 }),
        border: '1px solid var(--color-border-soft)', background: 'transparent', fontFamily: 'inherit',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--color-text-3)' : 'var(--color-text-2)',
      }}
    >
      <Undo2 size={big ? DECK_CTA.icon : 13} /> {label}
    </button>
  )
}

function ActionButton({ tone, label, hint, onClick }: {
  tone: string; label: string; hint?: string; onClick: () => void
}) {
  const color = TONE[tone] ?? 'var(--color-text-2)'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${color}`, background: 'transparent',
        color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center',
        // Высота задана, а не набрана содержимым: слот под рядом кнопок считается
        // по этим числам, и «на глаз» они разъезжаются на первом же переводе.
        minHeight: hint ? ACT_H_HINT : ACT_H,
      }}
    >
      {label}
      {hint && <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.85 }}>{hint}</span>}
    </button>
  )
}

function sourceLabel(seat: Seat, t: (s: string) => string): string {
  if (seat.again) return t('возврат после ошибки')
  if (seat.card.source === 'trainer') return t('ошибка из тренажёра')
  if (seat.card.source === 'diagnostic') return t('ошибка из диагностики')
  return t('повторение')
}

function Empty({ icon, title, text, extra }: {
  icon: React.ReactNode; title: string; text: string; extra?: React.ReactNode
}) {
  return (
    <div style={{
      padding: '32px 22px', borderRadius: 20, textAlign: 'center',
      border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
    }}>
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{
        fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6,
        ...balancedWrap,
      }}>{bindShortWords(title)}</div>
      {/* Длину строки держим сами: на широком экране абзац растягивался во всю
          карточку и ломался где придётся. `\n` в тексте = отдельный абзац. */}
      <div style={{ maxWidth: 380, margin: '0 auto' }}>
        {text.split('\n').map((line, i) => (
          <div key={i} style={{
            fontSize: 13, lineHeight: 1.6, color: 'var(--color-muted)',
            marginTop: i ? 6 : 0, ...balancedWrap,
          }}>{bindShortWords(line)}</div>
        ))}
      </div>
      {/* Кнопок под пройденной стопкой бывает две — «вернуть» и «пройти
          заново». Ряд задаётся здесь, чтобы отступ между ними не зависел от
          того, кто их прислал. */}
      {extra && (
        <div style={{
          marginTop: 14, display: 'flex', flexWrap: 'wrap',
          justifyContent: 'center', alignItems: 'center', gap: 8,
        }}>{extra}</div>
      )}
    </div>
  )
}

/**
 * Награда за чистый прогон стопки — тот же голо-стикер, что лежит в коллекции.
 *
 * Эмблему НЕ раздаём по коллекции (как это делает StickerRevealModal): всей
 * коллекции здесь нет, а тянуть её ради одного стикера значит на финале сессии
 * сходить в базу за всей историей проверок. Эмблема выводится из id и совпадёт
 * с коллекцией везде, кроме редкого случая, когда хеш столкнулся с уже занятой.
 */
function DeckAward({ sticker }: { sticker: EarnedSticker }) {
  const t = useT()

  // Имя тира здесь НЕ печатаем: над заголовком оно читается раньше него
  // («Безупречно» → «Стикер за тему»), поэтому уехало в строку статистики.
  return (
    <HoloSticker
      score={sticker.score}
      label={stickerLabel(sticker, t)}
      sublabel={sticker.lessonTitle.slice(0, 22)}
      stickerId={sticker.id}
      size={168}
      reveal
    />
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>{children}</div>
}
