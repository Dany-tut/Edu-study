// Фиче-флаги — лёгкие рубильники для рискованных изменений без деплоя.
//
// ЗАЧЕМ. Переход SM-2 → FSRS (см. lib/fsrs.ts, lib/reviewScheduler.ts) меняет
// формулу расписания для всей колоды сразу. Если формула поведёт себя странно
// на проде, откат через git — это деплой и ожидание; флаг — это одна строка в
// консоли браузера. Дефолт ON, потому что план (§3.1) требует FSRS как
// основной путь, а не эксперимент за конфигом.
//
// Хранилище — localStorage, один ключ на все флаги (а не россыпь отдельных),
// чтобы не мусорить и чтобы сброс всех оверрайдов был одной строкой в devtools:
// localStorage.removeItem('ff:overrides').

export type FlagName = 'fsrs'

const STORAGE_KEY = 'ff:overrides'

const DEFAULTS: Record<FlagName, boolean> = {
  fsrs: true, // FSRS-планировщик повторений вместо SM-2 (lib/fsrs.ts, lib/reviewScheduler.ts)
}

function readOverrides(): Partial<Record<FlagName, boolean>> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Значение флага: оверрайд из localStorage, если задан, иначе дефолт. */
export function isEnabled(flag: FlagName): boolean {
  const v = readOverrides()[flag]
  return typeof v === 'boolean' ? v : DEFAULTS[flag]
}

/** Ручной оверрайд — для QA и экрана отладки. `null` снимает оверрайд (возврат к дефолту). */
export function setFlag(flag: FlagName, value: boolean | null): void {
  if (typeof localStorage === 'undefined') return
  try {
    const overrides = readOverrides()
    if (value === null) delete overrides[flag]
    else overrides[flag] = value
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // localStorage недоступен (приватный режим/квота) — флаг остаётся дефолтным.
  }
}
