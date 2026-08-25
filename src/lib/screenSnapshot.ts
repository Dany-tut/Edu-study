// ─────────────────────────────────────────────────────────────────────────────
// Снимок экрана — статичная копия того, что человек сейчас видит.
//
// Нужен свайпу назад (lib/useSwipeBack.ts): под уезжающей страницей должен
// лежать предыдущий экран, а в дереве его уже нет — при переходе он
// размонтировался. Уходящая страница при этом ЖИВАЯ (её двигает сам жест),
// снимок нужен только для нижнего слоя.
//
// Поэтому снимок — клон DOM, а не картинка: он рисуется теми же стилями, что и
// оригинал, живёт в обеих темах и стоит доли миллисекунды (никакого html2canvas).
// Клонируются ВСЕ дети body, а не только #root: модалки, шторки и подсказки
// живут в порталах рядом с корнем, и без них снимок «терял» бы половину экрана.
//
// Чего клон не умеет и что мы чиним руками:
//   • прокрутку внутренних контейнеров — переносим через data-атрибут;
//   • введённый текст (cloneNode копирует разметку, а не свойство value);
//   • iframe/video/canvas — заменяем заглушкой: YouTube в клоне перезагрузился
//     бы и заиграл второй раз.
// ─────────────────────────────────────────────────────────────────────────────

type Layer = {
  el: HTMLElement
  /** Корень приложения: только его сдвигаем на прокрутку окна. */
  root: boolean
}

export type Snapshot = {
  layers: Layer[]
  /** Прокрутка окна в момент съёмки. */
  scrollY: number
}

/** Атрибут-метка нашего слоя: такие узлы в снимок не попадают. */
export const STAGE_ATTR = 'data-swipe-stage'

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT'])
const SCROLL_ATTR = 'data-swipe-scroll'

// Прокручиваемые контейнеры ищем не обходом всего дерева (это тысячи узлов и
// принудительный пересчёт вёрстки на каждом снимке), а по факту: кто хоть раз
// прокручивался, тот и попадает в список.
const scrolledEls = new Set<Element>()
let wired = false

function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  // capture:true — событие scroll не всплывает, ловим его на пути вниз.
  window.addEventListener('scroll', e => {
    const el = e.target
    if (el instanceof Element) scrolledEls.add(el)
  }, { capture: true, passive: true })
}

/**
 * Обезвредить клон: убрать id (иначе в документе два #root), выбросить скрытые
 * ветки и подменить то, что в копии всё равно не нарисуется, а ожить может
 * (iframe с YouTube в клоне загрузился бы заново и заиграл вторым голосом).
 *
 * Размеры заглушек берём с ОРИГИНАЛА: у отсоединённого клона нет вёрстки, и
 * getBoundingClientRect на нём вернул бы 0×0 — плеер схлопнулся бы в точку.
 */
const DEAD_Q = 'iframe, video, canvas'

function sterilize(src: HTMLElement, clone: HTMLElement) {
  const from = src.querySelectorAll(DEAD_Q)
  const to = clone.querySelectorAll(DEAD_Q)
  for (let i = 0; i < from.length && i < to.length; i++) {
    const box = from[i].getBoundingClientRect()
    const stub = document.createElement('div')
    stub.style.cssText = [
      `width:${Math.round(box.width)}px`,
      `height:${Math.round(box.height)}px`,
      'border-radius:inherit',
      'background:var(--color-bg-3, rgba(128,128,128,0.12))',
    ].join(';')
    to[i].replaceWith(stub)
  }
  // Скрытые ветки — половина веса снимка: на телефоне в дереве лежит ещё и
  // целиком настольная раскладка под display:none (см. память про две
  // раскладки в DOM). Она не видна, но клонируется и ест память.
  clone.querySelectorAll('[style*="display:none"], [style*="display: none"], [hidden]')
    .forEach(el => el.remove())
  // Сам узел тоже: querySelectorAll ищет ТОЛЬКО среди потомков, и корень
  // снимка уносил с собой id="root". Клон ложится в body первым ребёнком, и
  // document.getElementById('root') начинал отдавать снимок вместо живой
  // страницы — со всеми вытекающими (заморозка уезжала не туда).
  clone.removeAttribute('id')
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'))
}

/** Перенести введённое: cloneNode копирует разметку, а не свойство value. */
function copyFieldValues(src: HTMLElement, clone: HTMLElement) {
  const q = 'input, textarea, select'
  const from = src.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(q)
  const to = clone.querySelectorAll<HTMLElement>(q)
  // Клон — точная копия, порядок обхода совпадает.
  for (let i = 0; i < from.length && i < to.length; i++) {
    const a = from[i]
    const b = to[i]
    if (a instanceof HTMLInputElement && (a.type === 'checkbox' || a.type === 'radio')) {
      if (a.checked) b.setAttribute('checked', '')
      else b.removeAttribute('checked')
    } else if (a instanceof HTMLTextAreaElement) {
      b.textContent = a.value
    } else if (a instanceof HTMLSelectElement) {
      b.querySelectorAll('option').forEach(o => {
        if (o.value === a.value) o.setAttribute('selected', '')
        else o.removeAttribute('selected')
      })
    } else {
      b.setAttribute('value', (a as HTMLInputElement).value)
    }
  }
}

/** Снять то, что сейчас на экране. null — если снимать нечего. */
export function captureScreen(): Snapshot | null {
  if (typeof document === 'undefined' || !document.body) return null
  wire()

  const sources: HTMLElement[] = []
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement)) continue
    if (SKIP_TAGS.has(el.tagName)) continue
    if (el.hasAttribute(STAGE_ATTR)) continue
    sources.push(el)
  }
  if (sources.length === 0) return null

  // Прокрутка уезжает в клон атрибутом: так не нужно искать соответствие
  // «оригинал → копия» обходом обоих деревьев.
  const marked: Element[] = []
  for (const el of Array.from(scrolledEls)) {
    if (!el.isConnected) { scrolledEls.delete(el); continue }
    const top = Math.round(el.scrollTop)
    if (top <= 0) continue
    el.setAttribute(SCROLL_ATTR, String(top))
    marked.push(el)
  }

  const layers: Layer[] = sources.map(el => {
    const clone = el.cloneNode(true) as HTMLElement
    copyFieldValues(el, clone)
    // Корень помечаем ДО стерилизации: она снимает все id.
    const root = el.id === 'root'
    sterilize(el, clone)
    return { el: clone, root }
  })

  marked.forEach(el => el.removeAttribute(SCROLL_ATTR))

  return { layers, scrollY: Math.round(window.scrollY) }
}

/**
 * Разложить снимок внутри готового слоя.
 *
 * Слой обязан быть с собственным transform: тогда `position:fixed` внутри
 * клона считается от него, а не от окна, — и нижний док едет вместе со
 * страницей, вместо того чтобы прилипнуть к низу документа.
 *
 * Узлы ПЕРЕНОСЯТСЯ, а не копируются: копия целого экрана стоит десятки
 * миллисекунд, и платить их в момент, когда палец уже пошёл, нельзя. Снимок от
 * переноса не портится — он держит ссылки на те же узлы, и после снятия слоя
 * их можно разложить снова.
 */
export function paintSnapshot(layer: HTMLElement, snap: Snapshot | null) {
  if (!snap) return
  for (const { el, root } of snap.layers) {
    // Корень прокручен вместе с окном — сдвигаем его вверх, чтобы в кадре
    // осталось ровно то, что человек видел. Слои-порталы не трогаем: они и так
    // позиционированы от окна.
    if (root && snap.scrollY > 0) el.style.marginTop = `${-snap.scrollY}px`
    layer.appendChild(el)
  }
  // scrollTop выставляется только после вставки в документ — до этого у узла
  // нет вёрстки и присваивание молча теряется. Атрибут НЕ снимаем: снимок
  // могут разложить ещё раз, и прокрутку придётся вернуть заново.
  layer.querySelectorAll<HTMLElement>(`[${SCROLL_ATTR}]`).forEach(el => {
    el.scrollTop = Number(el.getAttribute(SCROLL_ATTR)) || 0
  })
}
