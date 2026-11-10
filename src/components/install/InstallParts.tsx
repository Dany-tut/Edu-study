import type { ReactNode } from 'react'
import { Plus, Rocket, Sparkles, WifiOff, MoreHorizontal } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import type { InstallSupport } from '../../lib/pwaInstall'

// ─────────────────────────────────────────────────────────────────────────────
// Общие куски листа установки (концепт «Искра — лист установки, 4 версии»).
// Каждая версия (iPhone, iPad, Android, ПК) собирает из них свою оболочку —
// лист, поповер, окно — в своём файле рядом. Здесь только содержимое, которое
// у всех одинаковое: Огонёк, заголовок, плашки пользы, шаги или кнопка.
// ─────────────────────────────────────────────────────────────────────────────

/** Пропсы любой версии листа. Решение «показывать или нет» — в диспетчере. */
export interface InstallViewProps {
  open: boolean
  onClose: () => void
  support: InstallSupport
  /** Системное окно установки (только support === 'native'). */
  onInstall: () => void
}

/** Огонёк — та же иконка, что на экране «Домой» после установки, со свечением. */
export function OgonekIcon({ size = 112 }: { size?: number }) {
  const badge = Math.round(size * 0.28)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div aria-hidden style={{
        position: 'absolute', inset: -size * 0.23, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,108,224,.45), rgba(124,108,224,0) 68%)',
      }} />
      <img
        src="./app-icons/ogonek-512.png"
        alt=""
        width={size}
        height={size}
        style={{
          position: 'relative', display: 'block', width: size, height: size, borderRadius: size * 0.23,
          boxShadow: '0 16px 36px rgba(106,90,230,.38), inset 0 0 0 .5px rgba(255,255,255,.4)',
        }}
      />
      <span aria-hidden style={{
        position: 'absolute', right: -8, top: -8, width: badge, height: badge, borderRadius: 999,
        background: 'var(--grad-purple)', color: '#fff', display: 'grid', placeItems: 'center',
        boxShadow: '0 0 0 3px var(--color-bg-2)',
      }}>
        <Plus size={Math.round(badge / 2)} strokeWidth={3} />
      </span>
    </div>
  )
}

export function InstallTitle() {
  const t = useT()
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--color-text)' }}>
        {t('Установить «Искру»')}
      </h2>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: 'var(--color-text-2)' }}>
        {t('Огонёк появится на экране «Домой» — Искра откроется сразу, на весь экран')}
      </p>
    </div>
  )
}

export function InstallPerks() {
  const t = useT()
  const chip = (Icon: typeof Rocket, label: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 16,
      background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Icon size={14} />{label}
    </span>
  )
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {chip(Rocket, t('Мгновенный запуск'))}
      {chip(Sparkles, t('На весь экран'))}
      {chip(WifiOff, t('Работает офлайн'))}
    </div>
  )
}

/** Значок «Поделиться» именно Safari (квадрат со стрелкой вверх) — человек
 *  ищет на экране ровно его; в наборе Loop «Поделиться» — узелки, как на Android. */
function SafariShare({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, margin: '0 2px',
      verticalAlign: 'middle', background: 'var(--color-bg)', color: 'var(--color-accent)', boxShadow: '0 1px 2px rgba(0,0,0,.08)',
    }}>
      {children}
    </span>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, fontSize: 15, lineHeight: 1.3, color: 'var(--color-text-2)' }}>
      <span style={{
        width: 26, height: 26, borderRadius: 13, flexShrink: 0, display: 'grid', placeItems: 'center',
        background: 'var(--color-bg-5)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700,
      }}>{n}</span>
      <span>{children}</span>
    </div>
  )
}

/**
 * Шаги Safari. `share` — где у этого устройства кнопка «Поделиться»: на iPhone
 * до Safari 26 — в нижней панели, с Safari 26 — в меню «•••» справа внизу;
 * на iPad и Mac — вверху справа.
 */
export function SafariSteps({ share }: { share: 'bottom' | 'more-menu' | 'top-right' }) {
  const t = useT()
  const b = (s: string) => <b style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s}</b>
  const first = share === 'more-menu'
    ? <>{t('Нажмите')} <Glyph><MoreHorizontal size={16} strokeWidth={2.4} /></Glyph> {t('внизу справа, затем')} <Glyph><SafariShare /></Glyph> {b(t('Поделиться'))}</>
    : <>{t('Нажмите')} <Glyph><SafariShare /></Glyph> {b(t('Поделиться'))} {share === 'bottom' ? t('внизу') : t('вверху справа')}</>
  return (
    <div style={{
      width: '100%', boxSizing: 'border-box', borderRadius: 22, padding: '8px 16px',
      background: 'var(--color-bg-2)', display: 'flex', flexDirection: 'column',
    }}>
      <Step n={1}>{first}</Step>
      <Step n={2}>
        {t('Выберите')} {b(t('«На экран Домой»'))} <Glyph><Plus size={16} strokeWidth={2.5} /></Glyph>
      </Step>
      <Step n={3}>
        {t('Нажмите')} {b(t('«Добавить»'))} {t('— готово')}
      </Step>
    </div>
  )
}

/** Браузер не умеет ставить (Telegram, Instagram, Firefox на Android). */
export function OpenInBrowserNote({ browser }: { browser: 'Safari' | 'Chrome' }) {
  const t = useT()
  return (
    <div style={{
      width: '100%', boxSizing: 'border-box', borderRadius: 22, padding: '14px 16px',
      background: 'var(--color-bg-2)', fontSize: 15, lineHeight: 1.4, color: 'var(--color-text-2)', textAlign: 'center',
    }}>
      {t('Этот браузер не умеет ставить приложения. Откройте Искру в')} <b style={{ color: 'var(--color-text)' }}>{browser}</b> {t('и нажмите «Установить» ещё раз.')}
    </div>
  )
}
