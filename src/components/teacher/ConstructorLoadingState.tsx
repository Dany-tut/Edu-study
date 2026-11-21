import Skeleton from '../Skeleton'

// Геометрия списка конструктора (TeacherConstructorPage, listScrollRef):
// поля 32 px, строка вкладок высотой 40 на высоте 100, под ней через 20 px —
// сетка карточек minmax(240px, 1fr) с зазором 14. Скелетон обязан стоять
// ровно там же, иначе при F5 он сначала прыгал в левый верхний угол (рисовался
// вне оболочки кабинета без полей и отступа под топбар), а потом страница
// уезжала обратно вниз-вправо. Те же числа — в заглушке #boot-constructor
// в index.html.
export const CONSTRUCTOR_TOP = 100
const SIDE = 32
const GRID_GAP = 14

/**
 * Скелетон конструктора на время загрузки чанков.
 * standalone — кабинета ещё нет (fallback в App.tsx): рисуем и место топбара,
 * и отступ под него. Внутри кабинета (Suspense в TeacherDashboardPage) отступ
 * уже даёт .dashboard-root, а топбар настоящий.
 */
export default function ConstructorLoadingState({ standalone: standaloneProp = false }: { standalone?: boolean }) {
  // Отступ под топбар и место пилюли — только у десктопной раскладки (>= 1024):
  // на телефоне и айпаде в портрете у кабинета своя оболочка.
  const standalone = standaloneProp && typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  return (
    <div role="status" aria-label="Загрузка конструктора" style={{
      flex: 1, minHeight: 0, boxSizing: 'border-box', overflow: 'hidden',
      // Тот же резерв полосы прокрутки, что у списка: ширина колонок совпадает.
      scrollbarGutter: 'stable',
      padding: standalone ? `${CONSTRUCTOR_TOP}px ${SIDE}px 32px` : standaloneProp ? '24px 16px' : `0 ${SIDE}px 32px`,
      height: standalone ? '100dvh' : undefined,
      position: 'relative', background: standalone ? 'var(--color-bg)' : undefined,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {standalone && (
        <div aria-hidden style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <Skeleton w="min(690px, 56vw)" h={60} radius={30} />
        </div>
      )}
      <div aria-hidden style={{ height: 40, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <Skeleton w={40} h={40} radius={20} />
        <Skeleton w={104} h={40} radius={20} />
        <Skeleton w={88} h={40} radius={20} />
        <Skeleton w={96} h={40} radius={20} />
        <Skeleton w={110} h={40} radius={20} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: GRID_GAP, alignContent: 'start' }}>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} aria-hidden style={{
            background: 'rgba(var(--glass-rgb), 0.88)', border: '1px solid var(--color-border-glass)',
            borderRadius: 20, padding: '18px 18px 12px', display: 'flex', flexDirection: 'column',
            gap: 10, minHeight: 164, boxSizing: 'border-box', boxShadow: 'var(--shadow-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <Skeleton w={36} h={36} radius={12} />
              <Skeleton w={64} h={18} radius={7} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton w="85%" h={13} />
              <Skeleton w="55%" h={13} />
              <Skeleton w="70%" h={10} style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
              <Skeleton w={78} h={11} />
              <Skeleton w={34} h={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
