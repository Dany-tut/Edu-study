import { useEffect, useState } from 'react'
import { ArrowRight, AudioLines, Check, X } from '../icons/appIcons'
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
                <summary>Mac пишет «Файл не был открыт»?</summary>
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
type Props = { owner: string; lessonKey: string; source: string; file?: File | null; existing?: LocalDraft; published?: boolean; onApply: (draft: LocalDraft) => void }

function readPending(owner: string, lessonKey: string, source: string): Pending | null {
  try {
    const job = JSON.parse(localStorage.getItem('iskra.transcription.job.' + JSON.stringify([owner, lessonKey])) || 'null')
    return job?.source === source.trim() && typeof job.id === 'string' ? job : null
  } catch { return null }
}

export function TranscriptionAction(props: Props & { children: (action: React.ReactNode) => React.ReactNode }) {
  const [view, setView] = useState<'entry' | 'setup' | 'review' | 'preview'>('entry')
  const connected = !!props.owner && !!localStorage.getItem(tokenKey(props.owner))
  const jobKey = props.file ? JSON.stringify([props.lessonKey, props.file.name, props.file.size, props.file.lastModified]) : props.lessonKey
  const pending = readPending(props.owner, jobKey, props.source)
  if (!props.owner || (!props.source && !props.file)) return <>{props.children(null)}</>
  if (view !== 'entry') return <ScrollFade maxHeight="100%" style={{ flex: 1, minHeight: 0 }}>
    {view === 'review' ? <Review key={jobKey + props.source} {...props} lessonKey={jobKey} onClose={() => setView('entry')} /> :
      <section className="transcription-inline">
        <button type="button" style={btn('S','secondary')} onClick={() => setView('entry')}>К записи урока</button>
        {view === 'setup' ? <TranscriptionModuleCard owner={props.owner} onConnected={() => setView('review')} /> :
          props.existing && <LessonTranscriptPanel transcript={props.existing.transcript} time={-1} />}
      </section>}
  </ScrollFade>
  return <>{props.children(<>
    <button type="button" className="transcription-rail-action" onClick={() => setView(connected ? 'review' : 'setup')}>
      <AudioLines size={17} />{pending ? 'Открыть обработку' : props.existing ? 'Открыть расшифровку' : 'Расшифровать видео'}
    </button>
    {props.existing && <button style={btn('M','secondary')} onClick={() => setView('preview')}>Посмотреть как ученик</button>}
  </>)}</>
}

function Review({ owner, lessonKey, source, file, existing, published, onApply, onClose }: Props & { onClose: () => void }) {
  const key = 'iskra.transcription.job.' + JSON.stringify([owner, lessonKey])
  const token = localStorage.getItem(tokenKey(owner)) || ''
  const [pending, setPending] = useState(() => readPending(owner, lessonKey, source))
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState<{ current: number; total: number; unit: 'seconds' | 'frames' | 'chapters' }>()
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<LocalDraft | null>(() => pending ? null : existing ?? null)
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
        setDraft({ transcript, timecodes: state.chapters.map((c: { start: number; title: string }) =>
          ({ seconds: c.start, time: transcriptTime(c.start), label: c.title })) })
      } catch (e) { if (active) setError((e as Error).message) }
    }
    void poll(pending)
    return () => { active = false; clearTimeout(timer) }
  }, [pending, token])
  const stages = ['Видео', 'Распознаём речь', 'Читаем слайды', 'Собираем главы']
  const currentStep = Math.max(0, stages.findIndex(s => stage.startsWith(s)))
  const validChapters = draft?.timecodes.every((chapter, index, chapters) =>
    chapter.label.trim() && /^\d+(?::[0-5]\d){1,2}$/.test(chapter.time) &&
    (!index || chapter.seconds > chapters[index - 1].seconds))
  const metric = progress?.unit === 'seconds' ? transcriptTime : (n: number) => String(n)
  return <section className="transcription-inline">
    <header className="transcription-inline-head"><span className="transcription-mark"><AudioLines size={21}/></span>
      <div><strong>Расшифровка урока</strong><small>Обработка на вашем компьютере</small></div>
      <button type="button" aria-label="К записи урока" disabled={busy} style={btn('S','secondary')} onClick={onClose}><X size={16}/></button>
    </header>
    <div className="transcription-form">
    {!pending && !draft && <p className="transcription-hint">Используем запись этого урока. После обработки вы сможете проверить текст и главы.</p>}
    {pending && !draft && !error && <>
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
    {draft && <><button style={btn('S','secondary')} onClick={() => { setDraft(null); setStage(''); setPending(null); localStorage.removeItem(key) }}>Повторить обработку</button>
      <p>Проверьте главы и реплики. Принятые главы заменят текущие таймкоды урока.</p>
      <h3>Главы</h3>{draft.timecodes.map((c, i) => <label key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
        <input aria-label={'Время главы ' + (i+1)} value={c.time} style={{width:78,fontSize:16}} onChange={e=>{
          const time=e.target.value
          const seconds=time.split(':').reduce((total, part) => total * 60 + Number(part), 0)
          setDraft({...draft,timecodes:draft.timecodes.map((x,j)=>j===i?{...x,time,seconds}:x)})
        }} /> <input aria-label={'Название главы ' + (i+1)} value={c.label} onChange={e => setDraft({ ...draft, timecodes: draft.timecodes.map((x,j) => i===j ? {...x,label:e.target.value} : x) })}/></label>)}
      {!validChapters && <p role="alert">Укажите названия глав и время в формате 0:00 по возрастанию.</p>}
      <h3>Реплики</h3>{draft.transcript.segments.map((s,i) => <label key={i} style={{ display:'block', marginBottom:8 }}>{transcriptTime(s.start)}
        <input style={{ display:'block', width:'100%', fontSize:16 }} value={s.text} onChange={e => setDraft({ ...draft, transcript:{ ...draft.transcript, segments:draft.transcript.segments.map((x,j)=>i===j?{...x,text:e.target.value}:x) } })}/></label>)}</>}
    </div>
    {draft ? <button style={btn('M', 'primary')} disabled={draft.transcript.segments.some(s => !s.text.trim()) || !validChapters}
      onClick={() => { onApply(draft); localStorage.removeItem(key); onClose() }}>{published ? 'Обновить опубликованный урок' : 'Добавить в черновик'}</button> : !pending ?
      <button className="transcription-start" disabled={busy} style={btn('M','primary')} onClick={start}><AudioLines size={16} />{busy ? 'Передаём запись…' : 'Начать расшифровку'}</button> : undefined}
  </section>
}
