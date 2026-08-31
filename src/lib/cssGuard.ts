import { recoverFromChunkError } from './chunkError'

/**
 * Сторож главной таблицы стилей.
 *
 * Приметы из [[chunkError]] ловят пропавший JS-чанк, но не пропавший CSS:
 * если `<link rel=stylesheet>` не доехал (блип сети на телефоне, отказавший
 * запрос из-под воркера), приложение рисуется целиком и работает — просто без
 * единого стиля: системный шрифт с засечками, всё в столбик. Ошибки при этом
 * нет ни одной, поэтому никакой обработчик не срабатывал.
 *
 * Проверяем маячок `--css-ok` из index.css. Пусто — сначала тихо просим тот же
 * файл ещё раз (лечит разовый блип без перезагрузки), и только если и второй
 * заход не помог, перезагружаем страницу разово общим гардом.
 */
export function guardStylesheet(): void {
  const applied = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--css-ok').trim() !== ''

  const check = () => {
    if (applied()) return

    const link = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href*="/assets/"]')
    if (!link) { recoverFromChunkError('Unable to preload CSS'); return }

    const retry = document.createElement('link')
    retry.rel = 'stylesheet'
    // Метка нужна, чтобы обойти уже отравленную запись в кеше браузера/воркера.
    retry.href = `${link.href}${link.href.includes('?') ? '&' : '?'}retry=1`
    retry.onload = () => { if (!applied()) recoverFromChunkError('Unable to preload CSS') }
    retry.onerror = () => recoverFromChunkError('Unable to preload CSS')
    document.head.appendChild(retry)
  }

  // Ждём первого кадра: до него стили честно могут быть ещё в пути.
  if (document.readyState === 'complete') setTimeout(check, 0)
  else window.addEventListener('load', () => setTimeout(check, 0), { once: true })
}
