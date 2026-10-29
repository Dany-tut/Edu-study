/**
 * Опознание и лечение «чанк пропал после деплоя».
 *
 * Клиент со старым index.html просит файл со старым хешем. На Vercel SPA-rewrite
 * ловит ЛЮБОЙ путь, поэтому вместо честного 404 приходит index.html с кодом 200 —
 * и браузер ругается на MIME, а не на «dynamically imported module». Поэтому
 * список примет длиннее очевидного, и он тут один на всё приложение: раньше копии
 * жили в main.tsx и в WidgetBoundary и успели разойтись.
 */
const PATTERNS = [
  /dynamically imported module/i,          // Chrome/Firefox: Failed to fetch … / error loading …
  /Importing a module script failed/i,     // Safari
  /Failed to load module script/i,         // Chrome: MIME text/html вместо JS (SPA-rewrite)
  /MIME type of ["']?text\/html/i,
  /Unable to preload CSS/i,                // Vite: не доехал CSS ленивого чанка
  /ChunkLoadError/i,
]

export function isChunkError(msg: string): boolean {
  return PATTERNS.some(re => re.test(msg))
}

/**
 * Один принудительный reload, чтобы забрать свежий index.html с актуальными
 * хешами. Гард в sessionStorage — иначе при по-настоящему пропавшем файле
 * страница уходит в вечный цикл перезагрузок.
 *
 * Вторая ступень. Если чанк упал снова сразу после такой перезагрузки, дело не
 * в старой оболочке, а в самом хранилище сайта в этом браузере: у Вадима в Edge
 * (29.10.2026) файл был на проде, в соседнем браузере грузился, а у него падал
 * на каждой перезагрузке, пока не стёрли данные сайта. Поэтому один раз в минуту
 * сносим воркер и ВСЕ кеши, включая app-chunks, — то же, что «удалить данные
 * сайта», только без выхода из аккаунта (localStorage не трогаем).
 */
export function recoverFromChunkError(msg: string): boolean {
  if (!isChunkError(msg)) return false
  const now = Date.now()
  const read = (key: string) => {
    try { return Number(sessionStorage.getItem(key) || '0') } catch { return 0 }
  }
  const mark = (key: string) => {
    try { sessionStorage.setItem(key, String(now)) } catch { /**/ }
  }
  if (now - read('chunk_reload_at') >= 10_000) {
    mark('chunk_reload_at')
    void hardReload()
    return true
  }
  if (now - read('chunk_purge_at') >= 60_000) {
    mark('chunk_purge_at')
    mark('chunk_reload_at')
    void hardReload({ full: true })
    return true
  }
  return false
}

/**
 * Перезагрузка мимо сервис-воркера. Простой reload() обслуживает тот же
 * воркер, и если у него в кеше старая оболочка, вкладка снова получает старый
 * index.html и падает на том же чанке второй раз (29.09.2026). Поэтому сначала
 * снимаем воркер и кеши, где лежит HTML (app-shell и precache), — чанки с
 * хешем в имени не трогаем, они не устаревают. Воркер встанет заново при загрузке.
 * `full` — снести все кеши сайта (вторая ступень, см. recoverFromChunkError).
 */
export async function hardReload({ full = false }: { full?: boolean } = {}): Promise<void> {
  const purge = async () => {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    await Promise.all(regs.map(r => r.unregister()))
    const keys = (await window.caches?.keys?.()) ?? []
    await Promise.all(keys.filter(k => full || k === 'app-shell' || k.includes('precache')).map(k => caches.delete(k)))
  }
  // Зависший воркер не должен запереть человека на экране ошибки: 2 с — и перезагрузка.
  try { await Promise.race([purge(), new Promise(r => setTimeout(r, 2000))]) } catch { /* просто перезагрузка */ }
  window.location.reload()
}

/**
 * Ретрай динамического импорта: разовый сетевой блип (метро, лифт, спящий wifi)
 * лечится второй попыткой и не доходит до перезагрузки. Важно, что повтор живёт
 * ВНУТРИ фабрики: React.lazy кэширует отказ навсегда, и после того, как промис
 * отклонён, ни ремоунт, ни «Повторить» второго import() уже не вызовут.
 */
export function retryImport<T>(factory: () => Promise<T>, attempts = 3): Promise<T> {
  return factory().catch(async (err: unknown) => {
    for (let i = 1; i < attempts; i++) {
      await new Promise(r => setTimeout(r, 250 * 2 ** (i - 1)))
      try { return await factory() } catch { /* следующая попытка */ }
    }
    throw err
  })
}
