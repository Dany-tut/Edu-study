import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { LogOut, Flame, CheckCircle2, Star, TrendingUp, TrendingDown, Zap, Moon, Sun, MessageSquarePlus, Download, ChevronRight, BookOpen, ListChecks } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import HScrollFade from './HScrollFade'
import { DynamicIsland } from './mobileChrome'
import MobileBell from './MobileBell'
import SubjectSwitcher from './SubjectSwitcher'
import FeedbackModal from './FeedbackModal'
import { getStudentSession, clearStudentSession } from '../lib/studentSession'
import { supabase } from '../lib/supabase'
import { trackNow } from '../lib/analytics'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { subjectRank, subjectIcon, resolveSubjectPalette } from '../lib/subjects'
import { useTheme } from '../store/themeStore'
import { useT, useLang, type Lang } from '../lib/i18n'
import { PAIR } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'
import { requestShowInstall, isStandalone } from '../lib/pwaInstall'
import type { LucideIcon } from 'lucide-react'
import type { Subject } from '../data/mockData'

// MOBILE ONLY profile. Desktop has no profile screen. Floating glass chrome
// (Dynamic Island streak/XP) + identity + level/XP hero + stats + settings.

const XP_PER_LEVEL = 200

// Soft colour pairs cycled across the subject chips under the name.
const CHIP_PALETTE = [PAIR.focus, PAIR.accent2, PAIR.info, PAIR.warning, PAIR.rose, PAIR.success]

// Русские числительные: «2 курса», а не «2 курсов». Формы: 1 / 2-4 / 5+.
function plural(n: number, ru: [string, string, string], en: [string, string], lang: string): string {
  if (lang !== 'ru') return n === 1 ? en[0] : en[1]
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return ru[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return ru[1]
  return ru[2]
}

// Per-subject stats derived from the subject's own lessons (the global `stats`
// covers every subject at once). Streak/stars are account-wide, so the subject
// view swaps in progress % + lesson count instead.
function computeSubjectStats(subject: Subject) {
  const lessons = subject.modules.flatMap(m => m.lessons)
  const completed = lessons.filter(l => l.status === 'completed').length
  const graded = lessons.filter(l => typeof l.points === 'number')
  const avg = graded.length ? Math.round(graded.reduce((s, l) => s + (l.points ?? 0), 0) / graded.length) : 0
  return { completed, total: lessons.length, avg, progress: subject.progress }
}

export default function MobileProfilePage() {
  const t = useT()
  const { lang, setLang } = useLang()
  const name = getStudentSession()?.name?.trim() || t('Ученик')
  const initial = name.charAt(0).toUpperCase()
  const stats = useStudentData(s => s.stats)
  const subjects = useStudentData(s => s.subjects)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const { dark, toggle } = useTheme()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // Stats scope: 'all' = account-wide totals, or a single subject's own numbers.
  const [statScope, setStatScope] = useState<'all' | string>('all')

  // Show the "install app" row only when not already running as an installed PWA.
  const canInstall = !isStandalone()

  const scopeSubject = statScope === 'all' ? null : subjects.find(s => s.id === statScope) ?? null
  const scopeLabel = scopeSubject ? scopeSubject.name : t('Все предметы')
  const subjectStats = useMemo(() => scopeSubject ? computeSubjectStats(scopeSubject) : null, [scopeSubject])

  // Recent graded scores → sparkline trend. In-order proxy for a time series
  // (lessons carry no timestamp): the last dozen graded lessons' points.
  const trend = useMemo(() => {
    const src = scopeSubject ? [scopeSubject] : subjects
    return src
      .flatMap(s => s.modules.flatMap(m => m.lessons))
      .filter(l => typeof l.points === 'number')
      .map(l => l.points as number)
      .slice(-12)
  }, [scopeSubject, subjects])

  const heroAvg = subjectStats ? subjectStats.avg : stats.avgScore
  // Дельта = насколько последняя работа лучше первой в видимом окне графика.
  const delta = trend.length >= 2 ? trend[trend.length - 1] - trend[0] : null

  const level = Math.floor(stats.totalPoints / XP_PER_LEVEL) + 1
  const xpInLevel = stats.totalPoints % XP_PER_LEVEL
  // Звание берётся из предмета, по которому смотрят статистику (а при «Все
  // предметы» — из активного курса): химические «Молекулы» ученику языка ничего
  // не говорят (lib/subjects.ts).
  const rankSubject = scopeSubject ?? subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
  const rank = t(subjectRank(rankSubject?.subject, level))

  const logout = () => {
    tactile()
    clearStudentSession()
    void trackNow('logout', { role: 'student' })
    void supabase.auth.signOut()
    window.location.hash = '#/'
    window.location.reload()
  }

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <div style={{ width: 38, flexShrink: 0 }} />
      <DynamicIsland>
        <Flame size={15} style={{ color: '#F8A23B' }} />
        <span>{stats.streak} {t('дней')}</span>
        <span style={{ opacity: 0.35 }}>·</span>
        <Zap size={14} style={{ color: 'var(--color-accent)' }} />
        <span>{stats.totalPoints}</span>
      </DynamicIsland>
      <MobileBell />
    </div>
  )

  return (
    <>
      <MobileScreen topZone={topZone} topPad={72}>
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* Identity + уровень + XP — одна карточка. Раньше «Уровень 2 · Алфавит»
              печаталось дважды (подпись под именем и заголовок XP-плашки). */}
          <div style={{ borderRadius: 24, padding: 16, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
            <div className="flex items-center" style={{ gap: 14 }}>
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 58, height: 58, borderRadius: 999, background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', color: '#fff', fontSize: 25, fontWeight: 700, boxShadow: '0 8px 22px rgba(123,63,204,0.3)' }}
              >
                {initial}
              </div>
              <div className="min-w-0" style={{ flex: 1 }}>
                <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.15 }}>{name}</div>
                <div className="flex items-center flex-wrap" style={{ gap: 6, marginTop: 7 }}>
                  <span className="flex items-center" style={{ gap: 4, background: PAIR.focus.bg, color: PAIR.focus.text, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                    <Zap size={11} />{t('Уровень')} {level} · {rank}
                  </span>
                  {subjects.length > 0 && (
                    <span className="flex items-center" style={{ gap: 4, background: 'var(--color-bg-5)', color: 'var(--color-muted)', fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                      <BookOpen size={11} />{subjects.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 15 }}>
              <div className="flex items-center justify-between" style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-3)' }}>{t('До уровня')} {level + 1}</span>
                <span style={{ color: 'var(--color-purple-text)' }}>{xpInLevel}/{XP_PER_LEVEL} XP</span>
              </div>
              <div style={{ height: 8, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((xpInLevel / XP_PER_LEVEL) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#9B6FE8,#C58BFF)', borderRadius: 99 }} />
              </div>
            </div>
          </div>

          {/* Переключатель предметов (для учеников 1:1 с несколькими карточками) */}
          <SubjectSwitcher />

          {/* Курсы — ОДНА строка с прокруткой вместо облака чипсов на шесть рядов
              (при восьми курсах оно съедало пол-экрана). Тап по карточке заодно
              скоупит статистику ниже — отдельный док-переключатель с теми же
              названиями больше не нужен. */}
          {subjects.length > 0 && (
            <div className="flex flex-col" style={{ gap: 9 }}>
              <div className="flex items-baseline justify-between" style={{ padding: '0 2px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {t('Мои курсы')} · {subjects.length}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-4)' }}>{t('тап — статистика курса')}</span>
              </div>
              <HScrollFade gap={8} fade="var(--color-bg)" padBottom={2}>
                <CourseCard
                  title={t('Все курсы')}
                  icon="✨"
                  active={statScope === 'all'}
                  onClick={() => setStatScope('all')}
                  caption={`${subjects.length} ${plural(subjects.length, ['курс', 'курса', 'курсов'], ['course', 'courses'], lang)}`}
                />
                {subjects.map((s, i) => (
                  <CourseCard
                    key={s.id}
                    title={s.name}
                    icon={subjectIcon(s.subject)}
                    pair={CHIP_PALETTE[i % CHIP_PALETTE.length]}
                    progress={s.progress}
                    active={statScope === s.id}
                    onClick={() => setStatScope(statScope === s.id ? 'all' : s.id)}
                  />
                ))}
              </HScrollFade>
            </div>
          )}

          {/* Статистика — герой со средним баллом и полноценным графиком
              (сетка, заливка, точки, дельта), ниже компактные метрики. */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('Статистика')} · {scopeLabel}
            </span>

            {/* Hero — средний балл + график последних работ */}
            <div style={{ borderRadius: 22, padding: 16, color: '#fff', background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', boxShadow: '0 10px 26px rgba(123,63,204,0.28)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('Средний балл')}</div>
                  <div className="flex items-center" style={{ gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{heroAvg ? `${heroAvg}%` : '—'}</span>
                    {delta !== null && (
                      <span className="flex items-center" style={{ gap: 2, fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.18)' }}>
                        {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                </div>
                {trend.length >= 2 && (
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textAlign: 'right', lineHeight: 1.3 }}>
                    {t('последние')}<br />{trend.length} {plural(trend.length, ['работа', 'работы', 'работ'], ['score', 'scores'], lang)}
                  </span>
                )}
              </div>

              <ScoreChart data={trend} empty={t('Пока нет оценок — график появится после первой проверки')} />

              {trend.length >= 2 && (
                <div className="flex" style={{ gap: 6, marginTop: 12 }}>
                  <HeroStat label={t('Лучший')} value={`${Math.max(...trend)}%`} />
                  <HeroStat label={t('Слабый')} value={`${Math.min(...trend)}%`} />
                  <HeroStat label={t('Последний')} value={`${trend[trend.length - 1]}%`} />
                </div>
              )}
            </div>

            {/* Secondary metrics — compact grid */}
            {subjectStats ? (
              <div className="flex" style={{ gap: 8 }}>
                <MiniStat icon={CheckCircle2} value={subjectStats.completed} label={t('Выполнено')} pair={PAIR.success} />
                <MiniStat icon={ListChecks} value={`${subjectStats.progress}%`} label={t('Пройдено')} pair={PAIR.focus} />
                <MiniStat icon={BookOpen} value={subjectStats.total} label={t('Всего уроков')} pair={PAIR.review} />
              </div>
            ) : (
              <div className="flex" style={{ gap: 8 }}>
                <MiniStat icon={CheckCircle2} value={stats.completedTasks} label={t('Заданий')} pair={PAIR.success} />
                <MiniStat icon={Flame} value={stats.streak} label={t('Дней')} pair={PAIR.warning} />
                <MiniStat icon={Star} value={stats.stars} label={t('Звёзды')} pair={PAIR.focus} />
              </div>
            )}
          </div>

          {/* Settings — grouped into one card with hairline dividers instead of
              separate full-width plates. */}
          <div className="flex flex-col" style={{ gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 2px' }}>
              {t('Настройки')}
            </div>
            <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
              {/* Тема — весь ряд кликабелен, один тап меняет тему */}
              <button
                onClick={() => { tactile(); toggle() }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '12px 15px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border-soft)' }}
                aria-label={t('Переключить тему')}
              >
                <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t('Тема оформления')}</span>
                <span className="flex items-center" style={{ gap: 5, height: 34, padding: '0 15px', borderRadius: 999, background: 'var(--color-bg-5)', color: 'var(--color-accent)', fontSize: 12.5, fontWeight: 600 }}>
                  {dark ? <Moon size={13} strokeWidth={1.9} /> : <Sun size={13} strokeWidth={1.9} />}
                  {dark ? t('Тёмная') : t('Светлая')}
                </span>
              </button>

              {/* Язык — весь ряд кликабелен, один тап меняет язык */}
              <button
                onClick={() => { tactile(); setLang((lang === 'ru' ? 'en' : 'ru') as Lang) }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '12px 15px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border-soft)' }}
                aria-label={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
              >
                <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t('Язык')}</span>
                <span className="flex items-center" style={{ height: 34, padding: '0 15px', borderRadius: 999, background: 'var(--color-bg-5)', color: 'var(--color-accent)', fontSize: 12.5, fontWeight: 600 }}>
                  {lang === 'ru' ? 'Русский' : 'English'}
                </span>
              </button>

              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={() => { tactile(); setFeedbackOpen(true) }}
                className="flex items-center justify-between cursor-pointer"
                style={{ width: '100%', padding: '14px 15px', background: 'transparent', border: 'none', borderBottom: canInstall ? '1px solid var(--color-border-soft)' : 'none' }}
              >
                <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
                  <MessageSquarePlus size={18} style={{ color: 'var(--color-muted)' }} />{t('Обратная связь')}
                </span>
                <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />
              </motion.button>

              {canInstall && (
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { tactile(); requestShowInstall() }}
                  className="flex items-center justify-between cursor-pointer"
                  style={{ width: '100%', padding: '14px 15px', background: 'transparent', border: 'none' }}
                >
                  <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
                    <Download size={18} style={{ color: 'var(--color-muted)' }} />{t('Установить приложение')}
                  </span>
                  <ChevronRight size={17} style={{ color: 'var(--color-text-4)' }} />
                </motion.button>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              className="flex items-center justify-center cursor-pointer"
              style={{ gap: 8, padding: '13px', borderRadius: 16, background: 'transparent', color: PAIR.error.text, border: 'none', fontSize: 14.5, fontWeight: 600 }}
            >
              <LogOut size={17} />
              {t('Выйти из аккаунта')}
            </motion.button>
          </div>
        </div>
      </MobileScreen>

      <MobileBottomNav />
      {feedbackOpen && <FeedbackModal role="student" onClose={() => setFeedbackOpen(false)} />}
    </>
  )
}

// График баллов для стат-героя: шкала 0–100 с подписанной сеткой, заливка под
// линией, точка на каждой работе и подписанное последнее значение. Шкала всегда
// от 0 до 100 — «плавающий» минимум прошлого спарклайна раздувал разницу в пару
// баллов до целого экрана и врал о прогрессе.
// Пропорции держит viewBox с meet: круги точек не превращаются в эллипсы, как
// было бы при preserveAspectRatio="none".
function ScoreChart({ data, empty }: { data: number[]; empty: string }) {
  const W = 320, H = 132
  const padT = 10, padB = 14, padR = 30, padL = 0
  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 96, marginTop: 14, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600, opacity: 0.8, padding: '0 18px', textAlign: 'center', lineHeight: 1.35 }}
      >
        {empty}
      </div>
    )
  }
  const plotH = H - padT - padB
  const plotW = W - padL - padR
  const y = (v: number) => padT + (1 - Math.max(0, Math.min(100, v)) / 100) * plotH
  const pts = data.map((v, i) => [padL + (i / (data.length - 1)) * plotW, y(v)] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${(padT + plotH).toFixed(1)} L${pts[0][0].toFixed(1)},${(padT + plotH).toFixed(1)} Z`
  const last = data[data.length - 1]
  const [ex, ey] = pts[pts.length - 1]
  const avg = Math.round(data.reduce((s, v) => s + v, 0) / data.length)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 14, display: 'block' }}>
      <defs>
        <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.34} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Сетка 0/50/100 с подписями справа — без неё линия висела без масштаба */}
      {[0, 50, 100].map(v => (
        <g key={v}>
          <line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity={v === 0 ? 0.28 : 0.14} strokeWidth={1} strokeDasharray={v === 0 ? undefined : '3 4'} />
          <text x={padL + plotW + 6} y={y(v) + 3.5} fill="#fff" fillOpacity={0.6} fontSize={9} fontWeight={700}>{v}</text>
        </g>
      ))}

      {/* Средний балл — пунктир, чтобы видеть, какие работы выше своей нормы */}
      <line x1={padL} x2={padL + plotW} y1={y(avg)} y2={y(avg)} stroke="#fff" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />

      <path d={area} fill="url(#scoreFill)" />
      <path d={line} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {pts.slice(0, -1).map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={2.6} fill="#fff" fillOpacity={0.75} />
      ))}
      <circle cx={ex} cy={ey} r={6.5} fill="#fff" fillOpacity={0.28} />
      <circle cx={ex} cy={ey} r={3.6} fill="#fff" />
      <text x={Math.min(ex, padL + plotW - 4)} y={Math.max(ey - 11, 9)} fill="#fff" fontSize={11} fontWeight={800} textAnchor="end">{last}%</text>
    </svg>
  )
}

// Карточка курса в горизонтальной строке. Активная = выбранный скоуп статистики.
function CourseCard({ title, icon, caption, progress, pair, active, onClick }: {
  title: string
  icon: string
  caption?: string
  progress?: number
  pair?: { bg: string; text: string }
  active: boolean
  onClick: () => void
}) {
  const accent = pair?.text ?? 'var(--color-accent)'
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => { tactile(); onClick() }}
      className="flex flex-col cursor-pointer text-left flex-shrink-0"
      style={{
        width: 158,
        gap: 8,
        padding: 12,
        borderRadius: 18,
        background: active ? (pair?.bg ?? 'var(--color-purple-soft)') : 'var(--color-bg-3)',
        border: `1.5px solid ${active ? accent : 'var(--color-border-soft)'}`,
      }}
    >
      <span className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: pair?.bg ?? 'var(--color-bg-5)', fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.25, color: active ? accent : 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>
        {title}
      </span>
      {typeof progress === 'number' ? (
        <span className="flex items-center" style={{ gap: 7 }}>
          <span style={{ flex: 1, height: 5, borderRadius: 99, background: 'var(--color-bg-5)', overflow: 'hidden' }}>
            <span style={{ display: 'block', width: `${Math.max(2, progress)}%`, height: '100%', borderRadius: 99, background: accent }} />
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--color-text-3)' }}>{progress}%</span>
        </span>
      ) : (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-3)' }}>{caption}</span>
      )}
    </motion.button>
  )
}

// Мини-метрика внутри фиолетового героя (на градиенте, поэтому белым).
function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 13, background: 'rgba(255,255,255,0.16)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function MiniStat({ icon: Icon, value, label, pair }: { icon: LucideIcon; value: string | number; label: string; pair: { bg: string; text: string } }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 12px', borderRadius: 16, background: pair.bg, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Icon size={16} style={{ color: pair.text }} />
      <div style={{ fontSize: 20, fontWeight: 800, color: pair.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: pair.text, opacity: 0.85, lineHeight: 1.2 }}>{label}</div>
    </div>
  )
}
