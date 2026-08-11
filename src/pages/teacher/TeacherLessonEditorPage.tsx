import { useState, useMemo, useRef, useEffect } from 'react'
import { usePersistentState, readDraft, clearDrafts } from '../../lib/useDraft'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, ChevronDown, Plus, X, Trash2,
  Video, Link2, ListVideo, NotebookPen, FileText, FolderOpen,
  GraduationCap, Upload, Calendar, Clock, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import type { Group, Student, ScheduleItem } from '../../data/teacherMockData'
import { useGroups, useAllStudents } from '../../lib/useGroups'
import { supabase } from '../../lib/supabase'
import ScrollFade from '../../components/ScrollFade'
import { useT, t as tGlobal } from '../../lib/i18n'
import {
  uploadLessonFile, deleteLessonFile, parseLessonFiles, formatFileSize,
  LessonFileTooLargeError, type LessonFile, type LessonFiles,
} from '../../lib/lessonFiles'
import { openLessonInCourseEditor } from '../../lib/teacherNav'

// ─── Style helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 11,
  border: '1.5px solid rgba(0,0,0,0.09)',
  fontSize: 13, color: 'var(--color-text)',
  background: 'var(--color-bg-2)', outline: 'none',
  fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}

function tileBase(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18, minHeight: 92, width: '100%',
    background: active ? 'rgba(var(--glass-rgb), 0.96)' : 'rgba(74,222,128,0.04)',
    border: active ? '1px solid var(--color-border-soft)' : '1.5px dashed rgba(74,222,128,0.3)',
    boxShadow: active ? '0 2px 12px rgba(0,0,0,0.05)' : 'none',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  }
}

// ─── Date/time helpers & pickers (same as CreateTaskModal) ────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, border: 'none',
  background: 'var(--color-bg-3)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--color-muted)',
}

function todayDotStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function parseDateDot(s: string): Date | null {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}
function formatDateDot(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function CalendarPickerLesson({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const t = useT()
  const selected = parseDateDot(value)
  const today = new Date()
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  const days: (Date | null)[] = []
  const first = new Date(viewYear, viewMonth, 1)
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6
  for (let i = 0; i < startDow; i++) days.push(null)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewYear, viewMonth, i))
  while (days.length % 7 !== 0) days.push(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
        background: 'rgba(var(--glass-rgb), 0.96)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '12px 14px 14px',
        minWidth: 232, userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={14} strokeWidth={2.2} /></button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t(RU_MONTHS[viewMonth])} {viewYear}</span>
        <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={14} strokeWidth={2.2} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {RU_DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#B0A8CC', paddingBottom: 4 }}>{t(d)}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const sel = !!(selected && d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth() && d.getDate() === selected.getDate())
          const tod = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
          return (
            <button key={i} onClick={() => { onChange(formatDateDot(d)); onClose() }}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 500, background: sel ? 'var(--color-green-soft)' : tod ? 'var(--color-green-soft)' : 'transparent', color: sel ? 'var(--color-green-text)' : tod ? 'var(--color-green-text)' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
              onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = tod ? 'var(--color-green-soft)' : 'transparent' }}
            >{d.getDate()}</button>
          )
        })}
      </div>
    </motion.div>
  )
}

function generateTimeSlots() {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  return slots
}
const TIME_SLOTS = generateTimeSlots()

function TimePickerLesson({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const idx = TIME_SLOTS.indexOf(value)
    if (idx !== -1 && listRef.current) (listRef.current.children[idx] as HTMLElement)?.scrollIntoView({ block: 'center' })
  }, [value])
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
        background: 'rgba(var(--glass-rgb), 0.96)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-medium)',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      <ScrollFade maxHeight={200} bg='rgba(var(--glass-rgb), 0.96)' scrollStyle={{ padding: '4px 6px' }}>
        <div ref={listRef}>
          {TIME_SLOTS.map(t => {
            const active = t === value
            return (
              <button key={t} onClick={() => { onChange(t); onClose() }}
                style={{ width: '100%', border: 'none', background: active ? 'var(--color-green-soft)' : 'transparent', color: active ? 'var(--color-green-text)' : 'var(--color-text)', padding: '7px 10px', textAlign: 'left', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', display: 'block', borderRadius: 9, transition: 'background 0.18s, color 0.18s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >{t}</button>
            )
          })}
        </div>
      </ScrollFade>
    </motion.div>
  )
}

// ─── Upload tile (workbook / notes / materials) ────────────────────────────────

/** Метка на значке файла: расширение из имени. */
function fileExt(name: string) {
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1).toUpperCase() : tGlobal('ФАЙЛ')
  return ext.length > 4 ? ext.slice(0, 4) : ext
}

/** Слот файла урока: тетрадь и конспект — по одному файлу, материалы — сколько угодно. */
type FileSlot = 'workbook' | 'notebook' | 'materials'

function slotFiles(files: LessonFiles, slot: FileSlot): LessonFile[] {
  if (slot === 'materials') return files.materials ?? []
  const one = files[slot]
  return one ? [one] : []
}

/**
 * Плитка файла — настоящая загрузка.
 *
 * Файл уходит в бакет lesson-materials сразу при выборе, путь и метаданные — в
 * `lessons.materials` при сохранении (см. lib/lessonFiles). Раньше плитка
 * складывала ИМЕНА выбранных файлов в черновик браузера: при публикации они
 * пропадали, и ученик их не видел.
 */
function UploadTile({
  icon: Icon, label, slot, files, onChange,
}: {
  icon: React.ElementType; label: string; slot: FileSlot
  files: LessonFiles; onChange: (next: LessonFiles) => void
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const multiple = slot === 'materials'
  const mine = slotFiles(files, slot)
  const has = mine.length > 0

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = '' // чтобы тот же файл можно было выбрать повторно
    if (picked.length === 0 || busy) return
    setBusy(true); setErr(null)
    const uploaded: LessonFile[] = []
    try {
      // Обновляем один раз в конце: `files` в замыкании — снимок пропса, и
      // обновление внутри цикла затирало бы предыдущие файлы пачки.
      for (const f of picked) uploaded.push(await uploadLessonFile(f))
      onChange(multiple
        ? { ...files, materials: [...(files.materials ?? []), ...uploaded] }
        : { ...files, [slot]: uploaded[0] })
    } catch (e2) {
      await Promise.all(uploaded.map(u => deleteLessonFile(u.path)))
      setErr(e2 instanceof LessonFileTooLargeError ? e2.message
        : (e2 as { message?: string })?.message || t('не удалось загрузить'))
    } finally {
      setBusy(false)
    }
  }

  // Убираем файл только из урока: объект в бакете оставляем, иначе закрытая без
  // сохранения правка оставила бы ученику плитку, которая не скачивается.
  function remove(path: string) {
    if (multiple) {
      const rest = (files.materials ?? []).filter((f: LessonFile) => f.path !== path)
      const next = { ...files }
      if (rest.length) next.materials = rest; else delete next.materials
      onChange(next)
      return
    }
    const next = { ...files }
    delete next[slot]
    onChange(next)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        onChange={handlePick}
        style={{ display: 'none' }}
      />
      <motion.button
        whileHover={busy ? undefined : { y: -2 }} whileTap={busy ? undefined : { scale: 0.99 }}
        onClick={() => !busy && inputRef.current?.click()}
        style={{ ...tileBase(has), cursor: busy ? 'progress' : 'pointer', opacity: busy ? 0.7 : 1 }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: has ? 'var(--color-green-soft)' : 'rgba(74,222,128,0.1)', color: 'var(--color-green-text)',
        }}>
          <Icon size={20} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.2 }}>{label}</p>
          <p style={{
            fontSize: 12, marginTop: 2,
            color: err ? 'var(--color-red-text)' : 'var(--color-text-3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {busy ? t('Загружаем…')
              : err ? err
              : has ? `${mine.length} ${mine.length === 1 ? t('файл') : t('файлов')}`
              : multiple ? t('Загрузить файлы') : t('Загрузить файл')}
          </p>
        </div>
        {!has && <Upload size={16} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
        {has && multiple && <Plus size={16} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />}
      </motion.button>

      {has && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {mine.map(f => (
            <div key={f.path} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 9, background: 'var(--color-bg)',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                background: 'var(--grad-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, fontWeight: 800, color: '#fff',
              }}>{fileExt(f.name)}</div>
              <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--color-muted)' }}>{formatFileSize(f.size)}</span>
              <button
                onClick={e => { e.stopPropagation(); remove(f.path) }}
                style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Homework card ────────────────────────────────────────────────────────────

/**
 * Домашка занятия — та, что реально лежит у урока (`lessons.homework.hwTasks`),
 * а не выбор из списка.
 *
 * Раньше здесь был выпадающий список из десяти зашитых «шаблонов» («Гидролиз
 * солей — базовый», 8 заданий): заданий за ними не стояло, выбор никуда не
 * сохранялся, и ученику ничего не прилетало. Собирают домашку в «Домашках»
 * урока — туда и ведём.
 */
function HomeworkCard({
  hw, onOpen,
}: {
  hw: { basic: number; hard: number } | null
  onOpen: () => void
}) {
  const t = useT()
  const total = (hw?.basic ?? 0) + (hw?.hard ?? 0)

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        padding: 16, borderRadius: 20, minHeight: 92, width: '100%', textAlign: 'left',
        background: 'var(--grad-green)', border: 'none',
        boxShadow: '0 12px 28px rgba(74,222,128,0.22)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GraduationCap size={17} style={{ color: '#fff' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t('Домашка')}</span>
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
        {total === 0
          ? t('Заданий нет — собрать в курсе')
          : `${hw!.basic} ${t('базовых')} · ${hw!.hard} ${t('сложных')}`}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
        {t('Открыть в курсе')} <ChevronRight size={13} />
      </span>
    </button>
  )
}

// ─── Timecode editor ───────────────────────────────────────────────────────────

type Timecode = { time: string; label: string }

function TimecodeEditor({ codes, onChange }: { codes: Timecode[]; onChange: (c: Timecode[]) => void }) {
  const t = useT()
  return (
    <div className="flex flex-col h-full" style={{
      borderRadius: 24, background: 'rgba(var(--glass-rgb), 0.96)',
      border: '1px solid var(--color-border-soft)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      padding: 16, gap: 8, maxHeight: '54vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <ListVideo size={17} style={{ color: 'var(--color-green-text)' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Таймкоды')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', scrollbarGutter: 'stable' }}>
        {codes.map((tc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              value={tc.time}
              onChange={e => { const c = [...codes]; c[i] = { ...c[i], time: e.target.value }; onChange(c) }}
              placeholder="00:00"
              style={{ ...inputStyle, width: 60, padding: '7px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
            />
            <input
              value={tc.label}
              onChange={e => { const c = [...codes]; c[i] = { ...c[i], label: e.target.value }; onChange(c) }}
              placeholder={t('Глава...')}
              style={{ ...inputStyle, flex: 1, padding: '7px 10px' }}
            />
            <button
              onClick={() => onChange(codes.filter((_, j) => j !== i))}
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {codes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-4)', fontSize: 12 }}>
            {t('Добавьте главы видео')}
          </div>
        )}
      </div>
      <button
        onClick={() => onChange([...codes, { time: '', label: '' }])}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 0', borderRadius: 11, border: '1.5px dashed rgba(74,222,128,0.3)',
          background: 'rgba(74,222,128,0.05)', cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, color: 'var(--color-green-text)', fontFamily: 'inherit',
        }}
      >
        <Plus size={13} /> {t('Таймкод')}
      </button>
    </div>
  )
}

// ─── Video zone ────────────────────────────────────────────────────────────────

function VideoZone({ url, onChange }: { url: string; onChange: (u: string) => void }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (url) {
    return (
      <div style={{
        position: 'relative', width: '100%', height: '54vh', borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #2A2A2C, #111113)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Video size={30} style={{ color: '#fff' }} />
        </div>
        <div style={{ textAlign: 'center', padding: '0 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{t('Запись прикреплена')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-border-glass)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360, whiteSpace: 'nowrap' }}>{url}</div>
        </div>
        <button
          onClick={() => onChange('')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 11,
            border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.16)',
            color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <X size={13} /> {t('Удалить')}
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '54vh', borderRadius: 24,
      border: '2px dashed rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.04)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, background: 'rgba(74,222,128,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Video size={30} style={{ color: 'var(--color-green-text)' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{t('Добавьте запись урока')}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('После созвона — вставьте ссылку RuTube, YouTube или свою (ONIX Stream и т.п.)')}</div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 440 }}>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onChange(draft.trim()); setEditing(false) } }}
            placeholder="https://rutube.ru/video/..."
            style={{ ...inputStyle, flex: 1, background: 'var(--color-bg-input)' }}
          />
          <button
            onClick={() => { if (draft.trim()) { onChange(draft.trim()); setEditing(false) } }}
            style={{
              padding: '0 16px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: 'var(--grad-green)', color: '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {t('ОК')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12,
              border: 'none', cursor: 'pointer', background: 'var(--grad-green)',
              color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(74,222,128,0.3)',
            }}
          >
            <Link2 size={15} /> {t('Вставить ссылку')}
          </button>
          <button
            onClick={() => onChange('https://rutube.ru/video/upload-' + Math.random().toString(36).slice(2, 8))}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent',
              color: 'var(--color-muted)', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            <Upload size={15} /> {t('Загрузить файл')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Left meta panel ───────────────────────────────────────────────────────────

type Recipient = { kind: 'group' | 'student'; id: string }

type Meta = {
  recipients: Recipient[]
  title: string
  lessonNumber: string
  date: string
  startTime: string
  endTime: string
}

// Resolve a recipient to display props (name, sub-label, icon/initials, color)
function resolveRecipient(r: Recipient, groups: Group[], students: Student[]) {
  if (r.kind === 'group') {
    const g = groups.find(x => x.id === r.id)
    return {
      name: g?.name ?? tGlobal('Группа'),
      sub: g ? `${g.level} · ${g.subject}` : '',
      icon: g?.icon ?? '👥',
      initials: '',
      color: 'var(--color-green-text)',
    }
  }
  const s = students.find(x => x.id === r.id)
  const initials = (s?.name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2)
  const g = s ? groups.find(x => x.id === s.groupId) : undefined
  return {
    name: s?.name ?? tGlobal('Студент'),
    sub: g?.name ?? '',
    icon: '',
    initials,
    color: 'var(--color-green-text)',
  }
}

// ─── Audience picker (multi group / student) ───────────────────────────────────

function AudiencePicker({
  recipients, onChange,
}: { recipients: Recipient[]; onChange: (r: Recipient[]) => void }) {
  const t = useT()
  const { groups } = useGroups()
  const students = useAllStudents()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const has = (kind: 'group' | 'student', id: string) =>
    recipients.some(r => r.kind === kind && r.id === id)

  function add(kind: 'group' | 'student', id: string) {
    if (has(kind, id)) return
    onChange([...recipients, { kind, id }])
    setQuery('')
  }
  function remove(kind: 'group' | 'student', id: string) {
    onChange(recipients.filter(r => !(r.kind === kind && r.id === id)))
  }

  const q = query.trim().toLowerCase()
  const groupMatches = groups.filter(g =>
    !has('group', g.id) && (!q || g.name.toLowerCase().includes(q) || g.subject.toLowerCase().includes(q)))
  const studentMatches = students.filter(s =>
    !has('student', s.id) && (!q || s.name.toLowerCase().includes(q)))

  return (
    <div ref={ref}>
      <Label>{t('Кому')}</Label>

      {/* Selected chips */}
      {recipients.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {recipients.map(r => {
            const d = resolveRecipient(r, groups, students)
            return (
              <div
                key={`${r.kind}-${r.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 6px 4px 5px', borderRadius: 9,
                  background: r.kind === 'group' ? 'var(--color-green-soft)' : 'var(--color-green-soft)',
                  maxWidth: '100%',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: r.kind === 'group' ? 'var(--color-surface)' : d.color,
                  fontSize: r.kind === 'group' ? 11 : 8.5, fontWeight: 800,
                  color: '#fff',
                }}>
                  {r.kind === 'group' ? <span>{d.icon}</span> : d.initials}
                </div>
                <span style={{
                  fontSize: 11.5, fontWeight: 600,
                  color: r.kind === 'group' ? 'var(--color-green-text)' : 'var(--color-green-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {d.name}
                </span>
                <button
                  onClick={() => remove(r.kind, r.id)}
                  style={{
                    width: 16, height: 16, borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: r.kind === 'group' ? 'var(--color-green-text)' : 'var(--color-green-text)', flexShrink: 0,
                  }}
                >
                  <X size={9} strokeWidth={2.6} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add button + dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, width: '100%',
            padding: '9px 12px', borderRadius: 11, cursor: 'pointer',
            border: '1.5px dashed rgba(74,222,128,0.3)',
            background: open ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.04)',
            color: 'var(--color-green-text)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <Plus size={14} strokeWidth={2.4} />
          {recipients.length === 0 ? t('Группа или ученик') : t('Добавить ещё')}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--color-bg-input)', borderRadius: 14, zIndex: 200,
                boxShadow: '0 12px 36px rgba(0,0,0,0.16)',
                border: '1px solid var(--color-border)', overflow: 'hidden',
              }}
            >
              {/* Search */}
              <div style={{ padding: 8, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('Поиск группы или ученика…')}
                    style={{ ...inputStyle, paddingLeft: 30, paddingRight: query ? 30 : undefined }}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Паддинг 8px по вертикали — ровно на вылет фейда (top/bottom: -8),
                  иначе градиент лёг бы на разделители шапки и футера. */}
              <div style={{ padding: '8px 10px 8px 6px' }}>
              <ScrollFade maxHeight={244} bg="var(--color-bg-input)" overlayScrollbar>
                {/* Groups */}
                {groupMatches.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, padding: '6px 8px 4px' }}>{t('ГРУППЫ')}</div>
                    {groupMatches.map(g => (
                      <button
                        key={g.id}
                        onClick={() => add('group', g.id)}
                        style={pickerRow}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-4)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                          {g.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>{g.level} · {g.subject}</div>
                        </div>
                        <Plus size={13} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </>
                )}

                {/* Students */}
                {studentMatches.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, padding: '8px 8px 4px' }}>{t('УЧЕНИКИ')}</div>
                    {studentMatches.slice(0, 40).map(s => {
                      const initials = s.name.split(' ').map(p => p[0]).join('').slice(0, 2)
                      const g = groups.find(x => x.id === s.groupId)
                      return (
                        <button
                          key={s.id}
                          onClick={() => add('student', s.id)}
                          style={pickerRow}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-4)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-green-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#fff' }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>{g?.name ?? ''}</div>
                          </div>
                          <Plus size={13} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                        </button>
                      )
                    })}
                  </>
                )}

                {groupMatches.length === 0 && studentMatches.length === 0 && (
                  <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-4)' }}>
                    {t('Ничего не найдено')}
                  </div>
                )}
              </ScrollFade>
              </div>

              <div style={{ padding: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => { setOpen(false); setQuery('') }}
                  style={{
                    width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  {t('Готово')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const pickerRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
  padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'transparent', fontFamily: 'inherit', transition: 'background 0.12s',
}

function LeftPanel({ meta, onChange }: { meta: Meta; onChange: (p: Partial<Meta>) => void }) {
  const t = useT()
  const [showCal, setShowCal] = useState(false)
  const [showStartTime, setShowStartTime] = useState(false)
  const [showEndTime, setShowEndTime] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (showCal && calRef.current && !calRef.current.contains(e.target as Node)) setShowCal(false)
      if (showStartTime && startRef.current && !startRef.current.contains(e.target as Node)) setShowStartTime(false)
      if (showEndTime && endRef.current && !endRef.current.contains(e.target as Node)) setShowEndTime(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showCal, showStartTime, showEndTime])

  const displayDate = meta.date || todayDotStr()

  return (
    <div style={{
      width: 240, flexShrink: 0,
      padding: 16, borderRadius: 18,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      boxShadow: 'var(--shadow-sm-page)',
      display: 'flex', flexDirection: 'column', gap: 14,
      alignSelf: 'flex-start',
    }}>
      <AudiencePicker
        recipients={meta.recipients}
        onChange={r => onChange({ recipients: r })}
      />

      <div>
        <Label>{t('Название урока')}</Label>
        <input
          value={meta.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder={t('Например: Основные оксиды')}
          style={inputStyle}
        />
        <div style={{ fontSize: 10.5, color: 'var(--color-text-4)', marginTop: 4, lineHeight: 1.4 }}>
          {t('Так занятие подписано в расписании и в журнале')}
        </div>
      </div>

      <div>
        <Label>{t('Номер занятия')}</Label>
        <input
          value={meta.lessonNumber}
          onChange={e => onChange({ lessonNumber: e.target.value })}
          placeholder="35"
          style={inputStyle}
        />
      </div>

      <div>
        <Label>{t('Дата')}</Label>
        <div ref={calRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowCal(v => !v); setShowStartTime(false); setShowEndTime(false) }}
            style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none', background: 'var(--color-bg-input)', paddingLeft: 11, textAlign: 'left' }}
          >
            <Calendar size={13} color="#9A9AA2" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{displayDate}</span>
          </button>
          <AnimatePresence>
            {showCal && (
              <CalendarPickerLesson
                value={displayDate}
                onChange={v => { onChange({ date: v }); }}
                onClose={() => setShowCal(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <Label>{t('Время')}</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div ref={startRef} style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => { setShowStartTime(v => !v); setShowCal(false); setShowEndTime(false) }}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: 'none', background: 'var(--color-bg-input)', paddingLeft: 10, textAlign: 'left' }}
            >
              <Clock size={13} color="#9A9AA2" style={{ flexShrink: 0 }} />
              <span>{meta.startTime || '—'}</span>
            </button>
            <AnimatePresence>
              {showStartTime && (
                <TimePickerLesson
                  value={meta.startTime}
                  onChange={v => onChange({ startTime: v })}
                  onClose={() => setShowStartTime(false)}
                />
              )}
            </AnimatePresence>
          </div>
          <span style={{ color: 'var(--color-text-4)', fontSize: 14 }}>—</span>
          <div ref={endRef} style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => { setShowEndTime(v => !v); setShowCal(false); setShowStartTime(false) }}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: 'none', background: 'var(--color-bg-input)', paddingLeft: 10, textAlign: 'left' }}
            >
              <Clock size={13} color="#9A9AA2" style={{ flexShrink: 0 }} />
              <span>{meta.endTime || '—'}</span>
            </button>
            <AnimatePresence>
              {showEndTime && (
                <TimePickerLesson
                  value={meta.endTime}
                  onChange={v => onChange({ endTime: v })}
                  onClose={() => setShowEndTime(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function TeacherLessonEditorPage() {
  const t = useT()
  const setActivePage = useTeacher(s => s.setActivePage)
  const editingScheduleId = useTeacher(s => s.editingScheduleId)

  const [source, setSource] = useState<ScheduleItem | null>(null)
  // uuid строки `lessons`, к которой привязано занятие расписания. Есть только
  // у занятий, порождённых уроком курса (schedule_lessons.lesson_id) — именно
  // туда сохраняется содержимое: видео, главы, описание, файлы. У занятия,
  // заведённого прямо здесь, такой строки нет, и содержимое сохранять некуда.
  const [lessonRowId, setLessonRowId] = useState<string | null>(null)
  /** Дата занятия из расписания (DD.MM.YYYY) — поле «Дата» стартует с сегодня,
   *  и без подстановки «Опубликовать» переносило чужое занятие на сегодня. */
  const [sourceDate, setSourceDate] = useState('')
  const [lessonHw, setLessonHw] = useState<{ basic: number; hard: number } | null>(null)
  useEffect(() => {
    if (!editingScheduleId) { setSource(null); setLessonRowId(null); return }
    supabase
      .from('schedule_lessons')
      .select('*, groups(name, icon, color, color_soft, subject)')
      .eq('id', editingScheduleId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setLessonRowId(data.lesson_id ?? null)
        // date приходит как YYYY-MM-DD, поле редактора — DD.MM.YYYY.
        const iso = String(data.date ?? '').slice(0, 10).split('-')
        if (iso.length === 3) setSourceDate(`${iso[2]}.${iso[1]}.${iso[0]}`)
        setSource({
          id: String(data.id),
          groupId: data.group_id ?? null,
          studentId: data.student_id ?? null,
          groupName: data.groups?.name ?? '',
          icon: data.groups?.icon ?? '📚',
          time: (data.time_start ?? '').slice(0, 5),
          endTime: (data.time_end ?? '').slice(0, 5),
          topic: data.lesson_title ?? '',
          lessonNumber: data.lesson_number ?? 0,
          subject: data.subject ?? data.groups?.subject ?? '',
          status: 'upcoming' as const,
          studentCount: 0,
          color: data.groups?.color ?? 'var(--color-purple)',
          colorSoft: data.groups?.color_soft ?? '#E4D9FF',
        })
      })
  }, [editingScheduleId])

  const isNew = !source

  // Draft namespace scoped by the edited lesson so drafts don't leak between lessons.
  const draftNs = `lessoned.${editingScheduleId ?? 'new'}`
  // If a draft was restored, the Supabase load below must not clobber it.
  const hadMetaDraft = useRef(readDraft(`${draftNs}.meta`) !== null)

  const [meta, setMeta] = usePersistentState<Meta>(`${draftNs}.meta`, {
    recipients: [],
    title: '',
    lessonNumber: '',
    date: todayDotStr(),
    startTime: '',
    endTime: '',
  })

  useEffect(() => {
    if (!source || hadMetaDraft.current) return
    setMeta(m => ({
      ...m,
      recipients: source.groupId
        ? [{ kind: 'group' as const, id: source.groupId }]
        : source.studentId
          ? [{ kind: 'student' as const, id: source.studentId }]
          : m.recipients,
      title: source.topic || m.title,
      lessonNumber: String(source.lessonNumber || '') || m.lessonNumber,
      date: sourceDate || m.date,
      startTime: source.time || m.startTime,
      endTime: source.endTime || m.endTime,
    }))
  }, [source, sourceDate])
  const [videoUrl, setVideoUrl] = usePersistentState(`${draftNs}.videoUrl`, '')
  const [timecodes, setTimecodes] = usePersistentState<Timecode[]>(`${draftNs}.timecodes`, [])
  const [files, setFiles] = usePersistentState<LessonFiles>(`${draftNs}.files`, {})
  const [description, setDescription] = usePersistentState(`${draftNs}.description`, '')
  const [published, setPublished] = useState(false)
  const [publishErr, setPublishErr] = useState<string | null>(null)

  // Содержимое привязанного урока — из `lessons`, а не из воздуха. Черновик
  // (несохранённая правка в этой вкладке) старше базы: он и был причиной, по
  // которой поля вообще переживали перезагрузку, — затирать его загрузкой нельзя.
  const hadContentDraft = useRef({
    videoUrl: readDraft(`${draftNs}.videoUrl`) !== null,
    timecodes: readDraft(`${draftNs}.timecodes`) !== null,
    files: readDraft(`${draftNs}.files`) !== null,
    description: readDraft(`${draftNs}.description`) !== null,
  })
  useEffect(() => {
    if (!lessonRowId) { setLessonHw(null); return }
    supabase
      .from('lessons')
      .select('youtube_url, timecodes, description, materials, homework')
      .eq('id', lessonRowId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const d = hadContentDraft.current
        if (!d.videoUrl) setVideoUrl(data.youtube_url ?? '')
        if (!d.timecodes) setTimecodes(Array.isArray(data.timecodes) ? data.timecodes as Timecode[] : [])
        if (!d.description) setDescription(data.description ?? '')
        if (!d.files) setFiles(parseLessonFiles(data.materials))
        const tasks = (data.homework as { hwTasks?: Array<{ isHard?: boolean }> } | null)?.hwTasks ?? []
        setLessonHw({
          basic: tasks.filter(x => !x.isHard).length,
          hard: tasks.filter(x => x.isHard).length,
        })
      })
  }, [lessonRowId])

  // Scroll-driven header dock — same logic as the student lesson/homework pages:
  // a single boolean threshold (scrollTop > 64) flips the rest-state header row
  // out and a fixed "docked twin" of glass pills in, while the page scrolls UP
  // under the shell's floating topbar + progressive-blur strip.
  const [docked, setDocked] = useState(false)

  const { groups } = useGroups()

  const openCourseEditor = useTeacher(s => s.openCourseEditor)

  // «Домашка» и правка содержимого целиком — в курсе: открываем тот же урок в
  // Конструкторе, а не показываем здесь его копию.
  async function openInCourse() {
    if (!lessonRowId) return
    const ok = await openLessonInCourseEditor(lessonRowId, openCourseEditor)
    if (!ok) setActivePage('constructor')
  }

  function updateMeta(p: Partial<Meta>) { setMeta(m => ({ ...m, ...p })) }

  async function handlePublish() {
    // Gate publish: needs an audience (кому/для кого) and a date + time.
    // Otherwise the teacher can still save it as a draft.
    if (meta.recipients.length === 0) {
      setPublishErr(t('Выберите, кому назначить урок (группа или ученик) — иначе можно только сохранить черновик.'))
      return
    }
    if (!meta.date || !meta.startTime) {
      setPublishErr(t('Укажите дату и время урока — иначе можно только сохранить черновик.'))
      return
    }
    setPublishErr(null)
    const parts = meta.date.split('.')
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : meta.date
    const groupRecipients = meta.recipients.filter(r => r.kind === 'group')

    // Содержимое занятия — в урок курса, из которого оно родилось. Раньше здесь
    // сохранялись только название, номер, дата и время: видео, главы, описание и
    // файлы жили в черновике браузера и при публикации пропадали.
    if (lessonRowId) {
      const { error: lessonErr } = await supabase.from('lessons').update({
        // Название пишем и в урок: иначе переименование здесь жило бы только в
        // расписании, а следующее сохранение курса вернуло бы старое имя.
        ...(meta.title.trim() ? { title: meta.title.trim() } : {}),
        youtube_url: videoUrl.trim() || null,
        timecodes,
        description: description.trim() || null,
        materials: files,
      }).eq('id', lessonRowId)
      if (lessonErr) {
        console.error('[lesson-editor] lessons update failed', lessonErr)
        setPublishErr(t('Не удалось сохранить содержимое урока — попробуйте ещё раз.'))
        return
      }
    }

    if (editingScheduleId) {
      await supabase.from('schedule_lessons').update({
        lesson_title: meta.title,
        lesson_number: meta.lessonNumber ? Number(meta.lessonNumber) : null,
        date: isoDate,
        time_start: meta.startTime || null,
        time_end: meta.endTime || null,
      }).eq('id', editingScheduleId)
    } else if (groupRecipients.length > 0) {
      await Promise.all(groupRecipients.map(r => {
        const group = groups.find(g => g.id === r.id)
        return supabase.from('schedule_lessons').insert({
          group_id: r.id,
          lesson_title: meta.title,
          lesson_number: meta.lessonNumber ? Number(meta.lessonNumber) : null,
          date: isoDate,
          time_start: meta.startTime || null,
          time_end: meta.endTime || null,
          subject: group?.subject ?? '',
          status: 'upcoming',
        })
      }))
    }

    clearDrafts(draftNs)
    setPublished(true)
    setTimeout(() => setActivePage('home'), 1600)
  }

  // Shared glass recipe for the docked top-line pills — matched to the teacher
  // topbar so every floating surface reads as one consistent piece of glass.
  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  const backBtn = (
    <>
      <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
    </>
  )
  const draftLabel = t('Черновик')
  // Highlighted "Черновик" look — the lesson is a draft until published.
  const draftActiveStyle = {
    border: '1.5px solid var(--color-yellow-text)',
    background: 'var(--color-yellow-soft)',
    color: 'var(--color-yellow-text)',
    fontWeight: 700,
  } as const
  const draftDot = <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-yellow-text)', flexShrink: 0 }} />

  return (
    // Single scroll container. The teacher shell wrapper sits 100px down (topbar
    // reservation); marginTop:-100 lifts the pane up to the viewport top so it
    // can scroll UNDER the floating topbar, and paddingTop:100 re-insets the
    // content below the topbar at rest — exactly the student lesson page recipe.
    // The wrapper's overflow:visible (set for this page) keeps the lifted top
    // from being clipped.
    <div
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 32px 48px' }}>

        {/* ── Rest-state header row — in the scroll flow below the topbar; fades
            out as the page docks. Its docked twin (below) sits ON the topbar line. ── */}
        <motion.div
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          animate={{ opacity: docked ? 0 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => setActivePage('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {backBtn}
          </motion.button>

          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            maxWidth: '44%', pointerEvents: 'none',
            fontSize: 18, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
          }}>
            {isNew ? t('Создать урок') : t('Урок')}
            {meta.title && <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> — {meta.title}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              style={{
                padding: '9px 18px', borderRadius: 999, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', cursor: 'pointer',
                fontSize: 13.5, fontFamily: 'inherit', ...(published ? { border: '1px solid var(--color-border-medium)', background: 'rgba(var(--glass-rgb), 0.96)', color: 'var(--color-muted)', fontWeight: 600 } : draftActiveStyle),
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              {!published && draftDot} {draftLabel}
            </button>
            <TeacherSaveButton
              label={t('Опубликовать урок')} savedLabel={t('Опубликовано!')}
              icon={<Send size={14} />}
              saved={published} onClick={handlePublish}
            />
          </div>
        </motion.div>

        {/* ── Docked twin — fixed at the topbar line, escaping the scroll
            container's top padding so it sits ON the topbar row. Glass pills to
            match the topbar; fades / slides in on scroll. ── */}
        <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div
              key="editor-dock"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
              }}
            >
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                onClick={() => setActivePage('home')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass,
                  color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', pointerEvents: 'auto',
                }}
              >
                {backBtn}
              </motion.button>

              <div
                style={{
                  flexShrink: 1, minWidth: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  padding: '9px 16px', borderRadius: 999, ...dockGlass,
                  fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto',
                }}
              >
                {meta.title || (isNew ? t('Создать урок') : t('Урок'))}
              </div>

              <div style={{ flexGrow: 1, flexBasis: 0 }} />

              <button
                style={{
                  flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass,
                  ...(published ? { color: 'var(--color-muted)', fontWeight: 600 } : draftActiveStyle),
                  cursor: 'pointer', fontSize: 13.5,
                  fontFamily: 'inherit', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 7,
                }}
              >
                {!published && draftDot} {draftLabel}
              </button>
              <TeacherSaveButton
                label={t('Опубликовать урок')} savedLabel={t('Опубликовано!')}
                icon={<Send size={14} />}
                saved={published} onClick={handlePublish}
                style={{ boxShadow: '0 6px 20px rgba(74,222,128,0.25)', pointerEvents: 'auto' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* ── Publish-blocked banner ── */}
        <AnimatePresence>
          {publishErr && (
            <motion.div
              key="publish-err"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                margin: '0 0 14px', padding: '10px 14px', borderRadius: 12,
                border: '1px solid var(--color-red-soft)', background: 'var(--color-red-soft)',
                color: 'var(--color-red-text)', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span>{publishErr}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Body ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Left meta panel — sticky so its fields stay visible while scrolling. */}
          <div style={{ position: 'sticky', top: 20, flexShrink: 0 }}>
            <LeftPanel meta={meta} onChange={updateMeta} />
          </div>

          {/* Center */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Содержимое — только у занятия, выросшего из урока курса: видео,
                главы, файлы и описание живут в строке `lessons`, и без неё их
                некуда сохранить. Занятие, заведённое прямо здесь, — это запись в
                расписании; вместо мёртвых полей показываем, где завести урок. */}
            {lessonRowId ? (
              <>
                {/* Row 1: video + timecodes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'stretch' }}>
                  <VideoZone url={videoUrl} onChange={setVideoUrl} />
                  <TimecodeEditor codes={timecodes} onChange={setTimecodes} />
                </div>

                {/* Row 2: materials + homework */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, alignItems: 'start' }}>
                  <UploadTile icon={NotebookPen} label={t('Рабочая тетрадь')} slot="workbook" files={files} onChange={setFiles} />
                  <UploadTile icon={FileText} label={t('Конспект')} slot="notebook" files={files} onChange={setFiles} />
                  <UploadTile icon={FolderOpen} label={t('Материалы')} slot="materials" files={files} onChange={setFiles} />
                  <HomeworkCard hw={lessonHw} onOpen={openInCourse} />
                </div>

                {/* Description */}
                <section style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  padding: 24, borderRadius: 24,
                  background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-soft)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={17} style={{ color: 'var(--color-green-text)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Описание урока')}</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t('Краткое содержание урока, что разобрали, ключевые моменты...')}
                    rows={5}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6, background: 'var(--color-bg-input)' }}
                  />
                </section>
              </>
            ) : (
              <section style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: 24, borderRadius: 24,
                background: 'rgba(var(--glass-rgb), 0.96)',
                border: '1.5px dashed var(--color-border-medium)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Video size={17} style={{ color: 'var(--color-text-3)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Содержимое урока')}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-3)', margin: 0 }}>
                  {t('Здесь заводится занятие в расписании: кому, когда и во сколько. Запись, главы, файлы и домашка живут у урока курса — их видит ученик на экране урока.')}
                </p>
                <button
                  onClick={() => setActivePage('constructor')}
                  style={{
                    alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  }}
                >
                  {t('Открыть Конструктор')} <ChevronRight size={14} />
                </button>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
