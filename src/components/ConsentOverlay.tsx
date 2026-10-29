import { useState } from 'react'
import { MODAL_BACKDROP, MODAL_CARD } from './Modal'
import Checkbox from './Checkbox'
import { useT } from '../lib/i18n'
import { getStudentSession } from '../lib/studentSession'
import { trackEvent } from '../lib/analytics'

// Consent version — bump to re-prompt everyone after a material wording change.
const CONSENT_VERSION = 'v1'
function consentKey(id: string) { return `student_consent_${CONSENT_VERSION}_${id}` }

export function hasStudentConsent(): boolean {
  try {
    const s = getStudentSession()
    if (!s) return true // no student session → nothing to gate
    return localStorage.getItem(consentKey(s.id)) === '1'
  } catch {
    return true // fail-open on storage errors: never trap the student behind a broken gate
  }
}

/**
 * 152-ФЗ consent gate for students. Rendered as an OVERLAY on top of the
 * cabinet (not a replacement) so a bug here can never blank the app — the
 * dashboard stays mounted behind it. Records consent as an append-only
 * analytics event (timestamped, tied to student_id) — no schema change needed.
 *
 * NOTE: the legal wording below is a sensible default — have it reviewed by a
 * lawyer and link a real privacy policy before launch.
 */
export default function ConsentOverlay({ onAccept }: { onAccept: () => void }) {
  const t = useT()
  const [checked, setChecked] = useState(false)
  const session = getStudentSession()
  if (!session) return null

  function accept() {
    if (!checked) return
    try { localStorage.setItem(consentKey(session!.id), '1') } catch { /**/ }
    try { trackEvent('consent_granted', { version: CONSENT_VERSION, student_id: session!.id }) } catch { /**/ }
    onAccept()
  }

  return (
    <div style={{
      ...MODAL_BACKDROP, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      {/* Общий каркас окна; рамка не прокручивается — листается тело. */}
      <div style={{
        ...MODAL_CARD, maxWidth: 380, width: '100%', maxHeight: '90dvh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '22px 20px 18px' }}>
          <Checkbox checked={checked} onChange={setChecked} accent="var(--color-purple, #786AD7)" labelStyle={{ display: 'flex' }}>
            <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-2)' }}>
              {t('Согласен(а) на обработку данных.')}
            </span>
          </Checkbox>

          <button
            onClick={accept}
            disabled={!checked}
            style={{
              width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 11, border: 'none',
              background: checked ? 'var(--grad-purple, #786AD7)' : 'var(--color-border-medium)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: checked ? 'pointer' : 'not-allowed', opacity: checked ? 1 : 0.7,
              transition: 'opacity .15s, background .15s',
            }}
          >
            {t('Принимаю и продолжаю')}
          </button>
        </div>
      </div>
    </div>
  )
}
