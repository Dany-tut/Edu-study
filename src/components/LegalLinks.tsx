// Ссылки на документы Искры для подписей согласия (вход, регистрация, окно
// согласия ученика). Отдельный файл — чтобы окно согласия в главном чанке не
// тянуло за собой SocialLoginButtons.

// Абсолютные адреса: в приложении (Capacitor) относительный путь ведёт внутрь сборки.
const TERMS_URL = 'https://edu-study-app.vercel.app/terms.html'
const PRIVACY_URL = 'https://edu-study-app.vercel.app/privacy.html'

/** Ссылки на документы для подписей согласия. Внутри <label> клик по ссылке
 *  не переключает чекбокс — ссылка интерактивна сама по себе. */
export function TermsLink({ children }: { children: React.ReactNode }) {
  return <a data-hover="link" href={TERMS_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{children}</a>
}
export function PrivacyLink({ children }: { children: React.ReactNode }) {
  return <a data-hover="link" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>{children}</a>
}
