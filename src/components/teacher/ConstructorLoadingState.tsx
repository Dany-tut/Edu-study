import Skeleton from '../Skeleton'

/** Show the constructor's card layout while either the cabinet or page chunk loads. */
export default function ConstructorLoadingState() {
  return (
    <div role="status" aria-label="Загрузка конструктора" style={{ flex: 1, minHeight: 0, padding: '24px 0', boxSizing: 'border-box' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, alignContent: 'start' }}>
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
