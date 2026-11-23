-- Экран приглашения (#/join) узнаёт, что аккаунт по ссылке уже создан.
-- Раньше get_invited_student отдавал только имя, и человек, открывший ссылку
-- повторно, снова видел «Придумайте логин и пароль» и получал 422
-- user_already_exists (случай 23.11.2026). Только чтение; полную почту не
-- отдаём — тот, у кого ссылка, видит лишь маску «bo•••••@gmail.com».

create or replace function public.get_invite_state(p_token uuid)
returns table(id uuid, name text, group_id uuid, claimed boolean, mine boolean, email_masked text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select s.id, s.name, s.group_id,
         s.auth_user_id is not null,
         s.auth_user_id is not null and s.auth_user_id = auth.uid(),
         case when s.auth_user_id is null then null else (
           select case when position('@' in u.email) > 1
             then left(split_part(u.email, '@', 1), 2) || '•••••@' || split_part(u.email, '@', 2)
           end
           from auth.users u where u.id = s.auth_user_id)
         end
  from public.students s
  where s.invite_token = p_token
  limit 1;
$function$;

revoke all on function public.get_invite_state(uuid) from public;
grant execute on function public.get_invite_state(uuid) to anon, authenticated;
