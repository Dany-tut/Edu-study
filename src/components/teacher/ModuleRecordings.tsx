// Записи модуля из папки Диска: облачко на модуле, облачко у урока и окно
// «папка → сопоставление файлов с уроками». Концепт согласован Дани 24.11.2026:
// design/recordings-import/concept.html (A — папка, B — сопоставление,
// C — компактный статус: облачко, подпись при наведении).
import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Cloud, RefreshCw } from '../icons/appIcons'
import Modal from '../Modal'
import Switch from '../Switch'
import TeacherSelect from './TeacherSelect'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'
import { textFadeStyle } from '../../lib/textFades'
import {
  confirmItems, formatBytes, kickSource, revertItem, saveSourceAndConfirm, scanFolder,
  type RecordingItem, type RecordingSource, type ScanResult, type ScannedFile,
} from '../../lib/recordingImports'
import './moduleRecordings.css'

type Tone = 'ok' | 'busy' | 'wait' | 'bad' | 'idle'

function itemTone(i: RecordingItem): Tone {
  if (i.status === 'applied') return 'ok'
  if (i.status === 'confirmed' || i.status === 'copying') return 'busy'
  if (i.status === 'proposed') return 'wait'
  if (i.status === 'failed' || i.status === 'conflict') return 'bad'
  return 'idle'
}
const KIND_LABEL: Record<string, string> = { number: 'по номеру', title: 'по названию', order: 'по порядку', manual: 'вручную' }

function useItemLabel() {
  const t = useT()
  return (i: RecordingItem) => {
    switch (i.status) {
      case 'applied': return `${t('Запись в Искре')} · ${i.file_name}`
      case 'confirmed': return `${t('В очереди на копирование')} · ${i.file_name}`
      case 'copying': return `${t('Копируем из папки')} · ${i.file_name}`
      case 'proposed': return `${t('Ждёт подтверждения')} · ${i.file_name}`
      case 'conflict': return `${t('Не поставили: ссылку в уроке поменяли вручную')} · ${i.file_name}`
      case 'failed': return `${t('Не удалось скопировать')}: ${i.error ?? ''}`
      default: return i.file_name
    }
  }
}

/** Облачко у урока: статус записи из папки. Подпись — при наведении. */
export function LessonRecordingCloud({ item }: { item?: RecordingItem }) {
  const label = useItemLabel()
  if (!item || item.status === 'skipped') return null
  const tone = itemTone(item)
  return (
    <span className="rec-cloud" data-tone={tone} title={label(item)} aria-label={label(item)} role="img">
      <Cloud size={14} aria-hidden="true" />
      {tone !== 'idle' && <span className="rec-cloud-dot" aria-hidden="true" />}
    </span>
  )
}

/** Кнопка-облачко модуля + окно папки и сопоставления. */
export function ModuleRecordingsButton({ moduleId, moduleLabel, source, items, disabledReason, onChanged }: {
  moduleId: string; moduleLabel: string; source?: RecordingSource; items: RecordingItem[]
  disabledReason?: string; onChanged: () => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const lessonItems = items.filter(i => i.lesson_id && i.status !== 'skipped')
  const applied = lessonItems.filter(i => i.status === 'applied').length
  const busy = items.some(i => i.status === 'confirmed' || i.status === 'copying')
  const waiting = items.filter(i => i.status === 'proposed').length
  const bad = items.some(i => i.status === 'failed' || i.status === 'conflict')
  const tone: Tone = !source ? 'idle' : bad ? 'bad' : busy ? 'busy' : waiting ? 'wait' : 'ok'
  const title = disabledReason ?? (!source ? t('Папка с записями')
    : [`${t('Папка')} · ${source.provider === 'yadisk' ? 'Яндекс Диск' : 'Google Диск'}`,
      `${applied} ${t('в Искре')}`, busy ? t('копируем…') : '', waiting ? `${waiting} ${t('ждут подтверждения')}` : '',
      bad ? t('есть ошибки') : ''].filter(Boolean).join(' · '))
  return (
    <>
      <button type="button" className="course-visibility-button rec-module-button" data-tone={tone} data-hover="layer"
        title={title} aria-label={title} disabled={!!disabledReason} onClick={e => { e.stopPropagation(); setOpen(true) }}>
        <Cloud size={15} aria-hidden="true" />
        {source && <span className="rec-module-count">{applied}</span>}
      </button>
      <AnimatePresence>
        {open && <RecordingsDialog moduleId={moduleId} moduleLabel={moduleLabel} source={source} items={items}
          onClose={() => { setOpen(false); onChanged() }} onChanged={onChanged} />}
      </AnimatePresence>
    </>
  )
}

type Row = { file: ScannedFile; lessonId: string; on: boolean; replace: boolean; manual: boolean }

function RecordingsDialog({ moduleId, moduleLabel, source, items, onClose, onChanged }: {
  moduleId: string; moduleLabel: string; source?: RecordingSource; items: RecordingItem[]
  onClose: () => void; onChanged: () => void
}) {
  const t = useT()
  const label = useItemLabel()
  const [url, setUrl] = useState(source?.folder_url ?? '')
  const [autoSync, setAutoSync] = useState(source?.auto_sync ?? true)
  const [editingFolder, setEditingFolder] = useState(!source)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState<'' | 'scan' | 'save' | 'kick'>('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const lessonsById = useMemo(() => Object.fromEntries((scan?.lessons ?? []).map(l => [l.id, l])), [scan])
  const lessonOptions = useMemo(() => (scan?.lessons ?? []).map((l, i) => ({ value: l.id, label: `${i + 1}. ${l.title}` })), [scan])
  const proposed = items.filter(i => i.status === 'proposed')

  async function runScan() {
    setBusy('scan'); setError(''); setNote('')
    try {
      const res = await scanFolder(moduleId, url)
      setScan(res)
      setRows(res.files.map(f => {
        const lesson = res.lessons.find(l => l.id === f.lesson_id)
        const hasVideo = !!lesson?.youtube_url?.trim()
        return { file: f, lessonId: f.lesson_id ?? '', on: !!f.lesson_id && !f.duplicate && f.playable && !hasVideo, replace: false, manual: false }
      }))
      if (!res.files.length) setNote(res.known ? t('Новых видео в папке нет — всё уже подтянуто.') : t('В папке не нашлось видео (mp4, mov, webm).'))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy('') }
  }

  async function save() {
    if (!scan) return
    setBusy('save'); setError('')
    try {
      const chosen = rows.map(r => ({ file: r.file, lessonId: r.on && r.lessonId ? r.lessonId : null, replace: r.replace, manual: r.manual }))
      await saveSourceAndConfirm(moduleId, scan, autoSync, chosen)
      onChanged(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy('') }
  }

  async function pull() {
    if (!source) return
    setBusy('kick'); setError(''); setNote('')
    try {
      const { added } = await kickSource(source.id)
      setNote(added ? `${t('Найдено новых файлов')}: ${added}` : t('Новых файлов в папке нет'))
      onChanged()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy('') }
  }

  async function confirmProposed(item: RecordingItem, replace: boolean) {
    if (!source) return
    setBusy('save'); setError('')
    try {
      await confirmItems(source.id, [{ file: { provider_file_id: item.provider_file_id, file_name: item.file_name, size_bytes: item.size_bytes, match_kind: item.match_kind }, lessonId: item.lesson_id, replace }])
      onChanged()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy('') }
  }

  const checked = rows.filter(r => r.on && r.lessonId)
  const total = checked.reduce((s, r) => s + (r.file.size_bytes ?? 0), 0)
  const showTable = !!scan && rows.length > 0

  const footer = showTable ? (
    <div className="rec-footer">
      <span className="rec-footer-note">{rows.some(r => lessonsById[r.lessonId]?.youtube_url && !r.replace)
        ? t('Уроки с уже стоящей записью не трогаем, пока не отметите «заменить».') : `${checked.length} ${t('из')} ${rows.length} · ${formatBytes(total)}`}</span>
      <button type="button" style={btn('M', 'secondary')} onClick={() => { setScan(null); setRows([]) }} disabled={!!busy}>{t('Назад')}</button>
      <button type="button" style={btn('M', 'primary')} onClick={save} disabled={!!busy || !checked.length}>
        {busy === 'save' ? t('Сохраняем…') : `${t('Скопировать записи')}: ${checked.length}`}
      </button>
    </div>
  ) : editingFolder ? (
    <div className="rec-footer">
      <span className="rec-footer-note" />
      {source && <button type="button" style={btn('M', 'secondary')} onClick={() => setEditingFolder(false)} disabled={!!busy}>{t('Отмена')}</button>}
      <button type="button" style={btn('M', 'primary')} onClick={runScan} disabled={!!busy || !url.trim()}>
        {busy === 'scan' ? t('Читаем папку…') : t('Найти записи')}
      </button>
    </div>
  ) : (
    <div className="rec-footer">
      <span className="rec-footer-note" />
      <button type="button" style={btn('M', 'secondary')} onClick={() => setEditingFolder(true)} disabled={!!busy}>{t('Сменить папку')}</button>
      <button type="button" style={btn('M', 'primary')} onClick={pull} disabled={!!busy}>
        <RefreshCw size={14} aria-hidden="true" style={{ marginRight: 6 }} />{busy === 'kick' ? t('Проверяем…') : t('Подтянуть записи')}
      </button>
    </div>
  )

  return (
    <Modal onClose={onClose} width={showTable ? 760 : 520} title={`${t('Записи модуля')} «${moduleLabel}»`}
      subtitle={showTable ? `${scan!.provider === 'yadisk' ? 'Яндекс Диск' : 'Google Диск'} · ${rows.length} ${t('видео')}` : undefined} footer={footer}>
      {error && <div className="rec-error" role="alert">{error}</div>}
      {note && <div className="rec-note">{note}</div>}

      {showTable ? (
        <div className="rec-table" role="table">
          {rows.map((r, idx) => {
            const lesson = lessonsById[r.lessonId]
            const hasVideo = !!lesson?.youtube_url?.trim()
            const set = (patch: Partial<Row>) => setRows(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x))
            return (
              <div className="rec-tr" role="row" key={r.file.provider_file_id}>
                <span role="cell"><Switch checked={r.on} onChange={on => set({ on })} disabled={!r.lessonId || !r.file.playable} label={r.file.file_name} size="S" /></span>
                <span role="cell" className="rec-file">
                  <span className="rec-file-name" style={textFadeStyle}>{r.file.file_name}</span>
                  <span className="rec-sub">{formatBytes(r.file.size_bytes)}{!r.file.playable ? ` · ${t('формат не играет в браузере')}` : ''}</span>
                </span>
                <span role="cell" className="rec-lesson">
                  <TeacherSelect small value={r.lessonId} options={lessonOptions} placeholder={t('Без урока')}
                    onChange={v => set({ lessonId: v, manual: true, on: !!v && r.file.playable, replace: false })} />
                </span>
                <span role="cell" className="rec-kind">
                  {!r.lessonId ? <span className="rec-chip" data-tone="bad">{t('нет урока')}</span>
                    : r.file.duplicate && !r.manual ? <span className="rec-chip" data-tone="bad">{t('дубль')}</span>
                    : hasVideo ? <button type="button" className="rec-chip" data-tone="wait" data-on={r.replace || undefined}
                        title={lesson?.youtube_url ?? ''} onClick={() => set({ replace: !r.replace, on: !r.replace })}>
                        {r.replace ? t('заменить ✓') : t('есть запись')}</button>
                    : <span className="rec-chip">{t(KIND_LABEL[r.manual ? 'manual' : r.file.match_kind ?? 'order'])}</span>}
                </span>
              </div>
            )
          })}
        </div>
      ) : editingFolder ? (
        <div className="rec-connect">
          <label className="rec-field">
            <span className="rec-field-label">{t('Ссылка на папку Google Диска или Яндекс Диска')}</span>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://disk.yandex.ru/d/…"
              onKeyDown={e => { if (e.key === 'Enter' && url.trim() && !busy) void runScan() }} autoFocus inputMode="url" />
          </label>
          <p className="rec-hint">{t('Папка должна быть открыта по ссылке. Ролики копируются в Искру и ставятся в уроки модуля по номеру или названию в имени файла.')}</p>
          <Switch checked={autoSync} onChange={setAutoSync} label={t('Подтягивать новые записи сами')} />
        </div>
      ) : (
        <div className="rec-status">
          <a className="rec-folder" style={textFadeStyle} href={source!.folder_url} target="_blank" rel="noreferrer">{source!.folder_url}</a>
          {source!.last_error && <div className="rec-error">{t('Последняя проверка')}: {source!.last_error}</div>}
          {proposed.length > 0 && <div className="rec-sub">{t('Ждут подтверждения')}:</div>}
          {[...proposed, ...items.filter(i => i.status !== 'proposed' && i.status !== 'skipped')].map(i => (
            <div className="rec-item" key={i.id}>
              <LessonRecordingCloud item={i} />
              <span className="rec-item-text" style={textFadeStyle}>{label(i)}</span>
              {i.status === 'proposed' && i.lesson_id && (
                <button type="button" style={btn('S', 'primary')} disabled={!!busy}
                  onClick={() => confirmProposed(i, !!i.expected_old_url)}>{i.expected_old_url ? t('Заменить') : t('Поставить')}</button>)}
              {i.status === 'applied' && i.expected_old_url && (
                <button type="button" style={btn('S', 'secondary')} disabled={!!busy}
                  onClick={async () => { setBusy('save'); try { await revertItem(i.id); onChanged() } finally { setBusy('') } }}>{t('Вернуть прежнюю')}</button>)}
            </div>
          ))}
          {!items.length && <div className="rec-sub">{t('Файлов пока нет — нажмите «Подтянуть записи».')}</div>}
          {items.some(i => i.status === 'applied') && <p className="rec-hint">{t('Поставленные ссылки появятся в редакторе урока после обновления страницы курса.')}</p>}
        </div>
      )}
    </Modal>
  )
}
