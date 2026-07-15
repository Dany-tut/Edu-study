-- Цена тарифов в долларах для EN-локали (RU показывает price_rub, EN — price_usd).
alter table public.plans add column if not exists price_usd integer not null default 0;

update plans set price_usd = 0  where code = 'free';
update plans set price_usd = 6  where code = 'basic';
update plans set price_usd = 12 where code = 'pro';
update plans set price_usd = 29 where code = 'school';
update plans set price_usd = 59 where code = 'unlimited';
