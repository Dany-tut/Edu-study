import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { journalDemo } from '../../../data/courseJournalDemo'
import GroupStrip from '../GroupStrip'
import Modal from '../../Modal'
import { Matrix, ScopePicker, initial, type StandSelection } from './JournalStand'
import { buildStandIndex, scopeSlots, studentWorks, workStats } from './studentWorks'
import { wallDateTimeInTz } from '../../../lib/teacherTz'
import { shiftDay } from './overviewStats'
import { useNow } from '../../../lib/useNow'
import { StudentDashboardReport } from '../../../pages/teacher/TeacherStudentDashboardPage'
import { HomeworkNavigation, HomeworkTasks, useHomeworkHub, type HomeworkPage } from './HomeworkHub'
import { applyStandReview, nativeHomeworkReviewId, type HomeworkEntry, type ReviewDecision } from './homeworkStand'

import { addFullReviewExample, fullReviewExample, fullReviewAiExample, saveFullReviewExample, FULL_REVIEW_EXAMPLE_ID, FULL_REVIEW_EXAMPLE_TITLE } from './fullReviewExample'
import { handoffHomeworkReview } from './homeworkReviewHandoff'

const FullReviewEditor = lazy(() => import('../../../pages/teacher/TeacherHomeworkReviewPage').then(m => ({default:m.HomeworkReviewEditor})))
const StudentWidgetsStand = lazy(() => import('./StudentWidgetsStand'))
const ScheduleConceptStand = lazy(() => import('./ScheduleConceptStand'))
const DiaryStand = lazy(() => import('./diary/DiaryStand'))
type ExamplePage = HomeworkPage | 'widgets' | 'full-review' | 'schedule' | 'diary'

const letters = 'АБВГДЕЖЗ'.split('')
const given = ['Анна', 'Иван', 'Вера', 'Лев', 'Софья', 'Антон', 'Майя', 'Илья', 'Ника', 'Марк']
const family = ['Соколов', 'Титов', 'Белов', 'Орлов', 'Громов', 'Морозов', 'Жуков', 'Миронов']
function exampleData() {
  const data = journalDemo()
  const template = data.groups[0],
    student = data.students[0]
  data.groups = letters.map((letter, i) => ({
    ...template,
    id: 'example-group-' + i,
    name: 'ЕГЭ · группа ' + letter,
    studentCount: i % 2 === 0 ? 30 : 20,
  }))
  data.students = []
  data.events = []
  data.work = []
  data.attempts = []
  data.marks = []
  data.legacy = []
  for (const c of data.courses) {
    c.group_ids = data.groups.map((g) => g.id)
    c.student_ids = []
  }
  for (const group of data.groups) {
    for (let i = 0; i < group.studentCount; i++) {
      const id = group.id + '-' + i
      const surname = family[(Math.floor(i / 10) + i) % family.length] + (i % 2 === 0 ? 'а' : '')
      data.students.push({
        ...student,
        id,
        groupId: group.id,
        name: given[i % 10] + ' ' + surname,
        personId: id,
        authUserId: undefined,
      })
    }
  }
  const today = wallDateTimeInTz(new Date().toISOString(), 'Europe/Moscow').day
  const day = (offset: number) => shiftDay(today, offset)
  function submit(id: string, ref: string, types: string[], score: number, date: string, status = 'completed') {
    const submitted = date + 'T15:00:00Z'
    const workId = id + ':' + ref
    const number = Math.max(0, ...data.attempts.filter(a => a.student_id === id && a.lesson_ref === ref).map(a => a.number)) + 1
    const attemptId = workId + ':attempt-' + number
    const manual = status === 'submitted'
    data.work = data.work.filter(w => w.id !== workId)
    data.work.push({
      id: workId, student_id: id, lesson_ref: ref, status, score, updated_at: submitted,
      attachments: { v: 'basic-1', recommendationScore: 80, attemptId, reviewRequired: manual, gradable:types.length, correct:score / 100 * types.length,
        rows: [...types.map((type, n) => ({
        n:n+1, type, prompt:type === 'testly' ? 'Тест по теме урока' : 'Расставьте коэффициенты: Fe₂O₃ + CO → Fe + CO₂',
        answer:score >= 80 ? 'Fe₂O₃ + 3CO → 2Fe + 3CO₂' : 'Fe₂O₃ + CO → Fe + CO₂', correct:'Fe₂O₃ + 3CO → 2Fe + 3CO₂', verdict: score >= 80 ? 'correct' : 'wrong',
        ...(type === 'testly' ? { testly: { got: score, max: 100, testId: 'example-' + ref, submittedAt: submitted } } : {}),
      })), ...(manual ? [{n:types.length+1,type:'write',prompt:'Объясните, что происходит с железом в этой реакции.',answer:'Железо принимает электроны: степень окисления меняется с +3 до 0.',verdict:'review'}] : [])] },
    })
    data.attempts.push({ id: attemptId, student_id: id, lesson_ref: ref, number, status, score:manual ? null : score,
      passing_score: 80, submitted_at: submitted, review_comment: null })
  }
  const chemistry = ['Строение атома', 'ОВР', 'Химическая связь', 'Химическое равновесие',
    'Баланс в ОВР', 'Расчёт равновесия', 'Неорганические вещества', 'Итоговый тест']
  const deadlines = [-25, -22, -19, -16, -5, -2, 2, 5]
  const followups = [-12, -9, -5, -2]
  for (const l of data.lessons) {
    const i = l.position
    const chem = l.course_id === 'demo-chem'
    const types = i % 3 === 0 ? ['single', 'testly'] : i % 3 === 1 ? ['single'] : ['testly']
    const extraTypes = i % 2 === 0 ? ['single'] : ['testly']
    l.hwTask = types.map(type => ({type}))
    if (chem) {
      l.title = chemistry[i]
      l.scheduled_date = day(deadlines[i] - 2)
      l.hwDate = day(deadlines[i])
      if (i < 4) l.extraHw = [{id:'practice', date:day(followups[i]), tasks:extraTypes.map(type => ({type}))}]
    }
    const course = data.courses.find(c => c.id === l.course_id)!
    for (const group of data.groups) {
      const id = group.id + ':' + l.id
      data.events.push({id, lesson_id:l.id, node_type:'lesson', group_id:group.id, student_id:null,
        date:l.scheduled_date!, time_start:l.scheduled_time!, time_end:null, lesson_title:l.title,
        subject:course.subject, status:l.scheduled_date! < today ? 'completed' : 'upcoming'})
      if (i < 4) {
        const members = data.students.filter(s => s.groupId === group.id)
        data.marks.push({schedule_id:id, attendance:Object.fromEntries(members.map((s,j) => [s.id,(j+i)%7!==3]))})
      }
    }
    for (const [j, s] of data.students.entries()) {
      if (i >= 6 || j % 29 === 2) continue
      const spotlight = chem && s.id === 'example-group-0-3'
      if (spotlight) {
        if (i < 4) {
          submit(s.id, l.short_id, types, [82,30,66,70][i], day(deadlines[i] + Number(i === 3)))
          submit(s.id, l.short_id+'~practice', extraTypes, [90,54,86,82][i], day(followups[i]))
        }
        continue
      }
      const seed = j * 11 + i * 7
      const baseline = chem && i === 1 && j % 3 !== 0 ? 46 : 61
      if (seed % 13 !== 0) {
        const score = Math.min(100, baseline + seed % 37)
        submit(s.id, l.short_id, types, score, shiftDay(l.hwDate!, seed % 9 === 0 ? 1 : 0),
          seed % 23 === 0 ? 'returned' : 'completed')
      }
      if (chem && i < 4 && seed % 17 !== 0) {
        const score = Math.min(100, baseline + 3 + (seed + j) % 36)
        submit(s.id, l.short_id+'~practice', extraTypes, score, day(followups[i] + Number(seed % 11 === 0)))
      }
    }
  }
  // A few actual submitted snapshots exercise one queue across several groups.
  for (const group of data.groups.slice(0, 2)) {
    for (const i of [1, 3]) {
      const lesson = data.lessons.find(l => l.course_id === 'demo-chem' && l.position === i)
      if (lesson) submit(group.id + (i === 1 ? '-0' : '-2'), lesson.short_id, i === 1 ? ['single'] : ['single', 'testly'], 75,
        day(-1), 'submitted')
    }
  }
  return addFullReviewExample(data, today)
}
const pageFromHash = (): ExamplePage => window.location.hash.startsWith('#/teacher/homework-review') ? 'full-review' : window.location.hash === '#/student/diary' ? 'diary' : window.location.hash === '#/student/schedule' ? 'schedule' : window.location.hash === '#/student/widgets' ? 'widgets' : window.location.hash === '#/teacher' ? 'home' : 'journal'
// A separate in-memory example lets a teacher with no groups inspect the scrolling strip.
export default function ExampleGroups() {
  const [data, setData] = useState(exampleData)
  const [s, setState] = useState<StandSelection>({ ...initial, course: 'demo-chem', strip: 'groups' })
  const change = (v: Partial<StandSelection>) => setState((p) => ({ ...p, ...v }))
  const [gid, setGroup] = useState(data.groups[0].id)
  const [add, setAdd] = useState<'groups' | 'students' | null>(null)
  const [name, setName] = useState('')
  const [page, setPage] = useState<ExamplePage>(pageFromHash)
  const [reviewStudent, setReviewStudent] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('student') ?? 'example-group-0-0')
  const [reviewReturn, setReviewReturn] = useState<HomeworkPage>('journal')
  const fullReview = useMemo(() => fullReviewExample(data), [data])
  const [aiDemoState,setAiDemoState] = useState('original')
  const aiExample = useMemo(() => {
    const rows=fullReviewAiExample(fullReview.submissions)
    if(aiDemoState==='original')return rows
    for(const [id,grade] of rows)rows.set(id,{...grade,status:['pending','working'].includes(aiDemoState)?aiDemoState as 'pending'|'working':'error',error:aiDemoState,score:null,comment:'',tasks:[]})
    return rows
  }, [fullReview,aiDemoState])
  const reviewIdx = Math.max(0, fullReview.submitters.findIndex(s => s.id === reviewStudent))
  const pos = useRef({ top: 0, left: 0 })
  const today = wallDateTimeInTz(useNow(60_000).toISOString(), 'Europe/Moscow').day
  async function saveReview(entry: HomeworkEntry, decision: ReviewDecision) {
    setData(applyStandReview(data, entry, decision))
  }
  const homework = useHomeworkHub(data, today, saveReview, entry => {
    if (entry.student.groupId) setGroup(entry.student.groupId)
    change({course:entry.work.slot.course,module:'',strip:entry.student.groupId ? 'groups' : 'students',student:entry.student.id,workRef:entry.work.slot.ref,tab:'Работы',search:''})
    navigate('journal')
  }, (entry, draft) => {
    if (entry.work.slot.ref !== 'hw-' + FULL_REVIEW_EXAMPLE_ID || nativeHomeworkReviewId(data, entry) !== FULL_REVIEW_EXAMPLE_ID) return false
    handoffHomeworkReview(FULL_REVIEW_EXAMPLE_ID, entry.student.id, draft)
    setReviewStudent(entry.student.id)
    setReviewReturn(page === 'home' ? page : 'journal')
    navigate('full-review', entry.student.id)
    return true
  })
  function navigate(next: ExamplePage, studentId = reviewStudent) {
    setPage(next)
    const hash = next === 'full-review' ? '#/teacher/homework-review?student=' + encodeURIComponent(studentId) : next === 'diary' ? '#/student/diary' : next === 'schedule' ? '#/student/schedule' : next === 'widgets' ? '#/student/widgets' : next === 'home' ? '#/teacher' : '#/teacher/gradebook'
    if (window.location.hash !== hash) window.history.pushState(null, '', hash)
  }
  useEffect(() => {
    const sync = () => {setPage(pageFromHash());const student = new URLSearchParams(window.location.hash.split('?')[1]).get('student');if(student)setReviewStudent(student)}
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {window.removeEventListener('popstate', sync);window.removeEventListener('hashchange', sync)}
  }, [])
  const index = useMemo(() => buildStandIndex(data), [data])
  const slots = useMemo(() => scopeSlots(index, s), [index, s.course, s.module])
  const entries = useMemo(
    () =>
      data.students
        .filter((v) => (s.strip === 'students' || v.groupId === gid) && (s.course === '*' || index.roster.get(s.course)?.has(v.id)))
        .map((student) => {
          const works = studentWorks(data, index, student, slots, today)
          return { student, works, stats: workStats(works, today) }
        }),
    [data, index, slots, today, s.strip, s.course, gid]
  )
  const picker = <ScopePicker value={s} data={data} onChange={change} />
  function addExample() {
    const title = name.trim()
    if (!title) return
    const id = crypto.randomUUID()
    if (add === 'groups') {
      setData((d) => ({
        ...d,
        groups: [...d.groups, { ...d.groups[0], id, name: title, studentCount: 0 }],
        courses: d.courses.map((c) => ({ ...c, group_ids: [...(c.group_ids ?? []), id] })),
      }))
      setGroup(id)
      change({ strip: 'groups' })
    } else {
      setData((d) => ({
        ...d,
        students: [...d.students, { ...d.students[0], id, name: title, personId: id, groupId: gid }],
        groups: d.groups.map((g) => (g.id === gid ? { ...g, studentCount: g.studentCount + 1 } : g)),
      }))
    }
    setAdd(null)
    setName('')
  }
  return (
    <main className={'js-example' + (page === 'widgets' ? ' js-example--widgets' : '')}>
      <div className="js-example-label">
        Пример с учебными данными · изменения до обновления страницы{' '}
        <a className="sw-stand-link" href="#/student/widgets" onClick={event => {event.preventDefault();navigate('widgets')}}>Виджеты ученика</a>
        <a href="#/student/schedule" onClick={event => {event.preventDefault();navigate('schedule')}}>Расписание ученика</a>
        <a href="#/student/diary" onClick={event => {event.preventDefault();navigate('diary')}}>Дневник</a>
        <a href="/journal-stand/?example=live#/teacher/gradebook">Мой журнал</a>
      </div>
      {page === 'widgets' || page === 'schedule' || page === 'diary' ? <div className="sw-backbar"><button type="button" className="cj-button" onClick={() => navigate('journal')}>← К журналу</button><span>{page === 'diary' ? 'Концепты дневника' : page === 'schedule' ? 'Концепты расписания' : 'Концепты ученика'}</span></div>
        : page !== 'full-review' && <HomeworkNavigation page={page} onChange={navigate}/>}
      {(page === 'journal' || page === 'home') && <div className="course-journal" style={{margin:'0 28px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <button type="button" className="cj-button" onClick={() => {
          setGroup(data.groups[0].id);change({course:'demo-chem',module:'',strip:'groups',tab:'Работы',search:'',student:'',workRef:''});navigate('journal')
          homework.openAssignment('hw-' + FULL_REVIEW_EXAMPLE_ID, fullReview.submitters.map(s => s.id))
        }}>Тестовая домашка · фото и доска</button><button type="button" className="cj-button" onClick={() => {setReviewStudent(fullReview.submitters[1].id);setReviewReturn(page === 'home' ? page : 'journal');navigate('full-review', fullReview.submitters[1].id)}}>✦ Концепт проверки ИИ</button><span style={{fontSize:11,color:'var(--color-text-3)'}}>3 сдачи · {FULL_REVIEW_EXAMPLE_TITLE}</span>
      </div>}
      {page==='full-review'&&<label className="aic-demo-state">Учебный пример состояния ИИ<select aria-label="Состояние проверки ИИ" value={aiDemoState} onChange={e=>setAiDemoState(e.target.value)}><option value="original">Разбор готов</option><option value="pending">В очереди</option><option value="working">Проверяет</option><option value="unavailable">Сервис недоступен</option><option value="timeout">Долгая проверка</option><option value="rate_limit">Лимит запросов</option><option value="configuration">Ключ не настроен</option><option value="credentials">Неверный ключ</option><option value="balance">Недостаточно средств</option><option value="invalid_result">Неполный разбор</option><option value="missing_evidence">Фото недоступно</option></select></label>}
      <div className={'js-journal-host js-example-area' + (page === 'diary' ? ' ds-example-host' : '')}>
        {page === 'full-review' ? <Suspense fallback={<p role="status">Открываем полную проверку…</p>}>
          <FullReviewEditor key={FULL_REVIEW_EXAMPLE_ID} {...fullReview} embedded aiConcept aiByProgress={aiExample} onRequestAi={async()=>{setAiDemoState('original');return {ok:true}}} reviewIdx={reviewIdx}
            setReviewIdx={i => {const student = fullReview.submitters[i];if(student){setReviewStudent(student.id);window.history.replaceState(null,'','#/teacher/homework-review?student='+encodeURIComponent(student.id))}}}
            returnLabel={reviewReturn === 'journal' ? 'В журнал' : reviewReturn === 'home' ? 'На главную' : 'В журнал'}
            onBack={() => navigate(reviewReturn)} onReview={async (id, verdict, score, comment, attachments, attemptId) => {
              try {setData(saveFullReviewExample(data,today,id,verdict,score,comment,attachments,attemptId));return true}
              catch {return false}
            }}/>
        </Suspense> : page === 'diary' ? <Suspense fallback={<p role="status">Загружаем дневник…</p>}><DiaryStand /></Suspense>
          : page === 'schedule' ? <Suspense fallback={<p role="status">Загружаем расписание…</p>}><ScheduleConceptStand /></Suspense>
          : page === 'widgets' ? <Suspense fallback={<p role="status">Загружаем концепты…</p>}><StudentWidgetsStand /></Suspense>
          : page === 'home' ? <HomeworkTasks queue={homework.queue} groups={data.groups} onQueue={group => {if(group)setGroup(group);navigate('journal')}}/>
          : <>
        <div className="js-stand-strip">
          <GroupStrip
            compactRoster
            groups={s.strip === 'groups' ? data.groups : []}
            selectedGroupId={gid}
            onSelectGroup={(id) => {
              if (id) setGroup(id)
              change({ student: '', search: '' })
            }}
            onAddToGroup={(id) => {
              setGroup(id)
              setAdd('students')
            }}
            tabConfig={{
              tabs: [
                { id: 'groups', label: 'Группы' },
                { id: 'students', label: 'Ученики' },
              ],
              activeTab: s.strip,
              onTabChange: (id) =>
                change({ strip: id === 'groups' ? 'groups' : 'students', search: '', student: '' }),
              onTabPlusClick: (id) => setAdd(id === 'groups' ? 'groups' : 'students'),
            }}
          />
        </div>
        <Matrix
          onOpenWork={homework.openStudent}
          onOpenAssignment={ref => homework.openAssignment(ref, entries.map(e => e.student.id))}
          groups={data.groups}
          example
          scopeLabel={[data.courses.find(c=>c.id===s.course)?.title ?? (s.course==='*'?'Все курсы и работы':'Вне курсов'), data.modules.find(m=>m.id===s.module)?.label].filter(Boolean).join(' · ')}
          entries={entries}
          slots={slots}
          picker={picker}
          selected={s}
          set={change}
          today={today}
          renderReport={(student, workPanel) => {
            const completed = new Set(data.work.filter(w => w.student_id === student.id && w.status === 'completed').map(w => w.lesson_ref))
            const courses = data.courses.filter(c => index.roster.get(c.id)?.has(student.id)).map(c => {
              const lessons = data.lessons.filter(l => l.course_id === c.id)
              return { id: c.id, title: c.title, subject: c.subject, totalLessons: lessons.length,
                completedLessons: lessons.filter(l => completed.has(l.short_id)).length }
            })
            return <StudentDashboardReport key={student.id} student={student} group={data.groups.find(g => g.id === student.groupId)}
              exampleCourses={courses} inDrawer workPanel={workPanel} />
          }}
          position={pos}
          groupLabel={s.strip === 'groups' ? data.groups.find((g) => g.id === gid)!.name : 'Все ученики'}
        />
        </>}
      </div>
      {homework.dialog}
      {add && (
        <Modal
          title={add === 'groups' ? 'Добавить группу в пример' : 'Добавить ученика в пример'}
          onClose={() => setAdd(null)}
          width={400}
        >
          <form
            className="js-example-form"
            onSubmit={(e) => {
              e.preventDefault()
              addExample()
            }}
          >
            <label>
              {add === 'groups' ? 'Название группы' : 'Имя ученика'}
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="cj-button cj-primary">Добавить</button>
          </form>
        </Modal>
      )}
    </main>
  )
}
