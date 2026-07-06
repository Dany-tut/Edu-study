import { useState } from 'react'
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
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      <div style={{
        maxWidth: 380, width: '100%', background: 'var(--color-bg)', borderRadius: 18,
        border: '1px solid var(--color-border-medium)', padding: '22px 20px 18px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0 }}
          />
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              flexShrink: 0,
              borderRadius: 6,
              border: `1.5px solid ${checked ? 'var(--color-purple, #786AD7)' : 'var(--color-border-medium)'}`,
              background: checked ? 'var(--color-purple, #786AD7)' : 'var(--color-bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
          >
            {checked && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-2)' }}>
            Согласен(а) на обработку данных.
          </span>
        </label>

        <button
          onClick={accept}
          disabled={!checked}
          style={{
            width: '100%', marginTop: 16, padding: '11px 0', borderRadius: 11, border: 'none',
            background: checked ? 'var(--grad-purple, #786AD7)' : 'var(--color-border-medium)',
            color: '#fff', fontSize: 13.5, fontWeight: 700,
            cursor: checked ? 'pointer' : 'not-allowed', opacity: checked ? 1 : 0.7,
            transition: 'opacity .15s, background .15s',
          }}
        >
          Принимаю и продолжаю
        </button>
      </div>
    </div>
  )
}
