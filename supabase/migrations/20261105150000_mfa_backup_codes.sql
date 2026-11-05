-- Двухфакторная защита: запасные коды и срок для учителей.
--
-- Сам TOTP-фактор живёт в Supabase Auth (auth.mfa_factors). Запасных кодов
-- у Supabase нет, поэтому храним свои — ТОЛЬКО хэши (sha-256 от user_id и кода).
-- Читает и пишет таблицу одна Edge Function mfa-backup под service_role:
-- политик для anon/authenticated нет вовсе.

create table if not exists public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mfa_backup_codes_user_idx on public.mfa_backup_codes (user_id) where used_at is null;
alter table public.mfa_backup_codes enable row level security;
revoke all on public.mfa_backup_codes from public, anon, authenticated;

-- Отсрочка для учителя и админа: 7 дней с выкладки (или с регистрации, если позже).
create table if not exists public.mfa_policy (
  id boolean primary key default true check (id),
  staff_rollout_at timestamptz not null default now(),
  grace interval not null default interval '7 days'
);
insert into public.mfa_policy (id) values (true) on conflict (id) do nothing;
alter table public.mfa_policy enable row level security;
revoke all on public.mfa_policy from public, anon, authenticated;

-- Что нужно кабинету: обязательна ли защита, до какого срока, сколько кодов осталось.
create or replace function public.my_mfa_requirement()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'required', public.is_staff(),
    'deadline', greatest(p.staff_rollout_at, coalesce(u.created_at, p.staff_rollout_at)) + p.grace,
    'backup_codes_left', (select count(*) from public.mfa_backup_codes c where c.user_id = auth.uid() and c.used_at is null)
  )
  from public.mfa_policy p
  left join auth.users u on u.id = auth.uid()
  where auth.uid() is not null
$$;
revoke execute on function public.my_mfa_requirement() from public, anon;
grant execute on function public.my_mfa_requirement() to authenticated;

-- Неудачные попытки запасного кода: не больше 5 за 15 минут на аккаунт.
create table if not exists public.mfa_backup_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists mfa_backup_attempts_user_idx on public.mfa_backup_attempts (user_id, at);
alter table public.mfa_backup_attempts enable row level security;
revoke all on public.mfa_backup_attempts from public, anon, authenticated;
