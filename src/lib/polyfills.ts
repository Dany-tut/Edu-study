/*
 * Заплатки для старых WebKit (iOS 15.0–16.x) и старых Chrome/Firefox.
 *
 * Сборка (Vite, safari14) переводит синтаксис, но НЕ добавляет недостающие
 * API. Без этих четырёх на iOS 15.0–15.3 не проходил ни один запрос входа:
 * authTransport вызывает signal.throwIfAborted(), authActions — crypto.randomUUID().
 * Импортируется первым в main.tsx — до Supabase и любого кода приложения.
 * Каждая заплатка ставится, только если своей реализации у браузера нет.
 */

type Writable<T> = { -readonly [K in keyof T]: T[K] }

function abortReason(signal: AbortSignal): unknown {
  return signal.reason !== undefined ? signal.reason : new DOMException('The operation was aborted.', 'AbortError')
}

if (typeof AbortSignal !== 'undefined') {
  const proto = AbortSignal.prototype as Writable<AbortSignal>
  // iOS 15.4
  if (typeof proto.throwIfAborted !== 'function') {
    proto.throwIfAborted = function throwIfAborted(this: AbortSignal) {
      if (this.aborted) throw abortReason(this)
    }
  }
  const ctor = AbortSignal as unknown as Writable<typeof AbortSignal>
  // iOS 16.0
  if (typeof ctor.timeout !== 'function') {
    ctor.timeout = (ms: number) => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms)
      return controller.signal
    }
  }
  // iOS 17.4
  if (typeof ctor.any !== 'function') {
    ctor.any = (signals: Iterable<AbortSignal>) => {
      const controller = new AbortController()
      const list = Array.from(signals)
      const already = list.find(s => s.aborted)
      if (already) { controller.abort(abortReason(already)); return controller.signal }
      const onAbort = (event: Event) => {
        list.forEach(s => s.removeEventListener('abort', onAbort))
        controller.abort(abortReason(event.target as AbortSignal))
      }
      list.forEach(s => s.addEventListener('abort', onAbort))
      return controller.signal
    }
  }
}

// iOS 15.4. getRandomValues есть везде, где работает приложение.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function' && typeof crypto.getRandomValues === 'function') {
  (crypto as Writable<Crypto>).randomUUID = function randomUUID() {
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const h = Array.from(b, x => x.toString(16).padStart(2, '0'))
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}` as `${string}-${string}-${string}-${string}-${string}`
  }
}

/** <dialog>.showModal() появился в iOS 15.4: на 15.0–15.3 просто открываем как обычный блок. */
export function openDialog(dialog: HTMLDialogElement | null | undefined) {
  if (!dialog || dialog.open) return
  if (typeof dialog.showModal === 'function') dialog.showModal()
  else dialog.setAttribute('open', '')
}

export {}
