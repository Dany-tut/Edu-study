// Стенд банка заданий: «Число» и «Найди на экране» (dev-bank.html).
//
// ЗАЧЕМ. Конструктор банка без входа учителя в DEV не открывается, а сохранение
// в DEV идёт в localStorage (taskBankStore), не в базу. Здесь — тот же
// CreatorView в режиме задания и круг «сохранить → достать в домашку»:
//   ?view=editor (по умолчанию) — новое задание; ?edit=<id> — правка из банка;
//   ?view=bank — что лежит в банке (тип, ответ, payload);
//   ?view=flow — домашка ученика из заданий банка этих типов, тем же путём,
//     что у учителя: importBankTask → authoredTaskToQuestion → HomeworkFlow.
// ?p=pc|ipad|iphone|android — хром версии; ?theme=dark.
import './lib/platform'
import './store/studentDataStore'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { CreatorView } from './pages/teacher/TeacherConstructorPage'
import HomeworkFlow from './components/HomeworkFlow'
import { useTaskBank } from './store/taskBankStore'
import { importBankTask } from './lib/bankTaskImport'
import { authoredTaskToQuestion, type LessonHomework } from './data/lessonContent'
import { PLATFORM, type Platform } from './lib/platform'
import './index.css'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
const platform = (q.get('p') as Platform | null) ?? PLATFORM
document.documentElement.dataset.platform = platform
const view = q.get('view') ?? 'editor'
const phone = platform === 'iphone' || platform === 'android'
const NEW_TYPES = new Set(['numeric', 'screenHotspot'])

function Editor() {
  const tasks = useTaskBank(s => s.tasks)
  const load = useTaskBank(s => s.load)
  useEffect(() => { void load() }, [load])
  const editId = Number(q.get('edit'))
  const editing = editId ? tasks.find(x => x.id === editId) ?? null : null
  if (editId && !editing) return <div>Загрузка…</div>
  return (
    <CreatorView key={editing?.id ?? 'new'} initialMode="trainer" editingTask={editing}
      trainers={[]} widgets={[]}
      onSaveTrainer={() => { location.search = '?view=bank' + (q.get('theme') ? '&theme=' + q.get('theme') : '') }}
      onSaveCourse={() => {}} onSaveWidget={() => {}}
      onCancel={() => { location.search = '?view=bank' }} />
  )
}

function Bank() {
  const tasks = useTaskBank(s => s.tasks)
  const load = useTaskBank(s => s.load)
  useEffect(() => { void load(true) }, [load])
  const mine = tasks.filter(x => NEW_TYPES.has(String(x.answerType)))
  return (
    <div data-testid="bank" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {mine.map(x => (
        <div key={x.id} data-bank-id={x.id} style={{ padding: 12, borderRadius: 14, background: 'var(--color-bg-2)', fontSize: 12 }}>
          <b>#{x.id} · {x.answerType}</b> · answer={JSON.stringify(x.answer)} · <a href={`?edit=${x.id}`}>править</a>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '6px 0 0' }}>{JSON.stringify({ ...x.payload, hotspot: x.payload?.hotspot ? { ...(x.payload.hotspot as object), image: '…' } : undefined })}</pre>
        </div>
      ))}
      {!mine.length && <div>В банке нет заданий этих типов.</div>}
    </div>
  )
}

function Flow() {
  const tasks = useTaskBank(s => s.tasks)
  const load = useTaskBank(s => s.load)
  useEffect(() => { void load(true) }, [load])
  const mine = tasks.filter(x => NEW_TYPES.has(String(x.answerType)))
  if (!mine.length) return <div>В банке нет заданий этих типов.</div>
  const questions = mine.map((bt, i) => authoredTaskToQuestion(importBankTask(bt, `b${bt.id}`), i))
  const homework: LessonHomework = {
    title: 'Из банка', subtitle: 'Число и «Найди на экране»', recommendationScore: 2, hasHardLevel: false,
    levels: [
      { id: 'basic', title: 'Базовый', shortLabel: 'Базовый', kind: 'quiz', motivation: 'Задания из банка.', dueDate: '2026-11-30', estimatedMinutes: 3, questions },
      { id: 'hard', title: 'Сложный', shortLabel: 'Сложный', kind: 'teacher-review', optional: true, unlockScore: 2, motivation: '—', dueDate: '2026-11-30', estimatedMinutes: 5,
        teacherTask: { topic: '—', prompt: '—', teacherNote: '', placeholder: '', acceptedFormats: ['текст'] } },
    ],
  }
  return <HomeworkFlow lessonId="bank-stand" lessonTitle="Из банка" subject="Бухгалтерия" homework={homework} onBack={() => {}} />
}

createRoot(document.getElementById('root')!).render(
  <>
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: phone ? '56px 16px 32px' : platform === 'ipad' ? '40px 116px 40px 32px' : '24px 32px' }}>
      {view === 'editor' && <Editor />}
      {view === 'bank' && <Bank />}
      {view === 'flow' && <div style={{ maxWidth: 1100, margin: '0 auto' }}><Flow /></div>}
    </div>
  </>,
)
