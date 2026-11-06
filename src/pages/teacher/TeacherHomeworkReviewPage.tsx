import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Check, RotateCcw, CheckCircle2, ClipboardList, Search, Image as ImageIcon, PenLine, X } from '../../components/icons/appIcons'
import type { Student, Group, HomeworkItem, HwTask } from '../../data/teacherMockData'
import { useHomework, useHomeworkSubmissions, reviewHomework, type HwSubmission } from '../../lib/useHomework'
import { useGroups, useStudents } from '../../lib/useGroups'
import { useTeacher } from '../../store/teacherStore'
import RichConditionEditor from '../../components/teacher/RichConditionEditor'
import WhiteboardCanvas from '../../components/teacher/WhiteboardCanvas'
import { optimizePhoto, ImageTooLargeError } from '../../lib/imageOptim'
import { readDraft, writeDraft, clearDraft } from '../../lib/useDraft'
import { useT, t, useTc } from '../../lib/i18n'
import HomeworkAttemptHistorySection from '../../components/HomeworkAttemptHistorySection'
import BasicAnswersList from '../../components/teacher/BasicAnswersList'
import type { BasicAnswerRow, BasicAnswersPayload } from '../../lib/basicAnswers'
import { useAiGrades, confirmAiGrade, requestAiGrade, type AiGrade, type AiRequestResult } from '../../lib/useAiGrades'
import { Alert } from '../../components/Alert'
import { aiCommentHtml, homeworkAiForAttempt } from '../../lib/homeworkAiState'
import { AiReviewSummary, AiTaskFeedback, AiCommentDraft, aiReviewLabel } from '../../components/teacher/journalStand/AiReviewConcept'
import HomeworkReviewScroll from '../../components/teacher/HomeworkReviewScroll'
import '../../components/teacher/journalStand/homeworkReview.css'
import './homeworkReviewWorkspace.css'

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
                aria-label={t('Балл за задание') + ' ' + task.title} type="number" min={0} max={task.maxScore} value={val}
                onChange={e => onScoreChange(task.id, e.target.value)}
                placeholder="—"
                style={{
                  width: 64, boxSizing: 'border-box', padding: '8px 10px', borderRadius: 10,
                  border: `1.5px solid ${over ? 'var(--color-red-text)' : 'var(--color-border-medium)'}`,
                  fontSize: 16, fontWeight: 700, color: over ? 'var(--color-red-text)' : 'var(--color-text)',
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
        background: groupColorSoft, border: `1px solid color-mix(in srgb, ${groupColor} 20%, transparent)`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Итого')}</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: groupColor }}>{total}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>/ {maxTotal}</span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          padding: '4px 8px', borderRadius: 8,
          background: `color-mix(in srgb, ${groupColor} 14%, transparent)`, color: groupColor,
        }}>{pct}%</span>
      </div>
    </div>
  )
}

// ─── Teacher attachments (фото + доска) ─────────────────────────────────────
function ReviewAttachEditor({photos, board, onPhotos, onBoard}: {
  photos: string[]; board: string | null; onPhotos: (photos: string[]) => void; onBoard: (board: string | null) => void
}) {
  const t = useT()
  const [showBoard, setShowBoard] = useState(!!board)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  async function addPhotos(files: FileList | null) {
    if (!files?.length || loading) return
    setError(null);setLoading(true)
    try {
      const images = await Promise.all(Array.from(files).map(file => optimizePhoto(file)))
      onPhotos([...photos, ...images.filter(Boolean)])
    } catch(e) {setError(e instanceof ImageTooLargeError ? e.message : t('Не удалось добавить фото. Попробуйте другой файл.'))}
    finally {setLoading(false)}
  }
  return <div className="hr-attachments" role="group" aria-label={t('Фото и доска к проверке')}>
    <input aria-label={t('Добавить фото к проверке')} ref={fileRef} type="file" accept="image/*" multiple hidden
      onChange={e => {void addPhotos(e.target.files);e.target.value=''}}/>
    <div className="hr-attachment-tools">
      <button type="button" className="hr-button" disabled={loading} onClick={() => fileRef.current?.click()}><ImageIcon size={15}/>{loading?t('Добавляем…'):t('Фото')}</button>
      <button type="button" className="hr-button" aria-pressed={showBoard} onClick={() => setShowBoard(value=>!value)}><PenLine size={15}/>{board?t('Доска ✓'):t('Доска')}</button>
      <span>{t('Вложения получит ученик')}</span>
    </div>
    {error&&<Alert tone="danger" text={error} onClose={()=>setError(null)}/>}
    {!!photos.length&&<div className="hr-photo-grid">{photos.map((src,i)=><div key={i} className="hr-photo">
      <img src={src} alt={t('Фото к проверке')+' '+(i+1)}/><button data-hover="layer" type="button" aria-label={t('Удалить фото')+' '+(i+1)} onClick={()=>onPhotos(photos.filter((_,j)=>j!==i))}><X size={14}/></button>
    </div>)}</div>}
    {showBoard&&<div className="hr-whiteboard"><WhiteboardCanvas initialData={board??undefined} onSave={onBoard}/></div>}
    {!showBoard&&!photos.length&&<p className="hr-attachment-hint">{t('Добавьте фото разбора или объясните решение на доске.')}</p>}
  </div>
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function TeacherHomeworkReviewPage() {
  const reviewingHwId = useTeacher(s => s.reviewingHwId)
  const reviewingStudentId = useTeacher(s => s.reviewingStudentId)
  const reviewReturnPage = useTeacher(s => s.reviewReturnPage)
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
  useEffect(() => {
    if (!reviewingStudentId) return
    const target = submitters.findIndex(s => s.id === reviewingStudentId)
    if (target >= 0) {
      setReviewIdx(target)
      useTeacher.setState({reviewingStudentId:null})
    }
  }, [reviewingStudentId, submitters, setReviewIdx])
  const { byProgress: aiByProgress, reload: reloadAi, error: aiLoadError, loading: aiLoading } = useAiGrades(rawSubmissions.map(s => s.id))
  return <HomeworkReviewEditor key={hw?.id} hw={hw} group={group} submitters={submitters} submissions={rawSubmissions}
    reviewIdx={reviewIdx} setReviewIdx={setReviewIdx} onBack={() => setActivePage(reviewReturnPage)}
    returnLabel={reviewReturnPage === 'gradebook' ? 'В журнал' : reviewReturnPage === 'home' ? 'На главную' : 'К списку ДЗ'}
    onReview={reviewHomework} reloadSubmissions={reloadSubmissions} aiByProgress={aiByProgress}
    reloadAi={reloadAi} onConfirmAi={confirmAiGrade} onRequestAi={requestAiGrade} aiLoadError={aiLoadError} aiLoading={aiLoading}/>
}

type ReviewAttachments = { photos: string[]; board: string | null }
export type HomeworkReviewEditorProps = {
  hw: HomeworkItem | null; group: Group | null; submitters: Student[]; submissions: HwSubmission[]
  reviewIdx: number; setReviewIdx: (index: number) => void; onBack: () => void; returnLabel: string
  onReview: (id: string, verdict: 'accepted' | 'returned', score: number, comment: string,
    attachments: ReviewAttachments, expectedAttemptId?: string) => Promise<boolean>
  reloadSubmissions?: () => Promise<void>; aiByProgress?: Map<string, AiGrade>
  reloadAi?: () => Promise<void>; onConfirmAi?: (id: string, score: number) => Promise<boolean>
  embedded?: boolean; aiConcept?: boolean
  onRequestAi?: (progressId: string, retry?: boolean) => Promise<AiRequestResult>
  aiLoadError?: string; aiLoading?: boolean
}

/** The production editor, with explicit data/save adapters for the isolated development stand. */
export function HomeworkReviewEditor({hw, group, submitters, submissions: rawSubmissions, reviewIdx, setReviewIdx,
  onBack, returnLabel, onReview, reloadSubmissions, aiByProgress, reloadAi, onConfirmAi, embedded = false, aiConcept = false, onRequestAi, aiLoadError = '', aiLoading = false}: HomeworkReviewEditorProps) {
  const t = useT()
  const { tc, tn } = useTc()
  const subByStudent = useMemo(() => new Map(rawSubmissions.map(s => [s.studentId, s])), [rawSubmissions])
  const reviewedMap = useMemo(() => {
    const m: Record<string, { verdict: 'accepted' | 'returned' }> = {}
    for (const s of rawSubmissions) {
      if (s.verdict === 'accepted' || s.verdict === 'returned') m[s.studentId] = { verdict: s.verdict }
    }
    return m
  }, [rawSubmissions])
  const idx = Math.max(0,Math.min(reviewIdx,submitters.length-1))
  const [drafts, setDrafts] = useState<Partial<Record<string, ReviewDraft>>>({})
  const [studentSearch, setStudentSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Пакетное принятие: первый клик взводит, второй — принимает.
  const [batchArmed, setBatchArmed] = useState(false)
  useEffect(() => { if (!batchArmed) return; const timer = window.setTimeout(() => setBatchArmed(false), 4000); return () => window.clearTimeout(timer) }, [batchArmed])
  const aiDetailsRef = useRef<HTMLDivElement>(null)
  const showAiConcept = embedded && aiConcept
  const showAiReview = showAiConcept || !embedded
  const [aiRequests, setAiRequests] = useState<Record<string,{busy:boolean;error:string}>>({})
  const autoRequested = useRef(new Set<string>())
  const activeSubmission = rawSubmissions.find(sub=>sub.studentId===submitters[idx]?.id)
  const activeGrade = activeSubmission ? aiByProgress?.get(activeSubmission.id) : undefined
  const activeAttempt = activeSubmission?.answers?.attemptId
  async function askAi(submission: HwSubmission, retry = false) {
    if (!onRequestAi) return
    const id = submission.id
    setAiRequests(old=>({...old,[id]:{busy:true,error:''}}))
    try {
      const result = await onRequestAi(id,retry)
      setAiRequests(old=>({...old,[id]:{busy:false,error:result.error??''}}))
      if(result.ok) await reloadAi?.()
    } catch { setAiRequests(old=>({...old,[id]:{busy:false,error:'unavailable'}})) }
  }
  useEffect(()=>{
    if(embedded||aiLoading||aiLoadError||!onRequestAi||!activeSubmission||activeSubmission.verdict!=='pending')return
    const key=activeSubmission.id+':'+(activeAttempt??activeSubmission.submittedAt??'')
    if(autoRequested.current.has(key)||activeGrade&&activeGrade.status!=='pending')return
    autoRequested.current.add(key)
    void askAi(activeSubmission)
  },[embedded,aiLoading,aiLoadError,onRequestAi,activeSubmission?.id,activeAttempt,activeSubmission?.submittedAt,activeSubmission?.verdict,activeGrade?.status])
  const setHeaderDocked = useTeacher(s=>s.setHeaderDocked)
  useEffect(()=>{if(!embedded)setHeaderDocked(false)},[embedded,setHeaderDocked])
  useEffect(()=>{setSaveError('')},[submitters[idx]?.id])
  if (!hw || !group || submitters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ flex: 1, color: 'var(--color-muted)', gap: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
          {hw && group ? t('Пока никто не сдал работу') : t('Домашка не найдена')}
        </p>
        <button data-hover="layer" onClick={() => onBack()} style={{ height: 40,
          padding: '0 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: '0 4px 14px rgba(99,84,207,0.38)',
        }}>
          {t(returnLabel)}
        </button>
      </div>
    )
  }

  const student = submitters[idx]
  const currentSubmission = subByStudent.get(student?.id)
  // Older submissions may not contain the Testly reference in their answer
  // snapshot. The current assignment still has the test IDs, so query Testly
  // by student identity and show those attempts alongside any saved answers.
  const currentAnswers: BasicAnswersPayload | null = (() => {
    const saved = currentSubmission?.answers ?? null
    const savedTestIds = new Set(saved?.rows.flatMap(row => row.testly ? [row.testly.testId] : []) ?? [])
    const addedRows: BasicAnswerRow[] = (hw?.basicTasks ?? []).flatMap((raw, index) => {
      if (!raw || typeof raw !== 'object') return []
      const task = raw as { type?: string; question?: string; testly?: { id?: string; title?: string } }
      const testId = task.type === 'testly' ? task.testly?.id : undefined
      if (!testId || savedTestIds.has(testId)) return []
      savedTestIds.add(testId)
      return [{
        n: (saved?.rows.length ?? 0) + index + 1,
        prompt: task.question?.trim() || task.testly?.title || 'Тест из Тестли',
        type: 'testly', answer: '', verdict: 'empty', testly: { testId },
      }]
    })
    if (!saved && addedRows.length === 0) return null
    return {
      v: 'basic-1', testlyKey: saved?.testlyKey, gradable: saved?.gradable ?? 0, correct: saved?.correct ?? 0,
      rows: [...(saved?.rows ?? []), ...addedRows],
    }
  })()
  const reviewed = currentSubmission?.verdict === 'accepted' || currentSubmission?.verdict === 'returned'
  const savedAiGrade = currentSubmission ? aiByProgress?.get(currentSubmission.id) : undefined
  const aiGrade = homeworkAiForAttempt(savedAiGrade, currentSubmission?.answers?.attemptId, currentSubmission?.submittedAt)
  const aiRequest = currentSubmission ? aiRequests[currentSubmission.id] : undefined
  const draftKey = `hwReview:${hw.id}:${student.id}`
  const savedDraft: Partial<ReviewDraft> = drafts[student.id] ?? readDraft<Partial<ReviewDraft>>(draftKey) ?? {}
  // Все ответы проверились сами (нет «на проверку учителю») — итог
  // автопроверки уже стоит в поле, учитель только подтверждает или правит.
  const autoScore = !reviewed && currentAnswers && currentAnswers.gradable > 0
    && currentAnswers.rows.every(row => row.verdict !== 'review' && !row.testly)
    ? String(Math.round(currentAnswers.correct / currentAnswers.gradable * 100)) : ''
  const draft: ReviewDraft = {
    score: reviewed ? String(currentSubmission!.score) : autoScore,
    taskScores: {},
    comment: currentSubmission?.reviewComment ?? '',
    photos: currentSubmission?.reviewPhotos ?? [],
    board: currentSubmission?.reviewBoard ?? null,
    ...savedDraft,
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
    if (busy || next < 0 || next >= submitters.length) return
    setReviewIdx(next)
  }

  function advance() {
    // Jump to the next student who still needs a review; else stay/finish.
    const nextUnreviewed = submitters.findIndex((s, i) => i > idx && !reviewedMap[s.id])
    const fallback = submitters.findIndex(s => s.id !== student.id && !reviewedMap[s.id])
    const target = nextUnreviewed !== -1 ? nextUnreviewed : fallback
    if (target !== -1 && target !== idx) go(target)
  }

  // ai — «Ок» на предоценке ИИ: балл и ответ ИИ вместо полей формы (свой
  // комментарий учителя, если уже написан, остаётся). Ученик получает ответ
  // от учителя — про ИИ он не знает.
  async function handleVerdict(verdict: 'accepted' | 'returned', ai?: {score:number;comment:string}) {
    const submissionId = currentSubmission?.id
    if (!submissionId || busy) return
    setSaveError('')
    if (verdict==='accepted'&&!ai&&(!hasTasks?!draft.score.trim():hw!.tasks!.some(task=>!draft.taskScores[task.id]?.trim()))) {
      setSaveError(t('Укажите итоговую оценку всей работы.'));return
    }
    const score = ai ? ai.score : hasTasks ? Math.round(100*(taskTotal??0)/Math.max(1,maxTaskTotal??0)) : Number(draft.score)
    if (verdict==='accepted'&&(!Number.isFinite(score)||score<0||score>100)) {setSaveError(t('Укажите итог от 0 до 100%.'));return}
    const comment = ai&&!draft.comment.trim()?ai.comment:draft.comment
    if(verdict==='returned'&&!comment.replace(/<[^>]*>/g,'').trim()&&!draft.photos.length&&!draft.board){setSaveError(t('Добавьте комментарий для доработки.'));return}
    setBusy(true)
    try {
      const ok = await onReview(submissionId,verdict,Number.isFinite(score)?score:0,comment,{photos:draft.photos,board:draft.board},currentSubmission?.answers?.attemptId)
      if(!ok){setSaveError(t('Не удалось сохранить проверку. Черновик сохранён — попробуйте ещё раз.'));return}
      if(verdict==='accepted'&&aiGrade&&(aiGrade.status==='graded'||aiGrade.status==='dismissed'))await onConfirmAi?.(aiGrade.id,score)
      void reloadAi?.()
      clearDraft(draftKey)
      setDrafts(previous=>{const {[student.id]:_saved,...rest}=previous;return rest})
      await reloadSubmissions?.()
      advance()
    } catch {setSaveError(t('Не удалось сохранить проверку. Черновик сохранён — попробуйте ещё раз.'))}
    finally {setBusy(false)}
  }
  // Баллы ИИ по заданиям — в поля заданий, когда задания совпадают по числу
  // (n-е задание ИИ = n-е задание ДЗ); баллы переводятся в шкалу задания.
  const aiTaskScores = hasTasks && aiGrade && aiGrade.score != null && aiGrade.tasks.length === hw.tasks!.length
    ? Object.fromEntries(hw.tasks!.map((task, i) => {
        const ai = [...aiGrade.tasks].sort((a, b) => a.n - b.n)[i]
        const value = ai.max_points > 0 ? ai.points / ai.max_points * task.maxScore : 0
        return [task.id, String(Math.round(value * 10) / 10)]
      })) : null
  // Пакетно: непроверенные работы, где ИИ не нашёл ни одной ошибки.
  const cleanAi = submitters.flatMap(s => {
    const sub = subByStudent.get(s.id)
    if (!sub || reviewedMap[s.id] || sub.verdict === 'accepted' || sub.verdict === 'returned') return []
    const grade = homeworkAiForAttempt(aiByProgress?.get(sub.id), sub.answers?.attemptId, sub.submittedAt)
    if (!grade || grade.status !== 'graded' || grade.score !== 100) return []
    if (grade.tasks.some(task => task.points < task.max_points)) return []
    return [{ sub, grade }]
  })
  async function acceptCleanAi() {
    if (busy || !cleanAi.length) return
    if (!batchArmed) { setBatchArmed(true); return }
    setBatchArmed(false); setSaveError(''); setBusy(true)
    let failed = 0
    try {
      for (const { sub, grade } of cleanAi) {
        const ok = await onReview(sub.id, 'accepted', 100, aiCommentHtml(grade.comment), { photos: [], board: null }, sub.answers?.attemptId)
        if (!ok) { failed++; continue }
        await onConfirmAi?.(grade.id, 100)
        clearDraft(`hwReview:${hw!.id}:${sub.studentId}`)
      }
      void reloadAi?.()
      await reloadSubmissions?.()
      if (failed) setSaveError(t('Часть работ не сохранилась — попробуйте ещё раз.'))
    } finally { setBusy(false) }
  }
  const autoPercent = currentAnswers&&currentAnswers.gradable>0?Math.round(currentAnswers.correct/currentAnswers.gradable*100):null
  const passingScore = currentSubmission?.answers?.recommendationScore??80
  const filteredStudents = submitters.filter(s=>tn(s.name).toLocaleLowerCase('ru').includes(studentSearch.toLocaleLowerCase('ru')))
  const currentStatus = currentSubmission?.verdict==='accepted'?t('Проверено'):currentSubmission?.verdict==='returned'?t('На доработке'):t('На проверке')
  const nav = <div className="hr-student-nav"><button data-hover="layer" type="button" className="hr-icon-button" aria-label={t('Предыдущая работа')} disabled={busy||idx===0} onClick={()=>go(idx-1)}><ChevronLeft size={17}/></button><span>{idx+1} / {submitters.length}</span><button data-hover="layer" type="button" className="hr-icon-button" aria-label={t('Следующая работа')} disabled={busy||idx===submitters.length-1} onClick={()=>go(idx+1)}><ChevronRight size={17}/></button></div>
  return <section className={'hr-workspace'+(embedded?' hr-embedded':'')+(showAiReview?' hr-ai-concept':'')} aria-label={t('Полная проверка домашнего задания')}>
    <header className="hr-workspace-top"><button type="button" className="hr-button hr-back" disabled={busy} onClick={onBack}><ChevronLeft size={16}/>{t(returnLabel)}</button>
      <div className="hr-workspace-title"><span>{t('Полная проверка')}</span><h1>{tc(hw.title)}</h1></div>{showAiConcept&&<span className="aic-preview-badge">✦ Концепт ИИ</span>}<span className="hr-group-label">{group.name}</span>
    </header>
    <div className="hr-workspace-body">
      <aside className="hr-roster" aria-label={t('Работы учеников')}><div className="hr-panel-heading"><h2>{t('Ученики')}</h2><span>{submitters.length}</span></div>
        <label className="hr-roster-search"><Search size={14}/><input type="search" aria-label={t('Найти ученика в полной проверке')} placeholder={t('Найти ученика')} value={studentSearch} onChange={e=>setStudentSearch(e.target.value)}/></label>
        <HomeworkReviewScroll label={t('Список работ учеников')} className="hr-roster-scroll" contentClassName="hr-roster-list">
          {filteredStudents.map(s=>{const index=submitters.findIndex(v=>v.id===s.id),submission=subByStudent.get(s.id);return <button type="button" key={s.id} className="hr-roster-student" disabled={busy} aria-pressed={s.id===student.id} onClick={()=>go(index)}>
            <span className="hr-roster-avatar">{initials(tn(s.name))}</span><span><strong>{tn(s.name)}</strong><small>{submission?.verdict==='accepted'?t('Проверено'):submission?.verdict==='returned'?t('На доработке'):t('На проверке')}</small>{showAiReview&&<small className="aic-roster-status">{aiReviewLabel(submission?aiByProgress?.get(submission.id):undefined)}</small>}</span><b className={submission?.verdict==='accepted'?'hr-passed':'hr-pending'}>{submission?.verdict==='accepted'?submission.score+'%':'●'}</b>
          </button>})}
          {!filteredStudents.length&&<p className="hr-muted">{t('Ученик не найден')}</p>}
        </HomeworkReviewScroll>
        <div className="hr-student-summary"><h3>{t('Об ученике')}</h3><span>{t('ДЗ')}<b>{student.hwScore}%</b></span><span>{t('Тесты')}<b>{student.testScore}%</b></span><span>{t('Посещаемость')}<b>{student.attendance}%</b></span>{student.trialScore!==null&&<span>{t('Пробник')}<b>{student.trialScore}</b></span>}<span>{t('Желаемый балл')}<b>{student.desiredScore}</b></span></div>
      </aside>
      <article className="hr-document" aria-label={t('Работа ученика')+' · '+tn(student.name)}>
        <div className="hr-document-top"><span className="hr-document-avatar">{initials(tn(student.name))}</span><div><h2>{tn(student.name)}</h2><p>{group.name}{hw.dueDate?' · '+t('Срок')+' '+new Date(hw.dueDate).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}):''}</p></div><span className={'hr-status '+(reviewed?'hr-status-reviewed':'')}>{currentStatus}</span></div>
        <label className="hr-mobile-student">{t('Ученик')}<select aria-label={t('Выбрать ученика в полной проверке')} value={idx} disabled={busy} onChange={e=>go(Number(e.target.value))}>{submitters.map((s,i)=><option value={i} key={s.id}>{tn(s.name)}</option>)}</select></label>
        <HomeworkReviewScroll key={student.id} label={t('Ответы и разбор работы')} className="hr-document-scroll" contentClassName="hr-document-content">
          {showAiConcept&&<div className="aic-demo-hint"><span>✦ Разбор рядом с ответами</span><span>Учебные критерии · итог утверждаете вы</span></div>}
          <section className="hr-answers"><div className="hr-section-title"><h3><ClipboardList size={16}/>{t('Ответы ученика')}</h3>{currentSubmission?.submittedAt&&<span>{formatSubmittedAt(currentSubmission.submittedAt)}</span>}</div>
            {currentSubmission?.comment&&<p className="hr-submission-comment">{currentSubmission.comment}</p>}
            {currentAnswers?(showAiReview?currentAnswers.rows.map(row=>{const task=aiGrade?.tasks.find(task=>task.n===row.n);return <div key={row.n} className="aic-answer-block" ref={row.n===(aiGrade?.tasks.find(task=>task.points<task.max_points)?.n??1)?aiDetailsRef:undefined}><BasicAnswersList payload={{...currentAnswers,rows:[row]}} studentId={embedded?undefined:student.id} teacherReviewed={currentSubmission?.verdict==='accepted'} appearance="review" showSummary={false} passingScore={passingScore}/>{task&&<AiTaskFeedback key={student.id+':'+row.n} task={task}/>}</div>}):<BasicAnswersList payload={currentAnswers} studentId={embedded?undefined:student.id} teacherReviewed={currentSubmission?.verdict==='accepted'} appearance="review" showSummary={false} passingScore={passingScore}/>):!currentSubmission?.comment&&<p className="hr-muted">{t('Ответы этой сдачи не сохранились.')}</p>}
          </section>

          {currentSubmission?.lessonRef && currentSubmission.attempts && currentSubmission.attempts.length > 1 && (
            <HomeworkAttemptHistorySection key={currentSubmission.id} authorName={tn(student.name)}
              studentId={currentSubmission.studentId} lessonRef={currentSubmission.lessonRef}
              result={{ attempts: currentSubmission.attempts }} />
          )}

          <section className="hr-feedback-section"><div className="hr-section-title"><h3><PenLine size={16}/>{t('Разбор преподавателя')}</h3></div>
            <ReviewAttachEditor key={student.id} photos={draft.photos} board={draft.board} onPhotos={photos=>setDraft({photos})} onBoard={board=>setDraft({board})}/>
          </section>
          {student.comment&&<details className="hr-student-note"><summary>{t('Заметка об ученике')}</summary><p>{student.comment}</p></details>}
        </HomeworkReviewScroll>
      </article>
      <aside className="hr-inspector" aria-label={t('Оценка и комментарий')}><div className="hr-panel-heading"><h2>{t('Проверка работы')}</h2>{reviewed&&<CheckCircle2 size={16}/>}</div>
        <HomeworkReviewScroll key={'inspector:'+student.id} label={t('Оценка, комментарий и предложения ИИ')} className="hr-inspector-scroll" contentClassName="hr-inspector-fields">
          {showAiReview&&<AiReviewSummary grade={aiGrade} reviewed={reviewed} busy={busy||!!aiRequest?.busy} loading={aiLoading} requestError={aiLoadError||(aiGrade&&['graded','confirmed','changed','dismissed'].includes(aiGrade.status)?'':aiRequest?.error)} onRequest={currentSubmission&&onRequestAi?()=>{if(aiLoadError)void reloadAi?.();else void askAi(currentSubmission,aiGrade?.status==='error'||aiGrade?.status==='skipped')}:undefined} onApply={hasTasks?(aiTaskScores?()=>setDraft({taskScores:aiTaskScores}):undefined):()=>{if(aiGrade?.score!=null)setDraft({score:String(aiGrade.score)})}} onDetails={()=>aiDetailsRef.current?.scrollIntoView({block:'nearest'})}/>}
          {hasTasks?<HomeworkReviewScroll key={'grades:'+student.id} label={t('Баллы за задания')} className="hr-task-grades"><TaskScoreGrid tasks={hw.tasks!} taskScores={draft.taskScores} onScoreChange={setTaskScore} groupColor="var(--color-accent)" groupColorSoft="var(--color-purple-soft)" total={taskTotal!} maxTotal={maxTaskTotal!}/></HomeworkReviewScroll>:<div className="hr-grade-block"><label>{t('Итоговый результат')}<div><input aria-label={t('Итог ДЗ в процентах')} type="number" min={0} max={100} step="any" value={draft.score} placeholder="—" disabled={busy} onChange={e=>setDraft({score:e.target.value})}/><span>%</span></div></label><div className="hr-score-context">{autoPercent!==null&&<span>{t('Автопроверка')}<b>{autoPercent}%</b></span>}<span>{t('Порог зачёта')}<b>{passingScore}%</b></span></div><div className="hr-quick-scores">{[60,75,85,100].map(value=><button data-hover="layer" key={value} type="button" disabled={busy} aria-label={t('Поставить')+' '+value+'%'} aria-pressed={Number(draft.score)===value} onClick={()=>setDraft({score:String(value)})}>{value}%</button>)}</div></div>}
          <div className="hr-review-comment"><h3>{t('Комментарий ученику')}</h3><RichConditionEditor key={'comment:'+student.id} value={draft.comment} onChange={comment=>setDraft({comment})} placeholder={t('Что получилось и что исправить')} minHeight={0} fixedHeight="var(--hr-comment-height, 112px)" fontSize={13} toolbarPlacement="below" ariaLabel={t('Комментарий ученику в полной проверке')} inputSt={{width:'100%',boxSizing:'border-box',border:'1px solid var(--color-border-soft)',borderRadius:12,background:'var(--color-bg-card)',color:'var(--color-text)',outline:'none',fontFamily:'inherit'}}/>{showAiReview&&aiGrade?.comment&&aiGrade.status!=='working'&&aiGrade.status!=='pending'&&!reviewed&&<AiCommentDraft key={'ai-draft:'+student.id} comment={aiGrade.comment} busy={busy||draft.comment.includes(aiGrade.comment)} onUse={()=>setDraft({comment:draft.comment.trim()?draft.comment+'<p>'+aiCommentHtml(aiGrade.comment)+'</p>':aiCommentHtml(aiGrade.comment)})}/>}</div>
        </HomeworkReviewScroll>
        <div className="hr-review-actions">{saveError&&<p className="hr-save-error" role="alert">{saveError}</p>}<button type="button" className="hr-button hr-primary" disabled={busy} onClick={()=>void handleVerdict('accepted')}><Check size={16}/>{busy?t('Сохраняем…'):t('Завершить проверку')}</button><button type="button" className="hr-button" disabled={busy} onClick={()=>void handleVerdict('returned')}><RotateCcw size={15}/>{t('На доработку')}</button></div>
      </aside>
    </div>
    <footer className="hr-workspace-footer"><span>{allDone?t('Все работы проверены'):t('Проверено')+' '+reviewedCount+' '+t('из')+' '+submitters.length}{embedded?' · '+t('Учебный пример'):''}</span>{!embedded&&cleanAi.length>0&&<button type="button" className={'hr-button hr-batch-accept'+(batchArmed?' hr-batch-armed':'')} disabled={busy} onClick={()=>void acceptCleanAi()}><Check size={14}/>{batchArmed?t('Принять')+' '+cleanAi.length+'? '+t('Нажмите ещё раз'):t('Принять без замечаний ИИ')+' · '+cleanAi.length}</button>}{nav}</footer>
  </section>
}
