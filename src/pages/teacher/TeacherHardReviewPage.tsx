import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, ClipboardList } from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import {
  useHardSubmissions, type Annotation as HardAnnotation,
  type HardComment, type HardReviewNew,
  teacherComments, deriveHardRowStatus, deriveHardScore, hardId, taskStatus,
} from '../../lib/useHomework'
import { openHardSubHomework } from '../../lib/teacherNav'
import { clearDrafts, writeDraft } from '../../lib/useDraft'
import AiGradeCard from '../../components/teacher/AiGradeCard'
import { useAiGrades, confirmAiGrade } from '../../lib/useAiGrades'
import HardConversation, { type HardTabVM, type ReviewPayload } from '../../components/teacher/HardConversation'
import { useT, useTc } from '../../lib/i18n'
import { useStickyLift } from '../../lib/useStickyLift'
import { alertDialog } from '../../components/ConfirmHost'
import BackCircle from '../../components/BackCircle'
import { btn } from '../../lib/pillStyles'

const glass: React.CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.88)',
  backdropFilter: 'var(--blur-glass)',
  WebkitBackdropFilter: 'var(--blur-glass)',
  border: '1px solid var(--color-border-glass)',
  borderRadius: 20,
  boxShadow: 'var(--shadow-sm-page)',
}

export default function TeacherHardReviewPage() {
  const t = useT()
  const { tc, tn } = useTc()
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
  // Колонка ученика прилипшая: без поля она уезжала вверх на хвосте прокрутки
  // (нижний отступ ряда лежит уже за его содержимым) — см. lib/useStickyLift.
  // Хуки — до раннего возврата ниже.
  const sideRef = useRef<HTMLDivElement>(null)
  const sideLift = useStickyLift(sideRef)
  // Предоценка ИИ по критериям ФИПИ (hw_ai_grades, kind hard): по вкладке —
  // первичные баллы и оценка 1–5. «Править» кладёт её в черновик проверки и
  // пересоздаёт переписку, чтобы поля подхватили черновик.
  const { byProgress: aiByProgress, reload: reloadAi } = useAiGrades(sub ? [sub.id] : [])
  const [composerEpoch, setComposerEpoch] = useState(0)

  if (!sub) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{t('Работа не найдена')}</div>
        <button onClick={() => setActivePage('homework')} style={btn('M', 'secondary')}>{t('Назад')}</button>
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
      void alertDialog({ title: t('Не удалось сохранить проверку — проверьте связь и попробуйте ещё раз.'), tone: 'danger' })
      setBusy(false)
      return
    }
    // Работа проверена целиком — отметка «ИИ → учитель»: принял оценки ИИ
    // или поставил свои.
    if (status !== 'submitted' && aiGrade && (aiGrade.status === 'graded' || aiGrade.status === 'dismissed')) {
      await confirmAiGrade(aiGrade.id, score)
    }
    void reloadAi()
    clearDrafts(`hardReview:${sub!.id}:${key}`)
    setBusy(false)
  }

  const currentKey = activeKey || tabs[0]?.key || ''
  const aiGrade = aiByProgress.get(sub.id)
  const aiTask = aiGrade?.tasks.find(x => x.key === currentKey)
  const currentBlock = sub.taskBlocks.find(b => b.key === currentKey)
  const taskDone = taskStatus(currentBlock, sub.reviewBlocks.find(b => b.key === currentKey)) !== 'submitted'

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 16px' }}>
        <BackCircle onClick={() => setActivePage('homework')} label="Назад" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Star size={16} style={{ color: 'var(--color-accent)' }} fill="currentColor" />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t('Хард-уровень')} · {tc(sub.lessonTitle) || sub.baseRef}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusBg, padding: '4px 10px', borderRadius: 8 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Left column (student) + conversation */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '0 24px 40px' }}>
        <div ref={sideRef} style={{ ...sideLift, width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
          <div style={{ ...glass, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{tn(sub.studentName)}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>{t('Сдано')} {date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'var(--color-purple-soft)', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', opacity: 0.75, marginBottom: 4 }}>{t('Базовая')}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent)' }}>2/2</div>
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
              style={{ ...btn('M', 'secondary'), width: '100%', opacity: hwBusy ? 0.6 : 1 }}
            >
              <ClipboardList size={16} strokeWidth={2} style={{ color: 'var(--color-accent)' }} />
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
          {aiGrade && (aiTask || aiGrade.status === 'pending' || aiGrade.status === 'working' || aiGrade.status === 'error') && (
            <AiGradeCard
              grade={aiGrade}
              task={aiTask}
              done={taskDone}
              onAccept={() => {
                if (!aiTask?.mark) return
                void reviewTab(currentKey, {
                  comment: aiTask.comment ?? '', photos: [], board: null, boardMode: 'beside', annotation: null,
                  verdict: 'completed', score: aiTask.mark,
                })
              }}
              onEdit={() => {
                if (!aiTask) return
                const draft = `hardReview:${sub.id}:${currentKey}`
                if (aiTask.comment) writeDraft(`${draft}:comment`, aiTask.comment)
                if (aiTask.mark) writeDraft(`${draft}:score`, aiTask.mark)
                setComposerEpoch(e => e + 1)
              }}
            />
          )}
          <HardConversation
            key={composerEpoch}
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
