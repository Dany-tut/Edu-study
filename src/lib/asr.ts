// ─────────────────────────────────────────────────────────────────────────────
// Распознавание речи (ASR): тонкая обёртка над Web Speech API
//
// ЧТО ЭТО И ЧЕМ НЕ ЯВЛЯЕТСЯ. SpeechRecognition возвращает ТЕКСТ, а не оценку
// произношения: «распознано правильно» значит лишь «браузер понял слова».
// Поэтому всё, что можно на нём построить честно, — подсказка «совпало /
// что-то разошлось», а не балл за акцент. Так это и используется (Shadowing).
//
// ДОСТУПНОСТЬ. API есть в Chrome/Edge (webkitSpeechRecognition) и частично в
// Safari; в Firefox его нет. Обёртка обязана деградировать бесшумно: везде,
// где ASR подключён, интерфейс без него выглядит ровно как раньше. Отсюда
// isAsrAvailable() — вызывающий сначала спрашивает, потом рисует.
//
// ОДНОФРАЗНЫЙ РЕЖИМ. continuous=false: сессия — одна реплика. Слушание живёт
// параллельно с MediaRecorder (оба берут микрофон независимо), поэтому у
// сессии есть stop() — её гасят той же кнопкой, что и запись.
// ─────────────────────────────────────────────────────────────────────────────

type SpeechRecognitionCtor = new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

function ctor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/** Есть ли в этом браузере распознавание речи вообще. */
export function isAsrAvailable(): boolean {
  return ctor() !== undefined
}

export interface AsrSession {
  /**
   * Итоговый текст. Резолвится, когда браузер закрыл сессию (сам по тишине
   * или после stop()). Пустая строка = ничего не распозналось; ошибки API
   * (нет сети у облачного распознавателя, нет разрешения) тоже дают '' —
   * вызывающему в обоих случаях нечего показывать.
   */
  done: Promise<string>
  /** Дослушать и отдать то, что уже распознано. */
  stop(): void
  /** Бросить сессию без результата (done резолвится в ''). */
  cancel(): void
}

/**
 * Слушать одну фразу на языке `lang` (BCP-47: 'ko', 'en-US', …).
 * Возвращает null, если ASR в браузере нет, — это штатная ветка, не ошибка.
 */
export function listen(lang: string): AsrSession | null {
  const Ctor = ctor()
  if (!Ctor) return null

  const rec = new Ctor()
  rec.lang = lang
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 1

  let text = ''
  let settle: (s: string) => void
  const done = new Promise<string>(res => { settle = res })

  rec.onresult = e => {
    // Берём всю ленту результатов целиком: interim-куски по мере речи
    // заменяются финальными, и последняя картинка — самая полная.
    text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0]?.transcript ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  rec.onerror = () => { /* onend придёт следом и отдаст то, что успели */ }
  rec.onend = () => settle(text)

  try { rec.start() } catch { return null }

  return {
    done,
    stop: () => { try { rec.stop() } catch { /* уже закрыта */ } },
    cancel: () => {
      text = ''
      try { rec.abort() } catch { /* уже закрыта */ }
    },
  }
}

/** Мягкая нормализация для сверки «сказал ли он эталон»: регистр, пунктуация. */
export function asrNormalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * Сверка услышанного с эталоном. Одна на два места: подсказку в шэдоуинге и
 * вердикт устного задания домашки.
 *
 * ЧТО СРАВНИВАЕТСЯ. Слова, приведённые asrNormalize: регистр и пунктуация не в
 * счёт. Распознавалка не ставит запятых и пишет числа то цифрами, то словами —
 * придираться к этому значит наказывать за чужую особенность.
 *
 * ЯЗЫКИ БЕЗ ПРОБЕЛОВ. В японском и китайском эталон — сплошная строка, и
 * разбор по словам выродился бы в один токен: любое расхождение в одном знаке
 * давало бы «не совпало ни в чём». Там, где пробелов нет ни с одной стороны,
 * сверка идёт склеенными строками.
 *
 * СТРОГОСТЬ ВЫБИРАЕТ ВЫЗЫВАЮЩИЙ. `matched` — полное совпадение, слово в слово
 * и в том же порядке. `missing` пуст — эталон прозвучал целиком, но говорящий
 * мог добавить своего («ну», «эээ», повтор). Для вердикта домашки годится
 * второе: распознавалка дописывает лишнее чаще, чем ученик ошибается.
 */
export interface HeardCompare {
  /** Слова эталона. */
  want: string[]
  /** Слова, которые услышала распознавалка. */
  got: string[]
  /** Слово в слово и в том же порядке. */
  matched: boolean
  /** Слова эталона, которых не прозвучало. */
  missing: string[]
  /** Быстрый ответ на «это слово вообще ждали?» — для подсветки. */
  wanted: Set<string>
}

export function compareHeard(heard: string, target: string): HeardCompare {
  const want = asrNormalize(target).split(' ').filter(Boolean)
  const got = asrNormalize(heard).split(' ').filter(Boolean)

  // Письмо без пробелов: сравниваем склейку, чтобы «один токен против одного
  // токена» не превращал любую мелочь в полное расхождение.
  if (want.length <= 1 && got.length <= 1) {
    const a = want.join('')
    const b = got.join('')
    const same = a.length > 0 && a === b
    return {
      want, got, matched: same,
      missing: same || !a ? [] : want,
      wanted: new Set(want),
    }
  }

  const gotSet = new Set(got)
  return {
    want, got,
    matched: want.length === got.length && want.every((w, i) => w === got[i]),
    missing: want.filter(w => !gotSet.has(w)),
    wanted: new Set(want),
  }
}

/** Прозвучал ли эталон целиком. Лишнее сказанное ошибкой не считается. */
export function heardCovers(heard: string, target: string): boolean {
  if (!heard.trim() || !target.trim()) return false
  const cmp = compareHeard(heard, target)
  return cmp.want.length > 0 && cmp.missing.length === 0
}
