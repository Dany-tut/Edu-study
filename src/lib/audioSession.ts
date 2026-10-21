// ─────────────────────────────────────────────────────────────────────────────
// Звуковой сеанс страницы (айфон)
//
// ЗАЧЕМ. По умолчанию веб-страница на айфоне звучит «фоново»: боковой
// переключатель «Без звука» глушит и синтез речи, и WebAudio — то есть и само
// задание на слух, и звук верного ответа. Со стороны это выглядит поломкой
// приложения: музыка у человека играет, уведомления звонят, а урок молчит.
//
// Safari 16.4+ разрешает объявить сеанс страницы плеерным
// (`navigator.audioSession.type = 'playback'`) — тогда звук идёт мимо
// переключателя, как у любого проигрывателя. Там, где этого API нет (десктоп,
// Android, старые версии), вызов ничего не делает и ничего не ломает.
//
// Вызывается из тех же двух мест, где звук и рождается: озвучка заданий
// (lib/speech.ts) и вердикт с интерфейсными щелчками (lib/feedback.ts).
// ─────────────────────────────────────────────────────────────────────────────

type AudioSessionNav = Navigator & { audioSession?: { type: string } }

let unlocked = false

/** Айфон или айпад (iPadOS представляется маком, выдаёт его сенсорный экран). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iP(hone|ad|od)/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * Пол-секунды тишины WAV-файлом. Синтез речи на айфоне живёт мимо
 * `audioSession`: объявленный сеанс он не всегда наследует, и фраза «звучит»
 * (бегунок бежит, onstart пришёл) в полной тишине, если включён «Без звука».
 * Проигранный медиаэлемент переводит страницу в режим плеера и для синтеза —
 * тот же приём, что у веб-плееров, которые обязаны звучать при беззвучном.
 */
function silentWav(): string {
  const rate = 8000
  const n = rate / 2
  const buf = new DataView(new ArrayBuffer(44 + n))
  const str = (o: number, v: string) => { for (let k = 0; k < v.length; k++) buf.setUint8(o + k, v.charCodeAt(k)) }
  str(0, 'RIFF'); buf.setUint32(4, 36 + n, true); str(8, 'WAVE')
  str(12, 'fmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true)
  buf.setUint32(24, rate, true); buf.setUint32(28, rate, true); buf.setUint16(32, 1, true); buf.setUint16(34, 8, true)
  str(36, 'data'); buf.setUint32(40, n, true)
  for (let k = 0; k < n; k++) buf.setUint8(44 + k, 128)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

/**
 * Объявить страницу проигрывателем. Зовётся на каждый звук, а не раз на
 * загрузку: запись с микрофона (Shadowing, VoiceRecorder) переключает сеанс
 * на свой тип, и после неё озвучка снова глохла от переключателя.
 */
export function preferPlaybackSession() {
  if (typeof navigator === 'undefined') return
  try {
    const nav = navigator as AudioSessionNav
    if (nav.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback'
  } catch {
    /* нет такого API — и не надо */
  }
  // Медиаэлемент — один раз и только на айфоне/айпаде: на остальных
  // системах переключателя нет, и лишний «плеер» в системе ни к чему.
  if (unlocked || typeof document === 'undefined') return
  if (!isIOS()) return
  unlocked = true
  try {
    const el = new Audio(silentWav())
    el.setAttribute('playsinline', '')
    void el.play().catch(() => { unlocked = false })
  } catch {
    unlocked = false
  }
}
