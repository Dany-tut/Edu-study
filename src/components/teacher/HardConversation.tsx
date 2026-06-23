import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Send, Image as ImageIcon, PenLine, X, Check, RotateCcw, Star, Clock, MessageSquare,
} from 'lucide-react'
import RichConditionEditor from './RichConditionEditor'
import WhiteboardCanvas from './WhiteboardCanvas'
import AnnotationLayer, { type Annotation } from './AnnotationLayer'
import AnswerBody from './AnswerBody'
import { optimizePhoto } from '../../lib/imageOptim'
import { getContrastColor } from '../../lib/utils'
import {
  type HardTaskStudentBlock, type HardTaskReviewBlock, type HardEvent, type HardSolution,
  mergeTaskEvents, taskStatus, hardTaskScore, lastSolutionOf, type HardTaskStatus,
} from '../../lib/useHomework'

// Вкладки сложных заданий + датированная лента раундов (решение → комментарий →
// решение → … → принято) + composer под роль. Persistence — в родителе (страница
// ученика / учителя) через колбэки. Один источник рендера для обеих сторон.

export type HardTabVM = { key: string; title: string; statement?: string; image?: string | null }

export type ReviewPayload = {
  comment: string; photos: string[]; board: string | null
  boardMode: 'over' | 'beside'; annotation: Annotation | null
  verdict: 'returned' | 'completed'; score: number | null
}

const STATUS_META: Record<HardTaskStatus, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'Черновик', color: 'var(--color-text-3)', bg: 'var(--color-bg-5)' },
  submitted: { label: 'На проверке', color: 'var(--color-purple-text)', bg: 'var(--color-purple-soft)' },
  returned: { label: 'На доработку', color: 'var(--color-peach-text)', bg: 'var(--color-peach-soft)' },
  completed: { label: 'Принято', color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: color ?? 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ tabs, statuses, activeKey, onSelect }: {
  tabs: HardTabVM[]; statuses: Record<string, HardTaskStatus>; activeKey: string; onSelect: (k: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {tabs.map((tab, i) => {
        const meta = STATUS_META[statuses[tab.key] ?? 'in_progress']
        const active = tab.key === activeKey
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
              border: `1px solid ${active ? 'transparent' : 'var(--color-border-medium)'}`,
              background: active ? 'var(--color-text)' : 'var(--color-bg-2)',
              color: active ? 'var(--color-bg)' : 'var(--color-text)',
            }}
          >
            <span>{tab.title || `Задание ${i + 1}`}</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: meta.color }} title={meta.label} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Timeline cards ─────────────────────────────────────────────────────────────

function SolutionCard({ ev, onZoomPhoto }: { ev: HardEvent & { kind: 'solution' }; onZoomPhoto?: (src: string) => void }) {
  return (
    <div style={{ borderRadius: 18, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)', padding: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-purple-text)', letterSpacing: 0.4, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={12} /> Решение ученика</span>
        {fmtDate(ev.at) && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', marginTop: 4 }}>{fmtDate(ev.at)}</div>}
      </div>
      <AnswerBody comment={ev.answer} photos={ev.photos} board={ev.board} onZoomPhoto={onZoomPhoto} photosClickable={!!onZoomPhoto} />
    </div>
  )
}

function CommentCard({ ev, repliesTo, onZoomPhoto }: { ev: HardEvent & { kind: 'comment' }; repliesTo: HardSolution | null; onZoomPhoto?: (src: string) => void }) {
  const accepted = ev.verdict === 'completed'
  const tone = accepted ? 'green' : 'peach'
  return (
    <div style={{ borderRadius: 18, border: `1px solid var(--color-${tone}-soft)`, background: `var(--color-${tone}-soft)`, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: `var(--color-${tone}-text)`, letterSpacing: 0.4, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageSquare size={12} /> Комментарий преподавателя</span>
          {fmtDate(ev.at) && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', marginTop: 4 }}>{fmtDate(ev.at)}</div>}
        </div>
        {ev.verdict && (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: `var(--color-${tone}-text)`, background: 'rgba(var(--glass-rgb),0.7)', padding: '3px 9px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {accepted ? <><Star size={11} fill="currentColor" /> Принято{typeof ev.score === 'number' ? ` · ${ev.score}/5` : ''}</> : <><RotateCcw size={11} /> На доработку</>}
          </span>
        )}
      </div>

      {ev.comment && <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{ev.comment}</p>}

      {ev.annotation && repliesTo && (
        <div style={{ borderRadius: 14, background: 'rgba(var(--glass-rgb),0.6)', border: '1px solid var(--color-border-soft)', padding: 14 }}>
          <Label color={`var(--color-${tone}-text)`}>Разбор поверх решения</Label>
          <AnnotationLayer value={ev.annotation}>
            <AnswerBody comment={repliesTo.answer} photos={repliesTo.photos} board={repliesTo.board} photosClickable={false} />
          </AnnotationLayer>
        </div>
      )}

      {!!ev.photos?.length && (
        <div>
          <Label color={`var(--color-${tone}-text)`}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ImageIcon size={12} /> Фото от преподавателя</span></Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {ev.photos.map((src, i) => (
              <button key={i} onClick={() => onZoomPhoto?.(src)} disabled={!onZoomPhoto} style={{ padding: 0, border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden', cursor: onZoomPhoto ? 'zoom-in' : 'default', background: 'var(--color-bg)' }}>
                <img src={src} alt="" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {ev.board && (
        <div>
          <Label color={`var(--color-${tone}-text)`}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PenLine size={12} /> Доска преподавателя</span></Label>
          <WhiteboardCanvas readOnly initialData={ev.board} />
        </div>
      )}
    </div>
  )
}

function Timeline({ events, onZoomPhoto }: { events: HardEvent[]; onZoomPhoto?: (src: string) => void }) {
  let lastSol: HardSolution | null = null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {events.map(ev => {
        if (ev.kind === 'solution') {
          lastSol = ev
          return <SolutionCard key={ev.id} ev={ev} onZoomPhoto={onZoomPhoto} />
        }
        return <CommentCard key={ev.id} ev={ev} repliesTo={lastSol} onZoomPhoto={onZoomPhoto} />
      })}
    </div>
  )
}

// ─── Student composer ─────────────────────────────────────────────────────────

function StudentComposer({ isFollowUp, busy, palette, onSubmit }: {
  isFollowUp: boolean; busy?: boolean
  palette: { accent: string; soft: string; text: string; ring: string }
  onSubmit: (payload: { answer: string; photos: string[]; board: string | null }) => void
}) {
  const [draft, setDraft] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [board, setBoard] = useState<string | null>(null)
  const [showBoard, setShowBoard] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const draftText = draft.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  const has = !!(draftText || /<img/i.test(draft) || photos.length || board)

  function addPhotos(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(async file => {
      const src = await optimizePhoto(file)
      if (src) setPhotos(p => [...p, src])
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Label color={palette.text}>{isFollowUp ? 'Новое решение' : 'Твоё решение'}</Label>
      <RichConditionEditor
        value={draft}
        onChange={setDraft}
        placeholder="Распиши решение — текст, формулы, можно приложить фото или доску…"
        autoGrow
        minHeight={180}
        inputSt={{ width: '100%', boxSizing: 'border-box', borderRadius: 20, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
      />
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', width: 90, height: 90, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border-soft)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {showBoard && <WhiteboardCanvas initialData={board ?? undefined} onSave={setBoard} />}
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 14, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ImageIcon size={16} /> Фото
          </button>
          <button onClick={() => setShowBoard(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 14, border: `1px solid ${showBoard || board ? palette.accent : 'var(--color-border-medium)'}`, background: showBoard || board ? palette.soft : 'var(--color-bg-2)', color: showBoard || board ? palette.text : 'var(--color-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <PenLine size={16} /> {board ? 'Доска ✓' : 'Доска'}
          </button>
        </div>
        <motion.button whileHover={{ y: has && !busy ? -1 : 0 }} whileTap={{ scale: 0.99 }} disabled={!has || busy} onClick={() => onSubmit({ answer: draft, photos, board })}
          style={{ padding: '13px 22px', borderRadius: 16, border: 'none', background: has && !busy ? palette.accent : 'var(--color-bg-5)', color: has && !busy ? getContrastColor(palette.accent) : 'var(--color-text-3)', fontSize: 14, fontWeight: 750, cursor: has && !busy ? 'pointer' : 'default', minWidth: 200, boxShadow: has && !busy ? `0 6px 16px ${palette.ring}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Send size={15} /> {busy ? 'Отправляю…' : 'Отправить решение'}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Teacher composer ─────────────────────────────────────────────────────────

function TeacherComposer({ solution, busy, onReview }: {
  solution: HardSolution | null; busy?: boolean
  onReview: (payload: ReviewPayload) => void
}) {
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [board, setBoard] = useState<string | null>(null)
  const [showBoard, setShowBoard] = useState(false)
  const [annotating, setAnnotating] = useState(false)
  const [annotation, setAnnotation] = useState<Annotation | null>(null)
  const [score, setScore] = useState<number>(5)
  const [returnError, setReturnError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addPhotos(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(async file => {
      const src = await optimizePhoto(file)
      if (src) setPhotos(p => [...p, src])
    })
  }

  function act(verdict: 'returned' | 'completed') {
    if (verdict === 'returned' && !comment.trim()) { setReturnError(true); return }
    onReview({ comment: comment.trim(), photos, board, boardMode: annotation ? 'over' : 'beside', annotation, verdict, score: verdict === 'completed' ? score : null })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {solution && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <Label>Разметка поверх решения</Label>
            <button onClick={() => setAnnotating(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, border: `1px solid ${annotating ? 'transparent' : 'var(--color-border-medium)'}`, background: annotating ? 'var(--color-green-soft)' : 'var(--color-bg-2)', color: annotating ? 'var(--color-green-text)' : 'var(--color-text)' }}>
              {annotating ? <><Check size={14} /> Готово</> : <><PenLine size={14} /> Разметить</>}
            </button>
          </div>
          <AnnotationLayer active={annotating} value={annotation} onChange={setAnnotation}>
            <AnswerBody comment={solution.answer} photos={solution.photos} board={solution.board} photosClickable={false} />
          </AnnotationLayer>
        </div>
      )}

      <div>
        <Label>Комментарий</Label>
        <textarea value={comment} onChange={e => { setComment(e.target.value); if (returnError) setReturnError(false) }}
          placeholder="Что верно, что исправить? Обязательно при отправке на доработку…" rows={4}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg-2)', border: `1px solid ${returnError ? 'var(--color-peach-text)' : 'var(--color-border-soft)'}`, fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none' }} />
        {returnError && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-peach-text)', marginTop: 6 }}>Добавьте комментарий, чтобы вернуть на доработку.</div>}
      </div>

      <div>
        <Label>Приложить к ответу</Label>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current?.click()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ImageIcon size={14} /> Фото
          </button>
          <button onClick={() => setShowBoard(v => !v)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12, border: `1px solid ${showBoard || board ? 'var(--color-accent)' : 'var(--color-border-medium)'}`, background: showBoard || board ? 'var(--color-purple-soft)' : 'var(--color-bg-2)', color: showBoard || board ? 'var(--color-accent)' : 'var(--color-text)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <PenLine size={14} /> {board ? 'Доска ✓' : 'Доска'}
          </button>
        </div>
        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
            {photos.map((src, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border-soft)' }}>
                <img src={src} alt="" style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} />
                <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        {showBoard && <div style={{ marginTop: 10 }}><WhiteboardCanvas initialData={board ?? undefined} onSave={setBoard} /></div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Label>Оценка при принятии</Label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setScore(n)} style={{ width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, border: `1px solid ${score === n ? 'transparent' : 'var(--color-border-medium)'}`, background: score === n ? 'var(--color-green-soft)' : 'var(--color-bg-2)', color: score === n ? 'var(--color-green-text)' : 'var(--color-text)' }}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <motion.button whileHover={{ y: busy ? 0 : -1 }} whileTap={{ scale: 0.98 }} onClick={() => act('completed')} disabled={busy}
          style={{ padding: '13px 0', borderRadius: 14, border: 'none', background: 'var(--grad-green)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 18px rgba(42,125,79,0.28)', opacity: busy ? 0.6 : 1 }}>
          <Check size={15} /> Принять задание · {score}/5
        </motion.button>
        <motion.button whileHover={{ y: busy ? 0 : -1 }} whileTap={{ scale: 0.98 }} onClick={() => act('returned')} disabled={busy}
          style={{ padding: '13px 0', borderRadius: 14, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: busy ? 0.6 : 1 }}>
          <RotateCcw size={14} /> На доработку
        </motion.button>
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

const DEFAULT_PALETTE = { accent: 'var(--color-accent)', soft: 'var(--color-purple-soft)', text: 'var(--color-accent)', ring: 'rgba(120,106,215,0.3)' }

export default function HardConversation({
  tabs, studentBlocks, reviewBlocks, role, activeKey, onSelectTab, onZoomPhoto,
  onSubmitSolution, onReview, busy, palette = DEFAULT_PALETTE,
}: {
  tabs: HardTabVM[]
  studentBlocks: HardTaskStudentBlock[]
  reviewBlocks: HardTaskReviewBlock[]
  role: 'student' | 'teacher'
  activeKey: string
  onSelectTab: (key: string) => void
  onZoomPhoto?: (src: string) => void
  onSubmitSolution?: (key: string, payload: { answer: string; photos: string[]; board: string | null }) => void
  onReview?: (key: string, payload: ReviewPayload) => void
  busy?: boolean
  palette?: { accent: string; soft: string; text: string; ring: string }
}) {
  const sbByKey = new Map(studentBlocks.map(b => [b.key, b]))
  const rbByKey = new Map(reviewBlocks.map(b => [b.key, b]))
  const statuses: Record<string, HardTaskStatus> = {}
  for (const t of tabs) statuses[t.key] = taskStatus(sbByKey.get(t.key), rbByKey.get(t.key))

  const tab = tabs.find(t => t.key === activeKey) ?? tabs[0]
  if (!tab) return null
  const sb = sbByKey.get(tab.key)
  const rb = rbByKey.get(tab.key)
  const status = statuses[tab.key]
  const meta = STATUS_META[status]
  const events = mergeTaskEvents(sb, rb)
  const score = hardTaskScore(rb)

  const studentCanReply = role === 'student' && (status === 'in_progress' || status === 'returned') && !!onSubmitSolution
  const teacherCanReview = role === 'teacher' && status === 'submitted' && !!onReview

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {tabs.length > 1 && <TabBar tabs={tabs} statuses={statuses} activeKey={tab.key} onSelect={onSelectTab} />}

      {/* Условие задания (закреплено сверху) */}
      <div style={{ padding: 18, borderRadius: 20, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: tab.statement ? 10 : 0 }}>
          <Label color="var(--color-accent)">Задание от преподавателя · {tab.title}</Label>
          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '3px 9px', borderRadius: 8, flexShrink: 0 }}>{meta.label}</span>
        </div>
        {tab.statement && (
          /<\/?[a-z][\s\S]*>/i.test(tab.statement)
            ? <div className="rich-answer" style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--color-text)', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: tab.statement }} />
            : <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap' }}>{tab.statement}</p>
        )}
        {tab.image && <img src={tab.image} alt="" onClick={() => onZoomPhoto?.(tab.image!)} style={{ marginTop: 12, maxWidth: '100%', borderRadius: 14, border: '1px solid var(--color-border-medium)', cursor: onZoomPhoto ? 'zoom-in' : 'default', display: 'block' }} />}
      </div>

      {events.length > 0 && <Timeline events={events} onZoomPhoto={onZoomPhoto} />}

      {studentCanReply && (
        <div style={{ padding: 18, borderRadius: 20, background: 'rgba(var(--glass-rgb),0.96)', border: '1px solid var(--color-border-soft)' }}>
          <StudentComposer key={tab.key + events.length} isFollowUp={events.length > 0} busy={busy} palette={palette} onSubmit={p => onSubmitSolution!(tab.key, p)} />
        </div>
      )}

      {teacherCanReview && (
        <div style={{ padding: 18, borderRadius: 20, background: 'rgba(var(--glass-rgb),0.96)', border: '1px solid var(--color-border-soft)' }}>
          <TeacherComposer key={tab.key + events.length} solution={lastSolutionOf(sb)} busy={busy} onReview={p => onReview!(tab.key, p)} />
        </div>
      )}

      {/* Подсказки-ожидание */}
      {role === 'student' && status === 'submitted' && (
        <div style={{ padding: '14px 18px', borderRadius: 16, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-purple-text)', fontSize: 13, fontWeight: 600 }}>
          <Clock size={16} /> Решение отправлено — ждём проверку преподавателя.
        </div>
      )}
      {status === 'completed' && (
        <div style={{ padding: '14px 18px', borderRadius: 16, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700 }}>
          <Star size={16} fill="currentColor" /> Задание принято{typeof score === 'number' ? ` · ${score}/5` : ''}.
        </div>
      )}
      {role === 'teacher' && status === 'returned' && (
        <div style={{ padding: '14px 18px', borderRadius: 16, background: 'var(--color-peach-soft)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-peach-text)', fontSize: 13, fontWeight: 600 }}>
          <Clock size={16} /> Возвращено — ждём новое решение ученика.
        </div>
      )}
      {role === 'teacher' && status === 'in_progress' && (
        <div style={{ padding: '14px 18px', borderRadius: 16, background: 'var(--color-bg-2)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-muted)', fontSize: 13, fontWeight: 600 }}>
          <Clock size={16} /> Ученик ещё не присылал решение по этому заданию.
        </div>
      )}
    </div>
  )
}
