-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0013_desk_layouts — teacher home dashboard workspaces                  ║
-- ║  • one row per teacher: full desk config in JSONB                      ║
-- ║  • desks = [{id, name, icon, items: [{id,type,x,y,w,h}]}]             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.desk_layouts (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null unique references auth.users(id) on delete cascade,
  desks       jsonb not null default '[]'::jsonb,
  active_desk_id text not null default 'today',
  updated_at  timestamptz not null default now()
);

alter table public.desk_layouts enable row level security;

create policy "desk_layouts_own" on public.desk_layouts
  for all to authenticated
  using  ((select auth.uid()) = teacher_id)
  with check ((select auth.uid()) = teacher_id);

drop trigger if exists desk_layouts_set_updated_at on public.desk_layouts;
create trigger desk_layouts_set_updated_at
  before update on public.desk_layouts
  for each row execute function public.set_updated_at();
