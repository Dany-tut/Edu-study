import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Empty } from './TrainerShell'
import { useT } from '../../lib/i18n'
import { byDay, dayLabel, type FeedFilter, type FeedItem } from '../../data/feed'
import { RubricChip, type Rubric } from '../FeedRubricChip'
import { FeedPost } from './FeedPost'
import PullStamp from '../PullStamp'
import { usePullRefresh, PULL_THRESHOLD } from '../../lib/usePullRefresh'

// ─────────────────────────────────────────────────────────────────────────────
// Лента: всё происходит В ЛЕНТЕ
//
// ГЛАВНОЕ ПРАВИЛО ЭКРАНА — ОТСЮДА НИКУДА НЕ УВОДЯТ. Ни в читалку, ни в
// слушалку, ни на разбор с вопросами. Ленту листают: текст читается на месте,
// ролик играет на месте, перевод открывается на месте, комментарий пишется на
// месте. Любой переход превращает ленту в оглавление упражнений, а листать
// оглавление никто не будет.
//
// ПОЭТОМУ ЗДЕСЬ НЕТ ВОПРОСОВ И ТЕСТОВ. Они остались в «Текстах» и «Сценах», где
// человек приходит заниматься. В ленту заходят посмотреть, что нового, и
// проверка понимания мешает ровно тому, ради чего сюда заходят.
//
// САМ ПОСТ ЖИВЁТ В FeedPost — общий с лентой мобильной главной. Здесь остаётся
// только то, что своё у этого экрана: разделители-даты и пустое состояние.
// ─────────────────────────────────────────────────────────────────────────────

// ПРОСМОТРЕННОЕ СЧИТАЕТСЯ САМО. Кнопки «отметить прочитанным» здесь нет и быть
// не должно: она превращает ленту в список дел. Пост, побывший на экране,
// уходит в просмотренные молча (lib/feedRead) — ровно этим и живёт счётчик
// «новое» на главной и в навбаре.

/**
 * Ширина колонки ленты на большом экране.
 *
 * 680 — ширина мобильной ленты, растянутая на монитор: на телефоне она во весь
 * экран и смотрится нормально, а на 1440 та же колонка занимала половину места
 * рядом с рейлом и читалась как узкая полоска. Здесь ролик — полноправный
 * материал, и 16:9 на 680 px это маленькое окно.
 *
 * Во всю ширину при этом НЕЛЬЗЯ: строка на 1000 px — это под 130 знаков, и
 * глаз теряет начало следующей строки. 880 — предел, за которым текст поста
 * начинает читаться хуже, а не лучше.
 */
export const FEED_W = 880

// ─── Тяга сверху ────────────────────────────────────────────────────────────
//
// ПОЧЕМУ ИМЕННО ЗДЕСЬ. Лента — единственный экран платформы, содержимое
// которого меняется само (ночная сборка), и «а что нового?» — вопрос ровно к
// нему. На главной тянуть было нечего: и «Продолжить», и «Сегодня» приходят
// из стора и живут своей жизнью.
//
// ЧТО ПРОИСХОДИТ ПО ЖЕСТУ. Сама лента приезжает со сборкой, поэтому «дёрнуть
// список» ничего бы не принесло. Тянем за настоящим: спрашиваем сервер, нет
// ли новой сборки (lib/appUpdate). Есть — таблетка обновления предложит её
// забрать, и вместе с ней приедут новые материалы.
//
// ЖЕСТ ТОЛЬКО НА ТЕЛЕФОНЕ — слушатели касания. На мониторе ленту обновляют
// перезагрузкой, и рисовать там печать не за чем.

export function FeedList({ items, lang, accent, subjectId, onRefresh }: {
  items: FeedItem[]
  lang: string
  accent: string
  /** Предмет — чтобы слово из текста уезжало в колоду повторения. */
  subjectId?: string
  /** Тяга сверху. Не задан — жеста нет. */
  onRefresh?: () => void | Promise<void>
}) {
  const t = useT()
  const days = useMemo(() => byDay(items), [items])

  // Панель прокрутки — не своя, а кабинета: ищем её лениво, тем же способом,
  // что и свёртка ряда рубрик выше (scrollBoxOf).
  const wrapRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (box || !onRefresh) return
    const find = () => { const b = scrollBoxOf(wrapRef.current); if (b) setBox(b) }
    find()
    // Содержимое дорастает до прокручиваемого: пока постов мало, предка с
    // прокруткой не существует вовсе.
    const tick = window.setInterval(find, 200)
    const stop = window.setTimeout(() => window.clearInterval(tick), 3000)
    return () => { window.clearInterval(tick); window.clearTimeout(stop) }
  }, [box, onRefresh, items.length])
  const pull = usePullRefresh(box, onRefresh)

  if (items.length === 0) {
    return <Empty text={t('Для этого языка ленты пока нет. Она собирается скриптом из свободных источников — см. scripts/buildFeed.mjs.')} />
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', maxWidth: FEED_W }}>
      {/* Печать стоит в зазоре, который открыла тяга: лента уезжает вниз
          из-под неё, а сама печать никуда не едет. */}
      {pull.pull > 0 && (
        <div style={{
          position: 'absolute', top: -8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
          transform: `translateY(${Math.min(pull.pull, PULL_THRESHOLD) * 0.55}px)`,
        }}>
          <PullStamp progress={pull.pull / PULL_THRESHOLD} locked={pull.locked} busy={pull.busy} />
        </div>
      )}
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      // Пока палец ведёт — один к одному, без анимации: лента висит на пальце.
      transform: pull.pull > 0 ? `translateY(${pull.pull}px)` : undefined,
      transition: pull.busy || pull.pull === 0 ? 'transform 320ms cubic-bezier(.2,.9,.3,1)' : 'none',
    }}>
      {days.map(day => (
        <section key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Дата — единственный разделитель в ленте, как в мессенджере. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              padding: '3px 12px', borderRadius: 999,
              background: 'var(--color-bg-3)', color: 'var(--color-muted)',
              fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              {dayLabel(day.date)}
            </span>
          </div>

          {day.items.map(item => (
            <FeedPost key={item.id} item={item} lang={lang} accent={accent} subjectId={subjectId} />
          ))}
        </section>
      ))}
    </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ряд поворотов над лентой
//
// НАВЕРХУ ОН РАЗВЁРНУТ, ДАЛЬШЕ — СВЁРНУТ. На первом экране ряд работает
// оглавлением: видно, что лента вообще умеет показывать наука/техника/жизнь, и
// подписи здесь стоят своих сорока пикселей. Но полоса прилипшая, и на десятом
// посте те же восемь подписей — это уже не оглавление, а рамка вокруг чтения:
// человек листает ленту, а не выбирает рубрику.
//
// Поэтому при прокрутке ряд сжимается до текущей рубрики словом и значков
// соседей и встаёт ПО ЦЕНТРУ КОЛОНКИ ПОСТОВ. Центр, а не левый край: свёрнутая
// таблетка у левого края читается как случайно оставшийся контрол, а по центру
// — как шапка того, что под ней.
//
// ГИСТЕРЕЗИС ОБЯЗАТЕЛЕН. Один порог означал бы, что на границе ряд разворачивается
// и сворачивается от каждого пикселя колеса — а смена вида сама двигает
// содержимое под ним.
// ─────────────────────────────────────────────────────────────────────────────

/** Прокрутили настолько — ряд сворачивается. */
const COMPACT_ON = 72
/** Вернулись выше этого — разворачивается обратно. */
const COMPACT_OFF = 8

/** Панель прокрутки, внутри которой живёт тренажёр. Её может не быть — тогда окно. */
function scrollBoxOf(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 4) return p
    p = p.parentElement
  }
  return null
}

function useFeedScroll(ref: RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false)
  // Панель ищем ЛЕНИВО и запоминаем: на первом кадре материал ленты ещё не
  // приехал, содержимое короче экрана, и прокручиваемого предка у ряда в этот
  // момент нет вовсе.
  const boxRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const check = () => {
      if (!boxRef.current) boxRef.current = scrollBoxOf(ref.current)
      const y = boxRef.current ? boxRef.current.scrollTop : window.scrollY
      setPast(was => (was ? y > COMPACT_OFF : y > COMPACT_ON))
    }
    check()
    // capture: события прокрутки не всплывают, и слушатель на окне без него не
    // услышит панель кабинета — прокрутку ведёт именно она, а не окно.
    window.addEventListener('scroll', check, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', check, { capture: true } as EventListenerOptions)
  }, [ref])

  /**
   * СМЕНА РУБРИКИ НАЧИНАЕТ ЛЕНТУ СВЕРХУ.
   *
   * Выбранное на десятом посте иначе оставляет человека в середине ДРУГОЙ
   * ленты — а то и ниже её конца, если постов в рубрике меньше: выглядит как
   * «нажал и ничего не показали». Заодно ряд разворачивается обратно в
   * оглавление, из которого выбор и делали.
   *
   * Прыжком, а не плавно: содержимое под рядом всё равно сменилось целиком, и
   * тянуть глаз через три экрана чужих постов не за чем.
   */
  const toTop = useCallback(() => {
    const box = boxRef.current ?? scrollBoxOf(ref.current)
    boxRef.current = box
    if (box) box.scrollTop = 0
    else window.scrollTo(0, 0)
  }, [ref])

  return { compact: past, toTop }
}

/**
 * Ряд поворотов ленты. Только для широкого экрана: на телефоне ленты в
 * тренажёре нет вовсе — она стоит целым экраном на главной, и рубрики ей
 * рисует шапка (components/MobileFeedRubrics), тем же чипсом.
 */
export function FeedTabs({ chips, value, onChange, accent }: {
  chips: Rubric[]
  value: FeedFilter
  onChange: (id: FeedFilter) => void
  /** Цвет предмета — им красится выбранная рубрика. */
  accent: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const { compact, toTop } = useFeedScroll(box)

  return (
    <div
      ref={box}
      style={{
        // Коробка шириной в колонку постов и при свёрнутом ряде: она и держит
        // таблетку по центру ленты, а не по центру остатка строки управления.
        display: 'flex', justifyContent: 'center',
        width: FEED_W, maxWidth: '100%', minWidth: 0,
      }}
    >
      <div
        className="no-scrollbar"
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 2 : 0,
          flex: compact ? '0 1 auto' : '1 1 auto', minWidth: 0,
          overflowX: 'auto', overscrollBehaviorX: 'contain',
          padding: 3, borderRadius: 999,
          background: 'rgba(var(--glass-rgb), 0.88)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {chips.map(c => (
          <RubricChip
            key={c.id}
            rubric={c}
            on={c.id === value}
            label={!compact || c.id === value}
            grow={!compact}
            accent={accent}
            onClick={() => { if (c.id !== value) { onChange(c.id); toTop() } }}
          />
        ))}
      </div>
    </div>
  )
}
