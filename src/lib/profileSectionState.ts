export type ProfileSection = 'main' | 'friends' | 'integrations' | 'settings'

export const PROFILE_SECTION_STORAGE_KEY = 'iskra:teacher-profile-section'

const isProfileSection = (value: string | null): value is ProfileSection =>
  value === 'main' || value === 'friends' || value === 'integrations' || value === 'settings'

export function readProfileSection(storage?: Pick<Storage, 'getItem'>): ProfileSection | null {
  try {
    const source = storage ?? window.sessionStorage
    const value = source.getItem(PROFILE_SECTION_STORAGE_KEY)
    return isProfileSection(value) ? value : null
  } catch { return null }
}

export function writeProfileSection(section: ProfileSection, storage?: Pick<Storage, 'setItem'>): void {
  try { (storage ?? window.sessionStorage).setItem(PROFILE_SECTION_STORAGE_KEY, section) }
  catch { /* sessionStorage may be unavailable; the profile still works */ }
}
