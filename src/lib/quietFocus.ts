/**
 * Перенос фокуса скриптом без лишнего кольца.
 *
 * Окно ставит фокус само (на открытии, после удаления, при закрытии), а кольцо
 * должно появляться только у того, кто ходит клавиатурой. Браузеры решают это
 * по-разному: Chrome и Safari обычно не рисуют кольцо после мыши, Firefox
 * после программного фокуса рисует. Поэтому помним, чем человек трогал
 * страницу последним, и после мыши/пальца просим focusVisible:false.
 */
let lastInput: 'keyboard' | 'pointer' = 'pointer'
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', event => { if (!event.metaKey && !event.altKey && !event.ctrlKey) lastInput = 'keyboard' }, true)
  window.addEventListener('pointerdown', () => { lastInput = 'pointer' }, true)
}

export function focusQuietly(element: HTMLElement | null | undefined) {
  if (!element) return
  const keyboard = lastInput === 'keyboard'
  element.focus({ preventScroll: true, focusVisible: keyboard } as FocusOptions)
}
