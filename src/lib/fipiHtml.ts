// Очистка условия из открытого банка ФИПИ перед показом.
//
// ЗАЧЕМ. В HTML банка вместе с условием приходит форма сайта ФИПИ: таблица
// «Ответ: [ ][ ]» с пустыми клетками, текстовое поле, галочки у вариантов и
// обрывки обёрток (</TD></TR><TABLE>…). У нас ответ вводится своим бланком
// (FipiTask), поэтому эти остатки на экране — пустые рамки и «Ответ:» без
// смысла. Варианты «1) … 2) …» оставляем: убираем только галочки у них.
const cache = new Map<string, string>()

const isBlank = (s: string) => s.replace(/[\s ]/g, '') === ''

export function cleanFipiHtml(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return html
  const hit = cache.get(html)
  if (hit !== undefined) return hit
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement | null
  if (!root) return html
  root.querySelectorAll('input, select, textarea, button, script').forEach(n => n.remove())
  // Изнутри наружу: сначала вложенные таблицы формы, потом обёртки.
  const tables = Array.from(root.querySelectorAll('table')).reverse()
  for (const tb of tables) {
    if (tb.querySelector('img, svg, math')) continue
    const text = (tb.textContent ?? '').replace(/[\s ]+/g, ' ').trim()
    // Пустая рамка поля, «Ответ:» с клетками (в т. ч. с подписями А Б В / X Y / стрелками)
    // и одинокая единица измерения после поля («%», «г», «кДж»).
    if (isBlank(text) || /^Ответ:?\s*[A-ZА-ЯЁ\s→]{0,12}$/u.test(text) || (text.length <= 5 && !/\d/.test(text) && !/^Ответ/.test(text) && tb.querySelectorAll('td').length <= 2)) {
      tb.remove()
    }
  }
  // Таблица из одной ячейки — обёртка формы, а не таблица данных: рисовала
  // рамку вокруг вариантов. Разворачиваем в содержимое.
  for (const tb of Array.from(root.querySelectorAll('table'))) {
    const cells = tb.querySelectorAll(':scope > tr > td, :scope > tbody > tr > td, :scope > thead > tr > td')
    if (cells.length !== 1) continue
    const box = doc.createElement('div')
    while (cells[0].firstChild) box.appendChild(cells[0].firstChild)
    tb.replaceWith(box)
  }
  // Пустые обёртки и хвостовые переносы, оставшиеся от формы.
  root.querySelectorAll('div, p, td, tr, tbody').forEach(n => {
    if (!n.querySelector('img, svg, math, table') && isBlank(n.textContent ?? '') && n.childElementCount === n.querySelectorAll('br').length) n.remove()
  })
  while (root.lastChild && (root.lastChild.nodeName === 'BR' || (root.lastChild.nodeType === 3 && isBlank(root.lastChild.textContent ?? '')))) root.lastChild.remove()
  const out = root.innerHTML
  cache.set(html, out)
  return out
}
