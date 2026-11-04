import { useId, useRef, useState } from 'react'
import { FIELD } from '../../lib/fieldStyle'
import { btn } from '../../lib/pillStyles'
import { useT } from '../../lib/i18n'
import { Upload } from '../icons/appIcons'
import TeacherSaveButton from './TeacherSaveButton'

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
      <input value={url} readOnly={busy} autoFocus aria-label={t('Ссылка на запись')}
        onChange={e => { setUrl(e.target.value); setFailed(false) }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void save(); if (e.key === 'Escape' && !busy) onClose() }}
        placeholder={t('Вставьте ссылку RuTube / YouTube / Google Диск')}
        style={{ ...FIELD, flex: 1, minWidth: 0, padding: '7px 12px' }} />
      <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime,.m4v,.ogv" hidden onChange={e => {
        const file = e.currentTarget.files?.[0]
        e.currentTarget.value = ''
        if (file) onPickFile(file)
      }} />
      <button type="button" disabled={busy || !!unavailable} onClick={() => fileInput.current?.click()}
        style={{ ...btn('M', 'secondary'), flexShrink: 0, ...(uploading ? { opacity: 1, cursor: 'progress' } : {}) }}>
        <Upload size={14} /> {uploading ? t('Загружаем…') : t('Файл')}
      </button>
      <button type="button" disabled={busy} onClick={onClose} style={{ ...btn('M', 'secondary'), flexShrink: 0 }}>{t('Отмена')}</button>
      <TeacherSaveButton label={t('Сохранить')} savingLabel={t('Сохраняем…')} saving={saving} disabled={busy || !!unavailable}
        onClick={save} style={{ flexShrink: 0, ...(saving ? { opacity: 1 } : {}) }} />
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
  const [failed, setFailed] = useState(false)

  async function save() {
    if (saving || unavailable) return
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
      <input id={id} value={url} readOnly={saving} onChange={e => { setUrl(e.target.value); setFailed(false) }}
        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void save(); if (e.key === 'Escape' && !saving) onClose() }}
        placeholder={t('Вставьте ссылку RuTube / YouTube / Google Диск')}
        style={{ ...FIELD, minWidth: 0, fontSize: 16, padding: '12px 16px' }} autoFocus />
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={saving} onClick={onClose} style={{ ...btn('M', 'secondary'), minHeight: 44 }}>{t('Отмена')}</button>
        <TeacherSaveButton label={t('Сохранить')} savingLabel={t('Сохраняем…')} saving={saving} disabled={saving || !!unavailable}
          onClick={save} style={{ flex: 1, minHeight: 44, ...(saving ? { opacity: 1 } : {}) }} />
      </div>
      <span role="status" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{saving ? t('Сохраняем…') : ''}</span>
      {(unavailable || failed) && <div role="alert" style={{ fontSize: 14, color: 'var(--color-text)' }}>{unavailable || t('Не удалось сохранить. Попробуйте ещё раз.')}</div>}
    </div>
  </div>
}
