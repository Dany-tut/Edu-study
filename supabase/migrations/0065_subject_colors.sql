-- Цвета предметов: учительская база + чтение её учеником.
--
-- Три слоя цвета, снизу вверх:
--   1. реестр предметов (src/lib/subjects.ts) — дефолт, никем не настраивается;
--   2. profiles.subject_colors — база учителя: цвет, который он выбрал своему
--      предмету, виден и ему самому, и всем его ученикам;
--   3. students.preferences.subjectColors — личная правка ученика, бьёт слой 2
--      и НЕ уходит обратно учителю (у него остаются его цвета).
--
-- Слой 3 живёт в уже существующем jsonb настроек ученика — миграции не просит.
-- Здесь только слой 2 и способ его прочитать: политики profiles пускают в
-- строку лишь её владельца и админа (0026), поэтому ученику нужен посредник.

alter table public.profiles
  add column if not exists subject_colors jsonb not null default '{}'::jsonb;

comment on column public.profiles.subject_colors is
  'Карта id предмета → hex акцента ("english" → "#E4572E"). Пусто = цвет из реестра.';

-- Ученик читает карту цветов СВОЕГО учителя (владельца его группы).
-- Гейт намеренно узкий: своя строка ученика, своя группа учителя или админ —
-- перебором чужих id карту не вытянуть. Легаси-вход без auth-пользователя
-- сюда не проходит и просто получает цвета из реестра.
create or replace function public.subject_colors_for_student(p_student uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(p.subject_colors, '{}'::jsonb)
    from public.students s
    join public.groups g on g.id = s.group_id
    join public.profiles p on p.id = g.created_by
   where s.id = p_student
     and (
       s.auth_user_id = auth.uid()
       or g.created_by = auth.uid()
       or public.is_admin()
     )
   limit 1;
$$;

revoke execute on function public.subject_colors_for_student(uuid) from anon;
grant execute on function public.subject_colors_for_student(uuid) to authenticated;
