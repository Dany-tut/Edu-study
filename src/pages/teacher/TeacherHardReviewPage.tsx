import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Star, ClipboardList } from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import {
  useHardSubmissions, type Annotation as HardAnnotation,
  type HardComment, type HardReviewNew,
  teacherComments, deriveHardRowStatus, deriveHardScore, hardId,
} from '../../lib/useHomework'
import { openHardSubHomework } from '../../lib/teacherNav'
import { clearDrafts } from '../../lib/useDraft'
import HardConversation, { type HardTabVM, type ReviewPayload } from '../../components/teacher/HardConversation'
import { useT } from '../../lib/i18n'

const glass: React.CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.88)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  borderRadius: 20,
  boxShadow: 'var(--shadow-sm-page)',
}

export default function TeacherHardReviewPage() {
  const t = useT()
  const setActivePage = useTeacher(s => s.setActivePage)
  const openHomeworkEdit = useTeacher(s => s.openHomeworkEdit)
  const reviewingHardId = useTeacher(s => s.reviewingHardId)
  const { submissions, reviewHardMulti } = useHardSubmissions()
  const sub = submissions.find(s => s.id === reviewingHardId) ?? null

  const [busy, setBusy] = useState(false)
  const [hwBusy, setHwBusy] = useState(false)
  const [hwMissing, setHwMissing] = useState(false)
  const [zoom, setZoom] = useState<string | null>(null)
  // Активная вкладка задания. Пустая строка → берём первую в HardConversation.
  const [activeKey, setActiveKey] = useState<string>('')

  if (!sub) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{t('Работа не найдена')}</div>
        <button onClick={() => setActivePage('homework')} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t('Назад')}</button>
      </div>
    )
  }

  const initials = sub.studentName.split(' ').map(p => p[0]).join('').slice(0, 2)
  const date = sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  const statusLabel = sub.status === 'completed' ? t('Принято') : sub.status === 'returned' ? t('Возвращено') : t('На проверке')
  const statusColor = sub.status === 'completed' ? 'var(--color-green-text)' : sub.status === 'returned' ? 'var(--color-peach-text)' : 'var(--color-purple-text)'
  const statusBg = sub.status === 'completed' ? 'var(--color-green-soft)' : sub.status === 'returned' ? 'var(--color-peach-soft)' : 'var(--color-purple-soft)'

  // Вкладки = задания, присланные учеником (снапшот условия лежит в блоке).
  const tabs: HardTabVM[] = sub.taskBlocks.map((tb, i) => ({
    key: tb.key,
    title: `${t('Задание')} ${i + 1}`,
    statement: tb.statement,
  }))

  // Ревью одной вкладки: дописываем новый круг-комментарий в её историю,
  // пересчитываем статус всей работы и сумму оценок, пишем review_attachments.
  async function reviewTab(key: string, p: ReviewPayload) {
    const round: HardComment = {
      id: hardId('cmt'),
      at: new Date().toISOString(),
      comment: p.comment,
      photos: p.photos,
      board: p.board,
      boardMode: p.boardMode,
      annotation: p.annotation as HardAnnotation | null,
      verdict: p.verdict,
      score: p.verdict === 'completed' ? p.score : null,
    }
    const prevByKey = new Map(sub!.reviewBlocks.map(b => [b.key, b]))
    const tasks = sub!.taskBlocks.map(tb => ({
      key: tb.key,
      comments: [...teacherComments(prevByKey.get(tb.key)), ...(tb.key === key ? [round] : [])],
    }))
    const review: HardReviewNew = { v: 2, tasks }
    const status = deriveHardRowStatus(sub!.taskBlocks, tasks)
    const score = deriveHardScore(tasks)
    setBusy(true)
    const ok = await reviewHardMulti(sub!.id, review, status, score)
    if (!ok) {
      // Черновик комментария остаётся на месте: он единственная копия.
      window.alert(t('Не удалось сохранить проверку — проверьте связь и попробуйте ещё раз.'))
      setBusy(false)
      return
    }
    clearDrafts(`hardReview:${sub!.id}:${key}`)
    setBusy(false)
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
          <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Star size={16} style={{ color: 'var(--color-accent)' }} fill="currentColor" />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('Хард-уровень')} · {sub.lessonTitle || sub.baseRef}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, padding: '3px 9px', borderRadius: 8 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Left column (student) + conversation */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '0 24px 40px' }}>
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
          <div style={{ ...glass, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{sub.studentName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>{t('Сдано')} {date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'var(--color-purple-soft)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.75, marginBottom: 4 }}>{t('Базовая')}</div>
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
              {hwBusy ? t('Открываю…') : t('Открыть домашку')}
            </motion.button>
            {hwMissing && (
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, lineHeight: 1.4 }}>
                {t('Эта работа не связана с домашкой (хард-задание из урока).')}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <HardConversation
            tabs={tabs}
            studentBlocks={sub.taskBlocks}
            reviewBlocks={sub.reviewBlocks}
            role="teacher"
            activeKey={activeKey || tabs[0]?.key || ''}
            onSelectTab={setActiveKey}
            onZoomPhoto={setZoom}
            onReview={reviewTab}
            busy={busy}
            draftScope={`hardReview:${sub.id}`}
          />
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
