import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import Modal from '../Modal'
import Segmented from '../Segmented'
import FadeText from '../FadeText'
import GrowTextarea from '../GrowTextarea'
import HScrollFade from '../HScrollFade'
import TeacherSelect from './TeacherSelect'
import { AlertTriangle, AudioLines, ChevronLeft, ChevronRight, Gauge, Headphones, Minus, Pause, Play, Plus, RotateCcw, Timer, SlidersHorizontal } from '../icons/appIcons'
import { btn } from '../../lib/pillStyles'
import { useIsDesktop } from '../../lib/useIsDesktop'
import LessonVideoPlayer, { type LessonVideoHandle } from '../LessonVideoPlayer'
import { emptyWatch } from '../../lib/videoProgress'
import type { VideoSource } from '../../lib/videoSource'
import { useScrollFades } from '../../lib/useScrollFades'
import type { LessonTimecode } from '../../data/lessonContent'
import {
  DEFAULT_SETTINGS, clock, clockFine, rulerTicks, detectPauses, lessonStats, participation, summarizeStats, type LessonStatsSummary, editedDuration, labelVoices, linesHit, mergeSpeaker, playbackAt, span, talkTime, toEditedTime,
  type LessonMontage, type MontageLine, type MontagePause, type MontageSettings, type MontageSpeaker, type PauseAction, type PauseKind, type PauseOverride, type QuietSpan, type SpeakerTone,
} from '../../lib/lessonMontage'
import './lessonMontage.css'

// Окно монтажа записи: паузы (вырезать / ускорить / оставить), говорящие
// и реплики. Видео не трогаем — сохраняется список отрезков, плеер урока
// перепрыгивает вырезанное. Плеер здесь — макет: на стенде нет файла записи.

export const TONE: Record<SpeakerTone, { bg: string; text: string }> = {
  purple: { bg: 'var(--color-purple-soft)', text: 'var(--color-purple-text)' },
  blue: { bg: 'var(--color-blue-pill-bg)', text: 'var(--color-blue-pill-text)' },
  teal: { bg: 'var(--color-teal-pill-bg)', text: 'var(--color-teal-pill-text)' },
  peach: { bg: 'var(--color-peach-soft)', text: 'var(--color-peach-text)' },
  rose: { bg: 'var(--color-rose-soft)', text: 'var(--color-rose-text)' },
  green: { bg: 'var(--color-green-soft)', text: 'var(--color-green-text)' },
}
const ACTION_LABEL: Record<PauseAction, string> = { cut: 'Вырезать', speed: 'Ускорить', keep: 'Оставить' }
const KIND_LABEL: Record<PauseKind, string> = { silence: 'Тишина', quiet: 'Тихо работают', nospeech: 'Без речи' }

type Tab = 'pauses' | 'speakers' | 'lines' | 'stats' | 'settings'

export interface MontageResult extends LessonMontage { timecodes: LessonTimecode[] }

export default function LessonMontageEditor({ title, duration, voices, lines: sourceLines, quiet, chapters, levelAt, initial, missingAudio, video, floor, onForgetVoices, trend, onApply, onClose }: {
  title: string
  duration: number
  voices: string[]
  lines: MontageLine[]
  quiet: QuietSpan[]
  chapters: LessonTimecode[]
  /** Громкость записи в момент t, дБ — для формы волны в окне паузы. */
  levelAt: (t: number) => number
  initial?: { settings: MontageSettings; overrides: Record<string, PauseOverride>; speakers: MontageSpeaker[]; lines: MontageLine[] }
  /** Модуль ещё старый: паузы и громкость не пришли — подсказываем, как получить. */
  missingAudio?: boolean
  /** Сама запись: с ней окно играет настоящее видео со звуком, шкала идёт за ним. */
  video?: VideoSource
  /** Уровень фона записи — пороги пауз считаются от него. */
  floor?: number
  /** Забыть запомненные на этом Mac голоса (есть, если модуль разделял голоса). */
  onForgetVoices?: () => void
  /** Уроки курса с итогами (по порядку) — для динамики во вкладке «Итоги». */
  trend?: { id: string; title: string; current?: boolean; stats?: LessonStatsSummary }[]
  onApply: (result: MontageResult, state: NonNullable<Parameters<typeof LessonMontageEditor>[0]['initial']>) => void
  onClose: () => void
}) {
  const desktop = useIsDesktop()
  const [settings, setSettings] = useState(initial?.settings ?? DEFAULT_SETTINGS)
  const [overrides, setOverrides] = useState<Record<string, PauseOverride>>(initial?.overrides ?? {})
  const [speakers, setSpeakers] = useState(() => initial?.speakers ?? labelVoices(voices, sourceLines))
  const [lines, setLines] = useState(initial?.lines ?? sourceLines)
  const [tab, setTab] = useState<Tab>('pauses')
  const [who, setWho] = useState('all')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<'edited' | 'source'>('edited')
  const pauses = useMemo(() => detectPauses(quiet, settings, overrides, floor), [quiet, settings, overrides, floor])
  const [selectedId, setSelectedId] = useState<string | undefined>(() => pauses[0]?.id)
  const selected = pauses.find(p => p.id === selectedId)
  const [notice, setNotice] = useState('')
  const [followWave, setFollowWave] = useState(0)
  const [followTimeline, setFollowTimeline] = useState(0)
  const detailRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLDivElement>(null)
  useScrollFades(sideRef, desktop, '.lm-panel-body')

  const after = editedDuration(duration, pauses, settings.speed)
  const cutTotal = pauses.filter(p => p.action === 'cut').reduce((s, p) => s + p.end - p.start, 0)
  const speedTotal = pauses.filter(p => p.action === 'speed').reduce((s, p) => s + p.end - p.start, 0)

  // Ход времени — setInterval, не rAF: в превью и PWA rAF приходит не всегда.
  const live = useRef({ t, view, pauses, speed: settings.speed })
  live.current = { t, view, pauses, speed: settings.speed }
  // С настоящим видео время ведёт плеер (onTick), свои часы — только у макета.
  useEffect(() => {
    if (!playing || video) return
    const id = setInterval(() => {
      const { t, view, pauses, speed } = live.current
      const at = view === 'edited' ? playbackAt(t, pauses) : { rate: 'normal' as const }
      if (at.rate === 'skip' && at.pause) {
        setNotice(`Пропущено ${span(at.pause.end - at.pause.start)} тишины`)
        setT(at.pause.end)
        return
      }
      const next = t + 0.1 * (at.rate === 'speed' ? speed : 1)
      if (next >= duration) { setT(duration); setPlaying(false) } else setT(next)
    }, 100)
    return () => clearInterval(id)
  }, [playing, duration, video])
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 1800); return () => clearTimeout(id) }, [notice])

  const videoRef = useRef<LessonVideoHandle>(null)
  const playingRef = useRef(playing); playingRef.current = playing
  /** Перемотка: шкала, волна, список — и само видео, если оно есть. */
  const seek = (at: number) => {
    const s = Math.max(0, Math.min(duration, at))
    setT(s)
    if (video) { if (playingRef.current) videoRef.current?.playFrom(s); else videoRef.current?.seekPaused(s) }
  }
  const setPlay = (on: boolean) => {
    setPlaying(on)
    if (video) { if (on) videoRef.current?.playFrom(live.current.t); else videoRef.current?.pause() }
  }
  const listen = (at: number, mode: 'edited' | 'source' = 'edited') => {
    setView(mode); setT(Math.max(0, at)); setPlaying(true)
    if (video) videoRef.current?.playFrom(Math.max(0, at))
  }
  // «Как будет» на настоящем видео: пропуски и ускорения делает сам плеер.
  const plan = useMemo(() => view !== 'edited' ? undefined : {
    skip: pauses.filter(p => p.action === 'cut').map(p => [p.start, p.end] as [number, number]),
    fast: pauses.filter(p => p.action === 'speed').map(p => [p.start, p.end, settings.speed] as [number, number, number]),
  }, [view, pauses, settings.speed])
  const watch = useMemo(() => emptyWatch(), [])
  const onVideoTick = (s: number, on: boolean) => {
    const prev = live.current.t
    const jumped = live.current.view === 'edited' && live.current.pauses.find(p => p.action === 'cut' && prev >= p.start - 0.5 && prev < p.end && s >= p.end - 0.3)
    if (jumped) setNotice(`Пропущено ${span(jumped.end - jumped.start)} тишины`)
    setT(s); if (on !== playingRef.current) setPlaying(on)
  }
  const videoNode = video ? <div className="lm-video"><LessonVideoPlayer ref={videoRef} source={video} title={title} timecodes={[]}
    initialWatch={watch} onPersist={() => {}} montage={plan} onTick={onVideoTick} /></div> : undefined
  // Выбрал паузу — плеер встаёт на её начало, шкала доводит её в кадр.
  const select = (id: string, scroll = false) => {
    setSelectedId(id)
    const p = pauses.find(x => x.id === id)
    if (p) { seek(p.start); setFollowTimeline(n => n + 1) }
    if (scroll && !desktop) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const override = (id: string, patch: PauseOverride) => setOverrides(o => ({ ...o, [id]: { ...o[id], ...patch } }))
  const resetBounds = (id: string) => setOverrides(o => ({ ...o, [id]: { action: o[id]?.action } }))
  const speakerOf = (id: string) => speakers.find(s => s.id === id)
  // Голоса пока не разделяются автоматически: ученика добавляют вручную и
  // назначают ему реплики во вкладке «Текст».
  const addVoice = () => setSpeakers(list => {
    const tones: SpeakerTone[] = ['blue', 'teal', 'peach', 'rose', 'green']
    const students = list.filter(s => s.role === 'student').length
    let n = list.length + 1
    while (list.some(s => s.id === 'v' + n)) n++
    return [...list, { id: 'v' + n, label: `Ученик ${students + 1}`, role: 'student', tone: tones[students % tones.length] }]
  })

  const apply = () => {
    const timecodes = chapters.map(c => { const seconds = Math.round(toEditedTime(c.seconds, pauses, settings.speed)); return { ...c, seconds, time: clock(seconds) } })
    onApply({ duration, speakers, lines, pauses, settings, timecodes }, { settings, overrides, speakers, lines })
    onClose()
  }

  const player = <Player t={t} duration={duration} after={after} view={view} setView={setView} playing={playing} setPlaying={setPlay} videoNode={videoNode}
    pauses={pauses} speed={settings.speed} lines={lines} speakerOf={speakerOf} chapters={chapters} notice={notice}
    onSeek={seek} />
  // Шкала и волна паузы показывают одно место: перемотка в одной доводит
  // это место в кадр другой (счётчики follow*).
  const timeline = <Timeline duration={duration} speakers={speakers} lines={lines} pauses={pauses} t={t} selected={selectedId}
    follow={followTimeline} onSeek={at => { seek(at); setFollowWave(n => n + 1) }} onSelect={id => select(id, true)}
    onRename={(id, label) => setSpeakers(list => list.map(x => x.id === id ? { ...x, label } : x))} />
  const detail = <div ref={detailRef} className="lm-detail-slot">{selected
    ? <PauseDetail duration={duration} t={t} follow={followWave} onSeek={at => { seek(at); setFollowTimeline(n => n + 1) }} pause={selected} pauses={pauses} lines={lines} speakerOf={speakerOf} speed={settings.speed} levelAt={levelAt}
      onBounds={(start, end) => override(selected.id, { start, end })} onAction={a => override(selected.id, { action: a })}
      onReset={() => resetBounds(selected.id)} onListen={listen} onStep={dir => { const i = pauses.indexOf(selected); const n = pauses[i + dir]; if (n) select(n.id) }} />
    : <p className="lm-empty">{missingAudio
      ? 'Паузы ищет обновлённый модуль расшифровки. Перезапустите start.command и нажмите «Повторить обработку» — голоса и реплики можно править уже сейчас.'
      : 'Пауз с такими настройками нет. Уменьшите минимальную длину или выберите «Шумный класс».'}</p>}</div>

  const panel = <>
    <HScrollFade fade="var(--color-bg-2)" padBottom={4}>
      <Segmented variant="mode" value={tab} onChange={setTab} items={[
        { id: 'pauses', label: <>Паузы <small className="lm-count">{pauses.length}</small></>, title: 'Паузы' },
        { id: 'speakers', label: <>Голоса <small className="lm-count">{speakers.length}</small></>, title: 'Говорящие' },
        { id: 'lines', label: <>Текст <small className="lm-count">{lines.length}</small></>, title: 'Реплики' },
        { id: 'stats', label: 'Итоги', title: 'Итоги урока' },
        // Настройки — иконкой: пять вкладок помещаются в узкую колонку без прокрутки.
        { id: 'settings', label: <span className="lm-visually-hidden">Поиск пауз</span>, icon: SlidersHorizontal, title: 'Поиск пауз' },
      ]} />
    </HScrollFade>
    {/* Шапка паузы и фильтр реплик стоят над списком, а не в нём: листаются
        только строки, кнопки «для всех» и фильтр всегда под рукой. */}
    {tab === 'pauses' && <PauseHead count={pauses.length} speed={settings.speed} cutTotal={cutTotal} speedTotal={speedTotal}
      onAll={a => setOverrides(o => Object.fromEntries(pauses.map(p => [p.id, { ...o[p.id], action: a }])))} />}
    {tab === 'lines' && <HScrollFade fade="var(--color-bg-2)" padBottom={2}>
      <Segmented variant="filter" value={who} onChange={setWho} items={[{ id: 'all', label: 'Все' }, ...speakers.map(s => ({ id: s.id, label: s.label }))]} />
    </HScrollFade>}
    <div className="lm-panel-body no-scrollbar">
      {tab === 'pauses' && <PauseList pauses={pauses} speed={settings.speed} selected={selectedId} t={t} onSelect={id => select(id, true)} />}
      {tab === 'speakers' && <SpeakerList speakers={speakers} lines={lines} onChange={setSpeakers} onListen={at => listen(at, 'source')} onAdd={addVoice} onForget={onForgetVoices}
        onMerge={(from, into) => { const m = mergeSpeaker({ speakers, lines }, from, into); setSpeakers(m.speakers); setLines(m.lines); if (who === from) setWho(into) }} />}
      {tab === 'lines' && <LineList lines={lines} speakers={speakers} pauses={pauses} t={t} who={who} onChange={setLines} onListen={at => listen(at, 'source')} />}
      {tab === 'stats' && <StatsPanel lines={lines} speakers={speakers} duration={duration} trend={trend} />}
      {tab === 'settings' && <SettingsPanel settings={settings} onChange={setSettings} found={pauses.length} edited={Object.keys(overrides).length}
        onResetAll={() => setOverrides({})} />}
    </div>
  </>

  // Шапка в одну строку: название и длительности рядом, без второй строки —
  // высота уходит экрану плеера и дорожкам.
  return <Modal width={1400} padding={desktop ? 20 : 24} onClose={onClose}
    title={<span className="lm-title"><FadeText className="lm-title-name">{title}</FadeText>
      <span className="lm-title-meta">запись {clock(duration)}, после монтажа {clock(after)}</span></span>}
    icon={<span className="lm-mark"><AudioLines size={20} /></span>}
    cardStyle={desktop ? { height: '92dvh' } : undefined}
    bodyStyle={desktop ? { overflowY: 'hidden', display: 'flex', flexDirection: 'column' } : undefined}
    footer={<div className="lm-footer">
      <span className="lm-footer-sum"><strong>−{clock(duration - after)}</strong><span className="lm-footer-detail">Вырезано {span(cutTotal)}, ускорено {span(speedTotal)}</span><span className="lm-footer-short">урок станет короче</span></span>
      <button data-hover="layer" type="button" style={btn('M', 'secondary')} onClick={onClose}>Отмена</button>
      <button data-hover="layer" type="button" style={btn('M', 'primary')} onClick={apply}>Применить монтаж</button>
    </div>}>
    {desktop
      ? <div className="lm-editor">
        <div className="lm-col">{player}{timeline}{detail}</div>
        <div className="lm-side" ref={sideRef}>{panel}</div>
      </div>
      : <div className="lm-stack">{player}{timeline}{detail}{panel}</div>}
  </Modal>
}

// ── Плеер ──────────────────────────────────────────────────────────────────

function Player({ t, duration, after, view, setView, playing, setPlaying, pauses, speed, lines, speakerOf, chapters, notice, onSeek, videoNode }: {
  videoNode?: React.ReactNode; t: number; duration: number; after: number; view: 'edited' | 'source'; setView: (v: 'edited' | 'source') => void
  playing: boolean; setPlaying: (v: boolean) => void; pauses: MontagePause[]; speed: number; lines: MontageLine[]
  speakerOf: (id: string) => MontageSpeaker | undefined; chapters: LessonTimecode[]; notice: string; onSeek: (t: number) => void
}) {
  const short = useShortWindow()
  const line = lines.find(l => t >= l.start && t < l.end) ?? [...lines].reverse().find(l => l.end <= t) ?? lines[0]
  const speaking = !!line && t >= line.start && t < line.end
  const who = line && speakerOf(line.speaker)
  const quietNow = pauses.find(p => t >= p.start && t < p.end)
  const rate = view === 'edited' && quietNow?.action === 'speed'
  const chapter = [...chapters].reverse().find(c => c.seconds <= t)
  const shown = view === 'edited' ? toEditedTime(t, pauses, speed) : t
  const total = view === 'edited' ? after : duration
  return <section className="lm-player" aria-label="Просмотр записи">
    <div className={'lm-screen' + (videoNode ? ' has-video' : '')}>
      {videoNode}
      {/* Тело экрана фиксированной высоты (ряд чипов + 3 строки): реплики разной
          длины и паузы не меняют высоту плеера. «×4» стоит в ряду с чипом. */}
      <div className="lm-screen-body">{(quietNow && !speaking) || line ? <div className={'lm-screen-line' + (speaking || quietNow ? '' : ' is-dim')}>
        <div className="lm-chip-row">
          {quietNow && !speaking
            ? <span className="lm-chip is-quiet"><Timer size={13} />{KIND_LABEL[quietNow.kind]}</span>
            : who && <span className="lm-chip" style={{ background: TONE[who.tone].bg, color: TONE[who.tone].text }}>{who.label}</span>}
          {rate && <span className="lm-rate"><Gauge size={13} />×{speed}</span>}
        </div>
        <FadeText lines={short ? 2 : 3} className={'lm-screen-text' + (quietNow && !speaking ? ' is-quiet' : '')}>{quietNow && !speaking
          ? (view === 'source' ? 'Так в исходной записи: голосов нет.' : quietNow.action === 'keep' ? 'Оставлено как есть.' : quietNow.action === 'speed' ? `Ускорено ×${speed}: в кадре может быть доска.` : 'Будет пропущено при просмотре.')
          : line!.text}</FadeText>
      </div> : null}</div>
      {notice && <div className="lm-notice" role="status">{notice}</div>}
    </div>
    <div className="lm-controls">
      <button data-hover="layer" type="button" className="lm-play" aria-label={playing ? 'Пауза' : 'Смотреть'} onClick={() => { if (t >= duration) onSeek(0); setPlaying(!playing) }}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
      <span className="lm-time">{clock(shown)} / {clock(total)}</span>
      {/* Глава — по центру между временем и переключателем. */}
      <FadeText className="lm-chapter">{chapter?.label ?? 'Начало урока'}</FadeText>
      <Segmented variant="filter" value={view} onChange={setView} items={[{ id: 'edited', label: 'Как будет' }, { id: 'source', label: 'Как было' }]} />
    </div>
  </section>
}

/** Низкое окно (≤ 820 px): на экране плеера две строки реплики, а не три. */
function useShortWindow() {
  const query = '(min-width: 1024px) and (max-height: 820px)'
  const [short, setShort] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (e: MediaQueryListEvent) => setShort(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return short
}

// ── Шкала урока: дорожка на каждого говорящего + дорожка пауз ───────────────

const EDGE_SLACK = 40
/** Магнит к краям реплик: в пределах SNAP_PX курсор прилипает к началу/концу. */
const SNAP_PX = 8
function nearestEdge(s: number, edges: number[], tolerance: number) {
  let best: number | undefined, gap = tolerance
  for (const e of edges) { const d = Math.abs(e - s); if (d <= gap) { gap = d; best = e } }
  return best
}
const capture = (el: Element | null | undefined, id: number) => { try { el?.setPointerCapture(id) } catch { /* синтетический или ушедший указатель */ } }

function Timeline({ duration, speakers, lines, pauses, t, selected, follow, onSeek, onSelect, onRename }: {
  duration: number; speakers: MontageSpeaker[]; lines: MontageLine[]; pauses: MontagePause[]; t: number; selected?: string
  /** Растёт, когда плеер переставили в окне паузы: шкала доводит его в кадр. */
  follow: number
  onSeek: (t: number) => void; onSelect: (id: string) => void; onRename: (id: string, label: string) => void
}) {
  // Мышь над шкалой ведёт тонкую линию с временем и говорящим; зажать и вести —
  // плеер едет за курсором (скраб). Пальцем — то же перетаскиванием.
  // Cmd/Ctrl + колёсико или щипок трекпада — масштаб вокруг курсора,
  // свайп вбок — сдвиг увеличенной шкалы.
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  // «Резина» у края: курсор за шкалой тянет линию чуть наружу с сопротивлением.
  const [stretch, setStretch] = useState(0)
  const [scrub, setScrub] = useState(false)
  const [view, setView] = useState({ from: 0, to: duration })
  const viewRef = useRef(view)
  viewRef.current = view
  const len = view.to - view.from
  const zoomed = len < duration - 0.5
  const followed = useRef(follow)
  useEffect(() => {
    if (followed.current === follow) return
    followed.current = follow
    const v = viewRef.current, l = v.to - v.from
    if (t >= v.from && t <= v.to) return
    const from = Math.min(duration - l, Math.max(0, t - l / 2))
    setView({ from, to: from + l })
  }, [follow, t, duration])
  const pct = (s: number) => `${(s - view.from) / len * 100}%`
  const size = (d: number) => `${d / len * 100}%`
  const at = (x: number) => {
    const r = track.current!.getBoundingClientRect()
    // Люфт у краёв: курсор чуть за шкалой стоит ровно на крае (видно, что это
    // самое начало или конец), а не теряет линию.
    return { s: Math.min(view.to, Math.max(view.from, view.from + (x - r.left) / r.width * len)), inside: x >= r.left - EDGE_SLACK && x <= r.right + EDGE_SLACK }
  }

  useEffect(() => {
    const el = section.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const r = track.current?.getBoundingClientRect()
      if (!r) return
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
        setView(v => {
          const l = v.to - v.from, anchor = v.from + frac * l
          const next = Math.min(duration, Math.max(0.2, l * Math.exp(e.deltaY * 0.01)))
          const from = Math.min(duration - next, Math.max(0, anchor - frac * next))
          return { from, to: from + next }
        })
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        // preventDefault — здесь, а не внутри setView: апдейтер React зовёт
        // позже, когда браузер уже прокрутил окно и отменять нечего.
        const v = viewRef.current, l = v.to - v.from
        if (l >= duration - 0.5) return
        e.preventDefault()
        const from = Math.min(duration - l, Math.max(0, v.from + (e.deltaX || e.deltaY) / r.width * l))
        viewRef.current = { from, to: from + l }
        setView(viewRef.current)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [duration])

  // Повторный клик в зоне того же края — без магнита: человек хочет точно туда.
  const lastSnap = useRef<number | undefined>(undefined)
  const magnet = useRef(true)
  const snapAt = (x: number) => {
    const { s, inside } = at(x)
    const r = track.current!.getBoundingClientRect()
    const edge = magnet.current ? nearestEdge(s, edges, SNAP_PX / r.width * len) : undefined
    return { s: edge ?? s, raw: s, edge, inside }
  }
  const [snapped, setSnapped] = useState(false)
  const start = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    capture(section.current, e.pointerId)
    setScrub(true)
    magnet.current = true
    const p = snapAt(e.clientX)
    if (p.edge != null && p.edge === lastSnap.current) { magnet.current = false; lastSnap.current = undefined; onSeek(p.raw) }
    else { lastSnap.current = p.edge; onSeek(p.s) }
  }
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(leaveTimer.current), [])
  const move = (e: ReactPointerEvent) => {
    clearTimeout(leaveTimer.current)
    if (!scrub) magnet.current = true
    const { s, edge, inside: loose } = snapAt(e.clientX)
    const r0 = track.current!.getBoundingClientRect()
    // Наведение — строго по форме шкалы; люфт и резинка у края — только с зажатой кнопкой.
    const inside = scrub ? loose : e.clientX >= r0.left && e.clientX <= r0.right
    // Ушёл из зоны края — следующий клик снова магнитится.
    if (!scrub && edge !== lastSnap.current) lastSnap.current = undefined
    setSnapped(edge != null)
    if (scrub) onSeek(s)
    setHover(e.pointerType === 'mouse' && (inside || scrub) ? s : null)
    const r = track.current!.getBoundingClientRect()
    const over = e.clientX < r.left ? e.clientX - r.left : e.clientX > r.right ? e.clientX - r.right : 0
    setStretch(scrub ? Math.sign(over) * Math.min(14, Math.abs(over) * 0.35) : 0)
  }
  // Ушёл со шкалы — линия гаснет не сразу: рука могла проскочить край.
  const leave = () => { if (!scrub) { clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => { setHover(null); setStretch(0) }, 350) } }
  const stop = () => { setScrub(false); setStretch(0) }
  // Деления под масштаб: при глубоком приближении — доли секунды и засечки.
  const ruler = rulerTicks(view.from, view.to)
  const edges = useMemo(() => lines.flatMap(l => [l.start, l.end]), [lines])
  const visible = (a: number, b: number) => b > view.from && a < view.to
  const hoverLine = hover == null ? undefined : lines.find(l => hover >= l.start && hover < l.end)
  const hoverWho = hoverLine && speakers.find(s => s.id === hoverLine.speaker)
  const hoverPause = hover == null || hoverLine ? undefined : pauses.find(p => hover >= p.start && hover < p.end)
  // Фейд у края — только если за ним ещё есть запись: у начала и конца урока нет.
  const fades = { '--fade-l': view.from > 0.5 ? '28px' : '0px', '--fade-r': view.to < duration - 0.5 ? '28px' : '0px' } as CSSProperties
  return <section ref={section} style={fades} className={'lm-timeline' + (scrub ? ' is-scrubbing' : '')} aria-label="Шкала урока"
    onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onPointerLeave={leave}>
    <div className="lm-row lm-ruler">
      <span />
      <div className="lm-track" ref={track} onDoubleClick={() => setView({ from: 0, to: duration })}>
        {ruler.minor.map(m => <i key={'m' + Math.round(m * 1000)} className="lm-tick" style={{ left: pct(m) }} />)}
        {ruler.major.map(m => <b key={'M' + Math.round(m * 1000)} className="lm-tick is-major" style={{ left: pct(m) }} />)}
        {ruler.major.map(m => <span key={Math.round(m * 1000)} style={{ left: pct(m) }}>{clockFine(m, ruler.digits)}</span>)}
      </div>
    </div>
    {speakers.map(sp => <div className="lm-row" key={sp.id}>
      <LaneLabel label={sp.label} color={TONE[sp.tone].text} onRename={label => onRename(sp.id, label)} />
      <div className="lm-track lm-lane" onPointerDown={start}>
        {lines.filter(l => l.speaker === sp.id && visible(l.start, l.end)).map(l => <i key={l.id} style={{ left: pct(l.start), width: size(l.end - l.start), background: TONE[sp.tone].text }} />)}
      </div>
    </div>)}
    <div className="lm-row">
      <span className="lm-lane-label">Паузы</span>
      <div className="lm-track lm-lane lm-lane-pauses" onPointerDown={start}>
        {pauses.filter(p => visible(p.start, p.end)).map(p => <button type="button" key={p.id} aria-label={`Пауза ${clock(p.start)}, ${span(p.end - p.start)}: ${ACTION_LABEL[p.action]}`}
          className={`lm-pause is-${p.action}${p.id === selected ? ' is-selected' : ''}`} style={{ left: pct(p.start), width: size(p.end - p.start) }}
          onPointerDown={e => e.stopPropagation()} onClick={() => onSelect(p.id)} />)}
      </div>
    </div>
    <div className="lm-row lm-zoom-hint"><span /><div>{zoomed
      ? <><small>Масштаб ×{(duration / len >= 100 ? Math.round(duration / len) : (duration / len).toFixed(1).replace('.0', '').replace('.', ','))} · {clockFine(view.from, ruler.digits)}–{clockFine(view.to, ruler.digits)} · Shift + колёсико — сдвиг</small>
        <button data-hover="layer" type="button" className="lm-zoom-reset" onClick={() => setView({ from: 0, to: duration })}>Весь урок</button></>
      : <small>Cmd + колёсико — масштаб · Shift + колёсико — сдвиг</small>}</div></div>
    <div className="lm-row lm-playhead-row" aria-hidden><span /><div className="lm-track">
      {/* Столбец выбранной паузы: поднимается от её блока через все голоса. */}
      {(() => { const p = pauses.find(x => x.id === selected); return p && visible(p.start, p.end)
        ? <i key={p.id} className="lm-sel-col" style={{ left: pct(Math.max(view.from, p.start)), width: size(Math.min(view.to, p.end) - Math.max(view.from, p.start)) }} /> : null })()}
      {t >= view.from && t <= view.to ? <b className="lm-playhead" style={{ left: pct(t), transform: scrub ? `translateX(${stretch}px)` : undefined }} /> : null}
      {/* Над линией плеера: на краю они совпадают, и линия курсора не должна пропадать. */}
      {hover != null && !scrub && <b className={'lm-hoverhead' + (stretch ? ' is-stretched' : '') + (snapped ? ' is-snapped' : '')} style={{ left: pct(hover), transform: `translateX(${stretch}px)` }} />}
      {hover != null && <span className={'lm-hover-tip' + ((hover - view.from) / len > 0.75 ? ' is-left' : '')} style={{ left: pct(hover), translate: `${stretch}px 0` }}>
        <strong>{clockFine(hover, ruler.digits ? Math.min(3, ruler.digits + 1) : 0)}</strong>{hoverWho ? ' · ' + hoverWho.label : hoverPause ? ' · ' + KIND_LABEL[hoverPause.kind].toLowerCase() : ''}
      </span>}
    </div></div>
  </section>
}

/** Фейд по краям поля, за которыми ещё есть текст (поле листается курсором). */
function fadeInput(el: HTMLInputElement) {
  const apply = () => {
    const start = el.scrollLeft > 1, end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    const mask = start || end ? `linear-gradient(to right, ${start ? 'transparent' : '#000'}, #000 ${start ? 12 : 0}px, #000 calc(100% - ${end ? 12 : 0}px), ${end ? 'transparent' : '#000'})` : ''
    el.style.maskImage = mask
    el.style.setProperty('-webkit-mask-image', mask)
  }
  apply()
  setTimeout(apply, 0) // курсор двигает прокрутку уже после события
}

/** Подпись дорожки: двойной клик — переименовать на месте. Поле лежит поверх
 *  подписи и оформлено одним подчёркиванием: ни рамки, ни отступов, сетка
 *  шкалы не двигается. Enter или клик мимо — сохранить, Esc — отменить. */
function LaneLabel({ label, color, onRename }: { label: string; color: string; onRename: (label: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const done = (save: boolean) => {
    if (save && draft != null && draft.trim() && draft.trim() !== label) onRename(draft.trim())
    setDraft(null)
  }
  return <span className="lm-lane-name" onDoubleClick={() => setDraft(label)} title="Дважды — переименовать">
    <FadeText className="lm-lane-label" style={{ color, visibility: draft == null ? undefined : 'hidden' }}>{label}</FadeText>
    {/* Поле остаётся в колонке подписи: длинное имя листается внутри, а края
        текста уходят в фейд. Подчёркивание — на обёртке, фейд его не задевает.
        Фон поля прозрачный — общее правило фокуса не рисует рамку. */}
    {draft != null && <span className="lm-lane-edit" style={{ borderBottomColor: color }}>
      <input className="lm-lane-input" aria-label={'Имя: ' + label} autoFocus maxLength={60} value={draft} style={{ color, background: 'transparent' }}
        onFocus={e => { e.currentTarget.select(); fadeInput(e.currentTarget) }} onChange={e => { setDraft(e.target.value); fadeInput(e.currentTarget) }}
        onKeyUp={e => fadeInput(e.currentTarget)} onSelect={e => fadeInput(e.currentTarget)} onScroll={e => fadeInput(e.currentTarget)} onBlur={() => done(true)}
        onKeyDown={e => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(false) }} />
    </span>}
  </span>
}

// ── Одна пауза крупно: волна, края тянутся, как в видеоредакторе ─────────────

function PauseDetail({ duration, t, follow, onSeek, pause, pauses, lines, speakerOf, speed, levelAt, onBounds, onAction, onReset, onListen, onStep }: {
  duration: number; t: number; follow: number; onSeek: (t: number) => void; pause: MontagePause; pauses: MontagePause[]; lines: MontageLine[]; speakerOf: (id: string) => MontageSpeaker | undefined; speed: number
  levelAt: (t: number) => number; onBounds: (start: number, end: number) => void; onAction: (a: PauseAction) => void; onReset: () => void
  onListen: (at: number, mode?: 'edited' | 'source') => void; onStep: (dir: -1 | 1) => void
}) {
  // Окно запоминается при выборе паузы (key): иначе при перетаскивании оно
  // ехало бы вместе с краем и тянуть было бы не за что.
  return <PauseDetailBody key={pause.id} {...{ duration, t, follow, onSeek, pause, pauses, lines, speakerOf, speed, levelAt, onBounds, onAction, onReset, onListen, onStep }} win={windowFor(pause, duration)} />
}

function windowFor(p: Pick<MontagePause, 'start' | 'end'>, duration: number) {
  const pad = Math.min(30, Math.max(8, (p.end - p.start) * 0.15))
  return { from: Math.max(0, p.start - pad), to: Math.min(duration, p.end + pad) }
}

function PauseDetailBody({ duration, t, follow, onSeek, pause, pauses, lines, speakerOf, speed, levelAt, onBounds, onAction, onReset, onListen, onStep, win: initialWin }: Parameters<typeof PauseDetail>[0] & { win: { from: number; to: number } }) {
  const [win, setWin] = useState(initialWin)
  const track = useRef<HTMLDivElement>(null)
  // Cmd/Ctrl + колёсико или щипок — масштаб волны вокруг курсора, Shift +
  // колёсико или свайп вбок — сдвиг. Окно — от 4 с до всей записи, не дальше
  // её краёв: за концом урока волны нет.
  const winRef = useRef(win)
  winRef.current = win
  const bounds = useRef({ min: 0, max: 0 })
  bounds.current = { min: 0, max: duration }
  useEffect(() => {
    const el = track.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect(), { min, max } = bounds.current
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
        setWin(w => {
          const l = w.to - w.from, anchor = w.from + frac * l
          const next = Math.min(max - min, Math.max(0.2, l * Math.exp(e.deltaY * 0.01)))
          const from = Math.min(max - next, Math.max(min, anchor - frac * next))
          return { from, to: from + next }
        })
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        const w = winRef.current, l = w.to - w.from
        if (l >= max - min - 0.05) return
        e.preventDefault()
        const from = Math.min(max - l, Math.max(min, w.from + (e.deltaX || e.deltaY) / r.width * l))
        winRef.current = { from, to: from + l }
        setWin(winRef.current)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])
  const [drag, setDrag] = useState<'start' | 'end' | 'seek' | null>(null)
  const length = win.to - win.from
  const ruler = rulerTicks(win.from, win.to, 8)
  // Плеер переставили на шкале урока — волна доводит это место в кадр.
  const followed = useRef(follow)
  useEffect(() => {
    if (followed.current === follow) return
    followed.current = follow
    const w = winRef.current, l = w.to - w.from
    if (t >= w.from && t <= w.to) return
    const from = Math.min(duration - l, Math.max(0, t - l / 2))
    setWin({ from, to: from + l })
  }, [follow, t, duration])
  const x = (s: number) => `${(s - win.from) / length * 100}%`
  const bars = useMemo(() => Array.from({ length: 180 }, (_, i) => {
    const a = win.from + i / 180 * length, b = a + length / 180
    let sum = 0
    for (let k = 0; k < 4; k++) sum += levelAt(a + (b - a) * k / 4)
    return Math.max(0.04, Math.min(1, (sum / 4 + 60) / 46))
  }), [win.from, length, levelAt])
  const index = pauses.indexOf(pause)
  const hit = linesHit(pause, lines)
  const near = lines.filter(l => l.end > win.from && l.start < win.to)

  const timeAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    return Math.min(win.to, Math.max(win.from, win.from + (clientX - r.left) / r.width * length))
  }
  // Клик или ведение по волне (не по ручкам) — перемотка плеера.
  const edges = useMemo(() => lines.flatMap(l => [l.start, l.end]), [lines])
  const lastSnap = useRef<number | undefined>(undefined)
  const magnet = useRef(true)
  const snapTime = (clientX: number) => {
    const raw = timeAt(clientX)
    const edge = magnet.current ? nearestEdge(raw, edges, SNAP_PX / track.current!.getBoundingClientRect().width * length) : undefined
    return { raw, edge, s: edge ?? raw }
  }
  const seekDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    capture(e.currentTarget, e.pointerId)
    setDrag('seek')
    magnet.current = true
    const p = snapTime(e.clientX)
    if (p.edge != null && p.edge === lastSnap.current) { magnet.current = false; lastSnap.current = undefined; onSeek(p.raw) }
    else { lastSnap.current = p.edge; onSeek(p.s) }
  }
  const move = (e: ReactPointerEvent) => {
    if (!track.current) return
    if (!drag) { const p = snapTime(e.clientX); if (p.edge !== lastSnap.current) lastSnap.current = undefined; return }
    if (drag === 'seek') { onSeek(snapTime(e.clientX).s); return }
    const r = track.current.getBoundingClientRect()
    const s = Math.round((win.from + (e.clientX - r.left) / r.width * length) * 100) / 100
    if (drag === 'start') onBounds(Math.max(win.from, Math.min(s, pause.end - 2)), pause.end)
    else onBounds(pause.start, Math.min(win.to, Math.max(s, pause.start + 2)))
  }
  const fit = () => {
    // Сдвинуть края за пределы задетых реплик: реплики первой половины
    // отодвигают начало, второй — конец (край мог уехать через несколько реплик).
    const mid = (pause.start + pause.end) / 2
    const before = hit.filter(l => l.start < mid).reduce((m, l) => Math.max(m, l.end), pause.start)
    const afterHit = hit.filter(l => l.start >= mid).reduce((m, l) => Math.min(m, l.start), pause.end)
    onBounds(Math.round((before + 0.3) * 10) / 10, Math.round((afterHit - 0.3) * 10) / 10)
  }
  const handle = (side: 'start' | 'end') => <button type="button" className={'lm-handle is-' + side} aria-label={side === 'start' ? 'Начало паузы' : 'Конец паузы'}
    style={{ left: x(side === 'start' ? pause.start : pause.end) }}
    onPointerDown={e => { e.stopPropagation(); capture(e.currentTarget, e.pointerId); setDrag(side) }}
    onKeyDown={e => {
      const d = e.key === 'ArrowLeft' ? -0.5 : e.key === 'ArrowRight' ? 0.5 : 0
      if (!d) return
      e.preventDefault()
      if (side === 'start') onBounds(Math.max(win.from, Math.min(pause.start + d, pause.end - 2)), pause.end)
      else onBounds(pause.start, Math.min(win.to, Math.max(pause.end + d, pause.start + 2)))
    }} />

  return <section className="lm-detail" aria-label="Выбранная пауза">
    <header className="lm-detail-head">
      <button data-hover="layer" type="button" className="lm-icon-btn" aria-label="Предыдущая пауза" disabled={index <= 0} onClick={() => onStep(-1)}><ChevronLeft size={18} /></button>
      <div className="lm-detail-title">
        <strong>Пауза {index + 1} из {pauses.length} · {clock(pause.start)}–{clock(pause.end)}</strong>
        <small>{KIND_LABEL[pause.kind]}{pause.board ? ' · кадр меняется' : ''} · {span(pause.end - pause.start)} · {Math.round(pause.level)} дБ{pause.edited ? ' · края изменены' : ''}</small>
      </div>
      <button data-hover="layer" type="button" className="lm-icon-btn" aria-label="Следующая пауза" disabled={index >= pauses.length - 1} onClick={() => onStep(1)}><ChevronRight size={18} /></button>
    </header>
    <div className="lm-wave" ref={track} style={{ '--fade-l': win.from > 0.05 ? '28px' : '0px', '--fade-r': win.to < duration - 0.05 ? '28px' : '0px' } as CSSProperties} onPointerDown={seekDown} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
      <div className="lm-wave-lines">{near.map(l => { const sp = speakerOf(l.speaker); return <i key={l.id} title={`${sp?.label}: ${l.text}`}
        style={{ left: x(Math.max(win.from, l.start)), width: x(win.from + Math.min(win.to, l.end) - Math.max(win.from, l.start)), background: sp ? TONE[sp.tone].text : undefined }} /> })}</div>
      <svg className="lm-wave-bars" viewBox="0 0 180 40" preserveAspectRatio="none" aria-hidden>
        {bars.map((h, i) => <rect key={i} x={i + 0.15} width={0.7} y={20 - h * 19} height={h * 38} rx={0.3} />)}
      </svg>
      <div className={'lm-wave-range is-' + pause.action} style={{ left: x(pause.start), width: x(win.from + pause.end - pause.start) }} />
      {t >= win.from && t <= win.to && <b className="lm-wave-now" style={{ left: x(t) }} />}
      {handle('start')}{handle('end')}
      <div className="lm-wave-ticks" aria-hidden>
        {ruler.minor.map(m => <i key={'m' + Math.round(m * 1000)} className="lm-tick" style={{ left: x(m) }} />)}
        {ruler.major.map(m => <b key={'M' + Math.round(m * 1000)} className="lm-tick is-major" style={{ left: x(m) }} />)}
        {ruler.major.map(m => <span key={Math.round(m * 1000)} style={{ left: x(m) }}>{clockFine(m, ruler.digits)}</span>)}
      </div>
    </div>
    {/* Строка постоянной высоты: подсказка, а при ошибке — плашка на её месте.
        Появляясь, предупреждение не сдвигает волну и кнопки. */}
    <div className="lm-detail-note">{hit.length > 0
      ? <div className="lm-warn" role="alert">
        <AlertTriangle size={15} />
        <FadeText className="lm-warn-text">Край задевает реплику: {speakerOf(hit[0].speaker)?.label} — «{hit[0].text}»</FadeText>
        <button data-hover="layer" type="button" style={btn('S', 'secondary', { height: 28, padding: '0 12px', borderRadius: 9, fontSize: 12 })} onClick={fit}>Отодвинуть края</button>
      </div>
      : <FadeText className="lm-detail-hint">Тяните края паузы · Cmd + колёсико — масштаб · Shift + колёсико — сдвиг</FadeText>}</div>
    <div className="lm-detail-actions">
      <Segmented variant="filter" value={pause.action} onChange={onAction} items={[
        { id: 'cut', label: 'Вырезать' }, { id: 'speed', label: <><span className="lm-long">Ускорить </span>×{speed}</>, title: `Ускорить ×${speed}` }, { id: 'keep', label: 'Оставить' },
      ]} />
      <button data-hover="layer" type="button" style={btn('S', 'secondary')} onClick={() => onListen(pause.start - 4, 'source')}><Headphones size={15} />Прослушать</button>
      <button data-hover="layer" type="button" style={btn('S', 'secondary')} onClick={() => onListen(pause.start - 4, 'edited')}><Play size={14} />Как будет</button>
      {/* Место под кнопку занято всегда: иначе ряд перестраивался при первой правке края. */}
      <button data-hover="layer" type="button" style={btn('S', 'quiet', pause.edited ? undefined : { visibility: 'hidden' })} tabIndex={pause.edited ? undefined : -1} aria-hidden={!pause.edited} onClick={onReset}><RotateCcw size={14} />Края как нашлись</button>
    </div>
  </section>
}

// ── Списки справа ──────────────────────────────────────────────────────────

function PauseHead({ count, speed, onAll, cutTotal, speedTotal }: {
  count: number; speed: number; onAll: (a: PauseAction) => void; cutTotal: number; speedTotal: number
}) {
  return <div className="lm-list-head">
    <p className="lm-lead">Найдено {count} пауз. Вырежем {span(cutTotal)}, ускорим {span(speedTotal)}. Тишина вырезается, тихая работа — ускоряется: в кадре может быть доска.</p>
    <div className="lm-bulk" role="group" aria-label="Для всех пауз">
      {(['cut', 'speed', 'keep'] as const).map(a => { const label = a === 'speed' ? `Ускорить ×${speed}` : ACTION_LABEL[a]
        return <button data-hover="layer" key={a} type="button" title={label + ' — все паузы'} aria-label={label + ' все паузы'} style={btn('S', 'secondary', { minWidth: 0, padding: '0 8px' })} onClick={() => onAll(a)}>{label}</button> })}
    </div>
  </div>
}

function PauseList({ pauses, speed, selected, t, onSelect }: {
  pauses: MontagePause[]; speed: number; selected?: string; t: number; onSelect: (id: string) => void
}) {
  const nowId = pauses.find(p => t >= p.start && t < p.end)?.id
  const nextId = nowId ? undefined : pauses.find(p => p.start > t)?.id
  const pastLast = !nowId && !nextId && pauses.length > 0 && t >= pauses[pauses.length - 1].end
  // Выбранную паузу (со шкалы, стрелками) докручиваем в видимую часть списка —
  // только сам список, не окно: scrollIntoView потянул бы и рамку модалки.
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const row = ref.current?.querySelector<HTMLElement>('.lm-pause-row.is-selected')
    const box = row?.closest<HTMLElement>('.lm-panel-body')
    if (!row || !box || box.scrollHeight <= box.clientHeight) return
    const r = row.getBoundingClientRect(), b = box.getBoundingClientRect(), edge = 24
    if (r.top < b.top + edge) box.scrollTo({ top: box.scrollTop + r.top - b.top - edge, behavior: 'smooth' })
    else if (r.bottom > b.bottom - edge) box.scrollTo({ top: box.scrollTop + r.bottom - b.bottom + edge, behavior: 'smooth' })
  }, [selected])
  return <div className="lm-list" ref={ref}>
    {pauses.map((p, i) => <button type="button" key={p.id} className={'lm-pause-row' + (p.id === selected ? ' is-selected' : '') + (p.id === nowId ? ' is-now' : '') + (p.id === nextId ? ' is-next' : '') + (pastLast && i === pauses.length - 1 ? ' is-past' : '')} aria-pressed={p.id === selected} onClick={() => onSelect(p.id)}>
      <span className={'lm-dot is-' + p.action} />
      <span className="lm-pause-copy"><strong>{i + 1}. {clock(p.start)}–{clock(p.end)}</strong><small>{KIND_LABEL[p.kind]}{p.board ? ' · кадр меняется' : ''} · {span(p.end - p.start)}</small></span>
      <span className={'lm-tag is-' + p.action}>{p.action === 'speed' ? `×${speed}` : ACTION_LABEL[p.action]}</span>
    </button>)}
  </div>
}

function SpeakerList({ speakers, lines, onChange, onListen, onMerge, onAdd, onForget }: {
  speakers: MontageSpeaker[]; lines: MontageLine[]; onChange: (s: MontageSpeaker[]) => void; onListen: (at: number) => void; onMerge: (from: string, into: string) => void; onAdd: () => void; onForget?: () => void
}) {
  const [forgotten, setForgotten] = useState(false)
  const time = talkTime(lines)
  const total = Object.values(time).reduce((a, b) => a + b, 0) || 1
  const patch = (id: string, p: Partial<MontageSpeaker>) => onChange(speakers.map(s => s.id === id ? { ...s, ...p } : s))
  return <div className="lm-list">
    <p className="lm-lead">Голоса разделены по звучанию. Учитель — кто говорит больше всех. Дайте имена: они попадут в расшифровку для учеников.</p>
    {speakers.map(sp => {
      const own = lines.filter(l => l.speaker === sp.id)
      const share = Math.round((time[sp.id] ?? 0) / total * 100)
      return <article key={sp.id} className="lm-speaker" style={{ '--tone': TONE[sp.tone].text, '--tone-bg': TONE[sp.tone].bg } as CSSProperties}>
        <div className="lm-speaker-head">
          <span className="lm-avatar">{initial(sp.label)}</span>
          <label className="lm-name"><span className="lm-visually-hidden">Имя</span>
            <input value={sp.label} aria-label={'Имя: ' + sp.label} onChange={e => patch(sp.id, { label: e.target.value })} /></label>
          <button data-hover="layer" type="button" style={btn('S', 'secondary')} disabled={!own.length} onClick={() => own[0] && onListen(own[0].start)}><Headphones size={15} />Голос</button>
        </div>
        <div className="lm-share"><i style={{ width: share + '%' }} /></div>
        <small className="lm-speaker-meta">{share}% речи · {own.length} реплик</small>
        <div className="lm-speaker-row">
          <Segmented variant="filter" value={sp.role} onChange={role => patch(sp.id, { role })} items={[{ id: 'teacher', label: 'Учитель' }, { id: 'student', label: 'Ученик' }]} />
          {speakers.length > 1 && <div className="lm-merge"><TeacherSelect small clearable={false} search={false} value="" placeholder="Тот же человек, что…"
            options={speakers.filter(s => s.id !== sp.id).map(s => ({ value: s.id, label: s.label }))} onChange={into => into && onMerge(sp.id, into)} /></div>}
        </div>
      </article>
    })}
    <button data-hover="layer" type="button" style={btn('S', 'secondary', { justifySelf: 'start' })} onClick={onAdd}><Plus size={14} />Добавить голос</button>
    {onForget && <p className="lm-lead">Голоса с именами запоминаются только на этом Mac и в следующих уроках подписываются сами. {forgotten
      ? 'Запомненные голоса удалены.'
      : <button data-hover="layer" type="button" className="lm-inline-link" onClick={() => { onForget(); setForgotten(true) }}>Забыть все голоса</button>}</p>}
  </div>
}

/** «Ученик 2» → «2», «Маша» → «М»: у безымянных голосов первая буква одна на всех. */
const initial = (label: string) => label.trim().match(/\d+$/)?.[0] ?? (label.trim().slice(0, 1).toUpperCase() || '?')

function LineList({ lines, speakers, pauses, t, who, onChange, onListen }: {
  lines: MontageLine[]; speakers: MontageSpeaker[]; pauses: MontagePause[]; t: number; who: string; onChange: (l: MontageLine[]) => void; onListen: (at: number) => void
}) {
  const shown = who === 'all' ? lines : lines.filter(l => l.speaker === who)
  const patch = (id: string, p: Partial<MontageLine>) => onChange(lines.map(l => l.id === id ? { ...l, ...p } : l))
  return <div className="lm-list">
    {shown.map(l => {
      const sp = speakers.find(s => s.id === l.speaker)
      const cut = pauses.some(p => p.action === 'cut' && l.start >= p.start && l.end <= p.end)
      const now = t >= l.start && t < l.end
      return <div key={l.id} className={'lm-line' + (now ? ' is-now' : '') + (cut ? ' is-cut' : '')}>
        <div className="lm-line-head">
          <button data-hover="layer" type="button" className="lm-time-btn" aria-label={'Слушать с ' + clock(l.start)} onClick={() => onListen(l.start)}><Play size={12} />{clock(l.start)}</button>
          <div className="lm-line-who"><TeacherSelect small clearable={false} search={false} value={l.speaker} options={speakers.map(s => ({ value: s.id, label: s.label }))}
            onChange={v => v && patch(l.id, { speaker: v })} accent={sp ? TONE[sp.tone].text : undefined} accentBg={sp ? TONE[sp.tone].bg : undefined}
            triggerStyle={sp ? { background: TONE[sp.tone].bg, color: TONE[sp.tone].text, fontWeight: 700 } : undefined} /></div>
          {cut && <span className="lm-tag is-cut">вырезано</span>}
        </div>
        <GrowTextarea className="lm-line-text" aria-label={'Реплика ' + clock(l.start)} value={l.text} onChange={text => patch(l.id, { text })} />
      </div>
    })}
  </div>
}

/** Итоги урока: кто сколько говорил, вопросы и ожидание ответа — по репликам и голосам. */
function StatsPanel({ lines, speakers, duration, trend }: { lines: MontageLine[]; speakers: MontageSpeaker[]; duration: number; trend?: { id: string; title: string; current?: boolean; stats?: LessonStatsSummary }[] }) {
  const st = useMemo(() => lessonStats(lines, speakers, duration), [lines, speakers, duration])
  // Текущий урок — по живым данным окна, остальные — по сохранённым итогам.
  const rows = (trend ?? []).map(r => r.current ? { ...r, stats: summarizeStats(st, speakers) } : r).filter(r => r.stats)
  const part = participation(rows)
  const pct = (x: number) => Math.round(x * 100) + '%'
  const silent = speakers.filter(sp => st.silentStudents.includes(sp.id))
  return <div className="lm-list">
    <p className="lm-lead">Считается по репликам и голосам. Голоса учеников назначьте во вкладках «Голоса» и «Текст» — итоги обновятся сразу.</p>
    <div className="lm-stat">
      <div className="lm-stat-split"><i style={{ width: pct(st.teacherShare), background: TONE.purple.text }} /><i style={{ width: pct(st.studentShare), background: TONE.blue.text }} /></div>
      <div className="lm-stat-row"><span>Учитель <strong>{pct(st.teacherShare)}</strong></span><span>Ученики <strong>{pct(st.studentShare)}</strong></span><span>Тишина <strong>{pct(st.silenceShare)}</strong></span></div>
    </div>
    <div className="lm-stat lm-stat-grid">
      <div><strong>{st.questions}</strong><small>вопросов учителя</small></div>
      <div><strong>{st.answered}</strong><small>с ответом ученика</small></div>
      <div><strong>{st.waitMedian != null ? span(st.waitMedian) : '—'}</strong><small>ждали ответа</small></div>
      <div><strong>{span(st.longestMonologue)}</strong><small>самый длинный монолог</small></div>
    </div>
    {st.bySpeaker.map(b => { const sp = speakers.find(x => x.id === b.id)!; return <div key={b.id} className="lm-stat-speaker" style={{ '--tone': TONE[sp.tone].text } as CSSProperties}>
      <div className="lm-stat-row"><FadeText className="lm-stat-name">{sp.label}</FadeText><span>{span(b.seconds)} · {b.lines} реплик</span></div>
      <div className="lm-share"><i style={{ width: pct(b.share) }} /></div>
    </div> })}
    {silent.length > 0 && <p className="lm-stat-warn">Не сказали ни слова: {silent.map(s => s.label).join(', ')}.</p>}
    {rows.length > 1 && <>
      <h4 className="lm-stat-title">По урокам курса</h4>
      {rows.map(r => <div key={r.id} className={'lm-trend-row' + (r.current ? ' is-current' : '')}>
        <FadeText className="lm-trend-name">{r.title}</FadeText>
        <div className="lm-stat-split lm-trend-bar"><i style={{ width: pct(r.stats!.teacherShare), background: TONE.purple.text }} /><i style={{ width: pct(1 - r.stats!.teacherShare), background: TONE.blue.text }} /></div>
        <span className="lm-trend-num">{pct(r.stats!.teacherShare)}</span>
        <span className="lm-trend-num">{r.stats!.answered}/{r.stats!.questions}</span>
      </div>)}
      <small className="lm-trend-legend">Доля речи учителя · вопросы с ответом</small>
      {part.students.length > 0 && <p className="lm-lead">Участие: {part.students.map(s => `${s.label} — ${s.spoke} из ${part.lessons}`).join(', ')}.</p>}
    </>}
  </div>
}

function SettingsPanel({ settings, onChange, found, edited, onResetAll }: {
  settings: MontageSettings; onChange: (s: MontageSettings) => void; found: number; edited: number; onResetAll: () => void
}) {
  const set = <K extends keyof MontageSettings>(k: K, v: MontageSettings[K]) => onChange({ ...settings, [k]: v })
  const row = (label: string, hint: string, control: React.ReactNode) => <div className="lm-setting"><div><strong>{label}</strong><small>{hint}</small></div>
    <HScrollFade fade="var(--color-bg-3)" padTop={0} padBottom={0}>{control}</HScrollFade></div>
  return <div className="lm-list">
    <p className="lm-lead">Паузы ищутся по громкости, без ИИ. Сейчас найдено: <strong>{found}</strong>. Ручные правки сохраняются при смене настроек.</p>
    {row('Минимальная пауза', 'Короче — обычная заминка речи, её не трогаем.', <div className="lm-stepper">
      <button data-hover="layer" type="button" className="lm-icon-btn" aria-label="Меньше" disabled={settings.minPause <= 5} onClick={() => set('minPause', Math.max(5, settings.minPause - 5))}><Minus size={16} /></button>
      <span>{settings.minPause} с</span>
      <button data-hover="layer" type="button" className="lm-icon-btn" aria-label="Больше" disabled={settings.minPause >= 120} onClick={() => set('minPause', Math.min(120, settings.minPause + 5))}><Plus size={16} /></button>
    </div>)}
    {row('Что считать тишиной', 'В шумном классе тихая работа громче — порог выше.', <Segmented variant="filter" value={settings.sensitivity} onChange={v => set('sensitivity', v)}
      items={[{ id: 'strict', label: 'Полная' }, { id: 'normal', label: 'Обычная' }, { id: 'loud', label: 'Шумный класс' }]} />)}
    {row('Запас у краёв', 'Сколько тишины оставить, чтобы речь не обрывалась.', <Segmented variant="filter" value={String(settings.padding) as '0' | '0.5' | '1'} onChange={v => set('padding', Number(v))}
      items={[{ id: '0', label: '0 с' }, { id: '0.5', label: '0,5 с' }, { id: '1', label: '1 с' }]} />)}
    {row('Тихая работа', 'Ученики решают, учитель пишет на доске. Полная тишина всегда вырезается.', <Segmented variant="filter" value={settings.quietAction} onChange={v => set('quietAction', v)}
      items={[{ id: 'speed', label: 'Ускорить' }, { id: 'cut', label: 'Вырезать' }, { id: 'keep', label: 'Оставить' }]} />)}
    {row('Ускорение', 'Во сколько раз быстрее идёт ускоренная пауза.', <Segmented variant="filter" value={String(settings.speed) as '2' | '4' | '8'} onChange={v => set('speed', Number(v) as 2 | 4 | 8)}
      items={[{ id: '2', label: '×2' }, { id: '4', label: '×4' }, { id: '8', label: '×8' }]} />)}
    {edited > 0 && <button data-hover="layer" type="button" style={btn('S', 'secondary', { justifySelf: 'start' })} onClick={onResetAll}><RotateCcw size={14} />Сбросить ручные правки ({edited})</button>}
  </div>
}
