create or replace function public.remember_transcript_correction(p_id uuid,p_owner uuid,p_subject text,p_kind text,p_before text,p_after text,p_context text)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid; who uuid:=auth.uid();
begin
 if who is null or who is distinct from p_owner or not public.is_staff() or not public.mfa_ok() then raise exception 'not allowed' using errcode='42501'; end if;
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

