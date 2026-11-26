// Стенд задания «Найди на экране» (dev-hotspot.html).
//
// ЗАЧЕМ. Задания этого типа есть только в курсе «Бухгалтерия», а живая домашка
// открывается лишь записанному ученику. Здесь — те же задания курса без базы:
//   ?view=solver (по умолчанию) — солвер, как в домашке;
//   ?view=flow — домашка целиком (HomeworkFlow) с заданиями типа;
//   ?view=editor — редактор областей; ?view=review — показ нажатий учителю.
// ?p=pc|ipad|iphone|android — хром версии; ?theme=dark; ?q=0..2 — какое задание.
import './lib/platform'
import './store/studentDataStore'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ScreenHotspotSolver, { HotspotReview } from './components/ScreenHotspotSolver'
import ScreenHotspotEditor from './components/teacher/ScreenHotspotEditor'
import HomeworkFlow from './components/HomeworkFlow'
import { PLATFORM, type Platform } from './lib/platform'
import { ACC_LESSONS } from './data/accounting/accountingLessons'
import type { HotspotSpec } from './lib/screenHotspot'
import type { LessonHomework } from './data/lessonContent'
import './index.css'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
const platform = (q.get('p') as Platform | null) ?? PLATFORM
document.documentElement.dataset.platform = platform
const view = q.get('view') ?? 'solver'

const tasks = ACC_LESSONS.flatMap(x => x.lesson.content.quiz.filter(t => t.type === 'screenHotspot').map(t => ({ lesson: x.lesson, t })))
const pick = tasks[Number(q.get('q') ?? 0) % tasks.length]
const phone = platform === 'iphone' || platform === 'android'

function Solver() {
  const [ans, setAns] = useState(q.get('ans') ?? '')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>Задание {Number(q.get('q') ?? 0) + 1} из {tasks.length} · Найди на экране</div>
      <h2 style={{ margin: 0, fontSize: phone ? 19 : 22, lineHeight: 1.3 }}>{pick.t.prompt}</h2>
      <ScreenHotspotSolver spec={pick.t.hotspot!} value={ans} onChange={setAns} platform={platform} />
      {ans && <button type="button" onClick={() => setAns('')} style={{ alignSelf: 'flex-start' }}>Сбросить</button>}
      <code data-testid="answer" style={{ fontSize: 11, color: 'var(--color-text-3)', wordBreak: 'break-all' }}>{ans}</code>
    </div>
  )
}

function Editor() {
  const [spec, setSpec] = useState<HotspotSpec | undefined>(q.get('empty') ? undefined : pick.t.hotspot)
  return <ScreenHotspotEditor value={spec} onChange={setSpec} accent={{ color: 'var(--color-green-text)', bg: 'var(--color-green-soft)', fill: 'var(--color-green-fill)' }} />
}

const homework: LessonHomework = {
  title: 'Найди на экране', subtitle: 'Бухгалтерия', recommendationScore: 2, hasHardLevel: false,
  levels: [
    { id: 'basic', title: 'Базовый', shortLabel: 'Базовый', kind: 'quiz', motivation: 'Задания курса этого типа.', dueDate: '2026-11-30', estimatedMinutes: 3, questions: tasks.map(x => x.t) },
    { id: 'hard', title: 'Сложный', shortLabel: 'Сложный', kind: 'teacher-review', optional: true, unlockScore: 2, motivation: '—', dueDate: '2026-11-30', estimatedMinutes: 5,
      teacherTask: { topic: '—', prompt: '—', teacherNote: '', placeholder: '', acceptedFormats: ['текст'] } },
  ],
}

createRoot(document.getElementById('root')!).render(
  <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: phone ? '56px 16px 32px' : platform === 'ipad' ? '40px 116px 40px 32px' : '40px 32px' }}>
    <div style={{ maxWidth: view === 'flow' ? 1100 : 760, margin: '0 auto' }}>
      {view === 'solver' && <Solver />}
      {view === 'editor' && <Editor />}
      {view === 'review' && <HotspotReview spec={pick.t.hotspot!} answer={q.get('ans') ?? '{"taps":[{"x":0.38,"y":0.21,"zoom":1,"min":24},{"x":0.54,"y":0.23,"zoom":1,"min":24}]}'} />}
      {view === 'flow' && <HomeworkFlow lessonId="hs-stand" lessonTitle="Найди на экране" subject="Бухгалтерия" homework={homework} onBack={() => {}} />}
    </div>
  </div>,
)
