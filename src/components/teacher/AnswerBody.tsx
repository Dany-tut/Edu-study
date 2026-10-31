import WhiteboardCanvas from './WhiteboardCanvas'
import { Image as ImageIcon, PenLine, Clock } from '../icons/appIcons'
import { sanitizeHtml } from '../../lib/sanitizeHtml'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { useHomeworkPhoto } from '../../lib/homeworkPhotos'

// Тело ответа ученика: текст/HTML + фото + доска. ОДИН источник разметки для
// страницы проверки (учитель) и для возврата (ученик) — чтобы живая разметка
// (AnnotationLayer) ложилась на те же пиксели на обеих сторонах. Любое расхождение
// в стилях/верстке сдвинуло бы чернила, поэтому рендер строго общий.

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}

function UnavailablePhoto({ expired }: { expired: boolean }) {
  const t = useT()
  return <div style={{ minHeight: 120, padding: 16, borderRadius: 14, border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', color: 'var(--color-text-3)' }}>
    {expired ? <Clock size={18} /> : <ImageIcon size={18} />}
    <div style={{ fontSize: 13, fontWeight: 700 }}>{expired ? t('Фото удалено через 7 дней') : t('Фото не загрузилось')}</div>
    {expired && <div style={{ fontSize: 12 }}>{t('Оценка и комментарии сохранены')}</div>}
  </div>
}

export function HomeworkPhotoTile({ photo, clickable = false, onZoom }: { photo: string; clickable?: boolean; onZoom?: (src: string) => void }) {
  const t = useT()
  const state = useHomeworkPhoto(photo)
  if (state.status === 'expired' || state.status === 'missing') return <UnavailablePhoto expired={state.status === 'expired'} />
  const src = state.status === 'ready' ? state.src : undefined
  return <button type="button" onClick={clickable && src ? () => onZoom?.(src) : undefined} disabled={!clickable || !src}
    aria-label={t('Фото')}
    style={{ padding: 0, border: '1px solid var(--color-border-soft)', borderRadius: 14, overflow: 'hidden', cursor: clickable ? 'zoom-in' : 'crosshair', background: 'var(--color-bg-2)', minHeight: src ? undefined : 140 }}>
    {src && <img src={src} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'contain' }} />}
  </button>
}

function HomeworkBoard({ photo }: { photo: string }) {
  const state = useHomeworkPhoto(photo)
  if (state.status === 'expired' || state.status === 'missing') return <UnavailablePhoto expired={state.status === 'expired'} />
  if (state.status === 'loading') return <div style={{ minHeight: 120, borderRadius: 14, background: 'var(--color-bg-2)' }} />
  return <WhiteboardCanvas key={state.src} readOnly initialData={state.src} />
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
            style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)', ...proseWrap }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment) }}
          />
        ) : (
          <div style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)', whiteSpace: 'pre-wrap', ...proseWrap }}>
            {comment}
          </div>
        )
      )}

      {!!photos?.length && (
        <div>
          <Label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ImageIcon size={14} /> {t('Фото')} · {photos.length}</span></Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {photos.map((src, i) => (
              <HomeworkPhotoTile key={i} photo={src} clickable={photosClickable} onZoom={onZoomPhoto} />
            ))}
          </div>
        </div>
      )}

      {board && (
        <div>
          <Label><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={14} /> {t('Доска')}</span></Label>
          <HomeworkBoard photo={board} />
        </div>
      )}
    </div>
  )
}
