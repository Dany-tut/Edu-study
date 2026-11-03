import { useEffect, useRef, useState } from 'react'
import { ArrowRight, AudioLines, Check, ChevronRight, Eye, RotateCcw, X } from '../icons/appIcons'
import ScrollFade from '../ScrollFade'
import LessonTranscriptPanel from '../LessonTranscriptPanel'
import './profileIntegrations.css'
import './localTranscription.css'
import { btn } from '../../lib/pillStyles'
import { getOwnerId, getViewAs } from '../../lib/owner'
import { localRequest, readTranscript, transcriptTime, type LocalDraft } from '../../lib/localTranscription'

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
        await localRequest('/connect', localStorage.getItem(tokenKey(owner)) || '', { method: 'DELETE' })
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
        {connected ? 'Подключён' : 'Не подключён'}
      </span>
    </header>
    <div className="transcription-module-body">
      <p>{connected
        ? 'Чтобы расшифровать урок, откройте вкладку «Запись» в конструкторе курса.'
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
          <span className="integration-action transcription-step-label" data-active={downloadStarted && !downloading}>
            <span className="integration-step-number">2</span> Запуск на Mac
          </span>
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
          {busy ? 'Отключаем…' : <span>Отключить<span className="transcription-device-word"> компьютер</span></span>}
        </button>}
      </div>
      <div aria-live="polite" className="transcription-setup">
        {downloadStarted && !downloading && !connected && <>
          <h4>Что делать с ZIP-архивом</h4>
          <ol>
            <li>Когда загрузка закончится, откройте папку «Загрузки» в Finder. Дважды нажмите на <code>iskra-transcription-mac.zip</code>. Если уже появилась папка <code>Iskra</code>, откройте её.</li>
            <li>В папке <code>Iskra</code> дважды нажмите на <code>start.command</code>. При первом запуске в Терминале начнётся загрузка моделей.
              <details className="transcription-blocked">
                <summary><ChevronRight size={16} aria-hidden />Mac пишет «Файл не был открыт»?</summary>
                <p>Если Apple не удалось проверить файл, нажмите «Готово». Продолжайте, только если вы сами скачали этот архив из Искры и доверяете ему.</p>
                <a className="integration-action" href="x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Security">Открыть настройки Mac</a>
                <p>Если настройки не открылись, в меню Apple выберите «Системные настройки», затем «Конфиденциальность и безопасность».</p>
                <p>В разделе <strong>«Безопасность»</strong> (внизу страницы) проверьте имя файла. Найдите сообщение о блокировке <code>start.command</code> и нажмите рядом с ним <strong>«Все равно открыть»</strong>. В следующем окне ещё раз выберите «Все равно открыть» или «Открыть». Если Mac попросит, введите пароль или используйте Touch ID.</p>
                <p><a href="https://support.apple.com/ru-ru/102445" target="_blank" rel="noreferrer">Посмотреть, где находится кнопка, на снимке Apple</a></p>
                <p>Когда откроется Терминал, переходите к следующему пункту.</p>
              </details>
            </li>
            <li>Дождитесь строки <code>Running on http://127.0.0.1:18764</code>. Оставьте Терминал открытым, вернитесь в Искру и нажмите «Подключить компьютер».</li>
          </ol>
        </>}
      </div>
      {message && <p className="transcription-module-error" role="alert">{message}</p>}
    </div>
  </section>
}

type Pending = { id: string; source: string }
type Props = { owner: string; lessonKey: string; source: string; file?: File | null; existing?: LocalDraft; published?: boolean; onApply: (draft: LocalDraft) => Promise<boolean> }

function readPending(owner: string, lessonKey: string, source: string): Pending | null {
  try {
    const job = JSON.parse(localStorage.getItem('iskra.transcription.job.' + JSON.stringify([owner, lessonKey])) || 'null')
    return job?.source === source.trim() && typeof job.id === 'string' ? job : null
  } catch { return null }
}

export type TranscriptRail = {
  draft: LocalDraft
  change: (value: LocalDraft) => void
  saving: boolean
}

export function RecordingLines({rail}: {rail: TranscriptRail}) {
  const [editing, setEditing] = useState<number | null>(null)
  const {draft, change, saving} = rail
  return <section className="recording-lines" aria-label="Реплики записи">
    <header><AudioLines size={16}/><strong>Реплики</strong><small>{draft.transcript.segments.length}</small></header>
    <ScrollFade maxHeight="min(32dvh, 280px)" fadeHeight={12}>
      <div>{draft.transcript.segments.map((line,index) => <div key={index} className="transcript-line">
        <time>{transcriptTime(line.start)}</time>
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
  const jobKey = props.file ? JSON.stringify([props.lessonKey, props.file.name, props.file.size, props.file.lastModified]) : props.lessonKey
  const storageKey = 'iskra.transcription.job.' + JSON.stringify([props.owner, jobKey])
  const [view, setView] = useState<'entry' | 'setup' | 'review' | 'preview'>(() =>
    connected && readPending(props.owner, jobKey, props.source) ? 'review' : 'entry')
  const [working, setWorking] = useState<LocalDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const draft = working ?? props.existing
  function change(value: LocalDraft) { setFailed(false); setWorking(value) }
  const apply = async () => {
    if (!working || saving) return
    setSaving(true)
    try {
      if (!await props.onApply(working)) throw new Error()
      localStorage.removeItem(storageKey)
      setWorking(null)
      setFailed(false)
    } catch { setFailed(true) }
    finally { setSaving(false) }
  }
  if (!props.owner || (!props.source && !props.file && !draft)) return <>{props.children(null)}</>
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
  return <>{props.children(<>
    {(failed || badChapter || badLine) && <small role="alert">{failed ? 'Не удалось сохранить. Попробуйте ещё раз.' : badChapter ? 'Проверьте названия и время глав.' : 'Заполните пустую реплику.'}</small>}
    <div className="transcript-tools">
      {working ? <button className="transcription-rail-action" disabled={saving || badChapter || badLine} onClick={apply}>
        <Check size={15}/>{saving ? 'Сохраняем…' : 'Сохранить расшифровку'}</button> :
        <span className="transcript-saved" role="status"><Check size={15}/>Добавлено в урок</span>}
      {!working && <button aria-label="Повторить обработку" title="Повторить обработку" onClick={open}><RotateCcw size={15}/></button>}
      <button aria-label="Посмотреть как ученик" title="Посмотреть как ученик" onClick={() => setView('preview')}><Eye size={16}/></button>
    </div>
  </>,rail)}</>
}

function Review({ owner, lessonKey, source, file, onReady, onClose }: Props & { onReady: (result: LocalDraft) => void; onClose: () => void }) {
  const key = 'iskra.transcription.job.' + JSON.stringify([owner, lessonKey])
  const token = localStorage.getItem(tokenKey(owner)) || ''
  const [pending, setPending] = useState(() => readPending(owner, lessonKey, source))
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState<{ current: number; total: number; unit: 'seconds' | 'frames' | 'chapters' }>()
  const [error, setError] = useState('')
  const readyRef = useRef(onReady)
  useEffect(() => { readyRef.current = onReady }, [onReady])
  async function start() {
    setError('')
    const form = new FormData()
    if (file) form.append('video', file)
    else form.append('link', source.trim())
    setBusy(true)
    try {
      const { id } = await localRequest('/jobs', token, { method: 'POST', body: form })
      const job = { id, source: source.trim() }
      localStorage.setItem(key, JSON.stringify(job))
      setPending(job)
    } catch (e) { setError((e as Error).message) }
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
        setProgress(state.progress)
        setStage(state.stage + (state.bytes ? ' · ' + (state.bytes / 1048576).toFixed(1) + ' МБ' : ''))
        if (state.error) throw new Error(state.stage)
        if (!state.done) { timer = setTimeout(() => void poll(job), 1000); return }
        const transcript = readTranscript({ source: job.source, segments: state.segments })
        if (!transcript) throw new Error('Нет реплик для проверки.')
        readyRef.current({ transcript, timecodes: state.chapters.map((c: { start: number; title: string }) =>
          ({ seconds: c.start, time: transcriptTime(c.start), label: c.title })) })
      } catch (e) { if (active) setError((e as Error).message) }
    }
    void poll(pending)
    return () => { active = false; clearTimeout(timer) }
  }, [pending, token])
  const stages = ['Видео', 'Распознаём речь', 'Читаем слайды', 'Собираем главы']
  const currentStep = Math.max(0, stages.findIndex(s => stage.startsWith(s)))
  const metric = progress?.unit === 'seconds' ? transcriptTime : (n: number) => String(n)
  return <section className="transcription-inline">
    <header className="transcription-inline-head"><span className="transcription-mark"><AudioLines size={21}/></span>
      <div><strong>Расшифровка урока</strong><small>Обработка на вашем компьютере</small></div>
      <button type="button" aria-label="К записи урока" disabled={busy} style={btn('S','secondary')} onClick={onClose}><X size={16}/></button>
    </header>
    <div className="transcription-form">
    {!pending && <p className="transcription-hint">Используем запись этого урока. После обработки вы сможете проверить текст и главы.</p>}
    {pending && !error && <>
      <small className="transcription-hint" aria-live="polite">{stage || 'Проверяем обработку…'}</small>
      <ol className="transcription-job-steps">{stages.map((step, i) => {
        const active = i === currentStep
        const percent = active && progress && progress.total > 0 ? Math.min(100, Math.max(0, Math.round(progress.current / progress.total * 100))) : undefined
        return <li key={step} aria-current={active ? 'step' : undefined}>
          {active && <span className="transcription-fill" style={{width: (percent ?? 0) + '%'}} />}
          <span className="transcription-number">{i < currentStep ? <Check size={14} /> : i + 1}</span>
          <strong>{step}</strong>{active && percent !== undefined && <span className="transcription-percent" role="progressbar" aria-label={step} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>{percent}%</span>}
        </li>
      })}</ol>
      {progress && progress.total > 0 && <small className="transcription-hint">{metric(progress.current)} из {metric(progress.total)} {progress.unit === 'frames' ? 'кадров' : progress.unit === 'chapters' ? 'глав' : 'записи'}</small>}
    </>}
    {error && <p role="alert">{error} {pending && <button onClick={() => { setPending(null); localStorage.removeItem(key); setError(''); setStage(''); setProgress(undefined) }}>Начать заново</button>}</p>}
    </div>
    {!pending ?
      <button className="transcription-start" disabled={busy} style={btn('M','primary')} onClick={start}><AudioLines size={16} />{busy ? 'Передаём запись…' : 'Начать расшифровку'}</button> : undefined}
  </section>
}
