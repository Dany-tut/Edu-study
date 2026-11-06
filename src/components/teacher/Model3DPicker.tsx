// ─────────────────────────────────────────────────────────────────────────────
// Выбор 3D-модели для конспекта урока.
//
// Слева список моделей реестра по предметам, справа одна живая сцена той,
// что выбрана. Сетка живых миниатюр здесь не годится: браузер держит около
// шестнадцати сцен WebGL одновременно, и на втором открытии окна старые сцены
// начинали гаснуть. Одна сцена — и выбор видно, и окно лёгкое.
//
// Предмет курса стоит первым и выбран по умолчанию; «Все» показывает
// остальное — клетка нужна и в химии белка, атом — в физике.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from 'react'
import Modal from '../Modal'
import Model3DFigure from '../Model3DFigure'
import { MODEL_PRESETS } from '../../lib/models3d/registry'
import { useT } from '../../lib/i18n'

type Filter = 'bio' | 'chem' | 'all'

const SUBJECT_LABEL: Record<'bio' | 'chem', string> = { bio: 'Биология', chem: 'Химия' }

/** Предмет курса → раздел реестра. Остальные предметы открывают «Все». */
function filterFor(courseSubject?: string): Filter {
  const s = (courseSubject ?? '').toLowerCase()
  if (s.startsWith('bio') || s.includes('биолог')) return 'bio'
  if (s.startsWith('chem') || s.includes('хими')) return 'chem'
  return 'all'
}

export default function Model3DPicker({ courseSubject, current, onPick, onClose }: {
  courseSubject?: string
  /** Ссылка модели, которую заменяем; для новой — пусто. */
  current?: string
  onPick: (ref: string) => void
  onClose: () => void
}) {
  const t = useT()
  const [filter, setFilter] = useState<Filter>(() => filterFor(courseSubject))
  const list = useMemo(
    () => MODEL_PRESETS.filter(p => filter === 'all' || p.subject === filter),
    [filter],
  )
  const [selected, setSelected] = useState<string>(() => current ?? list[0]?.ref ?? MODEL_PRESETS[0].ref)
  const label = MODEL_PRESETS.find(p => p.ref === selected)?.label ?? ''

  const chip = (id: Filter, text: string) => (
    <button
      key={id}
      type="button"
      data-hover="layer"
      aria-pressed={filter === id}
      onClick={() => {
        setFilter(id)
        const first = MODEL_PRESETS.find(p => id === 'all' || p.subject === id)
        if (first && !MODEL_PRESETS.some(p => p.ref === selected && (id === 'all' || p.subject === id))) setSelected(first.ref)
      }}
      style={{
        padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
        border: `1px solid ${filter === id ? '#786AD7' : 'transparent'}`,
        background: filter === id ? 'color-mix(in srgb, #786AD7 12%, var(--color-bg-4))' : 'var(--color-bg-4)',
        color: filter === id ? '#786AD7' : 'var(--color-text)',
      }}
    >
      {text}
    </button>
  )

  return (
    <Modal
      onClose={onClose}
      title={current ? t('Заменить 3D-модель') : t('3D-модель в конспект')}
      subtitle={t('У ученика — живая сцена: вращение, разбор, справка по каждой части')}
      width={820}
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" data-hover="layer" onClick={onClose}
            style={{ padding: '9px 16px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('Отмена')}
          </button>
          <button type="button" data-hover="layer" onClick={() => onPick(selected)}
            style={{ padding: '9px 16px', borderRadius: 12, border: 'none', background: '#786AD7', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {current ? t('Заменить') : t('Вставить')}
          </button>
        </div>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {chip('bio', t(SUBJECT_LABEL.bio))}
          {chip('chem', t(SUBJECT_LABEL.chem))}
          {chip('all', t('Все'))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <div role="listbox" aria-label={t('Модели')} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {list.map(p => (
              <button
                key={p.ref}
                type="button"
                role="option"
                aria-selected={selected === p.ref}
                data-hover="layer"
                onClick={() => setSelected(p.ref)}
                onDoubleClick={() => onPick(p.ref)}
                style={{
                  textAlign: 'left', padding: '8px 10px', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                  border: 'none',
                  background: selected === p.ref ? 'color-mix(in srgb, #786AD7 12%, transparent)' : 'transparent',
                  color: selected === p.ref ? '#786AD7' : 'var(--color-text)',
                  fontWeight: selected === p.ref ? 600 : 500,
                }}
              >
                {t(p.label)}
                {filter === 'all' && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--color-muted)', marginTop: 2 }}>
                    {t(SUBJECT_LABEL[p.subject])}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            {/* key — новая сцена на каждую модель: старая освобождает WebGL. */}
            <Model3DFigure key={selected} src={selected} compact />
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 8 }}>
              {label} · {t('крутите и нажимайте на части, как ученик')}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
