import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import { RightPanelLessons, type CourseEdData } from '../../src/pages/teacher/TeacherCourseEditorPage'
import { useCourseVisibility, loadCourseVisibility } from '../../src/lib/courseVisibility'
import { visibleCourseModules, type CourseVisibilityRow } from '../../src/lib/courseVisibilityModel'
import { fixtureServer } from './supabase'

const modules = [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', label: 'Зоология', lessons: [{ short_id: 'a-1', title: 'Класс Птицы' }, { short_id: 'a-2', title: 'Класс Млекопитающие' }] },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', label: 'Ботаника', lessons: [{ short_id: 'b-1', title: 'Семенные растения' }] }]
function Fixture() {
  const [course, setCourse] = useState('course-a')
  const visibility = useCourseVisibility(course)
  const [calls, setCalls] = useState(0), [fail, setFail] = useState(false), [open, setOpen] = useState(false)
  const [motion, setMotion] = useState({ status: 'ready', frames: 0, maxShift: 0 })
  useEffect(() => {
    let frame = 0
    const observe = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.course-visibility-button')) return
      cancelAnimationFrame(frame)
      const rows = [...document.querySelectorAll('.course-visibility-row')]
      const initial = rows.map(row => row.getBoundingClientRect())
      const start = performance.now(); let frames = 0, maxShift = 0
      setMotion({ status: 'running', frames: 0, maxShift: 0 })
      const sample = () => {
        frames++
        rows.forEach((row, i) => { const r = row.getBoundingClientRect(), old = initial[i]
          maxShift = Math.max(maxShift, Math.abs(r.x-old.x), Math.abs(r.y-old.y), Math.abs(r.width-old.width), Math.abs(r.height-old.height))
        })
        if (performance.now()-start < 850) frame = requestAnimationFrame(sample)
        else setMotion({ status: 'done', frames, maxShift })
      }
      frame = requestAnimationFrame(sample)
    }
    document.addEventListener('pointerdown', observe, true)
    return () => { document.removeEventListener('pointerdown', observe, true); cancelAnimationFrame(frame) }
  }, [])
  const [selected, setSelected] = useState<string | null>('a-1')
  const [editorCourse, setEditorCourse] = useState<CourseEdData>(() => ({
    id: 'course-a', dbCourseId: 'course-a', title: 'Биология ЕГЭ', subject: 'Биология', level: 'ЕГЭ', status: 'published',
    color: 'var(--color-green-text)', bg: 'var(--color-green-soft)', groupIds: [], studentIds: [],
    modules: modules.map(m => ({ id: m.id, label: m.label, expanded: true, lessonIds: m.lessons.map(l => l.short_id) })),
    lessons: modules.flatMap(m => m.lessons).map((l, i) => ({ id: l.short_id, persistedShortId: l.short_id, title: l.title, number: i + 1 })),
  }))
  useEffect(() => { const update = () => setCalls(fixtureServer.calls); window.addEventListener('visibility-fixture', update); return () => window.removeEventListener('visibility-fixture', update) }, [])
  const rows: CourseVisibilityRow[] = Object.entries(visibility.values).map(([key, hidden]) => {
    const split = key.indexOf(':'); return { item_kind: key.slice(0, split) as 'module'|'lesson', item_key: key.slice(split + 1), hidden }
  })
  return <div style={{ padding: 16, maxWidth: 900, margin: 'auto', color: 'var(--color-text)' }}>
    <h1>Видимость · изолированный стенд</h1>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBlock: 16 }}>
      <button type="button" onClick={() => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' }}>Тема</button>
      <button type="button" onClick={() => setCourse(course === 'course-a' ? 'course-b' : 'course-a')}>Другой курс</button>
      <button type="button" onClick={() => { fixtureServer.mode = fail ? 'ok' : 'fail'; setFail(!fail) }}>Ошибка: {fail ? 'да' : 'нет'}</button>
      <button type="button" onClick={() => void loadCourseVisibility(course)}>Обновить видимость</button>
      <output id="calls">{calls}</output><output id="course">{course}</output>
      <output id="motion" data-status={motion.status} hidden>{JSON.stringify(motion)}</output>
    </div>
    <section aria-label="Конструктор" style={{ border: '1px solid var(--color-border)', borderRadius: 22, height: 480, display: 'flex', maxWidth: 400 }}>
      <RightPanelLessons course={{ ...editorCourse, id: course, dbCourseId: course }} setCourse={setEditorCourse}
        selectedLessonId={selected} onSelectLesson={setSelected} openLessonShortIds={new Set(open ? ['a-1'] : [])}
        lessonShortIdById={Object.fromEntries(editorCourse.lessons.map(l => [l.id, l.persistedShortId ?? l.id]))} />
    </section>
    <button type="button" aria-pressed={open} onClick={() => setOpen(!open)} style={{ marginBlock: 16 }}>Прохождение: {open ? 'открыто' : 'закрыто'}</button>
    <section aria-label="Трек ученика" style={{ border: '1px solid var(--color-border)', borderRadius: 22, padding: 16 }}>
      {visibleCourseModules(editorCourse.modules.map(m => ({ ...m, lessons: m.lessonIds.flatMap(id => {
        const l = editorCourse.lessons.find(l => l.id === id); return l ? [{ short_id: l.persistedShortId ?? l.id, title: l.title }] : []
      }) })), rows).map(module => <div key={module.id}><h2>{module.label}</h2>
        {module.lessons.map(lesson => <p key={lesson.short_id}>{lesson.title} · {open ? 'Можно проходить' : 'Пока закрыт'}</p>)}
      </div>)}
    </section>
  </div>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
