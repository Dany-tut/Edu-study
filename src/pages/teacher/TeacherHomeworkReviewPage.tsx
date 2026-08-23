import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Check, RotateCcw, Send,
  ClipboardCheck, TrendingUp, Clock, Award, FileText,
  CheckCircle2, Star, Image as ImageIcon, PenLine, X,
} from 'lucide-react'
import type { Student, Group, HomeworkItem, HwTask } from '../../data/teacherMockData'
import { useHomework, useHomeworkSubmissions, reviewHomework } from '../../lib/useHomework'
import { useGroups, useStudents } from '../../lib/useGroups'
import { useTeacher } from '../../store/teacherStore'
import RichConditionEditor from '../../components/teacher/RichConditionEditor'
import WhiteboardCanvas from '../../components/teacher/WhiteboardCanvas'
import { optimizePhoto, ImageTooLargeError } from '../../lib/imageOptim'
import { readDraft, writeDraft, clearDraft } from '../../lib/useDraft'
import { useT, t } from '../../lib/i18n'
import BasicAnswersList from '../../components/teacher/BasicAnswersList'

// Фото/доска учителя — base64, живут только в черновике до отправки (в review_attachments).
type ReviewDraft = { score: string; taskScores: Record<string, string>; comment: string; photos: string[]; board: string | null }

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2)
}

// Форматирует дату сдачи ДЗ: «3 июля в 14:20» + относительное «(2 дня назад)»
function formatSubmittedAt(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  let rel: string
  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / 3600000)
    rel = diffHours <= 0 ? t('только что') : `${diffHours} ${t('ч назад')}`
  } else if (diffDays === 1) rel = t('вчера')
  else if (diffDays < 5) rel = `${diffDays} ${t('дня назад')}`
  else rel = `${diffDays} ${t('дней назад')}`
  return `${date} ${t('в')} ${time} · ${rel}`
}

// ─── Student summary card (left rail) ───────────────────────────────────────
function StudentSummary({ student, group }: { student: Student; group: Group }) {
  const t = useT()
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {/* Identity */}
      <div
        style={{
          padding: 18, borderRadius: 24,
          background: `${group.color}26`,
          border: `1px solid ${group.color}33`,
        }}
      >
        <div className="flex items-center" style={{ gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, flexShrink: 0,
            background: group.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700,
          }}>
            {initials(student.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.2 }}>{student.name}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5,
              background: group.color + '33', borderRadius: 7, padding: '2px 8px',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div
        className="flex flex-col"
        style={{
          padding: 18, borderRadius: 22, gap: 12,
          background: 'rgba(var(--glass-rgb), 0.94)',
          border: '1px solid var(--color-border-soft)',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('Сводка по ученику')}
        </div>
        <ScoreBar label={t('ДЗ')} icon={ClipboardCheck} value={student.hwScore} color="#5FD68A" />
        <ScoreBar label={t('Тесты')} icon={TrendingUp} value={student.testScore} color="var(--color-purple)" />
        {student.trialScore !== null && (
          <ScoreBar label={t('Пробник')} icon={Award} value={student.trialScore} color="#F5A623" />
        )}
        <div className="flex items-center justify-between" style={{ padding: '7px 10px', background: 'var(--color-bg)', borderRadius: 10 }}>
          <div className="flex items-center" style={{ gap: 7 }}>
            <Clock size={13} strokeWidth={2} style={{ color: 'var(--color-muted)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Посещаемость')}</span>
          </div>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: student.attendance >= 90 ? 'var(--color-green-text)' : student.attendance >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)',
          }}>
            {student.attendance}%
          </span>
        </div>
        <div className="flex items-center justify-between" style={{
          padding: '7px 10px', borderRadius: 10,
          background: 'var(--color-yellow-soft)', border: '1px solid color-mix(in srgb, var(--color-yellow-text) 28%, transparent)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Желаемый балл')}</span>
          <span style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-yellow-text)' }}>{student.desiredScore}</span>
        </div>
      </div>

      {student.comment && (
        <div style={{
          padding: 16, borderRadius: 20,
          background: 'rgba(var(--glass-rgb), 0.94)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
            {t('Заметка')}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>{student.comment}</p>
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, icon: Icon, value, color }: {
  label: string; icon: React.ElementType; value: number; color: string
}) {
  return (
    <div className="flex flex-col" style={{ gap: 4 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 6 }}>
          <Icon size={12} strokeWidth={2} style={{ color }} />
          <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, borderRadius: 99, opacity: 0.85 }}
        />
      </div>
    </div>
  )
}

// ─── Floating bottom progress bar ───────────────────────────────────────────
function ReviewBottomBar({
  submitters, reviews, activeIdx, onJump, color,
}: {
  submitters: Student[]
  reviews: Record<string, { verdict: 'accepted' | 'returned' }>
  activeIdx: number
  onJump: (i: number) => void
  color: string
}) {
  const t = useT()
  const reviewedCount = submitters.filter(s => reviews[s.id]).length
  const remaining = submitters.length - reviewedCount

  return (
    <div className="flex items-center" style={{ gap: 10 }}>
      {/* track */}
      <div style={{
        display: 'flex', alignItems: 'center', flex: 1, minWidth: 0,
        height: 44, padding: '12px 16px', borderRadius: 18,
        background: 'rgba(var(--glass-rgb), 0.62)', border: '1px solid var(--color-border-glass)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, height: 20 }}>
          {submitters.map((s, i) => {
            const review = reviews[s.id]
            const isActive = i === activeIdx
            const bg = review?.verdict === 'accepted' ? '#6EE7A0'
              : review?.verdict === 'returned' ? '#F8C991'
              : isActive ? color : '#E4E4E9'
            // Dark ink on the light green/peach chips (white "2" was near-invisible);
            // white only on the saturated group-color active node.
            const numColor = review?.verdict === 'accepted' ? '#0F5132'
              : review?.verdict === 'returned' ? '#7A4A12'
              : '#fff'
            if (isActive) {
              return (
                <button key={s.id} onClick={() => onJump(i)} style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
                  background: bg, color: numColor, fontSize: 11, fontWeight: 800, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 2px 10px ${color}59`,
                }}>
                  {i + 1}
                </button>
              )
            }
            return (
              <button key={s.id} onClick={() => onJump(i)} title={s.name} style={{
                flex: 1, height: i < activeIdx ? 6 : 4, minWidth: 2, borderRadius: 3, border: 'none', cursor: 'pointer',
                background: bg, padding: 0, transition: 'height 0.2s ease',
              }} />
            )
          })}
        </div>
      </div>

      {/* counter */}
      <div style={{
        flexShrink: 0, height: 44, display: 'flex', alignItems: 'center',
        padding: '0 14px', borderRadius: 18,
        background: 'rgba(var(--glass-rgb), 0.62)', border: '1px solid var(--color-border-glass)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {remaining === 0 ? (
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-green-text)', whiteSpace: 'nowrap' }}>
            {t('Все проверены ✓')}
          </span>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
            {t('Осталось')} {remaining} {t('из')} {submitters.length}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Per-task score grid ─────────────────────────────────────────────────────
function TaskScoreGrid({
  tasks, taskScores, onScoreChange, groupColor, groupColorSoft, total, maxTotal,
}: {
  tasks: HwTask[]
  taskScores: Record<string, string>
  onScoreChange: (taskId: string, value: string) => void
  groupColor: string
  groupColorSoft: string
  total: number
  maxTotal: number
}) {
  const t = useT()
  const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 2 }}>
        {t('БАЛЛЫ ЗА ЗАДАНИЯ')}
      </div>
      {tasks.map(task => {
        const val = taskScores[task.id] ?? ''
        const num = Number(val)
        const over = val !== '' && num > task.maxScore
        return (
          <div key={task.id} className="flex items-center" style={{ gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.4 }}>
              {task.title}
            </div>
            <div className="flex items-center flex-shrink-0" style={{ gap: 6 }}>
              <input
                type="number" min={0} max={task.maxScore} value={val}
                onChange={e => onScoreChange(task.id, e.target.value)}
                placeholder="—"
                style={{
                  width: 64, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 10,
                  border: `1.5px solid ${over ? '#f87171' : 'rgba(0,0,0,0.1)'}`,
                  fontSize: 16, fontWeight: 750, color: over ? 'var(--color-red-text)' : 'var(--color-text)',
                  background: 'var(--color-bg-2)', outline: 'none', textAlign: 'center', fontFamily: 'inherit',
                  appearance: 'textfield',
                } as React.CSSProperties}
              />
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', minWidth: 28 }}>/ {task.maxScore}</span>
            </div>
          </div>
        )
      })}
      {/* Total row */}
      <div style={{
        marginTop: 4, padding: '10px 14px', borderRadius: 14,
        background: groupColorSoft, border: `1px solid ${groupColor}33`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Итого')}</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: groupColor }}>{total}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>/ {maxTotal}</span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          padding: '3px 8px', borderRadius: 8,
          background: groupColor + '22', color: groupColor,
        }}>{pct}%</span>
      </div>
    </div>
  )
}

// ─── Teacher attachments (фото + доска) ─────────────────────────────────────
function ReviewAttachEditor({
  photos, board, onPhotos, onBoard, color,
}: {
  photos: string[]
  board: string | null
  onPhotos: (photos: string[]) => void
  onBoard: (board: string | null) => void
  color: string
}) {
  const t = useT()
  const [showBoard, setShowBoard] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function addPhotos(files: FileList | null) {
    if (!files) return
    setError(null)
    Array.from(files).forEach(async file => {
      try {
        const src = await optimizePhoto(file)
        if (src) onPhotos([...photos, src])
      } catch (e) {
        if (e instanceof ImageTooLargeError) setError(e.message)
        else throw e
      }
    })
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => fileRef.current?.click()} className="cursor-pointer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 12.5, fontWeight: 700 }}>
          <ImageIcon size={14} /> {t('Фото')}
        </button>
        <button onClick={() => setShowBoard(v => !v)} className="cursor-pointer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: `1px solid ${showBoard || board ? color : 'var(--color-border-medium)'}`, background: showBoard || board ? color + '22' : 'var(--color-bg-2)', color: showBoard || board ? color : 'var(--color-text)', fontSize: 12.5, fontWeight: 700 }}>
          <PenLine size={14} /> {board ? t('Доска ✓') : t('Доска')}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-peach-text)', marginTop: 8 }}>{error}</div>}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border-soft)' }}>
              <img src={src} alt="" style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }} />
              <button onClick={() => onPhotos(photos.filter((_, j) => j !== i))} className="cursor-pointer" style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {showBoard && <div style={{ marginTop: 10 }}><WhiteboardCanvas initialData={board ?? undefined} onSave={onBoard} /></div>}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function TeacherHomeworkReviewPage() {
  const t = useT()
  const reviewingHwId = useTeacher(s => s.reviewingHwId)
  const setActivePage = useTeacher(s => s.setActivePage)
  const reviewIdx = useTeacher(s => s.reviewIdx)
  const setReviewIdx = useTeacher(s => s.setReviewIdx)

  const { homework: allHomework } = useHomework()
  const { groups } = useGroups()

  const hw = (allHomework.find(h => h.id === reviewingHwId) ?? null) as (HomeworkItem & { tasks?: HwTask[] }) | null
  const group = hw ? groups.find(g => g.id === hw.groupId) ?? null : null

  // lessonId — чтобы витрина видела и сдачи домашки, привязанной к уроку курса:
  // такую ученик решает на ноде урока и пишет под его lesson_ref.
  const { submissions: rawSubmissions, reload: reloadSubmissions } = useHomeworkSubmissions(reviewingHwId, hw?.lessonId ?? null)
  const { students: groupStudents } = useStudents(hw?.groupId ?? null)
  const submitters: Student[] = useMemo(() => {
    if (!hw) return []
    const submittedIds = new Set(rawSubmissions.map(s => s.studentId))
    return groupStudents.filter(s => submittedIds.has(s.id))
  }, [hw, rawSubmissions, groupStudents])
  // «Проверено» выводим прямо из вердикта сдачи (lesson_progress), а не из стора.
  const subByStudent = useMemo(
    () => new Map(rawSubmissions.map(s => [s.studentId, s])),
    [rawSubmissions],
  )
  const reviewedMap = useMemo(() => {
    const m: Record<string, { verdict: 'accepted' | 'returned' }> = {}
    for (const s of rawSubmissions) {
      if (s.verdict === 'accepted' || s.verdict === 'returned') m[s.studentId] = { verdict: s.verdict }
    }
    return m
  }, [rawSubmissions])

  const idx = reviewIdx
  const prevIdxRef = useRef(reviewIdx)
  const [dir, setDir] = useState(0)
  if (prevIdxRef.current !== reviewIdx) {
    setDir(reviewIdx > prevIdxRef.current ? 1 : -1)
    prevIdxRef.current = reviewIdx
  }
  // Per-student draft: score (manual), taskScores (per-task), comment.
  // Mirrored into sessionStorage per hw+student so grading survives a reload.
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  // Shared via the store — the dashboard hides the ReviewNavPill while the
  // docked bar shows its own arrows/counter on the same spot.
  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)

  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  if (!hw || !group || submitters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ flex: 1, color: 'var(--color-muted)', gap: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>
          {hw && group ? t('Пока никто не сдал работу') : t('Домашка не найдена')}
        </p>
        <button onClick={() => setActivePage('homework')} style={{
          padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 14px rgba(99,84,207,0.38)',
        }}>
          {t('К списку ДЗ')}
        </button>
      </div>
    )
  }

  const student = submitters[idx]
  const currentSubmission = subByStudent.get(student?.id)
  const reviewed = currentSubmission?.verdict === 'accepted' || currentSubmission?.verdict === 'returned'
  const draftKey = `hwReview:${hw.id}:${student.id}`
  const draft = drafts[student.id] ?? readDraft<ReviewDraft>(draftKey) ?? {
    score: reviewed ? String(currentSubmission!.score) : '',
    taskScores: {},
    comment: currentSubmission?.reviewComment ?? '',
    photos: currentSubmission?.reviewPhotos ?? [],
    board: currentSubmission?.reviewBoard ?? null,
  }

  // If hw has tasks, compute total from task scores; otherwise use manual score.
  const hasTasks = (hw.tasks?.length ?? 0) > 0
  const taskTotal = hasTasks
    ? (hw.tasks ?? []).reduce((sum, t) => sum + (Number(draft.taskScores[t.id]) || 0), 0)
    : null
  const maxTaskTotal = hasTasks
    ? (hw.tasks ?? []).reduce((sum, t) => sum + t.maxScore, 0)
    : null
  const reviewedCount = submitters.filter(s => reviewedMap[s.id]).length
  const allDone = reviewedCount === submitters.length

  function setDraft(patch: Partial<ReviewDraft>) {
    const next = { ...draft, ...patch }
    setDrafts(d => ({ ...d, [student.id]: next }))
    writeDraft(draftKey, next)
  }

  function setTaskScore(taskId: string, value: string) {
    setDraft({ taskScores: { ...draft.taskScores, [taskId]: value } })
  }

  function go(next: number) {
    if (next < 0 || next >= submitters.length) return
    setDir(next > idx ? 1 : -1)
    setReviewIdx(next)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function advance() {
    // Jump to the next student who still needs a review; else stay/finish.
    const nextUnreviewed = submitters.findIndex((s, i) => i > idx && !reviewedMap[s.id])
    const fallback = submitters.findIndex(s => !reviewedMap[s.id])
    const target = nextUnreviewed !== -1 ? nextUnreviewed : fallback
    if (target !== -1 && target !== idx) go(target)
  }

  async function handleVerdict(verdict: 'accepted' | 'returned') {
    const submissionId = currentSubmission?.id
    if (!submissionId) return
    const score = hasTasks ? (taskTotal ?? 0) : Math.max(0, Math.min(100, Number(draft.score) || 0))
    // Реальная запись в lesson_progress (та же строка, куда ученик сдал) —
    // вердикт/оценка/комментарий/фото/доска дойдут до ученика и переживут reload.
    const ok = await reviewHomework(submissionId, verdict, score, draft.comment, {
      photos: draft.photos, board: draft.board,
    })
    if (!ok) {
      // Черновик проверки НЕ трогаем и к следующему ученику не уходим:
      // написанное — единственная копия этой проверки.
      window.alert(t('Не удалось сохранить проверку — проверьте связь и попробуйте ещё раз.'))
      return
    }
    clearDraft(draftKey)
    setDrafts(d => {
      const { [student.id]: _gone, ...rest } = d
      return rest
    })
    await reloadSubmissions()
    setTimeout(advance, 260)
  }

  return (
    // Single scroll container — same recipe as TeacherHomeworkCreatePage.
    // marginTop:-100 lifts the pane to y=0; paddingTop:100 re-insets content
    // below the topbar so it melts into the progressive-blur strip on scroll.
    <div
      ref={scrollRef}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100, paddingBottom: 110 }}
    >

      {/* ── Rest-state header: Назад + title. Fades out (opacity only — NO height
          collapse, which would jolt the scroll position / feel "magnetic") as the
          page docks; its fixed twin below takes over on the topbar line. ── */}
      <motion.div
        className="flex items-center"
        initial={false}
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ position: 'relative', flexShrink: 0, justifyContent: 'space-between', paddingLeft: 32, paddingRight: 32, paddingBottom: 14, gap: 12, pointerEvents: docked ? 'none' : 'auto' }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => setActivePage('homework')}
          className="flex items-center cursor-pointer flex-shrink-0"
          style={{
            gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999,
            border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600,
          }}
        >
          <ChevronLeft size={18} />
          {t('Назад')}
        </motion.button>

        <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          maxWidth: '44%', pointerEvents: 'none',
          textAlign: 'center', fontSize: 18, fontWeight: 750, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {hw.title}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
          background: `${group.color}26`, borderRadius: 8, padding: '3px 10px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: group.color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</span>
        </span>
      </motion.div>

      {/* ── Docked bar (appears on scroll): arrows + counter ── */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="review-dock"
            className="flex items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ gap: 10, pointerEvents: 'none' }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActivePage('homework')}
              className="flex items-center cursor-pointer flex-shrink-0"
              style={{
                gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999,
                ...dockGlass, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
              }}
            >
              <ChevronLeft size={18} />
              Назад
            </motion.button>

            <div style={{
              flexShrink: 1, minWidth: 0, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '9px 16px', borderRadius: 999, ...dockGlass,
              fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto',
            }}>
              {hw.title}
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />

            <div className="flex items-center flex-shrink-0" style={{ gap: 8, pointerEvents: 'auto' }}>
              <NavArrow dir="left" disabled={idx === 0} onClick={() => go(idx - 1)} />
              <NavArrow dir="right" disabled={idx === submitters.length - 1} onClick={() => go(idx + 1)} />
            </div>

            <div className="flex-shrink-0 flex items-center" style={{
              gap: 7, padding: '9px 16px', borderRadius: 999,
              ...dockGlass, color: 'var(--color-muted)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
            }}>
              <CheckCircle2 size={15} style={{ color: 'var(--color-green-text)' }} />
              {reviewedCount} / {submitters.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '8px 32px 0' }}>
          {/* Ремоунт по key, без AnimatePresence: `mode="wait"` умеет навсегда
              залипнуть (сигнал «выход завершён» теряется — см. onExit в
              AnimatePresence/index.mjs), и работа ученика встала бы пустой
              посреди проверки — до F5. Ученики перелистываются вперёд, само
              не вылечится.
              Направление выезда сохранено: `dir` подставляется прямо в
              initial, а не через варианты, поэтому `custom` был не нужен. */}
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="grid"
              style={{ gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}
            >
              {/* Left: student summary */}
              <StudentSummary student={student} group={group} />

              {/* Right: submission + grading */}
              <div className="flex flex-col" style={{ gap: 16 }}>
                {/* Submission */}
                <div style={{
                  padding: 22, borderRadius: 26,
                  background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-soft)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <FileText size={16} style={{ color: group.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Работа ученика')}</span>
                    {formatSubmittedAt(currentSubmission?.submittedAt) && (
                      <span className="flex items-center" style={{
                        gap: 5, marginLeft: 'auto', padding: '4px 10px', borderRadius: 999,
                        background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 11.5, fontWeight: 600,
                      }}>
                        <Clock size={12} />
                        {t('Сдано')} {formatSubmittedAt(currentSubmission?.submittedAt)}
                      </span>
                    )}
                  </div>
                  {currentSubmission?.comment && (
                    <p style={{
                      fontSize: 14.5, lineHeight: 1.65, color: 'var(--color-text)',
                      whiteSpace: 'pre-line', marginBottom: 16,
                    }}>
                      {currentSubmission.comment}
                    </p>
                  )}
                  {/* Ответы базового уровня. У сдач, сделанных до появления
                      снимка, их нет — там честно говорим, что показать нечего,
                      вместо прежних выдуманных «solution.pdf». */}
                  {currentSubmission?.answers
                    ? <BasicAnswersList payload={currentSubmission.answers} />
                    : !currentSubmission?.comment && (
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)' }}>
                        {t('Ответы этой сдачи не сохранились — она сделана до того, как работа начала доезжать до преподавателя.')}
                      </p>
                    )
                  }
                </div>

                {/* Grading */}
                <div style={{
                  padding: 22, borderRadius: 26,
                  background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-soft)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 16 }}>
                    <Star size={16} style={{ color: '#F5A623' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Оценка и комментарий')}</span>
                  </div>

                  {/* Score field */}
                  <div style={{ marginBottom: 16 }}>
                    {hasTasks ? (
                      <TaskScoreGrid
                        tasks={hw.tasks!}
                        taskScores={draft.taskScores}
                        onScoreChange={setTaskScore}
                        groupColor={group.color}
                        groupColorSoft={`${group.color}33`}
                        total={taskTotal!}
                        maxTotal={maxTaskTotal!}
                      />
                    ) : (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 6 }}>
                          {t('БАЛЛ (0–100)')}
                        </div>
                        <div className="flex items-center" style={{ gap: 10 }}>
                          <input
                            type="number" min={0} max={100} value={draft.score}
                            onChange={e => setDraft({ score: e.target.value })}
                            placeholder="—"
                            style={{
                              width: 96, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14,
                              border: '1.5px solid rgba(0,0,0,0.1)', fontSize: 20, fontWeight: 750, color: 'var(--color-text)',
                              background: 'var(--color-bg-2)', outline: 'none', textAlign: 'center', fontFamily: 'inherit',
                              appearance: 'textfield',
                            } as React.CSSProperties}
                          />
                          <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
                            {[60, 75, 85, 100].map(v => (
                              <button key={v} onClick={() => setDraft({ score: String(v) })} style={{
                                padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700,
                                background: Number(draft.score) === v ? `${group.color}33` : 'var(--color-bg)',
                                color: Number(draft.score) === v ? group.color : 'var(--color-muted)',
                              }}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Comment */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 6 }}>
                      {t('ЗАМЕЧАНИЯ / КОММЕНТАРИЙ')}
                    </div>
                    <RichConditionEditor
                      value={draft.comment}
                      onChange={html => setDraft({ comment: html })}
                      placeholder={t('Что получилось, что доработать...')}
                      autoGrow
                      minHeight={148}
                    />
                  </div>

                  {/* Приложить к проверке — фото + доска (как в проверке сложных) */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 6 }}>
                      {t('ПРИЛОЖИТЬ К ОТВЕТУ')}
                    </div>
                    <ReviewAttachEditor
                      photos={draft.photos}
                      board={draft.board}
                      onPhotos={photos => setDraft({ photos })}
                      onBoard={board => setDraft({ board })}
                      color={group.color}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                    <motion.button
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleVerdict('accepted')}
                      className="flex items-center cursor-pointer"
                      style={{
                        gap: 8, padding: '13px 22px', borderRadius: 16, border: 'none',
                        background: 'var(--grad-purple)',
                        color: '#fff', fontSize: 14, fontWeight: 650,
                        boxShadow: '0 6px 18px rgba(124,108,224,0.35)',
                      }}
                    >
                      <Check size={17} strokeWidth={2.4} />
                      {t('Засчитать и начислить баллы')}
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleVerdict('returned')}
                      className="flex items-center cursor-pointer"
                      style={{
                        gap: 8, padding: '13px 20px', borderRadius: 16, border: 'none',
                        background: 'var(--color-peach-soft)',
                        color: 'var(--color-peach-text)', fontSize: 14, fontWeight: 650,
                      }}
                    >
                      <RotateCcw size={16} strokeWidth={2.2} />
                      {t('Вернуть на доработку')}
                    </motion.button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={12} />
                    {t('Решение и комментарий уйдут ученику в его кабинет.')}
                  </p>
                </div>

                {allDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: 18, borderRadius: 22,
                      background: 'var(--color-green-soft)',
                      border: '1px solid color-mix(in srgb, var(--color-green-text) 30%, transparent)',
                      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      background: 'color-mix(in srgb, var(--color-green-text) 18%, transparent)', color: 'var(--color-green-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)' }}>{t('Все работы проверены!')}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-green-text)', marginTop: 2 }}>{t('Задача «Проверить ДЗ» отмечена на главной.')}</div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setActivePage('homework')}
                      style={{
                        flexShrink: 0, padding: '11px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
                        background: 'var(--color-green-accent)', color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                    >
                      {t('К списку ДЗ')}
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
        </div>

      {/* ── Floating bottom bar (fixed so it stays on screen while content scrolls) ── */}
      <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 40, width: 'min(560px, calc(100vw - 48px))' }}>
        <ReviewBottomBar
          submitters={submitters}
          reviews={reviewedMap}
          activeIdx={idx}
          onJump={go}
          color={group.color}
        />
      </div>
    </div>
  )
}

function NavArrow({ dir, disabled, onClick }: { dir: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = dir === 'left' ? ChevronLeft : ChevronRight
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.08 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        border: '1px solid var(--color-border-glass)', background: 'rgba(var(--glass-rgb), 0.86)',
        backdropFilter: 'blur(14px) saturate(180%)', WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--color-text-4)' : 'var(--color-text)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon size={20} />
    </motion.button>
  )
}
