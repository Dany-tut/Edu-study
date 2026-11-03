import DOMPurify from 'dompurify'

// Questions and submitted answers support formatted text, images and MathML.
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true },
    FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'style', 'template', 'audio', 'video'],
  })
}
