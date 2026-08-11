import { useEffect, useState } from 'react'
import { ChevronDown, Mic } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { hasVoiceFor, listVoices, preferredVoice, setPreferredVoice, speak } from '../../lib/speech'
import { RailList } from './TrainerShell'

// Выбор голоса — под кнопкой «Послушать».
//
// ЗАЧЕМ ЭТО УЧЕНИКУ. Автовыбор угадывает диктора по имени, а имена в системах
// разные: где-то «Саманта», где-то «Google US English», где-то ни того, ни
// другого. Промах слышно сразу, а починить его было нечем — на весь язык
// оставался один голос, назначенный вслепую. Разница между дикторами на слух
// больше, чем всё остальное в озвучке вместе взятое, поэтому последнее слово
// оставляем уху ученика.
//
// ГДЕ ЖИВЁТ ВЫБОР. В localStorage на язык (см. lib/speech.ts), не в базе: голос
// зависит от того, что установлено В ЭТОЙ системе, и на другом устройстве имя
// из настроек ничего не значит.
//
// ПОЧЕМУ СРАЗУ ЗВУЧИТ. Список имён ничего не говорит на слух: «Ральф» и
// «Саманта» одинаково ничего не значат, пока не услышишь. Поэтому выбор строки
// не просто сохраняется, а тут же читает короткую фразу на этом языке.

/** Пробная фраза: короткая, ходовая и на изучаемом языке. */
const SAMPLE: Record<string, string> = {
  en: 'This is how the text will sound.',
  ru: 'Вот так будет звучать текст.',
  ko: '이렇게 들립니다.',
  ja: 'このように聞こえます。',
  pt: 'É assim que o texto vai soar.',
  es: 'Así va a sonar el texto.',
  fr: 'Voilà comment le texte va sonner.',
  de: 'So wird der Text klingen.',
  it: 'Ecco come suonerà il testo.',
  zh: '这就是朗读的声音。',
}

export default function VoicePicker({ lang, accent, soft }: {
  lang: string
  accent: string
  soft: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(() => preferredVoice(lang))
  // Список голосов в Chrome приходит асинхронно: на первом рендере он пуст, и
  // без подписки на voiceschanged выбор так и остался бы пустым до перезагрузки.
  const [ready, setReady] = useState(0)
  // Полный список системных голосов: там, где дикторов несколько, он не нужен,
  // но если ни один из них не устраивает — пусть будет чем перебрать.
  const [all, setAll] = useState(false)

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const bump = () => setReady(n => n + 1)
    speechSynthesis.addEventListener?.('voiceschanged', bump)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', bump)
  }, [])

  useEffect(() => { setPicked(preferredVoice(lang)) }, [lang])

  const voices = listVoices(lang, all)
  const total = listVoices(lang, true).length
  void ready // список берём заново на каждый рендер, событие только будит его

  if (!hasVoiceFor(lang)) {
    return (
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-3)', marginTop: 10 }}>
        {t('В системе нет голоса для этого языка — браузеру нечем прочитать текст. Голос ставится в настройках системы: на Mac это «Универсальный доступ → Устная речь», на Windows — «Время и язык → Речь».')}
      </div>
    )
  }

  // Один голос на язык — выбирать не из чего, строка была бы шумом.
  if (voices.length < 2) return null

  const current = voices.find(v => v.name === picked)
  const items = [
    { id: '', label: t('Автоматически'), hint: t('лучший из найденных') },
    ...voices.map(v => ({ id: v.name, label: v.name, hint: v.lang })),
  ]

  function choose(name: string) {
    setPicked(name)
    setPreferredVoice(lang, name)
    // Имя ничего не говорит на слух — сразу читаем пробную фразу выбранным.
    speak(SAMPLE[lang.split('-')[0]] ?? SAMPLE.en, { lang, voiceName: name })
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, width: '100%',
          padding: '7px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
          border: 'none', background: open ? soft : 'transparent',
          color: open ? accent : 'var(--color-text-2)', fontSize: 12.5, fontWeight: 600,
        }}
      >
        <Mic size={14} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('Голос')}: {current?.name ?? t('автоматически')}
        </span>
        <ChevronDown
          size={14}
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
        />
      </button>
      {open && (
        <div style={{ marginTop: 4 }}>
          <RailList items={items} value={picked} onChange={choose} accent={accent} soft={soft} />
          {!all && total > voices.length && (
            <button
              onClick={() => setAll(true)}
              style={{
                marginTop: 2, padding: '6px 9px', width: '100%', textAlign: 'left',
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)',
              }}
            >
              {t('Показать все голоса системы')} · {total}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
