// ─────────────────────────────────────────────────────────────────────────────
// Результаты по материалам языкового тренажёра
//
// ЗАЧЕМ. Списку текстов и записей нужен статус: не читал / читал / пройдено и
// сколько вопросов взято. Без него библиотека из четырнадцати текстов через
// неделю превращается в «что-то из этого я уже открывал», и ученик перечитывает
// первый, а до последнего не доходит никогда.
//
// ПОЧЕМУ localStorage, А НЕ ТАБЛИЦА. Это результат тренировки «для себя», а не
// сданная работа: учитель его не видит, оценка из него не растёт, на него никто
// не ссылается. Заводить ради галочки таблицу с RLS и миграцией — это неделя
// работы и вечная обязанность её поддерживать ради строчки «2 ⁄ 3» в углу
// карточки. Цена такого решения известна и принята: результат живёт в браузере,
// на другом устройстве список снова чистый.
//
// КОГДА ЭТО ПРИДЁТСЯ ПЕРЕДЕЛАТЬ. Как только результат понадобится учителю
// («кто из группы прошёл текст») или начнёт влиять на оценку. Тогда — таблица
// вида (student_id, kind, item_id, score, total, at) и тот же интерфейс поверх
// неё; вызовы менять не придётся, они уже асинхронно-совместимы по форме.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'lang-trainer-progress-v1'

export type MaterialKind = 'reading' | 'listening' | 'nest' | 'ending' | 'root' | 'number' | 'grammar'

export interface MaterialResult {
  /** Сколько вопросов взято. */
  score: number
  /** Сколько было всего. */
  total: number
  /** ISO — когда прошёл в последний раз. */
  at: string
}

type Store = Record<string, MaterialResult>

/** Ключ записи. Вид в ключе, потому что id текста и id записи могут совпасть. */
const k = (kind: MaterialKind, id: string) => `${kind}:${id}`

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    // Приватный режим или битый JSON — работаем как будто результатов нет.
    return {}
  }
}

function write(s: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* не критично */ }
}

/** Все результаты разом — список читает их один раз на отрисовку. */
export function allResults(): Store {
  return read()
}

/** Результат по одному материалу. */
export function materialResult(kind: MaterialKind, id: string): MaterialResult | undefined {
  return read()[k(kind, id)]
}

/**
 * Записать результат.
 *
 * Лучший результат не сохраняется намеренно: «2 из 3 неделю назад» полезнее,
 * чем «3 из 3 когда-то» — по первому видно, что тему пора повторить, а второе
 * успокаивает ложно. Перепрошёл — значит, актуален последний ответ.
 */
export function saveResult(kind: MaterialKind, id: string, score: number, total: number): void {
  const s = read()
  s[k(kind, id)] = { score, total, at: new Date().toISOString() }
  write(s)
}

/** Статус материала для фильтра списка. */
export type MaterialStatus = 'new' | 'done'

export function statusOf(kind: MaterialKind, id: string, store: Store): MaterialStatus {
  return store[k(kind, id)] ? 'done' : 'new'
}

/** Результат из уже прочитанного хранилища — чтобы не читать localStorage на каждую карточку. */
export function resultFrom(kind: MaterialKind, id: string, store: Store): MaterialResult | undefined {
  return store[k(kind, id)]
}
