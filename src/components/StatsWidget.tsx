import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { computeSubjectStats } from '../lib/db'
import StarStickerLottie from './StarStickerLottie'
import Skeleton from './Skeleton'
import { useT } from '../lib/i18n'

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

  // Подпись «чей это счёт» — только когда курсов больше одного: иначе она
  // повторяет единственную вкладку трека. Лежит поверх свободного поля первой
  // карточки (цифра в ней центрирована), чтобы карточки остались той же высоты,
  // что и соседние виджеты в ряду. В плотной раскладке 2×2 места нет — там
  // карточка вдвое ниже и подпись налезла бы на цифру.
  const scopeLabel = course && subjects.length > 1 && columns < 3 ? course.name : null

  return (
    <div className="relative h-full w-full">
      {scopeLabel && (
        <span
          className="truncate"
          style={{
            position: 'absolute', top: 12, left: 20, zIndex: 1,
            maxWidth: `calc(${100 / gridCols}% - 40px)`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--color-text-4)',
            pointerEvents: 'none',
          }}
        >
          {scopeLabel}
        </span>
      )}
      <div
        className="stats-grid h-full"
        data-testid="stats-grid"
        data-triple={columns >= 3 ? 'true' : undefined}
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: columns >= 3 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' }}
      >
        {statCards.map(s => (
          <div key={s.label} className="stat-card flex flex-col items-center justify-center rounded-[24px]" style={{ ...cardStyle, textAlign: 'center', gap: 8 }}>
            <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1 }}>
              {s.value ?? (loaded ? <EmptyValue icon={STAT_ICONS[s.label]} /> : <PendingValue />)}
            </span>
            <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
              {t(s.label)}
            </span>
          </div>
        ))}

        {/* Stars card */}
        <div className="stat-card flex flex-col items-center justify-center rounded-[24px]" style={{ ...cardStyle, textAlign: 'center', gap: 8 }}>
          <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasLessons ? (
              <>
                <span style={{ display: 'flex', transform: 'translateY(-1px)' }}><StarStickerLottie size={36} /></span>
                <span style={{ display: 'block', lineHeight: 1, transform: 'translateY(-1px)' }}>{stats.stars}</span>
              </>
            ) : loaded ? (
              <EmptyValue icon="⭐" />
            ) : (
              <PendingValue />
            )}
          </span>
          <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
            {t('Звёзды')}
          </span>
        </div>
      </div>
    </div>
  )
}
