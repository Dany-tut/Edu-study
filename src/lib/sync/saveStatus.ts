// Что показывает строка статуса сохранения (docs/saving.md §4.5, концепт ПК
// вариант A: Figma «Искра», стр. 16, секция 456:1240). Чистая логика без React —
// её проверяет scripts/checkWriteActivity.mjs.
//
//   «Сохранено · только что» → через минуту «Сохранено · в 14:02», не исчезает;
//   «Сохраняю…» — только если запись идёт дольше 400 мс (короткие не мигают);
//   «Нет сети — сохраню, когда появится» — офлайн и есть недоехавшие правки;
//   «Не сохранено» — запись не удалась (подробности и «Повторить» — в Alert).

/** Короче — строку не трогаем, иначе каждый автосейв мигал бы «Сохраняю…». */
export const SAVING_DELAY_MS = 400
/** Столько держится «только что», потом — время записи. */
export const JUST_NOW_MS = 60_000
/** Сбой записи повторяем сами через столько… */
export const SAVE_RETRY_MS = 30_000
/** …и не больше стольких раз подряд — дальше только «Повторить». */
export const SAVE_AUTO_RETRIES = 3

/** Повторить ли запись самим после failures-го сбоя подряд (при конфликте версий — нет). */
export function shouldAutoRetry(failures: number, online: boolean, conflict: boolean): boolean {
  return failures >= 1 && failures <= SAVE_AUTO_RETRIES && online && !conflict
}

export interface SaveStatusInput {
  /** Запись в полёте. */
  saving: boolean
  /** Когда началась текущая запись (Date.now()), null — не идёт. */
  savingSince: number | null
  /** Когда последняя запись подтвердилась базой в этом сеансе. */
  lastSavedAt: number | null
  /** Последняя попытка записи не удалась. */
  failed: boolean
  online: boolean
  /** Есть правки, которые ещё не доехали до базы. */
  pendingChanges: boolean
  /** Объект уже есть в базе (открыли сохранённый курс). */
  persisted: boolean
  now: number
}

export type SaveStatusView =
  | { kind: 'none' }
  | { kind: 'saving' }
  | { kind: 'offline' }
  | { kind: 'error' }
  | { kind: 'saved'; at: number | null; justNow: boolean }

export function saveStatusView(s: SaveStatusInput): SaveStatusView {
  // Без сети сбой — не ошибка: правки ждут и уйдут сами при её возвращении.
  if (!s.online && (s.pendingChanges || s.failed || s.saving)) return { kind: 'offline' }
  const longSave = s.saving && s.savingSince !== null && s.now - s.savingSince >= SAVING_DELAY_MS
  if (longSave) return { kind: 'saving' }
  if (s.failed) return { kind: 'error' }
  if (s.lastSavedAt !== null) return { kind: 'saved', at: s.lastSavedAt, justNow: s.now - s.lastSavedAt < JUST_NOW_MS }
  if (s.persisted) return { kind: 'saved', at: null, justNow: false }
  return { kind: 'none' }
}

/** «14:02» — 24-часовой формат, местное время. */
export function clockTime(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Через сколько мс строка сменится сама (400 мс → «Сохраняю…», минута → время); null — не сменится. */
export function nextStatusChangeIn(s: SaveStatusInput): number | null {
  if (s.saving && s.savingSince !== null && s.now - s.savingSince < SAVING_DELAY_MS) return SAVING_DELAY_MS - (s.now - s.savingSince)
  if (!s.saving && !s.failed && s.lastSavedAt !== null && s.now - s.lastSavedAt < JUST_NOW_MS) return JUST_NOW_MS - (s.now - s.lastSavedAt)
  return null
}
