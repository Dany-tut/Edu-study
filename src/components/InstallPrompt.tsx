import { useEffect, useState } from 'react'
import { Share, X, Plus, Download } from 'lucide-react'
import { subscribeInstall, hasInstallPrompt, promptInstall, isStandalone, getPlatform } from '../lib/pwaInstall'

const DISMISS_KEY = 'pwa_install_dismissed_v1'
function dismissed(): boolean { try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false } }
function markDismissed() { try { localStorage.setItem(DISMISS_KEY, '1') } catch { /**/ } }

/**
 * "Установить приложение" banner shown on phones (not in standalone, not
 * dismissed). Android/Chrome → native install dialog via beforeinstallprompt.
 * iOS Safari (no such API) → a mini tutorial: Поделиться → «На экран „Домой"».
 * Self-contained: renders null unless it should show, so it's safe to mount
 * once at the app root.
 */
export default function InstallPrompt() {
  const platform = getPlatform()
  const [canPrompt, setCanPrompt] = useState(hasInstallPrompt())
  const [open, setOpen] = useState(false)      // iOS tutorial expanded
  const [hidden, setHidden] = useState(dismissed() || isStandalone())

  useEffect(() => subscribeInstall(() => setCanPrompt(hasInstallPrompt())), [])

  // Only phones, not already installed/dismissed. Android needs a captured
  // prompt; iOS always qualifies (manual flow). Desktop/other → skip.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  const eligible = isPhone && !hidden && (platform === 'ios' || (platform === 'android' && canPrompt))
  if (!eligible) return null

  function close() { setHidden(true); markDismissed() }

  async function onInstall() {
    const ok = await promptInstall()
    if (ok) setHidden(true)
  }

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, zIndex: 9998,
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
      background: 'var(--color-bg)', borderRadius: 18,
      border: '1px solid var(--color-border-medium)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.3)', padding: '14px 14px 12px',
    }}>
      <button
        onClick={close}
        aria-label="Закрыть"
        style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 999,
          border: 'none', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: open ? 12 : 0, paddingRight: 26 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: 'linear-gradient(135deg,#9B6FE8,#6F3FBF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Download size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Установить приложение</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.35 }}>
            Быстрый доступ с экрана «Домой», без адресной строки
          </div>
        </div>
        {platform === 'android' ? (
          <button
            onClick={onInstall}
            style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 11, border: 'none',
              background: 'var(--grad-purple, #786AD7)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Установить
          </button>
        ) : (
          <button
            onClick={() => setOpen(o => !o)}
            style={{ flexShrink: 0, padding: '9px 15px', borderRadius: 11, border: '1px solid var(--color-border-medium)',
              background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {open ? 'Скрыть' : 'Как?'}
          </button>
        )}
      </div>

      {/* iOS manual tutorial */}
      {open && platform === 'ios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4, borderTop: '1px solid var(--color-border-medium)' }}>
          <Step n={1}>
            Нажмите <Share size={15} style={{ verticalAlign: 'middle', margin: '0 2px' }} /> «Поделиться» внизу Safari
          </Step>
          <Step n={2}>
            Выберите <b>«На экран „Домой"»</b> <Plus size={14} style={{ verticalAlign: 'middle', margin: '0 2px' }} />
          </Step>
          <Step n={3}>Нажмите <b>«Добавить»</b> — готово, иконка появится на экране</Step>
        </div>
      )}
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 999, background: 'var(--color-purple-soft, rgba(120,106,215,0.15))',
        color: 'var(--color-accent)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {n}
      </span>
      <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{children}</span>
    </div>
  )
}
