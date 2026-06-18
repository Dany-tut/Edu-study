import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, RotateCcw, Check, ClipboardList, PenLine, Image as ImageIcon } from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useHardSubmissions } from '../../lib/useHomework'
import { openHardSubHomework } from '../../lib/teacherNav'
import WhiteboardCanvas from '../../components/teacher/WhiteboardCanvas'

const glass: React.CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.88)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  borderRadius: 20,
  boxShadow: 'var(--shadow-sm-page)',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
}

export default function TeacherHardReviewPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const openHomeworkEdit = useTeacher(s => s.openHomeworkEdit)
  const reviewingHardId = useTeacher(s => s.reviewingHardId)
  const { submissions, reviewHard } = useHardSubmissions()
  const sub = submissions.find(s => s.id === reviewingHardId) ?? null

  const [busy, setBusy] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [returnError, setReturnError] = useState(false)
  const [hwBusy, setHwBusy] = useState(false)
  const [hwMissing, setHwMissing] = useState(false)
  const [zoom, setZoom] = useState<string | null>(null)

  if (!sub) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>Работа не найдена</div>
        <button onClick={() => setActivePage('homework')} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Назад</button>
      </div>
    )
  }

  const initials = sub.studentName.split(' ').map(p => p[0]).join('').slice(0, 2)
  const date = sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  const statusLabel = sub.status === 'completed' ? 'Принято' : sub.status === 'returned' ? 'Возвращено' : 'На проверке'
  const statusColor = sub.status === 'completed' ? 'var(--color-green-text)' : sub.status === 'returned' ? 'var(--color-peach-text)' : 'var(--color-purple-text)'
  const statusBg = sub.status === 'completed' ? 'var(--color-green-soft)' : sub.status === 'returned' ? 'var(--color-peach-soft)' : 'var(--color-purple-soft)'

  const photos = sub.attachments?.photos ?? []
  const board = sub.attachments?.board ?? null
  const hasAnything = !!(sub.comment || photos.length || board)

  async function act(verdict: 'completed' | 'returned') {
    if (verdict === 'returned' && !reviewComment.trim()) { setReturnError(true); return }
    setBusy(true)
    await reviewHard(sub!.id, verdict, reviewComment.trim())
    setBusy(false)
    setActivePage('homework')
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 16px' }}>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => setActivePage('homework')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
            background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={15} strokeWidth={2} /> Назад
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Star size={16} style={{ color: 'var(--color-accent)' }} fill="currentColor" />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Хард-уровень · {sub.lessonTitle || sub.baseRef}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, padding: '3px 9px', borderRadius: 8 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Three columns */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '0 24px 40px' }}>
        {/* Left — student + open homework */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
          <div style={{ ...glass, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{sub.studentName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>Сдано {date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'var(--color-purple-soft)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.75, marginBottom: 4 }}>Базовая</div>
                <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-accent)' }}>2/2</div>
              </div>
            </div>
          </div>

          <div style={{ ...glass, padding: 14 }}>
            <motion.button
              whileHover={{ scale: hwBusy ? 1 : 1.02 }} whileTap={{ scale: hwBusy ? 1 : 0.98 }}
              onClick={async () => {
                setHwBusy(true); setHwMissing(false)
                const ok = await openHardSubHomework(sub.baseRef, openHomeworkEdit)
                setHwBusy(false)
                if (!ok) setHwMissing(true)
              }}
              disabled={hwBusy}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '11px 0', borderRadius: 14, border: '1px solid var(--color-border-medium)',
                cursor: hwBusy ? 'default' : 'pointer', background: 'var(--color-bg-2)', color: 'var(--color-text)',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: hwBusy ? 0.6 : 1,
              }}
            >
              <ClipboardList size={15} strokeWidth={2.2} style={{ color: 'var(--color-accent)' }} />
              {hwBusy ? 'Открываю…' : 'Открыть домашку'}
            </motion.button>
            {hwMissing && (
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, lineHeight: 1.4 }}>
                Эта работа не связана с домашкой (хард-задание из урока).
              </div>
            )}
          </div>
        </div>

        {/* Center — the answer content */}
        <div style={{ flex: 1, minWidth: 0, ...glass, padding: 22, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Text */}
          {sub.comment && (
            <div>
              <SectionLabel>Ответ ученика</SectionLabel>
              <div style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {sub.comment}
              </div>
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <SectionLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ImageIcon size={13} /> Фото · {photos.length}</span></SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {photos.map((src, i) => (
                  <button key={i} onClick={() => setZoom(src)} style={{ padding: 0, border: '1px solid var(--color-border-soft)', borderRadius: 14, overflow: 'hidden', cursor: 'zoom-in', background: 'var(--color-bg-2)' }}>
                    <img src={src} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Whiteboard */}
          {board && (
            <div>
              <SectionLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={13} /> Доска</span></SectionLabel>
              <WhiteboardCanvas readOnly initialData={board} />
            </div>
          )}

          {!hasAnything && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-4)', fontSize: 14, fontStyle: 'italic' }}>
              Ученик ничего не приложил
            </div>
          )}
        </div>

        {/* Right — review actions */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
          <div style={{ ...glass, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sub.status === 'submitted' ? (
              <>
                <div>
                  <SectionLabel>Комментарий преподавателя</SectionLabel>
                  <textarea
                    value={reviewComment}
                    onChange={e => { setReviewComment(e.target.value); if (returnError) setReturnError(false) }}
                    placeholder="Что исправить? Обязательно при отправке на доработку…"
                    rows={5}
                    style={{
                      width: '100%', boxSizing: 'border-box', resize: 'vertical',
                      padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg-2)',
                      border: `1px solid ${returnError ? 'var(--color-peach-text)' : 'var(--color-border-soft)'}`,
                      fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  {returnError && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-peach-text)', marginTop: 6 }}>
                      Добавьте комментарий, чтобы вернуть работу на доработку.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <motion.button
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    onClick={() => act('completed')} disabled={busy}
                    style={{
                      padding: '13px 0', borderRadius: 14, border: 'none', background: 'var(--grad-green)',
                      color: '#fff', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 6px 18px rgba(42,125,79,0.28)', opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Check size={15} /> Принять
                  </motion.button>
                  <motion.button
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    onClick={() => act('returned')} disabled={busy}
                    style={{
                      padding: '13px 0', borderRadius: 14, border: '1px solid var(--color-border-medium)',
                      background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 14, fontWeight: 700,
                      cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <RotateCcw size={14} /> На доработку
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: sub.status === 'completed' ? 'var(--color-green-soft)' : 'var(--color-peach-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sub.status === 'completed'
                    ? <><Star size={16} style={{ color: 'var(--color-green-text)' }} fill="currentColor" /><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green-text)' }}>Работа принята</span></>
                    : <><RotateCcw size={16} style={{ color: 'var(--color-peach-text)' }} /><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-peach-text)' }}>Отправлено на доработку</span></>}
                </div>
                {sub.reviewComment && (
                  <div>
                    <SectionLabel>Комментарий преподавателя</SectionLabel>
                    <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {sub.reviewComment}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Photo zoom overlay */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, cursor: 'zoom-out' }}
        >
          <img src={zoom} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />
        </div>
      )}
    </div>
  )
}
