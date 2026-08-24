import { useRef } from 'react'

/**
 * Ответ решателя, переживающий несколько тапов в одном рендере.
 *
 * ЗАЧЕМ. Решатель держит ответ в пропсе и отдаёт новый через onChange. Между
 * двумя быстрыми тапами рендера может не случиться: второй обработчик считает
 * следующий ответ из ЕЩЁ НЕ ОБНОВИВШЕГОСЯ пропса и затирает первый тап — на
 * сборке слова из плиток это выглядит так, что из шести нажатий доезжает одно.
 * Функциональный setState у родителя не спасает: затирание происходит раньше,
 * при вычислении `next` внутри обработчика.
 *
 * ЛЕЧЕНИЕ. Свой последний ответ живёт в ref и считается текущим, пока пропс его
 * не догонит. Пришёл ответ со стороны (перезагрузка, сброс задания, переход к
 * другому вопросу) — ref отпускается, и правда снова у пропса.
 *
 * ПОЧЕМУ emit ОБЯЗАН БЫТЬ ФУНКЦИОНАЛЬНЫМ. Значение, возвращённое хуком, — это
 * снимок рендера, и обработчик, считающий из него, лечения не получает вовсе:
 * второй тап в том же рендере снова возьмёт устаревшую базу. Поэтому новый
 * ответ считается ТОЛЬКО из аргумента `prev`, который читается в момент вызова.
 *
 * Тот же приём руками написан в MatchingSolver (он появился раньше хука).
 * Ловится только прогоном тапов подряд в одном кадре — вручную мышью нет.
 */
export function useOwnAnswer<T>(
  value: T,
  onChange: (next: T) => void,
  /** Ключ сравнения: по нему видно, что пропс догнал наш ответ. */
  serialize: (v: T) => string,
): readonly [T, (update: (prev: T) => T) => void] {
  // Обёртка, а не голое значение: сам ответ бывает undefined («ещё не отвечал»),
  // и отличить «своего ответа нет» от «мой ответ — undefined» иначе нечем.
  const own = useRef<{ v: T } | null>(null)
  const incoming = serialize(value)
  const seen = useRef(incoming)
  if (seen.current !== incoming) { seen.current = incoming; own.current = null }

  const current = own.current ? own.current.v : value
  // Снимок последнего рендера — база для первого тапа, пока своего ответа нет.
  const fromRender = useRef(current)
  fromRender.current = current

  const emit = (update: (prev: T) => T) => {
    const prev = own.current ? own.current.v : fromRender.current
    const next = update(prev)
    own.current = { v: next }
    seen.current = serialize(next)
    onChange(next)
  }
  return [current, emit] as const
}

/** Ответ-строка — самый частый случай (сборки, набор по буквам). */
export function useOwnString(
  value: string | undefined,
  onChange: (next: string) => void,
): readonly [string, (update: (prev: string) => string) => void] {
  return useOwnAnswer(value ?? '', onChange, v => v)
}
