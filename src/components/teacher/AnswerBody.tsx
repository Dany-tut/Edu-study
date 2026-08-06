import WhiteboardCanvas from './WhiteboardCanvas'
import { Image as ImageIcon, PenLine } from 'lucide-react'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'

// Тело ответа ученика: текст/HTML + фото + доска. ОДИН источник разметки для
// страницы проверки (учитель) и для возврата (ученик) — чтобы живая разметка
// (AnnotationLayer) ложилась на те же пиксели на обеих сторонах. Любое расхождение
// в стилях/верстке сдвинуло бы чернила, поэтому рендер строго общий.

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}

export default function AnswerBody({
  comment,
  photos,
  board,
  onZoomPhoto,
  photosClickable = true,
}: {
  comment?: string
  photos?: string[]
  board?: string | null
  onZoomPhoto?: (src: string) => void
  photosClickable?: boolean
}) {
  const t = useT()
  const isHtml = !!comment && /<\/?[a-z][\s\S]*>/i.test(comment)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {comment && (
        isHtml ? (
          <div
            className="rich-answer"
            style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)', ...proseWrap }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment) }}
          />
        ) : (
          <div style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap', ...proseWrap }}>
            {comment}
          </div>
        )
      )}

      {!!photos?.length && (
        <div>
          <Label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ImageIcon size={13} /> {t('Фото')} · {photos.length}</span></Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {photos.map((src, i) => (
              <button
                key={i}
                onClick={photosClickable ? () => onZoomPhoto?.(src) : undefined}
                disabled={!photosClickable}
                style={{ padding: 0, border: '1px solid var(--color-border-soft)', borderRadius: 14, overflow: 'hidden', cursor: photosClickable ? 'zoom-in' : 'crosshair', background: 'var(--color-bg-2)' }}
              >
                <img src={src} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {board && (
        <div>
          <Label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={13} /> {t('Доска')}</span></Label>
          <WhiteboardCanvas readOnly initialData={board} />
        </div>
      )}
    </div>
  )
}
