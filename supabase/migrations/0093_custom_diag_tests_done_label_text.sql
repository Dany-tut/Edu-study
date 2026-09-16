-- Подпись над «Молодец!» на финальном экране — свой текст вместо галочки.
-- Пусто — подписи нет. show_done_label (0092) больше не читается; колонку не
-- сносим, пока на проде может жить сборка, которая её выбирает.
alter table public.custom_diag_tests add column if not exists done_label text;
update public.custom_diag_tests set done_label = 'Диагностика завершена'
  where show_done_label and done_label is null;
