import TeacherSchedule from '../../components/teacher/schedule/TeacherSchedule'
import { useTeacher } from '../../store/teacherStore'
import { PAGE_WIDTH } from '../../lib/pageWidth'

// Расписание на ПК: та же лента, что на телефоне (TeacherSchedule), в колонке формы.
// Прокрутка под шапкой — как у соседних страниц (marginTop −100 / padding 128).
export default function TeacherSchedulePage() {
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  const openGradebook = useTeacher(s => s.openGradebook)
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100 }}>
      <div style={{ maxWidth: PAGE_WIDTH.reading, margin: '0 auto', padding: '128px 24px 60px' }}>
        <TeacherSchedule
          onOpen={item => openLessonEditor(item.id)}
          onAttendance={item => openGradebook(item.id)}
        />
      </div>
    </div>
  )
}
