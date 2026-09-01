import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Липкая колонка не подпрыгивает в конце прокрутки
//
// ЗАЧЕМ. `position: sticky` ездит только внутри СОДЕРЖИМОГО своего ряда: браузер
// не даёт низу прилипшей карточки выйти за нижнюю границу этого содержимого.
// А прокрутка обычно длиннее ряда — ниже него лежат нижние отступы кабинета и
// самой страницы. На последних её пикселях карточку тащит вверх, и левая
// колонка, простоявшая весь скролл на месте, в самом конце уезжает вверх.
//
// В тренажёре это было 88 px (80 — нижний воздух скелета, 32 — нижний отступ
// панели кабинета, минус 24 просвета под рейлом), в учительских панелях —
// от 22 до 48. Хуже того, на короткой выдаче хвост оказывался ЕДИНСТВЕННОЙ
// причиной прокрутки: листать нечего, а колонка всё равно едет.
//
// КАК ЛЕЧИМ. Меряем этот хвост и вешаем на саму липкую колонку отрицательное
// нижнее поле ровно на него. Поле не двигает колонку (она стоит там же и той
// же высоты) — оно удлиняет клетку, внутри которой ей разрешено ездить: низ
// её ПОЛЕВОЙ рамки теперь дотягивается до конца прокрутки, и подпирать
// карточку становится нечем.
//
// ПОЧЕМУ НЕ ПЕРЕНОСИТЬ ОТСТУПЫ ВНУТРЬ КОЛОНКИ СОДЕРЖИМОГО. Так тоже можно
// (ряд станет длиннее ровно на хвост), но чужой нижний отступ — панели
// прокрутки кабинета — скелету не принадлежит: он общий для главной, курсов и
// урока. Пришлось бы либо забрать воздух у соседних экранов, либо всё равно
// мерить остаток. Отрицательное поле лечит любой хвост одним приёмом.
//
// ПОЧЕМУ ХВОСТ СЧИТАЕТСЯ ПО РАЗМЕТКЕ, А НЕ ПО scrollHeight. Разница
// «докуда листается» минус «где кончился ряд» верна только когда странице
// есть что листать; на короткой выдаче scrollHeight упирается в высоту окна и
// хвост выходит завышенным. А завышенный хвост — это новое отрицательное поле,
// от которого ряд снова становится короче: замер и правка гоняли бы друг
// друга по кругу через ResizeObserver. Сумма отступов и того, что стоит ниже,
// от нашего же поля не зависит.
// ─────────────────────────────────────────────────────────────────────────────

const px = (v: string) => parseFloat(v) || 0

/** Хвост и то, за чем следить, чтобы он не устарел. */
type Tail = { tail: number; hosts: Element[]; sibs: Element[] }

/**
 * Мёртвый воздух под рядом: нижние отступы и рамки предков, пока ряд остаётся
 * ПОСЛЕДНИМ в потоке. Считаем до панели прокрутки включительно — её нижний
 * отступ тоже часть прокрутки, — выше не смотрим.
 *
 * СОДЕРЖИМОЕ ПОД РЯДОМ ОБРЫВАЕТ СЧЁТ. Если ниже стоит ещё один блок, граница
 * ряда законна: колонке там и положено остановиться, а не висеть над соседним
 * разделом. Отрицательное поле в этом случае не только не помогло бы, но и
 * подтянуло бы этот блок наверх — под саму колонку.
 */
function measureTail(el: HTMLElement): Tail {
  // Кого пересматривать: разметка кабинета доезжает частями, и ответ на
  // монтировании часто ещё не про то, что человек увидит.
  const hosts: Element[] = []   // где могут появиться/исчезнуть блоки под рядом
  const sibs: Element[] = []    // сами эти блоки: спрятался — считать заново
  const none: Tail = { tail: 0, hosts, sibs }

  const cage = el.parentElement
  if (!cage) return none
  let cs = getComputedStyle(cage)
  // ТОЛЬКО КОЛОНКА В РЯДУ. Отрицательное поле безобидно, пока соседи стоят
  // СБОКУ: оно меняет лишь высоту ряда. В колоночной раскладке тем же полем
  // подтянуло бы наверх всё, что стоит ниже, — там лечить нужно иначе.
  if (!(cs.display.includes('flex') && cs.flexDirection.startsWith('row'))) return none

  let tail = px(cs.paddingBottom) + px(cs.borderBottomWidth)
  let node: HTMLElement = cage
  // Предохранитель: дерево кабинета глубокое, но не бесконечное.
  for (let i = 0; i < 32; i++) {
    const parent = node.parentElement
    if (!parent) break
    hosts.push(parent)
    if (contentBelow(node, sibs)) return { tail: Math.max(0, Math.round(tail)), hosts, sibs }
    const pcs = getComputedStyle(parent)
    tail += px(cs.marginBottom) + px(pcs.paddingBottom) + px(pcs.borderBottomWidth)
    if (/(auto|scroll)/.test(pcs.overflowY)) break
    if (parent === document.documentElement) break
    node = parent
    cs = pcs
  }
  return { tail: Math.max(0, Math.round(tail)), hosts, sibs }
}

/**
 * Стоит ли в потоке ниже узла что-то ещё — хоть строка, хоть карточка.
 * Заодно складывает осмотренных соседей в `sibs`, включая спрятанных: тот, что
 * сейчас `display:none`, завтра развернётся в блок, и ответ станет другим.
 */
function contentBelow(node: HTMLElement, sibs: Element[]): boolean {
  let found = false
  for (let s = node.nextElementSibling; s; s = s.nextElementSibling) {
    sibs.push(s)
    const cs = getComputedStyle(s)
    if (cs.position === 'fixed' || cs.position === 'absolute' || cs.display === 'none') continue
    // Пустые обёртки (порталы шторок и диалогов) высоты не занимают и границей
    // не считаются: иначе любой такой сосед отменял бы лечение.
    if (s.getBoundingClientRect().height >= 1) found = true
  }
  return found
}

const NONE: CSSProperties = {}

/**
 * Стиль для элемента с `position: sticky` — спред кладётся НА НЕГО ЖЕ,
 * не на карточку внутри: клетку задаёт родитель именно липкого узла. И ПОСЛЕ
 * сокращённого `margin`, если он там есть: иначе тот затрёт нижнее поле.
 *
 * @param active Выключатель для узкого экрана: там колонка обычно `static`
 *   (у скелета тренажёра рейл уезжает в шторку), и поле сдвинуло бы соседей.
 * @param base Своё нижнее поле колонки, если оно было (запас под тень и
 *   подобное): хвост прибавляется к нему, а не заменяет его.
 */
export function useStickyLift(ref: RefObject<HTMLElement | null>, active = true, base = 0): CSSProperties {
  const [tail, setTail] = useState(0)

  useLayoutEffect(() => {
    if (!active) { setTail(0); return }
    const el = ref.current
    if (!el) return

    // ОДНОГО ЗАМЕРА НА МОНТИРОВАНИИ МАЛО. Страница кабинета доезжает частями:
    // под рядом стоит заглушка списка, потом она пропадает — и хвост из нуля
    // становится настоящим (в «Материалах» так и было). Наблюдатели смотрят
    // ровно за тем, от чего зависит ответ: за размерами ряда и за появлением,
    // исчезновением и скрытием блоков под ним. Зациклиться не на чем — хвост
    // это отступы, а не высоты, и от нашего же поля он не меняется.
    // Пересчёт откладываем на таймер, а не на кадр: у соседа под рядом может
    // анимироваться стиль, и замер на каждое изменение — это лишний обход
    // отступов кадр за кадром. Именно таймер, а не requestAnimationFrame:
    // в фоновой вкладке кадры не идут вовсе, и колонка осталась бы с хвостом,
    // посчитанным по первому кадру, — вернувшись, человек увидел бы старый
    // прыжок.
    let queued: ReturnType<typeof setTimeout> | null = null
    const later = () => {
      if (queued) return
      queued = setTimeout(() => { queued = null; measure() }, 0)
    }
    const mo = new MutationObserver(later)
    const ro = new ResizeObserver(later)
    const measure = () => {
      const { tail: next, hosts, sibs } = measureTail(el)
      setTail(next)
      mo.disconnect()
      for (const n of hosts) mo.observe(n, { childList: true })
      for (const n of sibs) mo.observe(n, { attributes: true, attributeFilter: ['style', 'class'] })
    }
    measure()
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    // Ресайз окна — отдельно: отступы кабинета зависят от ширины, а размеры
    // самих узлов при этом могут и не измениться.
    window.addEventListener('resize', measure)
    return () => {
      if (queued) clearTimeout(queued)
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, active])

  return tail > 0 || base ? { marginBottom: base - tail } : NONE
}

/** Ближайшая панель прокрутки над элементом; `null` — листается сам документ. */
export function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p
  }
  return null
}
