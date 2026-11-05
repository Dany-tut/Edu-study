import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Loader2, Pencil, Send } from '../icons/appIcons'
import { useT } from '../../lib/i18n'

// Состояние урока/курса одной деталью вместо пары кнопок «Черновик» +
// «Опубликовать»: сегмент показывает, где материал сейчас, и по нажатию
// переводит в другое состояние. Активный черновик — жёлтый, опубликован —
// фиолетовый; неактивная половина — приглушённая подпись.
//
// В черновике справа показано действие «Опубликовать», после записи — статус.
// Подписи лежат поверх невидимой жирной копии себя (как в SegmentFilter):
// иначе смена жирности при переключении меняла бы ширину и ряд дёргался.
export default function DraftPublishToggle({ published, onPublish, onDraft, saving = false, style, publishLabel, publishedLabel }: {
  published: boolean
  onPublish: () => void
  /** Без обработчика «Черновик» только показывает состояние — публикацию нельзя отменить. */
  onDraft?: () => void
  saving?: boolean
  style?: CSSProperties
  /** Action shown while still a draft. */
  publishLabel?: string
  /** Status shown after the item has been published. */
  publishedLabel?: string
}) {
  const t = useT()

  const seg = (active: boolean, activeBg: string, activeColor: string, clickable: boolean): CSSProperties => ({
    // flex: 1 — при заданной ширине (редактор курса ровняет по колонке уроков)
    // половины делят её поровну; без ширины переключатель по-прежнему по тексту.
    flex: 1, justifyContent: 'center',
    display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 999, border: 'none',
    background: active ? activeBg : 'transparent',
    color: active ? activeColor : 'var(--color-text-3)',
    fontSize: 14, fontWeight: active ? 700 : 500, fontFamily: 'inherit', whiteSpace: 'nowrap',
    cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s, color 0.15s',
  })

  // reserve — другие подписи, которые встанут на это место: под них тоже
  // держится место, и смена текста не двигает ряд.
  const label = (text: string, reserve: string[] = []) => (
    <span style={{ display: 'grid', justifyItems: 'center' }}>
      {[text, ...reserve].map(r => (
        <span key={r} aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>{r}</span>
      ))}
      <span style={{ gridArea: '1 / 1' }}>{text}</span>
    </span>
  )

  const draftClickable = published && !!onDraft && !saving
  const publishClickable = !published && !saving

  // Нажатие на уже активный «Черновик» ничего не делало, а выглядит он как
  // кнопка «сохранить черновик» — 30.10 учитель жал его ~36 раз подряд. Оба
  // редактора сохраняют черновик сами (курс — в базу, урок — во вкладку),
  // поэтому на такой тап отвечаем словом на пару секунд.
  const [draftNote, setDraftNote] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(noteTimer.current), [])
  const onDraftTap = () => {
    if (draftClickable) { onDraft?.(); return }
    if (published) return
    clearTimeout(noteTimer.current)
    setDraftNote(true)
    noteTimer.current = setTimeout(() => setDraftNote(false), 2200)
  }

  return (
    <div role="radiogroup" style={{
      display: 'flex', gap: 2, height: 40, boxSizing: 'border-box', padding: 4, borderRadius: 999, flexShrink: 0,
      border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)',
      boxShadow: 'var(--shadow-2)', ...style,
    }}>
      <button role="radio" aria-checked={!published}
        onClick={onDraftTap} aria-live="polite"
        style={seg(!published, 'var(--color-yellow-soft)', 'var(--color-yellow-text)', draftClickable)}>
        <Pencil size={14} strokeWidth={2} /> {draftNote ? label(t('Сохранён'), [t('Черновик')]) : label(t('Черновик'), published ? [] : [t('Сохранён')])}
      </button>
      <button role="radio" aria-checked={published}
        onClick={publishClickable ? onPublish : undefined}
        style={seg(published, 'var(--color-purple-soft)', 'var(--color-purple-text)', publishClickable)}>
        {saving
          ? <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.9s linear infinite' }} />
          : <Send size={14} strokeWidth={2} />}
        {label(published ? (publishedLabel ?? t('Опубликован')) : (publishLabel ?? t('Опубликовать')))}
      </button>
    </div>
  )
}
