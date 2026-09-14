import type { CSSProperties } from 'react'
import { Loader2, Pencil, Send } from 'lucide-react'
import { useT } from '../../lib/i18n'

// Состояние урока/курса одной деталью вместо пары кнопок «Черновик» +
// «Опубликовать»: сегмент показывает, где материал сейчас, и по нажатию
// переводит в другое состояние. Активный черновик — жёлтый, опубликован —
// фиолетовый; неактивная половина — приглушённая подпись.
//
// Подписи лежат поверх невидимой жирной копии себя (как в SegmentFilter):
// иначе смена жирности при переключении меняла бы ширину и ряд дёргался.
export default function DraftPublishToggle({ published, onPublish, onDraft, saving = false, style }: {
  published: boolean
  onPublish: () => void
  /** Без обработчика «Черновик» только показывает состояние — публикацию нельзя отменить. */
  onDraft?: () => void
  saving?: boolean
  style?: CSSProperties
}) {
  const t = useT()

  const seg = (active: boolean, activeBg: string, activeColor: string, clickable: boolean): CSSProperties => ({
    // flex: 1 — при заданной ширине (редактор курса ровняет по колонке уроков)
    // половины делят её поровну; без ширины переключатель по-прежнему по тексту.
    flex: 1, justifyContent: 'center',
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: 'none',
    background: active ? activeBg : 'transparent',
    color: active ? activeColor : 'var(--color-text-3)',
    fontSize: 13.5, fontWeight: active ? 700 : 500, fontFamily: 'inherit', whiteSpace: 'nowrap',
    cursor: clickable ? 'pointer' : 'default', transition: 'background 0.16s, color 0.16s',
  })

  const label = (text: string) => (
    <span style={{ display: 'grid', justifyItems: 'center' }}>
      <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>{text}</span>
      <span style={{ gridArea: '1 / 1' }}>{text}</span>
    </span>
  )

  const draftClickable = published && !!onDraft && !saving
  const publishClickable = !published && !saving

  return (
    <div role="radiogroup" style={{
      display: 'flex', gap: 2, padding: 3, borderRadius: 999, flexShrink: 0,
      border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)', ...style,
    }}>
      <button role="radio" aria-checked={!published}
        onClick={draftClickable ? onDraft : undefined}
        style={seg(!published, 'var(--color-yellow-soft)', 'var(--color-yellow-text)', draftClickable)}>
        <Pencil size={13} strokeWidth={2.2} /> {label(t('Черновик'))}
      </button>
      <button role="radio" aria-checked={published}
        onClick={publishClickable ? onPublish : undefined}
        style={seg(published, 'var(--color-purple-soft)', 'var(--color-purple-text)', publishClickable)}>
        {saving
          ? <Loader2 size={13} strokeWidth={2.2} style={{ animation: 'spin 0.9s linear infinite' }} />
          : <Send size={13} strokeWidth={2.2} />}
        {label(t('Опубликован'))}
      </button>
    </div>
  )
}
