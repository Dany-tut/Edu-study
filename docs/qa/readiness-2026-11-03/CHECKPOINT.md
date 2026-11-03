# Контрольная точка перед перезапуском Codex

Задача: полная приёмка Искры для закрытой беты и рынка. Работа не завершена. См. README.md, coverage.md, checks.json. Дата: 3 ноября 2026, Asia/Bangkok.

Сохраняемые артефакты: /Users/dany/Cursor/student-dashboard/docs/qa/readiness-2026-11-03/.
Продуктовые исходники здесь не менялись, незавершённые изменения других чатов не откатывать и не коммитить общей массой. baseline.json и source-drift.json фиксируют границу доказательств.

Тестовые данные и секреты только в приватном /tmp/iskra-local-security: status.json, fixture.json, synthetic-backup.dump, synthetic-storage-backup/. Не печатать и не переносить credentials в репозиторий. Контейнеры проекта iskra-local-security будут штатно остановлены ресурсным монитором, volumes сохраняются. Контейнеры desstudy-pg и portfolio-mongo чужие, не останавливать. Docker Desktop был запущен этим чатом; не закрывать его целиком из-за чужих контейнеров.

На безопасной границе: автоматические команды завершены; frontend build готов; browser happy path завершён; restore и две load-волны завершены. Нет открытой транзакции или отправки. Созданный через UI курс сохранён draft; публикация была отклонена из-за отсутствия даты/времени урока, это ожидаемая валидация.

Для продолжения:
1. Проверить диск (старт допускается при >=12 GiB свободно) и memory_pressure. Поднимать только изолированный стенд через python3 scripts/security/runLocalSupabase.py. Условия resource guard не ослаблять. monitor.stop удалить/переименовать перед scripts/security/watchLocalSupabase.py. Не запускать Docker reset/remote db push.
2. Локальный frontend собран с VITE_SUPABASE_URL из status.json и ANON_KEY как publishable key; внешняя аналитика отключена. Сборка npm run build, затем node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5291 --strictPort. После изменений нужна новая сборка и фиксация хешей.
3. Для сквозного replay: node scripts/security/checkLocalSupabase.mjs (пересоздаёт синтетические fixtures) → node scripts/security/checkLocalUserCycle.mjs. Внешние browser requests replay блокирует.
4. Нужный для ручного продолжения преподаватель — fixture.json accounts.teacherA, ученик — accounts.studentA. Их реальные пароли изменялись reset-тестом; в fixture записаны актуальные значения. Не выводить их в лог.
5. В teacherA существует курс «QA Приёмка — курс через интерфейс», QA Модуль приёмки, QA Первый урок, доступ группе QA group A. Дозаполнить дату/время, опубликовать через UI, проверить server и свежий вход ученика. Урок оказался связан с module_id; вложенность визуально нужно проверить отдельно.
6. Исправить 8 переводов по check-i18n.log с сохранением чужих изменений, повторить check:i18n и check:ui. Полная текущая проверка логики 33 commands: 32 PASS / 1 FAIL.

Временные процессы этого чата перед остановкой: QA monitor session 53065; preview session 71025; interactive browser bridge session 1465. Их штатное завершение выполняется после записи checkpoint. Номера PTY/session после restart могут быть недействительны. Браузер bridge — node /tmp/iskra-local-security/browser-control.mjs, preview — vite preview на 5291. Не завершать dev-серверы на 5196/5189: они принадлежат другим чатам.

Никакого production deploy/push/изменения production DB и отправки сообщений пользователям не выполнялось.

Штатное завершение: локальные Supabase-контейнеры остановлены, чужие контейнеры оставлены работающими; preview на 5291 остановлен; browser bridge закрыт. Все отчёты записаны на диск. Продолжение после перезапуска безопасно.

## Продолжение после «дальше»

Актуальные README.md, defects.md, interruptions.md и coverage.md записаны на диск. Курс опубликован и открывается учеником из расписания. Созданы группа QA Бета — группа через UI и QA Ученик через интерфейс, связь подтверждена в БД. Добавлены 10 переводов; check:i18n и check:ui PASS. Иные изменения i18nEn.ts относятся к общей рабочей копии и должны быть сохранены.

Замороженная сборка: followup-snapshot.json → /tmp/iskra-readiness-snapshot-1793672570. Это QA-снимок без .git, не выпускной коммит. Включает первые 8 переводов, последние 2 есть только в основной рабочей копии.

Приоритет пользователя: прерванные действия, зависшие busy-состояния, невозможность закрыть/отменить. Конкретный Apple-кейс описан в defects.md AUTH-INT-01. scripts/checkInterruptedSocialLogin.mjs воспроизводит 2 FAIL / 1 PASS на настоящих React/socialAuth с управляемыми native/provider boundaries; real iPhone не проверен. Продуктовый OAuth-код этим чатом не исправлялся. Не менять общую логику без учёта callback/linking/PKCE и поздних ответов. Снимки/результаты — interrupted-login/.

scripts/security/checkLocalReturnCycle.mjs готов к повтору. Первые 5 шагов возврата проходили; драйвер исправлен: прежде редактирования нажать «Пройти заново», не запрашивать отсутствующую колонку attachments в homework_attempts. Новый полный прогон не завершён. Ошибка fetch/ECONNRESET в return-cycle-final.log относится к остановленной среде, не к продукту.

Ресурсная остановка: monitor session 52187 подтвердил SAFETY STOP при диске 7.45 GiB. После этого диск снизился до 1.5 GiB; новый запуск запрещён runner до >=12 GiB. При финальной проверке те же локальные контейнеры были снова подняты другим процессом (Up около минуты); их повторно не останавливать как свои без выяснения владельца. Чужие desstudy-pg/portfolio-mongo не трогать. Мы новых backend jobs не запускали после выявления нехватки места.

Preview session 98645 на 5291 остановлен. Browser bridge session 93301 получил exit; перед продолжением проверить, не остался ли PID 75702, и завершать только подтверждённый процесс этого чата. Teacher storageState сохранён приватно (0600) в /tmp/iskra-local-security/readiness-teacher-state.json. Не переносить его в репозиторий.

Порядок продолжения после освобождения диска: проверить ресурсы/владельцев локального стенда → полный replay возврата/новой попытки → UI создание/назначение ДЗ и расписание/журнал → матрица прерываний. Продукт остаётся без допуска к внешней бете. Production не менялся.

Финально: подтверждённый browser bridge PID 75702 этого чата завершён SIGTERM после зависшего штатного close; preview остановлен. Новых работ не осталось.
