-- Personal correction history. Full text is private to its author and admins;
-- it never becomes a global replacement just because several teachers typed it.
create table public.transcript_corrections (
  id uuid primary key,
  owner_id uuid not null default auth.uid(),
  subject text not null check (char_length(subject) between 1 and 60),
  kind text not null check (kind in ('speech','text-title','slide-title')),
  before_text text not null check (char_length(before_text) <= 20000),
  after_text text not null check (char_length(after_text) <= 20000),
  context_key text not null check (char_length(context_key) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_reasons text[] not null default '{}'
);
create index transcript_corrections_owner on public.transcript_corrections(owner_id,subject,created_at desc);
create index transcript_corrections_review on public.transcript_corrections(subject,kind,lower(trim(before_text))) where status<>'rejected';
alter table public.transcript_corrections enable row level security;
revoke all on public.transcript_corrections from anon;
grant select on public.transcript_corrections to authenticated;
grant update(status) on public.transcript_corrections to authenticated;
create policy transcript_corrections_read on public.transcript_corrections for select to authenticated
 using (owner_id=auth.uid() or public.is_admin());
create policy transcript_corrections_moderate on public.transcript_corrections for update to authenticated
 using (public.is_admin()) with check (public.is_admin());

create function public.remember_transcript_correction(p_id uuid,p_owner uuid,p_subject text,p_kind text,p_before text,p_after text,p_context text)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid; who uuid:=auth.uid();
begin
 if who is null or who is distinct from p_owner or not public.is_staff() then raise exception 'not allowed' using errcode='42501'; end if;
 if p_before=p_after then return p_id; end if;
 insert into public.transcript_corrections(id,owner_id,subject,kind,before_text,after_text,context_key)
 values(p_id,who,p_subject,p_kind,p_before,p_after,p_context)
 on conflict(id) do nothing;
 select id into saved from public.transcript_corrections where id=p_id and owner_id=who
   and subject=p_subject and kind=p_kind and before_text=p_before and after_text=p_after and context_key=p_context;
 if saved is null then raise exception 'correction id conflict'; end if;
 return saved;
end $$;
revoke all on function public.remember_transcript_correction(uuid,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.remember_transcript_correction(uuid,uuid,text,text,text,text,text) to authenticated;

-- These two seed rules also replace ordinary prose ("из-под уровня воды").
update public.transcript_terms set status='rejected',updated_at=now()
 where subject='chemistry' and source='seed' and heard in ('из под уровн*','из-под уровн*') and written='s-подуровн*';

-- Deterministic daily review: highlights uncertainty, never rewrites lessons
-- and never claims to have established scientific/linguistic correctness.
create function public.review_transcript_corrections() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 update public.transcript_corrections c set reviewed_at=now(), review_reasons=array_remove(array[
   case when c.before_text='' or c.after_text='' then 'Добавление или удаление текста' end,
   case when lower(c.before_text)=lower(c.after_text) then 'Изменён регистр' end,
   case when regexp_replace(c.before_text,'[^0-9₀-₉⁰-⁹]','','g')<>regexp_replace(c.after_text,'[^0-9₀-₉⁰-⁹]','','g') then 'Изменены числа или формула' end,
   case when exists(select 1 from public.transcript_corrections other where other.subject=c.subject and other.kind=c.kind
     and lower(trim(other.before_text))=lower(trim(c.before_text)) and lower(trim(other.after_text))<>lower(trim(c.after_text))
     and other.status<>'rejected') then 'Есть разные варианты исправления' end,
   case when char_length(c.after_text)>greatest(80,char_length(c.before_text)*3) then 'Текст значительно расширен' end
 ],null) where c.status<>'rejected';
 get diagnostics n=row_count; return n;
end $$;
revoke all on function public.review_transcript_corrections() from public,anon,authenticated;
select cron.schedule('iskra-transcript-corrections-review','0 20 * * *',$$select public.review_transcript_corrections()$$);
