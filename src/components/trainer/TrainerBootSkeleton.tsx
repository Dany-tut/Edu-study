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
//
// ГЕОМЕТРИЯ ПОВТОРЯЕТСЯ ПОЭЛЕМЕНТНО, А НЕ «НА ГЛАЗ». Пока рейл здесь лежал без
// стеклянной карточки, а строка управления — без отрицательных полей полосы,
// смена этой заглушки на TrainerSkeleton двигала плашки на 14–16 px вниз и
// вправо: два скелетона подряд, и между ними прыжок. Числа ниже —
// те же, что в TrainerShell (RAIL_W, PAD_TOP, отступы root/main/aside/bar);
// меняя их там, поправь и здесь.
// ─────────────────────────────────────────────────────────────────────────────

import { MOBILE_TOP_GAP } from '../../lib/mobileTokens'

function Bar({ w = '100%', h = 14, r = 8 }: { w?: number | string; h?: number; r?: number }) {
  return <span aria-hidden className="skeleton" style={{ display: 'block', width: w, height: h, borderRadius: r }} />
}

/** TrainerShell.RAIL_W */
const RAIL_W = 300
/** TrainerShell.PAD_TOP */
const PAD_TOP = `calc(env(safe-area-inset-top, 0px) + ${MOBILE_TOP_GAP}px)`

const CARD = {
  display: 'flex', flexDirection: 'column' as const, gap: 9,
  padding: '16px 18px', borderRadius: 18,
  background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
}

export default function TrainerBootSkeleton({ desktop }: { desktop: boolean }) {
  const narrow = !desktop
  const rows = narrow ? 7 : 3

  // Повторяет корневой div TrainerShell.
  const shell = (
    <div style={{
      width: '100%',
      paddingTop: 8,
      paddingLeft: narrow ? 16 : 0,
      paddingRight: narrow ? 16 : 0,
      paddingBottom: narrow ? 198 : 80,
      display: 'flex', flexDirection: narrow ? 'column' : 'row',
      gap: narrow ? 16 : 22, alignItems: 'flex-start',
    }}>
      {/* Рейл — только на большом экране: на телефоне он и в готовом тренажёре
          спрятан в шторку, и плашка на его месте обещала бы лишнее. */}
      {!narrow && (
        <div style={{ flexShrink: 0, width: RAIL_W }}>
          {/* Та же стеклянная карточка, что оборачивает рейл в TrainerShell:
              без неё плашки стоят на 16 px левее и выше, чем в следующем
              скелетоне. */}
          <aside style={{
            display: 'flex', flexDirection: 'column', gap: 16,
            padding: 16, borderRadius: 24,
            background: 'rgba(var(--glass-rgb), 0.97)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
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
          </aside>
        </div>
      )}

      {/* Повторяет <main> TrainerShell. */}
      <div style={{
        flex: 1, minWidth: 0, width: narrow ? '100%' : undefined,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Полоса управления — вместе с её отрицательными полями: они поднимают
            таблетки к самому верху колонки, и без них ряд стоял на 14 px выше,
            чем в TrainerSkeleton. */}
        <div style={{
          marginTop: -8, marginBottom: -10,
          paddingTop: PAD_TOP, paddingBottom: 10,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <Bar w={112} h={36} r={999} />
              <Bar w={196} h={36} r={999} />
              <Bar w={148} h={36} r={999} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {narrow && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: '18px 18px 20px', borderRadius: 20, marginBottom: 2,
              background: 'rgba(var(--glass-rgb), 0.94)',
              border: '1px solid var(--color-border-soft)',
            }}>
              <Bar w="52%" h={20} r={10} />
              <Bar w="34%" h={13} />
            </div>
          )}
          {Array.from({ length: rows }, (_, i) => i).map(i => (
            <div key={i} style={{ ...CARD, opacity: i >= rows - 2 ? 1 - (i - (rows - 3)) * 0.26 : 1 }}>
              <Bar w={170} h={12} />
              <Bar w={`${64 - (i % 3) * 9}%`} h={17} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Внешняя обёртка повторяет ту, в которую TaskBankPage кладёт TrainerSkeleton:
  // на телефоне — отступ под чёлку и под нижнюю навигацию, на десктопе — ничего
  // сверх самого скелета.
  return (
    <div
      role="status"
      aria-busy="true"
      style={narrow ? {
        minHeight: '100dvh', background: 'var(--color-bg)',
        paddingTop: `calc(env(safe-area-inset-top, 0px) + ${58 + MOBILE_TOP_GAP}px)`,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
      } : { minHeight: '60vh', background: 'var(--color-bg)' }}
    >
      {shell}
    </div>
  )
}
