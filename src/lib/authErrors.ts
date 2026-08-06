// Supabase отдаёт ошибки только по-английски («User already registered»,
// «Invalid login credentials»), и раньше они падали в UI как есть. Здесь один
// словарь: code → русская фраза, плюс подстраховка по тексту сообщения (старые
// ответы GoTrue приходят без `code`).
//
// Возвращается РУССКАЯ строка — как и весь исходный текст приложения, — поэтому
// на месте вызова её нужно прогонять через t(): английские версии этих же фраз
// лежат в lib/i18n.ts.

type SupaError = {
  code?: string | null
  message?: string | null
  status?: number | null
} | null | undefined

// Коды auth-js (@supabase/auth-js/lib/error-codes) + коды Postgres/PostgREST,
// которые реально долетают до экранов входа и админки.
const BY_CODE: Record<string, string> = {
  // — Регистрация —
  user_already_exists: 'Аккаунт с такой почтой уже существует. Войдите или укажите другую почту.',
  email_exists: 'Аккаунт с такой почтой уже существует. Войдите или укажите другую почту.',
  phone_exists: 'Аккаунт с таким телефоном уже существует.',
  identity_already_exists: 'Этот способ входа уже привязан к другому аккаунту.',
  signup_disabled: 'Регистрация сейчас закрыта. Обратитесь к администратору.',
  email_address_invalid: 'Проверьте адрес почты — он выглядит некорректно.',
  email_address_not_authorized: 'На этот адрес письма отправлять нельзя. Укажите другую почту.',
  weak_password: 'Слишком простой пароль. Добавьте длины и разных символов.',
  same_password: 'Новый пароль совпадает со старым. Придумайте другой.',
  validation_failed: 'Проверьте правильность заполнения полей.',

  // — Вход —
  invalid_credentials: 'Неверный email или пароль',
  email_not_confirmed: 'Почта не подтверждена. Откройте письмо и перейдите по ссылке.',
  phone_not_confirmed: 'Телефон не подтверждён.',
  user_not_found: 'Пользователь не найден.',
  user_banned: 'Доступ к аккаунту заблокирован. Обратитесь к администратору.',
  provider_disabled: 'Этот способ входа отключён.',
  email_provider_disabled: 'Вход по почте отключён.',
  otp_expired: 'Срок действия кода истёк. Запросите новый.',
  otp_disabled: 'Вход по одноразовому коду отключён.',

  // — Сессия —
  session_expired: 'Сессия истекла. Войдите заново.',
  session_not_found: 'Сессия не найдена. Войдите заново.',
  refresh_token_not_found: 'Сессия истекла. Войдите заново.',
  refresh_token_already_used: 'Сессия истекла. Войдите заново.',
  bad_jwt: 'Сессия недействительна. Войдите заново.',
  no_authorization: 'Нужно войти в аккаунт.',
  not_admin: 'Недостаточно прав для этого действия.',
  reauthentication_needed: 'Подтвердите вход ещё раз, чтобы сменить пароль.',
  reauthentication_not_valid: 'Код подтверждения неверный.',

  // — Лимиты и сеть —
  over_email_send_rate_limit: 'Слишком много писем подряд. Подождите пару минут и попробуйте снова.',
  over_request_rate_limit: 'Слишком много попыток. Подождите немного и попробуйте снова.',
  over_sms_send_rate_limit: 'Слишком много SMS подряд. Подождите немного.',
  request_timeout: 'Сервер не ответил вовремя. Попробуйте ещё раз.',
  captcha_failed: 'Не удалось пройти проверку «я не робот». Попробуйте ещё раз.',
  unexpected_failure: 'Сервер не смог обработать запрос. Попробуйте ещё раз.',
  conflict: 'Данные изменились в другом окне. Обновите страницу и повторите.',

  // — Postgres / PostgREST —
  '23505': 'Такая запись уже существует.',
  '23503': 'Связанная запись не найдена — обновите страницу и повторите.',
  '23502': 'Заполнены не все обязательные поля.',
  '22P02': 'Некорректный формат данных.',
  '42501': 'Недостаточно прав для этого действия.',
  PGRST301: 'Сессия истекла. Войдите заново.',
}

// Фолбэк для ответов без code (старый GoTrue, edge-функции, сетевые ошибки).
const BY_TEXT: Array<[RegExp, string]> = [
  [/already registered|already exists|duplicate key/i, 'Аккаунт с такой почтой уже существует. Войдите или укажите другую почту.'],
  [/invalid login credentials/i, 'Неверный email или пароль'],
  [/email not confirmed/i, 'Почта не подтверждена. Откройте письмо и перейдите по ссылке.'],
  [/password should be at least|weak password/i, 'Слишком простой пароль. Добавьте длины и разных символов.'],
  [/new password should be different/i, 'Новый пароль совпадает со старым. Придумайте другой.'],
  [/unable to validate email|invalid email/i, 'Проверьте адрес почты — он выглядит некорректно.'],
  [/signups not allowed|signup is disabled/i, 'Регистрация сейчас закрыта. Обратитесь к администратору.'],
  [/rate limit|too many requests/i, 'Слишком много попыток. Подождите немного и попробуйте снова.'],
  [/row-level security|permission denied/i, 'Недостаточно прав для этого действия.'],
  [/jwt expired|session.*expired|refresh token/i, 'Сессия истекла. Войдите заново.'],
  [/failed to fetch|networkerror|network request failed/i, 'Нет связи с сервером. Проверьте интернет.'],
]

/**
 * Русский текст ошибки Supabase. `fallback` — что показать, если код и текст
 * незнакомы (само английское сообщение наружу не выпускаем).
 */
export function authErrorRu(err: SupaError, fallback = 'Что-то пошло не так. Попробуйте ещё раз.'): string {
  if (!err) return fallback
  const code = err.code ? String(err.code) : ''
  if (code && BY_CODE[code]) return BY_CODE[code]
  const msg = err.message ?? ''
  for (const [re, ru] of BY_TEXT) if (re.test(msg)) return ru
  return fallback
}
