// «Экосистема» (Figma «Искра», стр. 290:2: светлая 350:606, тёмная 350:638;
// наведение на значок — 345:584 Тестли, 345:636 Таскли, 345:697 ONIX,
// 345:758 Финансли). Mac с Искрой в центре, iPad с Тестли слева, три iPhone
// справа, Огонёк перед Mac. Наведение/фокус/тап по значку продукта гасит
// устройства до 28 % и открывает превью сайта с хвостиком к значку.
//
// ≥1024: сцена 1440×510 в координатах макета, ниже 1440 — пропорционально
// уменьшается. <1024: вертикальный список, превью — шторкой снизу.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../../../lib/i18n'
import { useTheme } from '../../../store/themeStore'
import { asset, IPad, IPhone, Mac } from './kit'
import OgonekModel from './OgonekModel'

type ProductId = 'testli' | 'iskra' | 'taskli' | 'onix' | 'finansli'

type Product = {
  id: ProductId
  name: string
  caption: string
  /** Центр колонки по X в макете 1440. */
  cx: number
  /** Ширина подписи в макете — от неё подсветка значка. */
  w: number
  device: 'ipad' | 'mac' | 'iphone'
  /** Слева и сверху устройства в макете (сверху — в координатах сцены). */
  dx: number
  dy: number
  dw: number
  preview?: { tagline: string }
}

/** Сцена начинается на y=290 макета: всё ниже — со сдвигом. */
const STAGE_TOP = 290
const STAGE_W = 1440
const STAGE_H = 510
const CAPTION_Y = 686 - STAGE_TOP
const POP_W = 480
const POP_Y = 304 - STAGE_TOP

const PRODUCTS: Product[] = [
  { id: 'testli', name: 'Тестли', caption: 'тесты в ДЗ', cx: 204, w: 70, device: 'ipad', dx: 91, dy: 338 - STAGE_TOP, dw: 225, preview: { tagline: 'Пробники и контрольные по ссылке' } },
  { id: 'iskra', name: 'Искра', caption: 'кабинет и курсы', cx: 629, w: 106, device: 'mac', dx: 419, dy: 336 - STAGE_TOP, dw: 420 },
  { id: 'taskli', name: 'Таскли', caption: 'дела на день', cx: 996.5, w: 83, device: 'iphone', dx: 936, dy: 382 - STAGE_TOP, dw: 120, preview: { tagline: 'Дела и встречи в одной ленте' } },
  { id: 'onix', name: 'ONIX', caption: 'видеоурок', cx: 1146.5, w: 69, device: 'iphone', dx: 1086, dy: 382 - STAGE_TOP, dw: 120, preview: { tagline: 'Видеоурок по ссылке, доска и запись' } },
  { id: 'finansli', name: 'Финансли', caption: 'бюджет', cx: 1296, w: 80, device: 'iphone', dx: 1236, dy: 382 - STAGE_TOP, dw: 120, preview: { tagline: 'Трата записывается голосом' } },
]

const screenSrc = (id: ProductId, dark: boolean) => {
  const theme = dark ? 'dark' : 'light'
  const name = id === 'testli' ? 'ipad' : id === 'iskra' ? 'mac' : id
  return asset(`eco-${theme}-${name}.webp`)
}

// ── Значки продуктов ─────────────────────────────────────────────────────────

/** «Искра / Знак»: градиентная плитка, блик и три слоя знака. */
function IskraMark() {
  return (
    <span
      className="relative block size-9 shrink-0 overflow-hidden rounded-[8.086px]"
      style={{ backgroundImage: 'linear-gradient(135deg, rgb(157,139,255) 14.286%, rgb(106,90,230) 85.714%)' }}
      aria-hidden
    >
      <span className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.14)] to-[rgba(255,255,255,0)] to-50%" />
      <img src={asset('eco-iskra-i.svg')} alt="" className="absolute inset-0 block size-9 max-w-none" />
      <img src={asset('eco-iskra-glow.svg')} alt="" className="absolute inset-0 block size-9 max-w-none" />
      <img src={asset('eco-iskra-spark.svg')} alt="" className="absolute inset-0 block size-9 max-w-none" />
    </span>
  )
}

function ProductIcon({ id }: { id: ProductId }) {
  if (id === 'iskra') return <IskraMark />
  return <img src={asset(`eco-icon-${id}.webp`)} alt="" aria-hidden className="block size-9 shrink-0 rounded-[10px] object-contain" />
}

function CaptionText({ p }: { p: Product }) {
  const t = useT()
  return (
    <>
      <ProductIcon id={p.id} />
      <span className="whitespace-nowrap text-[15px] font-bold text-[var(--color-text)]">{p.id === 'iskra' ? t(p.name) : p.name}</span>
      <span className="whitespace-nowrap text-[13px] text-[var(--color-muted)]">{t(p.caption)}</span>
    </>
  )
}

// ── Превью сайта: картинка визитки, имя, слоган, «Сайт скоро» ────────────────

function PreviewBody({ p }: { p: Product }) {
  const t = useT()
  return (
    <>
      <img
        src={asset(`eco-promo-${p.id}.webp`)}
        alt=""
        className="block aspect-[460/288] w-full rounded-[14px] border border-[rgba(0,0,0,0.06)] object-cover"
      />
      <div className="flex items-center gap-3 pl-1.5 pr-1">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-fade text-[17px] font-bold text-[var(--color-text)]">{p.name}</span>
          <span className="text-[13px] leading-[1.3] text-[var(--color-muted)]">{t(p.preview!.tagline)}</span>
        </div>
        <span
          aria-disabled="true"
          className="shrink-0 cursor-default whitespace-nowrap rounded-full bg-[rgba(120,107,214,0.1)] px-3.5 py-[9px] text-[13px] font-bold text-[var(--color-accent)]"
        >
          {t('Сайт скоро')}
        </span>
      </div>
    </>
  )
}

/** Одна форма с хвостиком: тень (drop-shadow) ложится на коробку и хвост вместе. */
function Popover({ p, onEnter, onLeave }: { p: Product; onEnter: () => void; onLeave: () => void }) {
  const left = Math.min(Math.max(p.cx - POP_W / 2, 24), STAGE_W - 26 - POP_W)
  const tail = p.cx - left
  return (
    <div
      id={`eco-pop-${p.id}`}
      role="dialog"
      aria-label={p.name}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="eco-pop absolute z-30"
      style={{
        left,
        top: POP_Y,
        width: POP_W,
        filter:
          'drop-shadow(0 0 0.6px rgba(0,0,0,0.14)) drop-shadow(0 2px 3px rgba(0,0,0,0.06)) drop-shadow(0 24px 24px rgba(41,31,102,0.16))',
      }}
    >
      <div className="relative flex flex-col gap-3 rounded-[22px] bg-[var(--color-bg-card)] px-2.5 pb-3.5 pt-2.5">
        <PreviewBody p={p} />
      </div>
      <svg
        width="22"
        height="12"
        viewBox="0 0 22 12"
        aria-hidden
        className="absolute top-full -mt-px block"
        style={{ left: tail - 11 }}
      >
        <path d="M0 0H22L14.6 9.4C13.6 10.6 12.4 11.3 11 11.3C9.6 11.3 8.4 10.6 7.4 9.4Z" fill="var(--color-bg-card)" />
      </svg>
    </div>
  )
}

// ── Сцена ≥1024 ───────────────────────────────────────────────────────────────

function useStageScale() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / STAGE_W))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, scale }
}

function Stage({ dark }: { dark: boolean }) {
  const t = useT()
  const { ref, scale } = useStageScale()
  const [active, setActive] = useState<ProductId | null>(null)
  const leaveTimer = useRef<number | undefined>(undefined)
  const openedAt = useRef(0)

  const open = useCallback((id: ProductId) => {
    window.clearTimeout(leaveTimer.current)
    setActive(prev => {
      if (prev !== id) openedAt.current = performance.now()
      return id
    })
  }, [])
  // Тап открывает (фокус/наведение уже могли открыть — тогда не закрываем),
  // повторный тап по тому же значку закрывает.
  const toggle = useCallback((id: ProductId) => {
    if (active === id && performance.now() - openedAt.current > 400) setActive(null)
    else open(id)
  }, [active, open])
  const closeSoon = useCallback(() => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => setActive(null), 120)
  }, [])
  const keep = useCallback(() => window.clearTimeout(leaveTimer.current), [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null) }
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null
      if (!el?.closest('[data-eco-trigger], .eco-pop')) setActive(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [active])
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  const dim = active ? 'opacity-[0.28]' : 'opacity-100'
  const activeProduct = PRODUCTS.find(p => p.id === active)

  return (
    <div ref={ref} className="relative w-full" style={{ height: STAGE_H * scale }}>
      <div
        className="absolute left-1/2 top-0"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}
      >
        {/* Свечения: фиолетовое под устройствами, тёплое под Огоньком. */}
        <img src={asset('eco-glow-wide.svg')} alt="" aria-hidden className="pointer-events-none absolute block max-w-none" style={{ left: 30, top: 330 - 140 - STAGE_TOP, width: 1380, height: 660 }} />
        <img src={asset('eco-glow-small.svg')} alt="" aria-hidden className="pointer-events-none absolute block max-w-none" style={{ left: 359, top: 510 - 100 - STAGE_TOP, width: 520, height: 420 }} />

        {PRODUCTS.map(p => {
          const Device = p.device === 'ipad' ? IPad : p.device === 'mac' ? Mac : IPhone
          return (
            <Device
              key={p.id}
              src={screenSrc(p.id, dark)}
              width={p.dw}
              alt={p.id === 'iskra' ? t('Кабинет Искры на Mac') : ''}
              className={`!absolute transition-opacity duration-200 ${dim}`}
              style={{ left: p.dx, top: p.dy }}
            />
          )
        })}

        <OgonekModel
          pose="eco"
          fallback="eco-ogonek.webp"
          alt={t('Огонёк')}
          className={`pointer-events-none absolute transition-opacity duration-200 ${dim}`}
          style={{ left: 581, top: 508 - STAGE_TOP, width: 96, height: 166 }}
        />

        {PRODUCTS.map(p => {
          const isActive = active === p.id
          const faded = active && !isActive ? 'opacity-[0.45]' : 'opacity-100'
          const pos = { left: p.cx - p.w / 2 - 14, top: CAPTION_Y - 8, width: p.w + 28, height: 100 }
          const inner = 'flex h-full w-full flex-col items-center gap-1.5 pt-2'
          if (!p.preview) {
            return (
              <div key={p.id} className={`absolute transition-opacity duration-200 ${faded}`} style={pos}>
                <div className={inner}><CaptionText p={p} /></div>
              </div>
            )
          }
          return (
            <button
              key={p.id}
              type="button"
              data-eco-trigger
              aria-expanded={isActive}
              aria-controls={isActive ? `eco-pop-${p.id}` : undefined}
              onMouseEnter={() => open(p.id)}
              onMouseLeave={closeSoon}
              onFocus={() => open(p.id)}
              onBlur={closeSoon}
              onClick={() => toggle(p.id)}
              className={`absolute rounded-[18px] outline-none transition-[opacity,background-color] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${faded} ${
                isActive ? 'bg-[rgba(120,107,214,0.08)]' : ''
              }`}
              style={pos}
            >
              <span className={inner}><CaptionText p={p} /></span>
            </button>
          )
        })}

        {activeProduct?.preview && <Popover p={activeProduct} onEnter={keep} onLeave={closeSoon} />}
      </div>
    </div>
  )
}

// ── Список <1024 и шторка ─────────────────────────────────────────────────────

function Sheet({ p, onClose }: { p: Product; onClose: () => void }) {
  const t = useT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[200] flex items-end" role="dialog" aria-modal="true" aria-label={p.name}>
      <button type="button" aria-label={t('Закрыть')} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div
        className="relative flex w-full flex-col gap-3 rounded-t-[24px] bg-[var(--color-bg-card)] px-3 pt-2 shadow-[0_-12px_40px_rgba(41,31,102,0.18)]"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <span aria-hidden className="mx-auto mb-1 block h-[5px] w-9 rounded-full bg-[var(--color-muted)] opacity-30" />
        <PreviewBody p={p} />
      </div>
    </div>
  )
}

function MobileList({ dark }: { dark: boolean }) {
  const [sheet, setSheet] = useState<ProductId | null>(null)
  const close = useCallback(() => setSheet(null), [])
  const sheetProduct = PRODUCTS.find(p => p.id === sheet)
  const t = useT()

  return (
    <>
    <ul className="flex flex-col gap-12">
      {PRODUCTS.map(p => {
        const Device = p.device === 'ipad' ? IPad : p.device === 'mac' ? Mac : IPhone
        const width = p.device === 'mac' ? 260 : p.device === 'ipad' ? 170 : 116
        const caption = <span className="flex flex-col items-center gap-1.5"><CaptionText p={p} /></span>
        return (
          <li key={p.id} className="relative flex flex-col items-center gap-6">
            {p.id === 'iskra' ? (
              <div className="relative flex justify-center pb-6 pt-8">
                <Device src={screenSrc(p.id, dark)} width={width} alt={t('Кабинет Искры на Mac')} />
                <img src={asset('eco-ogonek.webp')} alt={t('Огонёк')} className="absolute bottom-0 left-1/2 w-16 -translate-x-1/2 object-contain" />
              </div>
            ) : (
              <Device src={screenSrc(p.id, dark)} width={width} />
            )}
            {p.preview ? (
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setSheet(p.id)}
                className="rounded-[18px] px-3.5 py-2 active:bg-[rgba(120,107,214,0.08)]"
              >
                {caption}
              </button>
            ) : (
              <div className="px-3.5 py-2">{caption}</div>
            )}
          </li>
        )
      })}
    </ul>
    {sheetProduct?.preview && <Sheet p={sheetProduct} onClose={close} />}
    </>
  )
}

// ── Секция ───────────────────────────────────────────────────────────────────

export default function EcosystemSection() {
  const t = useT()
  const dark = useTheme(s => s.dark)

  return (
    <section id="ecosystem" className="relative w-full overflow-x-clip pb-10 pt-16 sm:pb-5">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 text-center sm:px-10">
        <p className="text-[13px] font-bold uppercase tracking-[1.04px] text-[var(--color-accent)]">{t('Экосистема')}</p>
        <h2 className="text-[32px] font-bold leading-[1.06] tracking-[-0.768px] text-[var(--color-text)] sm:text-[48px]">
          {t('Каждый — сам по себе.')}
          <br />
          {t('Вместе — весь день преподавателя.')}
        </h2>
      </div>

      <div className="mx-auto mt-12 hidden max-w-[1440px] lg:mt-[96px] lg:block">
        <Stage dark={dark} />
      </div>
      <div className="mx-auto mt-12 max-w-[720px] px-4 lg:hidden">
        <MobileList dark={dark} />
      </div>
    </section>
  )
}
