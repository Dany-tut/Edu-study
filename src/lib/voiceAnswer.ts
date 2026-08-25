// ─────────────────────────────────────────────────────────────────────────────
// Ответ на устное задание (speaking)
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Устный ответ перестал быть одним лишь файлом. Раньше
// в ответе лежал путь записи в бакете — и всё, что можно было о нём сказать,
// говорил преподаватель. Теперь рядом с записью живёт РАСШИФРОВКА: что услышал
// браузер, пока ученик говорил (см. lib/asr.ts). По ней задание проверяет себя
// само — там, где у него есть эталон.
//
// ФОРМАТ. `p=<путь>;h=<расшифровка>;n=<попыток>`, текст — encodeURIComponent.
// Тот же приём, что у просмотра видео (lib/videoAnswer.ts): одна строка,
// читаемая в логах и в БД, переживающая JSON-сериализацию домашки.
//
// СТАРЫЕ ОТВЕТЫ ОСТАЮТСЯ ВЕРНЫМИ. Всё, что записано до этого кодека, — голый
// путь `voice/<uid>/<id>.webm`. Он разбирается как ответ без расшифровки, и
// витрина преподавателя (BasicAnswersList) продолжает получать в `answer`
// ровно путь, а не строку кодека: плеер там играет `row.answer` напрямую.
//
// ПОЧЕМУ ПОПЫТКИ, А НЕ «ВЕРНО/НЕВЕРНО». Вердикт по говорению не жёсткий:
// распознавалка возвращает текст, а не оценку произношения, и не расслышать
// она может исправно сказанное. Поэтому переспрашивать можно сколько угодно,
// а преподавателю уходит не «неверно», а «сошлось с третьей попытки» — это
// про беглость, и это единственное, что здесь машина знает наверняка.
// ─────────────────────────────────────────────────────────────────────────────

export interface VoiceAnswer {
  /** Путь записи в бакете task-media. Пусто — записи нет. */
  path: string
  /** Что услышала распознавалка. Пусто — её в этом браузере нет либо молчание. */
  heard: string
  /** Сколько раз ученик записывал эту фразу. 0 — счётчик не вёлся (старый ответ). */
  attempts: number
}

export const emptyVoiceAnswer = (): VoiceAnswer => ({ path: '', heard: '', attempts: 0 })

export function formatVoiceAnswer(v: VoiceAnswer): string {
  // Без расшифровки и без счётчика ответ остаётся голым путём — той самой
  // строкой, что писалась раньше. Так браузер без распознавалки не создаёт
  // в базе новой формы данных: там, где ничего не изменилось, и в БД по-прежнему
  // лежит путь.
  if (!v.heard && v.attempts <= 1) return v.path
  const parts = [`p=${encodeURIComponent(v.path)}`]
  if (v.heard) parts.push(`h=${encodeURIComponent(v.heard)}`)
  if (v.attempts > 0) parts.push(`n=${Math.round(v.attempts)}`)
  return parts.join(';')
}

export function parseVoiceAnswer(raw: string | undefined | null): VoiceAnswer {
  const out = emptyVoiceAnswer()
  if (!raw) return out

  // Голый путь: всё, что записано до кодека, плюс ответы из браузеров без
  // распознавалки. Признак — отсутствие ведущего `p=`.
  if (!raw.startsWith('p=')) {
    out.path = raw
    return out
  }

  for (const part of raw.split(';')) {
    const at = part.indexOf('=')
    if (at < 0) continue
    const key = part.slice(0, at)
    const value = part.slice(at + 1)
    try {
      if (key === 'p') out.path = decodeURIComponent(value)
      else if (key === 'h') out.heard = decodeURIComponent(value)
      else if (key === 'n') {
        const n = Number(value)
        if (Number.isFinite(n)) out.attempts = Math.max(0, Math.round(n))
      }
    } catch {
      /* битый процент-эскейп — поле просто остаётся пустым */
    }
  }
  return out
}

/** Путь записи из ответа любой формы — для плеера у преподавателя. */
export function voicePath(raw: string | undefined | null): string {
  return parseVoiceAnswer(raw).path
}
