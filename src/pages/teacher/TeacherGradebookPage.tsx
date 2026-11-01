import CourseJournal from '../../components/teacher/CourseJournal'

export default function TeacherGradebookPage() {
  return <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, padding: '100px 32px 32px' }}>
    <CourseJournal />
  </div>
}
