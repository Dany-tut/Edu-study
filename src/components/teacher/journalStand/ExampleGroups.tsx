import { useMemo, useRef, useState } from 'react'
import { journalDemo } from '../../../data/courseJournalDemo'
import GroupStrip from '../GroupStrip'
import Modal from '../../Modal'
import { Matrix, ProfileWorks, ScopePicker, initial, type StandSelection } from './JournalStand'
import { buildStandIndex, scopeSlots, studentWorks, workStats } from './studentWorks'
import { wallDateTimeInTz } from '../../../lib/teacherTz'
import type { Student } from '../../../data/teacherMockData'

const letters = 'АБВГДЕЖЗ'.split('')
const given = ['Анна', 'Иван', 'Вера', 'Лев', 'Софья', 'Антон', 'Майя', 'Илья', 'Ника', 'Марк']
const family = ['Сокол', 'Титов', 'Белов', 'Орлов', 'Громов', 'Морозов', 'Жуков', 'Миронов']
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
  for (const l of data.lessons) {
    const i = l.position
    const types = i % 3 === 0 ? ['single', 'testly'] : i % 3 === 1 ? ['single'] : ['testly']
    l.hwTask = types.map((type) => ({ type }))
    for (const [j, s] of data.students.entries()) {
      if ((i + j) % 7 === 0 || i === 7) continue
      const points = (i * 3 + j) % 9
      const score = Math.round(100 * (types.length === 2 ? (1 + points / 8) / 2 : points / 8))
      const id = s.id + '-' + l.short_id
      const status = (i + j) % 11 === 0 ? 'returned' : 'completed'
      data.work.push({
        id,
        student_id: s.id,
        lesson_ref: l.short_id,
        status,
        score,
        updated_at: l.scheduled_date + 'T15:00:00Z',
        attachments: {
          v: 'basic-1',
          rows: types.map((type) => ({
            type,
            verdict: type === 'testly' && points < 8 ? 'wrong' : 'correct',
            ...(type === 'testly' ? { testly: { got: points, max: 8, testId: 'example-test-' + i } } : {}),
          })),
        },
      })
      data.attempts.push({
        id,
        student_id: s.id,
        lesson_ref: l.short_id,
        number: 1,
        status,
        score,
        passing_score: 80,
        submitted_at: l.scheduled_date + 'T15:00:00Z',
        review_comment: null,
      })
    }
  }
  return data
}
// A separate in-memory example lets a teacher with no groups inspect the scrolling strip.
export default function ExampleGroups() {
  const [data, setData] = useState(exampleData)
  const [s, setState] = useState<StandSelection>({ ...initial, course: 'demo-chem', strip: 'groups' })
  const change = (v: Partial<StandSelection>) => setState((p) => ({ ...p, ...v }))
  const [gid, setGroup] = useState(data.groups[0].id)
  const [profile, setProfile] = useState<Student | null>(null)
  const [add, setAdd] = useState<'groups' | 'students' | null>(null)
  const [name, setName] = useState('')
  const pos = useRef({ top: 0, left: 0 })
  const today = wallDateTimeInTz(new Date().toISOString(), 'Europe/Moscow').day
  const index = useMemo(() => buildStandIndex(data), [data])
  const slots = useMemo(() => scopeSlots(index, s), [index, s.course, s.module])
  const entries = useMemo(
    () =>
      data.students
        .filter((v) => s.strip === 'students' || v.groupId === gid)
        .map((student) => {
          const works = studentWorks(data, index, student, slots, today)
          return { student, works, stats: workStats(works, today) }
        }),
    [data, index, slots, today, s.strip, gid]
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
    <main className="js-example">
      <div className="js-example-label">
        Пример с учебными данными · изменения до обновления страницы{' '}
        <a href="/journal-stand/#/teacher/gradebook">Мой журнал</a>
      </div>
      {profile ? (
        <>
          <button className="cj-button" onClick={() => setProfile(null)}>
            Назад в журнал
          </button>
          <h2>{profile.name}</h2>
          <ProfileWorks list={studentWorks(data, index, profile, slots, today)} today={today} scope={picker} />
        </>
      ) : (
        <>
          <div className="js-stand-strip">
            <GroupStrip
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
            entries={entries}
            slots={slots}
            picker={picker}
            selected={s}
            set={change}
            open={setProfile}
            position={pos}
            groupLabel={s.strip === 'groups' ? data.groups.find((g) => g.id === gid)!.name : 'Все ученики'}
          />
        </>
      )}
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
