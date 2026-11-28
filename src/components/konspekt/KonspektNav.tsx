// ─────────────────────────────────────────────────────────────────────────────
// Оглавление и «Крупный текст» конспекта на телефонах и айпаде (Figma стр. 31).
//
//  - iPad (PLATFORM === 'ipad', любая ширина): капсула у правого края на высоте
//    большого пальца — «Аа» и «Оглавление»; меню разделов открывается ВЛЕВО от
//    капсулы (docs/platforms.md §1.1). Кнопка «Крупный текст» в шапке конспекта
//    на айпаде не рисуется — она живёт здесь.
//  - iPhone и Android: круглая кнопка справа над нижними вкладками, список
//    разделов — шторка с граббером (без ×, SHEET-01). iPhone — стекло, Android
//    и мобильный браузер — таблетка с заливкой (§1.2).
// Кнопки видны, только пока конспект на экране, — над видео и домашкой они
// не мешают.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ALargeSmall, ListOrdered } from '../icons/appIcons'
import MobileSheet from '../MobileSheet'
import { PLATFORM } from '../../lib/platform'
import { MOBILE_DOCK_EDGE, glassCircle } from '../../lib/mobileTokens'
import { Z } from '../../lib/layers'
import { useT } from '../../lib/i18n'
import { goToHeading, useActiveHeading } from './KonspektToc'

type Item = { id: string; text: string }

function useInView(ref: RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '-25% 0px -25% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

function TocList({ items, active, onPick }: { items: Item[]; active: string | null; onPick: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map(it => {
        const on = it.id === active
        return (
          <button
            key={it.id}
            type="button"
            data-hover="layer"
            aria-current={on ? 'location' : undefined}
            onClick={() => onPick(it.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', fontFamily: 'inherit',
              minHeight: 44, padding: '11px 14px', borderRadius: 12, fontSize: 16, lineHeight: 1.35,
              fontWeight: on ? 600 : 500,
              background: on ? 'var(--color-accent-soft)' : 'transparent',
              color: on ? 'var(--color-purple-text)' : 'var(--color-text)',
            }}
          >
            {it.text}
          </button>
        )
      })}
    </div>
  )
}

export default function KonspektNav({ items, big, onToggleBig, sectionRef }: {
  items: Item[]
  big: boolean
  onToggleBig: () => void
  sectionRef: RefObject<HTMLElement | null>
}) {
  const t = useT()
  const shown = useInView(sectionRef)
  const [active, setActive] = useActiveHeading(items)
  const [open, setOpen] = useState(false)
  const pop = useRef<HTMLDivElement>(null)
  const hasToc = items.length >= 3
  const ipad = PLATFORM === 'ipad'

  // Поповер айпада закрывается тапом мимо и Escape.
  useEffect(() => {
    if (!open || !ipad) return
    const onDown = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey) }
  }, [open, ipad])

  const pick = (id: string) => { setOpen(false); setActive(id); window.setTimeout(() => goToHeading(id), ipad ? 0 : 260) }
  const visible = shown || open

  if (ipad) {
    const cell = (on: boolean) => ({
      width: 56, height: 56, borderRadius: 28, border: 0, cursor: 'pointer', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--color-accent-soft)' : 'transparent',
      color: on ? 'var(--color-accent)' : 'var(--color-text)',
    })
    return createPortal(
      <div ref={pop} className="konspekt-nav konspekt-nav-ipad" style={{
        position: 'fixed', right: 'calc(env(safe-area-inset-right, 0px) + 16px)', top: '55%', transform: 'translateY(-50%)',
        zIndex: Z.chrome, display: 'flex', alignItems: 'center', gap: 12, flexDirection: 'row-reverse',
        opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.22s ease',
      }}>
        <div style={{ ...glassCircle, flexDirection: 'column', gap: 4, padding: 4, borderRadius: 32 }}>
          <button type="button" data-hover="own" aria-pressed={big} aria-label={t(big ? 'Обычный текст' : 'Крупный текст')} title={t(big ? 'Обычный текст' : 'Крупный текст')} onClick={onToggleBig} style={cell(big)}>
            <ALargeSmall size={22} />
          </button>
          {hasToc && (
            <button type="button" data-hover="own" aria-expanded={open} aria-label={t('В уроке')} title={t('В уроке')} onClick={() => setOpen(v => !v)} style={cell(open)}>
              <ListOrdered size={22} />
            </button>
          )}
        </div>
        {open && hasToc && (
          <div role="dialog" aria-label={t('В уроке')} style={{
            width: 300, maxHeight: '60vh', overflowY: 'auto', padding: 8, borderRadius: 22,
            background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', boxShadow: 'var(--shadow-4)',
          }}>
            <div style={{ padding: '6px 14px 8px', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{t('В уроке')}</div>
            <TocList items={items} active={active} onPick={pick} />
          </div>
        )}
      </div>,
      document.body,
    )
  }

  if (!hasToc) return null
  const android = PLATFORM !== 'iphone'
  return (
    <>
      {createPortal(
        <button
          type="button"
          className="konspekt-nav konspekt-nav-phone"
          aria-label={t('В уроке')}
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', right: 16, bottom: `calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_DOCK_EDGE + 86}px)`,
            zIndex: Z.chrome, cursor: 'pointer', padding: 0,
            // Пока шторка открыта, кнопка не висит над ней.
            opacity: shown && !open ? 1 : 0, pointerEvents: shown && !open ? 'auto' : 'none', transition: 'opacity 0.22s ease',
            ...(android
              ? { display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 18px', borderRadius: 999, border: 0, background: 'var(--color-surface)', boxShadow: 'var(--shadow-3)', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }
              : { ...glassCircle, width: 52, height: 52, color: 'var(--color-text)' }),
          }}
        >
          <ListOrdered size={android ? 20 : 22} />
          {android && <span>{t('В уроке')}</span>}
        </button>,
        document.body,
      )}
      <MobileSheet open={open} onClose={() => setOpen(false)} title={t('В уроке')} softEdge>
        <div style={{ padding: '0 8px 16px' }}>
          <TocList items={items} active={active} onPick={pick} />
        </div>
      </MobileSheet>
    </>
  )
}
