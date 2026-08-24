import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Share, X, Plus, Sparkles, WifiOff, Rocket } from 'lucide-react'
import { subscribeInstall, subscribeShowInstall, hasInstallPrompt, promptInstall, isStandalone, getPlatform } from '../lib/pwaInstall'
import { useT } from '../lib/i18n'

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
  const t = useT()
  const platform = getPlatform()
  const [canPrompt, setCanPrompt] = useState(hasInstallPrompt())
  const [hidden, setHidden] = useState(dismissed() || isStandalone())
  // Set when the user explicitly taps "Установить приложение" in Profile. A
  // forced open must show the sheet even when auto-eligibility wouldn't (no
  // captured Android prompt, or an unrecognised platform) — otherwise the tap
  // looks dead.
  const [forced, setForced] = useState(false)

  useEffect(() => subscribeInstall(() => setCanPrompt(hasInstallPrompt())), [])
  // Re-open when the user taps "Установить приложение" in Profile, even if the
  // banner was dismissed earlier.
  useEffect(() => subscribeShowInstall(() => { setHidden(false); setForced(true) }), [])

  // Auto-show: only phones, not already installed/dismissed. Android needs a
  // captured prompt; iOS always qualifies (manual flow). An explicit tap in
  // Profile (forced) always opens the sheet regardless of platform.
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  const autoEligible = isPhone && (platform === 'ios' || (platform === 'android' && canPrompt))
  const eligible = !hidden && (forced || autoEligible)

  function close() { setHidden(true); setForced(false); markDismissed() }

  async function onInstall() {
    const ok = await promptInstall()
    if (ok) setHidden(true)
  }

  return (
    <>
      {eligible && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 9997,
            background: 'rgba(8,6,16,0.5)',
            backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
          }}
        />
      )}

      {eligible && (
          <motion.div
            key="sheet"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
            // Свайп вниз закрывает — по всему щиту, не только по граберу.
            // Содержимое не скроллится, так что конфликт жестов невозможен;
            // параметры те же, что у общего MobileSheet: вниз — за пальцем
            // один к одному, отпустил раньше порога — пружина вернёт на место.
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) close()
            }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9998,
              margin: '0 auto', maxWidth: 440,
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
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

            {/* Grabber + close — lifted above the content below so the close
                button stays clickable where the two rows overlap. */}
            <div style={{ position: 'relative', paddingTop: 10, zIndex: 3 }}>
              <div style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--color-border-medium)', margin: '0 auto' }} />
              <button
                onClick={close}
                aria-label={t('Закрыть')}
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
                {t('Установить «Искру»')}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.4, textAlign: 'center', marginTop: 5, maxWidth: 300 }}>
                {t('Быстрый доступ прямо с экрана «Домой» — без адресной строки')}
              </div>

              {/* Perks */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, width: '100%' }}>
                <Perk icon={Rocket} label={t('Мгновенный запуск')} />
                <Perk icon={Sparkles} label={t('На весь экран')} />
                <Perk icon={WifiOff} label={t('Работает офлайн')} />
              </div>
            </div>

            {/* Action zone: native dialog only when a prompt was actually
                captured; otherwise fall back to the manual add-to-home steps. */}
            {platform === 'android' && canPrompt ? (
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
                  <Plus size={18} strokeWidth={2.6} /> {t('Установить приложение')}
                </button>
              </div>
            ) : (
              <div style={{ padding: '18px 22px 4px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {t('Как установить')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Step n={1}>
                    {t('Нажмите')} <Glyph><Share size={14} strokeWidth={2} /></Glyph> {t('«Поделиться» внизу Safari')}
                  </Step>
                  <Step n={2}>
                    {t('Выберите')} <b style={{ color: 'var(--color-text)' }}>{t('«На экран Домой»')}</b> <Glyph><Plus size={14} strokeWidth={2.4} /></Glyph>
                  </Step>
                  <Step n={3}>
                    {t('Нажмите')} <b style={{ color: 'var(--color-text)' }}>{t('«Добавить»')}</b> {t('— иконка «Искры» появится на экране')}
                  </Step>
                </div>
              </div>
            )}
          </motion.div>
      )}
    </>
  )
}

/**
 * Phone mockup — the provided Bezel.svg (titanium frame, purple home screen,
 * Искра tile + ＋ badge). Only the top of the tall device is shown; its bottom
 * dissolves into the sheet via a fade mask, so the phone reads as rising up
 * into the panel from below.
 */
function PhoneMockup() {
  return (
    <div style={{
      position: 'relative', width: 210, height: 248,
      // A clip window over the tall artwork: overflow hides everything below,
      // and the mask fades the bottom over a long stretch so the device melts
      // smoothly into the sheet (no hard edge, no second phone peeking below).
      overflow: 'hidden',
      WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, #000 0%, #000 52%, transparent 100%)',
    }}>
      {/* soft aura behind the device */}
      <div style={{
        position: 'absolute', left: '50%', top: 26, transform: 'translateX(-50%)',
        width: 176, height: 176, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(143,111,230,0.5), transparent 70%)', filter: 'blur(10px)',
      }} />
      {/* the bezel artwork, with a little top breathing room so the frame isn't clipped */}
      <img
        src="./bezel-mockup.svg"
        alt="Искра"
        style={{
          position: 'absolute', left: '50%', top: 8, transform: 'translateX(-50%)',
          width: 210, height: 'auto', display: 'block',
        }}
      />
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
      <span style={{ fontSize: 13.5, lineHeight: 1.25, color: 'var(--color-text-2)' }}>{children}</span>
    </div>
  )
}
