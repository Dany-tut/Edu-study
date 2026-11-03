import { Capacitor } from '@capacitor/core'
import { redactCrashEvent } from './crashEventPrivacy'
// Inactive until a dedicated Iskra native crash project/DSN has been approved.
export async function initNativeCrashReporting() {
  const dsn = import.meta.env.VITE_SENTRY_NATIVE_DSN as string | undefined
  if (!dsn || !Capacitor.isNativePlatform()) return
  try {
    const [Sentry, ReactSentry] = await Promise.all([import('@sentry/capacitor'), import('@sentry/react')])
    Sentry.init({ dsn, release: __APP_VERSION__, sendDefaultPii: false,
      enableNative: true, enableNativeCrashHandling: true, enableNativeNagger: false,
      tracesSampleRate: 0, maxBreadcrumbs: 0,
      beforeSend(event, hint) {
        if (hint.attachments) hint.attachments = []
        return redactCrashEvent(event)
      },
    }, ReactSentry.init)
  } catch { /* diagnostics must not prevent app startup */ }
}
