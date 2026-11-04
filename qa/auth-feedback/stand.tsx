import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/store/themeStore'
import TeacherLoginPage from '../../src/pages/teacher/TeacherLoginPage'
import StudentLoginPage from '../../src/pages/StudentLoginPage'

// Actual forms with explicit recovery props; no session, service or credentials are created.
const query = new URLSearchParams(window.location.search)
const props = { recovery: query.has('recovery'), linkExpired: query.has('expired') }
createRoot(document.getElementById('root')!).render(query.get('role') === 'student'
  ? <StudentLoginPage {...props} />
  : <TeacherLoginPage {...props} onLogin={() => { document.documentElement.dataset.qaLoginCompleted = 'true' }} />)
