import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Play, ListVideo, NotebookPen, FileText,
  FolderOpen, GraduationCap, Download, ChevronDown, Calendar,
  ChevronRight, Clock, Lock, CheckCircle2, RotateCcw, Star, ALargeSmall,
} from 'lucide-react'
import ScrollFade from '../components/ScrollFade'
import { useDashboard } from '../store/dashboardStore'
import { activeTimecodeIndex, findLessonById, getLessonDetail, type LessonHomework } from '../data/lessonContent'
import { downloadLessonFile, formatFileSize, type LessonFile } from '../lib/lessonFiles'
import { useStudentData } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import LessonVideoPlayer, { PLAYER_MAX_H, PLAYER_MAX_W, type LessonVideoHandle } from '../components/LessonVideoPlayer'
import { getSubject } from '../lib/subjects'
import {
  emptyWatch, loadVideoWatch, saveVideoWatch, watchRatio, type VideoWatch,
} from '../lib/videoProgress'
import { ownerStudentIdFor } from '../store/studentDataStore'
import type { CourseReaction } from '../data/mockData'
import { EMOJI_STEPS } from '../components/HomeworkFlow'
import { useT } from '../lib/i18n'
import TheoryChecklist from '../components/TheoryChecklist'
import { parseChecklist } from '../lib/theoryChecklist'
import { tidyProse, proseWrap, balancedWrap } from '../lib/typography'
import GlossedText from '../components/GlossedText'
import { resolveSubjectPalette } from '../lib/subjects'
import { useTheme } from '../store/themeStore'
import { MOBILE_TOP_INSET } from '../lib/mobileTokens'
import { useSwipeBack } from '../lib/useSwipeBack'

/** «1 файл / 2 файла / 5 файлов». */
function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** Секунды → «17:05» или «1:03:43». Часы появляются только у длинных записей,
 *  чтобы короткий ролик не выглядел как «0:04:12». */
function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

function renderHighlightedParagraph(text: string, reactionId?: string, activeReactionId?: string | null, reactions: CourseReaction[] = []) {
  // No reaction tag — render plain text, no wrapper. Other paragraphs in the
  // conspect never need the inline-flex pill, so they stay unchanged.
  if (!reactionId) return tidyProse(text)

  const reaction = reactions.find(item => item.id === reactionId)
  if (!reaction) return tidyProse(text)

  const highlightText = reaction.equation
  // Склейку коротких слов делаем ПОСЛЕ поиска уравнения: неразрывный пробел
  // внутри текста сбил бы indexOf по исходной строке.
  const matchIndex = text.indexOf(highlightText)
  if (matchIndex === -1) return tidyProse(text)

  const before = tidyProse(text.slice(0, matchIndex))
  const after = tidyProse(text.slice(matchIndex + highlightText.length))
  const isActive = reactionId === activeReactionId

  // The wrapper span is ALWAYS rendered (with the same inline-flex + padding)
  // regardless of `isActive`. Toggling its presence used to grow/shrink the
  // line height and visibly jerk the paragraph when the highlight faded. Now
  // only the background overlay's opacity animates.
  return (
    <>
      {before}
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: 12,
          overflow: 'hidden',
          isolation: 'isolate',
          verticalAlign: 'baseline',
        }}
      >
        <motion.span
          // Key off isActive so re-opening the reaction restarts the fade-in.
          key={`${reactionId}-${isActive ? 'on' : 'off'}`}
          initial={{ opacity: isActive ? 0 : 1, scaleX: isActive ? 0.1 : 1 }}
          animate={{ opacity: isActive ? 1 : 0, scaleX: 1 }}
          transition={{
            opacity: { duration: isActive ? 0.4 : 1.2, ease: [0.22, 1, 0.36, 1] },
            scaleX: { duration: isActive ? 0.6 : 0, ease: [0.22, 1, 0.36, 1] },
          }}
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left center',
            borderRadius: 12,
            background: 'rgba(156,140,240,0.42)',
            boxShadow: 'inset 0 0 0 1px rgba(99,84,207,0.18)',
            zIndex: 0,
          }}
        />
        <span
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        >
          {highlightText}
        </span>
      </span>
      {after}
    </>
  )
}

/**
 * Ширина листа со схемой — одна на все иллюстрации урока.
 *
 * Схемы рисуются под своё содержимое: таблица из трёх колонок выходит на 320
 * px, из семи — на 680, и в конспекте они шли каждая своего размера. Рядом это
 * читается не как «разные схемы», а как «вёрстка поехала»: соседние листы
 * бумаги разной ширины, у одного буквы вдвое крупнее, чем у другого. Поэтому
 * лист всегда одной ширины, а рисунок растягивается до неё — SVG масштабируется
 * без потерь, и мелкая таблица заодно становится читаемой.
 */
const FIGURE_W = 680

/**
 * Иллюстрация конспекта — абзац, у которого задан `image`.
 *
 * Картинка нарисована как «лист бумаги» со светлым фоном (см. svgSheet.ts), в
 * тёмной теме её нельзя класть на прозрачный фон вплотную: получается яркое
 * пятно с рваным краем. Поэтому лист сидит в собственной рамке с полем.
 *
 * По клику открывается на весь экран: схемы письма и таблицы форм в ширину
 * колонки конспекта читаемы на мониторе, но не на телефоне.
 */
function TheoryFigure({ src, caption, scale = 1 }: { src: string; caption?: string; scale?: number }) {
  const [zoom, setZoom] = useState(false)
  return (
    <>
      <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => setZoom(true)}
          style={{
            padding: 10, borderRadius: 16, cursor: 'zoom-in',
            border: '1px solid var(--color-border-soft)',
            background: 'rgba(255,255,255,0.9)',
            // Лист одной ширины у всех схем урока (см. FIGURE_W), по центру
            // колонки. На узком экране его держит maxWidth: 100%.
            display: 'block', width: '100%', maxWidth: FIGURE_W, margin: '0 auto',
          }}
        >
          <img src={src} alt={caption ?? ''} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }} />
        </button>
        {caption && (
          <figcaption style={{ fontSize: 13 * scale, lineHeight: 1.5, color: 'var(--color-muted)', textAlign: 'center', ...balancedWrap }}>
            {tidyProse(caption)}
          </figcaption>
        )}
      </figure>
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setZoom(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 400, cursor: 'zoom-out',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
            }}
          >
            {/* Схема нарисована в 400–680 px и на весь экран сама не растянется:
                без явной ширины «увеличение» показывало картинку мельче, чем в
                колонке конспекта. */}
            <img
              src={src}
              alt={caption ?? ''}
              style={{ width: 'min(100%, 1000px)', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, background: '#fff' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Крупный кегль конспекта.
 *
 * ЗАЧЕМ. Урок читают и с ноутбука в метро, и с телевизора на занятии, и вдвоём
 * с экрана — 15 px хватает не всем и не всегда. Системный зум браузера тут не
 * помощник: он растягивает вместе с текстом всю сетку кабинета, и колонка
 * конспекта уезжает за край.
 *
 * ПОЧЕМУ ТУМБЛЕР, А НЕ ПОЛЗУНОК. Промежуточные ступени никто не выбирает: либо
 * «мне мелко», либо «нормально». Два состояния — одна кнопка без меню.
 *
 * Выбор живёт в localStorage: кому нужен крупный текст, нужен он в каждом
 * уроке, а не до первой перезагрузки.
 */
const BIG_TEXT_KEY = 'lesson_big_text'

function useBigText() {
  const [big, setBig] = useState(() => {
    try { return localStorage.getItem(BIG_TEXT_KEY) === '1' } catch { return false }
  })
  const toggle = () => setBig(v => {
    try { localStorage.setItem(BIG_TEXT_KEY, v ? '0' : '1') } catch { /* приватный режим — переживём */ }
    return !v
  })
  // 1.6 (15px → 24px), а не 2: двойной кегль ломает абзац на короткие обрывки
  // и читать становится хуже, чем было. Крупно, но строка ещё держится.
  return { big, scale: big ? 1.6 : 1, toggle }
}

// ── Плитки файлов урока ──────────────────────────────────────────────────────
//
// Файл настоящий: учитель загружает его в Конструкторе, он лежит в бакете
// lesson-materials, а урок хранит путь (см. lib/lessonFiles). Плитка без файла
// НЕактивна — приглушена, не нажимается, подписана «файл не прикреплён».
// Раньше все три плитки всегда выглядели рабочими и по клику отдавали PDF,
// который тут же генерировался в JS.

/** Цвет значка по расширению — чтобы pdf, doc и картинка различались взглядом. */
function fileChipGradient(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'pdf') return 'linear-gradient(135deg, #FF8A8A, #D93A3A)'
  if (ext === 'doc' || ext === 'docx' || ext === 'txt') return 'linear-gradient(135deg, #6EC6FF, #2D6BE0)'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'linear-gradient(135deg, #6EE7A0, #1E9E63)'
  if (ext === 'ppt' || ext === 'pptx') return 'linear-gradient(135deg, #FFB86E, #E07B1E)'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 'var(--grad-purple)'
  return 'linear-gradient(135deg, #A8B0C0, #6B7280)'
}

/** Метка на значке: расширение файла, а не всегда «PDF». */
function fileChipLabel(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toUpperCase() : ''
  return ext && ext.length <= 4 ? ext : 'ФАЙЛ'
}

/** Общая коробка плитки: один вид у активной и неактивной, разница — в цвете. */
function tileStyle(active: boolean, open: boolean): React.CSSProperties {
  return {
    gap: 10,
    padding: '10px 12px',
    borderRadius: 14,
    background: active ? 'rgba(var(--glass-rgb), 0.96)' : 'var(--color-bg-2)',
    border: open ? '1px solid rgba(99,84,207,0.4)' : '1px solid var(--color-border-soft)',
    boxShadow: active ? '0 2px 12px rgba(0,0,0,0.05)' : 'none',
    minHeight: 56,
    cursor: active ? 'pointer' : 'default',
    opacity: active ? 1 : 0.6,
  }
}

/** Выпадашка плитки. По умолчанию открывается ВВЕРХ: плитки стоят в самом низу
 *  урока, и список файлов, падающий вниз, уезжал за край страницы. Вниз —
 *  только когда сверху места нет (короткий урок, плитки сразу под шапкой:
 *  список тогда уезжал ЗА ВЕРХ экрана и был не виден вовсе). */
function tileDropdownStyle(up: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    ...(up ? { bottom: 'calc(100% + 8px)' } : { top: 'calc(100% + 8px)' }),
    left: 0,
    right: 0,
    zIndex: 50,
    padding: 8,
    borderRadius: 16,
    background: 'rgba(var(--glass-rgb), 0.92)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid var(--color-border-glass)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.06)',
  }
}

/** Строка файла внутри выпадашки: значок с расширением, имя, размер, скачать. */
function FileRow({ file, onDone }: { file: LessonFile; onDone: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)

  async function click() {
    if (busy) return
    setBusy(true); setErr(false)
    try {
      await downloadLessonFile(file)
      onDone()
    } catch {
      setErr(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={click}
      className="flex items-center w-full cursor-pointer"
      style={{ gap: 10, padding: 10, borderRadius: 12, border: 'none', background: 'transparent', textAlign: 'left', opacity: busy ? 0.6 : 1 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: fileChipGradient(file.name), fontSize: 9, fontWeight: 800,
          letterSpacing: '0.04em', color: '#fff',
        }}
      >
        {fileChipLabel(file.name)}
      </div>
      <span className="min-w-0" style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 550, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
        {(err || file.size > 0) && (
          <span style={{ display: 'block', fontSize: 11, color: err ? 'var(--color-red-text)' : 'var(--color-text-4)' }}>
            {err ? t('не удалось скачать') : formatFileSize(file.size)}
          </span>
        )}
      </span>
      <Download size={15} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
    </button>
  )
}

/** Рабочая тетрадь / Конспект — ровно один файл. Клик скачивает его; без файла
 *  плитка неактивна. */
function DownloadTile({ icon: Icon, label, file }: { icon: typeof NotebookPen; label: string; file?: LessonFile }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)
  const active = Boolean(file)

  async function click() {
    if (!file || busy) return
    setBusy(true); setErr(false)
    try { await downloadLessonFile(file) } catch { setErr(true) } finally { setBusy(false) }
  }

  return (
    <motion.button
      whileHover={active ? { y: -2 } : undefined}
      whileTap={active ? { scale: 0.99 } : undefined}
      disabled={!active}
      onClick={click}
      className="flex items-center w-full"
      style={{ ...tileStyle(active, false), opacity: active ? (busy ? 0.7 : 1) : 0.6 }}
      title={file?.name}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
          color: active ? 'var(--color-accent)' : 'var(--color-text-4)',
        }}
      >
        <Icon size={16} strokeWidth={1.9} />
      </div>
      <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
        <p style={{ fontSize: 13, fontWeight: 650, color: active ? 'var(--color-text)' : 'var(--color-text-3)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
        <p style={{ fontSize: 11, color: err ? 'var(--color-red-text)' : 'var(--color-text-4)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {!active ? t('файл не прикреплён')
            : err ? t('не удалось скачать')
            : busy ? t('загружаем…')
            : [fileChipLabel(file!.name), formatFileSize(file!.size), t('скачать')].filter(Boolean).join(' · ')}
        </p>
      </div>
      {active && <Download size={15} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
    </motion.button>
  )
}

/** «Материалы» — список справочных файлов в выпадашке. Без файлов неактивна. */
function MaterialsTile({ materials }: { materials: LessonFile[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const active = materials.length > 0

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Куда открывать список: считаем ПЕРЕД показом, по месту над плиткой.
  function toggle() {
    if (!active) return
    if (!open) {
      const top = ref.current?.getBoundingClientRect().top ?? 0
      const need = Math.min(300, materials.length * 52 + 16) + 16
      // Вверх — по умолчанию; вниз только когда ТОЧНО померили и места нет.
      // 100px — высота плавающей шапки, под неё список тоже прятать нельзя.
      // Нулевой top (элемент ещё не в потоке) не считаем за «места нет»:
      // иначе список падал бы вниз именно там, где просили вверх.
      setUp(!(top > 0 && top - 100 < need))
    }
    setOpen(o => !o)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={active ? { y: -2 } : undefined}
        whileTap={active ? { scale: 0.99 } : undefined}
        disabled={!active}
        onClick={toggle}
        className="flex items-center w-full"
        style={tileStyle(active, open)}
      >
        <div
          style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
            color: active ? 'var(--color-accent)' : 'var(--color-text-4)',
          }}
        >
          <FolderOpen size={16} strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 13, fontWeight: 650, color: active ? 'var(--color-text)' : 'var(--color-text-3)', lineHeight: 1.15 }}>{t('Материалы')}</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-4)', marginTop: 1 }}>
            {active ? `${materials.length} ${plural(materials.length, t('файл'), t('файла'), t('файлов'))}` : t('файлы не прикреплены')}
          </p>
        </div>
        {active && (
          <ChevronDown
            size={15}
            style={{ color: 'var(--color-text-4)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: up ? 8 : -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={tileDropdownStyle(up)}
          >
            <ScrollFade maxHeight={300} bg="rgba(var(--glass-rgb), 0.92)" overlayScrollbar>
              {materials.map(m => (
                <FileRow key={m.id} file={m} onDone={() => setOpen(false)} />
              ))}
            </ScrollFade>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Reads persisted homework progress to decide whether the hard level is
// unlocked. Mirrors the score logic in HomeworkFlow (basic completed + score
// at or above the recommendation threshold).
function readBasicProgress(lessonId: string, homework: LessonHomework): { unlocked: boolean; score: number } {
  const questions = homework.levels.find(l => l.id === 'basic')?.questions ?? []
  if (questions.length === 0) return { unlocked: false, score: 0 }
  try {
    const raw = window.localStorage.getItem(`student-dashboard:homework:${lessonId}`)
    if (!raw) return { unlocked: false, score: 0 }
    const answers = (JSON.parse(raw)?.basicAnswers ?? {}) as Record<string, string>
    const answered = questions.filter(q => answers[q.id]).length
    const correct = questions.filter(q => answers[q.id] === q.correctOptionId).length
    const score = Math.round((correct / questions.length) * 100)
    const completed = answered === questions.length
    return { unlocked: completed && score >= homework.recommendationScore, score }
  } catch {
    return { unlocked: false, score: 0 }
  }
}

function HomeworkCard({ lessonId, homework, onOpen }: { lessonId: string; homework: LessonHomework; onOpen: () => void }) {
  const t = useT()
  const [{ unlocked, score }, setProgress] = useState(() => readBasicProgress(lessonId, homework))
  const assessment = useDashboard(s => s.lessonAssessments[lessonId])
  // Which row is hovered, if any. The hovered row becomes the highlighted white
  // card and the other collapses to a purple strip.
  const [hovered, setHovered] = useState<'base' | 'hard' | null>(null)

  // Re-read progress whenever the card is shown for a (possibly) different
  // lesson — the score lives in localStorage, updated by HomeworkFlow.
  useEffect(() => {
    setProgress(readBasicProgress(lessonId, homework))
  }, [lessonId, homework])

  // "Домашка" is always the default highlighted row — the hard level only
  // becomes available (unlocked) after 80+, but never auto-steals the highlight.
  // Hovering an openable row promotes it to the white card, except hovering a
  // locked hard row leaves the homework highlight untouched.
  const basicSubmitted = !!assessment
  // hasHardLevel === false → у ДЗ нет сложных заданий, строку «Сложный уровень»
  // не показываем вообще (иначе она ведёт в пустой уровень).
  const hasHardLevel = homework.hasHardLevel !== false
  const hardUnlocked = hasHardLevel && (unlocked || (assessment?.score != null && assessment.score >= 80) || !!assessment?.hardAvailable)

  const defaultActive: 'base' | 'hard' | null = basicSubmitted
    ? (hardUnlocked ? 'hard' : null)
    : 'base'
  const active: 'base' | 'hard' | null =
    hovered && !(hovered === 'hard' && !hardUnlocked) ? hovered : defaultActive
  const hardStatus = hasHardLevel ? assessment?.hardStatus : undefined

  const hardIcon = hardStatus === 'completed' ? CheckCircle2
    : hardStatus ? GraduationCap
    : hardUnlocked ? GraduationCap : Lock
  const hardIconSize = (!hardUnlocked && !hardStatus) ? 18 : 20

  const rows = [
    { id: 'base' as const, icon: GraduationCap, iconSize: 20, title: t('Домашка') },
    ...(hardUnlocked || hardStatus ? [{ id: 'hard' as const, icon: hardIcon, iconSize: hardIconSize, title: t('Сложный уровень') }] : []),
  ]
  const basicEstimatedTime = homework.levels.find(level => level.id === 'basic')?.estimatedMinutes
  // Только базовая домашка → в карточке одна строка, и она должна ровно
  // совпадать по высоте с плитками материалов (56px), иначе ряд едет.
  const singleRow = rows.length === 1

  const hardStatusLabel =
    hardStatus === 'submitted' ? { icon: Clock,     text: t('На проверке'), color: 'var(--color-peach-text)' } :
    hardStatus === 'returned'  ? { icon: RotateCcw, text: t('Возвращён'),   color: 'var(--color-yellow-text)' } :
    hardStatus === 'completed' ? { icon: Star,      text: t('Сдан'),        color: 'var(--color-green-text)' } :
    null

  return (
    <div
      className="flex flex-col"
      style={{
        position: 'relative',
        height: singleRow ? 56 : undefined,
        minHeight: singleRow ? 56 : 92,
        padding: singleRow ? 5 : 8,
        gap: 6,
        borderRadius: singleRow ? 16 : 20,
        background: 'var(--grad-purple)',
        boxShadow: '0 12px 28px rgba(123,97,255,0.28)',
      }}
    >
      {rows.map(({ id, icon: Icon, iconSize, title }) => {
        const isActive = active === id
        const locked = id === 'hard' && !hardUnlocked && !hardStatus
        const solidWhite = isActive && !locked
        const faintWash = (locked && hovered === id) || (id === 'base' && (unlocked || basicSubmitted) && hovered === 'base')
        const hasExtra = (id === 'base' && basicSubmitted) || (id === 'hard' && !!hardStatusLabel)
        return (
          <motion.button
            key={id}
            whileTap={locked ? undefined : { scale: 0.99 }}
            onClick={() => { if (!locked) onOpen() }}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center w-full"
            style={{
              height: singleRow ? '100%' : isActive ? 46 : hasExtra ? 40 : 24,
              flexShrink: 0,
              gap: 12,
              padding: singleRow ? '0 13px' : '0 16px',
              borderRadius: 12,
              border: 'none',
              textAlign: 'left',
              cursor: locked ? 'not-allowed' : 'pointer',
              background: solidWhite ? 'var(--color-surface)' : faintWash ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: solidWhite ? 'var(--color-text)' : '#fff',
              boxShadow: solidWhite ? '0 2px 12px rgba(0,0,0,0.10)' : 'none',
              transition: 'background 0.22s ease, box-shadow 0.22s ease, color 0.22s ease, height 0.22s ease',
            }}
          >
            <Icon size={iconSize} strokeWidth={1.9} style={{ flexShrink: 0 }} />
            <span className="flex-1 min-w-0" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </span>
            {id === 'base' && basicSubmitted && (
              <span
                className="inline-flex items-center"
                style={{
                  gap: 4,
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: solidWhite ? 'var(--color-accent)' : 'rgba(255,255,255,0.92)',
                  background: solidWhite ? 'rgba(99,84,207,0.10)' : 'rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  padding: '2px 7px',
                }}
              >
                {assessment.score}
              </span>
            )}
            {id === 'base' && !basicSubmitted && basicEstimatedTime != null && solidWhite && (
              <span
                className="inline-flex items-center"
                style={{ gap: 4, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}
              >
                <Clock size={13} />
                ~{basicEstimatedTime} {t('мин')}
              </span>
            )}
            {id === 'base' && !basicSubmitted && (unlocked || basicSubmitted) && !isActive && (
              <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.85 }} />
            )}
            {id === 'hard' && hardStatusLabel && (
              <span
                className="inline-flex items-center"
                style={{
                  gap: 4,
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: solidWhite ? hardStatusLabel.color : 'rgba(255,255,255,0.92)',
                  background: solidWhite ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  padding: '2px 7px',
                }}
              >
                <hardStatusLabel.icon size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                {hardStatusLabel.text}
              </span>
            )}
            {isActive && !locked && <ChevronRight size={20} style={{ flexShrink: 0 }} />}
          </motion.button>
        )
      })}

      <AnimatePresence>
        {!unlocked && hovered === 'hard' && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 60,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(22,14,44,0.94)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 14px 34px rgba(0,0,0,0.30)',
              color: '#fff',
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
              <Lock size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t('Сложный уровень')}</span>
            </div>
            <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'rgba(255,255,255,0.82)' }}>
              {t('Задание с проверкой преподавателем. Откроется, когда сдашь базовый уровень на')} {homework.recommendationScore}+ {t('баллов.')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LessonPage() {
  const t = useT()
  const isDesktop = useIsDesktop()
  const courseReactions = useStudentData(s => s.courseReactions)
  // Курсы ученика — по ним урок узнаёт свой предмет (lesson.subject хранит
  // short_id курса, а не название предмета).
  const courses = useStudentData(s => s.subjects)
  const currentLessonId = useDashboard(s => s.currentLessonId)
  const closeLesson = useDashboard(s => s.closeLesson)
  // Свайп от левого края = кнопка «Назад» (жест живёт только на тач-экранах).
  useSwipeBack(closeLesson, !isDesktop)
  const openHomework = useDashboard(s => s.openHomework)
  const highlightReactionId = useDashboard(s => s.highlightReactionId)
  const clearHighlightReaction = useDashboard(s => s.clearHighlightReaction)
  // When the page is scrolled, the Back/title/date row docks onto the topbar
  // line (sticky), the title slides left next to Back, the date stays right.
  const docked = useDashboard(s => s.lessonScrolled)
  // When the top bar is mini there's room for the full date + icon; when it's
  // expanded the row is tight, so the docked date collapses to just the day.
  const topBarCompact = useDashboard(s => s.topBarCompact)
  // Viewport edges of the centred top bar, reported by the Sidebar — lets the
  // docked title cap its width so it keeps a gap to the bar instead of sliding
  // under it.
  const topBarBox = useDashboard(s => s.topBarBox)

  const { big, scale, toggle: toggleBig } = useBigText()
  // Палитра предмета для разбора слов в конспекте — литеральным цветом, а не
  // переменной темы: подсветка слова строится конкатенацией (`${accent}22`).
  const { dark } = useTheme()

  const [activeChapter, setActiveChapter] = useState(0)
  // Позиция и длина ролика приходят из плеера раз в секунду: по ним живут часы
  // в шапке таймкодов и полоска проигранного внутри активной главы.
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const playerRef = useRef<LessonVideoHandle>(null)
  // Скролл-контейнер списка таймкодов и его строки — чтобы подсветка, уехавшая
  // вниз вместе с воспроизведением, сама подтягивалась в видимую часть.
  const chapterListRef = useRef<HTMLDivElement>(null)
  const chapterRowRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  // Queue a one-shot reaction highlight locally so it survives clearing the
  // global navigation flag in the store.
  const [queuedHighlight, setQueuedHighlight] = useState<string | null>(null)
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null)
  const paragraphRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // The docked title pill caps its width to stop 20px short of the centred top
  // bar's left edge — the same gap the widget pill keeps on the bar's right.
  const dockTitleRef = useRef<HTMLDivElement>(null)
  const [dockTitleMax, setDockTitleMax] = useState<number | undefined>(undefined)

  const lesson = currentLessonId ? findLessonById(currentLessonId) : null

  // ── Прогресс просмотра записи ─────────────────────────────────────────────
  // Приезжает из lesson_progress (строка `video-<урок>`) и уходит обратно
  // порциями: плеер зовёт onPersist раз в десять секунд, на паузе и на выходе.
  const [watch, setWatch] = useState<VideoWatch>(emptyWatch)
  const lessonKey = lesson?.id
  const lessonSubject = lesson?.subject
  useEffect(() => {
    if (!lessonKey) return
    let alive = true
    setWatch(emptyWatch())
    loadVideoWatch(ownerStudentIdFor(lessonSubject), lessonKey).then(w => { if (alive) setWatch(w) })
    return () => { alive = false }
  }, [lessonKey, lessonSubject])

  const persistWatch = useCallback((next: VideoWatch) => {
    setWatch(next)
    if (!lessonKey || !lessonSubject) return
    void saveVideoWatch(ownerStudentIdFor(lessonSubject), lessonKey, lessonSubject, next)
  }, [lessonKey, lessonSubject])

  useEffect(() => {
    if (!highlightReactionId) return
    setQueuedHighlight(highlightReactionId)
    clearHighlightReaction()
  }, [highlightReactionId, clearHighlightReaction])

  // When the page opens from the reactions widget, first scroll the paragraph
  // into view, then run a short 2s inline highlight animation on the formula.
  useEffect(() => {
    if (!queuedHighlight) return
    const id = queuedHighlight
    const scroll = setTimeout(() => {
      const el = paragraphRefs.current[id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)

    // Let smooth scrolling settle, then start the fill animation. Remove the
    // highlight completely right after the 2s animation ends.
    const show = setTimeout(() => setPendingHighlight(id), 420)
    const hide = setTimeout(() => {
      setPendingHighlight(null)
      setQueuedHighlight(null)
    }, 2420)
    return () => {
      clearTimeout(scroll)
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [queuedHighlight, currentLessonId])
  // Cap the docked title so its right edge stays 20px clear of the top bar. The
  // pill is left-anchored (after the fixed-width Back button), so its left edge
  // doesn't move when the width is clamped — the measurement converges in one
  // pass. Recomputed whenever the bar's box, title, or dock state changes.
  useLayoutEffect(() => {
    if (!docked || !topBarBox) { setDockTitleMax(undefined); return }
    const el = dockTitleRef.current
    if (!el) return
    const GAP = 10 // keep the truncated title ~10px clear of the expanded bar
    const left = el.getBoundingClientRect().left
    setDockTitleMax(Math.max(0, topBarBox.left - GAP - left))
  }, [docked, topBarBox, topBarCompact, currentLessonId])

  // Досюда доходят только с найденным уроком: пока курсы едут из Supabase,
  // страницу вообще не монтируют (см. LessonLoading в DashboardPage). Так и
  // должно быть — ниже по файлу есть хуки, и «уже нашёлся» посреди жизни
  // компонента сломало бы их порядок.
  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 300, color: 'var(--color-muted)' }}>
        <p style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>{t('Урок не найден')}</p>
        <button
          onClick={closeLesson}
          style={{ marginTop: 12, padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--color-text)', color: '#fff', fontSize: 13, fontWeight: 600 }}
        >
          {t('Назад')}
        </button>
      </div>
    )
  }

  const detail = getLessonDetail(lesson)
  const videoSource = detail.videoSource

  const timecodes = detail.timecodes
  // Плеер открыт и уже знает длину ролика — с этого момента показываем часы и
  // полоску проигранного.
  const playing = videoDuration > 0

  // ── Подсветка главы идёт за плеером ───────────────────────────────────────
  // Активна та глава, чьё начало последним осталось позади. Ученик может
  // перематывать нашей шкалой — панель обязана показывать то же место, а не
  // главу, по которой когда-то кликнули. Плеер зовёт это раз в секунду.
  const onPlayerTime = (sec: number, dur: number) => {
    setVideoTime(sec)
    setVideoDuration(prev => (Math.abs(prev - dur) < 0.5 ? prev : dur))
    if (!timecodes.length) return
    const next = activeTimecodeIndex(timecodes, sec)
    setActiveChapter(prev => (prev === next ? prev : next))
  }

  // Предмет урока для плашки на заставке. `lesson.subject` — это short_id курса,
  // а не предмет (см. Subject.subject в mockData): раньше здесь стояло
  // «biology ? Биология : Химия», и корейский урок подписывался химией.
  // Запасной путь по `lesson.subject` — для демо-данных и старых курсов, где
  // предмет не проставлен, а short_id и есть слаг ('chemistry'): тот же приём,
  // что в trainerSubject.ts. Не опознали предмет — плашки просто нет.
  const courseSubject = courses.find(c => c.id === lesson.subject)?.subject
  const subjectDef = getSubject(courseSubject) ?? getSubject(lesson.subject)

  // ── Разбор слов прямо в конспекте ────────────────────────────────────────
  //
  // В языковом уроке правило объясняется по-русски, но сами формы — 이에요,
  // 받침, ~(으)면 — стоят в тексте как есть. До сих пор ученик мог их только
  // разглядывать: перевод и чтение лежали в заданиях, то есть ПОСЛЕ конспекта.
  // Читать правило, не зная, как звучит то, о чём оно, и переходить к заданиям
  // с этим — ровно то место, где курс теряют.
  //
  // Поэтому конспект показывается тем же разбором, что и тексты чтения: тап по
  // корейскому слову — перевод, транскрипция, озвучка и «В словарь». Русские
  // слова кликабельными не становятся — их отсекает сам разбор (см. SCRIPT
  // в lib/lexicon.ts), так что абзац не превращается в сплошную ссылку.
  //
  // Родные предметы (русский, литература) сюда не попадают: разбирать по словам
  // родной язык незачем.
  const glossLang = subjectDef?.isLanguage && !subjectDef.native ? subjectDef.langCode : undefined
  const glossAccent = resolveSubjectPalette(subjectDef?.id, dark).accent
  const videoBadge = subjectDef ? `${subjectDef.icon} ${t(subjectDef.name)}` : undefined

  const watchedPct = Math.round(watchRatio({ ...watch, duration: videoDuration || watch.duration }) * 100)

  // Подтянуть активную строку в видимую часть списка. Скроллим сам контейнер, а
  // не через scrollIntoView: тот тянет за собой и страницу целиком.
  useEffect(() => {
    if (!playing) return
    const list = chapterListRef.current
    const row = chapterRowRefs.current[activeChapter]
    if (!list || !row) return
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    if (top < list.scrollTop) list.scrollTo({ top, behavior: 'smooth' })
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' })
    }
  }, [activeChapter, playing])

  // Easing for the date chip's icon/month collapse — matches the top bar's own
  // expand/collapse curve so the two move in sync.
  const dateMorph = { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const }

  // Shared glass recipe for the docked top-line pills — matched exactly to the
  // compact top bar (same opacity, border, shadow) so every floating surface on
  // the scrolled lesson reads as one consistent piece of glass.
  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  return (
    // paddingBottom — воздух под последним рядом карточек: чтобы страница
    // домотывалась с запасом и выпадающие списки плиток не упирались в край.
    <div className="flex flex-col" style={{ gap: 18, paddingBottom: isDesktop ? 72 : 24 }}>
      {/* Rest-state Back / title / date row — in the scroll flow below the
          topbar. Fades out as the page docks; its docked twin is the fixed bar
          below, which sits ON the topbar line so nothing slides under blur. */}
      <motion.div
        className="flex items-center"
        style={{ gap: 16 }}
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={closeLesson}
          aria-label={t('Назад')}
          className="flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{
            gap: 4, padding: isDesktop ? '9px 16px 9px 12px' : 9, borderRadius: 999, border: '1px solid var(--color-border-soft)',
            background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 600,
          }}
        >
          <ChevronLeft size={18} />
          {isDesktop && t('Назад')}
        </motion.button>

        <h1
          className="flex-1 min-w-0 truncate text-center"
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}
        >
          {t('Занятие')} #{lesson.number + 1} {lesson.title}
        </h1>

        <div
          className="flex items-center flex-shrink-0"
          style={{
            gap: 6, padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
            background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: 'var(--color-muted)', fontSize: 14, fontWeight: 600,
          }}
        >
          <Calendar size={15} />
          {detail.date}
        </div>
      </motion.div>

      {/* Docked twin — fixed at the topbar line, escaping the scroll
          container's top padding so it sits ON the topbar row (mini topbar
          centred between Back+title on the left and the date on the right).
          Glass pills to match the topbar; fades / slides in on scroll. */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: isDesktop ? 30 : MOBILE_TOP_INSET, left: isDesktop ? 32 : 16, right: isDesktop ? 32 : 16, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="lesson-dock"
            className="flex items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ gap: 12, pointerEvents: 'none' }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={closeLesson}
              aria-label={t('Назад')}
              className="flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{
                gap: 4, padding: isDesktop ? '9px 16px 9px 12px' : 9, borderRadius: 999,
                ...dockGlass,
                color: 'var(--color-text)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
              }}
            >
              <ChevronLeft size={18} />
              {isDesktop && t('Назад')}
            </motion.button>

            <div
              ref={dockTitleRef}
              className="min-w-0 truncate"
              style={{
                fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 1,
                maxWidth: dockTitleMax,
                padding: '9px 16px', borderRadius: 999,
                ...dockGlass, pointerEvents: 'auto',
              }}
            >
              {lesson.title}
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />

            {/* Mini top bar → full date + calendar icon. Expanded top bar →
                the row is tight, so the icon and ".month" smoothly collapse to
                zero width, leaving just the day number. The chip's own width
                follows its content per-frame, so it glides between the two. */}
            <div
              className="flex items-center flex-shrink-0"
              style={{
                overflow: 'hidden',
                padding: '9px 14px', borderRadius: 999,
                ...dockGlass,
                color: 'var(--color-muted)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
              }}
            >
              <motion.span
                initial={false}
                animate={{ width: topBarCompact ? 15 : 0, marginRight: topBarCompact ? 6 : 0, opacity: topBarCompact ? 1 : 0 }}
                transition={dateMorph}
                style={{ display: 'inline-flex', overflow: 'hidden', flexShrink: 0 }}
              >
                <Calendar size={15} />
              </motion.span>
              <span style={{ whiteSpace: 'nowrap' }}>{detail.date.split('.')[0]}</span>
              <motion.span
                initial={false}
                animate={{ width: topBarCompact ? 'auto' : 0, opacity: topBarCompact ? 1 : 0 }}
                transition={dateMorph}
                style={{ display: 'inline-block', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                .{detail.date.split('.')[1]}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── Row 1: video + timecodes — only when recording exists ──
          Колонка справа появляется только у урока со своими таймкодами: пустой
          рамке с чужими главами там делать нечего, видео занимает всю ширину. */}
      {videoSource && (
        <div
          className={timecodes.length ? 'grid lg:grid-cols-[minmax(0,1fr)_320px] items-stretch' : 'grid'}
          style={{ gap: 16 }}
        >
          {/* Плеер: свой корпус поверх YouTube/RuTube/файла + учёт просмотра.
              Ширину колонки ограничиваем ровно там, где 16:9 упирается в
              потолок высоты (PLAYER_MAX_W) — иначе на широком мониторе видео
              растянулось бы в полосу. Без панели справа колонка встаёт по
              центру; с панелью она прижата к ней, чтобы зазор между видео и
              списком глав оставался тем же, что и всюду в сетке. */}
          <div
            className="flex flex-col min-w-0"
            style={{ gap: 10, width: '100%', maxWidth: PLAYER_MAX_W, marginInline: timecodes.length ? 'auto 0' : 'auto' }}
          >
            <LessonVideoPlayer
              key={lesson.id}
              ref={playerRef}
              source={videoSource}
              title={lesson.title}
              badge={videoBadge}
              durationLabel={detail.duration}
              timecodes={timecodes}
              initialWatch={watch}
              onPersist={persistWatch}
              onTime={onPlayerTime}
            />

            {/* Сколько записи реально отсмотрено. Перемотка в конец сюда не
                попадает — считаются только отрезки, пройденные воспроизведением. */}
            {(watchedPct > 0 || watch.completed) && (
              <div className="flex items-center" style={{ gap: 10 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--color-bg)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%', width: `${Math.max(2, watchedPct)}%`, borderRadius: 999,
                      background: watch.completed ? 'var(--color-success, #1DB97D)' : 'var(--grad-purple)',
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
                <span
                  className="flex items-center flex-shrink-0"
                  style={{ gap: 5, fontSize: 12.5, fontWeight: 650, color: watch.completed ? 'var(--color-success, #1DB97D)' : 'var(--color-text-3)' }}
                >
                  {watch.completed
                    ? <><CheckCircle2 size={14} /> {t('Запись просмотрена')}</>
                    : <>{t('Просмотрено')} {watchedPct}%</>}
                </span>
              </div>
            )}
          </div>

          {/* Timecodes panel.
              Высоту ряда задаёт только видео — у него честные 16:9, и подстроить
              его под список глав нельзя. Поэтому рядом с видео (от lg) панель
              вынута из потока в absolute: сорок глав больше не растягивают ряд,
              а просто прокручиваются внутри. Ниже lg панель встаёт отдельной
              строкой под видео и живёт своей высотой, ограниченной сверху. */}
          {timecodes.length > 0 && (
          <div className="relative min-w-0">
          <div
            className="flex flex-col lg:absolute lg:inset-0"
            style={{
              borderRadius: 24,
              background: 'rgba(var(--glass-rgb), 0.96)',
              border: '1px solid var(--color-border-soft)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              padding: 16,
              gap: 6,
              minHeight: 0,
              maxHeight: PLAYER_MAX_H,
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
              <ListVideo size={17} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Таймкоды')}</span>
              <span style={{ flex: 1 }} />
              {/* Позиция ролика прямо в шапке — видно, что список и плеер об
                  одном и том же, даже когда глава длинная. */}
              {playing && (
                <span
                  style={{
                    fontSize: 11.5, fontWeight: 650, fontVariantNumeric: 'tabular-nums',
                    color: 'var(--color-text-3)', flexShrink: 0,
                  }}
                >
                  {formatClock(videoTime)} / {formatClock(videoDuration)}
                </span>
              )}
            </div>
            <div ref={chapterListRef} className="flex flex-col flex-1" style={{ gap: 2, overflowY: 'auto', minHeight: 0, paddingRight: 10 }}>
              {timecodes.map((tc, i) => {
                const active = i === activeChapter
                // Глава кончается там, где начинается следующая; последняя — на
                // конце ролика, длину которого знает плеер.
                const end = timecodes[i + 1]?.seconds ?? videoDuration
                const span = end - tc.seconds
                const played = active && playing && span > 0
                  ? Math.min(1, Math.max(0, (videoTime - tc.seconds) / span))
                  : 0
                return (
                  <button
                    key={`${tc.time}-${i}`}
                    ref={el => { chapterRowRefs.current[i] = el }}
                    onClick={() => { setActiveChapter(i); playerRef.current?.playFrom(tc.seconds) }}
                    className="relative flex items-center cursor-pointer text-left"
                    style={{
                      gap: 10, padding: '9px 10px', borderRadius: 12, border: 'none',
                      background: active ? 'var(--color-purple-soft)' : 'transparent',
                      transition: 'background 0.15s ease', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span
                      style={{
                        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: active ? 'var(--color-accent)' : 'var(--color-text-3)', minWidth: 42, flexShrink: 0,
                      }}
                    >
                      {tc.time}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? 'var(--color-text)' : 'var(--color-text-2)' }}>
                      {tc.label}
                    </span>
                    {/* Сколько этой главы уже проиграно — та же полоса, что
                        ползёт по шкале плеера, только в масштабе строки. */}
                    {played > 0 && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute', left: 0, bottom: 0, height: 2,
                          width: `${played * 100}%`, background: 'var(--grad-purple)',
                          borderRadius: 999, transition: 'width 0.45s linear',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          </div>
          )}
        </div>
      )}

      {/* ── Конспект: lesson notes, with reaction paragraphs highlighted on
          arrival from the reactions widget. ── */}
      {detail.paragraphs.length > 0 && (
        <section
          className="flex flex-col"
          style={{
            gap: 14,
            padding: 24,
            borderRadius: 24,
            background: 'rgba(var(--glass-rgb), 0.96)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <FileText size={17} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Описание')}</span>
            {/* Кегль конспекта. Кнопка стоит у самого текста, а не в шапке
                страницы: включают её, уже начав читать и споткнувшись о размер. */}
            <button
              onClick={toggleBig}
              title={t(big ? 'Обычный текст' : 'Крупный текст')}
              aria-pressed={big}
              className="flex items-center cursor-pointer"
              style={{
                marginLeft: 'auto', gap: 6, padding: '5px 11px', borderRadius: 999,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 650,
                /* Нейтральный графит, а не акцентный фиолет: акцент в тёмной
                   теме светлый (#B3A6F7), и белая надпись на нём давала 1.6:1.
                   Включённое состояние читается заливкой и цветом текста. */
                border: `1px solid ${big ? 'var(--color-border)' : 'var(--color-border-soft)'}`,
                background: big ? 'var(--color-bg-5)' : 'transparent',
                color: big ? 'var(--color-text)' : 'var(--color-muted)',
              }}
            >
              <ALargeSmall size={15} />
              {t('Крупный текст')}
            </button>
          </div>
          {detail.paragraphs.map(p => p.image ? (
            <TheoryFigure key={p.id} src={p.image} caption={p.text} scale={scale} />
          ) : parseChecklist(p.text) ? (
            <TheoryChecklist
              key={p.id}
              scope={`${lesson.id}:${p.id}`}
              list={parseChecklist(p.text)!}
              scale={scale}
              accent={glossAccent}
              lang={glossLang}
              glossSubject={subjectDef?.id}
            />
          ) : (
            <div
              key={p.id}
              ref={el => { if (p.reactionId) paragraphRefs.current[p.reactionId] = el }}
            >
              {/* Keep fontWeight constant — toggling weight on highlight in/out
                  reflows the text and visibly jerks the line. The equation gets
                  its own background highlight via renderHighlightedParagraph,
                  which is the actual emphasis cue. */}
              {glossLang && !p.reactionId ? (
                <GlossedText
                  text={tidyProse(p.text)}
                  lang={glossLang}
                  accent={glossAccent}
                  subject={subjectDef?.id}
                  style={{
                    fontSize: 15 * scale,
                    lineHeight: 1.6,
                    color: 'var(--color-text)',
                    fontWeight: 450,
                  }}
                />
              ) : (
                <p
                  style={{
                    fontSize: 15 * scale,
                    lineHeight: 1.6,
                    color: 'var(--color-text)',
                    fontWeight: 450,
                    ...proseWrap,
                  }}
                >
                  {renderHighlightedParagraph(p.text, p.reactionId, pendingHighlight, courseReactions)}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ── Materials & homework — placed BELOW the description. Compact tiles;
          desktop keeps 4-across, mobile drops to 2 columns (4-col squeezes each
          tile so its content overflows onto neighbours). Homework spans full
          width on mobile. ── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: isDesktop ? 'repeat(4, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          alignItems: 'start',
        }}
      >
        <DownloadTile icon={NotebookPen} label={t('Рабочая тетрадь')} file={detail.files.workbook} />
        <DownloadTile icon={FileText} label={t('Конспект')} file={detail.files.notebook} />
        <MaterialsTile materials={detail.files.materials ?? []} />
        {detail.homework && (
          <div style={{ gridColumn: isDesktop ? 'auto' : '1 / -1' }}>
            <HomeworkCard lessonId={lesson.id} homework={detail.homework} onOpen={openHomework} />
          </div>
        )}
      </div>

    </div>
  )
}
