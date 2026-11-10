// Общие детали лендинга «B · Огонёк-проводник» (Figma «Искра», стр. «11 · Сайт —
// редизайн», лист «5 · B · Страница целиком»). Цвета — переменные кабинета
// (--color-*): в Figma они те же, поэтому тёмная тема переключается сама.
//
// Рамки устройств повторяют компоненты Figma «Сайт / Рамка iPhone · Mac · iPad»:
// экран со скруглением, пересчитанным под ширину, и картинка корпуса Apple
// поверх с теми же отступами наружу, что в макете.

import type { CSSProperties, ReactNode } from 'react'

export const asset = (name: string) => `/landing/b/${name}`

type DeviceProps = {
  /** Снимок экрана. */
  src: string
  /** Ширина экрана устройства в px (корпус выходит за неё, как в Figma). */
  width: number
  alt?: string
  className?: string
  style?: CSSProperties
  eager?: boolean
  /** Как вписать снимок: по умолчанию заполняет экран, «top» — прижимает к верху. */
  position?: CSSProperties['objectPosition']
  /** Подложка под снимком — видна, если снимок короче экрана. */
  screenBg?: string
}

const deviceShadow = 'drop-shadow(0px 40px 35px rgba(51,38,115,0.28))'

function Screen({ src, alt, radius, eager, position, screenBg }: { src: string; alt: string; radius: number; eager?: boolean; position?: CSSProperties['objectPosition']; screenBg?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
      style={{ borderRadius: radius, objectPosition: position, background: screenBg }}
    />
  )
}

function Bezel({ name, left, top }: { name: string; left: number; top: number }) {
  // left/top — доля выхода корпуса за экран (в процентах), как inset в Figma.
  return (
    <img
      src={asset(name)}
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute max-w-none select-none"
      style={{ left: `-${left}%`, top: `-${top}%`, width: `${100 + 2 * left}%`, height: `${100 + 2 * top}%` }}
    />
  )
}

export function IPhone({ src, width, alt = '', className = '', style, eager, position, screenBg }: DeviceProps) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width, height: (width * 874) / 402, filter: deviceShadow, ...style }}>
      <Screen src={src} alt={alt} radius={(58 * width) / 402} eager={eager} position={position} screenBg={screenBg} />
      <Bezel name="bezel-iphone.webp" left={5.97} top={2.63} />
    </div>
  )
}

export function Mac({ src, width, alt = '', className = '', style, eager, position, screenBg }: DeviceProps) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width, height: (width * 993) / 1512, ...style }}>
      <Screen src={src} alt={alt} radius={(12 * width) / 1512} eager={eager} position={position ?? 'top'} screenBg={screenBg} />
      <Bezel name="bezel-mac.webp" left={13.82} top={13.95} />
    </div>
  )
}

export function IPad({ src, width, alt = '', className = '', style, eager, position, screenBg }: DeviceProps) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width, height: (width * 1376) / 1034, filter: deviceShadow, ...style }}>
      <Screen src={src} alt={alt} radius={(30 * width) / 1034} eager={eager} position={position ?? 'top'} screenBg={screenBg} />
      <Bezel name="bezel-ipad.webp" left={5.61} top={4.51} />
    </div>
  )
}

// ── Кнопки «Сайт / Кнопка / Основная · Вторичная» ────────────────────────────

type BtnProps = {
  children: ReactNode
  size?: 'lg' | 'sm'
  href?: string
  onClick?: () => void
  className?: string
}

const btnSize = { lg: 'px-7 py-4', sm: 'px-[18px] py-2.5' }

export function PrimaryButton({ children, size = 'lg', href, onClick, className = '' }: BtnProps) {
  const cls = `inline-flex items-center justify-center whitespace-nowrap rounded-[14px] bg-gradient-to-r from-[#786bd6] to-[#6f3fbf] text-[16px] font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-0 ${btnSize[size]} ${className}`
  const style = { filter: 'drop-shadow(0px 12px 15px rgba(120,107,214,0.45))' }
  return href
    ? <a href={href} className={cls} style={style}>{children}</a>
    : <button type="button" onClick={onClick} className={cls} style={style}>{children}</button>
}

export function SecondaryButton({ children, size = 'lg', href, onClick, className = '' }: BtnProps) {
  const cls = `inline-flex items-center justify-center whitespace-nowrap rounded-[14px] border border-[var(--color-border-soft)] text-[16px] font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-accent-soft)] ${btnSize[size]} ${className}`
  return href
    ? <a href={href} className={cls}>{children}</a>
    : <button type="button" onClick={onClick} className={cls}>{children}</button>
}

// ── «Заголовок секции»: надзаголовок, заголовок, подводка ────────────────────

export function SectionHead({ eyebrow, title, lead, className = '', width = 680 }: { eyebrow: ReactNode; title: ReactNode; lead?: ReactNode; className?: string; /** Наибольшая ширина блока, px (в макете 680; где заголовок длиннее — шире). */ width?: number }) {
  return (
    <div className={`mx-auto flex flex-col items-center gap-3 text-center ${className}`} style={{ maxWidth: width }}>
      <p className="text-[13px] font-bold uppercase tracking-[1.04px] text-[var(--color-accent)]">{eyebrow}</p>
      <h2 className="text-[32px] font-bold leading-tight tracking-[-0.66px] text-[var(--color-text)] sm:text-[44px] sm:leading-normal">{title}</h2>
      {lead && <p className="text-[16px] leading-[1.5] text-[var(--color-muted)] sm:text-[18px]">{lead}</p>}
    </div>
  )
}

/** Обёртка секции: фон страницы, ширина макета 1440, поля 120 (на телефоне — 16). */
export function Section({ id, children, className = '', style }: { id?: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section id={id} className={`relative w-full overflow-x-clip ${className}`} style={style}>
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-10 xl:px-[120px]">{children}</div>
    </section>
  )
}
