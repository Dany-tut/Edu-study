import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { ArrowDownToLine, ArrowRight, AudioLines, ChevronDown, Loader2, Check, Eye, FileText, FolderOpen, Settings, ToggleRight, RotateCcw, Upload, X } from '../icons/appIcons'
import ScrollFade from '../ScrollFade'
import Checkbox from '../Checkbox'
import LessonTranscriptPanel from '../LessonTranscriptPanel'
import MontageAction from './MontageAction'
import Switch from '../Switch'
import Segmented from '../Segmented'
import TeacherSelect from './TeacherSelect'
import { hasChapterVariant, prepareSlideChapters, sentenceTitle, type ChapterVariants, type ChapterControls, type ChapterMode } from '../../lib/chapterVariants'
import type { LessonTimecode } from '../../data/lessonContent'
import { MODULE_DOWNLOAD_URL, appNeedsManualUpdate, useModuleState, readModule, updateModule } from '../../lib/transcriptionModuleUpdate'
import { TranscriptionEta } from '../../lib/transcriptionEta'
import { TRANSCRIPTION_PRODUCT_VERSION } from '../../lib/transcriptionProductVersion'
import { fetchTermsPack, termsForModule } from '../../lib/transcriptTerms'
import { rememberCorrection, flushCorrections, readCorrections, correctedText, pendingCorrections, type CorrectionKind } from '../../lib/transcriptCorrections'
import type { RecapControl } from './LessonRecapPanel'
import './profileIntegrations.css'
import './localTranscription.css'
import { transcriptionStages as textStages, transcriptionStageIndex } from '../../lib/transcriptionStage'
import { btn } from '../../lib/pillStyles'
import { getOwnerId, getViewAs } from '../../lib/owner'
import type { LessonStatsSummary } from '../../lib/lessonMontage'
import { LocalTranscriptionUnavailable, applyModuleVoices, localRequest, readTranscript, requestTranscriptionCompanionStart, transcriptTime, waitForTranscriptionCompanion, type LocalDraft } from '../../lib/localTranscription'

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

const setupSteps = ['Скачать', 'Загрузки', 'Установить', 'Открыть', 'Подключить'] as const
const setupHints = [
  ['Скачайте Искру для Mac', 'Нажмите фиолетовую кнопку выше. Когда загрузка закончится, откройте DMG-файл из списка загрузок браузера.', ''],
  ['Откройте загрузки', 'Когда загрузка закончится, нажмите значок загрузок в верхней панели браузера. Если значка нет, откройте «Загрузки» в Finder.', 'Открылись загрузки'],
  ['Перенесите Искру в «Программы»', 'Откройте скачанный DMG-файл. В появившемся окне перетащите значок Искры на папку Applications («Программы») рядом. Дождитесь окончания копирования.', 'Искра перенесена'],
  ['Запустите «Искра · Расшифровка»', 'Откройте Finder → «Программы» и запустите «Искра · Расшифровка». Если macOS попросит разрешение на работу в фоне, включите службу через настройки в окне приложения.', 'Приложение открыто'],
  ['Подключите компьютер', 'Вернитесь в эту вкладку и нажмите «Подключить компьютер». Если браузер попросит доступ к локальной сети, разрешите его.', ''],
] as const

export function TranscriptionModuleCard({ owner, onConnected }: { owner: string; onConnected?: () => void }) {
  const [connected, setConnected] = useState(() => !!localStorage.getItem(tokenKey(owner)))
  // Модуль на Mac старше архива на сайте. Новый обновляется сам, в фоне;
  // скачивать архив руками нужно только старому, без POST /update.
  const [refresh, setRefresh] = useState(0)
  const module = useModuleState(connected, connected ? localStorage.getItem(tokenKey(owner)) || '' : '', refresh)
  // Модуль спит (это норма после простоя) и версию приложения не назвал ни
  // разу: не молчим, а предлагаем разбудить приложение и проверить.
  const [wake, setWake] = useState<'idle' | 'waking' | 'missing'>('idle')
  const offline = connected && !!module.checked && module.phase === 'unknown' && !module.app
  async function wakeModule() {
    setWake('waking')
    try {
      requestTranscriptionCompanionStart()
      await waitForTranscriptionCompanion(45_000)
      setWake('idle')
      setRefresh(value => value + 1)
    } catch { setWake('missing') }
  }
  // Старое приложение (до автообновления) заменяют один раз вручную.
  const appUpdate = module.phase !== 'updating' && appNeedsManualUpdate(module.app)
  const manualUpdate = (module.phase === 'outdated' && !module.selfUpdate) || module.phase === 'failed' || appUpdate
  const downloadKey = 'iskra.transcription.downloadStarted.' + owner
  const stepKey = 'iskra.transcription.setupStep.' + owner
  const [setupStep, setSetupStep] = useState(() => {
    const storedStep = localStorage.getItem(stepKey)
    const saved = Number(storedStep)
    if (storedStep !== null && Number.isInteger(saved) && saved >= 0 && saved < setupSteps.length) return saved
    return localStorage.getItem(downloadKey) === '1' ? 1 : 0
  })
  const setupId = useId()
  const [showSetup, setShowSetup] = useState(false)
  const [showPermission, setShowPermission] = useState(false)
  const canConnect = setupStep === setupSteps.length - 1

  function goToSetupStep(step: number) {
    localStorage.setItem(stepKey, String(step))
    setSetupStep(step)
    setShowPermission(false)
  }

  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function change() {
    setBusy(true)
    setMessage('')
    try {
      if (connected) {
        // Отзыв на Mac — в фоне. Раньше кнопка ждала его до 3 с, а при
        // выключенном модуле ответа нет вовсе: «Отключаем…» висело, и по нему
        // долбили (rage 04.11). Привязка этого браузера стирается в любом
        // случае, поэтому ждать компаньона незачем.
        void localRequest('/connect', localStorage.getItem(tokenKey(owner)) || '', {
          method: 'DELETE', signal: AbortSignal.timeout(3000),
        }).catch(() => { /* companion offline: pairing is forgotten locally anyway */ })
        goToSetupStep(setupSteps.length - 1)
        localStorage.setItem(downloadKey, '1')
        localStorage.removeItem(tokenKey(owner))
        setShowSetup(false)
      } else {
        requestTranscriptionCompanionStart()
        await waitForTranscriptionCompanion()
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
      <span className="transcription-module-status" data-connected={connected}
        data-tone={module.phase === 'updating' ? 'progress' : manualUpdate ? 'update' : undefined}>
        {module.phase === 'updating' ? 'Обновляем…' : manualUpdate ? 'Нужно обновить' : connected ? 'Подключён' : 'Не подключён'}
      </span>
    </header>
    <div className="transcription-module-body">
      <div className="transcription-module-state" inert={!connected} data-inactive={!connected}>
        <p>Фоновый модуль запускается по запросу из Искры. Терминал открывать не нужно; код модуля обновляется автоматически.</p>
        {offline && <div className="transcription-update transcription-module-notice" role="status">
          <p>{wake === 'missing'
            ? `«Искра · Расшифровка» не ответила. Если её нет в «Программах», скачайте v${TRANSCRIPTION_PRODUCT_VERSION} и перенесите туда.`
            : 'Модуль сейчас не запущен — версию приложения не проверить.'}</p>
          {wake === 'missing'
            ? <a className="integration-action" href={MODULE_DOWNLOAD_URL} download>Скачать v{TRANSCRIPTION_PRODUCT_VERSION}</a>
            : <button type="button" className="integration-action" disabled={wake === 'waking'} onClick={() => void wakeModule()}>
              {wake === 'waking' ? 'Проверяем…' : 'Проверить'}
            </button>}
        </div>}
        <div className="transcription-connected-actions">
          <button type="button" className="integration-action" aria-expanded={showSetup}
            aria-controls={setupId} onClick={() => setShowSetup(value => !value)}>
            Управление модулем
            <ChevronDown size={16} className="transcription-manage-chevron" aria-hidden />
          </button>

          <button className="integration-action integration-disconnect" disabled={busy || !owner} onClick={change}
            aria-label={busy ? 'Отключаем…' : 'Отключить компьютер'}>
            {busy ? 'Отключаем…' : 'Отключить'}
          </button>
        </div>
      </div>
      <div className="transcription-module-state" inert={connected} data-inactive={connected}>
        <p>Установите приложение на Mac один раз. При расшифровке оно само запустит обработчик в фоне.</p>
        <div className="integration-steps transcription-steps">
          <a className="integration-action transcription-step transcription-download-step" data-primary={setupStep === 0}
            href={MODULE_DOWNLOAD_URL} download aria-disabled={busy} onClick={event => {
              if (busy) { event.preventDefault(); return }
              setMessage('')
              localStorage.setItem(downloadKey, '1')
              goToSetupStep(1)
            }}>
            <span className="integration-step-number">{setupStep === 0 ? 1 : <Check size={13} aria-hidden />}</span>
            <span className="transcription-download-label">Скачать «Искру»<br />Тестовая версия для Mac · v{TRANSCRIPTION_PRODUCT_VERSION}</span>
            {setupStep === 0 && <ArrowDownToLine size={18} className="transcription-download-icon" aria-hidden />}
          </a>
          <ArrowRight size={16} className="integration-step-arrow" aria-hidden />
          <button type="button" className="integration-action transcription-step" data-phase={busy ? 'connecting' : 'idle'}
            data-primary={canConnect} disabled={!canConnect || busy || !owner} onClick={change}>
            <span className="integration-step-number" aria-hidden>2</span>
            <span>{busy ? 'Запускаем модуль…' : 'Подключить компьютер'}</span>
          </button>
        </div>
      </div>
      <div id={setupId} className="transcription-setup" data-connected={connected}
        data-inactive={connected && !showSetup && !manualUpdate} aria-live="polite">
        <div className="transcription-walkthrough" inert={connected} data-inactive={connected}>
          <ol className="transcription-walkthrough-steps" aria-label="Этапы настройки">
            {setupSteps.map((step, index) => <li key={step} aria-current={index === setupStep ? 'step' : undefined}
              data-done={index < setupStep}>{index < setupStep && <Check size={12} aria-hidden />}<span>{step}</span></li>)}
          </ol>
          <div className="transcription-walkthrough-pages">
            {setupHints.map(([title, detail, nextLabel], index) => (
              <div className="transcription-walkthrough-page" key={title} inert={index !== setupStep || showPermission}
                data-inactive={index !== setupStep || showPermission}>
                <div className="transcription-walkthrough-hint">
                  <img src="/transcription/ogonek.webp" alt="" width={56} height={56} />
                  <div>
                    <h4>{title}</h4>
                    <p>{detail}</p>
                  </div>
                </div>
                {index === 0 && <div className="transcription-guide-example">
                  <span><FileText size={16} aria-hidden /> Файл для Mac</span>
                  <strong><code>{MODULE_DOWNLOAD_URL.split('/').pop()}</code></strong>
                </div>}
                {index === 1 && <div className="transcription-guide-example">
                  <span>Верхняя панель браузера</span>
                  <strong><ArrowDownToLine size={16} aria-hidden /> Загрузки</strong>
                </div>}
                {index === 2 && <div className="transcription-guide-example">
                  <span><FileText size={16} aria-hidden /> <code>{MODULE_DOWNLOAD_URL.split('/').pop()}</code></span>
                  <strong><ArrowRight size={16} aria-hidden /> Открыть файл</strong>
                </div>}
                {index === 3 && <div className="transcription-guide-example">
                  <span><FolderOpen size={16} aria-hidden /> Finder · Загрузки</span>
                  <strong>Искра · Расшифровка</strong>
                </div>}
                <div className="transcription-walkthrough-actions">
                  {index > 0 && <button type="button" className="integration-action" disabled={busy} onClick={() => goToSetupStep(index - 1)}>Назад</button>}
                  {nextLabel && <button type="button" className="integration-action" data-primary="true" onClick={() => goToSetupStep(index + 1)}>
                    {nextLabel} <ArrowRight size={14} aria-hidden />
                  </button>}
                  {index < 3 && <button type="button" className="integration-action" onClick={() => goToSetupStep(setupSteps.length - 1)}>
                    Искра уже установлена
                  </button>}
                  {index === 3 && <button type="button" className="integration-action" onClick={() => setShowPermission(true)}>
                    Где включить разрешение
                  </button>}
                </div>
              </div>
            ))}
            <div className="transcription-walkthrough-page" inert={!showPermission} data-inactive={!showPermission}>
              <div>
                <h4>Разрешите работу Искры в фоне</h4>
                <p>Если Искра попросила разрешение, нажмите «Настройки фоновой службы» в окне приложения.</p>
              </div>
              <div className="transcription-guide-example transcription-settings-example">
                <span><Settings size={16} aria-hidden /> Системные настройки</span>
                <span>Основные / Объекты входа и расширения</span>
                <span>Разрешить в фоновом режиме</span>
                <strong>Искра · Расшифровка <ToggleRight size={20} aria-hidden /> <span className="sr-only">Включено</span></strong>
              </div>
              <div className="transcription-walkthrough-actions">
                <button type="button" className="integration-action" onClick={() => setShowPermission(false)}>Назад</button>
                <button type="button" className="integration-action" data-primary="true" onClick={() => goToSetupStep(setupSteps.length - 1)}>Разрешение включено</button>
              </div>
            </div>
          </div>
        </div>
        <div className="transcription-update" role="status" inert={!connected || !manualUpdate || showSetup}
          data-inactive={!connected || !manualUpdate || showSetup}>
          <p>{module.phase === 'failed'
            ? 'Не удалось обновить файлы модуля автоматически. Скачайте приложение Искры заново и откройте его.'
            : appUpdate
              ? `Вышла версия ${TRANSCRIPTION_PRODUCT_VERSION} приложения «Искра · Расшифровка», у вас ${module.app}${module.appRemembered ? ' (по последней проверке: модуль сейчас не запущен)' : ''}. Скачайте её и перенесите в «Программы» с заменой. Код модуля обновляется сам, приложение — нет.`
              : 'Обновите приложение Искры один раз. Дальнейшие обновления модуля придут автоматически.'}</p>
          <a className="integration-action" href={MODULE_DOWNLOAD_URL} download>
            <span>Скачать<br />v{TRANSCRIPTION_PRODUCT_VERSION}</span>
          </a>
        </div>
        <div className="transcription-launch-guide transcription-module-management" inert={!connected || !showSetup}
          data-inactive={!connected || !showSetup}>
          <h4>Работа в фоне</h4>
          <p>{module.local
            ? `${module.app ? `Приложение ${module.app} · ` : ''}модуль ${module.local.slice(0, 7)}${module.selfUpdate && !manualUpdate ? ' · обновляется сам' : ''}`
            : 'Версия модуля пока недоступна.'}</p>
          <p>Откройте «Искра · Расшифровка», чтобы посмотреть статус или остановить обработчик. Он не запускается при входе в Mac и завершает работу после периода простоя.</p>
          <p>Разрешение находится в разделе «Системные настройки / Основные / Объекты входа и расширения / Разрешить в фоновом режиме».</p>
          <a className="integration-action" href={MODULE_DOWNLOAD_URL} download>
            <span>Скачать для переустановки<br />v{TRANSCRIPTION_PRODUCT_VERSION}</span>
          </a>
        </div>
      </div>
      {message && <p className="transcription-module-error" role="alert">{message}</p>}
    </div>
  </section>
}

type JobProgress = { current: number; total: number; unit: 'seconds' | 'frames' | 'slides' | 'chapters' | 'bytes' | 'chunks' | 'segments' | 'voices'; phase?: string; updatedAt?: number }
function timeLeft(seconds: number) {
  if (seconds < 60) return 'меньше минуты'
  const minutes = Math.ceil(seconds / 60)
  return minutes < 60 ? minutes + ' мин' : Math.floor(minutes / 60) + ' ч ' + (minutes % 60) + ' мин'
}

// Estimate only this measured stage. Unknown later stages must not masquerade as a total ETA.
function useTimeLeft(step: string, progress: JobProgress | undefined, running: boolean) {
  const tracker = useRef(new TranscriptionEta())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])
  useEffect(() => { tracker.current.observe(running ? step : '', running ? progress : undefined, Date.now()) }, [step, progress, running])
  if (!running) return ''
  if (!progress || progress.total <= 0) return 'Обработка продолжается. Уточняем время этапа.'
  const left = tracker.current.remaining(progress, now, step)
  return left === undefined ? 'Уточняем время этапа по скорости обработки.' : 'До конца этапа ≈ ' + timeLeft(left)
}

type TranscriptionMode = 'text' | 'slides'
type Pending = { id: string; source: string; fileSignature?: string; mode?: TranscriptionMode; titleRegion?: string; failure?: string; dismissed?: boolean }
const megabytes = (bytes: number) => (bytes / 1048576).toFixed(1) + ' МБ'
const fileSignature = (file: File) => JSON.stringify([file.name, file.size, file.lastModified])
type Props = { owner: string; lessonKey: string; source: string; file?: File | null
  /** Тот же ролик с компьютера при уроке со ссылкой: модуль берёт его, а не
   *  скачивает с диска; расшифровка остаётся привязанной к ссылке (source). */
  localFile?: File | null; existing?: LocalDraft; published?: boolean; onApply: (draft: LocalDraft, variants?: ChapterVariants) => Promise<boolean>
  /** Предмет словаря расшифровки (termsSubject) и название урока — подсказка модулю. */
  subject?: string; lessonTitle?: string
  /** Название курса — для подписи задания в виджете очереди расшифровки. */
  courseTitle?: string
  chapterVariants?: ChapterVariants
  existingChapters?: LessonTimecode[]
  onApplyChapters?: (variants: ChapterVariants) => Promise<boolean>
  /** Текст урока (описание, конспект, главы): термины из него идут в подсказку первыми. */
  lessonText?: string
  /** Уроки курса с итогами монтажа — для динамики во вкладке «Итоги». */
  trend?: { id: string; title: string; current?: boolean; stats?: LessonStatsSummary }[]
  /** Итоги урока из расшифровки — панель в окне монтажа. */
  recap?: RecapControl
  recapSignal?: number }

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
  /** Учитель поправил реплику: пары терминов — в словарь, отрывок — в материал для дообучения. */
  corrected?: (before: string, line: { start: number; end: number; text: string }) => void
}

/** Время реплики целиком и одной ширины во всём списке: 00:06 … 59:59, а если в записи есть часы — 00:00:06 … 02:20:20. */
const TRAINING_KEY = 'iskra.transcription.training'
// Быстрое распознавание (эксперимент): движок GigaAM для русской речи. Значение
// 'auto' безопасно — смешанную речь (RU+EN и т.п.) модуль сам оставляет на whisper.
const FAST_ASR_KEY = 'iskra.transcription.fastAsr'

function lineClock(seconds: number, withHours: boolean) {
  const s = Math.max(0, Math.floor(seconds)), two = (n: number) => String(n).padStart(2, '0')
  const mmss = two(Math.floor(s % 3600 / 60)) + ':' + two(s % 60)
  return withHours ? two(Math.floor(s / 3600)) + ':' + mmss : two(Math.floor(s / 60)) + ':' + two(s % 60)
}

/** Индекс реплики, которая звучит в момент `at`: последняя, начавшаяся не позже. */
function lineAt(segments: readonly { start: number }[], at: number) {
  let lo = 0, hi = segments.length - 1, found = -1
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (segments[mid].start <= at + 0.05) { found = mid; lo = mid + 1 } else hi = mid - 1 }
  return found
}

/** Сколько ждать после ручной прокрутки, прежде чем список снова поедет за плеером. */
const FOLLOW_PAUSE_MS = 3500

/**
 * Реплики записи. С плеером (`at`) список ведёт себя как текст песни в Apple
 * Music: звучащая реплика ярче остальных и плавно встаёт на треть высоты.
 * Прокрутил сам — список не дёргается под пальцем, догоняет через пару секунд.
 * Время реплики — переход в это место записи (`onSeek`).
 */
export function RecordingLines({rail, fill, at, onSeek}: {rail: TranscriptRail; fill?: boolean; at?: number; onSeek?: (seconds: number) => void}) {
  const [editing, setEditing] = useState<number | null>(null)
  const {draft, change, saving} = rail
  // Текст реплики до правки: на выходе из поля сравниваем — что именно исправлено.
  const original = useRef('')
  const segments = draft.transcript.segments
  const withHours = segments.some(s => s.start >= 3600)
  const now = at == null || at <= 0 ? -1 : lineAt(segments, at)
  const listRef = useRef<HTMLDivElement>(null)
  const userAt = useRef(0)
  // Свою прокрутку отличаем по жестам, а не по событию scroll: его же шлёт и
  // плавная прокрутка самого списка.
  useEffect(() => {
    const scroller = listRef.current?.parentElement
    if (!scroller) return
    const mark = () => { userAt.current = Date.now() }
    const opts = { passive: true } as const
    scroller.addEventListener('wheel', mark, opts)
    scroller.addEventListener('touchstart', mark, opts)
    scroller.addEventListener('pointerdown', mark, opts)
    scroller.addEventListener('keydown', mark)
    return () => {
      scroller.removeEventListener('wheel', mark)
      scroller.removeEventListener('touchstart', mark)
      scroller.removeEventListener('pointerdown', mark)
      scroller.removeEventListener('keydown', mark)
    }
  }, [])
  useEffect(() => {
    if (now < 0 || editing != null || Date.now() - userAt.current < FOLLOW_PAUSE_MS) return
    const scroller = listRef.current?.parentElement, line = listRef.current?.children[now] as HTMLElement | undefined
    if (!scroller || !line) return
    const top = line.offsetTop - listRef.current!.offsetTop - scroller.clientHeight / 3
    const target = Math.max(0, Math.min(top, scroller.scrollHeight - scroller.clientHeight))
    if (Math.abs(scroller.scrollTop - target) < 2) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' })
  }, [now, editing])
  // fill — в левой рельсе: карточка занимает всю высоту колонки.
  return <section className={'recording-lines' + (fill ? ' is-fill' : '') + (now >= 0 ? ' is-live' : '')} aria-label="Реплики записи">
    <header><AudioLines size={16}/><strong>Реплики</strong><small>{segments.length}</small></header>
    <ScrollFade maxHeight={fill ? '100%' : 'min(32dvh, 280px)'} fadeHeight={12} style={fill ? { flex: 1, minHeight: 0 } : undefined}>
      {/* Колонка времени — по формату списка: 5 знаков без часов, 8 с часами. */}
      <div ref={listRef} style={{'--time-chars': withHours ? 8 : 5} as CSSProperties}>{segments.map((line,index) => <div key={index} className={'transcript-line' + (index === now ? ' is-now' : '')} aria-current={index === now ? 'true' : undefined}>
        {onSeek ? <button type="button" className="transcript-line-time" aria-label={'Перейти к ' + lineClock(line.start, withHours)} onClick={() => { userAt.current = 0; onSeek(line.start) }}><time>{lineClock(line.start, withHours)}</time></button>
          : <time>{lineClock(line.start, withHours)}</time>}
        {editing === index ? <span className="transcript-line-text" data-text={line.text + ' '}>
          <textarea rows={1} autoFocus aria-label={'Реплика ' + (index+1)} value={line.text} disabled={saving}
            onFocus={e => { original.current = e.currentTarget.value }}
            onBlur={e => { setEditing(null); const text = e.currentTarget.value; if (text !== original.current) rail.corrected?.(original.current, {...line, text}) }} onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur() }}
            onChange={e => change({...draft, transcript:{...draft.transcript, segments:segments.map((s,i) =>
              i === index ? {...s,text:e.target.value} : s)}})}/>
        </span> : <button data-hover="layer" type="button" disabled={saving} aria-label={'Редактировать реплику ' + (index+1)} onClick={() => setEditing(index)}>{line.text || 'Введите текст'}</button>}
      </div>)}</div>
    </ScrollFade>
  </section>
}

type ActionProps = Props & { children: (action: React.ReactNode, rail?: TranscriptRail, chapters?: ChapterControls) => React.ReactNode }
export function TranscriptionAction(props: ActionProps) {
  return <TranscriptionActionState key={JSON.stringify([props.owner, props.lessonKey, props.source.trim(), props.file ? fileSignature(props.file) : null])} {...props} />
}

function TranscriptionActionState(props: ActionProps) {
  const connected = !!props.owner && !!localStorage.getItem(tokenKey(props.owner))
  const jobKey = props.lessonKey
  const storageKey = 'iskra.transcription.job.' + JSON.stringify([props.owner, jobKey])
  const [attemptFailure, setAttemptFailure] = useState(() => {
    const job = readPending(props.owner, jobKey, props.source, props.file)
    return job?.dismissed ? '' : job?.failure ?? ''
  })
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const [requestedMode, setRequestedMode] = useState<TranscriptionMode>('text')
  const variantsKey = storageKey + '.chapter-variants'
  const [correctionNotice, setCorrectionNotice] = useState('')
  async function syncCorrections() {
    try { const pending = pendingCorrections(props.owner).length; await flushCorrections(props.owner); setCorrectionNotice(pending ? 'Исправления сохранены' : '') }
    catch { setCorrectionNotice('Исправления ещё не отправлены. Они сохранены в браузере; нажмите «Повторить отправку».') }
  }
  useEffect(() => {
    if (!props.owner) return
    void syncCorrections()
    const retry = () => { void syncCorrections() }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [props.owner])
  function remember(kind: CorrectionKind, before: string, after: string) {
    if (before === after) return
    try {
      rememberCorrection(props.owner, props.subject ?? 'other', kind, before, after, props.lessonKey)
      setCorrectionNotice('Запоминаем исправления…')
      void syncCorrections()
    } catch { setCorrectionNotice('Не удалось запомнить исправление в браузере. Сохраните изменения в уроке.') }
  }

  const [variants, setVariants] = useState<ChapterVariants>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(variantsKey) || 'null')
      if (saved?.source === props.source.trim() && Array.isArray(saved.text) && saved.revision >= (props.chapterVariants?.revision ?? 0) && (!props.file || saved.fileSignature === fileSignature(props.file))) return saved
    } catch { /* use server or the old draft */ }
    if (props.chapterVariants?.source === props.source.trim()) return props.chapterVariants
    let slides: LessonTimecode[] | undefined
    let text = props.existing?.timecodes ?? props.existingChapters ?? []
    try {
      const textDraft = JSON.parse(localStorage.getItem(storageKey + '.draft') || 'null')
      if (textDraft?.transcript?.source === props.source.trim() && Array.isArray(textDraft.timecodes)) text = textDraft.timecodes
      const old = JSON.parse(localStorage.getItem(storageKey + '.slides-draft') || 'null')
      if (old?.source === props.source.trim() && Array.isArray(old.chapters)) slides = prepareSlideChapters(old.chapters)
    } catch { /* no old draft */ }
    return {source:props.source.trim(),active:slides ? 'slides' : 'text',revision:0,text,slides}
  })
  const [chapterDirty, setChapterDirty] = useState(() => !!localStorage.getItem(variantsKey) || !!localStorage.getItem(storageKey + '.slides-draft'))
  const [view, setView] = useState<'entry' | 'setup' | 'review' | 'preview'>(() => {
    const job = readPending(props.owner, jobKey, props.source, props.file)
    return connected && job && !job.dismissed && !(job.failure && (props.existing || props.existingChapters?.length)) && (job.mode === 'slides' ? !localStorage.getItem(storageKey + '.slides-draft') : !localStorage.getItem(storageKey + '.draft')) ? 'review' : 'entry'
  })
  function changeVariants(value: ChapterVariants) {
    const next = {...value, fileSignature:props.file ? fileSignature(props.file) : undefined, revision:Math.max(Date.now(), variants.revision + 1)}
    setVariants(next); setChapterDirty(true); setFailed('')
    try { localStorage.setItem(variantsKey, JSON.stringify(next)); setLocalSaveFailed(false) }
    catch { setLocalSaveFailed(true) }
  }
  const draftKey = storageKey + '.draft'
  const [working, setWorking] = useState<LocalDraft | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null')
      return saved?.transcript?.source === props.source.trim() && (!props.file || saved.fileSignature === fileSignature(props.file)) && readTranscript(saved.transcript) && Array.isArray(saved.timecodes) ? { ...saved, transcript: readTranscript(saved.transcript) } : null
    } catch { return null }
  })
  const [localSaveFailed, setLocalSaveFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState('')
  const draft = working ?? props.existing
  function change(value: LocalDraft) {
    setFailed(''); setWorking(value)
    try { localStorage.setItem(draftKey, JSON.stringify({...value, fileSignature: props.file ? fileSignature(props.file) : undefined})); setLocalSaveFailed(false) }
    catch { setLocalSaveFailed(true) }
  }
  const apply = async () => {
    if ((!working && !chapterDirty) || saving) return
    setSaving(true)
    try {
      const ok = working
        ? await props.onApply({...working, timecodes:variants[variants.active] ?? []}, variants)
        : await props.onApplyChapters?.(variants)
      if (!ok) throw new Error('Сохранение не подтверждено. Черновик сохранён — повторите попытку.')
      localStorage.removeItem(variantsKey)
      localStorage.removeItem(storageKey + '.slides-draft')
      setChapterDirty(false)
      localStorage.removeItem(storageKey)
      localStorage.removeItem(draftKey)
      setWorking(null)
      setFailed('')
    } catch (error) { setFailed(error instanceof Error && error.message ? error.message : 'Сохранение не подтверждено. Черновик сохранён — повторите попытку.') }
    finally { setSaving(false) }
  }
  if (!props.owner || (!props.source && !props.file && !draft && !readPending(props.owner, jobKey, props.source))) return <>{props.children(null)}</>
  if (view !== 'entry') return <ScrollFade maxHeight="100%" style={{ flex: 1, minHeight: 0 }}>
    {view === 'review' ? <Review {...props} initialMode={requestedMode} onSlidesReady={chapters => {
      changeVariants({...variants, active:'slides', slides:prepareSlideChapters(chapters)})
      localStorage.removeItem(storageKey); setView('entry')
    }} lessonKey={jobKey} onFailed={message => {
      setAttemptFailure(message)
      if (draft || variants.text.length || variants.slides?.length) setView('entry')
    }} onClose={() => {
      const job = readPending(props.owner, jobKey, props.source, props.file)
      if (job?.failure) { localStorage.setItem(storageKey, JSON.stringify({...job, dismissed:true})); setAttemptFailure('') }
      setView('entry')
    }}
      onReady={result => { change(draft?.transcript.forStudents ? {...result, transcript: {...result.transcript, forStudents: true}} : result); changeVariants({...variants, active:'text', text:result.timecodes}); setView('entry') }} /> :
      <section className="transcription-inline">
        <button data-hover="layer" type="button" style={btn('S','secondary')} onClick={() => setView('entry')}>К записи урока</button>
        {view === 'setup' ? <TranscriptionModuleCard owner={props.owner} onConnected={() => setView('review')} /> :
          draft && <LessonTranscriptPanel transcript={draft.transcript} time={-1} />}
      </section>}
  </ScrollFade>
  const openMode = async (mode: TranscriptionMode) => {
    // Migrate a completed legacy result before starting a new job: on reload
    // the pending new job must show progress, while both old sets remain safe.
    if (localStorage.getItem(storageKey + '.slides-draft')) {
      changeVariants(variants)
      if (localStorage.getItem(variantsKey)) localStorage.removeItem(storageKey + '.slides-draft')
    }
    const pending = readPending(props.owner, jobKey, props.source, props.file)
    if (pending && connected) {
      try {
        const state = await localRequest('/jobs/' + pending.id, localStorage.getItem(tokenKey(props.owner)) || '')
        if (!alive.current) return
        if (state.done || state.error || state.cancelled) localStorage.removeItem(storageKey)
      } catch { /* Keep an unconfirmed job attached; never replace a running job. */ }
    }
    if (!alive.current) return
    setAttemptFailure('')
    setRequestedMode(mode)
    setView(connected ? 'review' : 'setup')
  }
  const open = () => { void openMode('text') }
  const chapters: ChapterControls = {
    mode: variants.active, codes: variants[variants.active] ?? [], available: hasChapterVariant(variants[variants.active]),
    select: (active: ChapterMode) => { if (active !== variants.active && !saving) changeVariants({...variants, active}) },
    change: codes => changeVariants({...variants, [variants.active]:codes}),
    corrected: (before, after) => remember(variants.active === 'slides' ? 'slide-title' : 'text-title', before, after),
    generate: () => { void openMode(variants.active) }, saving,
  }
  if (!draft && !variants.slides && !variants.text.length) return <>{props.children(<button type="button" className="transcription-rail-action" onClick={open}>
    <AudioLines size={17} />Расшифровать видео
  </button>)}</>
  const badChapter = chapters.codes.some((c,i,all) => !c.label.trim() || !/^\d+(?::[0-5]\d){1,2}$/.test(c.time) || (i > 0 && c.seconds <= all[i-1].seconds))
  const badLine = draft?.transcript.segments.some(line => !line.text.trim())
  const corrected = (before: string, line: { start: number; end: number; text: string }) => {
    remember('speech', before, line.text)
    // Отрывок для дообучения: модуль вырежет его из звука, который отложил при обработке.
    const token = localStorage.getItem(tokenKey(props.owner))
    if (draft?.jobId && token) void localRequest('/training', token, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job: draft.jobId, subject: props.subject ?? '', items: [{ start: line.start, end: line.end, text: line.text, before }] }) }).catch(() => { /* модуль выключен или звук не копился — правка в уроке всё равно сохранится */ })
  }
  const rail = draft ? {draft, change, saving, corrected} : undefined
  const actions = <>
    {correctionNotice && <small role="status">{correctionNotice} {correctionNotice.includes('ещё не отправлены') && <button type="button" onClick={() => void syncCorrections()}>Повторить отправку</button>}</small>}
    {localSaveFailed && <small role="alert">Не удалось сохранить черновик в браузере. Не обновляйте страницу до сохранения в урок.</small>}
    {(failed || badChapter || badLine) && <small role="alert">{failed ? failed : badChapter ? 'Проверьте названия и время глав.' : 'Заполните пустую реплику.'}</small>}
    {/* Без отметки ученик видит только таймкоды, расшифровки у него нет. */}
    {draft && <div className="transcript-audience">
      <Checkbox checked={!!draft.transcript.forStudents} disabled={saving}
        onChange={on => change({...draft, transcript: {...draft.transcript, forStudents: on || undefined}})}
        labelStyle={{fontSize: 13, color: 'var(--color-text-2)'}}>Показывать ученику</Checkbox>
    </div>}
    <div className="transcript-tools">
      {working || chapterDirty ? <button className="transcription-rail-action" disabled={saving || badChapter || !!(working && badLine) || !chapters.available} onClick={apply}>
        <Check size={15}/>{saving ? 'Сохраняем…' : 'Сохранить'}</button> :
        <span className="transcript-saved" role="status"><Check size={15}/>Добавлено</span>}
      <button data-hover="layer" aria-label="Повторить обработку" title="Повторить обработку" disabled={saving} onClick={chapters.generate}><RotateCcw size={16}/></button>
      {draft && <MontageAction draft={draft} change={change} corrected={corrected} disabled={saving} file={props.file ?? props.localFile} token={connected ? localStorage.getItem(tokenKey(props.owner)) || undefined : undefined} trend={props.trend} recap={props.recap} recapSignal={props.recapSignal} />}
      <button data-hover="layer" aria-label="Посмотреть как ученик" title="Посмотреть как ученик" onClick={() => setView('preview')}><Eye size={16}/></button>
    </div>
  </>
  if (!props.source && !props.file) return <section className="transcription-inline">
    <p>Расшифровка загруженного файла восстановлена. Для воспроизведения выберите исходное видео снова.</p>
    {rail && <RecordingLines rail={rail}/>} {actions}
  </section>
  return <>
    {attemptFailure && <section className="transcription-inline transcription-attempt-notice" role="alert">
      <strong>Повторная обработка не завершилась</strong>
      <p>{attemptFailure}</p>
      <p>Ниже показан ранее сохранённый результат. Эта попытка его не изменила.</p>
      <div className="transcription-recovery-actions">
        <button type="button" style={btn('M','secondary')} onClick={() => void openMode(readPending(props.owner, jobKey, props.source, props.file)?.mode ?? requestedMode)}>Повторить или выбрать файл</button>
        <button type="button" style={btn('M','secondary')} onClick={() => {
          const job = readPending(props.owner, jobKey, props.source, props.file)
          if (job?.failure) localStorage.setItem(storageKey, JSON.stringify({...job, dismissed:true}))
          setAttemptFailure('')
        }}>Скрыть сообщение</button>
      </div>
    </section>}
    {props.children(actions,rail,chapters)}
  </>
}

function Review({ owner, lessonKey, source, file, localFile, subject, lessonTitle, courseTitle, lessonText, initialMode, onSlidesReady, onReady, onClose, onFailed }: Props & { onFailed: (message: string) => void; initialMode: TranscriptionMode; onSlidesReady: (chapters: LessonTimecode[]) => void; onReady: (result: LocalDraft) => void; onClose: () => void }) {
  const key = 'iskra.transcription.job.' + JSON.stringify([owner, lessonKey])
  const token = localStorage.getItem(tokenKey(owner)) || ''
  const [pending, setPending] = useState(() => readPending(owner, lessonKey, source, file))
  const [mode, setMode] = useState<TranscriptionMode>(pending?.mode ?? initialMode)
  const [titleRegion, setTitleRegion] = useState(pending?.titleRegion ?? 'top-left')
  const stages = mode === 'slides' ? ['Видео', 'Читаем слайды'] : textStages
  const [busy, setBusy] = useState(false)
  const [preparation, setPreparation] = useState('Передаём запись…')
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState<JobProgress>()
  const progressStage = useRef('')
  const [canCancel, setCanCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [stageStartedAt, setStageStartedAt] = useState(0)
  const [clock, setClock] = useState(Date.now())
  const [progressAge, setProgressAge] = useState<number>()
  useEffect(() => {
    if (!pending || cancelled) return
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pending, cancelled])
  async function cancel() {
    if (!pending || cancelling) return
    setCancelling(true); setCancelError('')
    try { await localRequest('/jobs/' + pending.id, token, { method: 'DELETE', signal: AbortSignal.timeout(10000) }) }
    catch (error) { setCancelling(false); setCancelError((error as Error).message) }
  }
  function clearCancelled() {
    setPending(null); localStorage.removeItem(key); setCancelled(false)
    setCancelling(false); setStage(''); setProgress(undefined); setError('')
  }
  const [error, setError] = useState(pending?.failure ?? '')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const [unavailable, setUnavailable] = useState(false)
  const [retry, setRetry] = useState(0)
  // Дорожки участников (Zoom пишет звук каждого отдельным файлом): голоса — точно.
  const [tracks, setTracks] = useState<File[]>([])
  // Уровень Б: копить звук исправленных реплик на этом Mac для дообучения модели.
  const [keepTraining, setKeepTraining] = useState(() => { try { return localStorage.getItem(TRAINING_KEY) === '1' } catch { return false } })
  const toggleTraining = (on: boolean) => { setKeepTraining(on); try { localStorage.setItem(TRAINING_KEY, on ? '1' : '0') } catch { /* без памяти — только на эту запись */ } }
  const [fastAsr, setFastAsr] = useState(() => { try { return localStorage.getItem(FAST_ASR_KEY) === '1' } catch { return false } })
  const toggleFastAsr = (on: boolean) => { setFastAsr(on); try { localStorage.setItem(FAST_ASR_KEY, on ? '1' : '0') } catch { /* без памяти — только на эту запись */ } }
  const slidesReadyRef = useRef(onSlidesReady)
  useEffect(() => { slidesReadyRef.current = onSlidesReady }, [onSlidesReady])
  const readyRef = useRef(onReady)
  useEffect(() => { readyRef.current = onReady }, [onReady])
  async function start() {
    setError('')
    setUnavailable(false)
    const form = new FormData()
    form.append('mode', mode); form.append('titleRegion', titleRegion)
    // Контекст урока — подпись задания в виджете очереди (и под будущий бэкенд,
    // который сохранит его в job для кросс-девайса).
    if (lessonTitle) form.append('lessonTitle', lessonTitle)
    if (courseTitle) form.append('courseTitle', courseTitle)
    const inputFile = selectedFile ?? file ?? localFile
    if (inputFile) form.append('video', inputFile)
    else form.append('link', source.trim())
    if (mode === 'text') for (const track of tracks) form.append('tracks', track)
    // Быстрое распознавание: русскую речь ведём через GigaAM, смешанную — whisper (auto).
    if (mode === 'text' && fastAsr) form.append('engine', 'auto')
    setBusy(true)
    try {
      requestTranscriptionCompanionStart()
      setPreparation('Запускаем модуль…')
      await waitForTranscriptionCompanion()
      if (!mounted.current) return
      const module = await readModule()
      if (module.freshness === 'unknown') throw new LocalTranscriptionUnavailable('Не удалось проверить версию обработчика. Проверьте связь с модулем и повторите.')
      if (module.freshness === 'outdated') {
        if (!module.selfUpdate) throw new Error('Обновите приложение расшифровки в профиле Искры и повторите.')
        setPreparation('Обновляем обработчик…')
        const updated = await updateModule(token)
        if (updated === null) throw new Error('Модуль занят другой расшифровкой. Дождитесь её завершения и повторите.')
        if (!updated) throw new Error('Не удалось обновить обработчик. Проверьте интернет и повторите. Сохранённая расшифровка не изменена.')
      }
      if (!mounted.current) return
      setPreparation('Передаём запись…')
      if (mode === 'slides' && !(await localRequest('/version', '')).slideChapters) throw new Error('Для глав по слайдам обновите модуль в профиле Искры и повторите.')
      // Словарь предмета: термины — подсказка Whisper, пары — исправления.
      // Нет словаря — модуль распознаёт как раньше.
      const pack = mode === 'text' ? await fetchTermsPack(subject ?? '') : []
      if (pack.length || lessonTitle) form.append('terms', JSON.stringify(termsForModule(pack, lessonTitle, lessonText)))
      if (mode === 'text' && keepTraining) form.append('training', '1')
      if (!mounted.current) return
      const { id } = await localRequest('/jobs', token, { method: 'POST', body: form })
      // lessonTitle/courseTitle — чтобы виджет очереди подписал задание названием
      // урока и дал переход в Конструктор (lessonId берётся из ключа задания).
      const job = { id, mode, titleRegion, source: source.trim(), fileSignature: file ? fileSignature(file) : undefined,
        ...(lessonTitle ? { lessonTitle } : {}), ...(courseTitle ? { courseTitle } : {}) }
      if (!mounted.current) return
      localStorage.setItem(key, JSON.stringify(job))
      setPending(job)
    } catch (e) { if (mounted.current) { setUnavailable(e instanceof LocalTranscriptionUnavailable); setError((e as Error).message) } }
    finally { if (mounted.current) setBusy(false) }
  }
  useEffect(() => {
    if (!pending || pending.failure || cancelled) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    async function poll(job: Pending) {
      try {
        const state = await localRequest('/jobs/' + job.id, token)
        if (!active) return
        setError(''); setUnavailable(false)
        setCanCancel(state.canCancel === true)
        setCancelling(state.cancelling === true)
        if (state.cancelled) {
          setCancelled(true); setCancelling(false); setStage(state.stage); setProgress(undefined)
          return
        }
        const measuredElapsed = Number(state.elapsedSeconds)
        if (state.elapsedSeconds != null && Number.isFinite(measuredElapsed)) {
          setStageStartedAt(Date.now() - measuredElapsed * 1000)
        } else {
          const timeKey = key + ':stage-time'
          let started = Date.now()
          try {
            const saved = JSON.parse(localStorage.getItem(timeKey) || 'null')
            if (saved?.id === job.id && saved?.stage === state.stage && Number.isFinite(saved.at)) started = saved.at
            else localStorage.setItem(timeKey, JSON.stringify({ id: job.id, stage: state.stage, at: started }))
          } catch { /* old module: local elapsed time only */ }
          setStageStartedAt(started)
        }
        setProgressAge(typeof state.progressAgeSeconds === 'number' ? state.progressAgeSeconds : undefined)
        // A missing metric in one poll must not erase an already measured value.
        // Reset on the actual worker stage (including preparation substeps), not
        // merely the visible row, and never carry another job's values forward.
        const metricKey = job.id + ':' + state.stage
        const sameStage = progressStage.current === metricKey
        progressStage.current = metricKey
        const incoming = state.progress as JobProgress | undefined
        const valid = incoming && Number.isFinite(incoming.current) && Number.isFinite(incoming.total)
          && incoming.current >= 0 && incoming.total >= 0
        setProgress(previous => valid ? incoming : sameStage ? previous : undefined)
        setStage(state.stage + (state.bytes ? ' · ' + megabytes(state.bytes) : ''))
        if (state.error) {
          const message = state.stage || 'Не удалось завершить обработку записи.'
          const failedJob = {...job, failure:message, dismissed:false}
          localStorage.setItem(key, JSON.stringify(failedJob))
          setPending(failedJob); setError(message); onFailed(message)
          return
        }
        if (!state.done) { timer = setTimeout(() => void poll(job), 1000); return }
        const memory = await readCorrections(owner, subject ?? 'other')
        if (!active) return
        if (job.mode === 'slides') {
          if (state.mode !== 'slides' || !Array.isArray(state.chapters) || !state.chapters.length) throw new Error('Не удалось получить главы по слайдам. Текущие главы не изменены.')
          slidesReadyRef.current(state.chapters.map((c: {start:number;title:string}) => ({seconds:c.start,time:transcriptTime(c.start),label:correctedText(sentenceTitle(c.title), 'slide-title', memory),originalTitle:c.title})))
          return
        }
        // Паузы и громкость от модуля (если он уже обновлён) — для окна монтажа.
        const read = readTranscript({ source: job.source, segments: state.segments, montage: state.montage })
        if (!read) throw new Error('Нет реплик для проверки.')
        // Голоса от модуля: реплики сразу с говорящими, узнанные — по имени.
        const { transcript, voices } = applyModuleVoices(read, state.voices)
        readyRef.current({ transcript: {...transcript, segments: transcript.segments.map(s => ({...s,text:correctedText(s.text,'speech',memory)}))}, jobId: job.id, ...(voices ? { voices } : {}), timecodes: state.chapters.map((c: { start: number; title: string }) =>
          ({ seconds: c.start, time: transcriptTime(c.start), label: correctedText(sentenceTitle(c.title), 'text-title', memory) })) })
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
  }, [pending, token, retry, cancelled])
  const currentStep = mode === 'slides' ? (stage.startsWith('Читаем слайды') || stage === 'Готово' ? 1 : 0) : transcriptionStageIndex(stage)
  const elapsed = stageStartedAt ? transcriptTime(Math.max(0, (clock - stageStartedAt) / 1000)) : '0:00'
  const eta = useTimeLeft(progressStage.current, progress, !!pending && !error && !cancelled && !cancelling && !!stage)
  const metric = progress?.unit === 'seconds' ? transcriptTime : progress?.unit === 'bytes' ? megabytes : (n: number) => String(n)
  return <section className="transcription-inline" aria-busy={!!pending && !error && !cancelled}>
    <header className="transcription-inline-head"><span className="transcription-mark"><AudioLines size={21}/></span>
      <div><strong>Расшифровка урока</strong><small>Обработка на вашем компьютере</small></div>
      <button data-hover="layer" type="button" aria-label="К записи урока" disabled={busy} style={btn('S','secondary')} onClick={onClose}><X size={16}/></button>
    </header>
    <div className="transcription-form">
    {!pending && <fieldset disabled={busy} style={{border:0,margin:0,padding:0}}><legend className="sr-only">Режим обработки</legend><Segmented variant="filter" value={mode} onChange={setMode} items={[{id:'text',label:'По тексту'},{id:'slides',label:'По слайдам'}]} /></fieldset>}
    {!pending && mode === 'slides' && <>
      <p className="transcription-hint">Главы из названий на слайдах, без повторного распознавания речи. Повторяющаяся тема появится только один раз — в момент первого появления.</p>
      <label className="slide-region-label">Где находится заголовок</label>
      <TeacherSelect value={titleRegion} onChange={setTitleRegion} disabled={busy} clearable={false} search={false} options={[
        {value:'top-left',label:'Слева вверху'}, {value:'top-right',label:'Справа вверху'},
        {value:'top',label:'Сверху по всей ширине'}, {value:'bottom-left',label:'Слева внизу'},
        {value:'bottom-right',label:'Справа внизу'}, {value:'bottom',label:'Снизу по всей ширине'},
      ]} />
      <p className="transcription-hint">Выберите область с названием темы, без постоянной подписи курса. Перед применением можно проверить и поправить найденные главы.</p>
    </>}
    {!pending && <label className="transcription-picker">
      <Upload size={18}/><strong>{selectedFile ? selectedFile.name : localFile ? `Файл с компьютера: ${localFile.name}` : 'Выбрать исходный файл вместо ссылки'}</strong>
      <small>{localFile && !selectedFile ? 'Обработаем этот файл без скачивания с диска. Расшифровка останется у ссылки для учеников.' : 'Выберите то же видео, что добавлено в урок. Доступ к просмотру по ссылке не всегда разрешает скачивание для обработки.'}</small>
      <input type="file" accept="video/*,audio/*,.mkv" aria-label="Исходный файл для обработки" disabled={busy} onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}/>
    </label>}
    {!pending && mode === 'text' && <p className="transcription-hint">Используем запись этого урока. После обработки вы сможете проверить текст и главы.</p>}
    {!pending && mode === 'text' && <label className="transcription-picker">
      <Upload size={18} /><strong>{tracks.length ? `Дорожек участников: ${tracks.length}` : 'Дорожки участников — необязательно'}</strong>
      <small>{tracks.length ? tracks.map(t => t.name).join(', ') : 'Zoom умеет сохранять звук каждого отдельным файлом. С ними голоса подпишутся точно, по именам файлов.'}</small>
      <input type="file" multiple accept="audio/*,.m4a" aria-label="Дорожки участников" disabled={busy} onChange={e => setTracks([...(e.target.files ?? [])])} />
    </label>}
    {!pending && mode === 'text' && <div className="transcription-training">
      <span><strong>Быстрое распознавание (эксперимент)</strong><small>Русскую речь распознаёт быстрее и с пунктуацией; английские вставки сам отдаёт точному движку — покусочно, в одной расшифровке. Первый запуск скачивает модель (~320 МБ).</small></span>
      <Switch checked={fastAsr} onChange={toggleFastAsr} disabled={busy} label="Быстрое распознавание (эксперимент)" />
    </div>}
    {!pending && mode === 'text' && <div className="transcription-training">
      <span><strong>Учить распознавание на моих правках</strong><small>Звук исправленных реплик остаётся только на этом Mac — из него потом дообучим модель. Ученикам и в Искру он не уходит.</small></span>
      <Switch checked={keepTraining} onChange={toggleTraining} disabled={busy} label="Учить распознавание на моих правках" />
    </div>}
    {pending && !error && !cancelled && <>
      <small className="transcription-hint" aria-live="polite">{stage || 'Проверяем обработку…'}{stageStartedAt > 0 && ` · прошло ${elapsed}`}</small>
      {progress?.phase && <small className="transcription-hint">{progress.phase}{progress.total > 0 ? ": процент относится к этой фазе" : ""}</small>}
      {stage === 'Скачиваем видео' && <small className="transcription-hint">Быстрее — выберите файл на Mac: остановите задание и начните заново с файлом записи.</small>}
      {progressAge !== undefined && progressAge >= 30 && <small className="transcription-hint">Обработчик ещё запущен. Новых данных о прогрессе нет {transcriptTime(progressAge)} — это не подтверждает зависание.</small>}
      <p className="transcription-hint">Можно обновить страницу и вернуться в этот урок. Принятое задание остаётся на Mac.<br />Если интернет пропадёт во время скачивания, модуль дождётся связи.</p>
      <ol className="transcription-job-steps">{stages.map((step, i) => {
        const active = i === currentStep && !cancelling
        const completed = i < currentStep
        const percent = active && progress && progress.current >= 0 && progress.total > 0
          ? Math.min(99, Math.max(0, Math.floor(progress.current / progress.total * 100))) : undefined
        return <li key={step} aria-current={active ? 'step' : undefined}>
          {active && <span className="transcription-fill" data-indeterminate={percent === undefined} style={{width: (percent ?? 30) + '%'}} />}
          <span className="transcription-number">{i < currentStep ? <Check size={14} /> : active ? <Loader2 size={14} className="transcription-spinner" aria-hidden /> : i + 1}</span>
          <strong>{step}</strong>{active && percent === undefined && <span className="transcription-percent">В процессе…</span>}{percent !== undefined && <span className="transcription-percent" role="progressbar" aria-label={step} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>{percent}%</span>}{!active && !completed && <span className="transcription-percent">Ожидает</span>}
        </li>
      })}</ol>
      {(eta || (progress && progress.total > 0)) && <small className="transcription-hint">
        {progress && progress.total > 0 && <>{metric(progress.current)} из {metric(progress.total)}{progress.unit === 'bytes' ? '' : ' ' + (progress.unit === 'frames' ? 'кадров' : progress.unit === 'slides' ? 'слайдов' : progress.unit === 'chapters' ? 'глав' : progress.unit === 'chunks' ? 'фрагментов звука' : progress.unit === 'segments' ? 'реплик' : progress.unit === 'voices' ? 'голосов' : 'записи')}{eta && ' · '}</>}
        {eta && (progress && progress.total > 0 ? eta : eta[0].toUpperCase() + eta.slice(1))}
      </small>}
    </>}
    {pending && !error && !cancelled && <div className="transcription-cancel">
      {canCancel ? <button type="button" style={btn('M','secondary')} disabled={cancelling} onClick={() => void cancel()}>
        {cancelling ? 'Останавливаем обработку…' : 'Остановить расшифровку'}
      </button> : <small className="transcription-hint">Этот модуль не поддерживает отмену с сайта. Закрытие панели не останавливает обработку.</small>}
      {cancelError && <p role="alert" className="transcription-hint">{cancelError}</p>}
    </div>}
    {cancelled && <div className="transcription-recovery" role="status">
      <strong>Расшифровка отменена</strong><p>Вычисления остановлены. Можно начать заново.</p>
      <button type="button" style={btn('M','secondary')} onClick={clearCancelled}>Начать заново</button>
    </div>}
    {error && <div role="alert" className="transcription-recovery">
      <strong>{unavailable ? 'Модуль недоступен' : 'Не удалось завершить расшифровку'}</strong>
      <p>{error}</p>
      {unavailable && pending && <p>Задание сохранено. Проверяем связь автоматически. Если модуль работает, обработка продолжается на Mac.</p>}
      {pending && (unavailable
        ? <button data-hover="layer" type="button" style={btn('M','secondary')} onClick={() => { setError(''); setUnavailable(false); setRetry(value => value + 1) }}>Проверить связь</button>
        : <button data-hover="layer" type="button" style={btn('M','secondary')} onClick={() => { setPending(null); localStorage.removeItem(key); setError(''); setStage(''); setProgress(undefined) }}>Начать заново</button>)}
    </div>}
    </div>
    {!pending ?
      <button data-hover="layer" className="transcription-start" disabled={busy} style={btn('M','primary')} onClick={start}><AudioLines size={16} />{busy ? preparation : mode === 'slides' ? 'Найти главы по слайдам' : 'Начать расшифровку'}</button> : undefined}
  </section>
}
