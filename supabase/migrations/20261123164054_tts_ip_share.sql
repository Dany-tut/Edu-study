-- Per-caller share of the daily paid TTS budget. The edge function passes a
-- salted hash of the client address, never the address itself.
create table if not exists public.tts_ip_spend (
  day     date not null,
  ip_hash text not null,
  chars   integer not null default 0,
  primary key (day, ip_hash)
);
alter table public.tts_ip_spend enable row level security;
revoke all on table public.tts_ip_spend from public, anon, authenticated;

create or replace function public.tts_ip_spend_add(p_ip text, n integer)
returns integer language sql security definer set search_path = '' as $$
  insert into public.tts_ip_spend (day, ip_hash, chars) values (current_date, p_ip, n)
  on conflict (day, ip_hash) do update set chars = public.tts_ip_spend.chars + excluded.chars
  returning chars;
$$;
revoke all on function public.tts_ip_spend_add(text, integer) from public, anon, authenticated;
