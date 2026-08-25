import { create } from 'zustand'
import { APP_BUILD, fetchRemoteVersion, applyUpdate } from './appVersion'

// ─────────────────────────────────────────────────────────────────────────────
// Одно состояние обновления на всё приложение.
//
// Строка версии в профиле и таблетка на главной обязаны говорить одно и то же:
// раньше у каждой был свой запрос и свой ответ, и они расходились. Здесь общий
// стор — проверка одна, состояние одно.
//
// Отдельная забота — ЗАГРУЗКА. `applyUpdate()` сносит воркера, чистит кеши и
// перезагружает страницу: секунду-две экран просто молчит, и тап выглядит как
// «зависло». Поэтому у стора есть `progress`, который ползёт сам по себе к
// цели ближайшего этапа: полоса всегда движется, даже когда очередной шаг
// подзавис.
// ─────────────────────────────────────────────────────────────────────────────

export type UpdatePhase =
  | 'idle'      // ещё не спрашивали
  | 'checking'  // спрашиваем сервер (по тапу — с индикатором)
  | 'fresh'     // на устройстве та же сборка, что на сервере
  | 'stale'     // на сервере новее — есть что забрать
  | 'error'     // не достучались (офлайн — обычное дело)
  | 'updating'  // забираем: чистим кеши и перезагружаемся

type State = {
  phase: UpdatePhase
  remoteVersion: string | null
  progress: number            // 0..1, только для phase === 'updating'
  check: (loud?: boolean) => Promise<void>
  apply: () => Promise<void>
}

let inflight = false

export const useAppUpdate = create<State>((set, get) => ({
  phase: 'idle',
  remoteVersion: null,
  progress: 0,

  async check(loud = false) {
    if (inflight || get().phase === 'updating') return
    inflight = true
    if (loud) set({ phase: 'checking' })
    const r = await fetchRemoteVersion()
    inflight = false
    if (!r) { set({ phase: loud ? 'error' : get().phase === 'idle' ? 'idle' : get().phase }); return }
    set({ remoteVersion: r.version, phase: r.build > APP_BUILD ? 'stale' : 'fresh' })
  },

  async apply() {
    if (get().phase === 'updating') return
    set({ phase: 'updating', progress: 0.06 })

    // Полоса живёт своей жизнью: каждые 90 мс подтягивается к цели этапа на
    // десятую долю остатка. Замер настоящего прогресса тут невозможен (браузер
    // не рассказывает, сколько осталось качать воркеру), но движение честное —
    // цель двигают реальные шаги ниже, а не таймер.
    let target = 0.25
    const tick = window.setInterval(() => {
      const p = get().progress
      set({ progress: Math.max(p, p + (target - p) * 0.18) })
    }, 90)

    try {
      await applyUpdate(step => {
        // 'sw' — воркер снят, 'caches' — кеши стёрты, 'done' — идём на перезагрузку
        target = step === 'sw' ? 0.55 : step === 'caches' ? 0.9 : 1
        // Последний шаг добивает полосу до конца сразу: доползать плавно уже
        // некогда — через четверть секунды экран перезагрузится, и незакрытая
        // полоса читалась бы как обрыв.
        if (step === 'done') set({ progress: 1 })
      })
    } finally {
      clearInterval(tick)
    }
  },
}))

// Проверка сама по себе: при запуске, при возвращении в приложение с фона и
// раз в четверть часа. Без этого таблетка «есть обновление» появлялась бы
// только у того, кто открыл профиль и ткнул в версию.
let watching = false
export function watchForUpdates() {
  if (watching || typeof window === 'undefined') return
  watching = true
  const check = () => void useAppUpdate.getState().check(false)
  check()
  window.setInterval(check, 15 * 60 * 1000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
}
