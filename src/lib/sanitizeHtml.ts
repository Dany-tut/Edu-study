// Sanitize student-authored rich-text HTML before dangerouslySetInnerHTML.
// Strips active content (scripts, embeds, event handlers, javascript: URLs)
// while keeping harmless formatting tags. DOM-based, no dependencies.
const BLOCKED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FORM', 'INPUT', 'BUTTON',
])

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (BLOCKED_TAGS.has(child.tagName)) { child.remove(); continue }
      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase()
        const value = attr.value.trim().toLowerCase()
        if (
          name.startsWith('on') ||
          ((name === 'href' || name === 'src' || name === 'xlink:href') &&
            (value.startsWith('javascript:') || value.startsWith('data:text/html')))
        ) {
          child.removeAttribute(attr.name)
        }
      }
      walk(child)
    }
  }
  walk(doc.body)
  return doc.body.innerHTML
}
