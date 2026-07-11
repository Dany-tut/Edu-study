import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, RotateCcw, Image as ImageIcon, ClipboardCheck, Loader2, PenLine, X } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import { GlassPill } from '../../mobileChrome'
import { PAIR } from '../../../lib/mobileTokens'
import { tactile } from '../../../lib/feedback'
import { sanitizeHtml } from '../../../lib/sanitizeHtml'
import { useHardSubmissions, useHomework, type HardSub } from '../../../lib/useHomework'
import { optimizePhoto, ImageTooLargeError } from '../../../lib/imageOptim'
import WhiteboardCanvas from '../WhiteboardCanvas'
import { DEMO_HARD_SUBS, DEMO_HW, isDemoId } from '../../../data/teacherDevDemo'

// Attachments the teacher leaves on the reviewed work — mirrors the desktop
// hard-review composer (фото + доска). Persisted via reviewHard's legacy shape.
type ReviewAttachments = { photos: string[]; board: string | null }

// MOBILE ONLY review queue. The actionable part is "сложные" submissions —
// accept / return with one tap (reviewHard). Regular homework that still needs
// per-task grading is surfaced as a list with a "проверьте на ПК" hint, since
// that flow is multi-step and desktop-bound.

function HardCard({ sub, onReviewed }: { sub: HardSub; onReviewed: (id: string, verdict: 'completed' | 'returned', comment: string, att: ReviewAttachments) => Promise<void> }) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<null | 'completed' | 'returned'>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [board, setBoard] = useState<string | null>(null)
  const [showBoard, setShowBoard] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const initials = sub.studentName.trim().slice(0, 2).toUpperCase() || '—'
  const photoCount = sub.attachments.photos.length

  function addPhotos(files: FileList | null) {
    if (!files) return
    setPhotoError(null)
    Array.from(files).forEach(async file => {
      try {
        const src = await optimizePhoto(file)
        if (src) setPhotos(p => [...p, src])
      } catch (e) {
        if (e instanceof ImageTooLargeError) setPhotoError(e.message)
        else throw e
      }
    })
  }

  const act = async (verdict: 'completed' | 'returned') => {
    if (busy) return
    tactile()
    setBusy(verdict)
    await onReviewed(sub.id, verdict, comment.trim(), { photos, board })
    // hook reloads → this card drops out of the list
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--color-avatar-bg)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.studentName || 'Ученик'}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.lessonTitle}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: PAIR.review.bg, color: PAIR.review.text, flexShrink: 0 }}>сложное</span>
      </div>

      {photoCount > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {sub.attachments.photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
              <img src={url} alt={`решение ${i + 1}`} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--color-border-soft)' }} />
            </a>
          ))}
        </div>
      )}
      {photoCount === 0 && sub.comment && (
        /<\/?[a-z][\s\S]*>/i.test(sub.comment) ? (
          <div className="rich-answer" style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.4, padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-4)', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(sub.comment) }} />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.4, padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-4)' }}>{sub.comment}</div>
        )
      )}

      <input
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Комментарий ученику…"
        style={{ width: '100%', fontSize: 13, padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)', color: 'var(--color-text)' }}
      />

      {/* Приложить к ответу — фото + доска, как в проверке на ПК */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current?.click()} className="cursor-pointer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 12.5, fontWeight: 700 }}>
            <ImageIcon size={14} /> Фото
          </button>
          <button onClick={() => setShowBoard(v => !v)} className="cursor-pointer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: `1px solid ${showBoard || board ? 'var(--color-accent)' : 'var(--color-border-medium)'}`, background: showBoard || board ? 'var(--color-purple-soft)' : 'var(--color-bg-2)', color: showBoard || board ? 'var(--color-accent)' : 'var(--color-text)', fontSize: 12.5, fontWeight: 700 }}>
            <PenLine size={14} /> {board ? 'Доска ✓' : 'Доска'}
          </button>
        </div>
        {photoError && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-peach-text)', marginTop: 8 }}>{photoError}</div>}
        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
            {photos.map((src, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border-soft)' }}>
                <img src={src} alt="" style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} />
                <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} className="cursor-pointer" style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        {showBoard && <div style={{ marginTop: 10 }}><WhiteboardCanvas initialData={board ?? undefined} onSave={setBoard} /></div>}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => act('returned')}
          disabled={!!busy}
          className="cursor-pointer"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 14, background: PAIR.error.bg, color: PAIR.error.text, border: '1px solid transparent', fontSize: 14, fontWeight: 650 }}
        >
          {busy === 'returned' ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Вернуть
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => act('completed')}
          disabled={!!busy}
          className="cursor-pointer"
          style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 14, background: PAIR.success.bg, color: PAIR.success.text, border: '1px solid transparent', fontSize: 14, fontWeight: 700 }}
        >
          {busy === 'completed' ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} />} Принять
        </motion.button>
      </div>
    </div>
  )
}

export default function MobileTeacherReview() {
  const { submissions, reviewHard } = useHardSubmissions()
  const { homework } = useHomework()

  const realHard = submissions.filter(s => s.status === 'submitted')
  const realHw = homework
    .filter(h => h.status !== 'closed' && h.submittedCount > h.reviewedCount)

  // DEV-only: nothing to review locally → показать демо-инбокс (в БД не пишем).
  const demo = import.meta.env.DEV && realHard.length === 0 && realHw.length === 0
  const pendingHard = demo ? DEMO_HARD_SUBS : realHard
  const pendingHw = demo ? DEMO_HW : realHw

  // Demo submissions have no DB row — swallow the review action instead of
  // firing a Supabase write against a fake id.
  const onReviewed = async (id: string, verdict: 'completed' | 'returned', comment: string, att: ReviewAttachments) => {
    if (isDemoId(id)) return
    await reviewHard(id, verdict, comment, { ...att, annotation: null })
  }

  const topZone = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GlassPill><ClipboardCheck size={15} /> Проверка</GlassPill>
    </div>
  )

  return (
    <MobileScreen topZone={topZone} topPad={64} scrollKey="t-review">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pendingHard.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, padding: '0 2px' }}>
              СЛОЖНЫЕ · {pendingHard.length}
            </div>
            {pendingHard.map(s => (
              <HardCard key={s.id} sub={s} onReviewed={onReviewed} />
            ))}
          </div>
        )}

        {pendingHw.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, padding: '0 2px' }}>
              ДОМАШНИЕ ЗАДАНИЯ
            </div>
            {pendingHw.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
                <ImageIcon size={18} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>{h.groupName} · {h.submittedCount - h.reviewedCount} ждут</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', flexShrink: 0 }}>на ПК</span>
              </div>
            ))}
          </div>
        )}

        {pendingHard.length === 0 && pendingHw.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: PAIR.success.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={26} style={{ color: PAIR.success.text }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Инбокс пуст</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)' }}>Все работы проверены</div>
          </div>
        )}
      </div>
    </MobileScreen>
  )
}
