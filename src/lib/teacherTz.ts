import { create } from 'zustand'
import { getAuthUser } from './owner'
import { supabase } from './supabase'

// ── Список зон для селекта ───────────────────────────────────────────────────

export const TZ_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/Kaliningrad',  label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow',       label: 'Москва (UTC+3)' },
  { value: 'Europe/Minsk',        label: 'Минск (UTC+3)' },
  { value: 'Europe/Samara',       label: 'Самара (UTC+4)' },
  { value: 'Asia/Tbilisi',        label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Dubai',          label: 'Дубай (UTC+4)' },
  { value: 'Asia/Yekaterinburg',  label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Tashkent',       label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Almaty',         label: 'Алматы (UTC+5)' },
  { value: 'Asia/Omsk',           label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk',    label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Bangkok',        label: 'Бангкок (UTC+7)' },
  { value: 'Asia/Irkutsk',        label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk',        label: 'Якутск (UTC+9)' },
  { value: 'Asia/Seoul',          label: 'Сеул (UTC+9)' },
  { value: 'Asia/Tokyo',          label: 'Токио (UTC+9)' },
  { value: 'Asia/Vladivostok',    label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan',        label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka',      label: 'Камчатка (UTC+12)' },
  { value: 'Europe/Kyiv',         label: 'Киев (UTC+2/+3)' },
  { value: 'Europe/Berlin',       label: 'Берлин (UTC+1/+2)' },
  { value: 'Europe/London',       label: 'Лондон (UTC+0/+1)' },
  { value: 'Asia/Jerusalem',      label: 'Иерусалим (UTC+2/+3)' },
  { value: 'America/New_York',    label: 'Нью-Йорк (UTC−5/−4)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC−8/−7)' },
]

// ── Утилиты ──────────────────────────────────────────────────────────────────

export function browserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'Europe/Moscow' }
}

export function tzOffsetMs(tz: string, at?: Date): number {
  const d = at ?? new Date()
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) parts[p.type] = p.value
  const h = parts.hour === '24' ? '0' : parts.hour
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +h, +parts.minute, +parts.second)
  return local - d.getTime()
}

const MSK_TZ = 'Europe/Moscow'

export function formatTimeInTz(iso: string, tz: string): string {
  const d = new Date(iso)
  const off = tzOffsetMs(tz, d)
  const t = new Date(d.getTime() + off)
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}

export function formatTimeInMsk(iso: string): string {
  return formatTimeInTz(iso, MSK_TZ)
}

export function tzShortLabel(tz: string): string {
  const entry = TZ_OPTIONS.find(o => o.value === tz)
  if (entry) {
    const city = entry.label.split(' (')[0]
    return city
  }
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz
}

export function isMsk(tz: string): boolean {
  return tz === MSK_TZ
}

// ── Store ────────────────────────────────────────────────────────────────────

type TzStore = {
  tz: string
  loaded: boolean
  load: () => Promise<void>
  setTz: (tz: string) => Promise<boolean>
}

export const useTeacherTz = create<TzStore>((set, get) => ({
  tz: 'Europe/Moscow',
  loaded: false,

  async load() {
    if (get().loaded) return
    const u = await getAuthUser()
    const saved = u?.user_metadata?.timezone as string | undefined
    set({ tz: saved || browserTz(), loaded: true })
  },

  async setTz(tz: string) {
    set({ tz })
    const { error } = await supabase.auth.updateUser({ data: { timezone: tz } })
    return !error
  },
}))
