import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import CourseVisibilityButton from '../../src/components/teacher/CourseVisibilityButton'
import { useCourseVisibility, loadCourseVisibility } from '../../src/lib/courseVisibility'
import { visibleCourseModules, type CourseVisibilityRow } from '../../src/lib/courseVisibilityModel'
import { fixtureServer } from './supabase'

const modules = [{ id: 'aaaaaaaa-0000-4000-8000-000000000001', label: 'Зоология', lessons: [{ short_id: 'a-1', title: 'Класс Птицы' }, { short_id: 'a-2', title: 'Класс Млекопитающие' }] },
  { id: 'aaaaaaaa-0000-4000-8000-000000000002', label: 'Ботаника', lessons: [{ short_id: 'b-1', title: 'Семенные растения' }] }]
function Fixture() {
  const [course, setCourse] = useState('course-a')
  const visibility = useCourseVisibility(course)
  const [calls, setCalls] = useState(0), [fail, setFail] = useState(false), [open, setOpen] = useState(false)
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
    </div>
    <section aria-label="Конструктор" style={{ border: '1px solid var(--color-border)', borderRadius: 22, padding: 16 }}>
      {modules.map(module => <div key={module.id}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><strong>{module.label}</strong>
          <CourseVisibilityButton course={course} kind="module" item={module.id} hidden={visibility.hidden('module', module.id)} disabled={!visibility.loaded || !!visibility.error} />
        </div>
        {module.lessons.map(lesson => <div key={lesson.short_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 }}>
          <span>{lesson.title}</span><CourseVisibilityButton course={course} kind="lesson" item={lesson.short_id} hidden={visibility.hidden('lesson', lesson.short_id)} inherited={visibility.hidden('module', module.id)} disabled={!visibility.loaded || !!visibility.error} />
        </div>)}
      </div>)}
    </section>
    <button type="button" aria-pressed={open} onClick={() => setOpen(!open)} style={{ marginBlock: 16 }}>Прохождение: {open ? 'открыто' : 'закрыто'}</button>
    <section aria-label="Трек ученика" style={{ border: '1px solid var(--color-border)', borderRadius: 22, padding: 16 }}>
      {visibleCourseModules(modules, rows).map(module => <div key={module.id}><h2>{module.label}</h2>
        {module.lessons.map(lesson => <p key={lesson.short_id}>{lesson.title} · {open ? 'Можно проходить' : 'Пока закрыт'}</p>)}
      </div>)}
    </section>
  </div>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
