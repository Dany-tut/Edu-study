import WhiteboardCanvas from './WhiteboardCanvas'
import { Image as ImageIcon, PenLine, Clock } from 'lucide-react'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { useHomeworkPhoto } from '../../lib/homeworkPhotos'

// Тело ответа ученика: текст/HTML + фото + доска. ОДИН источник разметки для
// страницы проверки (учитель) и для возврата (ученик) — чтобы живая разметка
// (AnnotationLayer) ложилась на те же пиксели на обеих сторонах. Любое расхождение
// в стилях/верстке сдвинуло бы чернила, поэтому рендер строго общий.

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}

// Фото и доска могут быть base64 (старые сдачи) или ссылкой `hwp:` на бакет
// (lib/homeworkPhotos). Через 7 дней файл удаляется — на его месте заглушка,
// балл и разбор учителя остаются в ленте.
function ExpiredPhoto({ minHeight, expired }: { minHeight: number; expired: boolean }) {
  const t = useT()
  return (
    <div style={{ minHeight, boxSizing: 'border-box', padding: '16px 14px', borderRadius: 14, border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', color: 'var(--color-text-3)' }}>
      {expired ? <Clock size={18} /> : <ImageIcon size={18} />}
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, color: 'var(--color-text-2)' }}>{expired ? t('Фото удалено через 7 дней') : t('Фото не загрузилось')}</div>
      {expired && <div style={{ fontSize: 12, lineHeight: 1.25 }}>{t('Оценка и комментарии сохранены')}</div>}
    </div>
  )
}

function PhotoTile({ src: ref, clickable, onZoom }: { src: string; clickable: boolean; onZoom?: (src: string) => void }) {
  const ph = useHomeworkPhoto(ref)
  if (ph.status === 'expired' || ph.status === 'missing') return <ExpiredPhoto minHeight={140} expired={ph.status === 'expired'} />
  const src = ph.status === 'ready' ? ph.src : undefined
  return (
    <button
      onClick={clickable && src ? () => onZoom?.(src) : undefined}
      disabled={!clickable}
      style={{ padding: 0, border: '1px solid var(--color-border-soft)', borderRadius: 14, overflow: 'hidden', cursor: clickable ? 'zoom-in' : 'crosshair', background: 'var(--color-bg-2)', minHeight: src ? undefined : 140 }}
    >
      {src && <img src={src} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'contain' }} />}
    </button>
  )
}

function BoardView({ src: ref }: { src: string }) {
  const ph = useHomeworkPhoto(ref)
  if (ph.status === 'expired' || ph.status === 'missing') return <ExpiredPhoto minHeight={120} expired={ph.status === 'expired'} />
  if (ph.status === 'loading') return <div style={{ minHeight: 120, borderRadius: 14, background: 'var(--color-bg-2)' }} />
  return <WhiteboardCanvas readOnly initialData={ph.src} />
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
              <PhotoTile key={i} src={src} clickable={photosClickable} onZoom={onZoomPhoto} />
            ))}
          </div>
        </div>
      )}

      {board && (
        <div>
          <Label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={13} /> {t('Доска')}</span></Label>
          <BoardView src={board} />
        </div>
      )}
    </div>
  )
}
