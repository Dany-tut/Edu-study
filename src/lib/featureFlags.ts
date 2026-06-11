import { getStudentSession } from './studentSession'

// Student IDs that get early access to features still in preview.
// Remove an ID when you're ready to open that feature to that user,
// or delete the flag check entirely for a full release.
const DARK_THEME_PREVIEW_IDS = new Set([
  '31e69df8-543c-4ccd-9e60-1b7353e3230e', // Даниил Макаренко
])

export function canUseFeature(flag: 'darkTheme'): boolean {
  if (flag === 'darkTheme') {
    const session = getStudentSession()
    return session ? DARK_THEME_PREVIEW_IDS.has(session.id) : false
  }
  return false
}
