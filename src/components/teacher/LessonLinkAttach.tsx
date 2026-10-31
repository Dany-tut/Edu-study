// «или ссылкой» под плиткой файла урока: вместо загрузки в бакет — ссылка на
// Google Диск / Яндекс Диск. Так прикрепляют то, что больше лимита бакета
// (см. LessonFile.url в lib/lessonFiles).

import { useState } from 'react'
import { Link2, Globe, Info, X } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { makeLinkFile, type LessonFile } from '../../lib/lessonFiles'

/**
 * Широкое поле «добавить ссылкой». Всегда раскрыто — живёт под строкой карточек
 * во всю её ширину (см. TeacherCourseEditorPage): поле больше не ютится в тесной
 * колонке. `slotLabel` — какому слоту принадлежит ссылка; `onCancel` сворачивает.
 */
export function LessonLinkPanel({
  slotLabel, onAdd, onCancel,
}: {
  slotLabel: string
  onAdd: (file: LessonFile) => void
  onCancel: () => void
}) {
  const t = useT()
  const [value, setValue] = useState('')
  const [err, setErr] = useState(false)

  function submit() {
    const file = makeLinkFile(value)
    if (!file) { setErr(true); return }
    onAdd(file)
    setValue(''); setErr(false)
    onCancel()
  }

  return (
    <div style={{
      marginTop: 10, padding: '12px 14px', borderRadius: 14,
      border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Link2 size={13} style={{ color: 'var(--color-primary, #786AD7)' }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-2)' }}>
          {t('Ссылка для')} «{slotLabel}»
        </span>
        <button
          onClick={onCancel}
          aria-label={t('Отмена')}
          style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: 2 }}
        >
          <X size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 11px', borderRadius: 10, background: 'var(--color-bg)',
          border: `1px solid ${err ? 'var(--color-red-text)' : 'var(--color-border-medium)'}`,
        }}>
          <Globe size={14} style={{ flexShrink: 0, color: 'var(--color-muted)' }} />
          <input
            autoFocus
            value={value}
            onChange={e => { setValue(e.target.value); setErr(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submit() }
              if (e.key === 'Escape') { onCancel() }
            }}
            placeholder="https://drive.google.com/…"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'inherit', fontSize: 12.5, color: 'var(--color-text)',
            }}
          />
        </div>
        <button
          onClick={submit}
          style={{
            flexShrink: 0, padding: '0 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            background: 'var(--color-green-text)', color: '#fff',
          }}
        >
          {t('Добавить')}
        </button>
      </div>

      <div style={{
        marginTop: 7, display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 10.5, lineHeight: 1.3, color: err ? 'var(--color-red-text)' : 'var(--color-muted)',
      }}>
        <Info size={12} style={{ flexShrink: 0 }} />
        {err ? t('Это не похоже на ссылку') : t('Доступ на Диске: «Все, у кого есть ссылка»')}
      </div>
    </div>
  )
}

/**
 * Самораскрывающийся вариант для вертикальных плиток (TeacherLessonEditorPage):
 * строка «или ссылкой на Диск» → поле во всю ширину плитки.
 */
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
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 9px', borderRadius: 9, background: 'var(--color-bg)',
          border: `1px solid ${err ? 'var(--color-red-text)' : 'var(--color-border-medium)'}`,
        }}>
          <Globe size={13} style={{ flexShrink: 0, color: 'var(--color-muted)' }} />
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
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'inherit', fontSize: fs, color: 'var(--color-text)',
            }}
          />
        </div>
        <button
          onClick={submit}
          style={{
            flexShrink: 0, padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: fs, fontWeight: 600,
            background: 'var(--color-green-text)', color: '#fff',
          }}
        >
          {t('Добавить')}
        </button>
      </div>
      <p style={{ marginTop: 5, fontSize: compact ? 10 : 11, lineHeight: 1.3, color: err ? 'var(--color-red-text)' : 'var(--color-muted)' }}>
        {err ? t('Это не похоже на ссылку') : t('Доступ на Диске: «Все, у кого есть ссылка»')}
      </p>
    </div>
  )
}
