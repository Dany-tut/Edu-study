import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import TeacherProfileSettingsPage from '../../src/pages/teacher/TeacherProfileSettingsPage'
import { useDesktopFriends } from '../../src/lib/desktopFriends'
function Stand(){return <TeacherProfileSettingsPage friends={useDesktopFriends()} />}
createRoot(document.getElementById('root')!).render(<Stand/>)
