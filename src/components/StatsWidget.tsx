import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { computeSubjectStats } from '../lib/db'
import StarStickerLottie from './StarStickerLottie'
import Skeleton from './Skeleton'
import { useT } from '../lib/i18n'
import { useSeason, seasonImg } from '../lib/season'
import { useSeasonStars, SeasonFlask } from './season/Season'

const STAT_ICONS: Record<string, string> = {
  'Успеваемость': '📈',
  'Средний балл': '🎯',
  'Общий балл':   '💎',
}

/** Курс ещё едет из Supabase. Скелетон, а НЕ «нет данных»: до загрузки мы не
 *  знаем, есть ли у ученика оценки, а «нет данных» — это утверждение. Ученик с
 *  полным курсом успевал прочитать его четыре раза за вход и решить, что
 *  прогресс потерян. */
function PendingValue() {
  return (
    <span aria-busy="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Skeleton w={34} h={28} radius={9} />
      <Skeleton w={58} h={11} />
    </span>
  )
}

function EmptyValue({ icon }: { icon: string }) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 28, opacity: 0.25, filter: 'grayscale(1)' }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-4)', letterSpacing: 0.2 }}>
        {t('нет данных')}
      </span>
    </div>
  )
}

export default function StatsWidget({ columns = 1 }: { columns?: number }) {
  const t = useT()
  const accountStats = useStudentData(s => s.stats)
  const subjects = useStudentData(s => s.subjects)
  const progress = useStudentData(s => s.progress)
  const loaded = useStudentData(s => s.loaded)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  // Праздничная тема: «Звёзды» становятся тыквами/конфетами/зельями, а в
  // «Зельеварне» у успеваемости появляется колба с уровнем = процент.
  const seasonStars = useSeasonStars()
  const season = useSeason()
  const flask = season.on('decor') && season.variant === 'potions' && columns < 3

  // Цифры — по ВЫБРАННОМУ курсу, а не по всем сразу: у ученика их несколько, и
  // общая сумма баллов по корейскому с английским не значит ничего. Курс берём
  // тот же, что подсвечен в треке (тот же фолбэк на первый курс, что и там, —
  // до первой загрузки в сторе лежит id-заглушка). Без курсов вообще (например,
  // одна внекурсовая домашка) остаёмся на общих числах.
  const course = subjects.find(s => s.id === activeSubjectId) ?? subjects[0] ?? null
  const stats = course ? computeSubjectStats(course, progress) : accountStats

  // Пустые состояния раздельные: у только что открытого курса уроки уже есть
  // (значит «Успеваемость 0%» — честный ноль), а оценок ещё нет, и рисовать в
  // баллах нули там нельзя — это читается как «получил ноль».
  const hasLessons = loaded && stats.totalTasks > 0
  const hasScores = loaded && stats.avgScore > 0

  const statCards = [
    { label: 'Успеваемость', value: hasLessons ? `${stats.performance}%` : null },
    { label: 'Средний балл', value: hasScores ? `${stats.avgScore}` : null },
    { label: 'Общий балл',   value: hasScores ? stats.totalPoints.toLocaleString('ru-RU') : null },
  ]

  const cardStyle: React.CSSProperties = {
    minWidth: 0,
    background: 'rgba(var(--glass-rgb), 0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--color-border-glass)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  }

  // ≤2 widgets per row → single row of 4; ≥3 → 2×2
  const gridCols = columns >= 3 ? 2 : 4

  // Подписи «чей это счёт» над первой карточкой нет: активный курс и так виден
  // вкладкой трека прямо под плитками, а над цифрой она читалась шумом (Даня, 29.10.2026).

  return (
    <div className="relative h-full w-full">
      <div
        className="stats-grid h-full"
        data-testid="stats-grid"
        data-triple={columns >= 3 ? 'true' : undefined}
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: columns >= 3 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' }}
      >
        {statCards.map(s => {
          const body = (
            <>
              <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1 }}>
                {s.value ?? (loaded ? <EmptyValue icon={STAT_ICONS[s.label]} /> : <PendingValue />)}
              </span>
              <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
                {t(s.label)}
              </span>
            </>
          )
          if (flask && s.label === 'Успеваемость' && s.value) return (
            <div key={s.label} className="stat-card stat-card--flask flex items-center justify-center rounded-[24px]" style={{ ...cardStyle, gap: 12 }}>
              <SeasonFlask pct={stats.performance} height={76} />
              <div className="flex flex-col items-start" style={{ gap: 8, minWidth: 0 }}>{body}</div>
            </div>
          )
          return (
            <div key={s.label} className="stat-card flex flex-col items-center justify-center rounded-[24px]" style={{ ...cardStyle, textAlign: 'center', gap: 8 }}>
              {body}
            </div>
          )
        })}

        {/* Stars card */}
        <div className={`stat-card flex flex-col items-center justify-center rounded-[24px]${seasonStars ? ' stat-card--season-stars' : ''}`} style={{ ...cardStyle, textAlign: 'center', gap: 8 }}>
          <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasLessons ? (
              <>
                {seasonStars
                  ? <img aria-hidden src={seasonImg(seasonStars.img)} alt="" className="season-stat-img" style={columns >= 3 ? { height: 40 } : undefined} />
                  : <span style={{ display: 'flex', transform: 'translateY(-1px)' }}><StarStickerLottie size={36} /></span>}
                <span style={{ display: 'block', lineHeight: 1, transform: 'translateY(-1px)' }}>{stats.stars}</span>
              </>
            ) : loaded ? (
              <EmptyValue icon="⭐" />
            ) : (
              <PendingValue />
            )}
          </span>
          <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
            {t(seasonStars?.label ?? 'Звёзды')}
          </span>
        </div>
      </div>
    </div>
  )
}
