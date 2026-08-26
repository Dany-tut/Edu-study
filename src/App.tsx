import { useState, useEffect, lazy, Suspense } from 'react'
import DashboardPage from './pages/DashboardPage'
import StudentLoginPage from './pages/StudentLoginPage'
import LandingPage from './pages/LandingPage'

// ── Кабинет учителя и разовые экраны — отдельными чанками ────────────────────
//
// Эти страницы висели обычными импортами, то есть ехали в главный чанк всем
// подряд. Один кабинет учителя — это 2,1 МБ из 12 (Конструктор, редакторы
// курса и урока, админка), которые ученик на телефоне качал и разбирал, ни
// разу их не увидев. Точки входа взаимоисключающие (или #/teacher, или
// кабинет ученика), так что ленивая загрузка не отнимает ничего у первого
// кадра ни у той стороны, ни у другой.
const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage'))
const TeacherLoginPage = lazy(() => import('./pages/teacher/TeacherLoginPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const JoinTeacherPage = lazy(() => import('./pages/JoinTeacherPage'))
const DiagnosticTestPage = lazy(() => import('./pages/DiagnosticTestPage'))
const ReviewSession = lazy(() => import('./components/ReviewSession'))
import { supabase } from './lib/supabase'
import { getStudentSession } from './lib/studentSession'
import { initAnalytics, trackPath } from './lib/analytics'
import ConsentOverlay, { hasStudentConsent } from './components/ConsentOverlay'
import StickerRevealGate from './components/StickerRevealGate'
import InstallPrompt from './components/InstallPrompt'
import ConfirmHost from './components/ConfirmHost'
import type { Session } from '@supabase/supabase-js'
import './store/themeStore' // initialise theme + apply data-theme before first render
import { useStudentData } from './store/studentDataStore'
import {
  bootTrainerLink, queueTrainerLink, stashTrainerLink, takeStashedTrainerLink, trainerHash,
} from './lib/trainerLink'

// ── Присланная ссылка переживает вход ────────────────────────────────────────
//
// Ссылку на экран тренажёра чаще всего открывает тот, у кого в этой вкладке нет
// сессии. Кабинет показывает ему лендинг — и это правильно, — но адрес при
// первом же переходе на «Войти» стирается, и после входа человек оказывается на
// своей главной, без следа того, ради чего пришёл. Ссылка откладывается ДО
// лендинга и возвращается сразу после входа.
//
// НА УРОВНЕ МОДУЛЯ, А НЕ В ЭФФЕКТЕ. Адрес обязан встать на место до первого
// рендера кабинета: DashboardPage читает его один раз, на монтировании, и hash,
// поставленный эффектом выше по дереву, до него уже не доедет — экран останется
// главной, а адрес будет утверждать обратное. Тот же приём, что у темы
// (см. импорт themeStore выше): подготовка до первого кадра.
void (() => {
  const link = bootTrainerLink()
  if (!getStudentSession()) {
    if (link) stashTrainerLink(link)
    return
  }
  // Адрес уже на месте (вошедший открыл ссылку сам) — отложенному тут делать
  // нечего, иначе он увёл бы человека со свежей ссылки на позавчерашнюю.
  if (link) return
  const back = takeStashedTrainerLink()
  if (!back) return
  // Оба канала сразу: hash — чтобы кабинет открыл вкладку тренажёра и адрес не
  // врал, очередь — чтобы сам тренажёр знал, какой экран показать.
  queueTrainerLink(back)
  window.history.replaceState(null, '', trainerHash(back))
})()
// Пока чанк страницы едет, показываем пустой экран цвета фона, а не белый
// провал: страницы ниже сами рисуют свою загрузку, а мигание белым между
// кадрами заметнее, чем лишние 150 мс тишины.
function Chunk({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} />}>
      {children}
    </Suspense>
  )
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

export default function App() {
  // Хост подтверждений — один на всё приложение, выше любого роута: спросить
  // могут и из кабинета, и из лендинга, и во время редиректа.
  return (
    <>
      <AppRoutes />
      <ConfirmHost />
    </>
  )
}

function AppRoutes() {
  const hash = useHashRoute()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [recovery, setRecovery] = useState(false)
  const [consented, setConsented] = useState(hasStudentConsent())
  const loadStudentData = useStudentData(s => s.load)

  // Behavioural telemetry: init once, then log every route change.
  useEffect(() => { initAnalytics() }, [])
  useEffect(() => { trackPath(hash || '#/') }, [hash])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
    })
    // Re-check the session when the tab regains focus: if the token silently
    // expired while backgrounded, this refreshes it (or flips to logged-out)
    // instead of leaving a "dead" cabinet that 401s on the next request.
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data }) => setSession(data.session))
      }
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => { subscription.unsubscribe(); document.removeEventListener('visibilitychange', onFocus) }
  }, [])

  // Load real Supabase data whenever a student session exists
  useEffect(() => {
    const sess = getStudentSession()
    if (!sess) return
    // Спиннер снимается ДАЖЕ если загрузка упала.
    //
    // `loaded` ставится последней строкой load(), поэтому любой бросок по пути
    // оставлял кабинет в «Загрузка…» навсегда — до перезагрузки страницы, о
    // которой ученик не догадается. Внутри load() восемь запросов уже прикрыты
    // allSettled, но всё, что вокруг них (охват человека, сверка сброса курса),
    // — нет, и одного отвалившегося токена хватало на мёртвый экран.
    //
    // Пустой кабинет вместо спиннера — не победа, но он живой: пересинхронизация
    // по возврату на вкладку и realtime зовут load() снова.
    loadStudentData().catch(e => {
      console.error('[studentData.load]', e)
      useStudentData.setState({ loaded: true })
    })
    // Realtime: re-sync when teacher opens a lesson (lesson_progress changes for this student)
    const channel = supabase
      .channel('student-lesson-progress')
      .on('postgres_changes', {
        // '*' (not just UPDATE): opening a lesson for a not-yet-enrolled student
        // INSERTs a fresh lesson_progress row, so an UPDATE-only filter would
        // never re-sync the live student screen.
        event: '*',
        schema: 'public',
        table: 'lesson_progress',
        filter: `student_id=eq.${sess.id}`,
      }, () => loadStudentData())
      .subscribe(status => {
        // Surface realtime failures instead of silently never updating.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[realtime] lesson_progress subscription:', status)
        }
      })
    // Возврат на вкладку = пересинхронизация. Realtime не закрывает удаление:
    // таблица живёт с REPLICA IDENTITY DEFAULT, и в DELETE-событии приходит
    // только id — фильтр по student_id его не пропускает. Значит обнуление
    // курса учителем до уже открытого экрана ученика само не доедет, и домашка
    // осталась бы «сданной» до перезагрузки. Не чаще раза в 20 секунд: возврат
    // на вкладку случается десятки раз за занятие, а загрузка — восемь запросов.
    let lastSync = Date.now()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastSync < 20_000) return
      lastSync = Date.now()
      loadStudentData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadStudentData])

  // Лендинг доступен по явному адресу даже при активном входе (для просмотра)
  if (hash.startsWith('#/landing')) return <LandingPage />
  if (hash.startsWith('#/join-teacher')) return <Chunk><JoinTeacherPage /></Chunk>
  if (hash.startsWith('#/join')) return <Chunk><JoinPage /></Chunk>
  if (hash.startsWith('#/diagnostic')) return <Chunk><DiagnosticTestPage /></Chunk>
  if (hash.startsWith('#/review')) {
    const q = new URLSearchParams(hash.split('?')[1] ?? '')
    const sid = getStudentSession()?.id
    const owner = sid ? { studentId: sid } : { anonName: q.get('name') ?? undefined }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <Chunk><ReviewSession owner={owner} onDone={() => { window.location.hash = '#/' }} /></Chunk>
      </div>
    )
  }

  if (hash.startsWith('#/teacher')) {
    if (recovery) return <Chunk><TeacherLoginPage onLogin={() => setRecovery(false)} recovery /></Chunk>
    if (session === undefined && !import.meta.env.DEV) return null
    // A student's Supabase session must not unlock the teacher cabinet.
    const isStudentAccount = session?.user?.user_metadata?.role === 'student'
    if ((!session || isStudentAccount) && !import.meta.env.DEV) return <Chunk><TeacherLoginPage onLogin={() => {}} /></Chunk>
    return (
      <>
        <Chunk><TeacherDashboardPage /></Chunk>
        <InstallPrompt />
      </>
    )
  }

  // Public landing (главная для гостя) + student routes
  const studentSession = getStudentSession()
  if (!studentSession) {
    if (hash.startsWith('#/login')) return <StudentLoginPage />
    return <LandingPage />
  }
  // 152-ФЗ consent gate: overlay ON TOP of the cabinet (dashboard stays mounted
  // behind it) so a fault in the gate can never blank the app.
  return (
    <>
      <DashboardPage />
      {!consented && <ConsentOverlay onAccept={() => setConsented(true)} />}
      {/* Install banner shows only once consent is given (student) */}
      {consented && <InstallPrompt />}
      {/* Новые стикеры за принятые задания — после согласия, поверх кабинета */}
      {consented && <StickerRevealGate />}
    </>
  )
}
