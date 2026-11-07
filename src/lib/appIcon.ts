// ─────────────────────────────────────────────────────────────────────────────
// Иконка приложения на главном экране телефона
//
// Только в приложении на iOS: альтернативные иконки — часть сборки
// (ios/App/App/Assets.xcassets/AppIcon-*.appiconset), меняет их плагин
// ios/App/App/AppIconPlugin.swift. В браузере и PWA иконку задаёт манифест,
// выбирать там нечего — ряд в профиле не показывается.
//
// Превью в шторке — уменьшенные копии тех же картинок в public/app-icons.
// Новая иконка = appiconset + имя в ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES
// (project.pbxproj, обе конфигурации) + строка в APP_ICONS + превью.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { Capacitor, registerPlugin } from '@capacitor/core'

interface AppIconPlugin {
  get(): Promise<{ supported: boolean; name: string | null }>
  set(o: { name?: string }): Promise<void>
}

const AppIcon = registerPlugin<AppIconPlugin>('AppIcon')

/** native — имя набора в Assets.xcassets; null = основная иконка сборки. */
export type AppIconOption = { id: string; native: string | null; title: string; preview: string }

export const APP_ICONS: AppIconOption[] = [
  { id: 'classic', native: null, title: 'Классика', preview: '/app-icons/classic.jpg' },
  { id: 'ogonek', native: 'AppIcon-Ogonek', title: 'Огонёк', preview: '/app-icons/ogonek.jpg' },
  { id: 'light', native: 'AppIcon-Light', title: 'Светлая', preview: '/app-icons/light.jpg' },
  { id: 'night', native: 'AppIcon-Night', title: 'Ночная', preview: '/app-icons/night.jpg' },
  { id: 'reader', native: 'AppIcon-Reader', title: 'С книгой', preview: '/app-icons/reader.jpg' },
  { id: 'star', native: 'AppIcon-Star', title: 'Звезда', preview: '/app-icons/star.jpg' },
  { id: 'heart', native: 'AppIcon-Heart', title: 'Сердце', preview: '/app-icons/heart.jpg' },
]

/** Выбор иконки возможен: приложение на iOS. Сам плагин может ещё сказать «нет». */
export const APP_ICON_NATIVE = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'

type State = {
  supported: boolean
  /** id из APP_ICONS; классика, пока система не ответила. */
  current: string
  busy: boolean
  load: () => Promise<void>
  choose: (id: string) => Promise<boolean>
}

const idOf = (native: string | null) => APP_ICONS.find(o => o.native === native)?.id ?? 'classic'

export const useAppIcon = create<State>((set, get) => ({
  supported: APP_ICON_NATIVE,
  current: 'classic',
  busy: false,
  load: async () => {
    if (!APP_ICON_NATIVE) return
    try {
      const r = await AppIcon.get()
      set({ supported: r.supported, current: idOf(r.name) })
    } catch {
      // Старая сборка без плагина: прячем ряд, чтобы тап не уходил в пустоту.
      set({ supported: false })
    }
  },
  choose: async id => {
    const opt = APP_ICONS.find(o => o.id === id)
    if (!opt || get().busy || id === get().current) return false
    const prev = get().current
    // Отмечаем сразу: системное окошко «Иконка изменена» появляется поверх, и
    // галочка не должна ждать, пока его закроют.
    set({ current: id, busy: true })
    try {
      await AppIcon.set(opt.native ? { name: opt.native } : {})
      set({ busy: false })
      return true
    } catch (e) {
      console.warn('[appIcon] смена не удалась', e)
      set({ current: prev, busy: false })
      return false
    }
  },
}))
