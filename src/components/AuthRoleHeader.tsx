import { Capacitor } from '@capacitor/core'
import { useT } from '../lib/i18n'
import { ArrowLeft } from './icons/appIcons'
import IskraMark from './landing/IskraMark'

export default function AuthRoleHeader({ onLeave, logoTone = 'default' }: { onLeave: () => void; logoTone?: 'default' | 'deep' }) {
  const t = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, minHeight: 44, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 30 }}>
        <IskraMark size={30} tone={logoTone} />
        <span style={{ fontSize: 18, lineHeight: '30px', transform: 'translateY(-0.5px)', fontWeight: 750, color: 'var(--color-text)' }}>{t('Искра')}</span>
      </div>
      <button data-hover="layer" type="button" onClick={() => {
        onLeave()
        window.location.hash = Capacitor.isNativePlatform() ? '#/entry' : '#/landing?role=choose'
      }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 4px', transform: 'translateY(-7px)', border: 0, background: 'transparent', color: 'var(--color-purple-text)', fontSize: 12, fontWeight: 650, cursor: 'pointer' }}>
        <ArrowLeft size={16} style={{ flexShrink: 0 }} />
        {t('Выбрать роль')}
      </button>
    </div>
  )
}
