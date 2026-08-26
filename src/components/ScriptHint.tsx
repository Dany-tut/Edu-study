// ─────────────────────────────────────────────────────────────────────────────
// Транскрипция и озвучка прямо у варианта ответа
// (docs/MEMORY_STANDARD.md — Р14, §1.9, стадии письма Р6)
//
// ЗАЧЕМ. Задание «как сказать „до свидания“?» показывало четыре строки хангыля
// и всё. Ученик, который читать ещё не умеет (а первые уроки — ровно про это),
// выбирал из четырёх картинок: он не мог ни прочесть варианты, ни услышать их.
// Промах здесь ничего не диагностирует — он говорит только о том, что чтение не
// поставлено, а это и так известно.
//
// ЧТО ДЕЛАЕТ. Под текстом на незнакомом письме подписывает кириллическую
// транскрипцию (lib/translit.ts) и даёт кнопку озвучки (lib/speech.ts). Слово
// становится доступно тремя каналами сразу — знак, звук, транскрипция, — а это
// и есть двойное кодирование, из-за которого слово со звуком и образом
// запоминается лучше слова, прочитанного глазами (Paivio 1971).
//
// ПОЧЕМУ НЕ ВЕЗДЕ. Латиница подписи не получает: `transcribe` возвращает для
// неё пустую строку, и хинт не рисуется вовсе. Английское «I have worked» и без
// нас читается, а подпись под каждым вариантом превратила бы выбор в простыню.
//
// ПОЧЕМУ SPAN, А НЕ BUTTON. Хинт живёт ВНУТРИ кнопки-варианта, а кнопка внутри
// кнопки — невалидная разметка, и браузеры разбирают её как попало. Поэтому
// здесь span с ролью кнопки, который гасит всплытие: тап по динамику озвучивает
// вариант и НЕ выбирает его.
// ─────────────────────────────────────────────────────────────────────────────

import { Volume2 } from 'lucide-react'
import { useT } from '../lib/i18n'
import { transcribe } from '../lib/translit'
import { speak, stopSpeech, hasVoiceFor } from '../lib/speech'

/** Незнакомое письмо: хангыль, кана, иероглифы. */
export const foreignScript = (text: string) => /[぀-ヿ가-힯一-鿿]/.test(text)

export default function ScriptHint({
  text,
  lang,
  align = 'left',
}: {
  text: string
  /** Язык задания (`question.lang`): без него ни транскрипции, ни голоса. */
  lang?: string
  align?: 'left' | 'right'
}) {
  // Хук — до ранних возвратов ниже.
  const t = useT()
  const clean = (text ?? '').trim()
  if (!clean || !lang) return null

  // Часть на изучаемом языке: скобки с чтением («지도 (чидо)») озвучивать не
  // надо — голос читал бы кириллицу вслух по-корейски.
  const spoken = clean.replace(/\((.*?)\)/g, ' ').replace(/\s+/g, ' ').trim() || clean
  // Своя транскрипция нужна только там, где её ещё нет: часть заданий печатает
  // чтение прямо в тексте плитки, и вторая подпись под ней читается как ошибка
  // («чидо (чидо)»).
  const written = /[а-яё]/i.test(clean)
  const reading = written ? '' : transcribe(spoken, lang)
  const voice = hasVoiceFor(lang)
  // Нечего сказать и нечего подписать — не занимаем строку.
  if (!reading && !(voice && foreignScript(spoken))) return null

  return (
    <span
      className="flex items-center"
      style={{
        gap: 6, marginTop: 3,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {reading && (
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-muted)', lineHeight: 1.3 }}>
          {reading}
        </span>
      )}
      {voice && (
        <span
          role="button"
          tabIndex={-1}
          aria-label={t('Озвучить')}
          onClick={e => {
            // Тап по динамику — это прослушать, а не ответить.
            e.preventDefault()
            e.stopPropagation()
            stopSpeech()
            speak(spoken, { lang })
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 8, flexShrink: 0,
            color: 'var(--color-accent)', background: 'var(--color-purple-soft)',
            cursor: 'pointer',
          }}
        >
          <Volume2 size={13} />
        </span>
      )}
    </span>
  )
}
