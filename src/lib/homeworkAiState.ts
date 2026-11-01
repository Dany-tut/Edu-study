export type HomeworkAiIssue = { title: string; text: string; retry: boolean }
const issues: Record<string, HomeworkAiIssue> = {
  configuration: { title:'Проверка ИИ ещё не настроена', text:'Добавьте ключ Linali в Secrets проекта. Ответы ученика сохранены, работу можно проверить вручную.', retry:false },
  credentials: { title:'Ключ проверки недействителен', text:'Обновите ключ Linali в настройках сервера, затем повторите проверку.', retry:false },
  balance: { title:'Недостаточно средств для проверки', text:'Пополните баланс Linali и повторите проверку. Ответы ученика сохранены.', retry:false },
  rate_limit: { title:'Сервис временно занят', text:'Лимит запросов достигнут. Попробуйте повторить проверку немного позже.', retry:true },
  timeout: { title:'Проверка заняла больше времени', text:'Сервис не успел ответить. Можно повторить запрос или проверить работу самостоятельно.', retry:true },
  unavailable: { title:'Не удалось связаться с ИИ', text:'Временный сбой сервиса. Ответы ученика и ваш комментарий сохранены.', retry:true },
  invalid_result: { title:'Разбор не удалось подготовить', text:'Ответ ИИ не прошёл проверку полноты и критериев. Оценка не применена.', retry:true },
  missing_evidence: { title:'Не хватает данных для проверки', text:'Часть ответов или фото недоступна. Проверьте вложения и выполните проверку вручную.', retry:false },
  unauthorized: { title:'Нужно войти снова', text:'Сессия завершилась. Войдите в аккаунт преподавателя и повторите проверку.', retry:false },
  forbidden: { title:'Нет доступа к этой работе', text:'Откройте работу из своего журнала преподавателя.', retry:false },
  disabled: { title:'Проверка ИИ приостановлена', text:'Сейчас работу можно проверить самостоятельно. Ответы ученика сохранены.', retry:false },
  cooldown: { title:'Запрос уже отправлен', text:'Подождите немного перед следующей попыткой.', retry:true },
  unsupported_subject: { title:'Для этого предмета проверка пока недоступна', text:'Сейчас ИИ проверяет домашние работы по химии и биологии.', retry:false },
  submission_not_pending: { title:'Работа уже изменилась', text:'Откройте актуальную сдачу из журнала.', retry:false },
}
export function homeworkAiIssue(code: string): HomeworkAiIssue { return issues[code] ?? issues.unavailable }
/** A model's plain text must never become active HTML in the rich editor. */
export function aiCommentHtml(text: string): string {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>')
}
