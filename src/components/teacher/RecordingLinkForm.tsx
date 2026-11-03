import { useId, useState } from 'react'
import { FIELD } from '../../lib/fieldStyle'
import { btn } from '../../lib/pillStyles'
import { useT } from '../../lib/i18n'
import TeacherSaveButton from './TeacherSaveButton'

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
