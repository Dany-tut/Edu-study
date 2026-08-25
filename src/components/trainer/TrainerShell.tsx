// ─────────────────────────────────────────────────────────────────────────────
// Скелет тренажёра: рейл слева, строка управления сверху, содержимое справа
//
// ЗАЧЕМ. Банк заданий ЕГЭ давно устроен правильно — карточка-рейл с фильтрами,
// строка с поиском, статусами, видом и сортировкой, сетка результатов. Языковой
// тренажёр рос отдельно и накопил три разных способа показать список: ряд
// таблеток по центру для режимов, ряд чипсов под ними для фильтров чтения и
// самодельная колонка полок в наборах фраз. Одно и то же действие — «сузить
// выборку» — выглядело по-разному на трёх соседних вкладках.
//
// Здесь тот же скелет, вынесенный в переиспользуемый вид. Меняется только
// НАПОЛНЕНИЕ рейла: режим сам решает, какие карточки в него положить.
//
// КТО НА НЁМ. Языковой тренажёр целиком и ДЕСКТОПНАЯ ветка банка заданий.
// Своя раскладка у банка осталась только там, где скелет ничего не обещает:
// шапка страницы и док-таблетки с анимацией — это его собственное, и выкидывать
// их ради единообразия значило бы менять работающее на одинаковое.
//
// Мобильная ветка банка (useIsDesktop < 1024) живёт отдельно и по своим
// правилам: нижняя навигация, плавающие круглые кнопки, шторки. Это другая
// раскладка, а не узкий вариант этой, и тянуть её сюда не нужно.
//
// ШИРИНА РЕЙЛА. 300 px, как в банке. Сжимать его нельзя: карточка фильтров на
// 180 px нечитаема. Поэтому на узком экране (< 1024) рейл целиком уходит в
// нижнюю шторку — тем же приёмом, что фильтры банка на телефоне, и открывается
// одной кнопкой над строкой управления. Ставить его НАД содержимым (как было
// сначала) не годится: три карточки подряд занимают весь первый экран, и до
// результатов нужно пролистать фильтры, которыми в этот момент не пользуются.
//
// ВЫСОТА РЕЙЛА. Рейл не длиннее экрана: карточка упирается в нижний край окна и
// дальше листается ВНУТРИ себя. Раньше он был просто sticky по всей своей
// натуральной высоте — режимы + фильтры + показ не влезали в 720 px, и низ
// рейла можно было достать только прокруткой всей страницы, то есть уехав от
// сетки результатов. Теперь центр и рейл листаются независимо.
//
// ГОРИЗОНТАЛЬ. Своей максимальной ширины и авто-полей у скелета НЕТ: на широком
// мониторе они уводили тренажёр в центр, тогда как банк ЕГЭ, уроки и курсы
// прижаты к левому краю отступом .dashboard-main (32 px). Отступ по бокам даёт
// родитель; свой остаётся только на узком экране, где обёртки кабинета нет.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Check, SlidersHorizontal, Layers, Link2, Share2 } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { copyToClipboard } from '../../lib/clipboard'
import { bindShortWords, balancedWrap } from '../../lib/typography'
import { useFloatingPill } from '../../lib/useFloatingPill'
import { useScrollLock } from '../../lib/useScrollLock'
import ScrollFade from '../ScrollFade'
import { DROPDOWN_GLASS, dropdownRow, dropdownRowHover, dropdownSurface } from '../../lib/dropdownStyle'
import MobileSheet from '../MobileSheet'
import MobileDock, { DockCircle, DockSegment, DockSlot, useSmoothCollapse, COLLAPSE } from '../MobileDock'
import { MOBILE_TOP_GAP } from '../../lib/mobileTokens'

const RAIL_W = 300

/**
 * Прилипание рейла — ровно его же отступ в потоке.
 *
 * Смещение sticky отсчитывается от СОДЕРЖИМОГО панели прокрутки, а не от её
 * рамки: верхние 100 px кабинета (место под плавающую шапку) — это padding
 * панели, и в отсчёт они не входят. Поэтому top равен собственному верхнему
 * отступу скелета: рейл прилипает там же, где стоит, и при прокрутке не
 * сдвигается ни на пиксель. Число больше (108) уронило бы карточку на те самые
 * 100 px ниже строки управления.
 */
const RAIL_TOP = 8

/** Просвет под рейлом до низа окна. */
const RAIL_BOTTOM = 24

/**
 * Верх прилипшей строки управления.
 *
 * Ноль, а не RAIL_TOP: полоса обязана дотягиваться до самого верха панели
 * прокрутки, иначе в просвете над ней видно уезжающий текст. Отступ до кнопок
 * даёт собственный padding полосы (PAD_TOP) — вровень с рейлом.
 */
// Раньше здесь стоял max(8px, safe-area): на телефоне это ровно граница выреза,
// и строка управления вставала под собственное размытие статус-бара — «всё
// скрылось под чёлку». Зазор берём общий для всех мобильных экранов.
const PAD_TOP = `calc(env(safe-area-inset-top, 0px) + ${MOBILE_TOP_GAP}px)`

/**
 * Имя переменной, которой полоса сообщает свою высоту содержимому.
 *
 * Внутри читалки прилипает ещё и шапка плеера (trainer/ScoreReader.tsx). Обе
 * полосы на одном top наехали бы друг на друга, а прописать высоту строки
 * управления числом нельзя: она разная у режимов и переносится на второй ряд.
 * Поэтому высота меряется по факту и отдаётся вниз переменной CSS.
 */
export const TRAINER_STICK_TOP = '--trainer-stick-top'

/** Куда прилипает содержимое под строкой управления, если её нет вовсе. */
export const TRAINER_STICK_FALLBACK = `var(${TRAINER_STICK_TOP}, ${PAD_TOP})`

/** Высота рейла на первом кадре, до замера: экран минус шапка кабинета. */
const RAIL_MAX_FALLBACK = `calc(100vh - ${100 + RAIL_TOP + RAIL_BOTTOM}px)`

/**
 * Ширина, ниже которой рейл уходит в шторку.
 *
 * Ровно та же, что у общего useIsDesktop (>= 1024): своя цифра завела бы в
 * приложении третью ширину, и в полосе между ними страница оказывалась бы
 * «десктопной» по одному правилу и «узкой» по другому.
 */
const BREAK = 1024

/**
 * Узкий экран — тот же порог, что у рейла.
 *
 * Наружу отдан ради вызывающего: на телефоне часть карточек рейла переезжает в
 * нижнюю навигацию (см. `nav`), и рисовать их вторым экземпляром в шторке
 * фильтров значит показывать один и тот же переключатель дважды.
 */
export function useTrainerNarrow(): boolean { return useNarrow() }

/**
 * МЕСТО ПЛЕЕРА В РЯДУ ДОКА — ДЛЯ ТЕХ, КТО РИСУЕТ ЕГО ИЗНУТРИ СОДЕРЖИМОГО.
 *
 * Проп `narrowPlayer` годится, пока плеером владеет сам экран (аудирование:
 * запись там — свойство задания). У читалки иначе: голос ведёт по строкам,
 * подсвечивая слово, и живёт он внутри партитуры (trainer/ScoreReader.tsx) —
 * вместе со своей меткой паузы, темпом и режимом «по строке». Поднимать это
 * состояние в LanguageTrainer значило бы протащить полразбора наружу ради
 * одной кнопки.
 *
 * Поэтому док отдаёт вниз узел, а потомок рисует в него порталом. `claim`
 * говорит доку, что место занято: от этого зависит, растягивать ли ряд на всю
 * ширину и схлопывать ли круг «Фильтры» при листании.
 */
type TrainerPlayerSlot = { el: HTMLElement | null; claim: (on: boolean) => void }
const PlayerSlotCtx = createContext<TrainerPlayerSlot | null>(null)
export function useTrainerPlayerSlot(): TrainerPlayerSlot | null { return useContext(PlayerSlotCtx) }

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < BREAK,
  )
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < BREAK)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

// ─── Каркас ──────────────────────────────────────────────────────────────────

/**
 * Навигация тренажёра для телефона: режимы и половины текущего режима.
 *
 * Отдельно от рейла, потому что это РАЗНЫЕ вещи, которые раньше лежали одной
 * кучей: «Чтение → Аудирование» — переезд на другой экран, «Уровень B1» —
 * сужение выборки. В общей шторке до режима нужно было листать, а до фильтров
 * — листать ещё дальше.
 */
export type TrainerNav = {
  modes: { id: string; label: string; count?: number; Icon?: React.ComponentType<{ size?: number }> }[]
  mode: string
  onMode: (id: string) => void
  /** Половины текущего режима — «Лента/Тексты/Сцены», «Наборы/Слова/Повторение». */
  views?: { id: string; label: string; badge?: number }[]
  view?: string
  onView?: (id: string) => void
  accent?: string
}

export default function TrainerShell({ rail, toolbar, share, shareAccent, narrowLead, narrowPlayer, nav, children }: {
  /** Карточки рейла — обычно SubjectHero + RailCard'ы. */
  rail: React.ReactNode
  /** Строка управления над содержимым. */
  toolbar?: React.ReactNode
  /**
   * Адрес этого экрана. Есть адрес — в правом краю строки управления стоит
   * кнопка «поделиться» (см. ShareCircle). Своим местом в скелете, а не в
   * каждой строке управления: экранов у тренажёра под два десятка, у части из
   * них строки нет вовсе, и кнопка, расставленная по местам вручную, честно
   * держалась бы ровно там, где про неё не забыли.
   */
  share?: string
  /**
   * Цвет подтверждения у кнопки адреса — палитра предмета. Отдельным пропом, а
   * не из nav: у читалки и аудирования своего nav нет вовсе, а палитра есть.
   */
  shareAccent?: string
  /** Режимы и половины — для нижней навигации телефона. */
  nav?: TrainerNav
  /**
   * Что встаёт в нижнем доке рядом с кнопкой шторки — переключатель предмета.
   *
   * Своим местом, а не внутри рейла: на телефоне рейл целиком уезжает в шторку,
   * и предмет — единственное, что оттуда обязано остаться на виду. Ученику,
   * который учит два языка, нельзя прятать смену предмета за кнопкой «Режим и
   * фильтры»: он туда не полезет, потому что менять фильтры не собирался.
   */
  narrowLead?: React.ReactNode
  /**
   * Плеер записи для телефона — встаёт В РЯД дока, слева от круга «Фильтры»
   * (TrackPlayer с пропом inline). Раньше плеер висел отдельной строкой над
   * доком, а одинокий круг стоял по центру под ним — два этажа управления.
   * Когда док при листании прячется, круг схлопывается по ширине и плеер
   * плавно растягивается на весь ряд: звук — то, ради чего экран открыт,
   * и он с экрана не уходит.
   */
  narrowPlayer?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useT()
  const narrow = useNarrow()
  // Свёрнут ли док — нужно самим (а не только детям дока), чтобы схлопнуть
  // круг «Фильтры» по ширине и отдать его место плееру. Тот же сглаженный
  // флаг, что внутри MobileDock, — иначе ширина и прозрачность разъедутся.
  const dockCollapsed = useSmoothCollapse()
  // Место плеера в ряду дока для потомка (см. useTrainerPlayerSlot). Узел
  // рисуется всегда — потомку нужно, куда портировать, ещё до того, как он
  // сообщит, что место занято; `claimed` только раздвигает ряд под него.
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null)
  const [claimed, setClaimed] = useState(false)
  const claim = useCallback((on: boolean) => setClaimed(on), [])
  const slot = useMemo(() => ({ el: slotEl, claim }), [slotEl, claim])
  const hasPlayer = !!narrowPlayer || claimed
  const [sheet, setSheet] = useState(false)
  const [navSheet, setNavSheet] = useState(false)
  /**
   * Прилипшая полоса рисуется и ради одной кнопки адреса: у страниц-разборов
   * (гнездо созвучий, основа глагола, корень, набор счёта) строки управления
   * нет, и без этого «поделиться» на них было бы нечем — ровно на тех экранах,
   * которые чаще всего и присылают.
   */
  const bar = toolbar || share
  const railRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // Ушли с телефона на десктоп — шторка обязана закрыться сама, иначе она
  // останется висеть поверх уже нарисованного рейла.
  useEffect(() => { if (!narrow) { setSheet(false); setNavSheet(false) } }, [narrow])

  // Высота рейла считается по факту, а не по формуле: карточка прилипла и
  // больше не двигается, значит её верх в окне — величина постоянная, и остаток
  // до низа экрана и есть та высота, после которой начинается свой скролл.
  // Замер вместо константы — чтобы шапка кабинета могла менять высоту (или
  // вовсе отсутствовать, если скелет позовут из другого места), а рейл всё
  // равно доставал ровно до нижнего края окна.
  const [railMax, setRailMax] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (narrow) { setRailMax(null); return }
    const measure = () => {
      const el = railRef.current
      if (!el) return
      setRailMax(Math.max(240, window.innerHeight - el.getBoundingClientRect().top - RAIL_BOTTOM))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [narrow])

  // Высота прилипшей строки — тем же замером и по той же причине, что и высота
  // рейла: под ней стоит вторая прилипающая полоса (шапка читалки), и она
  // должна вставать ровно под кнопки, а не поверх них.
  const [barH, setBarH] = useState(0)
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) { setBarH(0); return }
    const measure = () => setBarH(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [toolbar, share, narrow])

  return (
    <div style={{
      // Низ на телефоне длиннее: под содержимым стоят навигация и плавающий
      // док управления, и без запаса последняя карточка уезжает под них.
      //
      // ЧИСЛО СЧИТАНО ОТ ДОКА, А НЕ НА ГЛАЗ. MobileDock прижат к
      // MOBILE_DOCK_EDGE (20 px) и в развёрнутом виде поднят над ним ещё на
      // 86 px (marginBottom — те же 86/74, что у доков банка заданий и курсов:
      // зазор до нижней навигации обязан быть одинаковым на всех экранах),
      // а сама таблетка внутри — 46 px (DockCircle).
      // Итого верхний край дока стоит в 20+86+46 = 152 px от низа экрана.
      // Запас оставлен прежний: кнопка «Дальше» на короткой карточке (см.
      // StoryReader) не должна вставать впритык к доку.
      //
      // ВЕРХ НА ТЕЛЕФОНЕ ЗАВИСИТ ОТ СТРОКИ УПРАВЛЕНИЯ. Зазор под чёлку даёт
      // прилипшая полоса (PAD_TOP), но у страниц-разборов её нет вовсе (основа
      // глагола, корень, набор счёта, гнездо созвучий): содержимое начиналось с
      // 8 px и первая строка вставала под размытие статус-бара. Когда полосы
      // нет — тот же отступ берёт на себя сам скелет.
      width: '100%',
      paddingTop: narrow && !bar ? PAD_TOP : 8,
      paddingLeft: narrow ? 16 : 0,
      paddingRight: narrow ? 16 : 0,
      paddingBottom: narrow ? 198 : 80,
      display: 'flex', flexDirection: narrow ? 'column' : 'row',
      gap: narrow ? 16 : 22, alignItems: 'flex-start',
    }}>
      {/* На узком экране рейл уходит в шторку целиком — см. кнопку «Фильтры»
          ниже. Раньше он просто вставал НАД содержимым: три карточки подряд
          занимали весь первый экран, и до самих результатов нужно было
          пролистать фильтры, которыми в тот момент никто не пользуется. */}
      {narrow ? (
        <>
          {/* Заголовок — название режима, а не слово «Фильтры»: внутри у
              половины режимов лежит карточка с ровно таким же заголовком, и
              шторка открывалась «Фильтры / Фильтры». Заодно видно, к чему эти
              фильтры относятся — список-то теперь свой у каждого режима. */}
          <MobileSheet
            open={sheet}
            onClose={() => setSheet(false)}
            title={t(nav?.modes.find(m => m.id === nav.mode)?.label ?? 'Фильтры')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{rail}</div>
          </MobileSheet>
          {/* Шторка-навигация: только «куда пойти». Закрывается сама, потому
              что выбор режима — это переезд, и смотреть после него нужно на
              новый экран, а не на список, из которого пришли. */}
          {nav && (
            <MobileSheet open={navSheet} onClose={() => setNavSheet(false)} title={t('Режим')}>
              <NavSheetBody nav={nav} onDone={() => setNavSheet(false)} />
            </MobileSheet>
          )}
        </>
      ) : null}

      {/* sticky отдельной обёрткой, а не на самой карточке: у карточки есть
          собственный фон и тень, и position на ней ловит их в отдельный слой,
          из-за чего тень начинает мигать при остановке скролла. */}
      <div style={{
        display: narrow ? 'none' : 'block',
        position: narrow ? 'static' : 'sticky', top: RAIL_TOP,
        flexShrink: 0, width: narrow ? '100%' : RAIL_W,
      }}>
        <aside
          ref={railRef}
          className="no-scrollbar"
          style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            padding: 16, borderRadius: 24,
            background: 'rgba(var(--glass-rgb), 0.97)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            // Карточка обнимает содержимое, пока оно короче экрана, и только
            // упёршись в нижний край окна отдаёт остаток собственному скроллу.
            ...(narrow ? null : {
              maxHeight: railMax ?? RAIL_MAX_FALLBACK,
              overflowY: 'auto' as const,
              overscrollBehavior: 'contain' as const,
            }),
          }}
        >
          {rail}
        </aside>
      </div>

      <main style={{
        flex: 1, minWidth: 0, width: narrow ? '100%' : undefined,
        display: 'flex', flexDirection: 'column', gap: 16,
        ...(barH ? { [TRAINER_STICK_TOP]: `${Math.round(barH)}px` } as CSSProperties : null),
      }}>
        {/* СТРОКА УПРАВЛЕНИЯ ЕДЕТ ЗА СОДЕРЖИМЫМ.
            «К списку», вид текста и подсказки — решения по ходу работы, а не
            только на первом экране: на середине длинного текста выйти к списку
            или переключить партитуру можно было, лишь пролистав всё обратно
            наверх. Рейл слева прилипал давно; строка оставалась единственным
            управлением, которое уезжало.
            Полоса непрозрачна и с размытием: под ней едет текст, и сквозь
            промежутки между таблетками он превращал бы кнопки в кашу. */}
        {bar && (
        <div
          ref={barRef}
          style={{
            position: 'sticky', top: 0, zIndex: 5,
            marginTop: -8, marginBottom: -10,
            paddingTop: PAD_TOP, paddingBottom: 10,
            display: 'flex', flexDirection: 'column', gap: 12,
            // Свой composite-слой на телефоне: без него WebKit на каждый кадр
            // сворачивания/разворачивания адресной строки Safari пересчитывает
            // положение sticky-полосы заново, и она заметно «прыгает» вверх-вниз
            // вместо того чтобы стоять на месте. transform на самом sticky-
            // элементе на его прилипание не влияет (ломает только transform на
            // ПРЕДКЕ) — только просит браузер держать полосу в отдельном слое.
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >

        {/* Строка управления занимает всю ширину, кнопка адреса — правый край.
            Ряд, а не ещё один элемент ВНУТРИ строки: строка переносится по
            словам (flexWrap), и кнопка, поставленная в неё, оказывалась то в
            конце первого ряда, то одна на втором — служебное действие каждый
            раз в новом месте. Здесь её место постоянное, а строки может не
            быть вовсе. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>{toolbar}</div>
          {share && <ShareCircle url={share} accent={shareAccent ?? nav?.accent} />}
        </div>
        </div>
        )}
        <PlayerSlotCtx.Provider value={slot}>{children}</PlayerSlotCtx.Provider>
      </main>

      {/* УПРАВЛЕНИЕ НА ТЕЛЕФОНЕ ЖИВЁТ ВНИЗУ, У БОЛЬШОГО ПАЛЬЦА.
          Раньше предмет и «Режим и фильтры» стояли строкой наверху — там же,
          где чёлка и шапка кабинета: чтобы сменить язык посреди ленты, нужно
          было пролистать всё обратно наверх, а на большом экране до верхнего
          края ещё и не дотянуться. Плавающий док — тот же приём, что в ДЗ и
          курсах: он едет над навигацией, прячется под неё при листании вниз и
          возвращается при листании вверх. */}
      {narrow && (
        <MobileDock fill={hasPlayer}>
          {/* Плеер не гаснет вместе с кругами: pointerEvents:'auto' возвращает
              ему тапы и под свёрнутым доком (у ряда в этот момент 'none'). */}
          {narrowPlayer && (
            <div style={{ flex: 1, minWidth: 0, pointerEvents: 'auto' }}>
              {narrowPlayer}
            </div>
          )}
          {/* Место для плеера, нарисованного изнутри содержимого (партитура
              читалки). Пока никто его не занял — узел есть, но ширины не
              просит: без него потомку некуда портировать. */}
          <div
            ref={setSlotEl}
            style={{
              display: claimed ? 'block' : 'none',
              flex: claimed ? 1 : undefined, minWidth: 0, pointerEvents: 'auto',
            }}
          />
          {narrowLead && <DockSlot>{narrowLead}</DockSlot>}
          {/* Половины режима — прямо в доке, без шторки: «Лента ↔ Сцены» и
              «Наборы ↔ Повторение» переключают чаще всего остального вместе
              взятого, и три тапа со скроллом на это движение — самый дорогой
              путь во всём тренажёре. */}
          {nav?.views && nav.views.length > 1 && nav.onView && (
            <DockSegment
              options={nav.views.map(v => ({ id: v.id, label: t(v.label) }))}
              value={nav.view ?? nav.views[0].id}
              onChange={id => nav.onView!(String(id))}
              accent={nav.accent}
            />
          )}
          {nav && (
            <DockCircle
              icon={<ModeIcon nav={nav} />}
              ariaLabel={t('Режим')}
              onClick={() => { setSheet(false); setNavSheet(true) }}
            />
          )}
          {/* Рядом с плеером круг при сворачивании дока схлопывается ещё и по
              ширине (отрицательный margin съедает gap ряда) — плеер плавно
              растягивается на освободившееся место, а не упирается в пустоту,
              где только что стояла невидимая кнопка. */}
          <motion.div
            initial={false}
            animate={hasPlayer ? { width: dockCollapsed ? 0 : 46, marginLeft: dockCollapsed ? -10 : 0 } : undefined}
            transition={COLLAPSE}
            style={{ flexShrink: 0 }}
          >
            <DockCircle
              icon={<SlidersHorizontal size={20} />}
              ariaLabel={t('Фильтры')}
              onClick={() => { setNavSheet(false); setSheet(true) }}
            />
          </motion.div>
        </MobileDock>
      )}
    </div>
  )
}

/**
 * «Поделиться» — адрес открытого экрана наружу.
 *
 * КНОПКА, А НЕ «СКОПИРУЙТЕ ИЗ СТРОКИ БРАУЗЕРА». На телефоне адресной строки
 * половину времени не видно вовсе, а в установленном PWA её нет никогда — тот
 * самый случай, когда прислать другу ряд созвучий физически нечем.
 *
 * НА ТЕЛЕФОНЕ — СИСТЕМНЫЙ ЛИСТ. Там «поделиться» значит «отправить в телеграм»,
 * а не «положить в буфер и дальше сам»: буфер — это лишний шаг, на котором
 * половина отправок и заканчивается. Где листа нет (десктоп, старый webview) —
 * копируем, и это честно написано в подсказке.
 *
 * КРУЖОК БЕЗ ПОДПИСИ И ПО ПРАВОМУ КРАЮ. Слово «Поделиться» в одном ряду с «К
 * списку» и «С разбором» весило бы столько же, сколько они, — а это действие
 * редкое и служебное: место ему с краю, размер — с иконку, подпись отдана
 * заголовку при наведении.
 */
function ShareCircle({ url, accent }: { url: string; accent?: string }) {
  const t = useT()
  const narrow = useNarrow()
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Системный лист есть не везде (десктоп, старые webview). Проверяем ключом:
  // в типах DOM navigator.share объявлен всегда определённым, и обычное
  // `navigator.share &&` компилятор читает как заведомо истинное.
  const sheet = narrow && 'share' in navigator

  const flash = () => {
    setDone(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDone(false), 2000)
  }
  const copy = () => { void copyToClipboard(url).then(ok => { if (ok) flash() }) }

  function onClick() {
    if (sheet) {
      // Отмена листа — не ошибка и не повод что-то делать вместо: человек
      // передумал. А вот отказ самого листа (нет жеста, не тот протокол) — повод
      // не оставить его ни с чем и положить адрес хотя бы в буфер.
      navigator.share({ url }).catch((e: unknown) => {
        if ((e as { name?: string })?.name !== 'AbortError') copy()
      })
      return
    }
    copy()
  }

  const label = done
    ? (sheet ? t('Готово') : t('Ссылка скопирована'))
    : (sheet ? t('Поделиться') : t('Скопировать ссылку'))
  const on = done ? (accent ?? MENU_ACCENT) : 'var(--color-text-2)'

  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // 36 — высота таблеток строки (10px padding + 16 строки): кружок обязан
        // стоять с ними вровень, иначе правый край строки «проваливается».
        width: 36, height: 36, borderRadius: 999, flexShrink: 0,
        cursor: 'pointer', fontFamily: 'inherit',
        border: `1px solid ${done ? (accent ?? MENU_ACCENT) : 'var(--color-border-medium)'}`,
        background: 'rgba(var(--glass-rgb), 0.88)', ...PILL_GLASS,
        color: on,
      }}
    >
      {done ? <Check size={15} /> : sheet ? <Share2 size={15} /> : <Link2 size={15} />}
    </button>
  )
}

/** Иконка круга навигации — значок ТЕКУЩЕГО режима, а не общий значок меню. */
function ModeIcon({ nav }: { nav: TrainerNav }) {
  const Icon = nav.modes.find(m => m.id === nav.mode)?.Icon
  return Icon ? <Icon size={20} /> : <Layers size={20} />
}

/**
 * Содержимое шторки-навигации: плитки режимов и половины выбранного.
 *
 * Плитками в два столбца, а не списком в один: семь режимов списком — это
 * экран прокрутки, плитками — один взгляд. Число на плитке отвечает на
 * вопрос «а есть ли там вообще что-нибудь» до перехода.
 */
function NavSheetBody({ nav, onDone }: { nav: TrainerNav; onDone: () => void }) {
  const t = useT()
  const accent = nav.accent ?? 'var(--color-accent)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {nav.modes.map(m => {
          const on = m.id === nav.mode
          return (
            <button
              key={m.id}
              onClick={() => { if (!on) nav.onMode(m.id); onDone() }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: '12px 12px', borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left',
                border: on ? `1px solid ${accent}` : '1px solid var(--color-border-soft)',
                background: on ? `${accent}1f` : 'var(--color-bg-2)',
                color: on ? accent : 'var(--color-text)',
              }}
            >
              {m.Icon && <m.Icon size={18} />}
              {/* Число — В СТРОКЕ с названием, а не под ним: отдельной строкой
                  плитка вырастала на треть ради двух знаков, а «сколько там
                  всего» читается вместе с названием режима, не после него. */}
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, width: '100%', minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: on ? 750 : 600, lineHeight: 1.25, minWidth: 0, ...clamp2 }}>
                  {t(m.label)}
                </span>
                {m.count !== undefined && (
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: on ? accent : 'var(--color-text-3)', flexShrink: 0, marginLeft: 'auto',
                  }}>
                    {m.count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Половины текущего режима — тут же, под плитками: тот же док их и так
          показывает, но из шторки видно, куда попадёшь, ещё до перехода. */}
      {nav.views && nav.views.length > 1 && nav.onView && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {nav.views.map(v => {
            const on = v.id === nav.view
            return (
              <button
                key={v.id}
                onClick={() => { if (!on) nav.onView!(v.id); onDone() }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12.5, fontWeight: on ? 750 : 600,
                  border: on ? `1px solid ${accent}` : '1px solid var(--color-border-soft)',
                  background: on ? `${accent}1f` : 'transparent',
                  color: on ? accent : 'var(--color-text-2)',
                }}
              >
                {t(v.label)}
                {v.badge !== undefined && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: on ? accent : 'var(--color-text-3)' }}>
                    {v.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Карточки рейла ──────────────────────────────────────────────────────────

/**
 * Подпись обрывается ВТОРОЙ строкой, а не первой.
 *
 * Рейл узкий, и любая подпись длиннее его ширины раньше превращалась в
 * «выполнять роль, п…» или «до 3 …». Одна отрезанная строка — это не короткий
 * вариант подписи, а загадка: перевод слова без второй половины бесполезен,
 * название режима без хвоста неотличимо от соседнего. Вторая строка почти
 * всегда закрывает вопрос, а на совсем длинном многоточие остаётся —
 * но уже после того, как смысл прочитан.
 */
const clamp2: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
  // break-word, а не anywhere: последний резал транскрипцию посреди слова
  // («оджоноджон / хада») ради узкой колонки, хотя колонке есть куда расти.
  overflowWrap: 'break-word',
}

/**
 * Градиентная шапка рейла — заголовок и строчка контекста.
 *
 * ПРЕДМЕТ ЗДЕСЬ БОЛЬШЕ НЕ ЖИВЁТ: шапку предмета рисует SubjectHero
 * (trainer/SubjectSwitch.tsx) — она кликабельна и открывает список предметов.
 * Здесь остались названия материалов: открытый текст, запись аудирования.
 */
export function RailHero({ title, subtitle, palette, plain }: {
  title: string
  subtitle?: string
  palette: { accent: string; text: string; ring: string }
  /**
   * Заголовок — название материала, а не предмета.
   *
   * Капслок с разрядкой хорош для короткого «КОРЕЙСКИЙ», но название текста
   * («헬스장 안내 (объявление в спортзале)») в нём превращается в три строки
   * заглавных букв вперемешку с хангылем и не читается вовсе.
   */
  plain?: boolean
}) {
  return (
    <div style={{
      padding: 16, borderRadius: 16, color: '#fff',
      background: `linear-gradient(135deg, ${palette.accent}cc, ${palette.text}cc)`,
      boxShadow: `0 18px 44px ${palette.ring}`,
    }}>
      <div style={plain
        ? { fontSize: 15, fontWeight: 750, lineHeight: 1.3, marginBottom: 8 }
        : { fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10, opacity: 0.95 }}>
        {title}
      </div>
      {subtitle && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>{subtitle}</p>
      )}
    </div>
  )
}

/** Обычная карточка рейла: заголовок с иконкой и содержимое столбиком. */
export function RailCard({ icon, title, accent, children, action }: {
  icon?: React.ReactNode
  title: string
  accent: string
  children: React.ReactNode
  /** Ссылка-действие в правом углу заголовка — «сбросить», «все». */
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 16,
      background: 'rgba(var(--glass-rgb), 0.94)',
      border: '1px solid var(--color-border-soft)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon && <span style={{ display: 'flex', color: accent }}>{icon}</span>}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11.5, fontWeight: 650, color: accent, padding: 0,
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {/* Содержимое — своей колонкой с шагом 8, а не общим шагом карточки.
          В банке ровно так: 12 отделяют заголовок от блока управления, а сами
          поля стоят через 8. Одним общим шагом 12 фильтры расползались, и ряд
          дропдаунов читался как список отдельных карточек, а не как один блок. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

/** Список режимов — вертикальный, со счётчиком справа. */
export function RailModes<T extends string>({ items, value, onChange, accent, soft }: {
  items: { id: T; label: string; count?: number; Icon?: React.ComponentType<{ size?: number }> }[]
  value: T
  onChange: (v: T) => void
  accent: string
  soft: string
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map(m => {
        const on = m.id === value
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '9px 11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', textAlign: 'left',
              background: on ? soft : 'transparent',
              color: on ? accent : 'var(--color-text-2)',
              fontSize: 13.5, fontWeight: on ? 700 : 550,
            }}
          >
            {m.Icon && <m.Icon size={15} />}
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25, ...clamp2 }}>
              {t(m.label)}
            </span>
            {m.count !== undefined && (
              <span style={{ fontSize: 11, fontWeight: 700, color: on ? accent : 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                {m.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Сегмент — выбор одного из немногих. Значение '' допустимо и означает «все».
 *
 * Отдельно от RailModes: тот всегда что-то выбран и живёт как навигация, а
 * сегмент — это фильтр, который можно снять повторным нажатием.
 */
export function RailSegment({ options, value, onChange, accent, soft, clearable = true, idleIcon = false }: {
  options: { value: string; label: string; badge?: number; icon?: ReactNode }[]
  value: string
  onChange: (v: string) => void
  accent: string
  soft: string
  clearable?: boolean
  /**
   * Подпись только у выбранного, у остальных — одна иконка. Четыре подписи в
   * ряд шириной в рейл ломались пополам («Шэдо/уинг», «Расск/аз»); выбранный
   * забирает освободившееся место и читается целиком, остальные ждут значками.
   */
  idleIcon?: boolean
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(o => {
        const on = value === o.value
        // Значок вместо подписи — только пока кнопка не выбрана и значок есть.
        const mute = idleIcon && !on && !!o.icon
        return (
          <button
            key={o.value}
            onClick={() => onChange(on && clearable ? '' : o.value)}
            title={t(o.label)}
            aria-label={t(o.label)}
            style={{
              // Один в один кнопки «Часть 1 / Часть 2» из рейла банка: рамки у
              // них нет вовсе — состояние читается заливкой и цветом текста.
              // Своя рамка делала ряд тяжелее соседних полей-дропдаунов, у
              // которых кольцо появляется только по фокусу.
              // Боковой отступ меньше банковских 12 px: там в ряду две кнопки с
              // коротким «Часть 1», здесь — три с «до 3 мин», и на 12 px подпись
              // ломалась пополам. Высота (9 px сверху и снизу) та же.
              // Иконочный вариант не растягивается: подпись ему не нужна, а
              // равная доля ряда только резала бы соседний текст многоточием.
              flex: (mute || (o.icon && !idleIcon)) ? '0 0 auto' : 1, minWidth: 0,
              padding: (mute || (o.icon && !idleIcon)) ? '9px 11px' : '9px 6px', borderRadius: 13, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              border: 'none',
              background: on ? soft : 'var(--color-bg-input)',
              color: on ? accent : 'var(--color-muted)',
              transition: 'all 0.15s ease',
            }}
          >
            {(mute || (o.icon && !idleIcon))
              ? <span style={{ display: 'flex', alignItems: 'center' }}>{o.icon}</span>
              : (
                // Одна строка, а не clamp2: активная подпись занимает
                // освободившееся место, но при нехватке ширины должна
                // обрезаться многоточием, а не ломаться пополам («Шэдо/уинг»).
                <span style={{ lineHeight: 1.2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                  {t(o.label)}
                </span>
              )}
            {/* У активной кнопки бейдж прячется: имя и так забрало почти всю
                ширину строки, а число рядом обрезало «Тексты» в «Текс…».
                Счётчик остаётся только на неактивных значках. */}
            {o.badge !== undefined && o.badge > 0 && !on && (
              <span style={{
                padding: '1px 6px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
                background: soft, color: accent, fontVariantNumeric: 'tabular-nums',
              }}>
                {o.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Список-выбор внутри карточки рейла: полки разговорника, словарик текста. */
export function RailList({ items, value, onChange, accent, soft }: {
  /** `sub` — вторая строка под названием: транскрипция слова, счётчик полки. */
  items: { id: string; label: string; sub?: string; hint?: string }[]
  value: string
  onChange: (v: string) => void
  accent: string
  soft: string
}) {
  // На широком экране скроллится сам рейл, и вложенная 300-пиксельная коробка
  // была бы вторым скроллом внутри первого: колесо над списком дёргало бы то
  // его, то карточку. На узком рейл лежит НАД содержимым во всю ширину и своего
  // скролла не имеет — там ограничение по высоте остаётся.
  const narrow = useNarrow()
  return (
    <div
      className="no-scrollbar"
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        ...(narrow ? { maxHeight: 300, overflowY: 'auto' as const } : null),
      }}
    >
      {items.map(i => {
        const on = i.id === value
        // Подпись обычно короткая — счётчик полки, «больше месяца» — и стоит
        // справа от слова, как в любом списке-с-числом. Но переводы в словаре
        // текста тянутся до шести десятков знаков («формула перед едой; здесь —
        // „спасибо, поедим с удовольствием“»), и в колонке шириной в треть
        // рейла такой перевод не помещается ни в одну строку, ни в две.
        // Длинному отдаётся своя строка во всю ширину — и третья строка сверх
        // общего лимита: во всю ширину они вмещают и самый длинный перевод
        // словарей, то есть резать в этой ветке уже нечего.
        const wide = (i.hint?.length ?? 0) > 24
        const hintStyle: CSSProperties = {
          fontSize: 11, lineHeight: 1.3, color: on ? accent : 'var(--color-text-3)',
          fontVariantNumeric: 'tabular-nums',
          ...clamp2,
          ...(wide ? { WebkitLineClamp: 3 } : null),
        }
        return (
          <button
            key={i.id}
            onClick={() => onChange(i.id)}
            title={i.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3,
              width: '100%', textAlign: 'left',
              padding: '7px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', background: on ? soft : 'transparent',
              color: on ? accent : 'var(--color-text-2)',
              fontSize: 12.5, fontWeight: on ? 700 : 550,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, width: '100%' }}>
              <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 1 }}>
                <span style={{ ...clamp2, lineHeight: 1.25 }}>
                  {i.label}
                </span>
                {/* Транскрипция — под словом и тише его: она нужна, чтобы слово
                    можно было проговорить, но читают всё-таки оригинал. */}
                {i.sub && (
                  <span style={{
                    fontSize: 11, fontWeight: 500, letterSpacing: 0.1, lineHeight: 1.3,
                    color: on ? accent : 'var(--color-text-3)', opacity: on ? 0.8 : 1,
                    ...clamp2,
                  }}>
                    {i.sub}
                  </span>
                )}
              </span>
              {i.hint && !wide && (
                // Слово важнее подписи: она берёт не больше 58% строки, иначе
                // от самого слова не остаётся ни буквы.
                <span style={{ ...hintStyle, maxWidth: '58%', textAlign: 'right' }}>
                  {i.hint}
                </span>
              )}
            </span>
            {i.hint && wide && <span style={hintStyle}>{i.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Тумблер настройки показа. */
export function RailToggle({ label, on, onChange, accent }: {
  label: string; on: boolean; onChange: (v: boolean) => void; accent: string
}) {
  const t = useT()
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        width: '100%', padding: '5px 0', border: 'none', background: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 550, color: 'var(--color-text-2)', textAlign: 'left',
      }}
      role="switch"
      aria-checked={on}
    >
      <span>{t(label)}</span>
      <span style={{
        position: 'relative', flexShrink: 0, width: 32, height: 18, borderRadius: 999,
        background: on ? accent : 'var(--color-border-medium)', transition: 'background .16s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%',
          background: '#fff', transition: 'left .16s',
        }} />
      </span>
    </button>
  )
}

/** Строка «подпись — значение» в рейле: счётчики сессии. */
export function RailStat({ label, value, tone }: {
  label: string; value: React.ReactNode; tone?: 'good' | 'warn'
}) {
  const t = useT()
  const color = tone === 'good' ? 'var(--color-green-text)' : tone === 'warn' ? '#E0A22A' : 'var(--color-text)'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
      <span style={{ color: 'var(--color-text-2)' }}>{t(label)}</span>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

// ─── Строка управления ───────────────────────────────────────────────────────

export function Toolbar({ children }: { children: React.ReactNode }) {
  // Шаг 10 — как в собственной строке банка: она пока своя (у неё поиск с
  // подсказкой и «Избранное» со счётчиком), и на 9 против 10 два соседних
  // экрана расходились ровно на пиксель в каждом промежутке.
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {children}
    </div>
  )
}

/** Поиск-таблетка: свёрнут до иконки, раскрывается по клику. Как в банке. */
export function SearchPill({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const wide = open || !!value
  return (
    <div
      onClick={() => { setOpen(true); ref.current?.focus() }}
      style={{
        // Высота не своя, а от строки: alignSelf: 'stretch' тянет таблетку до
        // самого высокого соседа (группы статусов), иначе поиск стоял на пару
        // пикселей ниже остальных. minHeight — на случай, когда перенос строки
        // оставил его одного.
        display: 'flex', alignItems: 'center', alignSelf: 'stretch', boxSizing: 'border-box',
        gap: 8, padding: '0 14px', minHeight: 36, borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.96)', ...PILL_GLASS,
        border: `1px solid ${wide ? 'var(--color-accent, #7c3aed)' : 'var(--color-border-medium)'}`,
        width: wide ? 260 : 112, transition: 'width .22s cubic-bezier(.4,0,.2,1), border-color .15s',
        overflow: 'hidden', cursor: wide ? 'text' : 'pointer', flexShrink: 0,
      }}
    >
      <Search size={14} style={{ color: wide ? 'var(--color-text)' : 'var(--color-text-3)', flexShrink: 0 }} />
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!value) setOpen(false) }}
        placeholder={wide ? (placeholder ?? t('Поиск')) : t('Поиск')}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit',
          width: wide ? 'auto' : 0, pointerEvents: wide ? 'auto' : 'none',
        }}
      />
      {value && (
        <button
          onClick={e => { e.stopPropagation(); onChange('') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 15, lineHeight: 1, flexShrink: 0 }}
        >×</button>
      )}
    </div>
  )
}

/** Статусы выборки: Все / … . Общий словарь на все режимы. */
/**
 * Сегменты выборки — статус, вид, способ прогона.
 *
 * Одна реализация на скелет и на банк заданий. Раньше их было две: у банка с
 * плавающей таблеткой-подложкой, у скелета простая заливка активного сегмента.
 * Разошлись бы дальше при первой же правке, поэтому здесь оставлена лучшая —
 * банковская: подложка переезжает между сегментами анимацией, а не мигает.
 *
 * ПОЧЕМУ ШИРИНА НЕ ПРЫГАЕТ. Активный сегмент жирнее неактивного, и на смене
 * выбора строка бы дёргалась. Под текстом лежит его же невидимая копия, всегда
 * жирная: она и держит ширину, а видимая надпись просто перекрашивается.
 *
 * МОБИЛЬНОГО ВАРИАНТА ЗДЕСЬ НЕТ намеренно. На телефоне банк рисует те же
 * статусы тремя равными серыми сегментами под соседние поля фильтров — это
 * другой дизайн для другой раскладки, а не вариация этого. Он остался в
 * TaskBankPage, рядом со своей вёрсткой.
 */
export function StatusTabs({ options, value, onChange, accent }: {
  options: { value: string; label: string; Icon?: React.ComponentType<{ size?: number }> }[]
  value: string
  onChange: (v: string) => void
  /**
   * Задан — активный сегмент целиком красится предметом: и подпись, и заливка
   * таблетки. Без него таблетка берёт общий фиолетовый `--tab-pill-active`,
   * который посреди зелёного или оранжевого предмета читается как чужой.
   */
  accent?: string
}) {
  const t = useT()
  const pill = useFloatingPill(value)
  return (
    <div
      ref={pill.containerRef}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        padding: 3, borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.88)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {pill.pillRect && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: pill.pillRect.left, top: pill.pillRect.top,
            width: pill.pillRect.width, height: pill.pillRect.height,
            borderRadius: 999,
            background: accent
              ? `linear-gradient(${accent}26, ${accent}26), rgba(var(--glass-rgb), 0.82)`
              : 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            boxShadow: 'var(--shadow-tab-pill)',
            border: `1px solid ${accent ? `${accent}59` : 'var(--color-border-glass)'}`,
            pointerEvents: 'none', zIndex: 0,
          }}
        />
      )}
      {options.map(o => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={pill.registerItem(o.value)}
            onClick={() => onChange(o.value)}
            title={t(o.label)}
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999, border: 'none',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              color: on ? (accent ?? 'var(--color-text)') : 'var(--color-text-3)',
              fontSize: 12, fontWeight: on ? 700 : 500,
              whiteSpace: 'nowrap', transition: 'color 0.16s ease',
            }}
          >
            {o.Icon && <o.Icon size={14} />}
            <span style={{ display: 'grid', justifyItems: 'center' }}>
              <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>
                {t(o.label)}
              </span>
              <span style={{ gridArea: '1 / 1' }}>{t(o.label)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Кнопка-таблетка строки: вид, избранное, назад. */
export function ToolButton({ children, on, onClick, accent, btnRef }: {
  children: React.ReactNode; on?: boolean; onClick: () => void; accent?: string
  /** Кнопку бывает нужно показать в онбординге — отсюда доступ к её узлу. */
  btnRef?: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      style={{
        // Как «Избранное» в банке: 10×14, кегль 12 — тогда таблетка встаёт вровень
        // с поиском и группой статусов, а не оказывается на два пикселя ниже.
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 999,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: on ? 700 : 500,
        border: `1px solid ${on ? (accent ?? 'var(--color-accent, #7c3aed)') : 'var(--color-border-medium)'}`,
        background: 'rgba(var(--glass-rgb), 0.88)', ...PILL_GLASS,
        color: on ? (accent ?? 'var(--color-accent, #7c3aed)') : 'var(--color-text-2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// Меню строки носят тот же скин, что дропдауны кабинета (lib/dropdownStyle):
// коробка-стекло, строка с подсветкой под курсором, выбранная — тинтом. Там,
// где предметного акцента нет (сортировка), берём общий фиолетовый.
/**
 * Стекло таблеток строки управления.
 *
 * Полупрозрачный фон один, без размытия, спасает не всегда: строка прилипшая,
 * под ней едет текст, и оставшиеся проценты прозрачности читались как чужие
 * буквы ПОВЕРХ кнопки. Размытие — то же, что у плавающих таблеток шапки
 * (blur 14 + saturate 180): содержимое под кнопкой превращается в фон, а не в
 * рябь, и таблетка остаётся стеклом, а не глухой плашкой.
 */
export const PILL_GLASS = {
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
} as const

/**
 * Цвет выбранной строки в меню, когда предмет не задан.
 *
 * Фиолетовый — «текущее / сейчас» бренда, а не цвет раздела. Он остаётся
 * запасным вариантом для экранов вне предмета; там, где предмет есть, меню
 * красится ЕГО палитрой: экран английского оранжевый целиком, и лиловая
 * галочка в сортировке читается как деталь из другого приложения.
 */
const MENU_ACCENT = 'var(--color-purple-text)'
const MENU_ACCENT_BG = 'var(--color-purple-soft)'

/** Сортировка — выпадающий список, портал поверх всего. */
export function SortMenu({ options, value, onChange, accent, soft }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  /** Цвет выбранной строки — акцент предмета. Без него фиолетовый бренда. */
  accent?: string
  /** Заливка выбранной строки — мягкий тон предмета. */
  soft?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value) ?? options[0]
  const tint = accent ?? MENU_ACCENT
  const tintBg = soft ?? MENU_ACCENT_BG

  // Фон на время выбора стоит: меню висит фиксированной коробкой у кнопки, и
  // уехавшая под ним страница отрывала бы список от своего триггера.
  useScrollLock(open, menu)

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (menu.current?.contains(e.target as Node)) return
      if (btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // Внутри списка крутить можно: своя прокрутка не закрывает меню. Фон в это
    // время стоит (useScrollLock), но событие может прийти и не от колеса.
    const scroll = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        onClick={() => {
          const r = btn.current?.getBoundingClientRect()
          if (r) setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 172) })
          setOpen(o => !o)
        }}
        style={{
          // Та же таблетка, что ToolButton и «Сортировка» банка: 10×14, кегль 12.
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 999,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
          border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.88)',
          ...PILL_GLASS, color: 'var(--color-text-2)', whiteSpace: 'nowrap',
        }}
      >
        {t(current?.label ?? '')}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}>
          <ChevronDown size={13} />
        </motion.span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menu}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
                transformOrigin: 'top left',
                ...dropdownSurface,
              }}
            >
              {options.map(o => {
                const on = o.value === value
                return (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false) }}
                    style={dropdownRow(on, { accent: tint, accentBg: tintBg })}
                    {...dropdownRowHover(on)}
                  >
                    <span style={{ flex: 1 }}>{t(o.label)}</span>
                    {on && <Check size={14} strokeWidth={2.5} style={{ color: tint }} />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/**
 * Фильтр строки — выпадающий список с МНОЖЕСТВЕННЫМ выбором.
 *
 * Отличается от SortMenu не только этим: у сортировки всегда выбран ровно один
 * пункт, поэтому её кнопка показывает его название. Здесь выбранных может быть
 * ноль или пять, и подставлять их в кнопку нельзя — на двух выбранных надпись
 * станет вдвое длиннее и таблетка начнёт прыгать по ширине при каждом клике.
 * Поэтому кнопка всегда показывает НАЗВАНИЕ фильтра, а число выбранных — точкой
 * со счётчиком справа.
 *
 * Меню не закрывается по выбору: фильтры почти всегда ставят пачкой, и закрытие
 * после первого пункта заставляет открывать список заново на каждый следующий.
 *
 * ОТСЮДА ЖЕ ТРЕБОВАНИЕ К onChange: он принимает ОБНОВЛЯЮЩУЮ ФУНКЦИЮ, а не
 * готовый массив. Раз пункты тыкают пачкой, два клика попадают в один рендер, и
 * обработчик, собирающий новый массив из пропса `value`, во втором клике видит
 * ещё старый — первый выбор молча теряется. С `prev => …` этого не бывает.
 */
export function FilterMenu({ label, options, value, onChange, accent, soft }: {
  label: string
  /** Значение и подпись; count — сколько под него попадает, показывается справа. */
  options: { value: string; label: string; count?: number }[]
  value: string[]
  /** Сеттер из useState: нужен именно он, см. про обновляющую функцию выше. */
  onChange: React.Dispatch<React.SetStateAction<string[]>>
  accent?: string
  /** Заливка выбранной строки — мягкий тон предмета (палитра курса). */
  soft?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const on = value.length > 0
  const tint = accent ?? 'var(--color-accent, #7c3aed)'

  useScrollLock(open, menu)

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (menu.current?.contains(e.target as Node)) return
      if (btn.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // Внутри списка крутить можно: своя прокрутка не закрывает меню. Фон в это
    // время стоит (useScrollLock), но событие может прийти и не от колеса.
    const scroll = (e: Event) => { if (!menu.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  const toggle = (v: string) =>
    onChange(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  return (
    <>
      <button
        ref={btn}
        onClick={() => {
          const r = btn.current?.getBoundingClientRect()
          if (r) {
            // Высота — от кнопки до низа окна, а не «60vh»: список тем длинный,
            // и упереться он должен в край окна, где бы кнопка ни стояла. Ноль
            // отсекаем: там, где окно ещё не измерено, лучше открыться на 420,
            // чем схлопнуться в полоску.
            const room = Math.round(window.innerHeight - r.bottom - 24)
            setPos({
              top: r.bottom + 6,
              left: r.left,
              width: Math.max(r.width, 200),
              maxH: room > 160 ? Math.min(room, 420) : 420,
            })
          }
          setOpen(o => !o)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 999,
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: on ? 700 : 500,
          border: `1px solid ${on ? tint : 'var(--color-border-medium)'}`,
          background: 'rgba(var(--glass-rgb), 0.88)', ...PILL_GLASS,
          color: on ? tint : 'var(--color-text-2)', whiteSpace: 'nowrap',
        }}
      >
        {t(label)}
        {on && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999,
            background: tint, color: '#fff', fontSize: 10, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {value.length}
          </span>
        )}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}>
          <ChevronDown size={13} />
        </motion.span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menu}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999,
                transformOrigin: 'top left',
                ...dropdownSurface,
              }}
            >
              {/* Список платформ короткий, список тем — нет. Прокрутка живёт
                  ВНУТРИ коробки (ScrollFade: фейды у краёв, накладной ползунок,
                  overscroll-contain), а фон в это время стоит — иначе меню тем
                  уезжает за нижний край окна. */}
              <ScrollFade maxHeight={on ? Math.max(140, pos.maxH - 46) : pos.maxH} bg={DROPDOWN_GLASS} overlayScrollbar>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {options.map(o => {
                const picked = value.includes(o.value)
                return (
                  <button
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    style={dropdownRow(picked, { accent: tint, accentBg: soft ?? MENU_ACCENT_BG })}
                    {...dropdownRowHover(picked)}
                  >
                    <span style={{ flex: 1 }}>{t(o.label)}</span>
                    {o.count !== undefined && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
                        {o.count}
                      </span>
                    )}
                    {picked && <Check size={14} strokeWidth={2.5} style={{ color: tint }} />}
                  </button>
                )
              })}
              </div>
              </ScrollFade>
              {on && (
                <button
                  onClick={() => { onChange([]); setOpen(false) }}
                  {...dropdownRowHover(false)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    marginTop: 4, padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                    border: 'none', borderTop: '1px solid var(--color-border-soft)',
                    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                    background: 'transparent', color: 'var(--color-text-3)',
                    transition: 'background 0.12s',
                  }}
                >
                  {t('Сбросить')}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/** Счётчик, прижатый вправо. */
export function ToolCount({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
      {children}
    </span>
  )
}

// ─── Единица содержимого ─────────────────────────────────────────────────────

/**
 * Карточка сетки — общая геометрия для текста, стопки, записи и задания.
 *
 * `stack` дорисовывает две подложки сзади: так плашка читается как пачка
 * карточек, а не как ещё одна кнопка перехода.
 */
export function Tile({ children, onClick, accent, stack, tint }: {
  children: React.ReactNode
  onClick?: () => void
  accent: string
  stack?: boolean
  /**
   * Плитка не из библиотеки, а СВОЯ — её содержимое собрал сам ученик.
   *
   * Отличается подложкой и рамкой в цвете предмета, а не размером или местом:
   * в сетке из сорока одинаковых карточек цвет — единственная метка, которую
   * видно, не читая. `surface` — заливка (палитра предмета, `soft`), `border` —
   * рамка в покое (`ring`); при наведении рамка становится акцентной, как у
   * всех остальных.
   */
  tint?: { surface: string; border: string }
}) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ position: 'relative', paddingTop: stack ? 8 : 0, paddingRight: stack ? 8 : 0 }}>
      {stack && [2, 1].map(k => (
        <div
          key={k}
          aria-hidden
          style={{
            position: 'absolute', inset: 0, left: k * 4, top: 8 - k * 4, right: 8 - k * 4, bottom: k * 4,
            borderRadius: 16,
            // Нижние листы стопки красятся вместе с верхним, иначе цветная
            // карточка выглядит наклейкой, положенной на чужую пачку.
            background: tint
              ? `linear-gradient(${tint.surface}, ${tint.surface}), var(--color-bg-2)`
              : 'var(--color-bg-2)',
            border: `1px solid ${tint ? tint.border : 'var(--color-border-soft)'}`,
            opacity: k === 1 ? 0.85 : 0.5, pointerEvents: 'none',
            transform: hover ? `translate(${k * 2}px, ${-k * 2}px)` : 'none', transition: 'transform .16s',
          }}
        />
      ))}
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative', width: '100%', height: '100%', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 7,
          padding: '13px 15px', borderRadius: 16, cursor: onClick ? 'pointer' : 'default',
          fontFamily: 'inherit',
          // Заливка слоем поверх обычной подложки, а не вместо неё: `soft`
          // палитры полупрозрачен, и без второго слоя сквозь плитку светился
          // бы фон страницы — в тёмной теме он темнее карточек.
          background: tint
            ? `linear-gradient(${tint.surface}, ${tint.surface}), var(--color-bg-2)`
            : 'var(--color-bg-2)',
          border: `1px solid ${hover && onClick ? accent : tint ? tint.border : 'var(--color-border)'}`,
          transition: 'border-color .16s',
        }}
      >
        {children}
      </button>
    </div>
  )
}

/** Сетка карточек. */
export function TileGrid({ min = 210, children }: { min?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14 }}>
      {children}
    </div>
  )
}

/** Полоска прогресса внутри карточки. */
export function TileMeter({ value }: { value: number }) {
  return (
    <span style={{ display: 'block', height: 3, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
      <span style={{
        display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, value))}%`,
        borderRadius: 999, background: 'var(--color-green-accent)',
      }} />
    </span>
  )
}

/** Плашка-подпись в углу карточки: уровень, тип, длительность. */
export function TileChip({ children, tone, accent, soft }: {
  children: React.ReactNode
  /**
   * `accent` — цветной текст на мягкой подложке (ступень, уровень).
   * `solid` — заливка акцентом и белый текст: метка, которая должна читаться
   * первой в сетке однотипных плиток, а не встать четвёртой такой же.
   */
  tone?: 'accent' | 'mute' | 'solid'
  accent?: string
  soft?: string
}) {
  const isAccent = tone === 'accent'
  const solid = tone === 'solid'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap',
      background: solid ? (accent ?? 'var(--color-bg-3)') : isAccent ? (soft ?? 'var(--color-bg-3)') : 'var(--color-bg-3)',
      color: solid ? '#fff' : isAccent ? (accent ?? 'var(--color-text-2)') : 'var(--color-muted)',
    }}>
      {children}
    </span>
  )
}

/**
 * Пустая выборка.
 *
 * Строку держим короче коробки: плашка растягивается на всю ширину содержимого
 * (в тренажёре это под тысячу пикселей), и фраза в одну-две строки рвалась в
 * случайных местах. `\n` в тексте = отдельный абзац.
 */
export function Empty({ text }: { text: string }) {
  const t = useT()
  return (
    <div style={{
      padding: '34px 22px', borderRadius: 18, textAlign: 'center',
      border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
    }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        {t(text).split('\n').map((line, i) => (
          <div key={i} style={{
            fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)',
            marginTop: i ? 6 : 0, ...balancedWrap,
          }}>{bindShortWords(line)}</div>
        ))}
      </div>
    </div>
  )
}
