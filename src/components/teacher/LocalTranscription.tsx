import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, AudioLines, Check, ChevronRight, Eye, RotateCcw, Upload, X } from '../icons/appIcons'
import ScrollFade from '../ScrollFade'
import LessonTranscriptPanel from '../LessonTranscriptPanel'
import MontageAction from './MontageAction'
import './profileIntegrations.css'
import './localTranscription.css'
import { btn } from '../../lib/pillStyles'
import { getOwnerId, getViewAs } from '../../lib/owner'
import type { LessonStatsSummary } from '../../lib/lessonMontage'
import { LocalTranscriptionUnavailable, applyModuleVoices, localRequest, readTranscript, transcriptTime, type LocalDraft } from '../../lib/localTranscription'

const tokenKey = (owner: string) => 'iskra.transcription.device.' + owner

export function useTranscriptionOwner() {
  const [owner, setOwner] = useState('')
  useEffect(() => {
    let active = true
    if (!getViewAs()) void getOwnerId().then(id => { if (active) setOwner(id || '') })
    return () => { active = false }
  }, [])
  return owner
}

export function TranscriptionModuleCard({ owner, onConnected }: { owner: string; onConnected?: () => void }) {
  const [connected, setConnected] = useState(() => !!localStorage.getItem(tokenKey(owner)))
  const downloadKey = 'iskra.transcription.downloadStarted.' + owner
  const [downloadStarted, setDownloadStarted] = useState(() => connected || localStorage.getItem(downloadKey) === '1')
  const guide = useRef<HTMLDivElement>(null)
  const guideVideo = useRef<HTMLVideoElement>(null)
  const [guideRun, setGuideRun] = useState(0)
  const [guidePlaying, setGuidePlaying] = useState(false)
  const setupId = useId()
  const [showSetup, setShowSetup] = useState(false)
  const [downloading, setDownloading] = useState(false)
  useEffect(() => {
    if (!downloading) return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 4000
    const timer = window.setTimeout(() => setDownloading(false), delay)
    return () => window.clearTimeout(timer)
  }, [downloading])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function change() {
    setBusy(true)
    setMessage('')
    try {
      if (connected) {
        try {
          await localRequest('/connect', localStorage.getItem(tokenKey(owner)) || '', {
            method: 'DELETE', signal: AbortSignal.timeout(3000),
          })
        } catch {
          // Forget this browser's pairing even when the companion cannot revoke it.
        }
        setDownloadStarted(true)
        localStorage.setItem(downloadKey, '1')
        localStorage.removeItem(tokenKey(owner))
      } else {
        const { token } = await localRequest('/connect', '', { method: 'POST' })
        if (typeof token !== 'string' || !token) throw new Error('Не удалось подключить компьютер. Попробуйте ещё раз.')
        localStorage.setItem(tokenKey(owner), token)
      }
      setConnected(!connected)
      if (!connected) onConnected?.()
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  return <section className="transcription-module" aria-label="Расшифровка уроков">
    <header className="transcription-module-header">
      <span className="transcription-module-icon"><AudioLines size={22} aria-hidden /></span>
      <div className="transcription-module-title">
        <h3>Расшифровка уроков</h3>
        <p>Текст записи и таймкоды глав · Mac с Apple Silicon</p>
      </div>
      <span className="transcription-module-status" data-connected={connected}>
        {connected ? 'Доступ сохранён' : 'Не подключён'}
      </span>
    </header>
    <div className="transcription-module-body">
      <p>{connected
        ? 'Для работы запустите start.command на этом Mac и оставьте Терминал открытым. Затем откройте вкладку «Запись» в конструкторе курса.'
        : 'Скачайте ZIP-архив на тот Mac, на котором будете расшифровывать уроки.'}</p>
      <div className="integration-steps transcription-steps" data-connected={connected}>
        {connected ? <span className="transcription-step-complete" role="img" aria-label="Архив для Mac" title="Архив для Mac"><Check size={16} aria-hidden/></span> :
          <a className="integration-action transcription-step" data-primary={!downloadStarted}
            data-phase={downloading ? 'download' : 'idle'} href="/downloads/iskra-transcription-mac.zip" download
            aria-disabled={downloading || busy} onClick={event => {
              if (downloading || busy) { event.preventDefault(); return }
              setMessage('')
              localStorage.setItem(downloadKey, '1')
              setDownloadStarted(true)
              setDownloading(true)
            }}>
            <span className="integration-step-number">{downloadStarted && !downloading ? <Check size={13} aria-hidden/> : '1'}</span>
            <span>{downloading ? 'Скачивание…' : downloadStarted ? 'Скачать ещё раз' : 'Скачать для Mac'}</span>
          </a>}
        {connected ? <span className="transcription-step-complete" role="img" aria-label="Запуск на Mac" title="Запуск на Mac"><Check size={16} aria-hidden/></span> : <>
          <ArrowRight size={16} className="integration-step-arrow" aria-hidden />
          <button type="button" className="integration-action transcription-step-label" disabled={!downloadStarted || downloading}
            data-active={downloadStarted && !downloading} onClick={() => {
              setGuideRun(value => value + 1)
              setGuidePlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
              requestAnimationFrame(() => guide.current?.scrollIntoView({ block: 'nearest' }))
            }}>
            <span className="integration-step-number">2</span> Запуск на Mac
          </button>
          <ArrowRight size={16} className="integration-step-arrow" aria-hidden />
        </>}
        <button className="integration-action transcription-step" data-phase={connected ? 'done' : busy ? 'connecting' : 'idle'}
          aria-label={connected ? 'Готово' : undefined} title={connected ? 'Компьютер подключён' : undefined}
          data-primary={downloadStarted && !downloading && !connected}
          disabled={!downloadStarted || downloading || connected || busy || !owner} onClick={change}>
          {connected ? <Check size={16} aria-hidden/> : <span className="integration-step-number">3</span>}
          {!connected && <span>{busy ? 'Подключаем…' : 'Подключить компьютер'}</span>}
        </button>
        {connected && <button className="integration-action integration-disconnect" disabled={busy || !owner} onClick={change}
          aria-label={busy ? 'Отключаем…' : 'Отключить компьютер'}>
          {busy ? 'Отключаем…' : 'Отключить'}
        </button>}
      </div>
      {connected && <button type="button" className="integration-action" aria-expanded={showSetup}
        aria-controls={setupId} onClick={() => { setShowSetup(value => !value); setGuideRun(value => value + 1); setGuidePlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) }}>
        {showSetup ? 'Скрыть инструкцию' : 'Как запустить модуль'}
      </button>}
      <div id={setupId} aria-live="polite" className="transcription-setup">
        {downloadStarted && !downloading && (!connected || showSetup) && <>
          {guideRun > 0 && <div ref={guide} className="transcription-launch-guide">
            {/* Видео, а не GIF: в GIF 64 цвета, и интерфейс шёл полосами. */}
            <video ref={guideVideo} key={guideRun} src="/guides/mac-launch-recorded.mp4" poster="/guides/mac-launch-recorded.jpg"
              width="1280" height="788" muted playsInline loop autoPlay={guidePlaying} preload="metadata"
              onPlay={() => setGuidePlaying(true)} onPause={() => setGuidePlaying(false)}
              aria-label="Полный путь: запуск модуля на Mac, подключение, расшифровка и проверка результата" />
            <div className="transcription-guide-actions">
              <button type="button" className="integration-action" onClick={() => { const video = guideVideo.current; if (video) void (video.paused ? video.play() : video.pause()) }}>{guidePlaying ? 'Остановить' : 'Запустить'}</button>
              <button type="button" className="integration-action" onClick={() => { const video = guideVideo.current; if (video) { video.currentTime = 0; void video.play() } }}>Показать сначала</button>
            </div>
          </div>}
          <h4>Что делать с ZIP-архивом</h4>
          <ol>
            <li>Когда загрузка закончится, откройте папку «Загрузки» в Finder. Дважды нажмите на <code>iskra-transcription-mac.zip</code>. Если уже появилась папка <code>Iskra</code>, откройте её.</li>
            <li>В папке <code>Iskra</code> дважды нажмите на <code>start.command</code>. При первом запуске в Терминале начнётся загрузка моделей.
              <details className="transcription-blocked">
                <summary><ChevronRight size={16} aria-hidden />Mac пишет «Файл не был открыт»?</summary>
                <p>Если Apple не удалось проверить файл, нажмите «Готово». Продолжайте, только если вы сами скачали этот архив из Искры и доверяете ему.</p>
                <a className="integration-action" href="x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Security">Открыть настройки Mac</a>
                <video controls playsInline preload="none" poster="/guides/mac-launch.jpg" aria-label="Как разрешить запуск start.command на Mac" src="/guides/mac-launch.mp4" />
                <p>Если настройки не открылись, в меню Apple выберите «Системные настройки», затем «Конфиденциальность и безопасность».</p>
                <p>В разделе <strong>«Безопасность»</strong> (внизу страницы) проверьте имя файла. Найдите сообщение о блокировке <code>start.command</code> и нажмите рядом с ним <strong>«Все равно открыть»</strong>. В следующем окне ещё раз выберите «Все равно открыть» или «Открыть». Если Mac попросит, введите пароль или используйте Touch ID.</p>
                <p>Когда откроется Терминал, переходите к следующему пункту.</p>
              </details>
            </li>
            <li>Дождитесь строки <code>Running on http://127.0.0.1:18764</code>. Оставьте Терминал открытым и вернитесь в Искру. {connected ? 'Откройте вкладку «Запись» в конструкторе курса.' : 'Нажмите «Подключить компьютер». Когда появятся галочка и «Доступ сохранён», подключение завершено.'}</li>
            <li>Откройте «Конструктор», выберите курс и урок, затем вкладку «Запись». Добавьте файл или ссылку и нажмите «Начать расшифровку». Терминал должен оставаться открытым всё время обработки.</li>
          </ol>
        </>}
      </div>
      {message && <p className="transcription-module-error" role="alert">{message}</p>}
    </div>
  </section>
}

const stages = ['Видео', 'Распознаём речь', 'Разделяем голоса', 'Ищем паузы', 'Читаем слайды', 'Собираем главы']
type JobProgress = { current: number; total: number; unit: 'seconds' | 'frames' | 'chapters' | 'bytes' }
const PACE_KEY = 'iskra.transcription.pace'
function readPace(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PACE_KEY) || '{}') } catch { return {} }
}
function timeLeft(seconds: number) {
  if (seconds < 60) return 'меньше минуты'
  const minutes = Math.ceil(seconds / 60)
  return minutes < 60 ? minutes + ' мин' : Math.floor(minutes / 60) + ' ч ' + (minutes % 60) + ' мин'
}

// Оценка «сколько осталось». Текущий шаг — по скорости с момента, как мы его увидели:
// пока прогресс стоит, скорость падает и время растёт, в минус не уходит. Следующие
// шаги — по прошлым обработкам на этом Mac (секунды работы на секунду записи).
function useTimeLeft(steps: string[], step: string, progress: JobProgress | undefined, running: boolean) {
  const track = useRef({ step: '', since: 0, fromStart: false, base: null as null | { at: number; current: number }, duration: 0 })
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => {
    if (!running) return
    const at = Date.now()
    const last = track.current
    if (last.step !== step) {
      if (last.step && last.fromStart && last.duration > 0 && steps.indexOf(last.step) > 0) {
        const pace = readPace(), measured = (at - last.since) / 1000 / last.duration
        pace[last.step] = pace[last.step] ? (pace[last.step] + measured) / 2 : measured
        try { localStorage.setItem(PACE_KEY, JSON.stringify(pace)) } catch { /* оценка без истории */ }
      }
      track.current = { step, since: at, fromStart: !!last.step, base: null, duration: last.duration }
    }
    const current = track.current
    if (progress?.unit === 'seconds') current.duration = progress.total
    if (progress && (!current.base || progress.current < current.base.current)) current.base = { at, current: progress.current }
  }, [steps, step, progress, running])
  if (!running) return ''
  const { since, base, duration } = track.current
  const pace = readPace()
  let left: number | undefined
  if (progress && progress.total > 0) {
    const done = base ? progress.current - base.current : 0, elapsed = base ? (now - base.at) / 1000 : 0
    if (done > 0 && elapsed > 3) left = (progress.total - progress.current) * elapsed / done
  } else if (pace[step] && duration) {
    const expected = pace[step] * duration, elapsed = (now - since) / 1000
    left = Math.max(expected - elapsed, elapsed / 9)
  }
  if (left === undefined) return progress || (pace[step] && duration) ? 'считаем, сколько осталось…' : ''
  const later = steps.slice(steps.indexOf(step) + 1)
  if (duration && later.every(s => pace[s])) return 'осталось ≈ ' + timeLeft(left + later.reduce((sum, s) => sum + pace[s] * duration, 0))
  return 'до конца шага ≈ ' + timeLeft(left)
}

type Pending = { id: string; source: string; fileSignature?: string }
const megabytes = (bytes: number) => (bytes / 1048576).toFixed(1) + ' МБ'
const fileSignature = (file: File) => JSON.stringify([file.name, file.size, file.lastModified])
type Props = { owner: string; lessonKey: string; source: string; file?: File | null; existing?: LocalDraft; published?: boolean; onApply: (draft: LocalDraft) => Promise<boolean>
  /** Уроки курса с итогами монтажа — для динамики во вкладке «Итоги». */
  trend?: { id: string; title: string; current?: boolean; stats?: LessonStatsSummary }[] }

function readPending(owner: string, lessonKey: string, source: string, file?: File | null): Pending | null {
  try {
    const job = JSON.parse(localStorage.getItem('iskra.transcription.job.' + JSON.stringify([owner, lessonKey])) || 'null')
    return job?.source === source.trim() && typeof job.id === 'string' && (!file || job.fileSignature === fileSignature(file)) ? job : null
  } catch { return null }
}

export type TranscriptRail = {
  draft: LocalDraft
  change: (value: LocalDraft) => void
  saving: boolean
}

/** Время реплики целиком и одной ширины во всём списке: 00:06 … 59:59, а если в записи есть часы — 00:00:06 … 02:20:20. */
function lineClock(seconds: number, withHours: boolean) {
  const s = Math.max(0, Math.floor(seconds)), two = (n: number) => String(n).padStart(2, '0')
  const mmss = two(Math.floor(s % 3600 / 60)) + ':' + two(s % 60)
  return withHours ? two(Math.floor(s / 3600)) + ':' + mmss : two(Math.floor(s / 60)) + ':' + two(s % 60)
}

export function RecordingLines({rail, fill}: {rail: TranscriptRail; fill?: boolean}) {
  const [editing, setEditing] = useState<number | null>(null)
  const {draft, change, saving} = rail
  const withHours = draft.transcript.segments.some(s => s.start >= 3600)
  // fill — в левой рельсе: карточка занимает всю высоту колонки.
  return <section className={'recording-lines' + (fill ? ' is-fill' : '')} aria-label="Реплики записи">
    <header><AudioLines size={16}/><strong>Реплики</strong><small>{draft.transcript.segments.length}</small></header>
    <ScrollFade maxHeight={fill ? '100%' : 'min(32dvh, 280px)'} fadeHeight={12} style={fill ? { flex: 1, minHeight: 0 } : undefined}>
      {/* Колонка времени — по формату списка: 5 знаков без часов, 8 с часами. */}
      <div style={{'--time-chars': withHours ? 8 : 5} as CSSProperties}>{draft.transcript.segments.map((line,index) => <div key={index} className="transcript-line">
        <time>{lineClock(line.start, withHours)}</time>
        {editing === index ? <span className="transcript-line-text" data-text={line.text + ' '}>
          <textarea rows={1} autoFocus aria-label={'Реплика ' + (index+1)} value={line.text} disabled={saving}
            onBlur={() => setEditing(null)} onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur() }}
            onChange={e => change({...draft, transcript:{...draft.transcript, segments:draft.transcript.segments.map((s,i) =>
              i === index ? {...s,text:e.target.value} : s)}})}/>
        </span> : <button type="button" disabled={saving} aria-label={'Редактировать реплику ' + (index+1)} onClick={() => setEditing(index)}>{line.text || 'Введите текст'}</button>}
      </div>)}</div>
    </ScrollFade>
  </section>
}

export function TranscriptionAction(props: Props & { children: (action: React.ReactNode, rail?: TranscriptRail) => React.ReactNode }) {
  const connected = !!props.owner && !!localStorage.getItem(tokenKey(props.owner))
  const jobKey = props.lessonKey
  const storageKey = 'iskra.transcription.job.' + JSON.stringify([props.owner, jobKey])
  const [view, setView] = useState<'entry' | 'setup' | 'review' | 'preview'>(() =>
    connected && !localStorage.getItem(storageKey + '.draft') && readPending(props.owner, jobKey, props.source, props.file) ? 'review' : 'entry')
  const draftKey = storageKey + '.draft'
  const [working, setWorking] = useState<LocalDraft | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null')
      return saved?.transcript?.source === props.source.trim() && (!props.file || saved.fileSignature === fileSignature(props.file)) && readTranscript(saved.transcript) && Array.isArray(saved.timecodes) ? saved : null
    } catch { return null }
  })
  const [localSaveFailed, setLocalSaveFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const draft = working ?? props.existing
  function change(value: LocalDraft) {
    setFailed(false); setWorking(value)
    try { localStorage.setItem(draftKey, JSON.stringify({...value, fileSignature: props.file ? fileSignature(props.file) : undefined})); setLocalSaveFailed(false) }
    catch { setLocalSaveFailed(true) }
  }
  const apply = async () => {
    if (!working || saving) return
    setSaving(true)
    try {
      if (!await props.onApply(working)) throw new Error()
      localStorage.removeItem(storageKey)
      localStorage.removeItem(draftKey)
      setWorking(null)
      setFailed(false)
    } catch { setFailed(true) }
    finally { setSaving(false) }
  }
  if (!props.owner || (!props.source && !props.file && !draft && !readPending(props.owner, jobKey, props.source))) return <>{props.children(null)}</>
  if (view !== 'entry') return <ScrollFade maxHeight="100%" style={{ flex: 1, minHeight: 0 }}>
    {view === 'review' ? <Review {...props} lessonKey={jobKey} onClose={() => setView('entry')}
      onReady={result => { change(result); setView('entry') }} /> :
      <section className="transcription-inline">
        <button type="button" style={btn('S','secondary')} onClick={() => setView('entry')}>К записи урока</button>
        {view === 'setup' ? <TranscriptionModuleCard owner={props.owner} onConnected={() => setView('review')} /> :
          draft && <LessonTranscriptPanel transcript={draft.transcript} time={-1} />}
      </section>}
  </ScrollFade>
  const open = () => setView(connected ? 'review' : 'setup')
  if (!draft) return <>{props.children(<button type="button" className="transcription-rail-action" onClick={open}>
    <AudioLines size={17} />Расшифровать видео
  </button>)}</>
  const badChapter = draft.timecodes.some((c,i,all) => !c.label.trim() || !/^\d+(?::[0-5]\d){1,2}$/.test(c.time) || (i > 0 && c.seconds <= all[i-1].seconds))
  const badLine = draft.transcript.segments.some(line => !line.text.trim())
  const rail = {draft, change, saving}
  const actions = <>
    {localSaveFailed && <small role="alert">Не удалось сохранить черновик в браузере. Не обновляйте страницу до сохранения в урок.</small>}
    {(failed || badChapter || badLine) && <small role="alert">{failed ? 'Не удалось сохранить. Попробуйте ещё раз.' : badChapter ? 'Проверьте названия и время глав.' : 'Заполните пустую реплику.'}</small>}
    <div className="transcript-tools">
      {working ? <button className="transcription-rail-action" disabled={saving || badChapter || badLine} onClick={apply}>
        <Check size={15}/>{saving ? 'Сохраняем…' : 'Сохранить'}</button> :
        <span className="transcript-saved" role="status"><Check size={15}/>Добавлено</span>}
      <button aria-label="Повторить обработку" title="Повторить обработку" disabled={saving} onClick={open}><RotateCcw size={15}/></button>
      <MontageAction draft={draft} change={change} disabled={saving} file={props.file} token={connected ? localStorage.getItem(tokenKey(props.owner)) || undefined : undefined} trend={props.trend} />
      <button aria-label="Посмотреть как ученик" title="Посмотреть как ученик" onClick={() => setView('preview')}><Eye size={16}/></button>
    </div>
  </>
  if (!props.source && !props.file) return <section className="transcription-inline">
    <p>Расшифровка загруженного файла восстановлена. Для воспроизведения выберите исходное видео снова.</p>
    <RecordingLines rail={rail}/>{actions}
  </section>
  return <>{props.children(actions,rail)}</>
}

function Review({ owner, lessonKey, source, file, onReady, onClose }: Props & { onReady: (result: LocalDraft) => void; onClose: () => void }) {
  const key = 'iskra.transcription.job.' + JSON.stringify([owner, lessonKey])
  const token = localStorage.getItem(tokenKey(owner)) || ''
  const [pending, setPending] = useState(() => readPending(owner, lessonKey, source, file))
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState<JobProgress>()
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [retry, setRetry] = useState(0)
  // Дорожки участников (Zoom пишет звук каждого отдельным файлом): голоса — точно.
  const [tracks, setTracks] = useState<File[]>([])
  const readyRef = useRef(onReady)
  useEffect(() => { readyRef.current = onReady }, [onReady])
  async function start() {
    setError('')
    setUnavailable(false)
    const form = new FormData()
    if (file) form.append('video', file)
    else form.append('link', source.trim())
    for (const track of tracks) form.append('tracks', track)
    setBusy(true)
    try {
      const { id } = await localRequest('/jobs', token, { method: 'POST', body: form })
      const job = { id, source: source.trim(), fileSignature: file ? fileSignature(file) : undefined }
      localStorage.setItem(key, JSON.stringify(job))
      setPending(job)
    } catch (e) { setUnavailable(e instanceof LocalTranscriptionUnavailable); setError((e as Error).message) }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!pending) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    async function poll(job: Pending) {
      try {
        const state = await localRequest('/jobs/' + job.id, token)
        if (!active) return
        setError(''); setUnavailable(false)
        setProgress(state.progress)
        setStage(state.stage + (state.bytes ? ' · ' + megabytes(state.bytes) : ''))
        if (state.error) throw new Error(state.stage)
        if (!state.done) { timer = setTimeout(() => void poll(job), 1000); return }
        // Паузы и громкость от модуля (если он уже обновлён) — для окна монтажа.
        const read = readTranscript({ source: job.source, segments: state.segments, montage: state.montage })
        if (!read) throw new Error('Нет реплик для проверки.')
        // Голоса от модуля: реплики сразу с говорящими, узнанные — по имени.
        const { transcript, voices } = applyModuleVoices(read, state.voices)
        readyRef.current({ transcript, ...(voices ? { voices } : {}), timecodes: state.chapters.map((c: { start: number; title: string }) =>
          ({ seconds: c.start, time: transcriptTime(c.start), label: c.title })) })
      } catch (e) {
        if (!active) return
        const lost = e instanceof LocalTranscriptionUnavailable
        setUnavailable(lost); setError((e as Error).message)
        if (lost) timer = setTimeout(() => void poll(job), 5000)
      }
    }
    void poll(pending)
    const reconnect = () => { setRetry(value => value + 1) }
    window.addEventListener('online', reconnect)
    return () => { active = false; clearTimeout(timer); window.removeEventListener('online', reconnect) }
  }, [pending, token, retry])
  const currentStep = Math.max(0, stages.findIndex(s => stage.startsWith(s)))
  const eta = useTimeLeft(stages, stages[currentStep], progress, !!pending && !error && !!stage)
  const metric = progress?.unit === 'seconds' ? transcriptTime : progress?.unit === 'bytes' ? megabytes : (n: number) => String(n)
  return <section className="transcription-inline">
    <header className="transcription-inline-head"><span className="transcription-mark"><AudioLines size={21}/></span>
      <div><strong>Расшифровка урока</strong><small>Обработка на вашем компьютере</small></div>
      <button type="button" aria-label="К записи урока" disabled={busy} style={btn('S','secondary')} onClick={onClose}><X size={16}/></button>
    </header>
    <div className="transcription-form">
    {!pending && <p className="transcription-hint">Используем запись этого урока. После обработки вы сможете проверить текст и главы.</p>}
    {!pending && <label className="transcription-picker">
      <Upload size={18} /><strong>{tracks.length ? `Дорожек участников: ${tracks.length}` : 'Дорожки участников — необязательно'}</strong>
      <small>{tracks.length ? tracks.map(t => t.name).join(', ') : 'Zoom умеет сохранять звук каждого отдельным файлом. С ними голоса подпишутся точно, по именам файлов.'}</small>
      <input type="file" multiple accept="audio/*,.m4a" aria-label="Дорожки участников" disabled={busy} onChange={e => setTracks([...(e.target.files ?? [])])} />
    </label>}
    {pending && !error && <>
      <small className="transcription-hint" aria-live="polite">{stage || 'Проверяем обработку…'}</small>
      <p className="transcription-hint">Можно обновить страницу и вернуться в этот урок. Принятое задание остаётся на Mac. Если интернет пропадёт во время скачивания, модуль дождётся связи.</p>
      <ol className="transcription-job-steps">{stages.map((step, i) => {
        const active = i === currentStep
        const percent = active && progress && progress.total > 0 ? Math.min(100, Math.max(0, Math.round(progress.current / progress.total * 100))) : undefined
        return <li key={step} aria-current={active ? 'step' : undefined}>
          {active && <span className="transcription-fill" style={{width: (percent ?? 0) + '%'}} />}
          <span className="transcription-number">{i < currentStep ? <Check size={14} /> : i + 1}</span>
          <strong>{step}</strong>{active && percent !== undefined && <span className="transcription-percent" role="progressbar" aria-label={step} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>{percent}%</span>}
        </li>
      })}</ol>
      {(eta || (progress && progress.total > 0)) && <small className="transcription-hint">
        {progress && progress.total > 0 && <>{metric(progress.current)} из {metric(progress.total)}{progress.unit === 'bytes' ? '' : ' ' + (progress.unit === 'frames' ? 'кадров' : progress.unit === 'chapters' ? 'глав' : 'записи')}{eta && ' · '}</>}
        {eta && (progress && progress.total > 0 ? eta : eta[0].toUpperCase() + eta.slice(1))}
      </small>}
    </>}
    {error && <div role="alert" className="transcription-recovery">
      <strong>{unavailable ? 'Модуль недоступен' : 'Не удалось завершить расшифровку'}</strong>
      <p>{error}</p>
      {unavailable && pending && <p>Задание сохранено. Проверяем связь автоматически. Если модуль работает, обработка продолжается на Mac.</p>}
      {pending && (unavailable
        ? <button type="button" style={btn('M','secondary')} onClick={() => { setError(''); setUnavailable(false); setRetry(value => value + 1) }}>Проверить связь</button>
        : <button type="button" style={btn('M','secondary')} onClick={() => { setPending(null); localStorage.removeItem(key); setError(''); setStage(''); setProgress(undefined) }}>Начать заново</button>)}
    </div>}
    </div>
    {!pending ?
      <button className="transcription-start" disabled={busy} style={btn('M','primary')} onClick={start}><AudioLines size={16} />{busy ? 'Передаём запись…' : 'Начать расшифровку'}</button> : undefined}
  </section>
}
