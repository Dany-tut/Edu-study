import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * ОДИН запрос на всех, кто его просит.
 *
 * `useGroups()` и `useAllStudents()` были обычными хуками со своим useState и
 * своим useEffect: сколько компонентов позвало — столько одинаковых запросов и
 * ушло. В кабинете учителя это 20 и 17 вызовов соответственно, из них полтора
 * десятка на одном столе главной. Каждый — свой круг до Supabase, и виджеты
 * загорались вразнобой: у счётчика студентов ещё скелетон, а у соседнего уже
 * ноль.
 *
 * Побочно чинится и расхождение: у каждого хука была СВОЯ копия списка, и
 * добавление группы в одном месте не доезжало до остальных до перезагрузки
 * страницы. Теперь состояние общее, и `reload()` виден всем подписчикам.
 *
 * Снимок — стабильный объект: useSyncExternalStore сравнивает его по ссылке и
 * новый создаётся только при настоящем изменении.
 */
export type Snapshot<T> = { value: T; loading: boolean }

export type SharedQuery<T> = {
  /** Первый подписчик запускает загрузку; повторные вызовы бесплатны. */
  ensure: () => void
  /** Перечитать (после записи). Ждёт уже летящий запрос и делает свежий: иначе
   *  мутация получила бы ответ, отправленный ДО её записи. */
  reload: () => Promise<void>
  getSnapshot: () => Snapshot<T>
  subscribe: (cb: () => void) => () => void
}

const registry = new Set<{ invalidate: () => void }>()

export type SharedOptions = {
  /**
   * Живая подписка: включается, когда появляется ПЕРВЫЙ подписчик, и гаснет,
   * когда уходит последний. Раньше канал заводил каждый вызов хука — девять
   * компонентов давали девять каналов на одну таблицу, и каждое изменение
   * перезапускало загрузку девять раз.
   */
  watch?: (reload: () => void) => () => void
}

export function createSharedQuery<T>(fetcher: () => Promise<T>, initial: T, opts: SharedOptions = {}): SharedQuery<T> {
  let state: Snapshot<T> = { value: initial, loading: true }
  let inflight: Promise<void> | null = null
  let started = false
  // Номер поколения: ответ на запрос, отправленный до смены пользователя, не
  // должен попасть в состояние после неё.
  let gen = 0
  const subs = new Set<() => void>()
  const emit = () => { for (const f of subs) f() }
  let unwatch: (() => void) | null = null
  let unwatchTimer: ReturnType<typeof setTimeout> | null = null

  function run(): Promise<void> {
    if (inflight) return inflight
    const my = ++gen
    inflight = fetcher()
      .then(v => { if (my === gen) state = { value: v, loading: false } })
      .catch(e => {
        console.error('[sharedQuery]', e)
        // Снимаем ожидание всё равно: экран, навсегда застрявший в скелетоне,
        // хуже пустого — из него пользователь не выйдет без перезагрузки.
        if (my === gen) state = { value: state.value, loading: false }
      })
      .finally(() => { inflight = null; emit() })
    return inflight
  }

  const q: SharedQuery<T> = {
    ensure: () => { if (started) return; started = true; void run() },
    reload: async () => {
      started = true
      if (inflight) await inflight.catch(() => { /**/ })
      return run()
    },
    getSnapshot: () => state,
    subscribe: cb => {
      subs.add(cb)
      if (opts.watch) {
        if (unwatchTimer) { clearTimeout(unwatchTimer); unwatchTimer = null }
        if (!unwatch) unwatch = opts.watch(() => { void q.reload() })
      }
      return () => {
        subs.delete(cb)
        // Отписка с отсрочкой: StrictMode размонтирует и монтирует обратно в
        // том же кадре, и без паузы канал успел бы закрыться и открыться зря.
        if (subs.size === 0 && unwatch && !unwatchTimer) {
          unwatchTimer = setTimeout(() => {
            unwatchTimer = null
            if (subs.size === 0 && unwatch) { unwatch(); unwatch = null }
          }, 2000)
        }
      }
    },
  }

  registry.add({
    invalidate: () => {
      gen++
      inflight = null
      state = { value: initial, loading: true }
      // Если на экране кто-то есть — сразу перечитываем под новым аккаунтом.
      started = subs.size > 0
      if (started) void run()
      emit()
    },
  })
  return q
}

// Вход/выход/смена аккаунта: чужие группы и ученики не должны пережить смену
// владельца ни на кадр.
supabase.auth.onAuthStateChange(() => { for (const q of registry) q.invalidate() })

export function useSharedQuery<T>(q: SharedQuery<T>): Snapshot<T> {
  const snap = useSyncExternalStore(q.subscribe, q.getSnapshot, q.getSnapshot)
  useEffect(() => { q.ensure() }, [q])
  return snap
}
