import { useRef } from 'react'

/**
 * Ответ решателя, переживающий два тапа в одном рендере.
 *
 * ЗАЧЕМ. Решатель держит ответ в пропсе и отдаёт новый через onChange. Между
 * двумя быстрыми тапами рендера может не случиться: второй обработчик считает
 * следующий ответ из ЕЩЁ НЕ ОБНОВИВШЕГОСЯ пропса и затирает первый тап — на
 * сборке слова из плиток это выглядит так, что из пяти нажатий доезжает одно.
 * Функциональный setState у родителя не спасает: затирание происходит раньше,
 * при вычислении `next` внутри обработчика.
 *
 * ЛЕЧЕНИЕ. Свой последний ответ живёт в ref и считается текущим, пока пропс его
 * не догонит. Пришёл ответ со стороны (перезагрузка страницы, сброс задания,
 * переход к другому вопросу) — ref отпускается, и правда снова у пропса.
 *
 * Обработчик ОБЯЗАН брать базу из возвращённого `current` (он читается на месте
 * вызова), а не из замыкания рендера, — иначе лечение бессмысленно.
 *
 * Тот же приём руками написан в MatchingSolver (там ответ — массив индексов, и
 * компонент появился раньше этого хука). Ловится только прогоном тапов подряд в
 * одном кадре — вручную мышью не воспроизводится.
 */
export function useOwnAnswer<T>(
  value: T,
  onChange: (next: T) => void,
  /** Ключ сравнения: по нему видно, что пропс догнал наш ответ. */
  serialize: (v: T) => string,
): readonly [T, (next: T) => void] {
  // Обёртка, а не голое значение: сам ответ бывает undefined («ещё не отвечал»),
  // и отличить «своего ответа нет» от «мой ответ — undefined» иначе нечем.
  const own = useRef<{ v: T } | null>(null)
  const incoming = serialize(value)
  const seen = useRef(incoming)
  if (seen.current !== incoming) { seen.current = incoming; own.current = null }

  const current = own.current ? own.current.v : value
  const emit = (next: T) => {
    own.current = { v: next }
    seen.current = serialize(next)
    onChange(next)
  }
  return [current, emit] as const
}

/** Ответ-строка — самый частый случай (сборки, набор, обводка). */
export function useOwnString(
  value: string | undefined,
  onChange: (next: string) => void,
): readonly [string, (next: string) => void] {
  const [current, emit] = useOwnAnswer(value ?? '', onChange, v => v)
  return [current, emit]
}
