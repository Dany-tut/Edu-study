# Искра: реальная локальная проверка, 2 ноября 2026

Production не изменялся. Исходный старый Docker-том сохранён; для извлечения схемы использовалась отдельная копия с выключенной сетью. Данные пользователей не выгружались.

## Восстановление и найденные исправления

Полная schema-only база восстановлена в локальном Supabase из `supabase/bootstrap`, затем успешно применены 16 forward migrations от 31 октября до патча ограничительных staff-политик. Это snapshot + migrations, а не успешный raw chain с 0001: ранняя история без baseline всё ещё неполна.

Реальная схема выявила ограничение profiles.role: допускает teacher/student, администратор хранится в app_metadata. Исправлен handle_new_user: доверенный admin получает teacher-профиль, сохраняет административный app_metadata. Обновлён фокусный PostgreSQL-тест с настоящим CHECK; 29 assertions PASS.

При расширении финансовых отрицательных сценариев воспроизведены два дефекта: student A мог INSERT payments с teacher_id=свой Auth id; teacher B мог INSERT payment для чужого student A. Проверки выполнялись в транзакциях с rollback, amount=1 и lessons_paid=0. Добавлена миграция `20261102124842_payment_staff_and_student_owner.sql`: staff обязательно, teacher_id должен соответствовать created_by ученика. После патча student A/teacher B отклонены, teacher A разрешён. Проверка — реальный PostgreSQL с SET ROLE authenticated и auth.uid claims; HTTP-прогон новой миграции ещё не выполнен.

## Фактические проверки

- `api-matrix-100.json`: **100 PASS, 0 FAIL** с настоящими локальными Supabase Auth JWT, PostgREST и Storage. Admin, teacher A/B, student A/B, anon; отдельно invalid JWT. Проверены видимость students/courses/homework/schedule/payments/private journal, чужие UPDATE и course-access RPC, signup metadata=admin, self-promote, Auth rebinding, draft → submit → duplicate retry → one attempt → teacher grade → fresh-session result, cross-account attempts, фото, signed URLs и forged upload path, отсутствие temp_password. Это конкретные 100 сценариев; не доказательство всех операций над каждой таблицей приложения.
- `payments-regression.json`: before exploit / after deny-deny-allow, transactional реальный PostgreSQL. Текущий `checkLocalSupabase.mjs` дополнен двумя отрицательными payment HTTP-cases и строгой проверкой SQLSTATE для отличения сетевой ошибки от отказа авторизации; **этот расширенный вариант пока не прогнан** после остановки.
- Полный browser E2E **НЕ пройден**. Probe дошёл до формы приглашения с реальным get_invited_student. В первом probe был неверный селектор кнопки («Войти в платформу» исправлен). Последующие запуски были прерваны ресурсной остановкой до регистрации/сдачи/проверки. Подготовлен `probeLocalBrowserSignup.mjs`; он диагностический, не завершённый E2E-набор.
- Схема и миграции восстановлены; выбранная пользователем регистрационная информация не копировалась с исходного тома. Для тестов сгенерированы вымышленные аккаунты `.invalid`, фейковые ответы и одно PNG.

Снимки/API fixtures и status с LOCAL keys остаются приватно в `/tmp/iskra-local-security`; они не добавлены в репозиторий. Здесь сохранены только результаты без паролей/токенов и показатели ресурсов.

## Ресурсы и остановка

Лимиты применены: PostgreSQL 1 CPU / 1536 MiB; остальные наши сервисы 1 CPU / 512 MiB. Неиспользуемые studio/analytics/pooler/imgproxy не запускались. Первые восемь сервисов, затем минимальный набор DB/Auth/PostgREST/Storage/Kong. Реальные опубликованные порты проверены и исправлены до `127.0.0.1:55321`, `127.0.0.1:55322`, `127.0.0.1:55324`: network default-binding сам по себе оказался недостаточен для CLI.

Два раза сработал порог диска: 7.93 и 7.91 GiB. Монитор остановил только контейнеры `*_iskra-local-security`; посторонние контейнеры не трогал. Память в момент остановок оставалась примерно 27–29% free по memory_pressure. macOS swap в конце достиг около 35 GiB; это наблюдение всей машины, не измерение памяти одного приложения.

После второго stop остановлен наш Vite и закрыт тестовый Chrome. Все наши Supabase-контейнеры остановлены, локальные synthetic volumes сохранены для продолжения. Новый start runner требует минимум 12 GiB свободно, stop-порог остаётся 8 GiB. Для полноценного браузерного прогона рекомендуется запас не менее 20 GiB свободного диска; чужие файлы, кэши и контейнеры ради этого не удалялись.

## Продолжение

После освобождения места: восстановить локальные сервисы с теми же лимитами и loopback-портами, включить `watchLocalSupabase.py`, прогнать расширенную HTTP-матрицу и закончить браузерный сценарий регистрации/входа → назначения → сохранения черновика → сдачи → проверки учителем → результата → reload. Затем дополнить INSERT/UPDATE/DELETE всех чувствительных ресурсов, edge reset/provision реальные отрицательные JWT-сценарии, offline/timeout, restore и Windows Chrome/Edge.

**NO-GO для реальной беты остаётся.** В production ничего не выпущено; успешный API-сценарий не заменяет незавершённый полный browser E2E и оставшуюся матрицу.
