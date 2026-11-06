import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { appLockSupported, useAppLock } from '../../lib/appLock'
import { useT } from '../../lib/i18n'
import { confirmDialog } from '../ConfirmHost'
import { Check, KeyRound, Lock, LockOpen, Settings } from '../icons/appIcons'
import './mfaLoginRow.css'

const pill = { minHeight: 44, width: 124, boxSizing: 'border-box', borderRadius: 14, fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' } as const

/** Строка «Блокировка приложения» — только в приложении iOS. Экран кода нативный. */
export default function AppLockRow() {
  if (!appLockSupported()) return null
  return <AppLockRowInner />
}

function AppLockRowInner() {
  const t = useT()
  const { state, setup, disable, setBiometrics } = useAppLock()
  const [menuOpen, setMenuOpen] = useState(false)
  const gear = useRef<HTMLButtonElement>(null)

  const enabled = !!state?.enabled
  const note = state?.biometry ? `${t('Код из 4 цифр и')} ${state.biometry}` : t('Код из 4 цифр')

  const turnOff = async () => {
    const ok = await confirmDialog({ title: t('Выключить блокировку?'), message: t('Искра откроется без кода.'), confirmLabel: t('Выключить'), tone: 'danger' })
    if (ok) await disable()
  }

  return <div style={{ borderTop: '1px solid var(--color-border-soft)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', alignItems: 'center', gap: 10, minHeight: 76, padding: '12px 0' }}>
      <span style={{ display: 'grid', placeItems: 'center', color: enabled ? 'var(--color-green-text)' : 'var(--color-purple-text)' }}><Lock size={22} /></span>
      <div style={{ minWidth: 0, color: 'var(--color-text)', fontSize: 14 }}>
        <strong>{t('Блокировка приложения')}</strong>
        <div style={{ marginTop: 3, color: 'var(--color-muted)', fontSize: 12, lineHeight: 1.35 }}>{note}</div>
      </div>
      {enabled
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="mfa-menu-wrap"
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenuOpen(false) }}
            onKeyDown={e => { if (e.key === 'Escape' && menuOpen) { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); gear.current?.focus() } }}>
            <button ref={gear} type="button" className="mfa-gear" aria-label={t('Настройки блокировки')} aria-haspopup="menu" aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}>
              <Settings size={18} />
            </button>
            <AnimatePresence>
              {menuOpen && <motion.div role="menu" className="mfa-menu"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                <button type="button" role="menuitem" className="mfa-menu__row" onMouseDown={e => e.preventDefault()}
                  onClick={() => { setMenuOpen(false); void setup() }}>
                  <KeyRound size={16} /><span className="mfa-menu__label">{t('Сменить код')}</span>
                </button>
                {state?.biometry && <button type="button" role="menuitemcheckbox" aria-checked={state.useBiometrics} className="mfa-menu__row" onMouseDown={e => e.preventDefault()}
                  onClick={() => { void setBiometrics(!state.useBiometrics) }}>
                  <Check size={16} style={{ opacity: state.useBiometrics ? 1 : 0 }} /><span className="mfa-menu__label">{state.biometry}</span>
                  <span className="mfa-menu__meta">{t(state.useBiometrics ? 'Вкл' : 'Выкл')}</span>
                </button>}
                <button type="button" role="menuitem" className="mfa-menu__row mfa-menu__row--danger" onMouseDown={e => e.preventDefault()}
                  onClick={() => { setMenuOpen(false); void turnOff() }}>
                  <LockOpen size={16} /><span className="mfa-menu__label">{t('Выключить')}</span>
                </button>
              </motion.div>}
            </AnimatePresence>
          </div>
          <span aria-label={t('Включена')} style={{ ...pill, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12 }}><Check size={14} strokeWidth={2.2} />{t('Включена')}</span>
        </div>
        : <button type="button" disabled={!state} onClick={() => void setup()}
          style={{ ...pill, padding: '0 10px', border: 0, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', cursor: 'pointer', opacity: state ? 1 : 0.55 }}>
          {state ? t('Включить') : t('Загрузка...')}
        </button>}
    </div>
  </div>
}
