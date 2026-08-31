// ─────────────────────────────────────────────────────────────────────────────
// Заглушка на время ЗАГРУЗКИ ЧАНКА тренажёра
//
// ЗАЧЕМ. Экранов ожидания у тренажёра два, и путают их легко. TrainerSkeleton
// ждёт ДАННЫЕ ученика — он живёт внутри TaskBankPage и, значит, показывается
// только когда чанк страницы уже приехал. До этого Suspense рисовал пустой фон:
// секунда белого, потом скелетон, потом содержимое — три экрана подряд вместо
// одного.
//
// Здесь та же геометрия, но БЕЗ TrainerShell: этот компонент импортирует
// DashboardPage, то есть всё, что он тянет, попадает в главный чанк. Ради
// заглушки тащить туда док, шторки и framer-motion нельзя — ровно этот вес и
// растягивает ту самую первую секунду. Поэтому только разметка и inline-стили.
// ─────────────────────────────────────────────────────────────────────────────

import { MOBILE_TOP_GAP } from '../../lib/mobileTokens'

function Bar({ w = '100%', h = 14, r = 8 }: { w?: number | string; h?: number; r?: number }) {
  return <span aria-hidden className="skeleton" style={{ display: 'block', width: w, height: h, borderRadius: r }} />
}

const CARD = {
  display: 'flex', flexDirection: 'column' as const, gap: 9,
  padding: '16px 18px', borderRadius: 18,
  background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
}

export default function TrainerBootSkeleton({ desktop }: { desktop: boolean }) {
  const rows = desktop ? 3 : 7
  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        minHeight: desktop ? '60vh' : '100dvh',
        background: 'var(--color-bg)',
        display: 'flex', gap: 22, alignItems: 'flex-start',
        padding: desktop
          ? '8px 0 80px'
          : `calc(env(safe-area-inset-top, 0px) + ${58 + MOBILE_TOP_GAP}px) 16px calc(env(safe-area-inset-bottom, 0px) + 110px)`,
      }}
    >
      {/* Рейл — только на большом экране: на телефоне он и в готовом тренажёре
          спрятан в шторку, и плашка на его месте обещала бы лишнее. */}
      {desktop && (
        <div style={{ flexShrink: 0, width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Bar h={104} r={16} />
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 11, padding: 14, borderRadius: 16,
            background: 'rgba(var(--glass-rgb), 0.94)',
            border: '1px solid var(--color-border-soft)',
          }}>
            <Bar w="45%" h={13} />
            <Bar h={38} r={12} />
            <Bar h={38} r={12} />
            <Bar h={38} r={12} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!desktop && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: '18px 18px 20px', borderRadius: 20,
            background: 'rgba(var(--glass-rgb), 0.94)',
            border: '1px solid var(--color-border-soft)',
          }}>
            <Bar w="52%" h={20} r={10} />
            <Bar w="34%" h={13} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 4 }}>
          <Bar w={112} h={36} r={999} />
          <Bar w={196} h={36} r={999} />
          <Bar w={148} h={36} r={999} />
        </div>
        {Array.from({ length: rows }, (_, i) => i).map(i => (
          <div key={i} style={{ ...CARD, opacity: i >= rows - 2 ? 1 - (i - (rows - 3)) * 0.26 : 1 }}>
            <Bar w={170} h={12} />
            <Bar w={`${64 - (i % 3) * 9}%`} h={17} />
          </div>
        ))}
      </div>
    </div>
  )
}
