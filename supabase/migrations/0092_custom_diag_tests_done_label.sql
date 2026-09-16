-- Подпись «Диагностика завершена» над «Молодец!» на финальном экране теста.
-- По умолчанию скрыта; учитель включает галочкой в настройках редактора.
alter table public.custom_diag_tests
  add column if not exists show_done_label boolean not null default false;
