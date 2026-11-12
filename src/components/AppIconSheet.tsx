import { useEffect } from 'react'
import MobileSheet from './MobileSheet'
import FadeText from './FadeText'
import { Check } from './icons/appIcons'
import { useT } from '../lib/i18n'
import { tactile } from '../lib/feedback'
import { APP_ICONS, useAppIcon } from '../lib/appIcon'
import { alertDialog } from './ConfirmHost'

// Шторка «Иконка приложения»: сетка вариантов с Огоньком, тап меняет иконку
// на главном экране. Ряд, который её открывает, есть только в приложении на iOS
// (см. src/lib/appIcon.ts).

/** Превью иконки: скругление как у иконки iOS (≈22.37% стороны). */
export function AppIconTile({ src, size }: { src: string; size: number }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size, borderRadius: size * 0.2237, display: 'block', flexShrink: 0, boxShadow: '0 0 0 1px var(--color-border-soft)' }}
    />
  )
}

export default function AppIconSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const current = useAppIcon(s => s.current)
  const busy = useAppIcon(s => s.busy)
  const load = useAppIcon(s => s.load)
  const choose = useAppIcon(s => s.choose)

  useEffect(() => { if (open) void load() }, [open, load])

  const pick = async (id: string) => {
    tactile()
    const ok = await choose(id)
    if (!ok && id !== useAppIcon.getState().current) {
      void alertDialog({ title: t('Не получилось сменить иконку'), message: t('Попробуйте ещё раз чуть позже.') })
    }
  }

  return (
    <MobileSheet open={open} softEdge onClose={onClose} title={t('Иконка приложения')}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px 8px', padding: '4px 4px 12px' }}>
        {APP_ICONS.map(o => {
          const on = o.id === current
          return (
            <button
              key={o.id}
              type="button"
              data-hover="card"
              aria-pressed={on}
              disabled={busy}
              onClick={() => void pick(o.id)}
              className="flex flex-col items-center cursor-pointer"
              style={{ gap: 8, padding: '8px 4px', minHeight: 44, borderRadius: 16, background: 'transparent', border: 'none', font: 'inherit', color: 'var(--color-text)' }}
            >
              <span style={{ position: 'relative', borderRadius: 18, padding: 3, boxShadow: on ? '0 0 0 2.5px var(--color-accent)' : 'none', transition: 'box-shadow .18s ease' }}>
                <AppIconTile src={o.preview} size={72} />
                {on && (
                  <span
                    className="flex items-center justify-center"
                    style={{ position: 'absolute', right: -6, bottom: -6, width: 24, height: 24, borderRadius: 999, background: 'var(--grad-purple)', color: '#fff', boxShadow: '0 0 0 2.5px var(--color-bg-3)', flexShrink: 0 }}
                  >
                    <Check size={14} strokeWidth={2.6} />
                  </span>
                )}
              </span>
              <FadeText style={{ maxWidth: '100%', fontSize: 13, fontWeight: on ? 600 : 500, color: on ? 'var(--color-accent)' : 'var(--color-text-2)' }}>
                {t(o.title)}
              </FadeText>
            </button>
          )
        })}
      </div>
    </MobileSheet>
  )
}
