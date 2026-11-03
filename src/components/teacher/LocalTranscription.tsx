import { useEffect, useState } from 'react'
import { AudioLines } from '../icons/appIcons'
import Modal from '../Modal'
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

export function TranscriptionModuleCard({ owner }: { owner: string }) {
  const [connected, setConnected] = useState(() => !!localStorage.getItem(tokenKey(owner)))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function change() {
    setBusy(true)
    setMessage('')
    try {
      if (connected) {
        await localRequest('/connect', localStorage.getItem(tokenKey(owner)) || '', { method: 'DELETE' })
        localStorage.removeItem(tokenKey(owner))
      } else {
        const { token } = await localRequest('/connect', '', { method: 'POST' })
        localStorage.setItem(tokenKey(owner), token)
      }
      setConnected(!connected)
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  return <section style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 20, padding: 18, marginBottom: 12 }}>
    <strong><AudioLines size={20} /> Расшифровка уроков</strong>
    <p>{connected ? 'Подключено на этом компьютере. Откройте урок в конструкторе курса и выберите «Запись».' : 'Для Mac с Apple Silicon. Распакуйте архив, запустите start.command и подключите компьютер. При первом запуске загрузятся модели.'}</p>
    {!connected && <a href="/downloads/iskra-transcription-mac.zip" download style={{...btn('M', 'secondary'), marginRight: 8}}>Скачать для Mac</a>}
    <button disabled={busy || !owner} style={btn('M', connected ? 'secondary' : 'primary')} onClick={change}>{connected ? 'Отключить компьютер' : 'Подключить компьютер'}</button>
    {message && <p role="alert">{message}</p>}
  </section>
}

type Pending = { id: string; source: string }
type Props = { owner: string; lessonKey: string; source: string; existing?: LocalDraft; published?: boolean; onApply: (draft: LocalDraft) => void }

export function TranscriptionAction(props: Props) {
  const [open, setOpen] = useState(false)
  if (!props.owner || !localStorage.getItem(tokenKey(props.owner))) return null
  return <><button style={btn('M', 'secondary')} onClick={() => setOpen(true)}><AudioLines size={16} /> Расшифровка урока</button>
    {open && <Review {...props} onClose={() => setOpen(false)} />}</>
}

function Review({ owner, lessonKey, source, existing, published, onApply, onClose }: Props & { onClose: () => void }) {
  const key = 'iskra.transcription.job.' + JSON.stringify([owner, lessonKey])
  const token = localStorage.getItem(tokenKey(owner)) || ''
  const [pending, setPending] = useState<Pending | null>(() => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
  })
  const [link, setLink] = useState(source)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState<{ current: number; total: number; unit: 'seconds' | 'frames' | 'chapters' }>()
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<LocalDraft | null>(() => pending ? null : existing ?? null)
  async function start() {
    setError('')
    if (file && file.size > 2 * 1024 ** 3) { setError('Выберите видео размером до 2 ГиБ.'); return }
    const form = new FormData()
    if (file) form.append('video', file)
    else form.append('link', link.trim())
    setBusy(true)
    try {
      const { id } = await localRequest('/jobs', token, { method: 'POST', body: form })
      const job = { id, source: link.trim() }
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
  return <Modal title="Расшифровка урока" subtitle="Обработка на вашем компьютере" onClose={busy ? () => {} : onClose}
    footer={draft ? <button style={btn('M', 'primary')} disabled={draft.transcript.segments.some(s => !s.text.trim()) || !validChapters}
      onClick={() => { onApply(draft); localStorage.removeItem(key); onClose() }}>{published ? 'Обновить опубликованный урок' : 'Добавить в черновик'}</button> : undefined}>
    <div className="transcription-form">
    {!pending && !draft && <><label>{file ? 'Ссылка для просмотра учениками (необязательно)' : 'Ссылка на запись'}<input type="url" value={link} onChange={e => setLink(e.target.value)} style={{ width: '100%' }} /></label>
      <p><label>Или видео с компьютера <input type="file" accept="video/*,audio/*" onChange={e => setFile(e.target.files?.[0] || null)} /></label></p>
      {file && <p>В урок попадут текст и главы. Файл останется на компьютере. Если нужна запись в плеере ученика, укажите ссылку на это же видео.</p>}
      <button style={btn('M', 'primary')} disabled={busy || ((!!link.trim() || !file) && !/^https?:\/\//i.test(link.trim()))} onClick={start}>{busy ? 'Передаём запись…' : 'Начать обработку'}</button></>}
    {pending && !draft && <p role="status">{stage || 'Проверяем обработку…'}</p>}
    {pending && !draft && !error && progress && progress.total > 0 && <div>
      <progress style={{width:'100%',accentColor:'var(--color-control-accent)'}} value={progress.current} max={progress.total} aria-label={stage} />
      <small>{metric(progress.current)} из {metric(progress.total)} {progress.unit === 'frames' ? 'кадров' : progress.unit === 'chapters' ? 'глав' : 'записи'}</small>
    </div>}
    {pending && !draft && !error && <ol style={{display:'flex', flexWrap:'wrap', gap:8, padding:0, listStyle:'none'}}>{stages.map((step,i)=><li key={step}
      aria-current={i===currentStep?'step':undefined} style={{padding:'5px 10px', borderRadius:14, background:i===currentStep?'var(--color-purple-soft)':'var(--color-bg-3)'}}>{i+1}. {step}</li>)}</ol>}
    {error && <p role="alert">{error} {pending && <button onClick={() => { setPending(null); localStorage.removeItem(key); setError(''); setStage('') }}>Начать заново</button>}</p>}
    {draft && <><button style={btn('S','secondary')} onClick={() => { setDraft(null); setStage(''); setPending(null); localStorage.removeItem(key) }}>Обработать другую запись</button>
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
  </Modal>
}
