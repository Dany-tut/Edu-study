// «или ссылкой» под плиткой файла урока: вместо загрузки в бакет — ссылка на
// Google Диск / Яндекс Диск. Так прикрепляют то, что больше лимита бакета
// (см. LessonFile.url в lib/lessonFiles).

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { makeLinkFile, type LessonFile } from '../../lib/lessonFiles'

export function LessonLinkAttach({ onAdd, compact }: { onAdd: (file: LessonFile) => void; compact?: boolean }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [err, setErr] = useState(false)
  const fs = compact ? 10.5 : 11.5

  function submit() {
    const file = makeLinkFile(value)
    if (!file) { setErr(true); return }
    onAdd(file)
    setValue(''); setErr(false); setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start', gap: 4,
          width: '100%', marginTop: 6, padding: '2px 4px', border: 'none', background: 'transparent',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: fs, color: 'var(--color-text-3)',
        }}
      >
        <Link2 size={12} />
        {t('или ссылкой на Диск')}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          autoFocus
          value={value}
          onChange={e => { setValue(e.target.value); setErr(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); submit() }
            if (e.key === 'Escape') { setOpen(false); setValue(''); setErr(false) }
          }}
          placeholder="https://drive.google.com/…"
          style={{
            flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 8, fontFamily: 'inherit', fontSize: fs,
            border: `1px solid ${err ? 'var(--color-red-text)' : 'var(--color-border-medium)'}`,
            background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none',
          }}
        />
        <button
          onClick={submit}
          style={{
            flexShrink: 0, padding: '5px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: fs, fontWeight: 600,
            background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
          }}
        >
          {t('Добавить')}
        </button>
      </div>
      <p style={{ marginTop: 3, fontSize: compact ? 10 : 11, lineHeight: 1.3, color: err ? 'var(--color-red-text)' : 'var(--color-muted)' }}>
        {err ? t('Это не похоже на ссылку') : t('Доступ на Диске: «Все, у кого есть ссылка»')}
      </p>
    </div>
  )
}
