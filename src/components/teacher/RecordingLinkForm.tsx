import { useId, useRef, useState, type CSSProperties } from 'react'
import { FIELD } from '../../lib/fieldStyle'
import AuthFadeInput from '../AuthFadeInput'
import { btn } from '../../lib/pillStyles'
import { useT } from '../../lib/i18n'
import { uploadRecordingFile } from '../../lib/lessonFiles'
import { Check, Loader2, Upload, X } from '../icons/appIcons'
import TeacherSaveButton, { teacherSaveStyle } from './TeacherSaveButton'

/** Только то, что parseVideoSource узнаёт по расширению как файл или звук:
 *  иначе ссылка R2 ушла бы в iframe и показала бы голый файл. */
const RECORDING_ACCEPT = '.mp4,.m4v,.mov,.webm,.ogv,.mp3,.m4a,.aac,.wav,.opus,.oga,.flac'

/**
 * Кнопка «Файл»: выбрать запись с компьютера, залить её в R2 и сохранить
 * ссылкой как обычный адрес записи. Ошибку отдаёт наверх — показывает форма.
 */
export function RecordingFileButton({ onUploaded, onBusy, onError, disabled, label, style }: {
  onUploaded: (url: string) => Promise<boolean>
  onBusy?: (busy: boolean) => void
  onError: (message: string) => void
  disabled?: boolean
  label?: string
  style?: CSSProperties
}) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function pick(file: File | undefined) {
    if (!file) return
    setBusy(true)
    onBusy?.(true)
    onError('')
    try {
      const url = await uploadRecordingFile(file)
      if (!await onUploaded(url)) onError(t('Не удалось сохранить. Попробуйте ещё раз.'))
    } catch (e) {
      onError((e as Error).message || t('Не удалось загрузить файл'))
    } finally {
      setBusy(false)
      onBusy?.(false)
    }
  }

  return <>
    <input ref={input} type="file" accept={RECORDING_ACCEPT} hidden
      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f) }} />
    <button type="button" disabled={disabled || busy} onClick={() => input.current?.click()}
      style={{ ...btn('M', 'secondary'), ...style, ...(busy ? { opacity: 1, cursor: 'progress' } : {}) }}>
      <Upload size={14} /> {busy ? t('Загружаем…') : label ?? t('Файл')}
    </button>
  </>
}

/** Правка записи прямо в строке над плеером: ссылка или файл, без ухода со
 *  страницы — плеер и главы ниже остаются на месте. Файл заливает экран
 *  (onPickFile), форма только показывает, что идёт загрузка. */
export function RecordingInlineEdit({ initialUrl, onSave, onClose, onPickFile, uploading, uploadError, unavailable }: {
  initialUrl: string
  onSave: (url: string) => Promise<boolean>
  onClose: () => void
  onPickFile: (file: File) => void
  uploading: boolean
  uploadError?: string
  unavailable?: string
}) {
  const t = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const busy = saving || uploading

  async function save() {
    if (busy || unavailable) return
    if (url.trim() === initialUrl.trim()) { onClose(); return }
    setSaving(true)
    setFailed(false)
    try {
      if (await onSave(url.trim())) { onClose(); return }
    } catch { /* Keep the editable link for retry. */ }
    setSaving(false)
    setFailed(true)
  }

  const message = unavailable || uploadError || (failed ? t('Не удалось сохранить. Попробуйте ещё раз.') : '')
  return <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {/* Длинная ссылка уходит за край поля — фейд показывает, что там ещё текст. */}
      <AuthFadeInput value={url} readOnly={busy} autoFocus aria-label={t('Ссылка на запись')}
        onChange={e => { setUrl(e.target.value); setFailed(false) }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void save(); if (e.key === 'Escape' && !busy) onClose() }}
        placeholder={t('Вставьте ссылку RuTube / YouTube / Google Диск')}
        fadeColor="var(--color-bg-input)" wrapStyle={{ flex: 1, minWidth: 0 }}
        style={{ ...FIELD, padding: '7px 12px' }} />
      <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime,.m4v,.ogv" hidden onChange={e => {
        const file = e.currentTarget.files?.[0]
        e.currentTarget.value = ''
        if (file) onPickFile(file)
      }} />
      {/* Строка над плеером узкая: «Файл» — одной иконкой, поле ссылки важнее подписей. */}
      <button type="button" disabled={busy || !!unavailable} onClick={() => fileInput.current?.click()}
        title={uploading ? t('Загружаем…') : t('Загрузить файл')} aria-label={uploading ? t('Загружаем…') : t('Загрузить файл')}
        style={{ ...btn('M', 'secondary'), width: 36, padding: 0, justifyContent: 'center', flexShrink: 0, ...(uploading ? { opacity: 1, cursor: 'progress' } : {}) }}>
        <Upload size={14} />
      </button>
      {/* Сохранить — галочкой того же вида, что TeacherSaveButton: подпись не влезает
          над узким плеером, а Enter в поле сохраняет так же. */}
      <button type="button" disabled={busy || !!unavailable} onClick={() => void save()}
        title={saving ? t('Сохраняем…') : t('Сохранить')} aria-label={saving ? t('Сохраняем…') : t('Сохранить')}
        style={{ ...teacherSaveStyle({ disabled: busy || !!unavailable }), width: 40, padding: 0, ...(saving ? { opacity: 1, cursor: 'progress' } : {}) }}>
        {saving ? <Loader2 size={15} strokeWidth={2.5} /> : <Check size={15} strokeWidth={2.5} />}
      </button>
      {/* Крестик — выйти из правки без изменений, на том же месте, где был крестик удаления. */}
      <button type="button" disabled={busy} onClick={onClose} title={t('Отмена')} aria-label={t('Отмена')}
        style={{ width: 28, height: 28, borderRadius: 9, border: 'none', background: 'transparent', cursor: busy ? 'default' : 'pointer', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
        <X size={15} />
      </button>
    </div>
    {message && <div role="alert" style={{ fontSize: 12, color: 'var(--color-text)', paddingLeft: 13 }}>{message}</div>}
  </div>
}

export default function RecordingLinkForm({ initialUrl, onSave, onClose, unavailable }: {
  initialUrl: string
  onSave: (url: string) => Promise<boolean>
  onClose: () => void
  unavailable?: string
}) {
  const t = useT()
  const id = useId()
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const busy = saving || uploading

  async function save() {
    if (busy || unavailable) return
    setSaving(true)
    setFailed(false)
    try {
      if (await onSave(url.trim())) { onClose(); return }
    } catch { /* Keep the editable link for retry. */ }
    setSaving(false)
    setFailed(true)
  }

  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px clamp(12px, 3vw, 32px)' }}>
    <div style={{ width: '100%', minWidth: 0, maxWidth: 480, display: 'grid', gap: 12 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', paddingLeft: 13 }}>{t('Ссылка на запись')}</label>
      <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
        <input id={id} value={url} readOnly={busy} onChange={e => { setUrl(e.target.value); setFailed(false) }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void save(); if (e.key === 'Escape' && !busy) onClose() }}
          placeholder={t('Вставьте ссылку RuTube / YouTube / Google Диск')}
          style={{ ...FIELD, flex: 1, minWidth: 0, fontSize: 16, padding: '12px 16px' }} autoFocus />
        <RecordingFileButton disabled={busy || !!unavailable} onBusy={setUploading} onError={setUploadError}
          onUploaded={async next => { const ok = await onSave(next); if (ok) onClose(); return ok }}
          style={{ flexShrink: 0, minHeight: 44 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={busy} onClick={onClose} style={{ ...btn('M', 'secondary'), minHeight: 44 }}>{t('Отмена')}</button>
        <TeacherSaveButton label={t('Сохранить')} savingLabel={t('Сохраняем…')} saving={saving} disabled={busy || !!unavailable}
          onClick={save} style={{ flex: 1, minHeight: 44, ...(saving ? { opacity: 1 } : {}) }} />
      </div>
      <span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{saving ? t('Сохраняем…') : ''}</span>
      {(unavailable || failed || uploadError) && <div role="alert" style={{ fontSize: 14, color: 'var(--color-text)' }}>{unavailable || uploadError || t('Не удалось сохранить. Попробуйте ещё раз.')}</div>}
    </div>
  </div>
}
