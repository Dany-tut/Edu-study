import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import ScrollFade from '../components/ScrollFade'
import QuestionTable from '../components/QuestionTable'
import { useFloatingPill } from '../lib/useFloatingPill'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, BookOpen, CheckCircle2, XCircle,
  Star, Share2, AlertTriangle, Eye, EyeOff, Sparkles, Target, Filter,
  LayoutGrid, List, ArrowUpDown, ArrowUp, X, TrendingUp, FlaskConical, Bell, Database, ZoomIn, ZoomOut, Layers,
} from 'lucide-react'
import {
  Task, Subject,
  BIOLOGY_SECTION_LINE_MAP, BIOLOGY_DIAGNOSTIC_SAMPLE_LINES, BIOLOGY_ROUTE,
  linesForSelection, lineNamesForSubject,
  sectionsForSubject, topicsForSelection, sectionsForParts, partsForSections,
} from '../data/taskBankData'
import MultiSelectField from '../components/MultiSelectField'
import { copyToClipboard } from '../lib/clipboard'
import { trackEvent } from '../lib/analytics'
// Дедуп trainer_open: dual-layout монтирует TaskBankPage дважды.
let lastTrainerOpen = 0
import { useCurriculum } from '../store/curriculumStore'
import { useTaskBank } from '../store/taskBankStore'
import { useOptionMerger, sectionScope, topicScope, SOURCE_SCOPE } from '../store/taskMetaStore'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { subjectTheme, PURPLE } from '../lib/theme'
import { getSubject, BANK_SUBJECT_IDS, subjectIcon } from '../lib/subjects'
import LanguageTrainer from '../components/LanguageTrainer'
import TrainerSkeleton from '../components/trainer/TrainerSkeleton'
import CardDeck, { type DeckSource } from '../components/CardDeck'
import { captureMistake, deckOwner, type ReviewCard } from '../data/reviewDeck'
import { getContrastColor } from '../lib/utils'
import { bindShortWordsHtml } from '../lib/typography'
import { useTheme } from '../store/themeStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useNavCollapse } from '../lib/useNavCollapse'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import MobileScreen from '../components/MobileScreen'
import MobileBottomNav from '../components/MobileBottomNav'
import MobileSheet from '../components/MobileSheet'
import { GlassPill, GlassIconButton } from '../components/mobileChrome'
import MobileBell from '../components/MobileBell'
import { glassCircle } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'

type StatusFilter = 'all' | 'done' | 'undone'
type SortMode = 'newest' | 'oldest' | 'easy' | 'hard' | 'subject' | 'line'
type ViewMode = 'list' | 'grid'

// Shared spring for the answer field ↔ Проверить-button morph: the field's
// `layout` resize and the button's scale/slide ride the same spring so they
// feel like one coordinated motion (snappy, tiny settle, no overshoot wobble).
const FIELD_MORPH = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const

// ── Задание банка → карточка ─────────────────────────────────────────────────
//
// Карточка — это текст и ничего больше: условие с картинкой, таблицей или
// развёрнутым ответом части 2 на ней просто не помещается, а показать условие,
// на которое нечем ответить, хуже, чем не показать его вовсе. Поэтому в стопку
// идёт только то, что читается и проверяется одной строкой; сколько заданий
// осталось за бортом, страница говорит вслух — молча урезанная выборка
// читается как «прогнал весь банк», хотя это не так.
const CARD_SESSION_LIMIT = 30

function fitsCard(t: Task): boolean {
  const a = t.answer.trim()
  return t.part === 1 && !t.questionImage && !t.questionTable && a.length > 0 && a.length <= 60
}

/** Условие хранится как HTML — на карточке нужен чистый текст. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function taskToCard(task: Task): ReviewCard {
  const now = new Date().toISOString()
  return {
    id: `bank-${task.id}`,
    subject: task.subject,
    source: 'manual',
    prompt: plainText(task.question),
    answer: task.answer.trim(),
    ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: now, createdAt: now,
  }
}

const SORT_OPTIONS: [SortMode, string][] = [
  ['newest', 'Новые'],
  ['oldest', 'Старые'],
  ['easy', 'Простые'],
  ['hard', 'Сложные'],
]

// ── Scroll-fade list ─────────────────────────────────────────────────────────
// Vertical scroll area that fades content at whichever edge is still scrollable,
// ── Filter field — input-style combobox, expands inline (never clipped) ──────
function FilterField({ label, options, value, onChange, accent }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; accent: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const shown = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <div style={{ position: 'relative' }}>
      <div
        onMouseDown={e => {
          if (e.target === inputRef.current) {
            if (open) { e.preventDefault(); setOpen(false); inputRef.current?.blur() }
            return
          }
          e.preventDefault()
          if (open) {
            setOpen(false)
            inputRef.current?.blur()
          } else {
            setOpen(true)
            setQuery('')
            inputRef.current?.focus()
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 12px', borderRadius: 13,
          background: 'var(--color-bg-input)',
          border: 'none',
          transition: 'background 0.15s ease',
          cursor: 'pointer',
        }}>
        <input
          ref={inputRef}
          className="mobile-input-16"
          value={open ? query : value}
          placeholder={label}
          onFocus={() => { setOpen(true); setQuery('') }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, fontWeight: value && !open ? 600 : 400,
            color: value && !open ? 'var(--color-text)' : 'var(--color-muted)',
            cursor: 'pointer',
          }}
        />
        {value && !open ? (
          <button onMouseDown={e => { e.preventDefault(); onChange('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        ) : (
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', pointerEvents: 'none' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
          style={{
            // Float over the filters below instead of pushing them down — a glass
            // sheet anchored to the field's bottom edge.
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 50,
            background: 'rgba(var(--glass-rgb), 0.9)',
            backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', borderRadius: 13,
            boxShadow: 'var(--shadow-modal-sm)', overflow: 'hidden',
          }}
        >
          <ScrollFade maxHeight={190} bg="rgba(var(--glass-rgb), 0.9)" scrollClassName="no-scrollbar">
            {/* Inset the rows so the active/hover fill floats inside the glass
                with a margin off the edges and rounded corners. */}
            <div style={{ padding: 5, display: 'flex', flexDirection: 'column' }}>
              {value && (
                <button onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  style={{ width: '100%', padding: '8px 8px', borderRadius: 9, textAlign: 'left', background: 'transparent', border: 'none', fontSize: 12, color: 'var(--color-text-3)', cursor: 'pointer', transition: 'background 0.13s ease' }}>
                  {t('— Сбросить')}
                </button>
              )}
              {shown.length === 0 ? (
                <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--color-text-5)' }}>{t('Ничего не найдено')}</div>
              ) : shown.map(opt => {
                const rest = opt === value ? `${accent}14` : 'transparent'
                return (
                  <button key={opt} onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}1f` }}
                    onMouseLeave={e => { e.currentTarget.style.background = rest }}
                    style={{ width: '100%', padding: '9px 8px', borderRadius: 9, textAlign: 'left', background: rest, border: 'none', fontSize: 12.5, cursor: 'pointer', color: 'var(--color-text)', fontWeight: opt === value ? 700 : 400, transition: 'background 0.13s ease' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </ScrollFade>
        </motion.div>
      )}
    </div>
  )
}

// ── Copyable №-badge ─────────────────────────────────────────────────────────
function NumberBadge({ id, onCopied, icon }: { id: number; onCopied: () => void; icon?: ReactNode }) {
  const t = useT()
  const [tipped, setTipped] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    void copyToClipboard(`№${id}`)
    setTipped(true)
    onCopied()
    setTimeout(() => setTipped(false), 1400)
  }
  return (
    <span
      onClick={copy}
      title={t('Скопировать номер')}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: icon ? '2px 8px 2px 6px' : '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', transition: 'background 0.15s ease' }}>
        {icon}№{id}
      </span>
      <AnimatePresence>
        {tipped && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, scale: 0.78, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 999,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px 5px 7px',
              borderRadius: 999,
              background: 'rgba(var(--glass-rgb), 0.22)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 4px 18px rgba(42,125,79,0.18), 0 1px 4px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--grad-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(42,125,79,0.35)',
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2.2 2.2 3.3-3.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green-text)', letterSpacing: 0.1 }}>{t('Скопировано')}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ── Task card — same visual language as HomeworkFlow questions ───────────────
function TaskCard({ task, index, palette, favorites, onFavorite, answered, onAnswer, onCopyId, lineNames, mobile }: {
  task: Task; index: number; palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  favorites: Set<number>; onFavorite: (id: number) => void
  answered: Map<number, { value: string; correct: boolean | null }>
  onAnswer: (id: number, value: string, correct: boolean | null) => void
  onCopyId: () => void
  mobile?: boolean
}) {
  const t = useT()
  const [showSolution, setShowSolution] = useState(false)
  // Mobile table has two modes: fit-to-block (columns wrap to screen width) and
  // zoom (natural size, scrolls horizontally). Toggled by the ⤢ button.
  const [tableZoom, setTableZoom] = useState(false)
  const [inputVal, setInputVal] = useState(answered.get(task.id)?.value ?? '')
  const [inputOverflow, setInputOverflow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [copied, setCopied] = useState(false)
  const [reported, setReported] = useState(false)
  const state = answered.get(task.id)
  const isFav = favorites.has(task.id)
  const isCorrect = state?.correct === true
  const isWrong   = state?.correct === false
  // Once the current text has actually been checked, hide "Проверить" — only
  // the field + "Решение" remain. Editing the answer afterwards (inputVal no
  // longer matches what was checked) brings "Проверить" back so it can be
  // re-submitted, instead of leaving the student with no way to recheck.
  const alreadyChecked = state !== undefined && inputVal === state.value

  // ── Golden rules for option/match/sequence rows on the phone ──────────────
  // Tighter box (less padding, smaller letter chip, lower min-height) and a
  // snugger line-height so multi-line answers ("Ковалентная полярная") don't
  // balloon the row. Desktop keeps its roomier metrics.
  const rowPad   = mobile ? '8px 11px' : '10px 14px'
  const rowMinH  = mobile ? 34 : 42
  const rowGap   = mobile ? 8 : 10
  const chipSz   = mobile ? 22 : 26
  const rowTextLH = mobile ? 1.3 : 1.45
  // One height for the answer field + its Проверить/Решение buttons so they
  // line up as equal-height pills (padding alone left the button shorter).
  const answerH  = mobile ? 48 : 42

  // Tactility is mobile-only — desktop trainer shouldn't blip/vibrate on every click.
  const tap = () => { if (mobile) tactile() }
  function check() {
    tap()
    onAnswer(task.id, inputVal, inputVal.trim().toLowerCase() === task.answer.toLowerCase())
  }
  function share() {
    void copyToClipboard(`№${task.id} · ${task.question.replace(/<[^>]*>/g, '').slice(0, 80)}…`)
    setCopied(true); setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 14, padding: '20px 20px 12px 20px', borderRadius: 26,
        position: 'relative',
        background: 'rgba(var(--glass-rgb), 0.96)',
        border: `1px solid ${isCorrect ? 'rgba(110,231,160,0.58)' : isWrong ? 'rgba(244,139,145,0.5)' : 'var(--color-border-soft)'}`,
        boxShadow: isCorrect ? '0 8px 24px rgba(110,231,160,0.14)' : isWrong ? '0 8px 24px rgba(244,139,145,0.12)' : 'none',
      }}
    >
      {/* Header: label + badges | result badge + bookmark */}
      <div className="flex items-start justify-between" style={{ gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
            {mobile ? (
              /* Phone: list index (1) · line number (2) · №-in-bank with a
                 base-type icon (3). Topic gets its own line just below. */
              <>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', minWidth: 14, textAlign: 'center' }}>{index + 1}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${palette.accent}33`, color: 'var(--color-text)' }}>
                  {task.line} {t('линия')}
                </span>
                <NumberBadge id={task.id} onCopied={onCopyId} icon={<Database size={10} strokeWidth={2.4} />} />
              </>
            ) : (
              <>
                <span style={{ fontSize: 11, fontWeight: 700, color: palette.text }}>{t('Задание')} {index + 1}</span>
                <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
                <NumberBadge id={task.id} onCopied={onCopyId} />
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${palette.accent}33`, color: 'var(--color-text)' }}>
                  {task.line} · {lineNames[task.line] ?? `${t('Линия')} ${task.line}`}
                </span>
                <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)' }}>{t('Часть')} {task.part}</span>
              </>
            )}
          </div>
          {mobile && task.topic && (
            <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.3, marginTop: -1 }}>
              <span style={{ fontWeight: 600 }}>{t('Тема:')}</span> {task.topic}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {state !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)', color: isCorrect ? 'var(--color-green-text)' : 'var(--color-red-text)', fontSize: 13, fontWeight: 700 }}>
              {isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {isCorrect ? t('Верно') : t('Неверно')}
            </div>
          )}
          <button
            onClick={() => { tap(); onFavorite(task.id) }}
            aria-label={isFav ? t('Убрать из избранного') : t('В избранное')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none',
              // Apple-style 44pt tap target on the phone; the negative margins let
              // the hit area overflow the header row without inflating its height
              // (so the title stays snug to the badges). Desktop keeps a plain 36.
              ...(mobile
                ? { width: 44, height: 44, margin: '-2px -2px -2px 0' }
                : { width: 36, height: 36 }),
            }}
          >
            <span style={{
              width: mobile ? 40 : 36, height: mobile ? 40 : 36, borderRadius: mobile ? 12 : 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isFav ? 'linear-gradient(140deg, #FFCB3D 0%, #F5A623 100%)' : 'rgba(var(--glass-rgb), 0.88)',
              border: `1px solid ${isFav ? 'transparent' : 'var(--color-border-medium)'}`,
              boxShadow: isFav ? '0 2px 9px rgba(245,166,35,0.4)' : 'none',
              transition: 'all 0.18s ease',
            }}>
              <Star size={mobile ? 15 : 16} fill={isFav ? '#fff' : 'none'} color={isFav ? '#fff' : 'var(--color-text-3)'} />
            </span>
          </button>
        </div>
      </div>

      {/* Question spans the full card width below the header row so the result
          badge (Верно/Неверно) never squeezes it into a narrower column — its
          appearance must not reflow / "push" the wrapped lines. */}
      <div lang="ru" style={{ fontSize: mobile ? 14 : 16, lineHeight: mobile ? 1.45 : 1.5, fontWeight: mobile ? 450 : 550, color: 'var(--color-text)', textAlign: mobile ? 'justify' : undefined, overflowWrap: 'break-word', marginTop: mobile ? -6 : -4 }}
        dangerouslySetInnerHTML={{ __html: bindShortWordsHtml(task.question) }} />

      {/* Image / table blocks in teacher-configured order */}
      {(task.blockOrder ?? ['image', 'table']).map(blockKey => {
        if (blockKey === 'image' && task.questionImage) return (
          <img key="image" src={task.questionImage} alt="" style={{ maxWidth: `${task.questionImageSize ?? 100}%`, borderRadius: 14, border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', display: 'block' }} />
        )
        if (blockKey === 'table' && task.questionTable) return (
          <QuestionTable key="table" table={task.questionTable} mobile={!!mobile} />
        )
        return null
      })}

      {/* Choice options */}
      {task.choices && task.choices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {task.choices.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: rowGap, padding: rowPad, borderRadius: 12, background: 'rgba(var(--glass-rgb),0.7)', border: '1px solid var(--color-border-soft)', minHeight: rowMinH }}>
              <span style={{ width: chipSz, height: chipSz, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{'АБВГДЕЖЗИК'[i]}</span>
              <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: rowTextLH }}>{c.text}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{task.answerType === 'multi' ? t('Введите буквы всех верных вариантов, напр. АБГ') : t('Введите букву верного варианта')}</div>
        </div>
      )}

      {/* Matching */}
      {task.matchLeft && task.matchRight && (() => {
        const maxLen = Math.max(task.matchLeft.length, task.matchRight.length)
        return (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Array.from({ length: maxLen }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: mobile ? 6 : 8, alignItems: 'stretch' }}>
                  {task.matchLeft![i] !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: rowGap, padding: rowPad, borderRadius: 12, background: 'rgba(var(--glass-rgb),0.7)', border: '1px solid var(--color-border-soft)', minHeight: rowMinH }}>
                      <span style={{ width: chipSz, height: chipSz, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{'АБВГДЕЖЗИК'[i]}</span>
                      <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: rowTextLH }}>{task.matchLeft![i]}</span>
                    </div>
                  ) : <div />}
                  {task.matchRight![i] !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: rowGap, padding: rowPad, borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border-soft)', minHeight: rowMinH }}>
                      <span style={{ width: chipSz, height: chipSz, borderRadius: 8, flexShrink: 0, background: 'rgba(var(--glass-rgb),0.9)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{i + 1}</span>
                      <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: rowTextLH }}>{task.matchRight![i]}</span>
                    </div>
                  ) : <div />}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>{t('Сопоставьте и введите, напр. А2 Б1 В3')}</div>
          </div>
        )
      })()}

      {/* Sequence */}
      {task.sequenceItems && task.sequenceItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...task.sequenceItems].sort((a, b) => a.localeCompare(b, 'ru')).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: rowGap, padding: rowPad, borderRadius: 12, background: 'rgba(var(--glass-rgb),0.7)', border: '1px solid var(--color-border-soft)', minHeight: rowMinH }}>
                <span style={{ width: chipSz, height: chipSz, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>{i + 1}</span>
                <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: rowTextLH }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>{t('Введите порядок цифрами, напр. 3142')}</div>
        </div>
      )}

      {/* Answer + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: mobile ? 'nowrap' : 'wrap' }}>
        {/* `layout` tweens the field's width as the Проверить button enters /
            leaves, so it smoothly makes room instead of snapping via flex. */}
        <motion.div layout transition={FIELD_MORPH} style={{ position: 'relative', flex: '1 1 140px', maxWidth: mobile ? 'none' : 210, minWidth: 0 }}>
          <input
            ref={inputRef}
            value={inputVal}
            // Locked once checked: erasing/editing a checked answer used to
            // bring "Проверить" straight back (inputVal !== state.value), so a
            // stray backspace could silently un-submit the answer. readOnly
            // keeps it visible and selectable (for copy) but not editable.
            readOnly={alreadyChecked}
            onChange={e => {
              setInputVal(e.target.value)
              const measuredWidth = measureRef.current?.offsetWidth ?? 0
              const innerWidth = (inputRef.current?.clientWidth ?? 210) - 32
              setInputOverflow(measuredWidth > innerWidth)
            }}
            onKeyDown={e => e.key === 'Enter' && inputVal.trim() && check()}
            placeholder={t('Введите ответ')}
            style={{
              width: '100%', boxSizing: 'border-box', height: answerH,
              padding: '0 16px', borderRadius: 16, fontSize: mobile ? 16 : 14, outline: 'none',
              border: `1px solid ${state ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border-medium)'}`,
              background: state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
              cursor: alreadyChecked ? 'default' : 'text',
            }}
          />
          <div style={{
            position: 'absolute', left: 1, top: 1, bottom: 1, width: 32,
            borderRadius: '15px 0 0 15px', pointerEvents: 'none',
            background: `linear-gradient(to right, ${state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)'}, transparent)`,
            opacity: inputOverflow ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }} />
          <span ref={measureRef} style={{
            position: 'absolute', visibility: 'hidden', whiteSpace: 'pre',
            fontSize: 14, fontFamily: 'inherit', pointerEvents: 'none', top: -9999,
          }}>{inputVal}</span>
        </motion.div>
        {/* popLayout: the exiting button leaves the flex flow immediately, so
            the field's `layout` grows back smoothly *during* the fade-out
            instead of snapping open only after the button fully unmounts.
            NOTE: this outer wrapper intentionally has NO `layout` prop — combining
            a size-changing child (Решение appearing after check()) with both a
            FLIP layout animation AND an entrance transform (scale/x) on the same
            element caused framer to occasionally mis-measure and collapse the
            whole row down to just the last child. The field's own `layout` above
            already makes room as this block enters/exits; Решение animates itself. */}
        <AnimatePresence mode="popLayout">
          {inputVal.trim() && (
            <motion.div
              key="task-actions"
              // Springs in from the field's edge — scales up + slides while the
              // field morphs open beside it, then reverses on exit.
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -10 }}
              transition={FIELD_MORPH}
              style={{ display: 'flex', gap: 8, alignItems: 'center', transformOrigin: 'left center' }}
            >
              {/* Hidden once the current text has been checked — only the field
                  + Решение remain. Editing the answer afterwards brings it back.
                  `layout` (not an animated `width`) drives the resize: framer's
                  FLIP measures the before/after box and animates it via a cheap
                  transform, instead of interpolating the actual `width` property
                  frame-by-frame (which has to keep re-resolving 'auto' against
                  the flex row and was the source of the jitter/lag).
                  `mode="popLayout"`: without it, the exiting Проверить stays in
                  the flex flow (reserving its full width) for its ENTIRE fade,
                  while Решение's brand-new box claims its space immediately on
                  mount — the field's own `layout` then had to react to BOTH
                  changes at different times, visibly slamming shut then
                  snapping open again. popLayout removes Проверить from flow the
                  instant it starts exiting, so both changes land together and
                  the field morphs straight to its final width in one motion. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {!alreadyChecked && (
                  <motion.button
                    layout
                    key="check-btn"
                    onClick={check}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={FIELD_MORPH}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: answerH,
                      padding: mobile ? '0 18px' : '0 22px', borderRadius: 16, overflow: 'hidden', flexShrink: 0, whiteSpace: 'nowrap',
                      background: palette.accent, color: palette.onAccent,
                      border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      boxShadow: `0 4px 14px ${palette.ring}`,
                    }}
                  >
                    <CheckCircle2 size={14} />{t('Проверить')}
                  </motion.button>
                )}
              </AnimatePresence>
              <AnimatePresence mode="popLayout" initial={false}>
                {state !== undefined && (
                  <motion.button
                    layout
                    key="solution-btn"
                    onClick={() => { tap(); setShowSolution(s => !s) }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={FIELD_MORPH}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: answerH, padding: mobile ? '0 16px' : '0 18px', borderRadius: 16,
                      background: showSolution ? palette.soft : 'rgba(var(--glass-rgb), 0.88)',
                      // Always a real 1.5px border — only its COLOR toggles (to
                      // transparent when active) — so the box never resizes by
                      // the border's own width the way `border: none` did.
                      border: `1.5px solid ${showSolution ? 'transparent' : 'var(--color-border-medium)'}`,
                      outline: 'none', overflow: 'hidden', flexShrink: 0, whiteSpace: 'nowrap',
                      // Fixed weight — toggling 500⇄700 instantly reflows the
                      // text at a different width inside a fixed-size button,
                      // which reads as the icon/label twitching sideways. Only
                      // colour now carries the active state.
                      fontSize: 13, fontWeight: 650, cursor: 'pointer', color: showSolution ? palette.text : 'var(--color-muted)',
                      transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
                    }}
                  >
                    {/* Closed eye by default; opens on tap — the glyph itself
                        now communicates the state, with a little pop/rotate
                        as it crosses over instead of an instant swap. */}
                    <span style={{ display: 'inline-flex', position: 'relative', width: 14, height: 14 }}>
                      {/* Sync (default) mode, not "wait": the new glyph starts
                          fading in immediately alongside the old one fading out
                          — a simple crossfade that doesn't depend on the exit
                          finishing first, so the swap can't get stuck. */}
                      <AnimatePresence initial={false}>
                        {showSolution ? (
                          <motion.span
                            key="open"
                            initial={{ opacity: 0, rotate: -25, scale: 0.6 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 25, scale: 0.6 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            style={{ display: 'flex', position: 'absolute', inset: 0 }}
                          >
                            <Eye size={14} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="closed"
                            initial={{ opacity: 0, rotate: 25, scale: 0.6 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: -25, scale: 0.6 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            style={{ display: 'flex', position: 'absolute', inset: 0 }}
                          >
                            <EyeOff size={14} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    {t('Решение')}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Solution block */}
      <AnimatePresence>
        {showSolution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: palette.soft, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>{t('Правильный ответ')}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{task.answer}</p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap' }}>{task.solution}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        {mobile
          ? <span style={{ flex: 1 }} />
          : <span style={{ fontSize: 11, color: 'var(--color-muted)', flex: 1 }}>{task.section} → {task.topic} · {task.source}</span>}
        <button onClick={() => setReported(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: reported ? '#C0187A' : 'var(--color-text-3)', cursor: 'pointer' }}>
          <AlertTriangle size={10} />{reported ? t('Отправлено') : t('Ошибка')}
        </button>
        <button onClick={share} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: 'var(--color-text-3)', cursor: 'pointer' }}>
          <Share2 size={10} />{copied ? t('Скопировано') : t('Поделиться')}
        </button>
      </div>
    </div>
  )
}

// ── Compact card — fits 4 per row ────────────────────────────────────────────
function CompactCard({ task, palette, favorites, onFavorite, answered, onAnswer, onCopyId, lineNames }: {
  task: Task; palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  favorites: Set<number>; onFavorite: (id: number) => void
  answered: Map<number, { value: string; correct: boolean | null }>
  onAnswer: (id: number, value: string, correct: boolean | null) => void
  onCopyId: () => void
}) {
  const t = useT()
  const [inputVal, setInputVal] = useState(answered.get(task.id)?.value ?? '')
  const [showSolution, setShowSolution] = useState(false)
  const state = answered.get(task.id)
  const isFav = favorites.has(task.id)
  const isCorrect = state?.correct === true
  const isWrong   = state?.correct === false

  function check() {
    onAnswer(task.id, inputVal, inputVal.trim().toLowerCase() === task.answer.toLowerCase())
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 18,
      background: 'rgba(var(--glass-rgb), 0.97)',
      border: `1px solid ${isCorrect ? 'rgba(110,231,160,0.5)' : isWrong ? 'rgba(244,139,145,0.45)' : 'rgba(0,0,0,0.07)'}`,
      boxShadow: isCorrect ? '0 6px 18px rgba(110,231,160,0.1)' : isWrong ? '0 6px 18px rgba(244,139,145,0.08)' : '0 4px 14px rgba(0,0,0,0.04)',
      height: '100%', boxSizing: 'border-box',
    }}>
      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <NumberBadge id={task.id} onCopied={onCopyId} />
        <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${palette.soft}99`, color: `${palette.text}cc`, border: `1px solid ${palette.soft}` }}>
          {task.line}
        </span>
      </div>

      {/* Question */}
      <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: 'var(--color-text)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: task.question }} />

      {/* Topic */}
      <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 'auto' }}>{task.topic}</span>

      {/* Answer row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && inputVal.trim() && check()}
          placeholder={t('Ответ')}
          style={{
            flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 10, fontSize: 12, outline: 'none',
            border: `1px solid ${state ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border-medium)'}`,
            background: state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
          }}
        />
        <button onClick={check} disabled={!inputVal.trim()} style={{
          padding: '7px 10px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 700,
          background: inputVal.trim() ? palette.accent : 'var(--color-bg-5)',
          color: inputVal.trim() ? palette.onAccent : 'var(--color-text-3)',
          cursor: inputVal.trim() ? 'pointer' : 'default', flexShrink: 0,
        }}>✓</button>
        <button onClick={() => state !== undefined && setShowSolution(s => !s)} style={{
          padding: '7px 8px', borderRadius: 10, border: `1px solid ${showSolution ? palette.accent : 'var(--color-border-medium)'}`,
          background: showSolution ? palette.soft : 'transparent', cursor: state !== undefined ? 'pointer' : 'default', flexShrink: 0,
          opacity: state !== undefined ? 1 : 0.35,
        }}><Eye size={12} color={showSolution ? palette.text : 'var(--color-text-3)'} /></button>
        <button onClick={() => onFavorite(task.id)} style={{
          padding: '7px 8px', borderRadius: 10, border: `1px solid ${isFav ? '#F8EF8C' : 'var(--color-border-medium)'}`,
          background: isFav ? 'var(--color-yellow-soft)' : 'transparent', cursor: 'pointer', flexShrink: 0,
        }}><Star size={12} color={isFav ? '#7A6B00' : 'var(--color-text-3)'} fill={isFav ? '#7A6B00' : 'none'} /></button>
      </div>

      {/* Solution */}
      <AnimatePresence>
        {showSolution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: palette.soft, borderRadius: 12, fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              <strong style={{ color: palette.text }}>{t('Ответ: ')}</strong>{task.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const label = t(SORT_OPTIONS.find(([v]) => v === value)?.[1] ?? 'Новые')
  // While the menu is open: swallow wheel events over the dropdown so the page
  // behind it doesn't scroll (native listener — React's wheel handler is passive
  // and can't preventDefault); but if the wheel happens anywhere else on the
  // page, gently close the menu.
  useEffect(() => {
    const el = wrapRef.current
    if (!open || !el) return
    const block = (e: WheelEvent) => e.preventDefault()
    const closeOnOutsideWheel = (e: WheelEvent) => {
      if (!el.contains(e.target as Node)) setOpen(false)
    }
    el.addEventListener('wheel', block, { passive: false })
    window.addEventListener('wheel', closeOnOutsideWheel, { capture: true, passive: true })
    return () => {
      el.removeEventListener('wheel', block)
      window.removeEventListener('wheel', closeOnOutsideWheel, { capture: true })
    }
  }, [open])
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 13px', borderRadius: 999,
          background: 'rgba(var(--glass-rgb), 0.92)',
          border: `1px solid ${open ? 'var(--color-border)' : 'var(--color-border-soft)'}`,
          boxShadow: open ? '0 0 0 3px rgba(0,0,0,0.06), var(--shadow-modal-sm)' : 'none',
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ display: 'grid', justifyItems: 'start' }}>
          {SORT_OPTIONS.map(([, lbl]) => (
            <span key={lbl} aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden' }}>{t(lbl)}</span>
          ))}
          <span style={{ gridArea: '1 / 1' }}>{label}</span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 150,
            background: 'rgba(var(--glass-rgb), 0.96)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border)', borderRadius: 14,
            boxShadow: 'var(--shadow-dropdown)', overflow: 'hidden', padding: 5,
          }}
        >
          {SORT_OPTIONS.map(([val, label]) => (
            <button
              key={val}
              onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                background: value === val ? 'var(--color-bg-5)' : 'transparent',
                fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'var(--color-bg-5)' : 'transparent' }}
            >
              {t(label)}
              {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}

// ── Status tabs with floating glass pill ─────────────────────────────────────
const STATUS_OPTIONS: [StatusFilter, string][] = [
  ['all', 'Все'],
  ['undone', 'Не решённые'],
  ['done', 'Решённые'],
]

function StatusTabs({ value, onChange, mobile, accent }: { value: StatusFilter; onChange: (v: StatusFilter) => void; mobile?: boolean; accent?: string }) {
  const t = useT()
  const pill = useFloatingPill(value)
  // Mobile: match the surrounding filter fields (like «Часть 1/2») — three
  // equal grey segments that tint to the subject accent when selected, instead
  // of the desktop floating-pill look.
  if (mobile) {
    const acc = accent ?? 'var(--color-accent)'
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {STATUS_OPTIONS.map(([val, label]) => {
          const active = value === val
          // «Все» sizes to its short label; the two long options share the rest.
          const isAll = val === 'all'
          return (
            <button
              key={val}
              onClick={() => { tactile(); onChange(val) }}
              style={{
                flex: isAll ? '0 0 auto' : '1 1 0', padding: isAll ? '11px 18px' : '11px 6px', borderRadius: 13, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                background: active ? `${acc}22` : 'var(--color-bg-input)',
                color: active ? acc : 'var(--color-muted)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t(label)}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div
      ref={pill.containerRef}
      className="inline-flex items-center"
      style={{
        position: 'relative',
        gap: 0,
        padding: 3,
        borderRadius: 999,
        background: 'rgba(var(--glass-rgb), 0.88)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {pill.pillRect && (
        <span
          style={{
            position: 'absolute',
            left: pill.pillRect.left,
            top: pill.pillRect.top,
            width: pill.pillRect.width,
            height: pill.pillRect.height,
            borderRadius: 999,
            background: 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            boxShadow: 'var(--shadow-tab-pill)',
            border: '1px solid var(--color-border-glass)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {STATUS_OPTIONS.map(([val, label]) => (
        <button
          key={val}
          ref={pill.registerItem(val)}
          onClick={() => onChange(val)}
          style={{
            position: 'relative', zIndex: 1,
            padding: '7px 14px', borderRadius: 999, border: 'none',
            background: 'transparent',
            color: value === val ? 'var(--color-text)' : 'var(--color-text-3)',
            fontSize: 12, fontWeight: value === val ? 700 : 500,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'color 0.16s ease',
          }}
        >
          <span style={{ display: 'grid', justifyItems: 'center' }}>
            <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>{t(label)}</span>
            <span style={{ gridArea: '1 / 1' }}>{t(label)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Список / Карточки ────────────────────────────────────────────────────────
// Вид одной и той же выборки, а не отдельный раздел: фильтры, поиск и предмет
// продолжают работать, меняется только подача. Поэтому переключатель стоит в
// том же ряду, что статус и сортировка, и подписан иконками — два слова в
// плотной панели ЕГЭ уже не помещаются.
function ViewTabs({ value, onChange, mobile, accent }: {
  value: 'list' | 'cards'; onChange: (v: 'list' | 'cards') => void; mobile?: boolean; accent?: string
}) {
  const t = useT()
  const acc = accent ?? 'var(--color-accent)'
  const options: ['list' | 'cards', string, typeof List][] = [
    ['list', 'Список', List],
    ['cards', 'Карточки', Layers],
  ]
  return (
    <div style={{
      display: 'flex', gap: mobile ? 8 : 2, padding: mobile ? 0 : 3, borderRadius: mobile ? 0 : 999,
      background: mobile ? 'transparent' : 'rgba(var(--glass-rgb), 0.88)',
      border: mobile ? 'none' : '1px solid var(--color-border)',
      flex: mobile ? '1 1 0' : undefined,
    }}>
      {options.map(([val, label, Icon]) => {
        const active = value === val
        return (
          <button
            key={val}
            onClick={() => { if (mobile) tactile(); onChange(val) }}
            title={t(label)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              flex: mobile ? '1 1 0' : undefined,
              padding: mobile ? '11px 6px' : '7px 12px', borderRadius: mobile ? 13 : 999,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: mobile ? 13 : 12, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
              background: active ? `${acc}22` : 'transparent',
              color: active ? acc : 'var(--color-text-3)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon size={14} /> {t(label)}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Сколько заданий выборки в стопку не попало и почему. Молчание здесь читалось
 * бы как «прогнал весь банк»: ученик листает тридцать карточек из ста сорока и
 * уверен, что закрыл тему.
 */
function DeckNote({ shown, skipped, total }: { shown: number; skipped: number; total: number }) {
  const t = useT()
  if (shown === 0) return null
  const parts: string[] = [`${t('в стопке')} ${shown} ${t('из')} ${total}`]
  if (skipped > 0) parts.push(`${skipped} ${t('с картинкой, таблицей или из части 2')}`)
  const capped = total - skipped - shown
  if (capped > 0) parts.push(`${capped} ${t('осталось на следующий заход')}`)
  return (
    <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-3)' }}>
      {parts.join(' · ')}
    </div>
  )
}

// ── Фича 1: Smart suggest — показывает линии при выборе раздела ──────────────
function SuggestBox({ section, lineNames, onPickLine, accent }: {
  section: string
  lineNames: Record<number, string>
  onPickLine: (line: string) => void
  accent: string
}) {
  const t = useT()
  const map = BIOLOGY_SECTION_LINE_MAP[section]
  if (!map || (map.lines.length === 0 && map.part2Lines.length === 0)) return null
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        marginTop: 2, padding: '10px 12px', borderRadius: 12,
        background: `${accent}22`, border: `1px solid ${accent}44`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1.2 }}>
          <Sparkles size={15} />
          {t('Рекомендуемые линии для')} «{section}»
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {map.lines.map(n => (
            <button key={n} onClick={() => onPickLine(`${n} · ${lineNames[n] ?? `Линия ${n}`}`)}
              style={{
                padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: accent, color: getContrastColor(accent),
                boxShadow: `0 2px 6px ${accent}44`,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.82' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              №{n}
            </button>
          ))}
          {map.part2Lines.map(n => (
            <button key={n} onClick={() => onPickLine(`${n} · ${lineNames[n] ?? `Линия ${n}`}`)}
              style={{
                padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                background: `${accent}33`, border: `1px solid ${accent}66`, color: accent,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}48` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accent}33` }}
            >
              №{n} · {t('Ч2')}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Stat chip — big number by default, label on hover, detail on click ───────
function StatChip({ value, label, detail, bg, border, color, active, onClick }: {
  value: number; label: string; detail?: string
  bg: string; border: string; color: string
  active: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      style={{
        flex: 1, minWidth: 0,
        padding: '10px 14px', borderRadius: 16,
        background: bg, border: `1.5px solid ${active ? color : border}`,
        boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
        cursor: 'pointer', outline: 'none',
        display: 'flex', alignItems: 'center', gap: 9,
        overflow: 'hidden', textAlign: 'left',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <motion.span
        animate={{ fontSize: hovered ? '17px' : '26px' }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={{ fontWeight: 750, color, lineHeight: 1, flexShrink: 0 }}
      >
        {value}
      </motion.span>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.3, whiteSpace: 'normal' }}>{label}</span>
            {detail && <span style={{ fontSize: 11, color, opacity: 0.68, lineHeight: 1.25 }}>{detail}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Stats bar — row of chips + expandable detail area ────────────────────────
function StatsBar({ doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong, palette, onOpenModal, onRetryWrong, onToggleFav, showFavOnly }: {
  doneCount: number; wrongCount: number; totalCount: number; favCount: number
  todayCorrect: number; todayWrong: number
  palette: ReturnType<typeof subjectTheme>
  onOpenModal: () => void; onRetryWrong: () => void
  onToggleFav: () => void; showFavOnly: boolean
}) {
  const t = useT()
  const [active, setActive] = useState<'correct' | 'today' | 'wrong' | 'fav' | null>(null)
  const toggle = (key: typeof active) => setActive(a => a === key ? null : key)
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatChip
          value={doneCount}
          label={t('Решено верно')}
          detail={`${t('из')} ${totalCount} ${t('заданий')}`}
          bg="var(--color-green-soft)"
          border="rgba(110,231,160,0.28)"
          color="var(--color-green-text)"
          active={active === 'correct'}
          onClick={() => toggle('correct')}
        />
        <StatChip
          value={todayCorrect}
          label={t('Верно сегодня')}
          detail={todayWrong > 0 ? `${todayWrong} ${t('ошибок')}` : t('отличный день!')}
          bg="rgba(139,92,246,0.10)"
          border="rgba(139,92,246,0.22)"
          color="#7c3aed"
          active={active === 'today'}
          onClick={() => toggle('today')}
        />
        <StatChip
          value={wrongCount}
          label={t('Ошибок')}
          detail={t('нажми — повторить')}
          bg="var(--color-red-soft)"
          border="rgba(244,139,145,0.28)"
          color="var(--color-red-text)"
          active={active === 'wrong'}
          onClick={() => toggle('wrong')}
        />
        <StatChip
          value={favCount}
          label={t('В избранном')}
          detail={showFavOnly ? t('скрыть остальные') : t('показать только')}
          bg="var(--color-yellow-soft, rgba(248,239,140,0.22))"
          border="rgba(248,200,50,0.3)"
          color="#7A6B00"
          active={active === 'fav' || showFavOnly}
          onClick={() => toggle('fav')}
        />
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key={active}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '12px 16px', borderRadius: 14,
              background: 'rgba(var(--glass-rgb), 0.96)',
              border: '1px solid var(--color-border-soft)',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              {active === 'correct' && (<>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Правильность')}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${totalCount ? wrongCount / totalCount * 100 : 0}%` }} transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: '#F48B91', flexShrink: 0 }} />
                  </div>
                </div>
                <button onClick={onOpenModal}
                  style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: `${palette.accent}20`, color: palette.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {t('Детали →')}
                </button>
              </>)}

              {active === 'today' && (<>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Сегодня:')}</span>
                {todayCorrect > 0 && <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700 }}>✓ {todayCorrect} {t('верно')}</span>}
                {todayWrong   > 0 && <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--color-red-soft)',   color: 'var(--color-red-text)',   fontSize: 13, fontWeight: 700 }}>✗ {todayWrong} {t('ошибок')}</span>}
                {todayCorrect === 0 && todayWrong === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Ещё не решал сегодня')}</span>}
              </>)}

              {active === 'wrong' && (<>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{wrongCount} {t('заданий с ошибкой')}</span>
                {wrongCount > 0 && (
                  <button onClick={() => { onRetryWrong(); setActive(null) }}
                    style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <XCircle size={13} />{t('Повторить ошибки')}
                  </button>
                )}
                <button onClick={onOpenModal}
                  style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {t('Полная статистика')}
                </button>
              </>)}

              {active === 'fav' && (<>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{favCount} {t('в избранном')}</span>
                <button onClick={() => { onToggleFav(); setActive(null) }}
                  style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${showFavOnly ? 'rgba(248,200,50,0.4)' : 'var(--color-border-medium)'}`, background: showFavOnly ? 'rgba(248,239,140,0.22)' : 'transparent', color: showFavOnly ? '#7A6B00' : 'var(--color-text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
                  {showFavOnly ? t('Показать все') : t('Только избранное')}
                </button>
              </>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── LS keys for trainer persistence ─────────────────────────────────────────
const LS_ANSWERED  = 'trainer_answered_v1'
const LS_FAVORITES = 'trainer_favorites_v1'

// ── Progress modal ────────────────────────────────────────────────────────────
function ProgressModal({
  tasks, answered, favorites, palette, lineNames,
  onClose, onRetryMistakes, onSimilarTasks,
}: {
  tasks: Task[]
  answered: Map<number, { value: string; correct: boolean | null; date?: string }>
  favorites: Set<number>
  palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  onClose: () => void
  onRetryMistakes: () => void
  onSimilarTasks: (lines: number[]) => void
}) {
  const t = useT()
  const today = new Date().toISOString().slice(0, 10)
  const totalCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true).length, [answered])
  const totalWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false).length, [answered])
  const todayCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true  && a.date === today).length, [answered, today])
  const todayWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false && a.date === today).length, [answered, today])

  const sectionStats = useMemo(() => {
    const s: Record<string, { correct: number; wrong: number }> = {}
    tasks.forEach(task => {
      const ans = answered.get(task.id)
      if (!ans || ans.correct === null) return
      const sec = task.section || t('Без раздела')
      if (!s[sec]) s[sec] = { correct: 0, wrong: 0 }
      ans.correct ? s[sec].correct++ : s[sec].wrong++
    })
    return Object.entries(s).sort((a, b) => (b[1].correct + b[1].wrong) - (a[1].correct + a[1].wrong))
  }, [tasks, answered])

  const wrongTasks = useMemo(() => tasks.filter(t => answered.get(t.id)?.correct === false), [tasks, answered])
  const wrongLines = useMemo(() => [...new Set(wrongTasks.map(t => t.line))], [wrongTasks])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '85dvh',
          background: 'rgba(var(--glass-rgb), 0.98)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid var(--color-border-glass)',
          borderRadius: 28, boxShadow: '0 28px 70px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 750, color: 'var(--color-text)' }}>{t('Мой прогресс')}</div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { val: totalCorrect, label: t('Верно'), bg: 'var(--color-green-soft)', border: 'rgba(110,231,160,0.3)', color: 'var(--color-green-text)' },
              { val: totalWrong,   label: t('Ошибок'), bg: 'var(--color-red-soft)',   border: 'rgba(244,139,145,0.3)', color: 'var(--color-red-text)' },
              { val: favorites.size, label: t('Избранное'), bg: `${palette.accent}18`, border: `${palette.accent}33`, color: palette.text },
            ].map(({ val, label, bg, border, color }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 14, background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 750, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color, opacity: 0.75, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {(todayCorrect > 0 || todayWrong > 0) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{t('Сегодня')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {todayCorrect > 0 && <span style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700 }}>✓ {todayCorrect} {t('верно')}</span>}
                {todayWrong   > 0 && <span style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--color-red-soft)',   color: 'var(--color-red-text)',   fontSize: 13, fontWeight: 700 }}>✗ {todayWrong} {t('ошибок')}</span>}
              </div>
            </div>
          )}

          {sectionStats.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>{t('По разделам')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {sectionStats.map(([sec, s]) => {
                  const total = s.correct + s.wrong
                  const pct = total ? s.correct / total : 0
                  return (
                    <div key={sec}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{sec}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8, color: pct === 1 ? 'var(--color-green-text)' : s.wrong > 0 ? 'var(--color-red-text)' : 'var(--color-text-3)' }}>{s.correct}/{total}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.5 }}
                          style={{ height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(s.wrong / total) * 100}%` }} transition={{ duration: 0.5 }}
                          style={{ height: '100%', background: '#F48B91', flexShrink: 0 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {wrongTasks.length > 0 && (
            <div style={{ paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('Ошибки')} ({wrongTasks.length})</div>
                <button onClick={onRetryMistakes} style={{ padding: '4px 12px', borderRadius: 999, border: 'none', background: `${palette.accent}22`, color: palette.text, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {t('Повторить все →')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {wrongTasks.slice(0, 12).map(wt => (
                  <div key={wt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 11, background: 'var(--color-red-soft)', border: '1px solid rgba(244,139,145,0.25)' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(244,139,145,0.35)', color: 'var(--color-red-text)', flexShrink: 0 }}>#{wt.id}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: wt.question.replace(/<[^>]*>/g, '').slice(0, 55) }} />
                    <span style={{ fontSize: 10, color: 'var(--color-text-3)', flexShrink: 0 }}>{t('Л.')}{wt.line}</span>
                  </div>
                ))}
                {wrongTasks.length > 12 && <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>{t('и ещё')} {wrongTasks.length - 12}…</div>}
              </div>
            </div>
          )}

          {answered.size === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-2)' }}>{t('Ещё нет решённых заданий')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 5 }}>{t('Начни отвечать — здесь появится статистика')}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {wrongTasks.length > 0 && (
          <div style={{ padding: '14px 24px 20px', flexShrink: 0, display: 'flex', gap: 8 }}>
            <button onClick={onRetryMistakes}
              style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 6px 18px ${palette.ring}` }}>
              <XCircle size={14} />{t('Повторить ошибки')}
            </button>
            {wrongLines.length > 0 && (
              <button onClick={() => onSimilarTasks(wrongLines)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: `1px solid ${palette.accent}44`, background: `${palette.accent}14`, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: palette.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Target size={14} />{t('Похожие задания')}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Mobile progress bottom sheet (replaces centered modal on phone) ────────
function MobileProgressSheet({ open, onClose, tasks, answered, favorites, palette, lineNames, onRetryMistakes, onSimilarTasks }: {
  open: boolean; onClose: () => void
  tasks: Task[]
  answered: Map<number, { value: string; correct: boolean | null; date?: string }>
  favorites: Set<number>
  palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  onRetryMistakes: () => void
  onSimilarTasks: (lines: number[]) => void
}) {
  const t = useT()
  const today = new Date().toISOString().slice(0, 10)
  const totalCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true).length, [answered])
  const totalWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false).length, [answered])
  const todayCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true  && a.date === today).length, [answered, today])
  const wrongTasks   = useMemo(() => tasks.filter(wt => answered.get(wt.id)?.correct === false), [tasks, answered])
  const wrongLines   = useMemo(() => [...new Set(wrongTasks.map(wt => wt.line))], [wrongTasks])

  const sectionStats = useMemo(() => {
    const s: Record<string, { correct: number; wrong: number }> = {}
    tasks.forEach(wt => {
      const ans = answered.get(wt.id)
      if (!ans || ans.correct === null) return
      const sec = wt.section || t('Без раздела')
      if (!s[sec]) s[sec] = { correct: 0, wrong: 0 }
      ans.correct ? s[sec].correct++ : s[sec].wrong++
    })
    return Object.entries(s).sort((a, b) => (b[1].correct + b[1].wrong) - (a[1].correct + a[1].wrong)).slice(0, 6)
  }, [tasks, answered])

  return (
    <MobileSheet open={open} onClose={onClose} title={t('Мой прогресс')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { val: totalCorrect, label: t('Верно'), bg: 'var(--color-green-soft)', color: 'var(--color-green-text)' },
            { val: totalWrong,   label: t('Ошибок'), bg: 'var(--color-red-soft)',   color: 'var(--color-red-text)' },
            { val: favorites.size, label: t('Избранное'), bg: `${palette.accent}18`, color: palette.text },
          ].map(({ val, label, bg, color }) => (
            <div key={label} style={{ padding: '10px 8px', borderRadius: 14, background: bg, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 750, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color, opacity: 0.75, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Today */}
        {todayCorrect > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--color-green-soft)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-green-text)', fontWeight: 700 }}>{t('Сегодня верно:')} {todayCorrect}</span>
          </div>
        )}

        {/* By section */}
        {sectionStats.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{t('По разделам')}</div>
            {sectionStats.map(([sec, s]) => {
              const total = s.correct + s.wrong
              const pct = total ? s.correct / total : 0
              return (
                <div key={sec}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{sec}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8, color: pct === 1 ? 'var(--color-green-text)' : s.wrong > 0 ? 'var(--color-red-text)' : 'var(--color-text-3)' }}>{s.correct}/{total}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
                    <div style={{ width: `${(s.wrong / total) * 100}%`, height: '100%', background: '#F48B91', flexShrink: 0 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        {wrongTasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
            <button onClick={onRetryMistakes}
              style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 14px ${palette.ring}` }}>
              <XCircle size={15} />{t('Повторить ошибки')} ({wrongTasks.length})
            </button>
            {wrongLines.length > 0 && (
              <button onClick={() => onSimilarTasks(wrongLines)}
                style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1px solid ${palette.accent}44`, background: `${palette.accent}14`, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: palette.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Target size={15} />{t('Похожие задания')}
              </button>
            )}
          </div>
        )}

        {answered.size === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-3)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t('Ещё нет решённых заданий')}</div>
            <div style={{ fontSize: 12 }}>{t('Начни отвечать — здесь появится статистика')}</div>
          </div>
        )}
      </div>
    </MobileSheet>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TaskBankPage() {
  const t = useT()
  const { dark } = useTheme()
  const isDesktop = useIsDesktop()
  // Same scroll-driven collapse the bottom nav uses, so the control dock drops
  // lower + shrinks in lock-step with the nav on scroll-down and springs back up
  // on scroll-up. Hook must run before the `!isDesktop` early return.
  const navCollapsed = useNavCollapse()
  // Keyboard overlap so the search dock can lift above the on-screen keyboard
  // instead of hiding behind it.
  const kbInset = useKeyboardInset()
  const [sheet, setSheet] = useState<'filters' | 'sort' | 'search' | null>(null)
  const setActivePage = useDashboard(s => s.setActivePage)
  const docked        = useDashboard(s => s.lessonScrolled)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const tasks         = useTaskBank(s => s.tasks)
  const loadTasks     = useTaskBank(s => s.load)
  useEffect(() => { loadTasks(true) }, [])

  // У языковых предметов банка заданий нет (SUBJECTS[...].hasBank === false), и
  // главное — язык так не тренируется. Раньше ученик-языковик открывал тренажёр
  // и видел задачи по генетике: список жёстко падал на биологию.
  //
  // Предмет берётся из поля курса, а не из activeSubjectId: последний — это
  // short_id курса («tmpko1»), в реестре предметов его нет никогда, поэтому
  // языковая ветка не включалась ни разу и корейский открывался банком ЕГЭ.
  // activeSubjectId остаётся запасным путём для демо-данных, где id и есть слаг.
  const activeCourse = useStudentData(s => s.subjects.find(x => x.id === activeSubjectId))
  const langSubject = getSubject(activeCourse?.subject) ?? getSubject(activeSubjectId)
  const isLangTrainer = !!langSubject?.isLanguage

  // Пока курсы не приехали, развилка «язык или банк» не решена: subjects пуст, а
  // activeSubjectId ещё стоит на стартовом 'chemistry' — то есть ЛЮБОЙ ученик на
  // первом кадре после F5 попадает в банк ЕГЭ и видит его секунду, даже если у
  // него корейский. Показываем нейтральный скелетон вместо неверного ответа.
  const dataLoaded = useStudentData(s => s.loaded)
  // Страховка от вечного скелетона: load() падает в catch только на сетевой
  // аварии, но если он всё же не доехал — через 6 с показываем что есть, лучше
  // не тот тренажёр, чем бесконечная серая заглушка.
  const [waitedTooLong, setWaitedTooLong] = useState(false)
  useEffect(() => {
    if (dataLoaded) return
    const id = setTimeout(() => setWaitedTooLong(true), 6000)
    return () => clearTimeout(id)
  }, [dataLoaded])

  // Предметы переключателя — производные от данных, а не фиксированная пара
  // «Химия | Биология». Показываем только те, по которым в банке реально есть
  // задания: ученику с одной химией второй переключатель не нужен, а ученику с
  // другим предметом пара из чужих названий просто врала.
  const bankSubjects = useMemo(() => {
    const present = new Set(tasks.map(x => x.subject))
    const list = BANK_SUBJECT_IDS.filter(id => present.has(id))
    return list.length ? list : BANK_SUBJECT_IDS
  }, [tasks])
  // Dual-layout (desktop+mobile оба в DOM) монтирует страницу дважды → дедуп по
  // короткому окну, чтобы одно открытие тренажёра давало одно событие.
  useEffect(() => {
    if (Date.now() - lastTrainerOpen > 2000) {
      lastTrainerOpen = Date.now()
      trackEvent('trainer_open')
    }
  }, [])

  const defaultSubject: Subject = (() => {
    const saved = localStorage.getItem('taskbank_subject')
    if (saved === 'biology' || saved === 'chemistry') return saved
    return activeSubjectId === 'chemistry' ? 'chemistry' : 'biology'
  })()
  const [subject, setSubject]   = useState<Subject>(defaultSubject)
  const setSubjectPersist = (s: Subject) => { localStorage.setItem('taskbank_subject', s); setSubject(s) }
  const [sections, setSections] = useState<string[]>([])
  const [topics, setTopics]     = useState<string[]>([])
  const [parts, setParts]       = useState<string[]>([])
  const [lines, setLines]       = useState<string[]>([])
  const [source, setSource]     = useState('')
  const [search, setSearch]     = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Mobile: the search circle morphs into a full-width pill spanning the whole
  // control dock; `dockW` is the measured dock width the pill grows to.
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [dockW, setDockW] = useState(0)
  const dockRef = useRef<HTMLDivElement>(null)
  const mSearchRef = useRef<HTMLInputElement>(null)
  const searchPillRef = useRef<HTMLDivElement>(null)
  // Keep `dockW` in sync with the dock's real width at all times (nav collapse
  // shrinks the icons, so a one-off measure-on-click goes stale and the pill —
  // anchored at left:0 — ends up narrower than the dock and drifts left instead
  // of centring). A ResizeObserver tracks every frame (preview has no rAF).
  useEffect(() => {
    const el = dockRef.current
    if (!el) return
    const measure = () => setDockW(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    // preventScroll: focusing the input would otherwise scroll it into view,
    // which reads as a scroll-UP and un-collapses the nav (labels pop back).
    // We want the search to open in place — whatever nav state it was in.
    if (searchExpanded) mSearchRef.current?.focus({ preventScroll: true })
    else mSearchRef.current?.blur() // dismiss keyboard so the nav slides back up
  }, [searchExpanded])
  // Tap anywhere outside the expanded pill collapses it back to a circle.
  useEffect(() => {
    if (!searchExpanded) return
    const onDown = (e: PointerEvent) => {
      if (!searchPillRef.current?.contains(e.target as Node)) setSearchExpanded(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [searchExpanded])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode]         = useState<SortMode>('newest')
  const viewMode: ViewMode = 'list'
  const [showFavOnly, setShowFavOnly]   = useState(false)
  const [showWrongOnly, setShowWrongOnly] = useState(false)
  const [wrongSimilarLines, setWrongSimilarLines] = useState<Set<number>>(new Set())
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [favorites, setFavorites]       = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]') as number[]) } catch { return new Set() }
  })
  const [answered, setAnswered] = useState<Map<number, { value: string; correct: boolean | null; date?: string }>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_ANSWERED) || '{}') as Record<string, { value: string; correct: boolean | null; date?: string }>
      return new Map(Object.entries(raw).map(([k, v]) => [Number(k), v]))
    } catch { return new Map() }
  })
  const [savedPill, setSavedPill] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Scroll-to-top button ──────────────────────────────────────────────────
  const [showScrollTop, setShowScrollTop] = useState(false)
  useEffect(() => {
    const container = document.querySelector('.dashboard-main') as HTMLElement | null
    if (!container) return
    const onScroll = () => setShowScrollTop(container.scrollTop > 350)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // ── Persist trainer progress ──────────────────────────────────────────────
  useEffect(() => {
    const obj: Record<number, { value: string; correct: boolean | null; date?: string }> = {}
    answered.forEach((v, k) => { obj[k] = v })
    try { localStorage.setItem(LS_ANSWERED, JSON.stringify(obj)) } catch {}
  }, [answered])
  useEffect(() => {
    try { localStorage.setItem(LS_FAVORITES, JSON.stringify([...favorites])) } catch {}
  }, [favorites])



  function handleCopyId() {
    setSavedPill(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedPill(false), 1800)
  }

  const palette      = subjectTheme(subject, dark)
  const curriculumVersion = useCurriculum(s => s.version) // re-render when the teacher edits the taxonomy
  const lineNames    = useMemo(() => lineNamesForSubject(subject), [subject, curriculumVersion])
  const merge        = useOptionMerger()
  const subjectTasks = useMemo(() => tasks.filter(t => t.subject === subject), [tasks, subject])
  // Options mirror the teacher's PROGRAM (curriculum), not just the tasks that
  // happen to exist — so the student sees every раздел/тема/линия/часть the
  // teacher defined. Picking Часть N then narrows them via the curriculum map.
  const baseSections = useMemo(() => {
    const all = [...new Set([...sectionsForSubject(subject), ...subjectTasks.map(t => t.section).filter(Boolean)])]
    if (!parts.length) return all.sort()
    const inPart = new Set(sectionsForParts(subject, parts))
    return all.filter(s => inPart.has(s)).sort()
  }, [subject, subjectTasks, parts, curriculumVersion])
  const sectionOptions = merge(baseSections, sectionScope(subject))
  const baseTopics   = useMemo(() => {
    const taskTopics = (sections.length ? subjectTasks.filter(t => sections.includes(t.section)) : subjectTasks).map(t => t.topic).filter(Boolean)
    return [...new Set([...topicsForSelection(subject, sections), ...taskTopics])].sort()
  }, [subject, subjectTasks, sections, curriculumVersion])
  const topicOptions = merge(baseTopics, sections.length ? sections.map(s => topicScope(subject, s)) : topicScope(subject, ''))
  // Reverse cascade: which parts the program defines within the chosen sections —
  // so a Часть with no content greys out (and auto-clears if it was selected).
  const availableParts = useMemo(() => partsForSections(subject, sections), [subject, sections, curriculumVersion])
  useEffect(() => {
    if (parts.some(p => !availableParts.includes(p as '1' | '2'))) {
      setParts(parts.filter(p => availableParts.includes(p as '1' | '2')))
    }
  }, [availableParts]) // eslint-disable-line react-hooks/exhaustive-deps
  // Lines come straight from the curriculum map for the chosen sections + parts
  // (every program line, whether or not a task exists for it yet).
  const allLines     = useMemo(() => {
    return linesForSelection(subject, sections, parts).map(n => `${n} · ${lineNames[n] ?? `Линия ${n}`}`)
  }, [subject, lineNames, sections, parts, curriculumVersion])
  const baseSources  = useMemo(() => [...new Set(tasks.map(t => t.source).filter(Boolean))].sort(), [tasks])
  const allSources   = merge(baseSources, SOURCE_SCOPE)

  function toggleFav(id: number) {
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function setAnswer(id: number, value: string, correct: boolean | null) {
    const date = new Date().toISOString().slice(0, 10)
    setAnswered(prev => new Map(prev).set(id, { value, correct, date }))
  }

  const filtered = useMemo(() => {
    // When searching, go global (all subjects); otherwise stay on the active tab
    let list = search
      ? tasks
      : tasks.filter(t => t.subject === subject)
    if (!search && sections.length) list = list.filter(t => sections.includes(t.section))
    if (!search && topics.length)   list = list.filter(t => topics.includes(t.topic))
    if (!search && parts.length)    list = list.filter(t => parts.includes(String(t.part)))
    if (!search && lines.length) {
      const lineNums = new Set(lines.map(l => Number(l.split(' · ')[0])))
      list = list.filter(t => lineNums.has(t.line))
    }
    if (!search && source)  list = list.filter(t => t.source === source)
    if (search) {
      const q = search.toLowerCase().replace(/^№/, '')
      list = list.filter(t => t.question.replace(/<[^>]*>/g, '').toLowerCase().includes(q) || String(t.id).includes(q) || t.topic.toLowerCase().includes(q))
    }
    if (statusFilter === 'done')   list = list.filter(t => answered.get(t.id)?.correct === true)
    if (statusFilter === 'undone') list = list.filter(t => !answered.get(t.id))
    if (showWrongOnly) list = list.filter(t => answered.get(t.id)?.correct === false)
    if (wrongSimilarLines.size > 0 && !search) list = list.filter(t => wrongSimilarLines.has(t.line))
    if (showFavOnly) list = list.filter(t => favorites.has(t.id))
    return [...list].sort((a, b) => {
      switch (sortMode) {
        case 'oldest':     return a.id - b.id
        case 'easy':       return a.part - b.part || b.id - a.id
        case 'hard':       return b.part - a.part || b.id - a.id
        case 'subject':    return a.subject.localeCompare(b.subject) || a.id - b.id
        case 'line':       return a.line - b.line || a.id - b.id
        default:           return b.id - a.id  // newest
      }
    })
  }, [tasks, subject, sections, topics, parts, lines, source, search, statusFilter, showFavOnly, showWrongOnly, wrongSimilarLines, answered, favorites, sortMode])

  // ── Карточки ────────────────────────────────────────────────────────────────
  //
  // Тот же отфильтрованный список, но не лентой, а стопкой: условие → ответ →
  // «знаю / не знаю». Расписания у задания банка нет (его статистика — решено
  // или нет), поэтому вердикт бинарный, а незнакомое уезжает в колоду
  // повторений и возвращается уже по SM-2 вместе со словами и ошибками.
  const [view, setView] = useState<'list' | 'cards'>('list')
  const cardTasks = useMemo(() => filtered.filter(fitsCard).slice(0, CARD_SESSION_LIMIT), [filtered])
  const cardSkipped = filtered.length - filtered.filter(fitsCard).length

  const deckSource = useMemo<DeckSource>(() => ({
    load: async () => cardTasks.map(taskToCard),
    grading: 'binary',
    judge: false,
    label: 'задание банка',
    emptyTitle: 'Карточек из этой выборки не собрать',
    emptyText: 'В стопку идут задания части 1 с коротким ответом — без картинок и таблиц. Смени фильтры или вернись к списку.',
    doneTitle: 'Стопка пройдена',
    onVerdict: (card, known) => {
      if (known) return
      captureMistake({
        ...deckOwner(), subject, source: 'trainer',
        prompt: card.prompt, answer: card.answer,
      }).catch(e => console.error('captureMistake:', e))
    },
  }), [cardTasks, subject])

  // Auto-switch subject tab when search results all belong to one subject
  useEffect(() => {
    if (!search || filtered.length === 0) return
    const subjects = new Set(filtered.map(t => t.subject))
    if (subjects.size === 1) {
      const only = [...subjects][0] as Subject
      if (only !== subject) { setSubjectPersist(only); setSections([]); setTopics([]); setLines([]) }
    }
  }, [search, filtered])

  const doneCount  = tasks.filter(t => t.subject === subject && answered.get(t.id)?.correct === true).length
  const wrongCount = tasks.filter(t => t.subject === subject && answered.get(t.id)?.correct === false).length
  const totalCount = tasks.filter(t => t.subject === subject).length
  const today = new Date().toISOString().slice(0, 10)
  const todayCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true  && a.date === today).length, [answered, today])
  const todayWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false && a.date === today).length, [answered, today])

  const updateProgress = useTrainerProgress(s => s.update)
  const openModal = useTrainerProgress(s => s.openModal)
  const setOpenModal = useTrainerProgress(s => s.setOpenModal)
  useEffect(() => {
    updateProgress({ doneCount, wrongCount, totalCount, favCount: favorites.size, todayCorrect, todayWrong, subject })
  }, [doneCount, wrongCount, totalCount, favorites.size, todayCorrect, todayWrong, subject])
  useEffect(() => {
    if (openModal) { setShowProgressModal(true); setOpenModal(false) }
  }, [openModal])

  const hasFilters = !!(sections.length || topics.length || parts.length || lines.length || source)
  const clearFilters = () => { setSections([]); setTopics([]); setParts([]); setLines([]); setSource('') }
  const resetOnSubject = () => { setSections([]); setTopics([]); setLines([]) }

  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  // ── Скелетон ────────────────────────────────────────────────────────────────
  // Строго ПЕРЕД развилкой и после всех хуков. Общая геометрия обоих тренажёров,
  // так что содержимое проявляется на месте плашек, а не сменяет чужой экран.
  if (!dataLoaded && !waitedTooLong) {
    return (
      <>
        {/* На телефоне страница монтируется без обёртки MobileScreen — верхний
            отступ под чёлку и нижний под навигацию скелетон несёт сам. */}
        <div style={isDesktop ? undefined : {
          minHeight: '100dvh', background: 'var(--color-bg)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 66px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
        }}>
          <TrainerSkeleton />
        </div>
        {!isDesktop && <MobileBottomNav />}
      </>
    )
  }

  // ── Языковой тренажёр ───────────────────────────────────────────────────────
  // Ставится ПОСЛЕ всех хуков (иначе нарушится порядок вызова) и ДО обеих вёрсток:
  // у языка своя, общая для телефона и десктопа. Банк ЕГЭ здесь не показывается
  // вовсе — его для языков просто не существует.
  if (isLangTrainer) {
    return (
      <>
        <LanguageTrainer
          lang={langSubject!.langCode ?? 'en'}
          subject={langSubject!.name}
          subjectId={langSubject!.id}
          dark={dark}
        />
        {!isDesktop && <MobileBottomNav />}
      </>
    )
  }

  // ── Mobile layout (MOBILE ONLY; desktop return below is untouched) ──────────
  // Tasks are primary (full-width list); filters/sort/search live in glass
  // circles at the bottom that open bottom-sheets (§1.2). Desktop sidebar/dock
  // never renders here.
  if (!isDesktop) {
    const activeFilters = sections.length + topics.length + parts.length + lines.length + (source ? 1 : 0)
    // Match the bottom nav's collapse motion so the dock and nav move as one.
    const DOCK_COLLAPSE = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }
    const dockCircle = (key: string, icon: ReactNode, onClick: () => void, opts: { label: string; badge?: number; active?: boolean } = { label: '' }) => (
      <motion.button
        key={key}
        whileTap={{ scale: 0.9 }}
        onClick={() => { tactile(); onClick() }}
        aria-label={opts.label}
        initial={false}
        animate={{ width: navCollapsed ? 42 : 50, height: navCollapsed ? 42 : 50 }}
        transition={DOCK_COLLAPSE}
        style={{
          ...glassCircle, position: 'relative',
          // Frosted glass: more transparent fill so the backdrop-blur reads
          // through, plus a hairline top highlight (matches the bottom nav).
          background: 'rgba(var(--glass-rgb), 0.6)',
          backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          boxShadow: 'var(--shadow-pill), inset 0 1px 0 rgba(255,255,255,0.5)',
          color: opts.active ? 'var(--color-accent)' : 'var(--color-text-2)',
        }}
      >
        {icon}
        {!!opts.badge && opts.badge > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {opts.badge}
          </span>
        )}
      </motion.button>
    )

    return (
      <>
        <MobileProgressSheet
          open={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          tasks={subjectTasks} answered={answered} favorites={favorites} palette={palette} lineNames={lineNames}
          onRetryMistakes={() => { setShowWrongOnly(true); setWrongSimilarLines(new Set()); setShowProgressModal(false) }}
          onSimilarTasks={lines => { setWrongSimilarLines(new Set(lines)); setShowWrongOnly(false); setSections([]); setLines([]); setShowProgressModal(false) }}
        />

        <MobileScreen
          topPad={74}
          scrollKey={subject}
          topZone={
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <GlassPill onClick={() => { setSubjectPersist(subject === 'biology' ? 'chemistry' : 'biology'); resetOnSubject() }}>
                <FlaskConical size={15} style={{ color: 'var(--color-accent)' }} />
                {subject === 'biology' ? t('Биология') : t('Химия')}
              </GlassPill>
              <div className="flex items-center" style={{ gap: 8 }}>
                <GlassPill>
                  <BookOpen size={14} style={{ color: 'var(--color-accent)' }} />
                  {filtered.length}
                </GlassPill>
                <MobileBell />
              </div>
            </div>
          }
        >
          {/* Переключатель вида — в потоке контента, а не в доке: док собран из
              трёх кружков с рассчитанной анимацией, четвёртый её ломает. */}
          <div style={{ display: 'flex', marginBottom: 14 }}>
            <ViewTabs value={view} onChange={setView} mobile accent={palette.accent} />
          </div>

          {view === 'cards' ? (
            <div>
              <CardDeck key={`deck-${subject}-${cardTasks.length}`} accent={palette.accent} source={deckSource} />
              <DeckNote shown={cardTasks.length} skipped={cardSkipped} total={filtered.length} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--color-text-3)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span>{t('Заданий не найдено — измените фильтры')}</span>
              <button onClick={() => { tactile(); clearFilters() }}
                style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t('Сбросить фильтры')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} palette={palette}
                  favorites={favorites} onFavorite={toggleFav}
                  answered={answered} onAnswer={setAnswer}
                  onCopyId={handleCopyId} lineNames={lineNames} mobile
                />
              ))}
            </div>
          )}
        </MobileScreen>

        {/* Control dock — glass circles, drops + shrinks with the nav on scroll.
            Outer fixed layer sits at the safe-area edge; the inner motion layer
            animates its marginBottom (numeric, so it tweens cleanly) to ride up
            over the nav when expanded and settle lower when the nav collapses. */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 65, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div
            ref={dockRef}
            initial={false}
            // Keyboard up → lift the dock to sit just above it (the nav has
            // slid away, so its clearance margin is no longer needed).
            animate={{ marginBottom: kbInset > 0 ? kbInset + 12 : (navCollapsed ? 74 : 86) }}
            transition={DOCK_COLLAPSE}
            style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', pointerEvents: 'auto' }}
          >
            {/* Invisible spacer holding the search slot; the always-mounted pill
                (below) renders the visuals so opacity is never animated on a
                blurred element — the backdrop-blur never blinks off. */}
            <motion.div initial={false} animate={{ width: navCollapsed ? 42 : 50, height: navCollapsed ? 42 : 50 }} transition={DOCK_COLLAPSE} style={{ flexShrink: 0, pointerEvents: 'none' }} />

            {/* Filter / sort / fav — on expand they scale down, blur and drift
                right while fading, staggered left→right. */}
            {[
              { k: 'filter', icon: <Filter size={20} />, onClick: () => setSheet('filters'), opts: { label: t('Фильтры'), badge: activeFilters } },
              { k: 'sort', icon: <ArrowUpDown size={20} />, onClick: () => setSheet('sort'), opts: { label: t('Сортировка') } },
              { k: 'fav', icon: <Star size={20} fill={showFavOnly ? 'currentColor' : 'none'} />, onClick: () => setShowFavOnly(f => !f), opts: { label: t('Избранное'), active: showFavOnly } },
            ].map((c, idx) => (
              <motion.div
                key={c.k}
                initial={false}
                animate={searchExpanded
                  ? { opacity: 0, scale: 0.5, x: 22 }
                  : { opacity: 1, scale: 1, x: 0 }}
                // A wrapper opacity < 1 isolates a group and suspends the child
                // circle's backdrop-filter — so ANY opacity tween (in OR out) makes
                // the frost blink (transparent-without-blur) for a frame. Fix: never
                // tween opacity through the <1 zone. Instead snap it (duration 0)
                // while the circle is HIDDEN by the search pill, and let scale+x
                // carry the visible motion (blur live the whole time).
                //  • EXPAND: hold opaque+blurred; scale/x slide the circle under the
                //    growing pill; snap opacity→0 only after the pill's edge has
                //    covered it (delay grows left→right, matching cover order).
                //  • COLLAPSE: snap opaque instantly; scale/x reveal it from under
                //    the retracting pill.
                transition={{
                  ...FIELD_MORPH,
                  delay: searchExpanded ? idx * 0.04 : (2 - idx) * 0.04,
                  opacity: searchExpanded
                    ? { delay: 0.12 + idx * 0.05, duration: 0 }
                    : { duration: 0 },
                }}
                // The exit blur lives here as a plain CSS filter that's ABSENT at
                // rest — a `filter` on this wrapper (even blur(0)) would break the
                // child circle's `backdrop-filter`, killing its background blur.
                // NO `filter` on this wrapper — ever. A `filter` (even blur(0))
                // suppresses the child circle's `backdrop-filter`, and on
                // collapse its recompute makes the frost pop in a beat after the
                // circle reappears. Opacity/scale/x alone carry the transition,
                // so the backdrop-blur is present the entire time.
                style={{ pointerEvents: searchExpanded ? 'none' : 'auto' }}
              >
                {dockCircle(c.k, c.icon, c.onClick, c.opts)}
              </motion.div>
            ))}

            {/* Search control — ALWAYS mounted at opacity 1; only its WIDTH
                morphs (circle → full dock). Fixed opacity means Chromium never
                suspends the backdrop-filter, so the frosted blur stays put
                through the whole expand/collapse instead of blinking. */}
            <motion.div
              ref={searchPillRef}
              initial={false}
              // paddingLeft is animated (not a plain style) so that if navCollapsed
              // flips mid-open — the dock lifts on expand — the 11↔15 centring
              // offset tweens smoothly instead of snapping 4px and jiggling the
              // icon. When it doesn't change, animating it is a no-op → dead still.
              animate={{ width: searchExpanded ? dockW : (navCollapsed ? 42 : 50), paddingLeft: navCollapsed ? 11 : 15 }}
              transition={FIELD_MORPH}
              onClick={() => { if (!searchExpanded) { setDockW(dockRef.current?.offsetWidth ?? 0); setSearchExpanded(true) } }}
              aria-label={t('Поиск')}
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                // Collapsed: centre the icon in the circle (no side padding, so it
                // doesn't drift as the width shrinks to 42 in the mini dock).
                // Expanded: left-align the icon with padding for the input row.
                // paddingLeft is held CONSTANT through the morph and set to the
                // value that centres the 20px icon in the collapsed circle
                // ((w-20)/2 → 11 for the 42px mini dock, 15 for the 50px dock).
                // Same value collapsed & expanded ⇒ icon is centred when collapsed
                // AND never shifts when the pill opens. Right padding stays 15 for
                // the input row.
                display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                gap: searchExpanded ? 8 : 0,
                paddingRight: 15,
                borderRadius: 999, overflow: 'hidden',
                background: 'rgba(var(--glass-rgb), 0.6)',
                backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                border: '1px solid var(--color-border-glass)',
                boxShadow: 'var(--shadow-pill), inset 0 1px 0 rgba(255,255,255,0.5)',
                cursor: searchExpanded ? 'text' : 'pointer', pointerEvents: 'auto',
                color: search ? 'var(--color-accent)' : 'var(--color-text-2)',
              }}
            >
              {/* Icon stays centred in the collapsed circle (15px padding + 20px
                  icon ≈ centred); input/✕ stay clipped until expanded. fontSize
                  16 prevents iOS auto-zoom on focus. */}
              <Search size={20} style={{ flexShrink: 0 }} />
              <input ref={mSearchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Поиск по тексту')}
                style={{ flex: searchExpanded ? 1 : 0, width: searchExpanded ? undefined : 0, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--color-text)', opacity: searchExpanded ? 1 : 0, pointerEvents: searchExpanded ? 'auto' : 'none',
                  // Soft fade on the right edge so long text/placeholder melts out
                  // before the ✕ instead of hard-clipping against the pill edge.
                  maskImage: 'linear-gradient(to right, #000 calc(100% - 18px), transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 18px), transparent)' }} />
              {searchExpanded && (
                <button onClick={e => { e.stopPropagation(); setSearch(''); setSearchExpanded(false) }} aria-label={t('Закрыть поиск')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex', flexShrink: 0, padding: 0 }}>
                  <X size={18} />
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Filters sheet */}
        <MobileSheet open={sheet === 'filters'} onClose={() => setSheet(null)} title={t('Фильтры')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MultiSelectField label={t('Раздел')} options={sectionOptions} values={sections} onChange={setSections} accent={palette.accent} accentBg={`${palette.accent}22`} />
            <MultiSelectField label={t('Тема')} options={topicOptions} values={topics} onChange={setTopics} accent={palette.accent} accentBg={`${palette.accent}22`} />
            <div style={{ display: 'flex', gap: 8 }}>
              {['1', '2'].map(p => {
                const active = parts.includes(p)
                const avail = availableParts.includes(p as '1' | '2')
                return (
                <button key={p} disabled={!avail} onClick={() => { tactile(); setParts(active ? parts.filter(x => x !== p) : [...parts, p]) }} style={{
                  flex: 1, padding: '11px 12px', borderRadius: 13, fontSize: 14, fontWeight: 600, cursor: avail ? 'pointer' : 'not-allowed',
                  background: active ? `${palette.accent}22` : 'var(--color-bg-input)',
                  border: 'none',
                  color: active ? palette.accent : 'var(--color-muted)',
                  opacity: avail ? 1 : 0.4,
                }}>
                  {t('Часть')} {p}
                </button>
              )})}
            </div>
            <MultiSelectField label={t('Линия')} options={allLines} values={lines} onChange={setLines} accent={palette.accent} accentBg={`${palette.accent}22`} />
            <FilterField label={t('Источник')} options={allSources} value={source} onChange={setSource} accent={palette.accent} />
            <StatusTabs value={statusFilter} onChange={setStatusFilter} mobile accent={palette.accent} />
            {/* Always reserve the button's slot so toggling filters doesn't
                change the sheet height (grabber would otherwise jump). */}
            <button onClick={() => { if (!hasFilters) return; tactile(); clearFilters() }}
              aria-hidden={!hasFilters} tabIndex={hasFilters ? 0 : -1}
              style={{ marginTop: 2, padding: '11px', borderRadius: 12, background: 'rgba(176,48,64,0.10)', border: 'none', fontSize: 13, color: 'var(--color-red-text)', fontWeight: 600,
                cursor: hasFilters ? 'pointer' : 'default', opacity: hasFilters ? 1 : 0, pointerEvents: hasFilters ? 'auto' : 'none', transition: 'opacity 0.15s ease' }}>
              {t('Сбросить фильтры')}
            </button>
          </div>
        </MobileSheet>

        {/* Sort sheet */}
        <MobileSheet open={sheet === 'sort'} onClose={() => setSheet(null)} title={t('Сортировка')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SORT_OPTIONS.map(([mode, label]) => (
              <button key={mode} onClick={() => { tactile(); setSortMode(mode); setSheet(null) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: sortMode === mode ? 'var(--color-purple-soft)' : 'transparent', color: sortMode === mode ? 'var(--color-accent)' : 'var(--color-text)', fontSize: 15, fontWeight: 600 }}>
                {t(label)}
                {sortMode === mode && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </MobileSheet>

        <MobileBottomNav />
      </>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>

      {/* Progress modal */}
      <AnimatePresence>
        {showProgressModal && (
          <ProgressModal
            tasks={subjectTasks}
            answered={answered}
            favorites={favorites}
            palette={palette}
            lineNames={lineNames}
            onClose={() => setShowProgressModal(false)}
            onRetryMistakes={() => { setShowWrongOnly(true); setWrongSimilarLines(new Set()); setShowProgressModal(false) }}
            onSimilarTasks={lines => { setWrongSimilarLines(new Set(lines)); setShowWrongOnly(false); setSections([]); setLines([]); setShowProgressModal(false) }}
          />
        )}
      </AnimatePresence>

      {/* Glass pill "Сохранено" */}
      <AnimatePresence>
        {savedPill && (
          <motion.div
            key="saved-pill"
            initial={{ opacity: 0, y: 16, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 999,
              background: 'rgba(var(--glass-rgb), 0.88)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: 'var(--shadow-filter)',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: 'var(--color-green-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 3px 10px rgba(42,125,79,0.35)',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{t('Сохранено в буфере')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll-to-top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, y: 20, scale: 0.82 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.88 }}
            transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={() => (document.querySelector('.dashboard-main') as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9998,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '11px 22px 11px 18px',
              borderRadius: 999,
              background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: dark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.9)',
              boxShadow: dark
                ? '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                : '0 4px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
              cursor: 'pointer', outline: 'none',
              color: 'var(--color-text)',
              fontSize: 13, fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUp size={15} strokeWidth={2.5} />
            {t('Наверх')}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Rest-state Back / title row — fades out when docked */}
      <motion.div
        className="flex items-center"
        style={{ gap: 16 }}
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => setActivePage('home')}
          className="flex items-center cursor-pointer flex-shrink-0"
          style={{ gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600 }}
        >
          <ChevronLeft size={18} />{t('Назад')}
        </motion.button>

        <h1
          className="flex-1 min-w-0 text-center"
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}
        >
          {t('Банк заданий ЕГЭ‑2026')}
        </h1>

        <div className="flex-shrink-0" style={{ width: 92 }} />
      </motion.div>

      {/* Docked twin — fixed on the topbar line, matches HomeworkFlow exactly */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="trainer-dock"
            className="flex items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ gap: 12, pointerEvents: 'none' }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActivePage('home')}
              className="flex items-center cursor-pointer flex-shrink-0"
              style={{ gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto' }}
            >
              <ChevronLeft size={18} />{t('Назад')}
            </motion.button>

            <div
              className="min-w-0 flex items-center"
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 1, padding: '9px 16px', borderRadius: 999, ...dockGlass, pointerEvents: 'auto' }}
            >
              <span className="truncate">{t('Банк заданий')} · {subject === 'biology' ? t('Биология') : t('Химия')}</span>
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── Separated layout: sticky left card + independent scrolling center ── */}
      <div className="flex flex-col lg:flex-row lg:items-start" style={{ gap: 20 }}>

        {/* Left sidebar — standalone sticky card.
            top must equal the card's natural flow offset inside the scroll pane
            (paddingTop 100 + the row's start ≈ 157px from the pane top → 57).
            If it's larger, sticky pins the card 3px BELOW its rest position, so
            it visibly twitches whenever the result list shrinks below the fold
            and the pane stops scrolling (sticky disengages back to flow). */}
        <div className="lg:sticky" style={{ top: 57, flexShrink: 0 }}>
        <aside className="flex flex-col" style={{
          width: 300, padding: 16, gap: 16,
          borderRadius: 24,
          background: 'rgba(var(--glass-rgb), 0.97)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>

          {/* Subject gradient card — clicking it toggles between biology and chemistry */}
          <div
            onClick={() => { setSubjectPersist(subject === 'biology' ? 'chemistry' : 'biology'); resetOnSubject() }}
            style={{ padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${palette.accent}cc, ${palette.text}cc)`, color: '#fff', boxShadow: `0 18px 44px ${palette.ring}`, cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
              <BookOpen size={16} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t('Тренажёр ЕГЭ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {(bankSubjects as Subject[]).map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); setSubjectPersist(s); resetOnSubject() }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: 28, padding: '0 12px', borderRadius: 999, border: '1.5px solid',
                    borderColor: subject === s ? 'var(--color-border-glass)' : 'var(--color-border-medium)',
                    background: subject === s ? 'rgba(255,255,255,0.22)' : 'transparent',
                    color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', lineHeight: 1, boxSizing: 'border-box',
                  }}>
                  {s === 'biology' ? t('Биология') : t('Химия')}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>
              {t('Отработай все линии заданий')}<br />{t('и подготовься к экзамену.')}
            </p>
          </div>

          {/* Filters card */}
          <div className="flex flex-col" style={{ padding: 16, borderRadius: 16, background: 'rgba(var(--glass-rgb), 0.94)', border: '1px solid var(--color-border-soft)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', gap: 12 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Filter size={15} style={{ color: palette.text }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Фильтры')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MultiSelectField label={t('Раздел')} options={sectionOptions} values={sections} onChange={setSections} accent={palette.accent} accentBg={`${palette.accent}22`} />
              <AnimatePresence>
                {sections.length > 0 && subject === 'biology' && (
                  <SuggestBox
                    section={sections[sections.length - 1]}
                    lineNames={lineNames}
                    onPickLine={v => { setLines(prev => prev.includes(v) ? prev : [...prev, v]) }}
                    accent={palette.accent}
                  />
                )}
              </AnimatePresence>
              <MultiSelectField label={t('Тема')} options={topicOptions} values={topics} onChange={setTopics} accent={palette.accent} accentBg={`${palette.accent}22`} />
              <div style={{ display: 'flex', gap: 6 }}>
                {['1', '2'].map(p => {
                  const active = parts.includes(p)
                  const avail = availableParts.includes(p as '1' | '2')
                  return (
                  <button key={p} disabled={!avail} onClick={() => setParts(active ? parts.filter(x => x !== p) : [...parts, p])} style={{
                    flex: 1, padding: '9px 12px', borderRadius: 13, fontSize: 13, fontWeight: 600, cursor: avail ? 'pointer' : 'not-allowed',
                    background: active ? `${palette.accent}22` : 'var(--color-bg-input)',
                    border: 'none',
                    color: active ? palette.accent : 'var(--color-muted)',
                    opacity: avail ? 1 : 0.4,
                    transition: 'all 0.15s ease',
                  }}>
                    {t('Часть')} {p}
                  </button>
                )})}
              </div>
              <MultiSelectField label={t('Линия')} options={allLines} values={lines} onChange={setLines} accent={palette.accent} accentBg={`${palette.accent}22`} />
              <FilterField label={t('Источник')} options={allSources}  value={source}  onChange={setSource} accent={palette.accent} />
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ padding: '8px 0', borderRadius: 12, background: 'rgba(176,48,64,0.10)', border: '1px solid rgba(176,48,64,0.18)', fontSize: 12, color: 'rgba(176,48,64,0.75)', cursor: 'pointer', fontWeight: 600 }}>
                {t('Сбросить фильтры')}
              </button>
            )}
          </div>

        </aside>
        </div>

        {/* Center: search + tasks */}
        <main className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 18 }}>

          {/* Controls row */}
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <div
              onClick={() => { setSearchOpen(true); searchInputRef.current?.focus(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(var(--glass-rgb), 0.96)', border: `1px solid ${searchOpen || search ? 'var(--color-accent, #7c3aed)' : 'var(--color-border-medium)'}`, borderRadius: 999, width: searchOpen || search ? 260 : 112, transition: 'width 0.22s cubic-bezier(.4,0,.2,1), border-color 0.15s', overflow: 'hidden', cursor: searchOpen || search ? 'text' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <Search size={14} style={{ color: searchOpen || search ? 'var(--color-text)' : 'var(--color-text-3)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => { if (!search) setSearchOpen(false); }}
                placeholder={searchOpen || search ? t('Поиск по тексту или №...') : t('Поиск')}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--color-text)', minWidth: 0, width: searchOpen || search ? 'auto' : 0, pointerEvents: searchOpen || search ? 'auto' : 'none' }}
              />
              {search && <button onClick={e => { e.stopPropagation(); setSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 15, lineHeight: 1, flexShrink: 0 }}>×</button>}
            </div>
            <StatusTabs value={statusFilter} onChange={setStatusFilter} />

            <ViewTabs value={view} onChange={setView} accent={palette.accent} />

            {/* Sort dropdown */}
            <SortDropdown value={sortMode} onChange={setSortMode} />

            <button onClick={() => setShowFavOnly(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 999, background: showFavOnly ? (dark ? 'rgba(248,239,140,0.18)' : 'rgba(248,239,140,0.28)') : 'rgba(var(--glass-rgb), 0.88)', border: `1px solid ${showFavOnly ? (dark ? 'rgba(248,239,140,0.45)' : 'rgba(248,239,140,0.55)') : 'var(--color-border-medium)'}`, fontSize: 12, cursor: 'pointer', color: showFavOnly ? (dark ? '#F4E97A' : '#8A7800') : 'var(--color-text-3)', fontWeight: showFavOnly ? 700 : 400 }}>
              <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
              {showFavOnly ? `${t('Избранное')} (${favorites.size})` : t('Избранное')}
            </button>


            <span style={{ marginLeft: 'auto', fontSize: 12, color: dark ? 'var(--color-text-3)' : 'var(--color-text-2)' }}>
              {t('Всего:')} {filtered.length}
            </span>

          </div>

          {/* Tasks */}
          {view === 'cards' ? (
            <div style={{ paddingTop: 8 }}>
              <CardDeck key={`deck-${subject}-${cardTasks.length}`} accent={palette.accent} source={deckSource} />
              <DeckNote shown={cardTasks.length} skipped={cardSkipped} total={filtered.length} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span>{t('Заданий не найдено — измените фильтры')}</span>
              <button onClick={clearFilters}
                style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t('Сбросить фильтры')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} palette={palette}
                  favorites={favorites} onFavorite={toggleFav}
                  answered={answered} onAnswer={setAnswer}
                  onCopyId={handleCopyId} lineNames={lineNames}
                />
              ))}
            </div>
          )}
        </main>
      </div>

    </div>
  )
}
