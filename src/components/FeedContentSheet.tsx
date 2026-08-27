import { useMemo } from 'react'
import { Reorder, useDragControls, motion } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import MobileSheet from './MobileSheet'
import Switch from './Switch'
import {
  filterLabel, filterIcon, feedKind, itemTheme, KIND_LABEL, THEME_ORDER,
  type FeedItem, type FeedKind, type FeedTheme,
} from '../data/feed'
import { useFeedPrefs } from '../store/feedPrefsStore'
import { tactile, haptic } from '../lib/feedback'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// «Настройки ленты» — из фильтра в шапке
//
// ЧТО ЗДЕСЬ РЕШАЮТ, а что нет. Здесь — состав ленты: какие темы в ней вообще
// есть, в каком порядке они идут и какого рода материал показывать. Рубрика
// наверху (чипс «Наука») этим не занимается: она временный взгляд на ленту, а
// не её устройство, и живёт ровно до ухода с экрана.
//
// ПОРЯДОК ТАСУЕТСЯ ПАЛЬЦЕМ, А НЕ СТРЕЛОЧКАМИ. «Сперва новости, потом наука» —
// это про очередь, и очередь показывают очередью: ряд, который перетаскивают.
// Стрелки вверх-вниз требуют посчитать в уме, сколько раз нажать, и на шести
// темах это уже головоломка.
//
// ПЕРЕТАСКИВАНИЕ САМО ВКЛЮЧАЕТ «СНАЧАЛА ПО ТЕМАМ». Человек, который двигает
// «Науку» наверх, делает это ровно с одним намерением — чтобы наука шла
// первой. Оставить его наедине с выключателем, без которого перетаскивание
// ничего не меняет, значит показать настройку, которая на вид сработала, а на
// деле нет. Переключатель при этом виден и его тут же можно вернуть.
//
// ПОКАЗЫВАЕМ ВСЕ ТЕМЫ, даже те, которых у этого языка нет: настройка переживает
// смену курса, и список, который перетасовывается вместе с ней, невозможно
// запомнить. У пустой темы стоит честная подпись, а не ноль в скобках.
// ─────────────────────────────────────────────────────────────────────────────

function KindRow({ kind, count, on, onToggle, first }: {
  kind: FeedKind
  count: number
  on: boolean
  onToggle: () => void
  first?: boolean
}) {
  const t = useT()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px',
      borderTop: first ? 'none' : '1px solid var(--color-border-soft)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t(KIND_LABEL[kind])}</div>
        <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>
          {count > 0 ? `${count} ${t('в этой ленте')}` : t('в этой ленте нет')}
        </div>
      </div>
      <Switch checked={on} onChange={onToggle} label={t(KIND_LABEL[kind])} />
    </div>
  )
}

function ThemeRow({ theme, count, index, ranked, on, onToggle }: {
  theme: FeedTheme
  count: number
  /** Номер в очереди — показывается, только когда очередь работает. */
  index: number
  ranked: boolean
  on: boolean
  onToggle: () => void
}) {
  const t = useT()
  const controls = useDragControls()
  const Icon = filterIcon(theme)
  return (
    <Reorder.Item
      value={theme}
      dragListener={false}
      dragControls={controls}
      // Пока ряд едет, он поднимается над соседями — иначе на границе двух
      // рядов не видно, какой из них в руке.
      whileDrag={{ scale: 1.02, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }}
      style={{
        position: 'relative', listStyle: 'none',
        background: 'var(--color-bg-3)',
        borderTop: '1px solid var(--color-border-soft)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 15px' }}>
        {/* Ручка. Тянуть можно ТОЛЬКО за неё: лента настроек сама
            прокручивается, и ряд, который едет от любого касания, отнимает у
            неё прокрутку. `touchAction: none` обязателен — без него браузер
            заберёт жест себе на первом же движении. */}
        <span
          onPointerDown={e => { haptic(8); controls.start(e) }}
          style={{
            display: 'flex', alignItems: 'center', flexShrink: 0,
            padding: '6px 2px', margin: '-6px -2px', cursor: 'grab',
            color: 'var(--color-text-4)', touchAction: 'none',
          }}
          aria-hidden
        >
          <GripVertical size={17} />
        </span>

        <span style={{
          width: 28, height: 28, borderRadius: 999, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-bg-5)', color: on ? 'var(--color-text-2)' : 'var(--color-text-4)',
        }}>
          <Icon size={15} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 7,
            fontSize: 15, fontWeight: 550,
            color: on ? 'var(--color-text)' : 'var(--color-text-4)',
          }}>
            {ranked && (
              <span style={{
                fontSize: 11.5, fontWeight: 800, color: 'var(--color-accent)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {index + 1}
              </span>
            )}
            {t(filterLabel(theme))}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2 }}>
            {count > 0 ? `${count} ${t('материалов')}` : t('в этой ленте нет')}
          </div>
        </div>

        <Switch checked={on} onChange={onToggle} label={t(filterLabel(theme))} />
      </div>
    </Reorder.Item>
  )
}

export function FeedContentSettings({ items }: { items: FeedItem[] }) {
  const t = useT()
  const order = useFeedPrefs(s => s.order)
  const hidden = useFeedPrefs(s => s.hidden)
  const hiddenKinds = useFeedPrefs(s => s.hiddenKinds)
  const byTheme = useFeedPrefs(s => s.byTheme)
  const setOrder = useFeedPrefs(s => s.setOrder)
  const toggleTheme = useFeedPrefs(s => s.toggleTheme)
  const toggleKind = useFeedPrefs(s => s.toggleKind)
  const setByTheme = useFeedPrefs(s => s.setByTheme)
  const reset = useFeedPrefs(s => s.reset)

  // Счётчики — по ВСЕЙ ленте языка, до отбора: у выключенной темы иначе всегда
  // стоял бы ноль, и включать её пришлось бы вслепую.
  const counts = useMemo(() => {
    const themes = new Map<FeedTheme, number>()
    const kinds = new Map<FeedKind, number>()
    for (const it of items) {
      const th = itemTheme(it)
      themes.set(th, (themes.get(th) ?? 0) + 1)
      const k = feedKind(it)
      kinds.set(k, (kinds.get(k) ?? 0) + 1)
    }
    return { themes, kinds }
  }, [items])

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)',
    letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 2px 8px',
  }

  const kinds: FeedKind[] = ['text', 'video']
  const dirty = hidden.length > 0 || hiddenKinds.length > 0 || byTheme
    || order.join() !== THEME_ORDER.join()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={labelStyle}>{t('Тип материала')}</div>
        <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
          {kinds.map((k, i) => (
            <KindRow
              key={k}
              kind={k}
              first={i === 0}
              count={counts.kinds.get(k) ?? 0}
              on={!hiddenKinds.includes(k)}
              onToggle={() => { tactile(); toggleKind(k) }}
            />
          ))}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-muted)', padding: '8px 4px 0' }}>
          {t('Выключенное исчезает и из ленты, и из рубрик наверху.')}
        </div>
      </div>

      <div>
        <div style={labelStyle}>{t('Темы')}</div>
        <div style={{ borderRadius: 18, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', overflow: 'hidden' }}>
          {/* Выключатель очереди стоит НАД списком: он объясняет, зачем список
              вообще перетаскивают. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>{t('Сначала по темам')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>
                {byTheme
                  ? t('Лента идёт в вашем порядке тем — внутри темы по времени')
                  : t('Лента идёт по времени, как обычно')}
              </div>
            </div>
            <Switch checked={byTheme} onChange={v => { tactile(); setByTheme(v) }} label={t('Сначала по темам')} />
          </div>

          <Reorder.Group
            axis="y"
            values={order}
            onReorder={next => {
              setOrder(next)
              // Тасовать порядок, который ни на что не влияет, — обман: жест
              // сам включает то, ради чего его и сделали (см. шапку файла).
              if (!byTheme) setByTheme(true)
            }}
            style={{ margin: 0, padding: 0, listStyle: 'none' }}
          >
            {order.map((th, i) => (
              <ThemeRow
                key={th}
                theme={th}
                index={i}
                ranked={byTheme}
                count={counts.themes.get(th) ?? 0}
                on={!hidden.includes(th)}
                onToggle={() => { tactile(); toggleTheme(th) }}
              />
            ))}
          </Reorder.Group>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 4px' }}>
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-muted)' }}>
          {t('Настройка своя на каждом устройстве и общая для всех курсов.')}
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { tactile(); reset() }}
          disabled={!dirty}
          style={{
            flexShrink: 0, background: 'none', border: 'none', padding: 0,
            cursor: dirty ? 'pointer' : 'default', opacity: dirty ? 1 : 0.4,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 650, color: 'var(--color-accent)',
          }}
        >
          {t('Сбросить')}
        </motion.button>
      </div>
    </div>
  )
}

export default function FeedContentSheet({ open, onClose, items }: {
  open: boolean
  onClose: () => void
  items: FeedItem[]
}) {
  const t = useT()
  return (
    <MobileSheet open={open} onClose={onClose} title={t('Настройки ленты')}>
      <div style={{ padding: '0 16px 8px' }}>
        <FeedContentSettings items={items} />
      </div>
    </MobileSheet>
  )
}
