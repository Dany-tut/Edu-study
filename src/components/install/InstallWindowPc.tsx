import { AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import Modal, { ModalClose } from '../Modal'
import { Lock, Plus, Rocket, Monitor, WifiOff } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'
import { OgonekIcon, type InstallViewProps } from './InstallParts'

// ─────────────────────────────────────────────────────────────────────────────
// ПК: окно по центру (концепт «лист установки, 4 версии», вариант ПК).
// Огонёк слева, текст справа, внизу «Установить» и «Позже». Граббера нет —
// у окна есть × (docs/ui-rules.md, SHEET-01); ещё закрывают Escape и фон.
//
// Что показываем, зависит от браузера:
//   Chrome / Edge, окно установки доступно → кнопка «Установить» (системное окно);
//   Chrome / Edge, окна нет               → подсказка: значок установки справа
//                                            в адресной строке (подсвечен);
//   Safari на Mac                          → «Файл → Добавить в Dock»;
//   остальные (Firefox и т. п.)            → открыть в Chrome, Edge или Safari.
// На ПК окно само не всплывает — только по строке «Установить приложение».
// ─────────────────────────────────────────────────────────────────────────────

type DesktopBrowser = 'edge' | 'chrome' | 'safari' | 'other'

function desktopBrowser(): DesktopBrowser {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/Edg\//.test(ua)) return 'edge'
  if (/Chrome\//.test(ua) && !/OPR\/|YaBrowser\//.test(ua)) return 'chrome'
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari'
  return 'other'
}

/** Значок «Установить» в адресной строке Chrome/Edge: монитор со стрелкой вниз. */
function InstallBarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 7v6M9.5 10.5 12 13l2.5-2.5" />
    </svg>
  )
}

/** Схема адресной строки: справа подсвечен значок установки. */
function AddressBarHint({ browser }: { browser: 'chrome' | 'edge' }) {
  const t = useT()
  const host = typeof location !== 'undefined' ? location.host : 'edu-study-app.vercel.app'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div aria-hidden style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 6px 0 14px', borderRadius: 20,
        background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 13,
      }}>
        <Lock size={13} />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--color-text-2)' }}>{host}</span>
        <span style={{
          display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 15, flexShrink: 0,
          background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
          boxShadow: '0 0 0 2px var(--color-accent), 0 0 0 6px rgba(var(--accent-rgb), 0.18)',
        }}>
          <InstallBarIcon />
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
        {browser === 'edge'
          ? t('Нажмите значок установки справа в адресной строке Edge и выберите «Установить».')
          : t('Нажмите значок установки справа в адресной строке Chrome и выберите «Установить».')}
      </p>
    </div>
  )
}

/** Плашки пользы для ПК: слева, в одну строку; «Отдельное окно» вместо
 *  телефонного «На весь экран». Вид — как у InstallPerks в InstallParts. */
function PcPerks() {
  const t = useT()
  const chip = (Icon: typeof Rocket, label: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', borderRadius: 15,
      background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Icon size={14} aria-hidden />{label}
    </span>
  )
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {chip(Rocket, t('Мгновенный запуск'))}
      {chip(Monitor, t('Отдельное окно'))}
      {chip(WifiOff, t('Работает офлайн'))}
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div style={{ borderRadius: 14, padding: '12px 14px', background: 'var(--color-bg-3)', fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
      {children}
    </div>
  )
}

export default function InstallWindowPc({ open, onClose, support, onInstall }: InstallViewProps) {
  const t = useT()
  const browser = desktopBrowser()
  const canInstall = support === 'native'
  const b = (s: string) => <b style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s}</b>

  const hint = canInstall ? null
    : browser === 'chrome' || browser === 'edge' ? <AddressBarHint browser={browser} />
    : browser === 'safari' ? <Note>{t('В Safari откройте меню')} {b(t('Файл'))} → {b(t('«Добавить в Dock…»'))}. {t('Огонёк появится в Dock, Искра откроется отдельным окном.')}</Note>
    : <Note>{t('Этот браузер не умеет ставить приложения. Откройте Искру в Chrome, Edge или Safari и нажмите «Установить» ещё раз.')}</Note>

  return (
    <AnimatePresence>
      {open && (
        <Modal onClose={onClose} width={640} padding={24}>
          {/* Свечение и тень Огонька выходят за иконку: слева даём запас. */}
          <div style={{ position: 'relative', display: 'flex', gap: 22, alignItems: 'flex-start', marginBottom: 22 }}>
            <div style={{ padding: '10px 0 0 10px' }}><OgonekIcon size={88} /></div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Место под × — только у текста; плашкам нужна вся ширина. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 44 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--color-text)' }}>
                  {t('Установить «Искру»')}
                </h2>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
                  {t('Искра откроется отдельным окном, как программа, со своим значком в Dock или на панели задач')}
                </p>
              </div>
              <PcPerks />
            </div>
            <ModalClose onClose={onClose} style={{ position: 'absolute', top: 0, right: 0 }} />
          </div>
          {hint && <div style={{ marginBottom: 18 }}>{hint}</div>}
          {/* Кнопки — в теле окна, а не в подвале Modal: тень Огонька уходит вниз
              на ~50 px, и граница подвала срезала бы её прямой линией. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button data-hover="layer" type="button" onClick={onClose} style={btn('M', 'secondary')}>
              {canInstall ? t('Позже') : t('Понятно')}
            </button>
            {canInstall && (
              <button data-hover="layer" type="button" onClick={onInstall} style={btn('M', 'primary')}>
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                <span style={{ position: 'relative', top: '-0.04em' }}>{t('Установить')}</span>
              </button>
            )}
          </div>
        </Modal>
      )}
    </AnimatePresence>
  )
}
