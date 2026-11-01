import LessonWatchStatus from './LessonWatchStatus'
import TrackHomeworkButton from './TrackHomeworkButton'
import LessonSelfAssessment from './LessonSelfAssessment'
import { gradedTrackResult } from '../lib/homeworkResult'
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import CourseTrackSkeleton from './CourseTrackSkeleton'
import { TRACK_NODE_SIZE as NODE_SIZE, TRACK_SIDE_PADDING, TRACK_GLOW_PAD as GLOW_PAD, TRACK_ROW_HEIGHT } from './courseTrackLayout'
import { useWheelHScroll } from '../lib/useWheelHScroll'
import { courseResumeTarget, courseTrackWidth } from '../lib/courseTrackLayout'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, RotateCcw, Upload, Lock, Play, Star, Clock, CircleAlert } from './icons/appIcons'
import { IconLessonRecording } from './icons'
import { type Subject, type Lesson, type LessonStatus } from '../data/mockData'
import { getLessonDetail, lessonHasHardLevel } from '../data/lessonContent'
import { useStudentData, ownerStudentIdFor } from '../store/studentDataStore'
import { HARD_STYLE } from './CourseNode'
import { getTrackLessonStatus, getLessonScheduleState, lessonScheduleDate, lessonStatusLabel, lessonTrackStep, type TrackLessonStatus } from '../lib/lessonStatus'
import { useStudentTz } from '../lib/studentTz'
import ScheduleStatusBadge from './ScheduleStatusBadge'
import { hardLevelState } from '../lib/lessonAssessments'
import { lessonStudyProgress } from '../lib/lessonStudyProgress'
import { useNow } from '../lib/useNow'
import { useDashboard } from '../store/dashboardStore'
import CourseNode from './CourseNode'
import HScrollFade from './HScrollFade'
import { CourseSelect, ModuleChain } from './CourseModuleBar'
import { playTransitionDrop } from '../lib/sound'
import HardStarLottie from './HardStarLottie'
import { useT, useTc } from '../lib/i18n'
import { TRACK_STATUS, trackPalette } from '../lib/theme'

const DETAIL_CARD_WIDTH = 340
const HARD_CARD_WIDTH = 320
// Vertical breathing room above the row so the selected node's glow ring isn't clipped.
// Трек подтягивается под строку курса: кружки встают в 12 px от неё, свечение
// уходит в воздух над строкой (строка поверх — zIndex 2).
const TRACK_PULL_UP = 12 - GLOW_PAD
const ROW_SHADOW_TOP = 10
const ROW_SHADOW_BOTTOM = 12

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const detailStyles: Record<TrackLessonStatus, { badgeLabel?: string; icon: React.ElementType }> = {
  completed: { badgeLabel: 'выполнено', icon: CheckCircle2 },
  returned: { badgeLabel: 'возвращено на доработку', icon: RotateCcw },
  unviewed: { badgeLabel: 'Запись доступна', icon: IconLessonRecording },
  submitted: { badgeLabel: 'отправлено на проверку', icon: Upload },
  test_low: { icon: CircleAlert }, test_passed: { icon: CheckCircle2 },
  submitted_unknown: { badgeLabel: 'Работа отправлена', icon: Clock },
  today: { icon: Play }, current: { icon: Play }, locked: { badgeLabel: 'недоступно', icon: Lock },
}

/**
 * Держит активную вкладку в поле зрения: ряды курсов и модулей теперь одна
 * строка со скроллом, и выбранная пилюля запросто может оказаться за фейдом —
 * при переключении подматываем ряд к ней.
 *
 * ПОДМАТЫВАЕМ ТОЛЬКО ТО, ЧТО НЕ ВИДНО. Раньше здесь безусловно вызывался
 * `scrollIntoView({inline:'center'})`: ряд центрировал вкладку ВСЕГДА, даже
 * когда по ней только что кликнули и она стояла у всех на виду. При семи
 * курсах ряд шире экрана, поэтому почти каждый клик уводил строку рывком
 * из-под курсора — это и читалось как «переключение дёргается».
 *
 * Заодно ушли от `scrollIntoView`: он мотает ВСЕ прокручиваемые предки, то
 * есть мог утянуть и саму страницу. Крутим только собственный скроллер ряда.
 */
const TAB_EDGE_PAD = 24

function useScrollTabIntoView(
  rowRef: React.RefObject<HTMLDivElement | null>,
  attr: string,
  activeId: string,
) {
  useEffect(() => {
    if (!activeId) return
    const row = rowRef.current
    const nodes = row?.querySelectorAll<HTMLElement>(`[${attr}]`)
    const el = nodes && Array.from(nodes).find(n => n.getAttribute(attr) === activeId)
    if (!el || !row) return

    // Скроллер — ближайший предок ряда, которому есть что прятать. Скрытая
    // ветка вёрстки (display:none) даёт нули: мерить нечего, выходим.
    let scroller: HTMLElement | null = el.parentElement
    while (scroller && scroller !== row.parentElement && scroller.scrollWidth <= scroller.clientWidth + 1) {
      scroller = scroller.parentElement
    }
    if (!scroller || scroller.clientWidth === 0) return

    const tab = el.getBoundingClientRect()
    const box = scroller.getBoundingClientRect()
    // Вкладка целиком на виду (с запасом под фейд у края) — ряд не трогаем.
    if (tab.left >= box.left + TAB_EDGE_PAD && tab.right <= box.right - TAB_EDGE_PAD) return

    // Мгновенно, без behavior: 'smooth' — плавный скролл едет на rAF, а в
    // превью-песочнице кадры не идут, и ряд просто остаётся на месте.
    const delta = (tab.left + tab.width / 2) - (box.left + box.width / 2)
    scroller.scrollLeft = Math.max(0, Math.min(scroller.scrollWidth - scroller.clientWidth, scroller.scrollLeft + delta))
  }, [rowRef, attr, activeId])
}

function TrackForSubject({ subject, courseSlot }: { subject: Subject; courseSlot?: React.ReactNode }) {
  const t = useT()
  const { tc } = useTc()
  const { activeModuleId, setActiveModule, setTrackPopoverOpen, openLesson, openHomeworkForLesson, highlightLessonId, lessonAssessments } = useDashboard()
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [selectedHardLessonId, setSelectedHardLessonId] = useState<string | null>(null)
  const now = useNow()
  useStudentTz(s => s.tz)
  useStudentData(s => s.scheduleDays)
  // activeModuleId from the store may not match a real module id on first paint,
  // so resolve to an actually-rendered module — lets the pill appear without a click.
  const effectiveModuleId =
    subject.modules.find(m => m.id === activeModuleId)?.id ?? courseResumeTarget(subject).moduleId
  const moduleRowRef = useRef<HTMLDivElement>(null)
  useScrollTabIntoView(moduleRowRef, 'data-module-tab', String(effectiveModuleId ?? ''))

  // Mirror popover open state to the store so the layout can lift the track
  // above the quiz overlay (otherwise the quiz card's shadow covers the popover).
  useEffect(() => {
    setTrackPopoverOpen(selectedLessonId != null || selectedHardLessonId != null)
    return () => setTrackPopoverOpen(false)
  }, [selectedLessonId, selectedHardLessonId, setTrackPopoverOpen])
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackAreaRef = useRef<HTMLDivElement>(null)
  const [viewW, setViewW] = useState(0)
  const [scrollX, setScrollX] = useState(0)
  useWheelHScroll(scrollRef)

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setViewW(el.clientWidth)
  }, [])

  useEffect(() => {
    measure()
    const observer = new ResizeObserver(measure)
    if (scrollRef.current) observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [measure])

  // Dismiss the detail popover on any click that isn't on a node (which toggles
  // selection) or inside the popover card itself. Checking trackAreaRef
  // containment isn't enough: the empty track space around and below the nodes
  // lives inside trackAreaRef too, so clicks just under a circle used to land in
  // a dead zone that never dismissed.
  useEffect(() => {
    if (!selectedLessonId && !selectedHardLessonId) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      if (el?.closest('[data-course-node]') || el?.closest('[data-lesson-popover]')) return
      setSelectedLessonId(null)
      setSelectedHardLessonId(null)
    }
    // Capture phase: some cards (e.g. the quiz panel) stopPropagation on
    // pointerdown, so a bubble-phase listener would never see those clicks.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [selectedLessonId, selectedHardLessonId])

  // Scope the track to the active module — clicking a module tab reveals how
  // much of *that* module is completed ("закрыто").
  const activeModule = subject.modules.find(m => m.id === effectiveModuleId) ?? subject.modules[0]
  const allLessons = activeModule?.lessons ?? []
  // Первый текущий урок — на нём праздничная тема ставит фонарь/конфету (CourseNode.seasonMark).
  const scheduleStates = allLessons.map(lesson => getLessonScheduleState(lesson, now))
  const statuses = allLessons.map((lesson, i) => getTrackLessonStatus(lesson, now, scheduleStates[i]))
  const seasonMarkIndex = statuses.indexOf('today')
  const selectedLesson = allLessons.find(lesson => lesson.id === selectedLessonId) ?? null
  const selectedScheduleState = selectedLesson ? scheduleStates[allLessons.indexOf(selectedLesson)] : null

  // Full-width track: nodes are distributed evenly across the available width so
  // the line always reaches the end of the row. Each lesson owns the line up to
  // the midpoint to its neighbours; the aggregate percentage stays in ModuleChain.
  const nodeCount = allLessons.length
  const padCenter = TRACK_SIDE_PADDING + NODE_SIZE / 2          // first / last node center inset
  const viewportW = viewW || 900
  const containerW = courseTrackWidth(viewportW, nodeCount)
  const span = Math.max(0, containerW - padCenter * 2)         // distance between first & last node centers
  const nodeCenter = (i: number) => nodeCount <= 1 ? padCenter : padCenter + (span * i) / (nodeCount - 1)
  const resume = courseResumeTarget(subject)
  const focusId = allLessons.some(l => l.id === highlightLessonId) ? highlightLessonId : resume.lessonId
  const focusIndex = allLessons.findIndex(l => l.id === focusId)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || !viewW) return
    const center = focusIndex < 0 ? 0 : padCenter + (nodeCount <= 1 ? 0 : span * focusIndex / (nodeCount - 1))
    el.scrollLeft = Math.max(0, center - viewW / 2)
    setScrollX(el.scrollLeft)
    setSelectedLessonId(null)
    setSelectedHardLessonId(null)
  }, [subject.id, effectiveModuleId, focusId, viewW, nodeCount, span, padCenter, focusIndex])
  const edges = { left: scrollX > 2, right: scrollX + viewportW < containerW - 2 }
  const trackColors = allLessons.map((lesson, i) => {
    const status = gradedTrackResult(lesson)?.status ?? statuses[i]
    return status === 'completed' || status === 'test_passed' ? TRACK_STATUS.completed.border : 'var(--color-bg-5)'
  })

  // Хард открываем только у уроков, где реально есть сложные задания — иначе
  // внутри уровня пусто (см. lessonHasHardLevel).
  const selectedHardLesson = allLessons.find(lesson => lesson.id === selectedHardLessonId && lessonHasHardLevel(lesson)) ?? null

  const selectedIndex = selectedLesson ? allLessons.findIndex(lesson => lesson.id === selectedLesson.id) : -1
  const selectedCenter = selectedIndex >= 0 ? nodeCenter(selectedIndex) - scrollX : 0
  const detailCardWidth = Math.min(DETAIL_CARD_WIDTH, Math.max(0, viewportW - 24))
  const detailLeft = Math.max(0, Math.min(selectedCenter - detailCardWidth / 2, Math.max(0, viewportW - detailCardWidth)))
  const arrowX = Math.max(16, Math.min(selectedCenter - detailLeft, detailCardWidth - 16))
  const selectedLessonStatus = statuses[selectedIndex] ?? null
  const selectedDate = selectedLesson ? lessonScheduleDate(selectedLesson, 'long') : null
  const hasBasicHomework = useMemo(() => {
    if (!selectedLesson || selectedLessonStatus === 'locked' || selectedLesson.kind === 'test' || selectedLesson.heavyPending) return false
    return !!getLessonDetail(selectedLesson).homework?.levels.some(level => level.id === 'basic' && level.questions?.length)
  }, [selectedLesson, selectedLessonStatus])
  const selectedStep = selectedLesson && selectedLessonStatus ? lessonTrackStep(selectedLesson, selectedLessonStatus) : null
  const resumeRetake = selectedStep === 'resume'
  const showRetake = hasBasicHomework && (resumeRetake || selectedStep === 'retake')
  const isResumingRetake = showRetake && resumeRetake
  const homeworkAccepted = selectedLessonStatus === 'test_passed' || selectedLessonStatus === 'completed'
  const quietLessonButton = selectedLesson && selectedLesson.kind !== 'test' && (
    showRetake || lessonStudyProgress(selectedLesson).completed || (homeworkAccepted && !selectedLesson.videoUrl?.trim())
  )
  const selectedDetail = selectedLessonStatus ? {
    ...detailStyles[selectedLessonStatus],
    palette: trackPalette(isResumingRetake ? 'test_low' : selectedLessonStatus),
  } : null
  const DetailIcon = selectedDetail?.icon
  const selectedGrade = selectedLesson ? gradedTrackResult(selectedLesson) : null

  const hardIndex = selectedHardLesson ? allLessons.findIndex(l => l.id === selectedHardLesson.id) : -1
  const hardCenter = hardIndex >= 0 ? nodeCenter(hardIndex) - scrollX : 0
  const hardCardWidth = Math.min(HARD_CARD_WIDTH, Math.max(0, viewportW - 24))
  const hardDetailLeft = Math.max(0, Math.min(hardCenter - hardCardWidth / 2, Math.max(0, viewportW - hardCardWidth)))
  const hardArrowX = Math.max(16, Math.min(hardCenter - hardDetailLeft, hardCardWidth - 16))
  const hardAssessment = selectedHardLesson ? lessonAssessments[selectedHardLesson.id] : null
  const hardStatus = hardLevelState(hardAssessment).status
  const hardStyleData = HARD_STYLE[hardStatus]

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* ── Курс ▾ | модули кружками — одна строка (см. CourseModuleBar).
           Модулей больше, чем влезает, — цепочка уезжает под фейд; текущий
           подматывается в поле зрения. Курс без модулей — цепочки нет. ── */}
      {/* Поля сверху и снизу — под тень таблеток: ряд прокручивается вбок, а
          overflow-x: auto режет и по вертикали всё, что за его коробкой. Те же
          поля сняты отрицательным отступом, чтобы строка не стала выше. Снизу
          не больше 12 — дальше уже кружки трека, и поле перехватывало бы клик. */}
      <div ref={moduleRowRef} style={{ flexShrink: 0, position: 'relative', zIndex: 2, margin: `-${ROW_SHADOW_TOP}px 0 -${ROW_SHADOW_BOTTOM}px` }}>
      <HScrollFade padX={32} padTop={ROW_SHADOW_TOP} padBottom={ROW_SHADOW_BOTTOM} gap={14} fadeWidth={44} scrollStyle={{ alignItems: 'center' }}>
        {courseSlot}
        {!(subject.modules.length === 1 && subject.modules[0].loose) && (
          <>
            {courseSlot && <span aria-hidden style={{ width: 1, height: 22, background: 'var(--color-text-4)', flexShrink: 0 }} />}
            <ModuleChain
              subject={subject}
              activeId={effectiveModuleId}
              onSelect={id => {
                if (id === activeModuleId) return
                playTransitionDrop()
                setActiveModule(id)
              }}
            />
          </>
        )}
      </HScrollFade>
      </div>

      {/* ── Track body: auto height, centered content. Сверху минус: над
           кружками GLOW_PAD под свечение, и без поправки трек отъезжал бы от
           строки курса на 24 px вместо 12. ── */}
      <div className="flex items-center" style={{ marginTop: TRACK_PULL_UP, paddingBottom: 12 }}>
        <div className="flex items-center gap-6 w-full">

          {/* Full-width track — nodes distributed across the whole row */}
          <div ref={trackAreaRef} className="flex-1 min-w-0 relative">
            <div
              ref={scrollRef}
              className="no-scrollbar"
              tabIndex={0}
              aria-label={t('Занятия модуля')}
              onScroll={e => {
                setScrollX(e.currentTarget.scrollLeft)
                setSelectedLessonId(null)
                setSelectedHardLessonId(null)
              }}
              style={{
                overflowX: 'auto', overscrollBehaviorX: 'contain',
                maskImage: `linear-gradient(to right, ${edges.left ? 'transparent, black 24px' : 'black 0%'}, ${edges.right ? 'black calc(100% - 24px), transparent' : 'black 100%'})`,
                paddingTop: GLOW_PAD,
                paddingBottom: 14,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: containerW,
                  height: TRACK_ROW_HEIGHT,
                  overflow: 'visible',
                }}
              >
                {/* Each connection runs from one node centre to the next. */}
                {nodeCount > 1 && (
                  <div
                    data-course-track-line
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: padCenter,
                      width: span,
                      top: NODE_SIZE / 2,
                      transform: 'translateY(-50%)',
                      height: 16,
                      borderRadius: 999,
                      overflow: 'hidden',
                      display: 'flex',
                      background: 'var(--color-bg-5)',
                      pointerEvents: 'none',
                    }}
                  >
                    {trackColors.slice(1).map((endColor, i) => {
                      const startColor = trackColors[i]
                      return (
                        <div
                          key={allLessons[i].id}
                          style={{
                            flex: 1,
                            background: startColor === endColor ? startColor
                              : `linear-gradient(90deg, ${startColor} 22%, ${endColor} 78%)`,
                          }}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Nodes — absolutely positioned at evenly distributed centers */}
                {allLessons.map((lesson, i) => (
                  <div
                    key={lesson.id}
                    data-course-node
                    style={{ position: 'absolute', top: 0, left: nodeCenter(i) - NODE_SIZE / 2 }}
                  >
                    <CourseNode
                      lesson={lesson}
                      status={statuses[i]}
                      scheduleState={scheduleStates[i]}
                      index={i}
                      isSelected={selectedLesson?.id === lesson.id}
                      isHighlighted={focusId === lesson.id}
                      scrollHighlight={false}
                      isCurrent={resume.lessonId === lesson.id}
                      seasonMark={i === seasonMarkIndex}
                      onSelect={(clickedLesson) => {
                        setSelectedHardLessonId(null)
                        setSelectedLessonId(prev => prev === clickedLesson.id ? null : clickedLesson.id)
                        if (clickedLesson.heavyPending && clickedLesson.kind !== 'test' && statuses[i] !== 'locked') {
                          useStudentData.getState().ensureLessonHeavy(clickedLesson.id)
                        }
                      }}
                      onHardSelect={(clickedLesson) => {
                        setSelectedLessonId(null)
                        setSelectedHardLessonId(prev => prev === clickedLesson.id ? null : clickedLesson.id)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {(edges.left || edges.right) && <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '4px 16px', padding: '0 32px', fontSize: 11, color: 'var(--color-text-3)' }}>
              {edges.left && <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: -viewportW * 0.85, behavior: 'smooth' })}>{t('← Предыдущие занятия')}</button>}
              {edges.right && <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: viewportW * 0.85, behavior: 'smooth' })}>{t('Дальше есть ещё занятия →')}</button>}
            </div>}

            {/* ── Detail popover — overlay anchored to the selected node, rendered
                 OUTSIDE the scroll viewport so it's never clipped and never shifts
                 the track layout. ── */}
            <AnimatePresence>
              {selectedLesson && selectedLessonStatus && selectedDetail && DetailIcon && (
                <motion.div
                  key={selectedLesson.id}
                  data-lesson-popover
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 26,
                    mass: 0.7,
                    opacity: { duration: 0.15 },
                  }}
                  style={{
                    position: 'absolute',
                    bottom: `calc(100% - ${GLOW_PAD - 14}px)`,
                    left: detailLeft,
                    width: detailCardWidth,
                    borderRadius: 20,
                    // Layered: (1) very light radial glow rising from the bottom,
                    // tinted to the node's circle colour and centred horizontally
                    // OVER the selected node (arrowX) so it sits above the circle,
                    // not the card centre; (2) vertical glass gradient — 80% opaque
                    // at the bottom fading to 40% at the top. Blur stays 18px.
                    background: [
                      `radial-gradient(130% 85% at ${arrowX}px 112%, color-mix(in srgb, ${selectedDetail.palette.border} 16%, transparent), transparent 62%)`,
                      `linear-gradient(to top, rgba(var(--glass-rgb), 0.40), rgba(var(--glass-rgb), 0.20))`,
                    ].join(', '),
                    backdropFilter: 'var(--blur-thin)',
                    WebkitBackdropFilter: 'var(--blur-thin)',
                    border: '1px solid var(--color-border-glass)',
                    boxShadow: 'var(--shadow-md)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transformOrigin: `${arrowX}px bottom`,
                    zIndex: 30,
                  }}
                >
                  {/* Top row: content + points */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div className="flex flex-col flex-1 min-w-0" style={{ gap: 12 }}>
                        <div
                          className="inline-flex items-center gap-1.5"
                          style={{
                            color: selectedDetail.palette.text,
                            padding: '2px 0',
                            width: 'fit-content',
                          }}
                        >
                          <DetailIcon size={14} color={selectedDetail.palette.icon} />
                          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.25 }}>
                            {t(isResumingRetake ? 'Пересдача ДЗ' : selectedDetail.badgeLabel ?? lessonStatusLabel(selectedLessonStatus, selectedLesson.kind))}
                            {selectedLessonStatus === 'test_low' && selectedLesson.result && (
                              <span style={{ whiteSpace: 'nowrap' }}> · {t('порог')} {selectedLesson.result.passingScore}%</span>
                            )}
                          </span>
                        </div>
                        {selectedScheduleState && selectedLessonStatus !== 'locked' && (selectedScheduleState.isCurrent || selectedScheduleState.hasEnded || selectedScheduleState.phase === 'cancelled') && (
                          <ScheduleStatusBadge state={selectedScheduleState} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: selectedDetail.palette.text, lineHeight: 1 }}>
                            {t('Занятие')} #{selectedLesson.number + 1}
                            {selectedDate && (
                              <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}> · {selectedDate}</span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3,
                            }}
                          >
                            {tc(selectedLesson.title)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {selectedGrade || selectedLesson.points != null ? (
                          <div className="flex flex-col items-end">
                            <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: 'var(--color-text)' }}>
                              {selectedGrade ? `${selectedGrade.percent}%` : selectedLesson.points}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: 'var(--color-text)', marginTop: 4 }}>
                              {t(selectedGrade ? 'результат' : 'баллов')}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)' }}>
                            {t(selectedLesson.result?.pending ? 'Результат после проверки' : 'Нет оценки')}
                          </span>
                        )}
                      </div>
                    </div>
                  <LessonSelfAssessment key={selectedLesson.id} lessonId={selectedLesson.id}
                    studentId={ownerStudentIdFor(subject.id)} status={selectedLesson.status} result={selectedLesson.result} />
                  <LessonWatchStatus lesson={selectedLesson} />
                  {selectedLessonStatus === 'locked' ? (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-muted)',
                        background: 'rgba(var(--glass-rgb), 0.5)',
                        borderRadius: 12,
                        padding: '10px 18px',
                        whiteSpace: 'nowrap',
                        cursor: 'not-allowed',
                        width: 'fit-content',
                      }}
                    >
                      {t('Недоступно')}
                    </span>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: showRetake ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)', gap: 8 }}>
                      {showRetake && <TrackHomeworkButton lesson={selectedLesson} resume={resumeRetake} />}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { setSelectedLessonId(null); openLesson(selectedLesson.id) }}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: quietLessonButton ? 'var(--color-accent)' : '#fff',
                          background: selectedLesson.kind === 'test'
                            ? 'linear-gradient(135deg, #34C877, #2A7D4F)'
                            : quietLessonButton ? 'var(--color-accent-soft)' : 'var(--grad-purple)',
                          borderRadius: 12,
                          padding: '8px',
                          minHeight: 40,
                          cursor: 'pointer',
                        }}
                      >
                        {selectedLesson.kind === 'test' ? t('Пройти тест') : t('Открыть урок')}
                      </motion.button>
                    </div>
                  )}
                    </motion.div>
                  )}
                </AnimatePresence>

            {/* ── Hard star popover — same glass-card style as main popover ── */}
            <AnimatePresence>
              {selectedHardLesson && hardStyleData && (
                <motion.div
                  key={`hard-${selectedHardLesson.id}`}
                  data-lesson-popover
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 26,
                    mass: 0.7,
                    opacity: { duration: 0.15 },
                  }}
                  style={{
                    position: 'absolute',
                    bottom: `calc(100% - ${GLOW_PAD - 14}px)`,
                    left: hardDetailLeft,
                    width: hardCardWidth,
                    borderRadius: 20,
                    // Same as the lesson card: light radial glow (tinted to the hard
                    // node's colour) over a 80%→40% vertical glass gradient. Blur 18px.
                    background: [
                      `radial-gradient(130% 85% at 50% 112%, color-mix(in srgb, ${hardStyleData.border} 16%, transparent), transparent 62%)`,
                      `linear-gradient(to top, rgba(var(--glass-rgb), 0.40), rgba(var(--glass-rgb), 0.20))`,
                    ].join(', '),
                    backdropFilter: 'var(--blur-thin)',
                    WebkitBackdropFilter: 'var(--blur-thin)',
                    border: '1px solid var(--color-border-glass)',
                    boxShadow: 'var(--shadow-md)',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transformOrigin: `${hardArrowX}px bottom`,
                    zIndex: 30,
                  }}
                >
                  <div className="flex flex-col flex-1 min-w-0" style={{ gap: 12 }}>
                    {/* Status badge */}
                    <div
                      className="inline-flex items-center gap-1.5"
                      style={{
                        color: hardStyleData.iconColor,
                        padding: '2px 0',
                        width: 'fit-content',
                      }}
                    >
                      {hardStatus === 'completed' ? <Star size={14} fill="currentColor" /> :
                       hardStatus === 'returned'  ? <RotateCcw size={14} /> :
                       hardStatus === 'submitted' ? <Clock size={14} /> :
                       hardStatus === 'locked'    ? <Lock size={14} /> :
                                                    <HardStarLottie size={20} />}
                      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {t(hardStyleData.label)}
                      </span>
                    </div>

                    {/* Title */}
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                      }}
                    >
                      {t('Сложный уровень')} · {tc(selectedHardLesson.title)}
                    </span>

                    {/* The stored score is a sum across accepted hard tasks, not a 1–5 rating. */}
                    {hardStatus === 'completed' && hardAssessment?.hardScore != null && hardAssessment.hardScore > 0 && (
                      <div className="inline-flex items-center" style={{ gap: 6, width: 'fit-content' }}>
                        <Star size={15} fill="#F5C842" color="#F5C842" />
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-yellow-text)' }}>
                          {hardAssessment.hardScore} {t('баллов')}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <span style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                      {hardStatus === 'available' && t('Ты набрал достаточно баллов, чтобы попробовать сложный уровень. Это необязательное задание, но оно принесёт тебе звезду.')}
                      {hardStatus === 'submitted' && t('Работа отправлена на проверку. Преподаватель проверит её и даст обратную связь.')}
                      {hardStatus === 'returned' && t('Преподаватель вернул работу на доработку. Открой урок, чтобы прочитать комментарии и исправить ошибки.')}
                      {hardStatus === 'completed' && t('Сложный уровень принят! Ты отлично справился с заданием повышенной сложности.')}
                      {hardStatus === 'locked' && t('Сложный уровень откроется, когда ты сдашь базовую домашку на 80 баллов или выше. Пересдай основное задание, чтобы разблокировать хард.')}
                    </span>

                    {/* Action button — скрыт для locked: хард недоступен, пока базовая < 80 */}
                    {hardStatus !== 'locked' && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setSelectedHardLessonId(null); openHomeworkForLesson(selectedHardLesson.id, 'hard') }}
                      style={{ height: 48,
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fff',
                        background: 'var(--grad-purple)',
                        borderRadius: 14,
                        padding: '0 22px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: '0 4px 14px rgba(var(--accent-rgb), 0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      {t('Открыть урок')}
                    </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </div>
  )
}

export default function CourseTrack() {
  const t = useT()
  const { activeSubjectId, setActiveSubject, setActiveModule } = useDashboard()
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  // The store's default activeSubjectId may not match a real (DB) subject id yet,
  // so resolve to the actually-rendered subject — this lets the pill appear on
  // first paint without requiring a click.
  const effectiveActiveId =
    subjects.find(s => s.id === activeSubjectId)?.id ?? subjects[0]?.id ?? ''

  useLayoutEffect(() => {
    if (effectiveActiveId && !useDashboard.getState().highlightLessonId) {
      setActiveSubject(effectiveActiveId)
    }
  }, [effectiveActiveId, setActiveSubject])

  if (subjects.length === 0 && !loaded) return <CourseTrackSkeleton />

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 160, gap: 8 }}>
        {loaded && (
          <>
            <Lock size={24} style={{ opacity: 0.35, color: 'var(--color-muted)' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Курсы ещё не добавлены')}</p>
            <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Преподаватель откроет доступ к урокам')}</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TrackForSubject
        key={effectiveActiveId}
        courseSlot={
          <CourseSelect
            subjects={subjects}
            activeId={effectiveActiveId}
            onSelect={id => {
              playTransitionDrop()
              useDashboard.getState().clearTrackHighlight()
              setActiveSubject(id)
              const next = subjects.find(s => s.id === id)
              const moduleId = next && courseResumeTarget(next).moduleId
              if (moduleId != null) setActiveModule(moduleId)
            }}
          />
        }
        subject={subjects.find(s => s.id === activeSubjectId) ?? subjects[0] ?? null}
      />
    </div>
  )
}
