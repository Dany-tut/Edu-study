create or replace function public.review_transcript_corrections() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 -- A new contradictory correction reopens an earlier approved item for the admin.
 update public.transcript_corrections c set status='pending'
 where c.status='approved' and exists(select 1 from public.transcript_corrections other
   where other.subject=c.subject and other.kind=c.kind and other.status<>'rejected'
     and lower(trim(other.before_text))=lower(trim(c.before_text))
     and lower(trim(other.after_text))<>lower(trim(c.after_text))
     and other.created_at>coalesce(c.reviewed_at,c.created_at));
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
