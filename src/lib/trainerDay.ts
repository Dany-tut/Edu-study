// ─────────────────────────────────────────────────────────────────────────────
// Дневник тренажёра: время за экраном и ответы по карточкам, по дням
//
// ЗАЧЕМ. Виджет прогресса умел считать только банк ЕГЭ: «решено 0 из 0» и
// «начни решать задания» — всё, что он мог сказать человеку, который сорок
// минут гонял корейские карточки. Пройденная карточка заданием банка не
// является, а время в тренажёре не считал вообще никто, хотя именно оно —
// главное, что ученик хочет увидеть: сколько я сегодня позанимался.
//
// ЧТО СЧИТАЕТСЯ ВРЕМЕНЕМ. Только активные секунды: вкладка на экране и с
// последнего касания/клавиши прошло меньше IDLE_MS. Оставленная открытой
// страница не должна к вечеру показать «сегодня 6 часов» — такой счётчик
// врёт и обесценивает честные десять минут.
//
// ПОЧЕМУ localStorage. Ровно та же причина, что у результатов по материалам
// (lib/trainerProgress.ts): это тренировка для себя, учитель её не видит и
// оценка из неё не растёт. Заводить таблицу с RLS ради строчки «12 мин»
// дороже, чем она стоит. Цена принята: на другом устройстве счётчик свой.
// Когда время понадобится учителю — здесь появится тот же интерфейс поверх
// таблицы (student_id, day, subject, ms, right, wrong), вызовы не изменятся.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'trainer-day-v1'

/** Сколько дней держим. Недели хватает на «за неделю», дальше — мусор в LS. */
const KEEP_DAYS = 14

export interface DayStat {
  /** Активные миллисекунды в тренажёре. */
  ms: number
  /** Карточек отвечено «знаю» / верно. */
  right: number
  /** Карточек отвечено «не знаю» / неверно. */
  wrong: number
}

const EMPTY: DayStat = { ms: 0, right: 0, wrong: 0 }

/** day (YYYY-MM-DD) → subject → счётчики. */
type Store = Record<string, Record<string, DayStat>>

export function dayKey(d = new Date()): string {
  // Локальная дата, а не ISO-UTC: занятие в 2 часа ночи по Москве принадлежит
  // ночи ученика, а не вчерашнему дню по Гринвичу.
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function write(s: Store): void {
  // Обрезаем хвост здесь, а не по расписанию: другого места, где мы вообще
  // трогаем это хранилище, нет.
  const days = Object.keys(s).sort()
  while (days.length > KEEP_DAYS) delete s[days.shift()!]
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* приватный режим */ }
}

function sum(a: DayStat, b: DayStat): DayStat {
  return { ms: a.ms + b.ms, right: a.right + b.right, wrong: a.wrong + b.wrong }
}

/** Итог дня. Без предмета — по всем предметам сразу. */
export function statOf(day: string, subject?: string): DayStat {
  const bySubject = read()[day]
  if (!bySubject) return EMPTY
  if (subject) return bySubject[subject] ?? EMPTY
  return Object.values(bySubject).reduce(sum, EMPTY)
}

/** Итог сегодняшнего дня. */
export function todayStat(subject?: string): DayStat {
  return statOf(dayKey(), subject)
}

/** Итог за последние 7 дней, включая сегодня. */
export function weekStat(subject?: string): DayStat {
  const now = new Date()
  let out = EMPTY
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out = sum(out, statOf(dayKey(d), subject))
  }
  return out
}

/** Сколько дней подряд (включая сегодня) в тренажёре была хоть минута. */
export function streakDays(subject?: string): number {
  const now = new Date()
  let n = 0
  for (let i = 0; i < KEEP_DAYS; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    // Сегодняшний ноль серию не рвёт: день ещё не кончился.
    const has = statOf(dayKey(d), subject).ms >= 60_000
    if (has) n++
    else if (i > 0) break
  }
  return n
}

function bump(subject: string, patch: (s: DayStat) => DayStat): DayStat {
  const store = read()
  const day = dayKey()
  const bySubject = store[day] ?? (store[day] = {})
  const next = patch(bySubject[subject] ?? EMPTY)
  bySubject[subject] = next
  write(store)
  return next
}

/** Прибавить активное время. Возвращает новый итог дня по предмету. */
export function addTime(subject: string, ms: number): DayStat {
  if (ms <= 0) return todayStat(subject)
  return bump(subject, s => ({ ...s, ms: s.ms + ms }))
}

/** Записать ответ по карточке. Возвращает новый итог дня по предмету. */
export function addVerdict(subject: string, correct: boolean): DayStat {
  return bump(subject, s => correct ? { ...s, right: s.right + 1 } : { ...s, wrong: s.wrong + 1 })
}

/**
 * Дневная цель — то, против чего заполняется колечко виджета.
 *
 * Двадцать минут, а не час: цель должна быть достижимой в будний вечер, иначе
 * кольцо всегда пустое и перестаёт что-либо значить. Перевыполнение не
 * наказывается — кольцо просто упирается в сто процентов.
 */
export const GOAL_MS = 20 * 60_000

// ── Формат ───────────────────────────────────────────────────────────────────

/**
 * Человеческая длительность: «7 мин», «1 ч 12 мин».
 *
 * Секунды не показываем нигде: счётчик, тикающий раз в секунду, превращает
 * занятие в секундомер — ученик начинает смотреть на него, а не на карточки.
 */
export function formatDur(ms: number): string {
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'меньше минуты'
  if (min < 60) return `${min} мин`
  const h = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${h} ч ${rest} мин` : `${h} ч`
}

/** Та же длительность в два-три знака — для кружка и мини-пилюли: «12м», «1ч». */
export function formatShort(ms: number): string {
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}м`
  const h = Math.floor(min / 60)
  const rest = min % 60
  return rest ? `${h}ч${String(rest).padStart(2, '0')}` : `${h}ч`
}
