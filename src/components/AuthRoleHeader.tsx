import { Capacitor } from '@capacitor/core'
import { useT } from '../lib/i18n'
import { ArrowLeft } from './icons/appIcons'
import IskraMark from './landing/IskraMark'

export default function AuthRoleHeader({ onLeave }: { onLeave: () => void }) {
  const t = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IskraMark size={30} />
        <span style={{ fontSize: 18, fontWeight: 750, color: 'var(--color-text)' }}>{t('Искра')}</span>
      </div>
      <button type="button" onClick={() => {
        onLeave()
        window.location.hash = Capacitor.isNativePlatform() ? '#/entry' : '#/landing?role=choose'
      }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 4px', border: 0, background: 'transparent', color: 'var(--color-purple-text)', fontSize: 12, fontWeight: 650, cursor: 'pointer' }}>
        <ArrowLeft size={16} style={{ flexShrink: 0 }} />
        {t('Выбрать роль')}
      </button>
    </div>
  )
}
