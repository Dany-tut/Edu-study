# Где лежат ответы и комментарии ученика курса «Бухгалтерия»

Для чата, который по ответам ученицы дорабатывает курс. Курс `acc-ru`, уроки `acc-ru-0 … acc-ru-187`. Номер урока, который видит ученик, равен `N + 1`: «урок №1» — это `acc-ru-0`. Всё ниже — только чтение (SELECT). Персональные данные из ответов не копировать в репозиторий, чаты и ИИ без обезличивания.

## 1. Кто ученица

Доступ к курсу выдаётся строкой в `course_enrollments`, где `student_id` — текст с uuid ученика:

```sql
select ce.student_id, ce.access_mode, ce.granted_at
from course_enrollments ce join courses c on c.id = ce.course_id
where c.short_id = 'acc-ru';
```

## 2. Ответы в домашке — `lesson_progress`

Одна строка на ученика и урок, ключ `(student_id, lesson_ref)`.

| `lesson_ref` | Что в строке |
|---|---|
| `acc-ru-N` | Базовый уровень: проверочные вопросы. `attachments` — снимок `{ v: 'basic-1', rows: [{ n, prompt, type, answer, correct?, verdict }], reviewRequired, gradable, correct }`. Открытые ответы урока-знакомства (`acc-ru-0`) лежат в `rows[].answer` с `type = 'extended'`. |
| `acc-ru-N-hard` | Практическое задание с фото. `attachments` — `{ v: 2, tasks: [{ key, statement, answer, photos: [...], board }] }`; в старом формате — `{ photos, board }`. Фото хранятся как data-URI. |

Другие поля строки:
- `status`: submitted — ждёт проверки, completed — зачтено, returned — возвращено;
- `score`, `comment`, `updated_at`;
- ответ преподавателя — в `review_comment` и `review_attachments`;
- история повторных сдач — в `homework_attempts`: `lesson_ref`, `number`, `answers`, `review_comment`.

```sql
-- все сдачи по курсу
select lesson_ref, status, score, updated_at
from lesson_progress
where student_id = '<uuid>' and lesson_ref like 'acc-ru-%'
order by updated_at;

-- открытые ответы урока-знакомства (реестр, 1С, численность, Excel, организации)
select r->>'n' as n, r->>'prompt' as question, r->>'answer' as answer
from lesson_progress lp, jsonb_array_elements(lp.attachments->'rows') r
where lp.student_id = '<uuid>' and lp.lesson_ref = 'acc-ru-0';

-- практические задания: текст и число фото
select lesson_ref, t->>'answer' as answer, jsonb_array_length(coalesce(t->'photos','[]')) as photos
from lesson_progress lp, jsonb_array_elements(lp.attachments->'tasks') t
where lp.student_id = '<uuid>' and lp.lesson_ref like 'acc-ru-%-hard';
```

## 3. Комментарии и скриншоты к любому уроку — `feedback_requests`

Отдельного поля комментария в уроке нет. Каждый конспект заканчивается инструкцией: меню профиля → «Обратная связь», раздел «Бухгалтерия, урок №N», текст и скриншот. Это существующая форма Искры.

Поля:
- `section` — «Бухгалтерия, урок №N», номер урока равен `N` в `acc-ru-(N−1)`;
- `message`;
- `attachments` — массив изображений (data-URI);
- `author_id`, `author_name`, `author_role`;
- `status`, `admin_note`, `created_at`.

Читать таблицу может только админ (RLS `is_admin()`). В интерфейсе: Админка → вкладка «Заявки».

```sql
select created_at, author_name, section, message, jsonb_array_length(attachments) as screenshots, status
from feedback_requests
where section ilike '%бухгалтер%'
order by created_at;
```

## 4. Где это видно без SQL

- **Ответы домашки:** у преподавателя в «Проверить ДЗ» и в журнале. Открытые ответы урока-знакомства без эталона попадают туда как работа на проверку.
- **Комментарии со скриншотами:** Админка → «Заявки».
