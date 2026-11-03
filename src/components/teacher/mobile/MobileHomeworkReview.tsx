import { useEffect, useMemo, useRef, useState } from 'react'
import type { HomeworkItem } from '../../../data/teacherMockData'
import { useHomeworkSubmissions, reviewHomework, type HwSubmission } from '../../../lib/useHomework'
import { readDraft, writeDraft, clearDraft } from '../../../lib/useDraft'
import { useT, useTc } from '../../../lib/i18n'
import { getViewAs } from '../../../lib/owner'
import { useSwipeBack } from '../../../lib/useSwipeBack'
import { tactile } from '../../../lib/feedback'
import MobileScreen from '../../MobileScreen'
import BackCircle from '../../BackCircle'
import { GlassPill } from '../../mobileChrome'
import BasicAnswersList from '../BasicAnswersList'
import { Alert } from '../../Alert'
import { Check, ChevronRight, Loader2, RotateCcw } from '../../icons/appIcons'
import { FIELD } from '../../../lib/fieldStyle'
import { btn } from '../../../lib/pillStyles'
import '../journalStand/homeworkReview.css'
import './mobileHomeworkReview.css'

type Draft = { score: string; comment: string; taskScores: Record<string, string> }
const emptyDraft: Draft = { score: '', comment: '', taskScores: {} }

/** Reuses production publication and answer snapshots; demo writes stay in memory. */
export default function MobileHomeworkReview({ homework, demoSubmissions, onBack, onPublished, onReview }: {
  onReview?: typeof reviewHomework
  homework: HomeworkItem; demoSubmissions?: HwSubmission[]; onBack: () => void; onPublished: (id: string, verdict: 'accepted' | 'returned') => void
}) {
  const t = useT()
  const { tc, tn } = useTc()
  const demo = !!demoSubmissions
  const { submissions, loading, error: loadError, reload } = useHomeworkSubmissions(demo ? null : homework.id, homework.lessonId)
  const source = demoSubmissions ?? submissions
  // Keep published cards visible until the teacher explicitly moves on.
  const [published, setPublished] = useState<Record<string, 'accepted' | 'returned'>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pending = useMemo(() => source.filter(s => s.verdict === 'pending' && !published[s.id]), [source, published])
  const current = source.find(s => s.id === selectedId) ?? pending[0]
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [saveError, setSaveError] = useState('')
  const [draftWarning, setDraftWarning] = useState(false)
  const done = current ? published[current.id] : undefined
  const key = current ? `mobileHwReview:${homework.id}:${current.id}:${current.answers?.attemptId ?? current.submittedAt}` : ''
  useEffect(() => {
    const saved = readDraft<Draft>(key)
    setDraft(saved ? { ...emptyDraft, ...saved, taskScores: saved.taskScores ?? {} } : emptyDraft); setSaveError(''); setDraftWarning(false)
  }, [key])
  const back = () => { if (!busyRef.current) onBack() }
  useSwipeBack(back)
  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch }
    setDraft(next); setSaveError(''); writeDraft(key, next)
    setDraftWarning(JSON.stringify(readDraft(key)) !== JSON.stringify(next))
  }
  const tasks = homework.tasks ?? []
  const total = tasks.reduce((sum, task) => sum + Number(draft.taskScores[task.id] || 0), 0)
  const maximum = tasks.reduce((sum, task) => sum + task.maxScore, 0)
  const score = tasks.length ? Math.round(total / Math.max(1, maximum) * 100) : Number(draft.score)
  async function publish(verdict: 'accepted' | 'returned') {
    if (!current || busyRef.current || done || getViewAs()) return
    if (verdict === 'accepted' && (tasks.length ? tasks.some(task => {
      const v = draft.taskScores[task.id]
      return !v?.trim() || !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > task.maxScore
    }) : !draft.score.trim() || !Number.isFinite(score) || score < 0 || score > 100)) {
      setSaveError(t('Укажите итоговую оценку всей работы.')); return
    }
    if (verdict === 'returned' && !draft.comment.trim()) { setSaveError(t('Добавьте комментарий для доработки.')); return }
    busyRef.current = true; setBusy(true); setSaveError(''); tactile()
    try {
      const save = onReview ?? (demo ? async () => true : reviewHomework)
      const ok = await save(current.id, verdict, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
        draft.comment.trim(), { photos: current.reviewPhotos, board: current.reviewBoard }, current.answers?.attemptId)
      if (!ok) throw new Error('save')
      clearDraft(key); setPublished(old => ({ ...old, [current.id]: verdict })); setSelectedId(current.id)
      onPublished(current.id, verdict)
    } catch { setSaveError(t(draftWarning ? 'Не удалось сохранить проверку. Не закрывайте экран и попробуйте ещё раз.' : 'Не удалось сохранить проверку. Черновик сохранён — попробуйте ещё раз.')) }
    finally { busyRef.current = false; setBusy(false) }
  }
  const next = pending.find(s => s.id !== current?.id)
  const footer = current && (!loading || demo) ? <div className="mhr-actions">
    {saveError && <Alert tone="danger" text={saveError} />}
    {done ? <button type="button" style={btn('L', 'primary')} onClick={() => {
      if (next) { setSelectedId(next.id); tactile() } else onBack()
    }}>{next ? t('Следующая работа') : t('К списку ДЗ')}<ChevronRight size={18} /></button> : <>
      <button type="button" disabled={busy || !!getViewAs()} style={btn('L', 'primary')} onClick={() => void publish('accepted')}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{t(busy ? 'Сохраняем…' : 'Завершить проверку')}
      </button>
      <button type="button" disabled={busy || !!getViewAs()} style={btn('L', 'secondary')} onClick={() => void publish('returned')}><RotateCcw size={18} />{t('На доработку')}</button>
    </>}
  </div> : undefined
  return <div className="mobile-homework-review"><MobileScreen
    glassHeader={{ leading: t('Проверка работы'), onBack: back, backLabel: t('К списку ДЗ') }}
    topZone={<div className="mhr-top"><BackCircle onClick={back} label="К списку ДЗ" /><GlassPill>{t('Проверка работы')}</GlassPill></div>}
    topPad={64} bottomDock={footer} bottomDockRaise={16} scrollKey={current?.id ?? 'loading'}>
    <div className="mhr-content">
      {demo && <Alert tone="info" text={t('Учебный пример')} />}
      {loadError && <Alert tone="danger" text={t(loadError)} action={{label:t('Повторить'),onClick:()=>void reload()}} />}
      {loading && !demo ? <p role="status" className="mhr-muted">{t('Загрузка…')}</p> : current ? <>
        <section className="mhr-card"><p className="mhr-muted">{tc(homework.title)}</p><h1>{tn(current.studentName)}</h1><p className="mhr-muted">{homework.groupName}</p>
          <span className="mhr-status">{t(done === 'accepted' ? 'Проверено' : done === 'returned' ? 'На доработке' : 'На проверке')}</span>
          {!done && pending.length > 1 && <label className="mhr-label">{t('Ученик')}<select style={FIELD} disabled={busy} aria-label={t('Выбрать ученика в полной проверке')} value={current.id} onChange={e => setSelectedId(e.target.value)}>{pending.map(s => <option key={s.id} value={s.id}>{tn(s.studentName)}</option>)}</select></label>}
        </section>
        {done ? <section className="mhr-card" role="status"><h2>{t('Проверка сохранена')}</h2><p className="mhr-muted">{t(done === 'accepted' ? 'Проверено' : 'На доработке')}{done === 'accepted' ? ` · ${score}%` : ''}</p></section> : <>
          <section className="mhr-card"><h2>{t('Ответы ученика')}</h2>
            {current.comment && <p className="mhr-answer">{current.comment}</p>}
            {current.answers ? <BasicAnswersList payload={current.answers} studentId={demo ? undefined : current.studentId} appearance="review" teacherReviewed={false} /> : !current.comment && <p className="mhr-muted">{t('Ответы этой сдачи не сохранились.')}</p>}
          </section>
          <section className="mhr-card"><h2>{t('Оценка и комментарий')}</h2>
            {draftWarning && <Alert tone="danger" text={t('Не удалось сохранить черновик. Не закрывайте экран до отправки.')} />}
            <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
              <div className="mhr-fields">{tasks.length ? tasks.map(task => <label key={task.id} className="mhr-label">{task.title} · {task.maxScore}<input style={FIELD} type="number" inputMode="decimal" min={0} max={task.maxScore} aria-label={t('Балл за задание')+' '+task.title} value={draft.taskScores[task.id] ?? ''} onChange={e => update({taskScores:{...draft.taskScores,[task.id]:e.target.value}})} /></label>) : <label className="mhr-label">{t('Итоговый результат')} · %<input style={FIELD} type="number" inputMode="decimal" min={0} max={100} aria-label={t('Итог ДЗ в процентах')} value={draft.score} onChange={e => update({score:e.target.value})} /></label>}
                {!tasks.length && <div className="mhr-quick">{[60,75,85,100].map(n => <button key={n} type="button" style={btn('M','secondary')} aria-pressed={draft.score===String(n)} onClick={()=>update({score:String(n)})}>{n}%</button>)}</div>}
                <label className="mhr-label">{t('Комментарий ученику')}<textarea style={{...FIELD,minHeight:140}} value={draft.comment} placeholder={t('Что получилось и что исправить')} onChange={e=>update({comment:e.target.value})}/></label>
              </div>
            </fieldset>
          </section>
        </>}
      </> : !loadError && <section className="mhr-card"><h2>{t('Все работы проверены')}</h2><button type="button" style={btn('L','secondary')} onClick={back}>{t('К списку ДЗ')}</button></section>}
    </div>
  </MobileScreen></div>
}
