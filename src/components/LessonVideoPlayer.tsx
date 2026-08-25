// ─────────────────────────────────────────────────────────────────────────────
// Плеер записи урока — свой корпус поверх чужого движка
//
// ЗАЧЕМ. Раньше сюда просто вставлялся iframe, и ученик получал красную полосу
// YouTube с его кнопками, подсказками и «смотреть на YouTube» в углу. Внутри
// урока это чужой интерфейс: другие иконки, другие цвета, свои ссылки наружу.
//
// КАК УСТРОЕНО. Движок остаётся чужим (iframe), но управление у нас:
//   • YouTube — IFrame Player API (controls=0), команды через объект плеера;
//   • RuTube  — postMessage API того же вида, что уже был на странице урока;
//   • свой файл — обычный <video> без controls;
//   • чужая ссылка (teachstream и прочее) — оставляем как есть: у неё нет API,
//     рисовать поверх кнопки, которые ничего не нажимают, — обман.
// Поверх iframe лежит наш слой, а сам iframe получает pointer-events: none.
// Это ключевая деталь: чужой плеер не видит ни клика, ни наведения, поэтому его
// собственный интерфейс не всплывает — включая финальную сетку «похожих видео».
//
// ПРОГРЕСС. Каждые 250 мс спрашиваем время и копим отсмотренные отрезки
// (lib/videoProgress.ts). Перемотка отрезок разрывает, так что «перетащил в
// конец» просмотром не считается.
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX,
  Maximize, Minimize, Subtitles, Gauge, Check, Repeat,
  ChevronLeft, ChevronRight, Lock, LockOpen,
} from 'lucide-react'
import type { VideoSource } from '../lib/videoSource'
import { videoEmbedSrc } from '../lib/videoSource'
import { activeTimecodeIndex, type LessonTimecode } from '../data/lessonContent'
import { useT } from '../lib/i18n'
import {
  addWatched, formatClock, hasResumePoint, MAX_STEP, watchedSeconds, watchRatio,
  withCompletion, type VideoWatch,
} from '../lib/videoProgress'

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2]
/** Верхние ступени показываем только там, где движок правда так играет: свой
 *  <video> тянет до 4×, а YouTube выше 2× молча остаётся на 2× — предлагать
 *  ему 3× значит врать про скорость. */
const FAST_RATES = [3, 4]
/** Через столько без движения мыши панель управления уезжает. */
const IDLE_MS = 2600
/** Опрос времени. rAF в превью не работает (см. AudioPlayer) — только таймер. */
const TICK_MS = 250
/** Как часто прогресс уходит наружу (и в базу). */
const PERSIST_MS = 10000

// ── Жесты по кадру ──────────────────────────────────────────────────────────
// Кадр делится на три вертикальные полосы: в центре удержание берёт время
// (скраб), по краям — гонит вперёд и отматывает назад. Разводить их длиной
// удержания нельзя — «зажал справа» и «зажал две секунды» это одно и то же
// нажатие, и жест решался бы уже после того, как ученик начал вести.
const HOLD_SCRUB_MS = 2000
const HOLD_BOOST_MS = 400
/** Сколько секунд укладывается в ширину кадра: обычный шаг и точный. */
const SCRUB_SPAN = 90
const SCRUB_SPAN_FINE = 15
/** Увод вверх, после которого скраб становится точным. */
const FINE_DY = 60
/** Шаг ступени ускорения (2× → 3× → …) и увод вверх до защёлки. */
const BOOST_STEP_PX = 55
const LOCK_DY = 45
const MAX_BOOST = 5
/** Выше этого чужие движки скорость не принимают: YouTube молча игнорирует 3×
 *  и продолжает играть на 2× — плашка врала бы про ступень. */
const ENGINE_MAX_RATE = 2
/** А свой <video> (прямые ссылки — Диск, наш бакет) тянет и быстрее: держим
 *  до 4×, дальше Chrome сам глушит звук и смысл «слышного» ускорения пропадает.
 *  Safari глушит уже выше 2× — там 3–4× останется быстрой немой картинкой. */
const FILE_MAX_RATE = 4
/** Такт скольжения по ролику. Назад движки не играют, а вперёд выше потолка
 *  своей ступени не умеют — оба случая берём шагами перемотки. */
const SKIM_TICK_MS = 120
/** Пауза перед одиночным тапом: ждём, не станет ли он двойным. */
const TAP_MS = 220
const DOUBLE_TAP_MS = 320
/** Столько пикселей нажатию прощается, прежде чем оно перестанет быть тапом. */
const TAP_SLOP = 12

/**
 * Размер коробки плеера.
 *
 * ЗАЧЕМ НЕ ПРОСТО ВЫСОТА. Раньше стояло `height: 54vh` при `width: 100%`, и на
 * широком мониторе коробка выходила почти 3:1. Ролик 16:9 вписывался в неё по
 * высоте, оставляя по трети экрана чёрного поля слева и справа: видео
 * получалось маленьким посреди пустой полосы. Поэтому коробка сама держит 16:9,
 * а от разрастания её удерживает не высота, а ширина — при MAX_VH высоты это
 * ровно MAX_VH·16/9. Так соотношение остаётся честным на любом экране, и полей
 * не появляется вовсе.
 */
const MAX_VH = 68
/** Предельная ширина колонки с видео — та, при которой 16:9 даёт MAX_VH высоты. */
export const PLAYER_MAX_W = `calc(${MAX_VH}vh * 16 / 9)`
/** Предельная высота плеера — по ней равняется и панель таймкодов рядом. */
export const PLAYER_MAX_H = `${MAX_VH}vh`

/**
 * Тач-экран. По нему прячем ползунок громкости: пальцем его не поймать, а
 * громкость на телефоне и так железная — кнопками сбоку. Проверяем именно
 * pointer, а не ширину: узкое окно на десктопе остаётся с мышью, и ползунок
 * там нужен.
 */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return coarse
}

export interface LessonVideoHandle {
  /** Открыть плеер на этой секунде (или перемотать, если он уже играет). */
  playFrom(seconds: number): void
}

interface Props {
  source: VideoSource
  /** Заголовок урока — уходит в title iframe и в подпись полноэкранного режима. */
  title: string
  /** Подпись на заставке: «🧪 Химия». Пустая — плашки нет. */
  badge?: string
  /** Длительность из карточки урока — показывается на заставке до запуска. */
  durationLabel?: string
  timecodes?: LessonTimecode[]
  /**
   * Сохранённый прогресс: отсюда берутся «продолжить» и закраска отсмотренного.
   * Дальше прогресс живёт ВНУТРИ плеера и меняется четыре раза в секунду —
   * поднимать такое в родителя нельзя, иначе вместе с секундой перерисовывался
   * бы весь урок: конспект, домашка, реакции.
   */
  initialWatch: VideoWatch
  /** Прогресс пора сохранить — раз в PERSIST_MS, на паузе и при уходе. */
  onPersist(next: VideoWatch): void
  /**
   * Текущая секунда и длина ролика — по ним родитель подсвечивает активный
   * таймкод. Зовётся раз в секунду, а не каждый тик: наверху от этого
   * перерисовывается вся страница урока.
   */
  onTime?(seconds: number, duration: number): void
  /**
   * Живой прогресс просмотра — для полосы «сколько отсмотрено», которая должна
   * ехать вместе с роликом, а не ждать очередного onPersist (раз в десять
   * секунд). Зовётся раз в секунду, тем же тактом, что и onTime.
   *
   * ВАЖНО: то, что приехало сюда, НЕЛЬЗЯ возвращать обратно в initialWatch —
   * плеер понимает новый объект как «прогресс приехал из базы» и сбрасывает
   * свой. Этим колбэком только рисуют; сохраняет по-прежнему onPersist.
   */
  onWatchTick?(w: VideoWatch): void
}

// ── Загрузчик YouTube IFrame API (один на страницу) ─────────────────────────
type YTPlayer = {
  playVideo(): void; pauseVideo(): void; seekTo(s: number, allow: boolean): void
  setVolume(v: number): void; mute(): void; unMute(): void
  setPlaybackRate(r: number): void; getCurrentTime(): number; getDuration(): number
  getVideoLoadedFraction(): number; destroy(): void
  // Субтитрами управляем ТОЛЬКО через setOption/getOption. loadModule
  // ('captions') перезагружает модуль вместе с видео: проверено — ролик
  // отматывался на нуль и начинался заново.
  setOption(module: string, option: string, value: unknown): void
  getOption(module: string, option: string): unknown
}
/** Дорожка субтитров в ответе getOption('captions','tracklist'). */
type CaptionTrack = { languageCode?: string; vss_id?: string }
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer; PlayerState: Record<string, number> }
    onYouTubeIframeAPIReady?: () => void
  }
}
let ytApi: Promise<NonNullable<Window['YT']>> | null = null
function loadYouTubeApi(): Promise<NonNullable<Window['YT']>> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!ytApi) {
    ytApi = new Promise(resolve => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return ytApi
}

const LessonVideoPlayerInner = forwardRef<LessonVideoHandle, Props>(function LessonVideoPlayer(
  { source, title, badge, durationLabel, timecodes = [], initialWatch, onPersist, onTime, onWatchTick }, ref,
) {
  const t = useT()
  const touch = useCoarsePointer()

  // Своих кнопок у чужой страницы быть не может — там нет API, чтобы они
  // работали. Такой источник показываем как раньше, голым iframe.
  const custom = source.kind !== 'iframe'
  const canRate = source.kind !== 'rutube'   // у RuTube скорость не выставляется извне
  /** До какой ступени ускорение играет движком (со звуком), а не скольжением. */
  const engineMaxRate = source.kind === 'file' ? FILE_MAX_RATE : ENGINE_MAX_RATE
  const canCaptions = source.kind === 'youtube'   // и только если дорожки нашлись, см. ccAvailable
  /** Меню скорости не предлагает того, чего движок не сыграет: чужому плееру —
   *  до 2×, своему <video> — вся лестница до 4×. */
  const rates = engineMaxRate > 2 ? [...RATES, ...FAST_RATES] : RATES

  const [watch, setWatch] = useState<VideoWatch>(initialWatch)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(initialWatch.duration || 0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [captions, setCaptions] = useState(false)
  /** У ролика нашлась хотя бы одна дорожка субтитров — только тогда есть CC. */
  const [ccAvailable, setCcAvailable] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [barVisible, setBarVisible] = useState(true)
  const [rateOpen, setRateOpen] = useState(false)
  /** Координаты меню скорости: оно живёт в портале, см. placeRateMenu. */
  const [ratePos, setRatePos] = useState<{ left: number; top: number } | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [hoverAt, setHoverAt] = useState<number | null>(null)
  const [posterFallback, setPosterFallback] = useState(false)
  /** Секунда, с которой плеер стартует. Задаётся до монтирования движка. */
  const [startAt, setStartAt] = useState(0)

  /** Жест, который сейчас держит кадр. */
  const [gesture, setGesture] = useState<'scrub' | 'ff' | 'rw' | null>(null)
  /** Ступень ускорения 2…5 и её защёлка. */
  const [boost, setBoost] = useState(2)
  const [boostLocked, setBoostLocked] = useState(false)
  /** 0…1 — насколько закрылся замок, пока ведут вверх. */
  const [lockFill, setLockFill] = useState(0)
  /** Секунда, с которой начали скраб, — от неё считается «+1:20». */
  const [scrubFrom, setScrubFrom] = useState(0)
  /** Отклик двойного тапа: ±10 секунд с той стороны, где тапнули. */
  const [skipFlash, setSkipFlash] = useState<{ side: 'left' | 'right'; n: number } | null>(null)

  const boxRef = useRef<HTMLDivElement>(null)
  const rateBtnRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const ytHostRef = useRef<HTMLDivElement>(null)
  const ytRef = useRef<YTPlayer | null>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const idleTimer = useRef<number | null>(null)
  /** Время RuTube приходит событиями — держим последнее значение здесь. */
  const ruTime = useRef(0)
  const ruPlaying = useRef(false)
  /** Предыдущий тик: по разнице решаем, просмотр это или перемотка. */
  const lastTick = useRef<number | null>(null)
  /** Начало непрерывно отсматриваемого куска — от него растёт текущий отрезок. */
  const segStart = useRef<number | null>(null)
  /** Последняя секунда, отданная наружу. */
  const lastReported = useRef(-1)
  /** Дорожка субтитров, которую включает кнопка CC (первая доступная). */
  const ccTrack = useRef<CaptionTrack | null>(null)
  /** Актуальный прогресс без ре-подписок таймера. */
  const watchRef = useRef(watch)
  watchRef.current = watch
  const onPersistRef = useRef(onPersist)
  onPersistRef.current = onPersist
  const onTimeRef = useRef(onTime)
  onTimeRef.current = onTime
  const onWatchTickRef = useRef(onWatchTick)
  onWatchTickRef.current = onWatchTick
  /** Подпись последнего сохранённого состояния — чтобы не писать одно и то же. */
  const savedSig = useRef('')
  /** Что мы сами только что отдали наверх: оно вернётся пропом, и принимать его
   *  обратно нельзя — за время круга плеер уже уехал на пару тиков вперёд. */
  const lastEmitted = useRef<VideoWatch | null>(null)

  // Обработчики жеста живут в window-подписках и переживают ре-рендеры, поэтому
  // всё изменчивое читают из ссылок, а не из замыкания.
  const currentRef = useRef(0); currentRef.current = current
  const durationRef = useRef(0); durationRef.current = duration
  const rateRef = useRef(1); rateRef.current = rate
  const pausedRef = useRef(false); pausedRef.current = paused
  const gestureRef = useRef<'scrub' | 'ff' | 'rw' | null>(null)
  const boostRef = useRef(2)
  const lockedRef = useRef(false)
  /** Секунда, которую сейчас «держит» скраб. */
  const scrubRef = useRef(0)
  const holdTimer = useRef<number | null>(null)
  const tapTimer = useRef<number | null>(null)
  const skimTimer = useRef<number | null>(null)
  const lastTap = useRef<{ at: number; zone: 'left' | 'center' | 'right' } | null>(null)
  const flashN = useRef(0)

  // Прогресс подъехал из базы (или сменился урок) — принимаем как есть.
  useEffect(() => {
    if (initialWatch === lastEmitted.current) return
    setWatch(initialWatch)
    setDuration(d => d || initialWatch.duration || 0)
    savedSig.current = ''
  }, [initialWatch])

  const persist = useCallback(() => {
    const w = watchRef.current
    const sig = `${Math.round(w.position)}|${Math.round(watchedSeconds(w.ranges))}|${w.completed}`
    if (sig === savedSig.current) return
    savedSig.current = sig
    lastEmitted.current = w
    onPersistRef.current(w)
  }, [])

  // Сохраняем по таймеру, на паузе и при уходе со страницы. Вкладку закрывают
  // чаще, чем доводят ролик до конца, — без pagehide терялись бы последние
  // минуты просмотра.
  useEffect(() => {
    if (!started) return
    const id = window.setInterval(persist, PERSIST_MS)
    const onHide = () => { if (document.visibilityState === 'hidden') persist() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', persist)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', persist)
      persist()
    }
  }, [started, persist])

  useEffect(() => { if (paused) persist() }, [paused, persist])

  // ── Команды движку ────────────────────────────────────────────────────────
  const ruSend = useCallback((type: string, data: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type, data }), '*')
  }, [])

  const doPlay = useCallback(() => {
    if (source.kind === 'youtube') ytRef.current?.playVideo()
    else if (source.kind === 'rutube') ruSend('player:play')
    else videoRef.current?.play()
    setPaused(false); setEnded(false)
  }, [source.kind, ruSend])

  const doPause = useCallback(() => {
    if (source.kind === 'youtube') ytRef.current?.pauseVideo()
    else if (source.kind === 'rutube') ruSend('player:pause')
    else videoRef.current?.pause()
    setPaused(true)
  }, [source.kind, ruSend])

  const doSeek = useCallback((sec: number) => {
    const s = Math.max(0, duration ? Math.min(sec, duration - 0.3) : sec)
    // Разрываем накопление: перемотанный кусок отсмотренным не считается.
    lastTick.current = null
    segStart.current = null
    setCurrent(s)
    setWatch(w => ({ ...w, position: s }))
    if (source.kind === 'youtube') ytRef.current?.seekTo(s, true)
    else if (source.kind === 'rutube') { ruTime.current = s; ruSend('player:setCurrentTime', { time: s }) }
    else if (videoRef.current) videoRef.current.currentTime = s
  }, [source.kind, duration, ruSend])

  const applyVolume = useCallback((v: number, m: boolean) => {
    if (source.kind === 'youtube') {
      ytRef.current?.setVolume(Math.round(v * 100))
      if (m || v === 0) ytRef.current?.mute(); else ytRef.current?.unMute()
    } else if (source.kind === 'rutube') {
      ruSend('player:setVolume', { volume: m ? 0 : v })
      ruSend(m || v === 0 ? 'player:mute' : 'player:unMute')
    } else if (videoRef.current) {
      videoRef.current.volume = v
      videoRef.current.muted = m || v === 0
    }
  }, [source.kind, ruSend])

  const applyRate = useCallback((r: number) => {
    setRate(r); setRateOpen(false)
    if (source.kind === 'youtube') ytRef.current?.setPlaybackRate(r)
    else if (videoRef.current) {
      // На верхних ступенях (3×, 4×) без этого голос уезжает в писк — тот же
      // приём, что и у ускорения жестом.
      videoRef.current.preservesPitch = true
      videoRef.current.playbackRate = r
    }
  }, [source.kind])

  // Модуль субтитров грузится вместе с плеером (cc_load_policy), а кнопка лишь
  // показывает и прячет дорожку — так переключение не трогает воспроизведение.
  const toggleCaptions = useCallback(() => {
    const p = ytRef.current
    if (!p) return
    const next = !captions
    setCaptions(next)
    try {
      p.setOption('captions', 'track', next ? (ccTrack.current ?? {}) : {})
    } catch { /* у ролика может не быть субтитров вовсе */ }
  }, [captions])

  const playFrom = useCallback((sec: number) => {
    if (!started) { setStartAt(sec); setStarted(true); return }
    doSeek(sec)
    doPlay()
  }, [started, doSeek, doPlay])

  useImperativeHandle(ref, () => ({ playFrom }), [playFrom])

  // ── YouTube: поднимаем плеер, когда ученик нажал «смотреть» ───────────────
  useEffect(() => {
    if (!started || source.kind !== 'youtube') return
    let alive = true
    let player: YTPlayer | null = null

    loadYouTubeApi().then(YT => {
      if (!alive || !ytHostRef.current) return
      player = new YT.Player(ytHostRef.current, {
        videoId: source.id,
        playerVars: {
          controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0,
          iv_load_policy: 3, playsinline: 1, autoplay: 1,
          // Модуль субтитров поднимается сразу вместе с роликом — включать его
          // позже нельзя, loadModule перезапускает видео с нуля. Саму дорожку
          // гасим на onReady, кнопка CC потом только показывает и прячет её.
          cc_load_policy: 1,
          start: Math.floor(startAt), origin: window.location.origin,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (!alive) return
            ytRef.current = e.target
            setDuration(e.target.getDuration() || 0)
            e.target.setPlaybackRate(rate)
            e.target.playVideo()
            // Гасим дорожку, поднятую через cc_load_policy, и запоминаем, какая
            // вообще есть. Список появляется не сразу — отсюда пара попыток;
            // если дорожек нет, кнопка CC не показывается вовсе.
            try { e.target.setOption('captions', 'track', {}) } catch { /* нет модуля */ }
            let tries = 0
            const probe = window.setInterval(() => {
              tries += 1
              let list: CaptionTrack[] = []
              try { list = (e.target.getOption('captions', 'tracklist') as CaptionTrack[]) ?? [] } catch { /* ещё не готов */ }
              if (list.length) {
                ccTrack.current = list[0]
                setCcAvailable(true)
                window.clearInterval(probe)
              } else if (tries >= 8 || !alive) {
                window.clearInterval(probe)
              }
            }, 500)
          },
          onStateChange: (e: { data: number }) => {
            if (!alive) return
            const S = window.YT?.PlayerState
            if (!S) return
            if (e.data === S.PLAYING) { setPaused(false); setEnded(false); setDuration(d => d || ytRef.current?.getDuration() || 0) }
            if (e.data === S.PAUSED) setPaused(true)
            if (e.data === S.ENDED) { setPaused(true); setEnded(true) }
          },
        },
      })
    })

    return () => {
      alive = false
      try { player?.destroy() } catch { /* плеер мог не успеть подняться */ }
      ytRef.current = null
    }
    // startAt меняется только до запуска, rate применяется отдельной командой —
    // пересоздавать плеер на них нельзя, иначе ролик перезапустится с нуля.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, source.kind, source.kind === 'youtube' ? source.id : ''])

  // ── RuTube: события приходят postMessage'ем ───────────────────────────────
  useEffect(() => {
    if (!started || source.kind !== 'rutube') return
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return
      let msg: { type?: string; data?: { time?: number; duration?: number; state?: string } }
      try { msg = JSON.parse(e.data) } catch { return }
      switch (msg.type) {
        case 'player:ready':
          ruSend('player:play')
          if (startAt > 0) ruSend('player:setCurrentTime', { time: startAt })
          break
        case 'player:currentTime':
          if (typeof msg.data?.time === 'number') ruTime.current = msg.data.time
          break
        case 'player:durationChange':
          if (typeof msg.data?.duration === 'number') setDuration(msg.data.duration)
          break
        case 'player:changeState': {
          const st = msg.data?.state
          ruPlaying.current = st === 'playing'
          if (st === 'playing') { setPaused(false); setEnded(false) }
          if (st === 'paused' || st === 'stopped') setPaused(true)
          if (st === 'ended') { setPaused(true); setEnded(true) }
          break
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [started, source.kind, startAt, ruSend])

  // ── Тик: время, буфер и накопление отсмотренного ──────────────────────────
  useEffect(() => {
    if (!started || !custom) return
    const id = window.setInterval(() => {
      let time = 0
      let dur = 0
      let playing = false
      if (source.kind === 'youtube' && ytRef.current) {
        time = ytRef.current.getCurrentTime() || 0
        dur = ytRef.current.getDuration() || 0
        playing = !paused
        setBuffered(ytRef.current.getVideoLoadedFraction() || 0)
      } else if (source.kind === 'rutube') {
        time = ruTime.current
        playing = ruPlaying.current
      } else if (videoRef.current) {
        const v = videoRef.current
        time = v.currentTime
        dur = v.duration || 0
        playing = !v.paused && !v.ended
        setBuffered(v.buffered.length ? v.buffered.end(v.buffered.length - 1) / (v.duration || 1) : 0)
      }

      const known = dur || duration
      if (dur && Math.abs(dur - duration) > 0.5) setDuration(dur)
      if (!scrubbing) {
        setCurrent(time)
        // Наружу — только на смене целой секунды: там от каждого вызова
        // перерисовывается конспект с домашкой.
        if (Math.floor(time) !== Math.floor(lastReported.current)) {
          lastReported.current = time
          onTimeRef.current?.(time, known)
          // Отрезки уже посчитаны предыдущим тиком и лежат в watchRef —
          // отдаём их как есть, отставание в четверть секунды не видно.
          onWatchTickRef.current?.(watchRef.current)
        }
      }

      // Копим не разницу двух тиков, а отрезок от начала непрерывного куска до
      // текущей секунды. Шаг тика (0.25 с) короче MIN_SEGMENT, и по-тиковые
      // кусочки отбрасывались бы все до единого — просмотр не набирался вовсе.
      // Отрезки склеиваются при добавлении, так что растёт один и тот же.
      const prev = lastTick.current
      lastTick.current = playing ? time : null
      if (!playing) { segStart.current = null; return }
      const step = prev === null ? Infinity : time - prev
      // Пауза, начало куска или перемотка — начинаем отрезок заново, пропуск
      // между ними отсмотренным не считается.
      if (step <= 0 || step > MAX_STEP) { segStart.current = time; return }
      const from = segStart.current ?? prev!

      setWatch(base => withCompletion({
        ...base,
        ranges: addWatched(base.ranges, from, time),
        position: time,
        duration: dur || base.duration || duration,
      }))
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [started, custom, source.kind, paused, scrubbing, duration])

  // ── Меню скорости ─────────────────────────────────────────────────────────
  // Корпус плеера режет всё лишнее (overflow: hidden), а на телефоне он ниже
  // самого меню — раскрытый список обрезался сверху. Поэтому меню рисуется в
  // портале с position: fixed, а координаты считаем от кнопки: над ней, если
  // сверху есть место, иначе под ней; по горизонтали — не вылезая за экран.
  const RATE_MENU_W = 112
  const placeRateMenu = useCallback(() => {
    const btn = rateBtnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const h = rates.length * 31 + 12
    const gap = 8
    const top = r.top - gap - h >= 8 ? r.top - gap - h : Math.min(r.bottom + gap, window.innerHeight - h - 8)
    const left = Math.max(8, Math.min(r.right - RATE_MENU_W, window.innerWidth - RATE_MENU_W - 8))
    setRatePos({ left, top: Math.max(8, top) })
  }, [rates.length])

  useEffect(() => {
    if (!rateOpen) return
    placeRateMenu()
    const onScroll = () => placeRateMenu()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    // Закрытие — по нажатию мимо меню. На тач-экране pointerleave срабатывает
    // раньше click по пункту, поэтому закрывать по уходу указателя нельзя.
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node | null
      if (rateBtnRef.current?.contains(el as Node)) return
      if (el && (el as HTMLElement).closest?.('[data-rate-menu]')) return
      setRateOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [rateOpen, fullscreen, placeRateMenu])

  // ── Автоскрытие панели ────────────────────────────────────────────────────
  const wake = useCallback(() => {
    setBarVisible(true)
    if (idleTimer.current) window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => {
      // Пока мышь в меню скорости или на ползунке — панель не прячем.
      if (!scrubbing && !rateOpen) setBarVisible(false)
    }, IDLE_MS)
  }, [scrubbing, rateOpen])

  useEffect(() => {
    if (paused || !started) { setBarVisible(true); return }
    wake()
    return () => { if (idleTimer.current) window.clearTimeout(idleTimer.current) }
  }, [paused, started, wake])

  // ── Полный экран ──────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = boxRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }, [])
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === boxRef.current)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // ── Клавиши (когда фокус на плеере) ───────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!started || !custom) return
    const step = e.shiftKey ? 30 : 10
    switch (e.key) {
      case ' ': case 'k': case 'K': e.preventDefault(); paused ? doPlay() : doPause(); break
      case 'ArrowLeft': e.preventDefault(); doSeek(current - step); break
      case 'ArrowRight': e.preventDefault(); doSeek(current + step); break
      case 'ArrowUp': e.preventDefault(); { const v = Math.min(1, volume + 0.1); setVolume(v); setMuted(false); applyVolume(v, false) } break
      case 'ArrowDown': e.preventDefault(); { const v = Math.max(0, volume - 0.1); setVolume(v); applyVolume(v, muted) } break
      case 'm': case 'M': { const m = !muted; setMuted(m); applyVolume(volume, m) } break
      case 'f': case 'F': toggleFullscreen(); break
      default: return
    }
    wake()
  }

  // ── Перемотка по дорожке ──────────────────────────────────────────────────
  const seekAtClientX = useCallback((clientX: number) => {
    const rail = railRef.current
    if (!rail || !duration) return 0
    const box = rail.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    return ratio * duration
  }, [duration])

  const startScrub = (e: React.PointerEvent) => {
    if (!duration) return
    setScrubbing(true)
    setCurrent(seekAtClientX(e.clientX))
    const move = (ev: PointerEvent) => setCurrent(seekAtClientX(ev.clientX))
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setScrubbing(false)
      doSeek(seekAtClientX(ev.clientX))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ── Жесты по кадру ────────────────────────────────────────────────────────
  const zoneAt = useCallback((clientX: number): 'left' | 'center' | 'right' => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return 'center'
    const r = (clientX - box.left) / box.width
    return r < 1 / 3 ? 'left' : r > 2 / 3 ? 'right' : 'center'
  }, [])

  const stopSkim = useCallback(() => {
    if (skimTimer.current) { window.clearInterval(skimTimer.current); skimTimer.current = null }
  }, [])

  /** Скольжение шагами перемотки — там, где движок сам так быстро не играет. */
  const startSkim = useCallback((dir: 1 | -1, mult: number) => {
    stopSkim()
    doPause()
    skimTimer.current = window.setInterval(() => {
      doSeek(currentRef.current + dir * mult * (SKIM_TICK_MS / 1000))
    }, SKIM_TICK_MS)
  }, [doPause, doSeek, stopSkim])

  /** Пока ступень в пределах потолка движка — её играет сам плеер, и голос
   *  слышно. Всё, что выше, и любая отмотка назад идут скольжением: звука там
   *  всё равно нет. Потолок разный: у YouTube 2×, у своего <video> — 4×. */
  const applyBoost = useCallback((dir: 1 | -1, mult: number) => {
    boostRef.current = mult
    setBoost(mult)
    if (dir === 1 && canRate && mult <= engineMaxRate) {
      stopSkim()
      if (source.kind === 'youtube') ytRef.current?.setPlaybackRate(mult)
      else if (videoRef.current) {
        // Без этого на быстрой скорости голос уезжает в писк.
        videoRef.current.preservesPitch = true
        videoRef.current.playbackRate = mult
      }
      doPlay()
    } else {
      startSkim(dir, mult)
    }
  }, [canRate, engineMaxRate, source.kind, doPlay, startSkim, stopSkim])

  const endBoost = useCallback(() => {
    stopSkim()
    boostRef.current = 2
    lockedRef.current = false
    gestureRef.current = null
    setGesture(null); setBoost(2); setBoostLocked(false); setLockFill(0)
    if (source.kind === 'youtube') ytRef.current?.setPlaybackRate(rateRef.current)
    else if (videoRef.current) videoRef.current.playbackRate = rateRef.current
    doPlay()
    wake()
  }, [source.kind, doPlay, stopSkim, wake])

  const onFrameTap = useCallback((zone: 'left' | 'center' | 'right') => {
    const now = Date.now()
    const prev = lastTap.current
    if (prev && prev.zone === zone && now - prev.at < DOUBLE_TAP_MS) {
      // Второй тап отменяет отложенную паузу: одиночный клик ждал именно этого.
      if (tapTimer.current) { window.clearTimeout(tapTimer.current); tapTimer.current = null }
      lastTap.current = null
      wake()
      if (zone === 'center') { toggleFullscreen(); return }
      doSeek(currentRef.current + (zone === 'right' ? 10 : -10))
      const n = flashN.current += 1
      setSkipFlash({ side: zone, n })
      window.setTimeout(() => setSkipFlash(f => (f && f.n === n ? null : f)), 520)
      return
    }
    lastTap.current = { at: now, zone }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null
      // Пауза уже сработала — следующий тап начинает счёт заново, иначе он
      // догонял бы этот и стрелял ещё и перемоткой.
      lastTap.current = null
      if (pausedRef.current) doPlay(); else doPause()
    }, TAP_MS)
  }, [doPlay, doPause, doSeek, toggleFullscreen, wake])

  const onFrameDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    // Зафиксированное ускорение снимается любым касанием кадра.
    if (lockedRef.current) { endBoost(); return }
    const zone = zoneAt(e.clientX)
    const x0 = e.clientX
    const y0 = e.clientY
    let lastX = x0
    let moved = false

    const enterScrub = () => {
      holdTimer.current = null
      gestureRef.current = 'scrub'
      scrubRef.current = currentRef.current
      setGesture('scrub'); setScrubFrom(currentRef.current); setScrubbing(true); wake()
    }
    const enterBoost = () => {
      holdTimer.current = null
      const g = zone === 'right' ? 'ff' : 'rw'
      gestureRef.current = g
      setGesture(g); wake()
      applyBoost(g === 'ff' ? 1 : -1, 2)
    }
    holdTimer.current = window.setTimeout(
      zone === 'center' ? enterScrub : enterBoost,
      zone === 'center' ? HOLD_SCRUB_MS : HOLD_BOOST_MS,
    )

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      const g = gestureRef.current
      if (!g) {
        // Уехал раньше, чем удержание сработало, — это уже не тап и не жест.
        if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) {
          moved = true
          if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null }
        }
        lastX = ev.clientX
        return
      }
      const w = boxRef.current?.getBoundingClientRect().width || 1
      if (g === 'scrub') {
        // Считаем приращением, а не расстоянием от точки нажатия: иначе переход
        // на точный шаг посреди жеста дёргал бы время скачком.
        const span = dy < -FINE_DY ? SCRUB_SPAN_FINE : SCRUB_SPAN
        const next = scrubRef.current + ((ev.clientX - lastX) / w) * span
        scrubRef.current = Math.max(0, Math.min(durationRef.current || next, next))
        setCurrent(scrubRef.current)
      } else {
        const along = g === 'ff' ? dx : -dx
        // Вперёд лестница упирается в потолок движка: у YouTube это 2×, и выше
        // ступени просто нет — немая перемотка вместо голоса там не нужна.
        // Назад звука нет в любом случае, так что отмотка идёт до конца лестницы.
        const top = g === 'ff' && canRate ? engineMaxRate : MAX_BOOST
        const mult = Math.min(top, 2 + Math.max(0, Math.floor(along / BOOST_STEP_PX)))
        if (mult !== boostRef.current) applyBoost(g === 'ff' ? 1 : -1, mult)
        const fill = Math.max(0, Math.min(1, -dy / LOCK_DY))
        setLockFill(fill)
        if (fill >= 1 && !lockedRef.current) { lockedRef.current = true; setBoostLocked(true) }
      }
      lastX = ev.clientX
    }

    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null }
      const g = gestureRef.current
      if (g === 'scrub') {
        gestureRef.current = null
        setGesture(null); setScrubbing(false)
        doSeek(scrubRef.current)
        return
      }
      // Защёлка держит ускорение и без пальца — жест не заканчиваем.
      if (g) { if (!lockedRef.current) endBoost(); return }
      if (!moved) onFrameTap(zoneAt(ev.clientX))
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [zoneAt, wake, applyBoost, endBoost, doSeek, onFrameTap, canRate, engineMaxRate])

  useEffect(() => () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    if (tapTimer.current) window.clearTimeout(tapTimer.current)
    if (skimTimer.current) window.clearInterval(skimTimer.current)
  }, [])

  // Та же функция, что подсвечивает строку в панели «Таймкоды» справа: подпись
  // главы на шкале и подсветка в списке обязаны переключаться одновременно.
  const activeChapter = activeTimecodeIndex(timecodes, current)

  // Пока ускорение играет движком (а с защёлкой оно живёт и без пальца), внизу
  // должна стоять реальная скорость, а не та, что выбрана в меню.
  const liveRate = gesture === 'ff' && canRate && boost <= engineMaxRate ? boost : rate

  /** Стрелка в плашке ускорения и её прозрачное поле по бокам. Ink глифа идёт
   *  с 8-й по 16-ю единицу из 24 (обводка учтена), то есть треть ширины с
   *  каждого края — воздух, которого не видно. Его и вычитаем: иначе слева
   *  плашка отступает на треть стрелки больше, чем справа у замка. */
  const chevSize = touch ? 14 : 17
  const chevBleed = chevSize / 3

  const pct = duration ? Math.min(100, (current / duration) * 100) : 0
  const ratio = watchRatio({ ...watch, duration: duration || watch.duration })
  const resumeAt = hasResumePoint(watch) ? watch.position : 0

  // ── Заставка до запуска ───────────────────────────────────────────────────
  const poster = source.kind === 'youtube' && !posterFallback
    ? `https://i.ytimg.com/vi/${source.id}/maxresdefault.jpg`
    : source.kind === 'youtube' ? `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`
    : null

  const iconBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: 'transparent', color: '#fff', flexShrink: 0, ...extra,
  })

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
      onPointerLeave={() => { if (started && !paused && !rateOpen) setBarVisible(false) }}
      className="relative min-w-0 outline-none"
      style={{
        width: '100%',
        // В полноэкранном режиме коробку растягивает браузер; в потоке страницы
        // она держит 16:9 сама (см. MAX_VH). maxHeight — страховка на случай,
        // если родитель не ограничил ширину: лучше поля, чем плеер во весь
        // экран с уехавшим вниз конспектом.
        ...(fullscreen
          ? { height: '100%' }
          : { aspectRatio: '16 / 9', maxHeight: PLAYER_MAX_H }),
        borderRadius: fullscreen ? 0 : 24,
        overflow: 'hidden',
        // Удержание на кадре — наш жест ускорения. Без этого Safari успевает
        // начать выделение текста и показать «Copy · Look Up · Translate».
        userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
        background: 'linear-gradient(135deg, #2A2A2C, #111113)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}
    >
      {/* ── Движок ── */}
      {started && source.kind === 'file' && (
        <video
          ref={videoRef}
          src={source.url}
          autoPlay
          playsInline
          disablePictureInPicture
          onLoadedMetadata={e => {
            e.currentTarget.currentTime = startAt
            setDuration(e.currentTarget.duration || 0)
          }}
          onPlay={() => { setPaused(false); setEnded(false) }}
          onPause={() => setPaused(true)}
          onEnded={() => { setPaused(true); setEnded(true) }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: '#000' }}
        />
      )}

      {started && source.kind === 'youtube' && (
        // Хост, который YT заменит на свой iframe. pointer-events выключены —
        // без наведения чужой интерфейс не появляется.
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div ref={ytHostRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {started && (source.kind === 'rutube' || source.kind === 'iframe') && (
        <iframe
          ref={iframeRef}
          src={videoEmbedSrc(source, startAt)}
          title={`${t('Видео урока:')} ${title}`}
          allow="clipboard-write; autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none',
            pointerEvents: source.kind === 'rutube' ? 'none' : 'auto',
          }}
        />
      )}

      {/* ── Слой управления ── */}
      {started && custom && (
        <>
          {/* Тап — пауза/пуск, двойной по краю — ±10 с, по центру — полный
              экран, удержание — скраб и ускорение (см. onFrameDown). */}
          <div
            onPointerDown={onFrameDown}
            style={{
              position: 'absolute', inset: 0, touchAction: 'none',
              cursor: gesture === 'scrub' ? 'ew-resize' : 'pointer',
            }}
          />

          {/* Большая кнопка на паузе и в конце ролика. На паузе она занимает
              только середину — иначе накрыла бы собой весь слой жестов.
              Центр берём не от кадра, а от его свободной части: на паузе
              нижняя панель показана всегда, и кнопка в геометрическом центре
              визуально тонет в контролы — поэтому она приподнята на половину
              высоты панели. */}
          {(paused || ended) && !gesture && (
            <button
              onClick={() => (ended ? (doSeek(0), doPlay()) : doPlay())}
              aria-label={ended ? t('Смотреть заново') : t('Продолжить')}
              className={ended
                ? 'absolute inset-0 flex items-center justify-center cursor-pointer'
                : 'absolute flex items-center justify-center cursor-pointer'}
              style={ended
                ? { border: 'none', background: 'rgba(0,0,0,0.55)' }
                : { border: 'none', background: 'transparent', left: '50%', top: 'calc(50% - 28px)', transform: 'translate(-50%, -50%)', padding: 0 }}
            >
              <motion.span
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(var(--glass-rgb), 0.95)', color: 'var(--color-purple)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                }}
              >
                {ended
                  ? <Repeat size={26} />
                  : <Play size={28} fill="var(--color-purple)" style={{ marginLeft: 4 }} />}
              </motion.span>
            </button>
          )}

          {/* Отклик двойного тапа: волна от того края, куда тапнули. */}
          {skipFlash && (
            <motion.div
              key={skipFlash.n}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.52, times: [0, 0.25, 1] }}
              style={{
                position: 'absolute', top: 0, bottom: 0, width: '34%',
                ...(skipFlash.side === 'right' ? { right: 0 } : { left: 0 }),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 7, color: '#fff', pointerEvents: 'none',
                background: `radial-gradient(circle at ${skipFlash.side === 'right' ? '100%' : '0%'} 50%, rgba(255,255,255,0.20), transparent 72%)`,
              }}
            >
              {skipFlash.side === 'right' ? <RotateCw size={22} /> : <RotateCcw size={22} />}
              <span style={{ fontSize: 15, fontWeight: 800 }}>10</span>
            </motion.div>
          )}

          {/* Пилюля скраба: время под пальцем и сдвиг от точки, где взялись.
              Центрируем обёрткой: свой transform на motion.div затирается
              анимацией scale, и плашка уезжает от центра вправо-вниз. */}
          {gesture === 'scrub' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.16 }}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 18px',
                borderRadius: 999, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)',
                color: '#fff', pointerEvents: 'none', whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 21, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {formatClock(current)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.62)', fontVariantNumeric: 'tabular-nums' }}>
                {current >= scrubFrom ? '+' : '−'}{formatClock(Math.abs(current - scrubFrom))}
              </span>
            </motion.div>
            </div>
          )}

          {/* Плашка ускорения — сверху по центру кадра: середина занята кругом
              плей/паузы и самим кадром. Центрируем обёрткой, а не transform:
              анимация scale у motion.div перезаписывает transform целиком и
              сбивает translate(-50%). Стрелок ровно столько, какая ступень, а
              замок наливается снизу вверх, туда же, куда ведут палец.
              На телефоне подсказку про замок прячем (с ней плашка шире кадра),
              а саму плашку ужимаем: меньше отступы, стрелки и замок — иначе
              она спорит по весу с самим кадром. */}
          {(gesture === 'ff' || gesture === 'rw') && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 14, display: 'flex',
              justifyContent: 'center', pointerEvents: 'none',
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              style={{
                display: 'flex', alignItems: 'center', gap: touch ? 6 : 9, padding: touch ? '4px 10px' : '7px 14px',
                borderRadius: 999, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(10px)',
                color: '#fff', pointerEvents: 'none', whiteSpace: 'nowrap',
                maxWidth: 'calc(100% - 24px)',
              }}
            >
              {/* Прозрачные поля глифа съедены (см. chevBleed) — теперь ink
                  стрелок стоит ровно по отступу плашки, а зазор до «2×» равен
                  зазору «2×» → замок. */}
              <div className="flex items-center" style={{ flexDirection: gesture === 'ff' ? 'row' : 'row-reverse', margin: `0 ${-chevBleed}px` }}>
                {Array.from({ length: boost }, (_, i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.22, 1, 0.22] }}
                    transition={{ duration: 0.9, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ display: 'flex', marginLeft: i ? (touch ? -5 : -6) : 0 }}
                  >
                    {gesture === 'ff' ? <ChevronRight size={chevSize} /> : <ChevronLeft size={chevSize} />}
                  </motion.span>
                ))}
              </div>

              <span style={{ fontSize: touch ? 13 : 14.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{boost}×</span>

              {/* Замок: капсула наливается снизу вверх по ходу жеста. */}
              <motion.span
                animate={boostLocked ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                transition={{ duration: 0.34 }}
                style={{
                  position: 'relative', width: touch ? 28 : 34, height: touch ? 17 : 21, borderRadius: 999, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.13)',
                  border: `1px solid ${boostLocked ? 'rgba(167,139,250,0.9)' : 'rgba(255,255,255,0.14)'}`,
                }}
              >
                <span
                  style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    height: `${(boostLocked ? 1 : lockFill) * 100}%`,
                    background: 'linear-gradient(180deg, #A78BFA, #7C5CFF)',
                    transition: 'height 0.08s linear',
                  }}
                />
                <motion.span
                  animate={{ rotate: boostLocked ? [0, -9, 0] : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'flex', position: 'relative' }}
                >
                  {boostLocked
                    ? <Lock size={touch ? 10 : 12} />
                    : <LockOpen size={touch ? 10 : 12} style={{ opacity: 0.4 + lockFill * 0.6 }} />}
                </motion.span>
              </motion.span>

              <span className="hidden sm:inline" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                {boostLocked ? t('тап — снять') : t('вверх — зафиксировать')}
              </span>
            </motion.div>
            </div>
          )}

          <motion.div
            initial={false}
            animate={{ opacity: barVisible || paused || !!gesture ? 1 : 0, y: barVisible || paused || !!gesture ? 0 : 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 14px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.35) 55%, transparent)',
              pointerEvents: barVisible || paused ? 'auto' : 'none',
            }}
          >
            {/* Дорожка: буфер → отсмотренное → проигранное → метки глав. */}
            <div
              ref={railRef}
              onPointerDown={startScrub}
              onPointerMove={e => setHoverAt(seekAtClientX(e.clientX))}
              onPointerLeave={() => setHoverAt(null)}
              style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}
            >
              {/* Комета: бегунка нет вовсе, положение держит светлая голова на
                  конце заливки, а хвост за ней гаснет. */}
              <div style={{ position: 'relative', width: '100%', height: scrubbing ? 6 : 3, borderRadius: 999, background: 'rgba(255,255,255,0.22)', transition: 'height 0.14s ease' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${buffered * 100}%`, borderRadius: 999, background: 'rgba(255,255,255,0.28)' }} />
                {/* Уже отсмотренные куски — видно, что осталось пересмотреть. */}
                {duration > 0 && watch.ranges.map(([a, b], i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${(a / duration) * 100}%`, width: `${((b - a) / duration) * 100}%`,
                      background: 'rgba(255,255,255,0.40)', borderRadius: 999,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: 'absolute', inset: 0, width: `${pct}%`, borderRadius: 999,
                    background: 'linear-gradient(90deg, rgba(124,92,255,0.45), #7C5CFF 55%, #C7BCFF 86%, #FFFFFF)',
                  }}
                />
                {/* Главы — прорези цветом корпуса, а не точки поверх линии. */}
                {duration > 0 && timecodes.map(tc => (
                  <span
                    key={tc.seconds}
                    title={tc.label}
                    style={{
                      position: 'absolute', top: -1, bottom: -1, width: 2,
                      left: `${Math.min(99.8, (tc.seconds / duration) * 100)}%`,
                      background: 'rgba(0,0,0,0.55)',
                    }}
                  />
                ))}
                <span
                  style={{
                    position: 'absolute', top: '50%', left: `max(0px, calc(${pct}% - 16px))`,
                    width: 16, height: scrubbing ? 7 : 5, borderRadius: 999,
                    transform: 'translateY(-50%)', background: '#fff',
                    boxShadow: '0 0 10px rgba(199,188,255,0.85)',
                    transition: 'height 0.14s ease',
                  }}
                />
              </div>

              {hoverAt !== null && duration > 0 && (
                <span
                  style={{
                    position: 'absolute', bottom: 22, transform: 'translateX(-50%)',
                    left: `${(hoverAt / duration) * 100}%`, whiteSpace: 'nowrap',
                    padding: '3px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.78)',
                    color: '#fff', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    pointerEvents: 'none',
                  }}
                >
                  {formatClock(hoverAt)}
                </span>
              )}
            </div>

            <div className="flex items-center" style={{ gap: 2, marginTop: 2 }}>
              <button onClick={() => (paused ? doPlay() : doPause())} style={iconBtn()} aria-label={paused ? t('Продолжить') : t('Пауза')}>
                {paused ? <Play size={19} fill="#fff" /> : <Pause size={19} fill="#fff" />}
              </button>
              {/* Кнопок «−10 / +10» в строке нет НАМЕРЕННО. У длинного ролика
                  время занимает всю строку («5:41 / 1:26:56»), и первым из неё
                  выдавливалось ускорение — а оно нужнее: перемотка живёт в
                  жестах по кадру (двойной тап по краю, удержание), скорость же
                  нажимается только отсюда. */}
              {/* Громкость: ползунок раскрывается при наведении на группу. */}
              <div className="flex items-center group" style={{ gap: 2 }}>
                <button
                  onClick={() => { const m = !muted; setMuted(m); applyVolume(volume, m) }}
                  style={iconBtn()}
                  aria-label={muted ? t('Включить звук') : t('Выключить звук')}
                >
                  {muted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                </button>
                {!touch && (
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={muted ? 0 : volume}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setVolume(v); setMuted(v === 0); applyVolume(v, v === 0)
                    }}
                    aria-label={t('Громкость')}
                    className="video-volume"
                    style={{ width: 72, accentColor: '#fff' }}
                  />
                )}
              </div>

              <span style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {formatClock(current)} <span style={{ color: 'rgba(255,255,255,0.6)' }}>/ {formatClock(duration)}</span>
              </span>

              {activeChapter >= 0 && (
                <span className="truncate" style={{ marginLeft: 12, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>
                  {timecodes[activeChapter].label}
                </span>
              )}

              <span style={{ flex: 1 }} />

              {canCaptions && ccAvailable && (
                <button
                  onClick={toggleCaptions}
                  style={iconBtn(captions ? { background: 'rgba(255,255,255,0.2)' } : undefined)}
                  aria-label={t('Субтитры')}
                >
                  <Subtitles size={18} />
                </button>
              )}

              {canRate && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={rateBtnRef}
                    onClick={() => { if (!rateOpen) placeRateMenu(); setRateOpen(o => !o) }}
                    style={iconBtn(rateOpen ? { background: 'rgba(255,255,255,0.2)', width: 'auto', padding: '0 8px', gap: 5 } : { width: 'auto', padding: '0 8px', gap: 5 })}
                    aria-label={t('Скорость')}
                  >
                    <Gauge size={17} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{liveRate}×</span>
                  </button>
                  {rateOpen && ratePos && createPortal(
                    <div
                      data-rate-menu
                      style={{
                        position: 'fixed', left: ratePos.left, top: ratePos.top, zIndex: 4000,
                        width: RATE_MENU_W, padding: 6, borderRadius: 14,
                        background: 'rgba(20,20,22,0.94)', border: '1px solid rgba(255,255,255,0.14)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      }}
                    >
                      {rates.map(r => (
                        <button
                          key={r}
                          // Выбор из меню — это уже другая скорость: защёлкнутое
                          // ускорение снимаем, иначе оно осталось бы поверх.
                          // Работаем по pointerup: на телефоне click по пункту
                          // в портале доезжает не всегда.
                          onPointerUp={() => { if (lockedRef.current) endBoost(); applyRate(r) }}
                          className="flex items-center w-full cursor-pointer"
                          style={{
                            gap: 8, padding: '7px 9px', borderRadius: 9, border: 'none',
                            background: r === rate ? 'rgba(255,255,255,0.14)' : 'transparent',
                            color: '#fff', fontSize: 12.5, fontWeight: r === rate ? 700 : 500,
                          }}
                        >
                          <Check size={13} style={{ opacity: r === rate ? 1 : 0 }} />
                          {r === 1 ? t('Обычная') : `${r}×`}
                        </button>
                      ))}
                    </div>,
                    (fullscreen ? boxRef.current : null) ?? document.body,
                  )}
                </div>
              )}

              <button onClick={toggleFullscreen} style={iconBtn()} aria-label={t('Во весь экран')}>
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* ── Заставка ── */}
      {!started && (
        <>
          {poster && (
            <img
              src={poster}
              alt=""
              onError={() => setPosterFallback(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.62 }}
            />
          )}
          {badge && (
            <span
              style={{
                position: 'absolute', top: 16, left: 16, zIndex: 2,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)',
                padding: '5px 12px', borderRadius: 999, backdropFilter: 'blur(8px)',
              }}
            >
              {badge}
            </span>
          )}

          {/* Большая кнопка продолжает с того места, где остановились в прошлый
              раз; «сначала» рядом — для тех, кто пересматривает урок целиком. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: 14 }}>
            <button
              onClick={() => { setStartAt(resumeAt); setStarted(true) }}
              aria-label={resumeAt > 0 ? `${t('Продолжить с')} ${formatClock(resumeAt)}` : t('Смотреть')}
              className="cursor-pointer"
              style={{ border: 'none', background: 'transparent', padding: 0 }}
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                style={{
                  width: 76, height: 76, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(var(--glass-rgb), 0.95)', color: 'var(--color-purple)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                }}
              >
                <Play size={30} fill="var(--color-purple)" style={{ marginLeft: 4 }} />
              </motion.div>
            </button>

            {resumeAt > 0 && (
              <div className="flex items-center" style={{ gap: 8 }}>
                <button
                  onClick={() => { setStartAt(resumeAt); setStarted(true) }}
                  className="cursor-pointer"
                  style={{
                    fontSize: 12.5, fontWeight: 700, color: '#fff',
                    background: 'rgba(0,0,0,0.55)', padding: '6px 12px', borderRadius: 999,
                    border: 'none', backdropFilter: 'blur(8px)',
                  }}
                >
                  {t('Продолжить с')} {formatClock(resumeAt)}
                </button>
                <button
                  onClick={() => { setStartAt(0); setStarted(true) }}
                  className="cursor-pointer"
                  style={{
                    fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)',
                    background: 'rgba(255,255,255,0.16)', padding: '6px 12px', borderRadius: 999,
                    border: 'none', backdropFilter: 'blur(8px)',
                  }}
                >
                  {t('Сначала')}
                </button>
              </div>
            )}
          </div>

          {/* Полоска уже отсмотренного по низу заставки — сразу видно, что урок начат. */}
          {ratio > 0.01 && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,0.18)' }}>
              <div style={{ height: '100%', width: `${ratio * 100}%`, background: 'var(--grad-purple, linear-gradient(90deg,#7C5CFF,#A855F7))' }} />
            </div>
          )}

          {durationLabel && (
            <span
              style={{
                position: 'absolute', bottom: 16, right: 16, zIndex: 2,
                fontSize: 12, fontWeight: 600, color: '#fff',
                background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 8,
              }}
            >
              {durationLabel}
            </span>
          )}
        </>
      )}
    </div>
  )
})

// Аудио-файл (mp3/m4a/…, см. lib/videoSource.ts) — не видео: весь корпус
// плеера (16:9-коробка, жесты по кадру, полный экран) для него бессмыслен.
// Отдаём нативный <audio controls> — с ним работают и клавиатура, и фон на
// мобильных. Ветвление вынесено в обёртку, а не внутрь плеера: у того сотня
// хуков, и условный ранний return сломал бы их порядок.
const LessonVideoPlayer = forwardRef<LessonVideoHandle, Props>(function LessonVideoPlayerOuter(props, ref) {
  if (props.source.kind === 'audio') {
    return (
      <audio
        controls
        preload="metadata"
        src={props.source.url}
        title={props.title}
        style={{ width: '100%', maxWidth: 720, display: 'block', borderRadius: 999 }}
      />
    )
  }
  return <LessonVideoPlayerInner {...props} ref={ref} />
})

export default LessonVideoPlayer
