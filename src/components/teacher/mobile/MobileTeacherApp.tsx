import { useState, useEffect } from 'react'
import MobileTeacherNav, { type MTab } from './MobileTeacherNav'
import MobileTeacherHome from './MobileTeacherHome'
import MobileTeacherStudents from './MobileTeacherStudents'
import MobileTeacherReview from './MobileTeacherReview'
import MobileTeacherGradebook from './MobileTeacherGradebook'
import MobileTeacherProfile from './MobileTeacherProfile'
import { useHomework, useHardSubmissions } from '../../../lib/useHomework'
import { useTeacherAccess, type TeacherTabId } from '../../../lib/teacherAccess'

// Each mobile tab maps to a desktop nav tab for access checks (profile is always
// available). Hiding the matching desktop tab hides the mobile one too.
const MTAB_TAB: Record<MTab, TeacherTabId | null> = {
  home: 'home',
  students: 'groups',
  review: 'homework',
  gradebook: 'gradebook',
  profile: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// MobileTeacherApp — the MOBILE-ONLY teacher shell. Mounted only below the lg
// breakpoint by TeacherDashboardPage; the desktop teacher layout is untouched.
// Owns its own tab state (separate from the desktop TeacherPage enum) so the
// two layouts never interfere.
// ─────────────────────────────────────────────────────────────────────────────

export default function MobileTeacherApp() {
  const [tab, setTab] = useState<MTab>('home')

  // Admin-configured access — hide revoked tabs (mirrors the desktop gating).
  const canTab = useTeacherAccess(s => s.canTab)
  useTeacherAccess(s => s.hiddenTabs)
  const isHidden = (t: MTab) => { const d = MTAB_TAB[t]; return d !== null && !canTab(d) }

  // If the active tab was revoked, fall back to the first allowed one (profile
  // is always available, so there is always a target).
  useEffect(() => {
    if (!isHidden(tab)) return
    const first = (['home', 'students', 'review', 'gradebook', 'profile'] as MTab[]).find(t => !isHidden(t))
    setTab(first ?? 'profile')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, canTab])

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

      <MobileTeacherNav active={tab} onChange={setTab} reviewBadge={reviewBadge} hidden={(['home','students','review','gradebook','profile'] as MTab[]).filter(isHidden)} />
    </div>
  )
}
