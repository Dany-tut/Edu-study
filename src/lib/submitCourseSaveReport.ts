import { getSessionId } from './analytics'
import { APP_VERSION } from './appVersion'
import { clientDiagnostics } from './incidentTelemetry'
import { tzToCountry } from './tzCountry'
import { telemetrySource } from './telemetrySource'
import { supabase } from './supabase'
import type { courseSaveReportFields } from './courseSaveReport'

const browserTokens: [string, RegExp][] = [
  ['Edge', /(?:EdgA?|EdgiOS)\/([\d.]+)/], ['Opera', /OPR\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/], ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /Version\/([\d.]+).*Safari/],
]
export async function submitCourseSaveReport(id: string, fields: ReturnType<typeof courseSaveReportFields>): Promise<void> {
  const client = clientDiagnostics()
  const browser = browserTokens.find(([, pattern]) => pattern.test(navigator.userAgent))
  const zoneCountry = tzToCountry(client.client_timezone, false).code
  const diagnostics = {
    ...fields, session_id: getSessionId(), app_version: APP_VERSION,
    browser: browser?.[0] ?? 'unknown', browser_version: browser?.[1].exec(navigator.userAgent)?.[1] ?? null,
    client_platform: client.client_platform, os: client.client_platform,
    screen: `${screen.width}×${screen.height}`, viewport: `${window.innerWidth}×${window.innerHeight}`,
    client_timezone: client.client_timezone, country: zoneCountry === 'XX' ? null : zoneCountry,
    online: navigator.onLine, ...telemetrySource(),
  }
  const { data, error } = await supabase.rpc('report_course_save_failure', { p_report_id: id, p_diagnostics: diagnostics })
  if (error || data !== id) throw new Error('Course save report was not acknowledged')
}
