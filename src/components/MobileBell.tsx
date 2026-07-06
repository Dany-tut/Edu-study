import { useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import NotificationPopup from './NotificationPopup'
import { GlassIconButton } from './mobileChrome'
import { useNotificationsStore } from '../store/notificationsStore'

// Notification bell for mobile top zones: real unread dot + anchored popup.
// One canonical implementation so every screen behaves like the home screen.
export default function MobileBell() {
  const unread = useNotificationsStore(s => s.notifications.filter(n => !n.read).length)
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <div ref={bellRef} style={{ display: 'inline-flex' }}>
        <GlassIconButton icon={<Bell size={16} />} dot={unread > 0} ariaLabel="Уведомления" onClick={() => setOpen(o => !o)} />
      </div>
      <NotificationPopup open={open} anchorRef={bellRef} onClose={() => setOpen(false)} />
    </>
  )
}
