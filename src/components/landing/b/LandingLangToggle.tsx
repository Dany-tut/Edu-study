import { useLang } from '../../../lib/i18n'

// Переключатель RU / EN в шапке лендинга. Выбор запоминается тем же ключом
// localStorage 'lang', что и в кабинете, — после входа язык сохраняется.
export default function LandingLangToggle() {
  const lang = useLang(s => s.lang)
  const setLang = useLang(s => s.setLang)
  const item = (l: 'ru' | 'en', label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      lang={l}
      data-hover="link"
      className={`h-[30px] rounded-[10px] px-2 text-[13px] font-bold tracking-[0.04em] transition-colors ${
        lang === l
          ? 'bg-[rgba(var(--accent-rgb),0.16)] text-[var(--color-accent)]'
          : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label={lang === 'en' ? 'Language' : 'Язык'} className="flex shrink-0 items-center gap-0.5">
      {item('ru', 'RU')}
      {item('en', 'EN')}
    </div>
  )
}
