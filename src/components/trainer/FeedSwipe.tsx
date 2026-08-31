import { useEffect, useRef } from 'react'
import { frictionStart, haptic, tactile, type Friction } from '../../lib/feedback'
import { backArmed, BACK_EDGE } from '../../lib/useSwipeBack'
import { HeartGlyph, ReplyGlyph, TranslateGlyph, SpeakGlyph } from './feedGlyphs'
import type { FeedAction, FeedGesture } from '../../store/feedGesturesStore'

// ─────────────────────────────────────────────────────────────────────────────
// Слой жестов над постом ленты
//
// Пост не знает, что его тянут: он остаётся тем же деревом, а этот слой лишь
// возит его по горизонтали и разбирает, чем движение кончилось. Наверх уходит
// одно — «сработало действие X».
//
// ПАЛЕЦ ВЕДЁМ САМИ, НА touch-СОБЫТИЯХ С {passive:false}.
// Указателями это не делается: как только Safari решает, что палец начал
// скроллить список, он присылает pointercancel и БОЛЬШЕ НЕ ШЛЁТ pointermove —
// схема «дождёмся движения и решим, чей жест» над лентой не работает никогда
// (та же грабля, что в MobileSheet). Поэтому на первом же движении решаем сами
// и, если жест наш, гасим событие preventDefault'ом ДО того, как браузер
// начнёт прокрутку.
//
// КАРТОЧКА ЕДЕТ ЖИВАЯ, БЕЗ rAF. Стили пишутся прямо в обработчике движения:
// touchmove и так приходит раз в кадр, а в превью requestAnimationFrame не
// вызывается вовсе (см. память preview-no-raf) — анимация возврата держится на
// CSS-переходе, а не на цикле кадров.
//
// ЖЕСТ НАЧИНАЕТСЯ ТОЛЬКО ОТ КРАЯ ЭКРАНА — по узкой полосе слева и справа.
// Середина поста уже занята: горизонтальный смах по ней листает рубрики
// (MobileFeedRubrics, useRubricSwipe), и два жеста на одном движении — это
// лотерея, а не интерфейс. Полосы у краёв дают каждому своё место и заодно
// повторяют привычку телефона: от края тянут, в середине листают.
//
// ЗАТО В САМОЙ ПОЛОСЕ ТЯНЕТСЯ ЧТО УГОДНО: текст, кадр ролика, шапка автора,
// строка действий. Внутри полосы мы не смотрим, что под пальцем, — пост
// целиком одна карточка, и «здесь тянется, а здесь нет» человеку объяснить
// нечем. Разбор «слово это или кнопка» остаётся только у тапов.
//
// ЛЕВАЯ ПОЛОСА УСТУПАЕТ «НАЗАД», НО ТОЛЬКО КОГДА ЕМУ ЕСТЬ КУДА ВЕСТИ: на
// мобильной главной, где лента и живёт, стек возврата пуст (backArmed), и
// полоса наша от самого края. На вложенном экране она начинается за краем
// «назад» — два жеста не борются за один палец.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ширина полосы у края экрана, из которой начинается жест (px).
 *
 * Сорок пикселей — это подушечка большого пальца целиком, а не его кончик:
 * на двадцати приходилось ЦЕЛИТЬСЯ в край, и половина жестов уходила свайпу
 * рубрик. Середине поста при этом остаётся больше двухсот пикселей на любом
 * телефоне — спорить полосам не с чем.
 */
const ZONE = 44
/** Путь пальца, до которого намерение не разбирается вовсе. */
const SLOP = 10
/** Насколько горизонталь должна перевешивать вертикаль в момент разбора. */
const DOMINANCE = 1.7
/** Порог срабатывания: доля ширины, но не больше потолка. */
const TRIGGER_RATIO = 0.26
const TRIGGER_MAX = 92
/** Дальше порога карточка идёт с сопротивлением, а не за пальцем один в один. */
const RUBBER = 0.32
/** Быстрый смах засчитывается и не дотянув до порога (px/мс). */
const FLING = 0.5
/**
 * РЕЗИНОВЫЙ СТЫК
 *
 * Лента — это склеенная лента, а не стопка отдельных карточек: посты сидят
 * встык, разделённые волосяной линией, и углов у них нет. Жест начинает ЭТОТ
 * стык тянуть. Пока пост едет, скругление набегает не только у него, но и у
 * соседей — у нижнего края верхнего поста и у верхнего края нижнего: клей
 * тянется, и края у места разрыва округляются с обеих сторон.
 *
 * На пороге пост ОТРЫВАЕТСЯ. Скругление коротко перескакивает через своё
 * значение и замирает, волосяная линия у места отрыва гаснет, и дальше углы
 * больше ни за чем не следят: оторванное не тянется. Это же и подсказка руке —
 * порог виден, а не только слышен засечкой.
 *
 * Обратно всё склеивается на возврате, вместе с карточкой и одной с ней
 * длительностью.
 */
const CORNER = 18
/** Перескок в момент отрыва: во столько раз угол на миг больше своего. */
const SNAP = 1.18
/** Сколько длится сам отрыв. */
const SNAP_MS = 130
/**
 * Насколько заливка выходит за строку поста по вертикали.
 *
 * НОЛЬ, И ЭТО НЕ ЭКОНОМИЯ. Лента разрезана на посты волосяными линиями, и
 * подсветка действия — это подсветка СТРОКИ: ровно от разделителя до
 * разделителя, как в X. Стоило ей выйти за них на десяток пикселей, и цвет
 * ложился на низ соседнего поста сверху и на верх следующего снизу — то есть
 * обещал действие тем постам, к которым отношения не имеет.
 */
const BLEED_Y = 0
/** Отступ знака от края экрана. */
const MARK_PAD = 20
/** Долгое нажатие. */
const HOLD_MS = 420
/** Окно ожидания второго тапа. Ставится ТОЛЬКО когда двойной тап назначен. */
const DOUBLE_MS = 260
/** Домашняя кривая приложения — та же, что у доков, шапок и свайпа назад. */
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/** Цвет действия: мягкая подложка + насыщенный знак. Обе — из палитры темы. */
const TONE: Record<Exclude<FeedAction, 'none'>, { soft: string; ink: string }> = {
  like:      { soft: 'var(--color-rose-soft)',    ink: 'var(--color-rose-text)' },
  comment:   { soft: 'var(--color-blue-pill-bg)', ink: 'var(--color-blue-pill-text)' },
  translate: { soft: 'var(--color-teal-pill-bg)', ink: 'var(--color-teal-pill-text)' },
  listen:    { soft: 'var(--color-peach-soft)',   ink: 'var(--color-peach-text)' },
}

export function actionTone(a: FeedAction) {
  return a === 'none' ? { soft: 'var(--color-bg-3)', ink: 'var(--color-muted)' } : TONE[a]
}

/** Знак действия — тот же, что стоял бы в строке под постом. */
export function ActionGlyph({ action, size = 22 }: { action: FeedAction; size?: number }) {
  if (action === 'like') return <HeartGlyph filled accent="currentColor" size={size} />
  if (action === 'comment') return <ReplyGlyph filled accent="currentColor" size={size} />
  if (action === 'translate') return <TranslateGlyph size={size} />
  if (action === 'listen') return <SpeakGlyph size={size} />
  return null
}

export type GestureMap = Record<FeedGesture, FeedAction>

export default function FeedSwipe({
  map,
  sound,
  surface,
  onAction,
  children,
}: {
  /** Уже разрешённая карта: недоступное действие приходит сюда как 'none'. */
  map: GestureMap
  /** Звук и отдача в палец. */
  sound: boolean
  /** Чем карточка закрывает слой под собой, пока едет. */
  surface: string
  onAction: (a: FeedAction, g: FeedGesture) => void
  children: React.ReactNode
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // Свежие настройки внутрь слушателей — через ref: переподписывать touch на
  // каждую правку настроек нельзя, посреди жеста это его обрывает.
  const cfg = useRef({ map, sound, surface, onAction })
  cfg.current = { map, sound, surface, onAction }

  // ── Вспышка знака посередине карточки ─────────────────────────────────────
  //
  // У тапа, двойного тапа и долгого нажатия нет хода, по которому было бы
  // видно, что именно сработало: палец опустился и поднялся на одном месте.
  // Поэтому знак действия коротко всплывает над постом — «криво», из нуля и с
  // поворотом, и выпрямляется, пока растёт.
  const pop = (a: FeedAction) => {
    const el = popRef.current
    if (!el || a === 'none') return
    const tone = actionTone(a)
    // Знаки лежат в слое все сразу и переключаются показом: собирать svg на
    // каждой вспышке — работа в стол, а вспышка обязана начаться в тот же кадр,
    // в котором палец оторвался.
    el.querySelectorAll<HTMLElement>('[data-act]').forEach(n => {
      n.style.display = n.dataset.act === a ? 'flex' : 'none'
    })
    el.style.color = tone.ink
    el.style.background = tone.soft
    el.style.transition = 'none'
    el.style.opacity = '0'
    el.style.transform = 'translate(-50%, -50%) scale(0.35) rotate(-16deg)'
    // Считываем размер — иначе браузер склеит оба состояния в одно и перехода
    // не будет вовсе.
    void el.offsetWidth
    el.style.transition = `transform .26s ${EASE}, opacity .16s ease`
    el.style.opacity = '1'
    el.style.transform = 'translate(-50%, -50%) scale(1.06) rotate(0deg)'
    window.setTimeout(() => {
      if (!popRef.current) return
      popRef.current.style.transition = `transform .3s ${EASE}, opacity .3s ease`
      popRef.current.style.opacity = '0'
      popRef.current.style.transform = 'translate(-50%, -50%) scale(1.34) rotate(0deg)'
    }, 260)
  }

  useEffect(() => {
    const host = hostRef.current
    const card = cardRef.current
    if (!host || !card) return

    let id: number | null = null
    let startX = 0, startY = 0, startT = 0
    let lastX = 0, lastT = 0, speed = 0
    let mode: 'wait' | 'swipe' | 'scroll' | 'off' = 'off'
    /** С какой полосы начался жест. null — палец лёг в середине поста. */
    let zone: 'left' | 'right' | null = null
    let armed = false
    let dir: 1 | -1 = -1
    let hold: number | null = null
    let held = false
    let moved = false
    let friction: Friction | null = null
    let lastTap = 0
    let tapTimer: number | null = null

    /**
     * РАСПАХНУТЬ САМ ХОСТ ДО РАМКИ ТЕЛЕФОНА.
     *
     * Полоса у края не работала не потому, что была узкой: пост лежит в
     * колонке с полями, и касание в этих полях не доходило до него ВООБЩЕ —
     * слушатель висит на посте, а палец опускался на фон страницы. Никакая
     * ширина зоны этого не лечит.
     *
     * Поэтому коробка жеста уезжает наружу ровно на оставшиеся до края поля, а
     * внутрь возвращает их отступом: содержимое остаётся на прежнем месте до
     * пикселя, а касания ловятся от самой рамки.
     *
     * Поля считаются по месту, а не зашиты числом: у поста в ленте они одни
     * (колонка главной), у поста в тренажёре — другие.
     */
    let bled = false
    /** Поля колонки — ими карточки распахиваются до самых краёв экрана. */
    let gutterL = 0
    let gutterR = 0
    const bleed = () => {
      host.style.marginLeft = ''
      host.style.marginRight = ''
      host.style.paddingLeft = ''
      host.style.paddingRight = ''
      const r = host.getBoundingClientRect()
      // МЕРИТЬ НЕВИДИМОЕ НЕЛЬЗЯ. Настольная и телефонная раскладки живут в
      // дереве обе, и спрятанная (display:none) отдаёт нули: правое поле
      // посчиталось бы во всю ширину окна, и пост, став видимым, вылез бы за
      // экран на эту ширину. Нулевая коробка — это «ещё не знаем», и тогда
      // мерить будем, когда покажется (io ниже).
      if (!r.width) { bled = false; return }
      const left = Math.max(0, Math.round(r.left))
      const right = Math.max(0, Math.round(window.innerWidth - r.right))
      if (left) { host.style.marginLeft = `${-left}px`; host.style.paddingLeft = `${left}px` }
      if (right) { host.style.marginRight = `${-right}px`; host.style.paddingRight = `${right}px` }
      gutterL = left
      gutterR = right
      bled = true
    }
    bleed()
    window.addEventListener('resize', bleed)

    // Наблюдатель ставится ТОЛЬКО если померить не удалось, и снимается с
    // первого удачного замера. ResizeObserver тут не годится принципиально:
    // отрицательное поле меняет размер самой коробки, то есть каждый замер
    // порождал бы следующий.
    let io: IntersectionObserver | null = null
    if (!bled && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(es => {
        if (!es.some(e => e.isIntersecting)) return
        bleed()
        if (bled) { io?.disconnect(); io = null }
      })
      io.observe(host)
    }

    const width = () => host.getBoundingClientRect().width || window.innerWidth
    const trigger = () => Math.min(TRIGGER_MAX, width() * TRIGGER_RATIO)

    /** В какой краевой полосе лежит палец. Слева полосу может занимать «назад». */
    const edgeSide = (x: number): 'left' | 'right' | null => {
      const from = backArmed() ? BACK_EDGE : 0
      if (x >= from && x <= from + ZONE) return 'left'
      if (x >= window.innerWidth - ZONE) return 'right'
      return null
    }

    /** Действие жеста, уже с учётом «выключено». */
    const act = (g: FeedGesture): FeedAction => cfg.current.map[g] ?? 'none'

    const fire = (g: FeedGesture) => {
      const a = act(g)
      if (a === 'none') return false
      cfg.current.onAction(a, g)
      return true
    }

    /** Тап по слову, кнопке, ссылке или ролику — не наш жест ни в каком виде. */
    const interactive = (t: EventTarget | null) => {
      const el = t instanceof Element ? t : null
      return !!el?.closest('a, button, input, textarea, select, iframe, video, [role="button"], [data-no-gesture]')
    }

    // ── Резиновый стык (см. шапку файла) ─────────────────────────────────────
    //
    // Соседи ищутся по DOM: слой жеста стоит вокруг каждого поста, и соседний
    // пост — это соседний элемент. Ни один из них может и не найтись (первый и
    // последний в ленте, разделитель-дата в тренажёре) — тогда тянется только
    // наш край.
    let seamPrev: HTMLElement | null = null
    let seamNext: HTMLElement | null = null
    let seamLine: HTMLElement | null = null
    /** Порог пройден: стык порван, углы больше ни за кем не следуют. */
    let torn = false
    let snapTimer: number | null = null
    /** Номер жеста: по нему уборка после возврата узнаёт «свой» ли он. */
    let seamGen = 0
    /** Докуда дотянулся стык. Обратно не отматывается — см. paintSeam. */
    let seamPeak = 0

    const neighbour = (el: Element | null | undefined) =>
      (el?.querySelector('[data-feed-card]') as HTMLElement | null) ?? null

    /**
     * Распахнуть карточку до краёв экрана, оставив содержимое на месте.
     *
     * Соседям это нужно ровно так же, как нашей: пост, покрашенный по ширине
     * КОЛОНКИ, лежит на поле действия обрезанным прямоугольником — по бокам
     * от него светит цвет, и вместо ленты видно три отдельные плашки с
     * дырками по краям. Стык обязан идти от рамки до рамки; скругление —
     * единственное, что при жесте меняет форму.
     */
    const widen = (el: HTMLElement) => {
      el.style.paddingLeft = `${gutterL}px`
      el.style.marginLeft = `${-gutterL}px`
      el.style.paddingRight = `${gutterR}px`
      el.style.marginRight = `${-gutterR}px`
    }

    const narrow = (el: HTMLElement) => {
      el.style.paddingLeft = ''
      el.style.marginLeft = ''
      el.style.paddingRight = ''
      el.style.marginRight = ''
    }

    /** Тень и соседи готовятся один раз, на старте жеста. */
    const liftCard = () => {
      card.style.transition = `box-shadow .2s ease`
      card.style.boxShadow = '0 6px 22px rgba(0,0,0,0.16)'
      torn = false
      seamPeak = 0
      seamGen++
      seamPrev = neighbour(host.previousElementSibling)
      seamNext = neighbour(host.nextElementSibling)
      // Волосяная линия ниже нашего поста принадлежит СЛЕДУЮЩЕМУ (она у него
      // сверху). Гасить её в момент отрыва — значит показать, что пост
      // отделился с обеих сторон, а не только сверху, где линия уехала вместе
      // с ним.
      seamLine = (seamNext?.firstElementChild as HTMLElement | null) ?? null
      for (const n of [seamPrev, seamNext]) {
        if (!n) continue
        n.style.transition = 'none'
        // Соседи на время жеста становятся настоящими карточками: своя
        // поверхность и слой выше поля действия. Без поверхности красить у них
        // было бы нечего — прозрачный пост углов не показывает, — а без слоя
        // цвет лёг бы поверх их текста (поле спозиционировано, они нет).
        n.style.position = 'relative'
        n.style.zIndex = '1'
        n.style.background = cfg.current.surface
        widen(n)
      }
    }

    /**
     * Стык при ходе `p` (0…1 до порога).
     *
     * Соседям достаются только ОБРАЩЁННЫЕ К НАМ углы: верхний пост округляется
     * снизу, нижний — сверху. Их дальние края к нашему жесту отношения не
     * имеют и должны остаться встык со своими соседями.
     */
    const paintSeam = (p: number) => {
      if (torn) return
      // До отрыва радиус идёт ЗА ПАЛЬЦЕМ, без перехода: это натяжение, а не
      // анимация, и любое сглаживание здесь читается как задержка.
      card.style.transition = 'box-shadow .2s ease'
      // Кубическая кривая: клей поддаётся сразу и дальше идёт всё туже.
      const r = CORNER * (1 - Math.pow(1 - Math.min(1, p), 3))
      // ОБРАТНО КЛЕЙ НЕ СХВАТЫВАЕТСЯ. Радиус только растёт: повёл палец
      // назад — углы остаются такими, какими стали. Иначе стык дышал бы на
      // каждом покачивании руки, а «оторвал наполовину и передумал» выглядело
      // бы как отмена того, что уже произошло.
      if (r <= seamPeak) return
      seamPeak = r
      const v = `${r.toFixed(2)}px`
      card.style.borderRadius = v
      if (seamPrev) { seamPrev.style.borderBottomLeftRadius = v; seamPrev.style.borderBottomRightRadius = v }
      if (seamNext) { seamNext.style.borderTopLeftRadius = v; seamNext.style.borderTopRightRadius = v }
      for (const l of [leftRef.current, rightRef.current]) if (l) l.style.borderRadius = v
    }

    /** Отрыв: перескок через своё значение — и всё замирает. */
    const tear = () => {
      if (torn) return
      torn = true
      const over = `${(CORNER * SNAP).toFixed(1)}px`
      const full = `${CORNER}px`
      const put = (v: string) => {
        card.style.borderRadius = v
        if (seamPrev) { seamPrev.style.borderBottomLeftRadius = v; seamPrev.style.borderBottomRightRadius = v }
        if (seamNext) { seamNext.style.borderTopLeftRadius = v; seamNext.style.borderTopRightRadius = v }
        for (const l of [leftRef.current, rightRef.current]) if (l) l.style.borderRadius = v
      }
      // Сам перескок — с переходом, а не рывком: до этого момента углы шли за
      // пальцем кадр в кадр, и мгновенная подстановка читалась бы сбоем.
      const jump = `border-radius ${SNAP_MS}ms ease`
      card.style.transition = `${jump}, box-shadow .2s ease`
      for (const n of [seamPrev, seamNext]) if (n) n.style.transition = jump
      for (const l of [leftRef.current, rightRef.current]) if (l) l.style.transition = jump
      put(over)
      if (seamLine) { seamLine.style.transition = `border-color ${SNAP_MS}ms ease`; seamLine.style.borderTopColor = 'transparent' }
      if (snapTimer) clearTimeout(snapTimer)
      snapTimer = window.setTimeout(() => { snapTimer = null; put(full) }, SNAP_MS)
    }

    /** Склеить обратно — вместе с карточкой и одной с ней длительностью. */
    const glue = () => {
      if (snapTimer) { clearTimeout(snapTimer); snapTimer = null }
      torn = false
      const back = `border-radius .42s ${EASE}`
      card.style.borderRadius = '0px'
      for (const n of [seamPrev, seamNext]) if (n) n.style.transition = back
      if (seamPrev) { seamPrev.style.borderBottomLeftRadius = '0px'; seamPrev.style.borderBottomRightRadius = '0px' }
      if (seamNext) { seamNext.style.borderTopLeftRadius = '0px'; seamNext.style.borderTopRightRadius = '0px' }
      if (seamLine) seamLine.style.borderTopColor = ''
      // Уборка узнаёт свой жест по номеру: следующий свайп мог начаться раньше,
      // чем доехал возврат предыдущего, и обнулять его соседей нельзя — стык
      // остался бы натянутым, а тянуть было бы уже нечего.
      const gen = seamGen
      window.setTimeout(() => {
        if (gen !== seamGen) return
        for (const n of [seamPrev, seamNext]) {
          if (!n) continue
          n.style.transition = ''
          n.style.position = ''
          n.style.zIndex = ''
          n.style.background = ''
          narrow(n)
          n.style.borderBottomLeftRadius = ''
          n.style.borderBottomRightRadius = ''
          n.style.borderTopLeftRadius = ''
          n.style.borderTopRightRadius = ''
        }
        if (seamLine) seamLine.style.transition = ''
        seamPrev = seamNext = seamLine = null
      }, 440)
    }

    // Только transform: он не перечислен в переходе выше, поэтому идёт за
    // пальцем кадр в кадр, пока форма доезжает своим чередом.
    const paintCard = (x: number) => {
      card.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`
    }

    /**
     * Знак под карточкой. Растёт из нуля вместе с ходом и выпрямляется:
     * поворот на старте — не украшение, а подсказка, что жест ещё не дошёл.
     * Пройден порог — кружок заливается цветом действия целиком, знак
     * выворачивается в цвет фона. Это и есть «уже сработает, отпускай».
     */
    /**
     * РАСПАХНУТЬ СЛОИ ДО КРАЁВ ЭКРАНА.
     *
     * Пост лежит в колонке с полями, и слой действия, обрезанный по его
     * коробке, начинался в воздухе — цветной прямоугольник проходил прямо по
     * фотографии и обрывался, не дойдя до рамки телефона. Заливка обязана
     * идти ОТ КРАЯ ЭКРАНА, поэтому перед жестом слой уезжает наружу ровно на
     * то расстояние, которое до этого края осталось, — считаем его по месту, а
     * не зашиваем поля страницы числом.
     */
    const spread = () => {
      const r = host.getBoundingClientRect()
      const right = window.innerWidth - r.right
      // ЦВЕТ ЛОЖИТСЯ И ПОД СОСЕДЕЙ. Стык тянется между тремя постами, и если
      // покрасить только средний, соседние края останутся на чёрном — рвётся
      // будто одна карточка, а не лента. Поле действия покрывает всю тройку, а
      // сами посты лежат НА нём (см. liftCard: им на время жеста выдаётся
      // поверхность), поэтому их округлившиеся углы прорезают цвет.
      const up = seamPrev ? Math.max(0, r.top - seamPrev.getBoundingClientRect().top) : BLEED_Y
      const down = seamNext ? Math.max(0, seamNext.getBoundingClientRect().bottom - r.bottom) : BLEED_Y
      for (const l of [leftRef.current, rightRef.current]) {
        if (!l) continue
        l.style.left = `${-r.left}px`
        l.style.right = `${-right}px`
        l.style.top = `${-up}px`
        l.style.bottom = `${-down}px`
        // Знак — по центру НАШЕГО поста, а не поля: поле теперь высотой в три
        // карточки, и flex-центрирование увело бы сердце на стык.
        const dot = l.firstElementChild as HTMLElement | null
        if (dot) dot.style.top = `${up + r.height / 2}px`
      }
    }

    const paintReveal = (x: number) => {
      const side = x < 0 ? rightRef.current : leftRef.current
      const other = x < 0 ? leftRef.current : rightRef.current
      if (other) other.style.opacity = '0'
      if (!side) return
      const a = act(x < 0 ? 'swipeLeft' : 'swipeRight')
      if (a === 'none') { side.style.opacity = '0'; return }
      const p = Math.min(1, Math.abs(x) / trigger())
      const tone = actionTone(a)
      const dot = side.firstElementChild as HTMLElement | null
      side.style.opacity = '1'
      side.style.background = `color-mix(in srgb, ${tone.soft} ${(p * 100).toFixed(0)}%, transparent)`
      if (!dot) return
      const full = p >= 1
      const s = full ? 1.12 : 0.2 + 0.8 * p * p
      dot.style.transform = `translateY(-50%) scale(${s.toFixed(3)}) rotate(${((1 - p) * -22).toFixed(1)}deg)`
      dot.style.opacity = Math.min(1, Math.pow(p, 0.65)).toFixed(3)
      dot.style.background = full ? tone.ink : `color-mix(in srgb, ${tone.ink} 14%, transparent)`
      dot.style.color = full ? 'var(--color-bg)' : tone.ink
    }

    const settle = (fired: boolean) => {
      // ОДНА ДЛИТЕЛЬНОСТЬ И ОДНА КРИВАЯ НА ВСЁ. Раньше углы распрямлялись за
      // .3s, а карточка возвращалась за .42s: форма приезжала раньше места, и
      // возврат читался двумя движениями вместо одного.
      card.style.transition = `transform .42s ${EASE}, border-radius .42s ${EASE}, box-shadow .42s ${EASE}`
      paintCard(0)
      card.style.boxShadow = 'none'
      glue()
      const layers = [leftRef.current, rightRef.current]
      layers.forEach(l => {
        if (!l) return
        // Заливка гаснет ровно столько, сколько едет карточка: она и есть то,
        // что из-под карточки видно, и жить своей длительностью ей незачем.
        l.style.transition = `opacity .42s ${EASE}, background .42s ${EASE}, border-radius .42s ${EASE}`
        l.style.opacity = '0'
        l.style.borderRadius = '0px'
        const dot = l.firstElementChild as HTMLElement | null
        if (dot) {
          dot.style.transition = `transform .42s ${EASE}, opacity .34s ease`
          // Сработало — знак уходит «наверх и в стороны», как отпущенный;
          // не дотянул — просто складывается обратно в ноль.
          // translateY(-50%) обязателен и здесь: знак центрируется сдвигом, и
          // без него он на прощание прыгнул бы вниз на пол-своей высоты.
          dot.style.transform = fired
            ? 'translateY(-50%) scale(1.45) rotate(0deg)'
            : 'translateY(-50%) scale(0.2) rotate(-22deg)'
          dot.style.opacity = '0'
        }
      })
      window.setTimeout(() => {
        card.style.background = ''
        narrow(card)
        card.style.position = ''
        card.style.zIndex = ''
        layers.forEach(l => { if (l) l.style.transition = '' })
      }, 440)
    }

    const clearHold = () => { if (hold) { clearTimeout(hold); hold = null } }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { mode = 'off'; clearHold(); return }
      const t = e.touches[0]
      // Полоса у края — наша. Внутри неё под пальцем может быть что угодно
      // (слово, кадр ролика, кнопка): тянется пост целиком.
      const from = edgeSide(t.clientX)
      // Пока палец в полосе, свайп рубрик о нём не узнает: он слушает ленту
      // выше по дереву, и без этого одно движение двигало бы и пост, и ряд
      // рубрик сразу.
      if (from) e.stopPropagation()
      else if (interactive(t.target)) { mode = 'off'; return }
      zone = from
      id = t.identifier
      startX = lastX = t.clientX
      startY = t.clientY
      startT = lastT = e.timeStamp
      speed = 0
      armed = false
      held = false
      moved = false
      mode = 'wait'
      card.style.transition = 'none'
      card.style.transform = ''

      // Долгое нажатие взводится сразу: если палец сдвинется — таймер снимут.
      clearHold()
      if (act('longPress') !== 'none') {
        // Карточка медленно проседает под пальцем — по ней и видно, что
        // нажатие СЧИТАЕТСЯ, а не просто игнорируется.
        card.style.transition = `transform ${HOLD_MS}ms ${EASE}`
        card.style.transform = 'scale(0.985)'
        hold = window.setTimeout(() => {
          hold = null
          if (mode !== 'wait') return
          held = true
          mode = 'off'
          card.style.transition = `transform .26s ${EASE}`
          card.style.transform = 'scale(1)'
          if (cfg.current.sound) haptic([9, 26, 9])
          const a = act('longPress')
          pop(a)
          if (cfg.current.sound && a !== 'none') tactile({ freq: a === 'like' ? 880 : 560, vibrate: 0 })
          fire('longPress')
        }, HOLD_MS)
      }
    }

    const onMove = (e: TouchEvent) => {
      if (mode === 'off' || id === null) return
      const t = Array.from(e.touches).find(x => x.identifier === id)
      if (!t) return
      const dx = t.clientX - startX
      const dy = t.clientY - startY

      if (mode === 'wait') {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return
        moved = true
        clearHold()
        // Палец поехал — просадка «долгого нажатия» снимается немедленно,
        // иначе карточка уезжала бы вбок ужатой.
        card.style.transition = 'none'
        card.style.transform = ''
        // Пологое движение достаётся прокрутке — конус около 30°.
        if (Math.abs(dx) < Math.abs(dy) * DOMINANCE) { mode = 'scroll'; return }
        // Палец лёг в середине поста — это смена рубрики, не наш жест.
        if (!zone) { mode = 'off'; return }
        // ОТ ЛЕВОГО КРАЯ ТЯНУТ ВПРАВО, ОТ ПРАВОГО — ВЛЕВО, и никак иначе:
        // от края экрана внутрь. Обратное движение из полосы — это либо
        // промах, либо начало прокрутки, и подхватывать его нечестно.
        dir = zone === 'left' ? 1 : -1
        if (Math.sign(dx) !== dir) { mode = 'off'; return }
        // Действия на этой стороне нет — тянуть некуда.
        if (act(dir < 0 ? 'swipeLeft' : 'swipeRight') === 'none') { mode = 'off'; return }
        mode = 'swipe'
        // Порядок важен: соседей находит liftCard, а поле действия (spread)
        // считает свою высоту по ним.
        liftCard()
        spread()
        // Карточка распахивается до КРАЁВ ЭКРАНА, а не на условные 10 px:
        // иначе на ведущей стороне между постом и рамкой оставалась щель, в
        // которую светило поле действия.
        widen(card)
        card.style.position = 'relative'
        card.style.zIndex = '1'
        // Пост на мобильной главной прозрачный — без подложки слой действия
        // просвечивал бы сквозь текст, пока карточка едет.
        card.style.background = cfg.current.surface
        if (cfg.current.sound) friction = frictionStart()
      }
      if (mode !== 'swipe') return

      e.preventDefault()   // прокрутка страницы под нашим жестом не нужна
      // И свайп рубрик о нашем движении тоже не должен знать: он слушает ленту
      // выше по дереву. Касание мы у него уже отняли на touchstart, это —
      // страховка на случай, когда он успел начаться раньше нас.
      e.stopPropagation()
      const now = e.timeStamp
      if (now > lastT) {
        const v = Math.abs(t.clientX - lastX) / (now - lastT)
        speed = speed * 0.6 + v * 0.4     // сглаживание: кадры тача неровные
        lastX = t.clientX
        lastT = now
      }

      const th = trigger()
      // ПУТЬ СЧИТАЕМ ПО НАПРАВЛЕНИЮ ЖЕСТА, СО ЗНАКОМ, а не по модулю смещения.
      //
      // На модуле обратный ход выворачивал карточку наружу: палец возвращался
      // к краю, `Math.abs(dx)` снова РОС, и пост уезжал в ту же сторону во
      // второй раз — при том что рука шла обратно. Теперь `along` уходит в
      // минус, и карточка честно едет за пальцем назад.
      const along = dx * dir
      // Сопротивление за порогом: карточку можно утянуть дальше, но всё
      // тяжелее — рука чувствует, что дальше «уже всё равно сработает».
      const over = along - th
      const travel = over > 0 ? th + over * RUBBER : along
      // ...и упирается в исходное место. Дальше нуля пост не пойдёт: увести
      // его в другую сторону этим же касанием нельзя — сторона выбрана в
      // начале жеста, а «в другую сторону» это другой жест с другим действием.
      const x = dir * Math.max(0, Math.min(travel, width() * 0.42))
      paintCard(x)
      paintReveal(x)
      paintSeam(Math.abs(x) / th)

      const nowArmed = Math.abs(x) >= th
      if (nowArmed !== armed) {
        armed = nowArmed
        // Порог — это и есть отрыв: клей кончился. Обратно он не склеивается
        // посреди жеста (оторванное не тянется), поэтому tear() зовётся один
        // раз, а обратный ход просто возит уже отдельную карточку.
        if (nowArmed) tear()
        if (cfg.current.sound) { haptic(nowArmed ? [8, 3, 5] : 6); friction?.detent() }
      }
      friction?.move(speed, Math.min(1, Math.abs(x) / th))
    }

    const onEnd = (e: TouchEvent) => {
      clearHold()
      // Долгое нажатие уже сработало — гасим щелчок, который браузер соберёт
      // из этого касания: палец мог держаться на слове, и вместе с открытым
      // тредом выскочил бы ещё и разбор слова.
      if (held && e.cancelable) e.preventDefault()
      const wasSwipe = mode === 'swipe'
      const t = Array.from(e.changedTouches).find(x => x.identifier === id)
      const dt = e.timeStamp - startT

      if (wasSwipe) {
        const fling = speed >= FLING && Math.abs((t?.clientX ?? startX) - startX) > 36
        const go = armed || fling
        friction?.stop(go)
        friction = null
        settle(go)
        if (go) {
          const g: FeedGesture = dir < 0 ? 'swipeLeft' : 'swipeRight'
          const a = act(g)
          if (cfg.current.sound && a !== 'none') {
            tactile({ freq: a === 'like' ? 880 : a === 'comment' ? 560 : a === 'translate' ? 660 : 500, vibrate: [10, 24, 12] })
          }
          fire(g)
        }
        mode = 'off'
        id = null
        return
      }

      card.style.transition = ''
      card.style.transform = ''
      const tap = mode === 'wait' && !moved && !held && dt < 500 && !interactive(t?.target ?? null)
      mode = 'off'
      id = null
      if (!tap) return

      // ── Тап и двойной тап ────────────────────────────────────────────────
      //
      // Ожидание второго тапа ставится ТОЛЬКО когда двойной назначен: иначе
      // каждый одиночный тап отвечал бы на четверть секунды позже, платя
      // задержкой за жест, которым никто не пользуется.
      if (act('doubleTap') === 'none') {
        const a = act('tap')
        if (a !== 'none') {
          pop(a)
          if (cfg.current.sound) tactile({ freq: a === 'like' ? 880 : 560 })
          fire('tap')
        }
        return
      }
      const nowMs = e.timeStamp
      if (tapTimer && nowMs - lastTap < DOUBLE_MS) {
        clearTimeout(tapTimer)
        tapTimer = null
        lastTap = 0
        const a = act('doubleTap')
        pop(a)
        if (cfg.current.sound) tactile({ freq: a === 'like' ? 880 : 640, vibrate: [9, 22, 11] })
        fire('doubleTap')
        return
      }
      lastTap = nowMs
      tapTimer = window.setTimeout(() => {
        tapTimer = null
        const a = act('tap')
        if (a === 'none') return
        pop(a)
        if (cfg.current.sound) tactile({ freq: a === 'like' ? 880 : 560 })
        fire('tap')
      }, DOUBLE_MS)
    }

    const onCancel = () => {
      clearHold()
      if (mode === 'swipe') { friction?.stop(false); friction = null; settle(false) }
      mode = 'off'
      id = null
    }

    host.addEventListener('touchstart', onStart, { passive: true })
    host.addEventListener('touchmove', onMove, { passive: false })
    // Не passive: на сработавшем долгом нажатии этот обработчик обязан уметь
    // отменить последующий щелчок (см. onEnd).
    host.addEventListener('touchend', onEnd, { passive: false })
    host.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      clearHold()
      if (snapTimer) clearTimeout(snapTimer)
      // Пост мог уехать из ленты прямо посреди жеста (подгрузка порции, смена
      // рубрики). Соседи при этом остались бы покрашенными и скруглёнными
      // навсегда — снимаем с них наши стили сразу, без плавности: показывать
      // склейку уже нечему и некому.
      for (const n of [seamPrev, seamNext]) {
        if (!n) continue
        n.style.transition = ''
        n.style.position = ''
        n.style.zIndex = ''
        n.style.background = ''
        n.style.borderTopLeftRadius = ''
        n.style.borderTopRightRadius = ''
        n.style.borderBottomLeftRadius = ''
        n.style.borderBottomRightRadius = ''
        narrow(n)
      }
      if (seamLine) { seamLine.style.transition = ''; seamLine.style.borderTopColor = '' }
      window.removeEventListener('resize', bleed)
      io?.disconnect()
      if (tapTimer) clearTimeout(tapTimer)
      friction?.stop(false)
      host.removeEventListener('touchstart', onStart)
      host.removeEventListener('touchmove', onMove as EventListener)
      host.removeEventListener('touchend', onEnd)
      host.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  const layer = (side: 'left' | 'right', ref: React.RefObject<HTMLDivElement | null>) => (
    <div
      ref={ref}
      aria-hidden
      style={{
        // Поле действия: во всю ширину экрана и на высоту тройки постов
        // (наш и оба соседних) — распахивает его spread. Скругление ему
        // ставит стык, тем же радиусом, что и карточкам.
        position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none',
      }}
    >
      {/* Знак прибит к центру НАШЕГО поста абсолютно (top ставит spread), а не
          отцентрован флексом: поле высотой в три карточки увело бы его на
          стык между ними. */}
      <span style={{
        position: 'absolute', top: '50%',
        ...(side === 'left' ? { left: MARK_PAD } : { right: MARK_PAD }),
        width: 46, height: 46, borderRadius: 999, opacity: 0,
        transform: 'translateY(-50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ActionGlyph action={map[side === 'left' ? 'swipeRight' : 'swipeLeft']} />
      </span>
    </div>
  )

  return (
    <div ref={hostRef} style={{ position: 'relative', touchAction: 'pan-y' }}>
      {layer('left', leftRef)}
      {layer('right', rightRef)}
      {/* Метка для соседей: резиновый стык ищет соседний пост по DOM и красит
          ему обращённые к нам углы (см. paintSeam). */}
      <div ref={cardRef} data-feed-card style={{ willChange: 'transform' }}>
        {children}
      </div>
      {/* Вспышка знака у жестов без хода — поверх поста, по центру. */}
      <div
        ref={popRef}
        aria-hidden
        style={{
          position: 'absolute', left: '50%', top: '50%', opacity: 0,
          width: 62, height: 62, borderRadius: 999, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'translate(-50%, -50%) scale(0.35)',
          backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
          zIndex: 2,
        }}
      >
        {(['like', 'comment', 'translate', 'listen'] as const).map(a => (
          <span key={a} data-act={a} style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
            <ActionGlyph action={a} size={26} />
          </span>
        ))}
      </div>
    </div>
  )
}
