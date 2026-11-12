import { Capacitor, registerPlugin } from '@capacitor/core'
import { APP_ICONS, useAppIcon } from './appIcon'
import { useLang } from './i18n'
import { useTheme } from '../store/themeStore'

type Setting = 'theme' | 'language' | 'icon'
type Option = { id: string; title: string; native?: string | null; preview?: string }

const plugin = registerPlugin<{
  showMoreSetting(options: {
    setting: Setting
    title: string
    errorTitle: string
    dark: boolean
    selected: string
    options: Option[]
  }): Promise<{ selected?: string }>
}>('AppIcon')

export const nativeMoreEnabled = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  && import.meta.env.VITE_IOS_NATIVE_MORE !== 'off'

export async function openNativeMoreSetting(setting: Setting, t: (text: string) => string): Promise<boolean> {
  if (!nativeMoreEnabled) return false
  const dark = useTheme.getState().dark
  const lang = useLang.getState().lang
  const options: Option[] = setting === 'theme'
    ? [{ id: 'light', title: t('Светлая') }, { id: 'dark', title: t('Тёмная') }]
    : setting === 'language'
      ? [{ id: 'ru', title: 'Русский' }, { id: 'en', title: 'English' }]
      : APP_ICONS.map(icon => ({ ...icon, title: t(icon.title) }))
  try {
    const { selected } = await plugin.showMoreSetting({
      setting,
      title: t(setting === 'theme' ? 'Тема оформления' : setting === 'language' ? 'Язык' : 'Иконка приложения'),
      errorTitle: t('Не получилось сменить иконку'),
      dark,
      selected: setting === 'theme' ? (dark ? 'dark' : 'light') : setting === 'language' ? lang : useAppIcon.getState().current,
      options,
    })
    if (setting === 'theme' && (selected === 'dark' || selected === 'light')) {
      const theme = useTheme.getState()
      if (theme.dark !== (selected === 'dark')) theme.toggle()
    }
    if (setting === 'language' && (selected === 'ru' || selected === 'en')) useLang.getState().setLang(selected)
    if (setting === 'icon') void useAppIcon.getState().load()
    return true
  } catch {
    return false
  }
}
