import { useState, useEffect } from 'react'
import MobileTeacherNav, { type MTab } from './MobileTeacherNav'
import MobileTeacherDay from './MobileTeacherDay'
import MobileTeacherStudents from './MobileTeacherStudents'
import MobileTeacherReview from './MobileTeacherReview'
import MobileTeacherGradebook from './MobileTeacherGradebook'
import MobileTeacherProfile from './MobileTeacherProfile'
import { useHomework, useHardSubmissions } from '../../../lib/useHomework'
import { useTeacherAccess, type TeacherTabId } from '../../../lib/teacherAccess'
import { DEMO_HARD_SUBS, DEMO_HW } from '../../../data/teacherDevDemo'
import { useTeacher } from '../../../store/teacherStore'
import { useTeacherSession } from '../../../lib/useTeacherSession'
import './mobileTeacher.css'

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
  const signedIn = useTeacherSession()
  const [tab, setTabState] = useState<MTab>(() => useTeacher.getState().activePage === 'gradebook' ? 'gradebook' : 'home')
  const setTab = (next: MTab) => setTabState(next === 'review' ? 'gradebook' : next)
  const teacherPage = useTeacher(s => s.activePage)
  const pendingJournal = useTeacher(s => s.pendingGradebookLessonId)
  useEffect(() => {
    if (teacherPage === 'gradebook' || pendingJournal) setTab('gradebook')
  }, [teacherPage, pendingJournal])
  const [dayDetailOpen, setDayDetailOpen] = useState(false)
  const [reviewDetailOpen, setReviewDetailOpen] = useState(false)

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
  // DEV-only: mirror the review screen's demo fallback so the badge isn't 0.
  const demoReview = import.meta.env.DEV && signedIn === false && submissions.length === 0 && homework.length === 0
  const hardList = demoReview ? DEMO_HARD_SUBS : submissions
  const hwList = demoReview ? DEMO_HW : homework
  const reviewBadge =
    hardList.filter(s => s.status === 'submitted').length +
    hwList.filter(h => h.status !== 'closed').reduce((n, h) => n + Math.max(0, h.submittedCount - h.reviewedCount), 0)

  return (
    <div className="mobile-teacher-app lg:hidden">
      {tab === 'home'      && <MobileTeacherDay reviewCount={reviewBadge} onNavigate={setTab} onDetailChange={setDayDetailOpen} />}
      {tab === 'students'  && <MobileTeacherStudents />}
      {tab === 'review'    && <MobileTeacherReview onDetailChange={setReviewDetailOpen} />}
      {tab === 'gradebook' && <MobileTeacherGradebook onBack={() => setTab('profile')} />}
      {tab === 'profile'   && <MobileTeacherProfile onOpenJournal={!isHidden('gradebook') ? () => setTab('gradebook') : undefined} />}

      {!(tab === 'home' && dayDetailOpen || tab === 'review' && reviewDetailOpen) && <MobileTeacherNav active={tab} onChange={setTab} reviewBadge={reviewBadge} hidden={(['home','students','review','gradebook','profile'] as MTab[]).filter(isHidden)} />}
    </div>
  )
}
