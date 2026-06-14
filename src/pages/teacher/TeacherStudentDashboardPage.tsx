import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Phone, Send, User, TrendingUp, ClipboardCheck, Clock,
  Award, Target, XCircle, CheckCircle2, Layers, BookOpen, Dumbbell,
  Star, Calendar, BarChart3, Download, CreditCard, MessageSquare,
  CheckCheck, AlertCircle, Percent, FlaskConical, Atom, Brain,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useGroups, useStudents } from '../../lib/useGroups'
import type { Student, Group } from '../../data/teacherMockData'
import { loadAnonResults, type AnonDiagResult } from '../../data/diagnosticData'

// ─── Mock data (until Supabase tables are ready) ──────────────────────────────
const MOCK_TRAINER_SECTIONS = [
  { section: 'Молекулярная биология',    correct: 12, total: 18 },
  { section: 'Клеточная теория',         correct:  6, total: 11 },
  { section: 'Обмен веществ',            correct:  2, total:  9 },
  { section: 'Размножение организмов',   correct:  9, total: 12 },
  { section: 'Основы генетики',          correct:  4, total: 14 },
]
const MOCK_WRONG_TASKS = [
  { id: 1554, line: 24, topic: 'Процессы жизнедеятельности клетки' },
  { id: 892,  line: 19, topic: 'АТФ и биологическое окисление' },
  { id: 1102, line:  6, topic: 'Строение клеток эукариот' },
  { id: 445,  line: 28, topic: 'Генетика — задачи' },
  { id: 730,  line: 18, topic: 'Фотосинтез и хемосинтез' },
]
const MOCK_HW_HISTORY = [
  { title: 'ДЗ №12 — Митоз и мейоз', date: '10 июн', score: 9, maxScore: 10, returned: false },
  { title: 'ДЗ №11 — Фотосинтез', date: '3 июн', score: 7, maxScore: 10, returned: false },
  { title: 'ДЗ №10 — Генетика', date: '27 мая', score: 0, maxScore: 10, returned: true },
  { title: 'ДЗ №9 — Клетка', date: '20 мая', score: 8, maxScore: 10, returned: false },
  { title: 'ДЗ №8 — Ткани', date: '13 мая', score: 10, maxScore: 10, returned: false },
  { title: 'ДЗ №7 — Органоиды', date: '6 мая', score: 6, maxScore: 10, returned: false },
]
const MOCK_LESSONS = [
  { date: '10 июн', topic: 'Митоз и мейоз', attended: true },
  { date: '3 июн',  topic: 'Фотосинтез', attended: true },
  { date: '27 мая', topic: 'Генетика', attended: false },
  { date: '20 мая', topic: 'Строение клетки', attended: true },
  { date: '13 мая', topic: 'Ткани', attended: true },
  { date: '6 мая',  topic: 'Органоиды', attended: true },
]
const MOCK_SCORE_DYNAMICS = [62, 65, 70, 68, 73, 71, 75, 78, 80]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nameInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function nameToHue(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

function Avatar({ student, group, size = 56 }: { student: Student; group: Group; size?: number }) {
  const hue = nameToHue(student.name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, hsl(${hue} 70% 68%), hsl(${(hue + 40) % 360} 60% 54%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: '#fff',
      boxShadow: `0 0 0 3px ${group.color}44`,
    }}>
      {nameInitials(student.name)}
    </div>
  )
}

function SectionHeader({ icon: Icon, label }: { icon: React.FC<{ size?: number; style?: React.CSSProperties }>; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <Icon size={14} style={{ color: 'var(--color-muted)' }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: 20, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.94)', border: '1px solid var(--color-border-soft)', ...style }}>
      {children}
    </div>
  )
}

function ScoreBar({ label, icon: Icon, value, color, bg }: { label: string; icon: React.FC<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>; value: number; color: string; bg: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 12 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} strokeWidth={2} style={{ color }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 80, height: 5, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ height: '100%', background: color, borderRadius: 999 }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{value}%</span>
      </div>
    </div>
  )
}

function SectionRow({ section, correct, total }: { section: string; correct: number; total: number }) {
  const pct = total ? correct / total : 0
  const color = pct >= 0.7 ? '#34C877' : pct >= 0.4 ? '#FAC775' : '#F09595'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{section}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, marginLeft: 8 }}>{correct}/{total} · {Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.55, delay: 0.1 }}
          style={{ height: '100%', background: color, flexShrink: 0 }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${((total - correct) / total) * 100}%` }} transition={{ duration: 0.55, delay: 0.1 }}
          style={{ height: '100%', background: '#F4B3B344', flexShrink: 0 }} />
      </div>
    </div>
  )
}

// ─── PDF export via browser print ─────────────────────────────────────────────
function printStudentCard(studentName: string) {
  const style = document.createElement('style')
  style.id = '__student-print-style__'
  style.textContent = `
    @media print {
      body > * { display: none !important; }
      #student-dashboard-print { display: block !important; }
      @page { margin: 16mm 14mm; size: A4; }
    }
  `
  document.head.appendChild(style)
  const el = document.getElementById('student-dashboard-print')
  if (el) el.style.display = 'block'
  document.title = `Карточка — ${studentName}`
  window.print()
  setTimeout(() => {
    style.remove()
    if (el) el.style.display = 'none'
    document.title = 'Student Dashboard'
  }, 500)
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeacherStudentDashboardPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const selectedStudentId = useTeacher(s => s.selectedStudentId)
  const selectedGroupId = useTeacher(s => s.selectedGroupId)
  const studentTrainerStats = useTeacher(s => s.studentTrainerStats)

  const { groups } = useGroups()
  const { students } = useStudents(selectedGroupId)

  const group = groups.find(g => g.id === selectedGroupId) ?? null
  const student = students.find(s => s.id === selectedStudentId) ?? null

  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrolled((e.currentTarget as HTMLElement).scrollTop > 80)
  }, [])

  const [diagResults, setDiagResults] = useState<AnonDiagResult[]>([])
  useEffect(() => {
    loadAnonResults().then(all => setDiagResults(all.filter(r => r.linkedStudentId === selectedStudentId)))
  }, [selectedStudentId])

  if (!student || !group) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
        Ученик не найден
      </div>
    )
  }

  const totalTrainer = studentTrainerStats?.totalCount ?? MOCK_TRAINER_SECTIONS.reduce((a, s) => a + s.total, 0)
  const correctTrainer = studentTrainerStats?.doneCount ?? MOCK_TRAINER_SECTIONS.reduce((a, s) => a + s.correct, 0)
  const wrongTrainer = studentTrainerStats?.wrongCount ?? (totalTrainer - correctTrainer)
  const hwAvg = MOCK_HW_HISTORY.filter(h => !h.returned).reduce((a, h) => a + (h.score / h.maxScore) * 100, 0) / MOCK_HW_HISTORY.filter(h => !h.returned).length
  const attendedCount = MOCK_LESSONS.filter(l => l.attended).length

  return (
    <>
      {/* Floating side buttons — outside motion.div so position:fixed works vs viewport */}
      <AnimatePresence>
        {scrolled && (
          <>
            <motion.button
              key="side-back"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setActivePage('groups')}
              style={{
                position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)',
                zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '12px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: 'rgba(var(--glass-rgb), 0.88)', backdropFilter: 'blur(14px)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.14)', color: 'var(--color-text-3)',
                fontSize: 10, fontWeight: 600, transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)' }}
            >
              <ArrowLeft size={16} />
              <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 0.3 }}>Назад</span>
            </motion.button>

            <motion.button
              key="side-pdf"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => printStudentCard(student.name)}
              style={{
                position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)',
                zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '12px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: 'rgba(var(--glass-rgb), 0.88)', backdropFilter: 'blur(14px)',
                boxShadow: '0 4px 18px rgba(0,0,0,0.14)', color: 'var(--color-text-3)',
                fontSize: 10, fontWeight: 600, transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = group.color }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)' }}
            >
              <Download size={16} />
              <span style={{ writingMode: 'vertical-rl', letterSpacing: 0.3 }}>PDF</span>
            </motion.button>
          </>
        )}
      </AnimatePresence>

      <motion.div
        ref={scrollRef}
        onScroll={onScroll}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        style={{ flex: 1, overflowY: 'auto', marginTop: -100, paddingTop: 100, minHeight: 0 }}
      >
      {/* Hidden print container */}
      <div id="student-dashboard-print" style={{ display: 'none', fontFamily: 'system-ui, sans-serif', color: '#111' }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>{student.name}</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>Группа: {group.name} · Цель: {student.desiredScore} баллов</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <tbody>
            {[
              ['Телефон', student.phone],
              student.telegramLink ? ['Telegram', `@${student.telegramLink}`] : null,
              ['Начало занятий', student.startedAt],
              ['Последний вход', student.lastVisit],
              ['ДЗ (средний балл)', `${Math.round(hwAvg)}%`],
              ['Тесты', `${student.testScore}%`],
              student.trialScore != null ? ['Пробник', `${student.trialScore}%`] : null,
              ['Посещаемость', `${student.attendance}%`],
              ['Тренажёр: верно', `${correctTrainer} из ${totalTrainer}`],
              ['Тренажёр: ошибок', String(wrongTrainer)],
            ].filter(Boolean).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 8px', color: '#666', width: 180 }}>{row![0]}</td>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{row![1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2 style={{ fontSize: 15, marginBottom: 8 }}>Тренажёр — по разделам</h2>
        {MOCK_TRAINER_SECTIONS.map(s => (
          <div key={s.section} style={{ marginBottom: 6 }}>
            <span>{s.section}: </span>
            <strong>{s.correct}/{s.total} ({Math.round(s.correct / s.total * 100)}%)</strong>
          </div>
        ))}
        <h2 style={{ fontSize: 15, marginBottom: 8, marginTop: 16 }}>История домашних работ</h2>
        {MOCK_HW_HISTORY.map((h, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            {h.title} · {h.date} — {h.returned ? 'Возвращено' : `${h.score}/${h.maxScore}`}
          </div>
        ))}
        <p style={{ color: '#999', fontSize: 11, marginTop: 24 }}>Сформировано автоматически · {new Date().toLocaleDateString('ru-RU')}</p>
      </div>

      <div style={{ padding: '0 64px 56px' }}>

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 24, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setActivePage('groups')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 12, border: 'none', background: 'rgba(var(--glass-rgb), 0.80)', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600, backdropFilter: 'blur(12px)', transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-3)' }}
          >
            <ArrowLeft size={14} />
            Назад к группам
          </button>
          <button
            onClick={() => printStudentCard(student.name)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 12, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.80)', cursor: 'pointer', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, backdropFilter: 'blur(12px)', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = group.color; (e.currentTarget as HTMLElement).style.color = group.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)' }}
          >
            <Download size={14} />
            Скачать PDF
          </button>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: '28px 32px', borderRadius: 24, marginBottom: 20,
          background: `linear-gradient(135deg, ${group.color}18, ${group.color}08)`,
          border: `1px solid ${group.color}33`,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <Avatar student={student} group={group} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 750, color: 'var(--color-text)', marginBottom: 6 }}>{student.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: group.color + '33', borderRadius: 8, padding: '3px 10px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: group.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{group.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>с {student.startedAt}</span>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Цель: {student.desiredScore} баллов</span>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Последний вход: {student.lastVisit || '—'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`tel:${student.phone}`} style={{ width: 38, height: 38, borderRadius: '50%', background: `${group.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: group.color, textDecoration: 'none' }} title={student.phone}><Phone size={15} /></a>
            {student.telegramLink && (
              <a href={`https://t.me/${student.telegramLink}`} target="_blank" rel="noreferrer" style={{ width: 38, height: 38, borderRadius: '50%', background: `${group.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: group.color, textDecoration: 'none' }} title={`@${student.telegramLink}`}><Send size={15} /></a>
            )}
            {student.parentContact && (
              <a href={`tel:${student.parentContact}`} style={{ width: 38, height: 38, borderRadius: '50%', background: `${group.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: group.color, textDecoration: 'none' }} title={`Родитель: ${student.parentContact}`}><User size={15} /></a>
            )}
          </div>
        </div>

        {/* ── KPI summary row ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: ClipboardCheck, label: 'ДЗ', value: `${student.hwScore}%`, color: '#5FD68A', bg: 'var(--color-green-soft)' },
            { icon: TrendingUp,     label: 'Тесты', value: `${student.testScore}%`, color: '#B98FFF', bg: '#EFE0FF' },
            { icon: Award,          label: 'Пробник', value: student.trialScore != null ? `${student.trialScore}%` : '—', color: '#F5A623', bg: '#FFF3D6' },
            { icon: Clock,          label: 'Посещаемость', value: `${student.attendance}%`, color: student.attendance >= 90 ? '#34C877' : student.attendance >= 70 ? '#F5A623' : '#F48B91', bg: student.attendance >= 90 ? 'var(--color-green-soft)' : student.attendance >= 70 ? '#FFF3D6' : 'var(--color-red-soft)' },
            { icon: Target,         label: 'Тренажёр', value: `${correctTrainer}/${totalTrainer}`, color: '#6D9BFF', bg: '#DCE8FF' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 16, background: bg, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon size={12} style={{ color }} />
                <span style={{ fontSize: 10, color, opacity: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 750, color, lineHeight: 1 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── Two-column grid ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Показатели */}
            <Card>
              <SectionHeader icon={BarChart3} label="Показатели" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ScoreBar label="Домашние задания" icon={ClipboardCheck} value={student.hwScore} color="#5FD68A" bg="#D6F5E3" />
                <ScoreBar label="Тесты" icon={TrendingUp} value={student.testScore} color="#B98FFF" bg="#EFE0FF" />
                {student.trialScore != null && <ScoreBar label="Пробный экзамен" icon={Award} value={student.trialScore} color="#F5A623" bg="#FFF3D6" />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: student.attendance >= 90 ? '#D6F5E3' : student.attendance >= 70 ? '#FFF3D6' : '#FFE0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={13} strokeWidth={2} style={{ color: student.attendance >= 90 ? '#5FD68A' : student.attendance >= 70 ? '#F5A623' : '#F48B91' }} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1 }}>Посещаемость</span>
                  <span style={{ fontSize: 16, fontWeight: 750, color: student.attendance >= 90 ? 'var(--color-green-text)' : student.attendance >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)' }}>{student.attendance}%</span>
                </div>
              </div>
            </Card>

            {/* Динамика балла */}
            <Card>
              <SectionHeader icon={Percent} label="Динамика балла" />
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
                {MOCK_SCORE_DYNAMICS.map((val, i) => {
                  const h = (val / 100) * 64
                  const isLast = i === MOCK_SCORE_DYNAMICS.length - 1
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: h }}
                        transition={{ duration: 0.5, delay: i * 0.04 }}
                        style={{ width: '100%', borderRadius: 4, background: isLast ? group.color : group.color + '66', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 9, color: isLast ? 'var(--color-text)' : 'var(--color-muted)', fontWeight: isLast ? 700 : 400 }}>{val}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>Нач. занятий</span>
                <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>Сейчас</span>
              </div>
            </Card>

            {/* История ДЗ */}
            <Card>
              <SectionHeader icon={BookOpen} label="История домашних работ" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MOCK_HW_HISTORY.map((hw, i) => {
                  const pct = hw.returned ? 0 : Math.round((hw.score / hw.maxScore) * 100)
                  const color = hw.returned ? '#F48B91' : pct >= 80 ? '#34C877' : pct >= 50 ? '#F5A623' : '#F48B91'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: hw.returned ? 'var(--color-red-soft)' : pct === 100 ? 'var(--color-green-soft)' : 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {hw.returned ? <AlertCircle size={12} style={{ color: '#F48B91' }} /> : pct === 100 ? <CheckCheck size={12} style={{ color: '#34C877' }} /> : <CheckCircle2 size={12} style={{ color: 'var(--color-muted)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hw.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 1 }}>{hw.date}</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: 8, background: hw.returned ? 'var(--color-red-soft)' : pct >= 80 ? '#E8F7EF' : '#FFF3D6', color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {hw.returned ? 'Возврат' : `${hw.score}/${hw.maxScore}`}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'var(--color-bg-5)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Средний балл за ДЗ</span>
                <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 750, color: hwAvg >= 80 ? 'var(--color-green-text)' : hwAvg >= 60 ? 'var(--color-yellow-text)' : 'var(--color-red-text)' }}>{Math.round(hwAvg)}%</span>
              </div>
            </Card>

            {/* История занятий */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Calendar size={14} style={{ color: 'var(--color-muted)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>История занятий</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>Посетил {attendedCount}/{MOCK_LESSONS.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {MOCK_LESSONS.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: l.attended ? 'var(--color-bg)' : 'var(--color-red-soft)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.attended ? '#34C877' : '#F48B91', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>{l.topic}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-muted)', flexShrink: 0 }}>{l.date}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Оплата и заметки */}
            {(student.paymentDue || student.debt || student.comment) && (
              <Card>
                {(student.paymentDue || student.debt) && (
                  <div style={{ marginBottom: student.comment ? 16 : 0 }}>
                    <SectionHeader icon={CreditCard} label="Оплата" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {student.paymentDue && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Следующий платёж</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{student.paymentDue}</span>
                        </div>
                      )}
                      {student.paymentAmount && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Сумма</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{student.paymentAmount?.toLocaleString('ru')} ₽</span>
                        </div>
                      )}
                      {student.debt != null && student.debt > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 10, background: 'var(--color-red-soft)' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-red-text)', fontWeight: 600 }}>Долг</span>
                          <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--color-red-text)' }}>{student.debt.toLocaleString('ru')} ₽</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {student.comment && (
                  <div>
                    <SectionHeader icon={MessageSquare} label="Заметки" />
                    <p style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.6, margin: 0, background: 'var(--color-bg)', padding: '10px 12px', borderRadius: 10 }}>{student.comment}</p>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Тренажёр сводка */}
            <Card>
              <SectionHeader icon={Dumbbell} label="Тренажёр — сводка" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { val: totalTrainer, label: 'Задач', color: 'var(--color-text)', bg: 'var(--color-bg)' },
                  { val: correctTrainer, label: 'Верно', color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
                  { val: wrongTrainer, label: 'Ошибок', color: 'var(--color-red-text)', bg: 'var(--color-red-soft)' },
                  { val: 7, label: 'Занятий', color: '#B98FFF', bg: '#EFE0FF' },
                ].map(({ val, label, color, bg }) => (
                  <div key={label} style={{ padding: '10px 12px', borderRadius: 14, background: bg, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 750, color, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 10, color, opacity: 0.7, marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_TRAINER_SECTIONS.map(s => <SectionRow key={s.section} {...s} />)}
              </div>
            </Card>

            {/* Задания с ошибками */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <XCircle size={14} style={{ color: 'var(--color-red-text)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Задания с ошибками</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Нажмите → дать похожие</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {MOCK_WRONG_TASKS.map(t => (
                  <div key={t.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-red-soft)', border: '1px solid rgba(244,139,145,0.25)', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,139,145,0.18)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-red-soft)' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'rgba(244,139,145,0.35)', color: 'var(--color-red-text)', flexShrink: 0 }}>#{t.id}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>{t.topic}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>Линия {t.line}</span>
                    <CheckCircle2 size={13} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 12, background: 'rgba(155,109,255,0.08)', border: '1px solid rgba(155,109,255,0.2)', fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                💡 Данные появятся автоматически, когда ученик занимается в тренажёре под своим аккаунтом.
              </div>
            </Card>

            {/* Диагностика + Скрининг мышления */}
            {diagResults.length > 0 && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                  <Target size={14} style={{ color: 'var(--color-accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Диагностика и скрининг</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-purple-soft)', borderRadius: 7, padding: '2px 8px' }}>{diagResults.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {diagResults.map(r => {
                    const sections = Object.entries(r.results)
                    const totalQ = sections.reduce((a, [, v]) => a + v.total, 0)
                    const correct = sections.reduce((a, [, v]) => a + v.correct, 0)
                    const pct = totalQ ? Math.round((correct / totalQ) * 100) : 0
                    const isLogic = r.subject === 'logic'
                    const accent = isLogic ? '#f59e0b' : r.subject === 'biology' ? '#22c55e' : '#7c3aed'
                    const soft = isLogic ? '#fef3c7' : r.subject === 'biology' ? 'var(--color-green-soft)' : 'var(--color-purple-soft)'
                    const label = isLogic ? 'Скрининг мышления' : r.subject === 'biology' ? 'Биология' : 'Химия'
                    const date = new Date(r.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
                    const pctColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'

                    // For logic test: sort sections by score desc, show top skill
                    const sortedSections = isLogic
                      ? [...sections].sort((a, b) => {
                          const pa = a[1].total ? a[1].correct / a[1].total : 0
                          const pb = b[1].total ? b[1].correct / b[1].total : 0
                          return pb - pa
                        })
                      : sections
                    const topSection = isLogic ? sortedSections[0] : null

                    return (
                      <div key={r.id} style={{ borderRadius: 14, border: `1px solid ${accent}22`, overflow: 'hidden' }}>
                        {/* Header */}
                        <div style={{ padding: '12px 14px', background: soft, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isLogic ? <Brain size={15} style={{ color: accent }} />
                              : r.subject === 'biology' ? <FlaskConical size={15} style={{ color: accent }} />
                              : <Atom size={15} style={{ color: accent }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                              {date}
                              {isLogic && topSection && (
                                <span style={{ marginLeft: 6, color: accent, fontWeight: 600 }}>
                                  · сильнее: {topSection[0]}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: pctColor }}>{pct}%</div>
                        </div>
                        {/* Section bars */}
                        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {sortedSections.map(([sec, { correct: c, total: t }]) => {
                            const p = t ? Math.round((c / t) * 100) : 0
                            const col = p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
                            return (
                              <div key={sec}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                  <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 500, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sec}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{c}/{t}</span>
                                </div>
                                <div style={{ height: 4, borderRadius: 999, background: 'var(--color-bg-5)' }}>
                                  <div style={{ height: '100%', borderRadius: 999, background: col, width: `${p}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Активность */}
            <Card>
              <SectionHeader icon={Star} label="Активность (28 дней)" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: 28 }, (_, i) => {
                  const heat = [0, 0, 1, 2, 0, 3, 1, 0, 0, 2, 1, 0, 0, 3, 2, 0, 1, 0, 2, 1, 0, 0, 3, 1, 0, 2, 0, 1][i] ?? 0
                  const bg = heat === 0 ? 'var(--color-bg-5)' : heat === 1 ? '#C8EFD9' : heat === 2 ? '#7EDA9F' : '#34C877'
                  return <div key={i} style={{ height: 22, borderRadius: 5, background: bg }} />
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>Меньше</span>
                {['var(--color-bg-5)', '#C8EFD9', '#7EDA9F', '#34C877'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
                ))}
                <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>Больше</span>
              </div>
            </Card>

            {/* Слабые темы */}
            <Card>
              <SectionHeader icon={Layers} label="Слабые темы для проработки" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_TRAINER_SECTIONS.filter(s => s.correct / s.total < 0.5).map(s => {
                  const pct = Math.round((s.correct / s.total) * 100)
                  return (
                    <div key={s.section} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: pct < 30 ? 'var(--color-red-soft)' : '#FFF3D6', border: `1px solid ${pct < 30 ? 'rgba(244,139,145,0.3)' : 'rgba(245,166,35,0.3)'}` }}>
                      <AlertCircle size={13} style={{ color: pct < 30 ? 'var(--color-red-text)' : 'var(--color-yellow-text)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>{s.section}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pct < 30 ? 'var(--color-red-text)' : 'var(--color-yellow-text)' }}>{pct}%</span>
                    </div>
                  )
                })}
                {MOCK_TRAINER_SECTIONS.filter(s => s.correct / s.total < 0.5).length === 0 && (
                  <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--color-green-soft)', fontSize: 12, color: 'var(--color-green-text)', fontWeight: 600 }}>
                    ✓ Нет явно слабых тем — отличная равномерная подготовка
                  </div>
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </motion.div>
    </>
  )
}
