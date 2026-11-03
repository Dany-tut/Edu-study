import type { useTeacherWeek } from '../../../lib/teacherSchedule'
import { useTeacherGuides } from '../guides/TeacherGuides'
import TeacherSchedule from '../schedule/TeacherSchedule'
import { useTeacher } from '../../../store/teacherStore'
import './calendarWidget.css'

// Виджет «Расписание» на Главной — та же живая лента, что была отдельной
// вкладкой: неделя в шапке, занятие зажал-и-перетащил на день, зажал-и-отпустил
// (на ПК правая кнопка) — меню переноса. Отдельной вкладки «Расписание» больше
// нет, перенос делается прямо отсюда.
export default function WidgetTodaySchedule({ useWeek, readOnly }: { useWeek?: typeof useTeacherWeek; readOnly?: boolean } = {}) {
  const teacherGuides = useTeacherGuides()
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  const openGradebook = useTeacher(s => s.openGradebook)
  return (
    <div className="calendar-widget" style={{
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
      containerType: 'inline-size', containerName: 'teacher-calendar',
    }}>
      <div className="calendar-widget-content">
        <TeacherSchedule
          onExplore={readOnly ? undefined : () => teacherGuides?.enter('schedule')}
          embedded
          useWeek={useWeek}
          readOnly={readOnly}
          onOpen={item => openLessonEditor(item.id)}
          onAttendance={item => openGradebook(item.id)}
        />
      </div>
    </div>
  )
}
