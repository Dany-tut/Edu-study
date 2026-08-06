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
import { RotateCcw, Volume2, Undo2, Layers } from 'lucide-react'
import { dueCards, gradeCard, type ReviewCard } from '../data/reviewDeck'
import { intervalLabel, review, type ReviewGrade } from '../lib/srs'
import { haptic } from '../lib/feedback'
import { speechLocale, speechMs, speechText } from '../lib/speech'
import { useT } from '../lib/i18n'
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
}

export default function CardDeck({ owner, accent, lang, subject, emptyExtra, source }: {
  owner?: { studentId?: string; anonName?: string }
  accent: string
  /** Код языка для озвучки (en, ko, ja). Без него кнопка «послушать» не рисуется. */
  lang?: string
  subject?: string
  /** Что показать под пустой колодой — например «загрузить слова из текстов». */
  emptyExtra?: React.ReactNode
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

  useEffect(() => {
    let alive = true
    const load = source ? source.load() : dueCards(owner ?? {}, 20)
    load.then(cards => {
      if (!alive) return
      // Демо-подмена только у колоды повторений: своя стопка пустая значит
      // пустая, и подсовывать в неё корейские слова было бы враньём.
      const use = cards.length === 0 && import.meta.env.DEV && !source ? DEMO_CARDS : cards
      setQueue(buildQueue(use, source ? source.judge ?? false : true))
    })
    return () => { alive = false }
  }, [owner?.studentId, owner?.anonName, source])

  const seat = queue && idx < queue.length ? queue[idx] : null

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

  /** Свайп → грейд. У judge направление и ЕСТЬ ответ, у recall — самооценка. */
  const swipe = useCallback((dir: Dir) => {
    if (!seat) return
    haptic(12)
    if (dir === 'down') return answer(null)
    if (seat.kind === 'judge') {
      const said = dir !== 'left'          // вправо и вверх = «верно»
      return answer(said === seat.truth ? 4 : 1)
    }
    if (!revealed && dir !== 'left') { setRevealed(true); return }  // сначала покажи ответ
    answer(dir === 'left' ? 1 : dir === 'up' ? 5 : 4)
  }, [seat, revealed, answer])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!seat) return
      if (e.key === 'ArrowLeft') swipe('left')
      else if (e.key === 'ArrowRight') swipe('right')
      else if (e.key === 'ArrowUp') swipe('up')
      else if (e.key === 'ArrowDown') swipe('down')
      else if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r) }
      else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [seat, swipe])

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
        icon={<div style={{ fontSize: 34 }}>✅</div>}
        title={source?.doneTitle ? t(source.doneTitle) : t('На сегодня всё повторено')}
        text={binary
          ? `${t('Знаю:')} ${stats.right} · ${t('в повторение:')} ${stats.wrong}`
          : `${t('Верно с первого раза:')} ${stats.right} · ${t('ошибок:')} ${stats.wrong}`}
        // Промах на ПОСЛЕДНЕЙ карточке иначе не отменить: сессия уже закрыта,
        // а кнопка «вернуть» живёт только под стопкой.
        extra={<>
          {undoStack.current.length > 0 && <UndoButton onClick={undo} label={t('вернуть последнюю')} />}
          {emptyExtra}
        </>}
      />
    </Shell>
  )

  const done = queue.filter((_, i) => i < idx).length
  const progress = Math.round((done / queue.length) * 100)

  return (
    <Shell>
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

      <div style={{ position: 'relative', height: 262, touchAction: 'none' }}>
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
        />
      </div>

      <div style={{ marginTop: 16 }}>
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
        <UndoButton onClick={undo} label={t('вернуть')} disabled={undoStack.current.length === 0} />
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          {t('тяни карточку · вниз — отложить')}
        </span>
      </div>
    </Shell>
  )
}

// ─── Карточка ────────────────────────────────────────────────────────────────

function Card({ seat, accent, lang, revealed, binary, onFlip, onSwipe }: {
  seat: Seat; accent: string; lang?: string; revealed: boolean; binary: boolean
  onFlip: () => void; onSwipe: (d: Dir) => void
}) {
  const t = useT()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-260, 260], [-16, 16])
  const yesOpacity = useTransform(x, [26, 110], [0, 1])
  const noOpacity = useTransform(x, [-110, -26], [1, 0])
  const laterOpacity = useTransform(y, [26, 110], [0, 1])
  const dragged = useRef(false)

  /** Идёт ли озвучка: под карточкой на это время заполняется линия. */
  const [speaking, setSpeaking] = useState<{ run: number; ms: number } | null>(null)
  const runRef = useRef(0)

  // Карточку смахнули, пока она говорила — звук обрываем: слово уже улетело с
  // экрана. Следующая карточка зазвучать раньше не может, ей нужен клик.
  useEffect(() => () => {
    if (runRef.current > 0 && typeof window !== 'undefined') window.speechSynthesis?.cancel()
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

    if (!dir) { animate(x, 0, { duration: 0.18 }); animate(y, 0, { duration: 0.18 }); return }
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
    const done = () => setSpeaking(cur => (cur?.run === run ? null : cur))
    u.onend = done
    u.onerror = done
    setSpeaking({ run, ms: speechMs(text) })
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }

  return (
    <motion.div
      drag
      dragElastic={0.55}
      dragMomentum={false}
      style={{
        x, y, rotate, position: 'absolute', inset: 0, zIndex: 2,
        borderRadius: 20, background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
        padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center',
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
      <Overlay side="right" opacity={yesOpacity} label={judge ? t('верно') : t('знаю')} tone="good" />
      <Overlay side="bottom" opacity={laterOpacity} label={t('отложить')} tone="mute" />

      {judge ? (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.35 }}>
            {seat.card.prompt} <span style={{ color: 'var(--color-text-3)' }}>=</span> {seat.shown}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 10 }}>{t('верно или нет?')}</div>
        </>
      ) : (
        <>
          {/* Кегль по длине: слово должно читаться через всю комнату, а условие
              задания на 300 знаков тем же кеглем просто не влезет в карточку. */}
          <div style={{
            fontSize: promptSize, fontWeight: promptSize > 20 ? 700 : 550,
            color: 'var(--color-text)', lineHeight: promptSize > 20 ? 1.3 : 1.45,
            textAlign: promptSize > 20 ? 'center' : 'left',
            maxHeight: revealed ? 118 : 200, overflowY: 'auto', width: '100%',
          }}>
            {seat.card.prompt}
          </div>
          {revealed ? (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-soft)', width: '100%' }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--color-green-text)', lineHeight: 1.4 }}>
                {seat.card.answer}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12 }}>{t('нажми, чтобы перевернуть')}</div>
          )}
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
            borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
          }}
        >
          <span
            key={speaking.run}
            className="vocab-speak-fill"
            style={{ background: accent, animationDuration: `${speaking.ms}ms` }}
          />
        </span>
      )}
    </motion.div>
  )
}

function Overlay({ side, opacity, label, tone }: {
  side: 'left' | 'right' | 'bottom'
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
        ...(side === 'bottom'
          ? { bottom: 54, left: '50%', transform: 'translateX(-50%)' }
          : { top: 16, [side]: 16 }),
        padding: '6px 14px', borderRadius: 999, background: bg, color,
        border: `1px solid ${color}`, fontSize: 12, fontWeight: 800, pointerEvents: 'none',
      }}
    >
      {label}
    </motion.span>
  )
}

function UndoButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999,
        border: '1px solid var(--color-border-soft)', background: 'transparent', fontFamily: 'inherit',
        fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--color-text-3)' : 'var(--color-text-2)',
      }}
    >
      <Undo2 size={13} /> {label}
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
        display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
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
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-muted)' }}>{text}</div>
      {extra && <div style={{ marginTop: 14 }}>{extra}</div>}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>{children}</div>
}
