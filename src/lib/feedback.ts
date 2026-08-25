import { preferPlaybackSession } from './audioSession'

// ─────────────────────────────────────────────────────────────────────────────
// Topbar spring — fires ONLY at the compact/expanded boundary transition.
// Gives all topbar pills a one-shot "resist → snap-through" kick.
// ─────────────────────────────────────────────────────────────────────────────
let _spY   = 0
let _spV   = 0
let _spRaf: number | null = null

const _SP_KICK  = 4      // initial push magnitude (px)
const _SP_STIFF = 0.15
const _SP_DAMP  = 0.80

function _spTick() {
  _spV += -_spY * _SP_STIFF
  _spV *= _SP_DAMP
  _spY += _spV
  document.documentElement.style.setProperty('--topbar-spring-y', `${_spY.toFixed(3)}px`)
  if (Math.abs(_spY) > 0.04 || Math.abs(_spV) > 0.04) {
    _spRaf = requestAnimationFrame(_spTick)
  } else {
    _spY = 0; _spV = 0; _spRaf = null
    document.documentElement.style.removeProperty('--topbar-spring-y')
  }
}

// Call at the docking boundary: down=true when scrolling into compact, false when releasing.
export function springTopbar(down: boolean) {
  // Resist against scroll direction first, then spring back through neutral.
  _spV = down ? -_SP_KICK : _SP_KICK
  _spY = 0
  if (_spRaf) cancelAnimationFrame(_spRaf)
  _spRaf = requestAnimationFrame(_spTick)
}

// Lightweight tactile + audio feedback for UI affordances. Both channels are
// best-effort: navigator.vibrate is a no-op on desktop / unsupported browsers,
// and the WebAudio blip can only sound after a user gesture — which is exactly
// when we call it (taps, expands), so the browser's autoplay policy is happy.

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!ctx) {
      // Сеанс объявляем ДО создания контекста: тип страницы решает, слышно ли
      // её при выключенном звонке (см. lib/audioSession.ts).
      preferPlaybackSession()
      ctx = new Ctor()
    }
    // A context created before the first gesture starts suspended; resume it
    // lazily on the gesture that triggers the first sound. Safari добавляет к
    // этому своё состояние 'interrupted' — см. withAudio ниже.
    if (ctx.state !== 'running') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/**
 * Сыграть звук в проснувшемся контексте.
 *
 * ЗАЧЕМ ОБЁРТКА. Ноты ставятся в очередь по `ac.currentTime`, а у спящего
 * контекста часы стоят: всё, что запланировано в этот момент, звучит невпопад
 * или теряется вовсе. На айфоне это происходит регулярно и не только до первого
 * касания: Safari переводит контекст в СВОЁ состояние `interrupted`, когда звук
 * страницы перехватил кто-то другой — в том числе наша же озвучка задания через
 * speechSynthesis. Проверки «если suspended — разбудить» тут мало: `interrupted`
 * ей не ловится, и на задании «что вы услышали?» вердикт оказывается немым
 * ровно потому, что перед ним прозвучал вопрос.
 *
 * Поэтому: разбудить (resume вызван внутри касания — политика автозапуска не
 * против) и играть уже после пробуждения.
 */
function withAudio(play: (ac: AudioContext) => void) {
  const ac = audioCtx()
  if (!ac) return
  if (ac.state === 'running') { play(ac); return }
  void ac.resume()
    .then(() => { if (ac.state === 'running') play(ac) })
    .catch(() => { /* контекст не проснулся — остаётся вибрация */ })
}

// ─────────────────────────────────────────────────────────────────────────────
// Отдача в палец на айфоне.
//
// Vibration API на iOS НЕ СУЩЕСТВУЕТ: `navigator.vibrate` там просто нет, и все
// наши haptic() на айфоне молчали — вибрации не было ни в жестах, ни в
// вердиктах. Обходной путь у веба на iOS ровно один: невидимый переключатель
// <input type="checkbox" switch>, на котором Safari (17.4+) сам играет
// системный щелчок при переключении. Клик по его <label> и есть отдача.
//
// Способ негарантированный: на старых iOS он молчит, и это не ошибка — просто
// там отдачи не будет. Ставим элементы лениво, при первом же haptic().
// ─────────────────────────────────────────────────────────────────────────────
let hapticToggle: HTMLLabelElement | null = null

function iosTick() {
  if (typeof document === 'undefined') return
  try {
    if (!hapticToggle) {
      const hidden = 'position:fixed;top:-64px;left:-64px;width:0;height:0;'
        + 'opacity:0;pointer-events:none'
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.setAttribute('switch', '')
      box.id = '__haptic-switch'
      box.tabIndex = -1
      box.setAttribute('aria-hidden', 'true')
      box.style.cssText = hidden
      const label = document.createElement('label')
      label.setAttribute('for', '__haptic-switch')
      label.setAttribute('aria-hidden', 'true')
      label.style.cssText = hidden
      document.body.append(box, label)
      hapticToggle = label
    }
    hapticToggle.click()
  } catch {
    /* не поддерживается — остаётся только звук */
  }
}

/** Short haptic buzz. Pattern in ms (Android); на iOS — системный щелчок. */
export function haptic(pattern: number | number[] = 10) {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
      return
    }
  } catch {
    /* ignore */
  }
  iosTick()
}

/** A soft, quick UI "blip" via a single decaying sine — no asset needed. */
export function blip(freq = 520, duration = 0.06) {
  withAudio(ac => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = ac.currentTime
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.05, t + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + duration)
  })
}

/** Combined sound + vibration — the default "something opened / was pressed". */
export function tactile(opts?: { freq?: number; vibrate?: number | number[] }) {
  blip(opts?.freq)
  haptic(opts?.vibrate ?? 10)
}

/**
 * Scroll DOWN — topbar locks into compact.
 * Two descending tones: heavy thud → dry click. Feels like a latch snapping shut.
 */
export function lockSnap() {
  const ac = audioCtx()
  if (ac) {
    const t = ac.currentTime
    // Low thud — body of the lock
    const osc1 = ac.createOscillator()
    const g1   = ac.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(220, t)
    osc1.frequency.exponentialRampToValueAtTime(140, t + 0.06)
    g1.gain.setValueAtTime(0, t)
    g1.gain.linearRampToValueAtTime(0.05, t + 0.006)
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    osc1.connect(g1).connect(ac.destination)
    osc1.start(t); osc1.stop(t + 0.09)
    // Dry click — the pin catching
    const osc2 = ac.createOscillator()
    const g2   = ac.createGain()
    osc2.type = 'triangle'
    osc2.frequency.value = 380
    g2.gain.setValueAtTime(0, t + 0.04)
    g2.gain.linearRampToValueAtTime(0.035, t + 0.044)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.10)
    osc2.connect(g2).connect(ac.destination)
    osc2.start(t + 0.04); osc2.stop(t + 0.11)
  }
  haptic([7, 3, 4])
}

/**
 * Scroll UP — topbar expands back out.
 * Two ascending tones: soft tap → airy ring. Feels like a spring releasing.
 */
export function lockRelease() {
  const ac = audioCtx()
  if (ac) {
    const t = ac.currentTime
    // Soft tap — initial push
    const osc1 = ac.createOscillator()
    const g1   = ac.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(300, t)
    osc1.frequency.exponentialRampToValueAtTime(420, t + 0.05)
    g1.gain.setValueAtTime(0, t)
    g1.gain.linearRampToValueAtTime(0.03, t + 0.005)
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    osc1.connect(g1).connect(ac.destination)
    osc1.start(t); osc1.stop(t + 0.08)
    // Airy ring — the spring releasing up
    const osc2 = ac.createOscillator()
    const g2   = ac.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(480, t + 0.03)
    osc2.frequency.exponentialRampToValueAtTime(620, t + 0.10)
    g2.gain.setValueAtTime(0, t + 0.03)
    g2.gain.linearRampToValueAtTime(0.025, t + 0.036)
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    osc2.connect(g2).connect(ac.destination)
    osc2.start(t + 0.03); osc2.stop(t + 0.15)
  }
  haptic([4, 2])
}

// ─────────────────────────────────────────────────────────────────────────────
// Отдача свайпа назад (lib/useSwipeBack.ts).
//
// Не «щелчок в конце» и не шорох: пока страница едет, под пальцем работает
// мягкий моторчик. Низкая несущая, громкость которой качает LFO ~30 раз в
// секунду, — ухо слышит это как дрожь, а не как ноту, и звук читается
// продолжением вибрации, а не отдельным эффектом. Полосовой шум, стоявший тут
// раньше, звучал шелестом бумаги: слишком «предметно» для жеста.
//
// Размах ведёт СКОРОСТЬ пальца, частоту дрожи — пройденный путь: ведёшь
// медленно — еле ощутимо, у порога моторчик тикает чаще и злее. Остановил
// палец — тишина, хотя страница всё ещё отодвинута.
//
// Ниже ~110 Гц телефонный динамик уже не тянет: несущую держим над этой
// границей, а мягкость добираем срезом верхов, а не понижением тона.
// ─────────────────────────────────────────────────────────────────────────────

export type Friction = {
  /** speed — px/мс пальца, progress — 0…1 пути до срабатывания. */
  move(speed: number, progress: number): void
  /** Порог пройден (или сдан назад) — глухой толчок засечки. */
  detent(): void
  /** Конец жеста: fired — страница ушла, иначе вернулась. */
  stop(fired: boolean): void
}

/** Пустышка на случай, когда звука в системе нет: вызывать можно всё то же. */
const SILENT: Friction = { move() {}, detent() {}, stop() {} }

/** Запустить моторчик. Возвращает ручку — ею жест им и правит. */
export function frictionStart(): Friction {
  const ac = audioCtx()
  if (!ac) return SILENT

  const t0 = ac.currentTime

  const carrier = ac.createOscillator()
  carrier.type = 'sine'
  carrier.frequency.setValueAtTime(126, t0)

  // Дрожь. Глубина 0.55 при середине 0.45 — колебание почти до нуля и обратно:
  // именно провалы до тишины дают ощущение отдельных толчков, а не вибрато.
  const lfo = ac.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(29, t0)
  const depth = ac.createGain()
  depth.gain.value = 0.55
  const tremolo = ac.createGain()
  tremolo.gain.setValueAtTime(0.45, t0)
  lfo.connect(depth).connect(tremolo.gain)

  // Срез верхов: без него края каждого толчка щёлкают.
  const soft = ac.createBiquadFilter()
  soft.type = 'lowpass'
  soft.frequency.setValueAtTime(420, t0)

  const gain = ac.createGain()
  gain.gain.setValueAtTime(0, t0)

  carrier.connect(tremolo).connect(soft).connect(gain).connect(ac.destination)
  carrier.start(t0)
  lfo.start(t0)

  let dead = false

  return {
    move(speed, progress) {
      if (dead) return
      const t = ac.currentTime
      const p = Math.min(1, Math.max(0, progress))
      // Потолок низкий: отдача должна читаться как фактура движения.
      // 0.4 px/мс — это уже быстрый смах.
      const level = Math.min(0.055, Math.max(0, speed) * 0.13)
      // setTargetAtTime сглаживает рывки: кадры тача приходят неровно, и без
      // сглаживания моторчик дёргался бы ступеньками.
      gain.gain.setTargetAtTime(level, t, 0.045)
      // Ближе к порогу — чаще и чуть выше: рука слышит, что жест «набирает».
      lfo.frequency.setTargetAtTime(29 + p * 17, t, 0.07)
      carrier.frequency.setTargetAtTime(126 + p * 34, t, 0.07)
    },
    detent() {
      if (dead) return
      // Засечка: один глухой толчок поверх дрожи (отдача в палец — на жесте).
      const t = ac.currentTime
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, t)
      osc.frequency.exponentialRampToValueAtTime(96, t + 0.09)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
      osc.connect(g).connect(ac.destination)
      osc.start(t); osc.stop(t + 0.12)
    },
    stop(fired) {
      if (dead) return
      dead = true
      const t = ac.currentTime
      const tail = fired ? 0.2 : 0.1
      gain.gain.cancelScheduledValues(t)
      if (fired) {
        // Ушла — моторчик коротко догоняет страницу и затихает.
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.03), t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + tail)
        lfo.frequency.cancelScheduledValues(t)
        lfo.frequency.setTargetAtTime(22, t, 0.08)
      } else {
        // Вернулась — просто обрываем дрожь.
        gain.gain.setTargetAtTime(0, t, 0.03)
      }
      carrier.stop(t + tail + 0.05)
      lfo.stop(t + tail + 0.05)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Канон вердикта урока (docs/MEMORY_STANDARD.md, Р10)
//
// Два звука на всю учебную часть, и больше никаких. Ошибка полезна только с
// немедленной и однозначной обратной связью (Metcalfe 2017), а «однозначная» —
// это в том числе узнаваемая: один и тот же звук на верный ответ во всех
// заданиях и во всех курсах. Разнобой заставляет каждый раз заново решать, что
// именно сейчас сказали.
//
// Громкость ниже, чем у lockSnap: вердикт звучит десятки раз за урок, и на
// громкости интерфейсных щелчков он через пять минут раздражает.
// ─────────────────────────────────────────────────────────────────────────────

/** Верно: две ноты вверх (до–соль), короткие и мягкие. */
export function okChime() {
  withAudio(ac => {
    const t = ac.currentTime
    const note = (freq: number, at: number, dur: number, vol: number) => {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, t + at)
      g.gain.linearRampToValueAtTime(vol, t + at + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur)
      osc.connect(g).connect(ac.destination)
      osc.start(t + at); osc.stop(t + at + dur + 0.01)
    }
    note(587.33, 0, 0.11, 0.045)     // D5
    note(880.00, 0.075, 0.20, 0.040) // A5
  })
  haptic([8, 24, 8])
}

/** Мимо: одна короткая низкая нота. Не «злая» — просто глухая. */
export function missBlip() {
  withAudio(ac => {
    const t = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(233.08, t)              // Bb3
    osc.frequency.exponentialRampToValueAtTime(174.61, t + 0.12) // F3
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.05, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(g).connect(ac.destination)
    osc.start(t); osc.stop(t + 0.17)
  })
  haptic(26)
}
