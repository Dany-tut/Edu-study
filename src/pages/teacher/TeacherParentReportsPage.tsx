import TeacherPageScroll from '../../components/teacher/TeacherPageScroll'
import ParentReportsView from '../../components/teacher/parentReports/ParentReportsView'
import { useFeature } from '../../lib/teacherFeatures'

/** «Отчёты родителям» — только при выданной и включённой функции parent_report. */
export default function TeacherParentReportsPage() {
  const on = useFeature('parent_report')
  return (
    <TeacherPageScroll>
      {on && <ParentReportsView />}
    </TeacherPageScroll>
  )
}
