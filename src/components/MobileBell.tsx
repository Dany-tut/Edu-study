import { useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import NotificationPopup from './NotificationPopup'
import { GlassIconButton } from './mobileChrome'
import { useNotificationsStore } from '../store/notificationsStore'
import { useT } from '../lib/i18n'

// Notification bell for mobile top zones: real unread dot + anchored popup.
// One canonical implementation so every screen behaves like the home screen.
export default function MobileBell() {
  const t = useT()
  const unread = useNotificationsStore(s => s.notifications.filter(n => !n.read).length)
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <div ref={bellRef} style={{ display: 'inline-flex' }}>
        <GlassIconButton icon={<Bell size={17} />}  dot={unread > 0} ariaLabel={t('Уведомления')} onClick={() => setOpen(o => !o)} />
      </div>
      <NotificationPopup open={open} anchorRef={bellRef} onClose={() => setOpen(false)} />
    </>
  )
}
