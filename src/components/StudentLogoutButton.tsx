import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Alert } from './Alert'
import { LogOut } from './icons/appIcons'
import { supabase } from '../lib/supabase'
import { clearStudentSession, getStudentSession } from '../lib/studentSession'
import { trackNow } from '../lib/analytics'
import { tactile } from '../lib/feedback'
import { useT } from '../lib/i18n'
import { PAIR } from '../lib/mobileTokens'

export default function StudentLogoutButton({ onComplete }: { onComplete: () => void }) {
  const t = useT()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const logout = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    tactile()
    const initialCard = JSON.stringify(getStudentSession())
    try {
      // Keep the existing default scope. Do not release the latch on a UI
      // timeout: signOut cannot be aborted and may still be running in the SDK.
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      // Another login/tab may have replaced the account while the SDK awaited
      // the old sign-out. Never clear its card or navigate away from it.
      if (data.session || JSON.stringify(getStudentSession()) !== initialCard) {
        pending.current = false
        setBusy(false)
        return
      }
    } catch {
      pending.current = false
      setBusy(false)
      setFailed(true)
      return
    }
    void trackNow('logout', { role: 'student' })
    clearStudentSession()
    onComplete()
  }

  return <>
    {failed && <Alert tone="danger" stacked title={t('Не удалось выйти из аккаунта')}
      text={t('Проверьте подключение и попробуйте ещё раз.')} />}
    <motion.button data-hover="layer" type="button" whileTap={{ scale: 0.97 }} disabled={busy} aria-busy={busy}
      onClick={() => { void logout() }} className="flex items-center justify-center cursor-pointer"
      style={{ gap: 8, padding: 12, minHeight: 44, borderRadius: 16, background: 'transparent', color: PAIR.error.text, border: 'none', fontSize: 15, fontWeight: 600, opacity: busy ? 0.65 : 1, cursor: busy ? 'wait' : 'pointer' }}>
      <LogOut size={18} />{t(busy ? 'Выходим…' : failed ? 'Попробовать ещё раз' : 'Выйти из аккаунта')}
    </motion.button>
  </>
}
