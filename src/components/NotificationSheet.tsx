import MobileSheet from './MobileSheet'
import EmptyState from './EmptyState'
import { NotifRow, useNotificationActivate } from './NotificationPopup'
import { BellOff } from './icons/appIcons'
import { useNotificationsStore } from '../store/notificationsStore'
import { btn, softBtn } from '../lib/pillStyles'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'

/**
 * Уведомления телефонного кабинета учителя — шторкой снизу.
 *
 * На телефоне у учителя был только тост, пока кабинет открыт: пришедшее, пока
 * приложение закрыто, не было видно нигде. Шторка показывает ту же историю,
 * что колокольчик на десктопе, с теми же строками и переходами. Прокрутку и
 * фейды даёт сама шторка; «Прочитать все» — закреплённый подвал.
 */
export default function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const notifications = useNotificationsStore(s => s.notifications)
  const markAllRead = useNotificationsStore(s => s.markAllRead)
  const activate = useNotificationActivate(onClose)
  const unread = notifications.filter(n => !n.read).length

  const footer = unread > 0
    ? <button data-hover="layer" type="button" onClick={() => { tactile(); markAllRead() }}
        style={{ ...btn('L', 'secondary'), ...softBtn, width: '100%', minHeight: 48, borderRadius: 999 }}>
        {t('Прочитать все')}
      </button>
    : undefined

  return (
    <MobileSheet open={open} onClose={onClose} title={t('Уведомления')} footer={footer}>
      {notifications.length === 0
        ? <EmptyState icon={BellOff} title={t('Нет уведомлений')} style={{ background: 'transparent', border: 'none', padding: '28px 12px' }} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {notifications.map(n => <NotifRow key={n.id} n={n} onActivate={activate} />)}
          </div>}
    </MobileSheet>
  )
}
