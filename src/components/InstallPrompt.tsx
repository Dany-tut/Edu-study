import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, X, Plus, Sparkles, WifiOff, Rocket } from 'lucide-react'
import { subscribeInstall, subscribeShowInstall, hasInstallPrompt, promptInstall, isStandalone, getPlatform } from '../lib/pwaInstall'

const DISMISS_KEY = 'pwa_install_dismissed_v1'
function dismissed(): boolean { try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false } }
function markDismissed() { try { localStorage.setItem(DISMISS_KEY, '1') } catch { /**/ } }

/**
 * "Установить приложение" bottom sheet shown on phones (not in standalone, not
 * dismissed). Android/Chrome → native install dialog via beforeinstallprompt.
 * iOS Safari (no such API) → an illustrated Add-to-Home-Screen tutorial.
 * Self-contained: renders null unless it should show, so it's safe to mount
 * once at the app root.
 */
export default function InstallPrompt() {
  const platform = getPlatform()
  const [canPrompt, setCanPrompt] = useState(hasInstallPrompt())
  const [hidden, setHidden] = useState(dismissed() || isStandalone())

  useEffect(() => subscribeInstall(() => setCanPrompt(hasInstallPrompt())), [])
  // Re-open when the user taps "Установить приложение" in Profile, even if the
  // banner was dismissed earlier.
  useEffect(() => subscribeShowInstall(() => setHidden(false)), [])

  // Only phones, not already installed/dismissed. Android needs a captured
  // prompt; iOS always qualifies (manual flow). Desktop/other → skip.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  const eligible = isPhone && !hidden && (platform === 'ios' || (platform === 'android' && canPrompt))

  function close() { setHidden(true); markDismissed() }

  async function onInstall() {
    const ok = await promptInstall()
    if (ok) setHidden(true)
  }

  return (
    <AnimatePresence>
      {eligible && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            style={{
              position: 'fixed', inset: 0, zIndex: 9997,
              background: 'rgba(8,6,16,0.5)',
              backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9998,
              margin: '0 auto', maxWidth: 440,
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
              background: 'var(--color-bg)',
              borderTopLeftRadius: 30, borderTopRightRadius: 30,
              border: '1px solid var(--color-border-soft)', borderBottom: 'none',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.35)',
              overflow: 'hidden',
            }}
          >
            {/* Purple aura at the top */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 220, pointerEvents: 'none',
              background: 'radial-gradient(120% 90% at 50% 0%, rgba(139,111,230,0.20), transparent 68%)',
            }} />

            {/* Grabber + close */}
            <div style={{ position: 'relative', paddingTop: 10 }}>
              <div style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--color-border-medium)', margin: '0 auto' }} />
              <button
                onClick={close}
                aria-label="Закрыть"
                style={{
                  position: 'absolute', top: 8, right: 12, width: 32, height: 32, borderRadius: 999,
                  border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ position: 'relative', padding: '14px 22px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <PhoneMockup />

              <div style={{ fontSize: 21, fontWeight: 780, color: 'var(--color-text)', marginTop: 18, letterSpacing: '-0.01em' }}>
                Установить «Искру»
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.4, textAlign: 'center', marginTop: 5, maxWidth: 300 }}>
                Быстрый доступ прямо с экрана «Домой» — без адресной строки, как настоящее приложение
              </div>

              {/* Perks */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, width: '100%' }}>
                <Perk icon={Rocket} label="Мгновенный запуск" />
                <Perk icon={Sparkles} label="На весь экран" />
                <Perk icon={WifiOff} label="Работает офлайн" />
              </div>
            </div>

            {/* Action zone */}
            {platform === 'android' ? (
              <div style={{ padding: '14px 22px 4px' }}>
                <button
                  onClick={onInstall}
                  style={{
                    width: '100%', padding: '15px 0', borderRadius: 16, border: 'none',
                    background: 'linear-gradient(135deg,#9B6FE8,#6F3FBF)', color: '#fff',
                    fontSize: 15.5, fontWeight: 750, cursor: 'pointer',
                    boxShadow: '0 10px 26px rgba(111,63,191,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <Plus size={18} strokeWidth={2.6} /> Установить приложение
                </button>
              </div>
            ) : (
              <div style={{ padding: '18px 22px 4px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Как установить
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Step n={1}>
                    Нажмите <Glyph><Share size={14} strokeWidth={2} /></Glyph> «Поделиться» внизу Safari
                  </Step>
                  <Step n={2}>
                    Выберите <b style={{ color: 'var(--color-text)' }}>«На экран „Домой"»</b> <Glyph><Plus size={14} strokeWidth={2.4} /></Glyph>
                  </Step>
                  <Step n={3}>
                    Нажмите <b style={{ color: 'var(--color-text)' }}>«Добавить»</b> — иконка «Искры» появится на экране
                  </Step>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Tiny iOS status-bar glyphs so the mockup reads as a real device.
function StatusIcons() {
  return (
    <span style={{ display: 'flex', gap: 5, alignItems: 'center', color: '#fff' }}>
      {/* signal */}
      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
        <rect x="0" y="7" width="3" height="4" rx="1" />
        <rect x="4.3" y="5" width="3" height="6" rx="1" />
        <rect x="8.6" y="2.5" width="3" height="8.5" rx="1" />
        <rect x="12.9" y="0" width="3" height="11" rx="1" opacity="0.5" />
      </svg>
      {/* wifi */}
      <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
        <path d="M1 3.4a10 10 0 0 1 13 0M3.4 6a6.4 6.4 0 0 1 8.2 0" />
        <circle cx="7.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      {/* battery */}
      <svg width="24" height="12" viewBox="0 0 24 12" fill="none" aria-hidden>
        <rect x="0.6" y="0.6" width="20" height="10.8" rx="3" stroke="currentColor" strokeOpacity="0.5" />
        <rect x="2.4" y="2.4" width="15" height="7.2" rx="1.6" fill="currentColor" />
        <rect x="22" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" fillOpacity="0.5" />
      </svg>
    </span>
  )
}

/**
 * Half-iPhone mockup: the top of a titanium-framed device (Dynamic Island,
 * status bar) with the Искра tile on a purple home screen + a ＋ badge. The
 * body is taller than its clip window, so the phone reads as rising into the
 * sheet from below.
 */
function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 198, height: 210 }}>
      {/* soft aura behind the device */}
      <div style={{
        position: 'absolute', left: '50%', top: 18, transform: 'translateX(-50%)',
        width: 176, height: 176, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(143,111,230,0.5), transparent 70%)', filter: 'blur(8px)',
      }} />
      {/* clip window — hides the bottom half of the phone body */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* phone body (taller than window) */}
        <div style={{
          position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
          width: 198, height: 404, borderRadius: 48, padding: 5,
          background: 'linear-gradient(145deg,#42424a 0%,#1b1b1f 46%,#33333a 100%)',
          boxShadow: '0 24px 48px rgba(70,38,130,0.42), 0 6px 18px rgba(0,0,0,0.45)',
        }}>
          {/* screen */}
          <div style={{
            position: 'relative', width: '100%', height: '100%', borderRadius: 43, overflow: 'hidden',
            background: 'linear-gradient(170deg,#9C7DF0 0%,#6F49C9 48%,#512e9a 100%)',
          }}>
            {/* status bar */}
            <div style={{ position: 'absolute', top: 14, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>9:41</span>
              <StatusIcons />
            </div>
            {/* Dynamic Island */}
            <div style={{
              position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
              width: 84, height: 26, borderRadius: 99, background: '#08080a',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 9,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#26263a', boxShadow: 'inset 0 0 2px rgba(130,130,190,0.8)' }} />
            </div>

            {/* the Искра app tile */}
            <div style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
              <div style={{ position: 'relative', width: 62, height: 62, borderRadius: 15, overflow: 'visible' }}>
                <img src="/icon-192.png" alt="" width={62} height={62} style={{ display: 'block', width: 62, height: 62, borderRadius: 15, boxShadow: '0 12px 22px rgba(0,0,0,0.42)' }} />
                {/* + badge */}
                <div style={{
                  position: 'absolute', top: -8, right: -10, width: 24, height: 24, borderRadius: 99,
                  background: '#34C759', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 9px rgba(0,0,0,0.32)',
                }}>
                  <Plus size={13} color="#fff" strokeWidth={3.4} />
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>Искра</span>
            </div>

            {/* a partial row of neighbour apps, cut by the fold */}
            <div style={{ position: 'absolute', top: 168, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.16)' }} />
              ))}
            </div>

            {/* glass gloss + fade at the cut so the device dissolves into the sheet */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(255,255,255,0.16), transparent 38%)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, pointerEvents: 'none', background: 'linear-gradient(to top, rgba(30,16,60,0.35), transparent)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Perk({ icon: Icon, label }: { icon: typeof Rocket; label: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '11px 6px', borderRadius: 14, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)',
    }}>
      <Icon size={17} style={{ color: 'var(--color-accent)' }} />
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-text-2)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </div>
  )
}

function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle',
      width: 22, height: 22, borderRadius: 7, margin: '0 3px',
      background: 'var(--color-purple-soft, rgba(120,106,215,0.15))', color: 'var(--color-accent)',
    }}>
      {children}
    </span>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: 999,
        background: 'linear-gradient(135deg,#9B6FE8,#6F3FBF)', color: '#fff',
        fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 3px 9px rgba(111,63,191,0.35)',
      }}>
        {n}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--color-text-2)' }}>{children}</span>
    </div>
  )
}
