import { useState } from 'react'
import MobileTeacherNav, { type MTab } from './MobileTeacherNav'
import MobileTeacherHome from './MobileTeacherHome'
import MobileTeacherStudents from './MobileTeacherStudents'
import MobileTeacherReview from './MobileTeacherReview'
import MobileTeacherGradebook from './MobileTeacherGradebook'
import MobileTeacherProfile from './MobileTeacherProfile'
import { useHomework, useHardSubmissions } from '../../../lib/useHomework'

// ─────────────────────────────────────────────────────────────────────────────
// MobileTeacherApp — the MOBILE-ONLY teacher shell. Mounted only below the lg
// breakpoint by TeacherDashboardPage; the desktop teacher layout is untouched.
// Owns its own tab state (separate from the desktop TeacherPage enum) so the
// two layouts never interfere.
// ─────────────────────────────────────────────────────────────────────────────

export default function MobileTeacherApp() {
  const [tab, setTab] = useState<MTab>('home')

  // Review badge — pending hard submissions + unreviewed homework.
  const { homework } = useHomework()
  const { submissions } = useHardSubmissions()
  const reviewBadge =
    submissions.filter(s => s.status === 'submitted').length +
    homework.filter(h => h.status !== 'closed').reduce((n, h) => n + Math.max(0, h.submittedCount - h.reviewedCount), 0)

  return (
    <div className="lg:hidden">
      {tab === 'home'      && <MobileTeacherHome onNavigate={setTab} />}
      {tab === 'students'  && <MobileTeacherStudents />}
      {tab === 'review'    && <MobileTeacherReview />}
      {tab === 'gradebook' && <MobileTeacherGradebook />}
      {tab === 'profile'   && <MobileTeacherProfile />}

      <MobileTeacherNav active={tab} onChange={setTab} reviewBadge={reviewBadge} />
    </div>
  )
}
