// Цвет панелей Safari (theme-color) — всегда фон Искры, а не системная тема.
//
// В index.html стоят два тега с media (светлая/тёмная тема ОС) — они нужны до
// загрузки скриптов. Safari берёт ПЕРВЫЙ подходящий тег, поэтому третий тег без
// media, который раньше добавлялся в конец <head>, он не видел: на Маке в тёмной
// теме при светлой Искре над страницей оставалась чёрная полоса. Теперь после
// старта переписываем все теги сразу.
export function setThemeColor(bg: string) {
  if (typeof document === 'undefined') return
  try {
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    if (metas.length === 0) {
      const meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      meta.setAttribute('content', bg)
      document.head.appendChild(meta)
      return
    }
    metas.forEach(meta => meta.setAttribute('content', bg))
  } catch { /* недоступный DOM не мешает смене темы */ }
}
