#!/usr/bin/env python3
"""Back up synthetic local domain/Auth/Storage schemas and verify a separate restore.
No external DB and no existing database is dropped or overwritten.
"""
from pathlib import Path
import subprocess,uuid,json,os
root=Path('/tmp/iskra-local-security');container='supabase_db_iskra-local-security'
def run(args,**kw):
 r=subprocess.run(['docker','exec','-i',container,*args],capture_output=True,**kw)
 if r.returncode:
  print(r.stderr.decode(errors='replace').splitlines()[0][:600])
  raise subprocess.CalledProcessError(r.returncode,args,output=r.stdout,stderr=r.stderr)
 return r
def sql(db,query):return run(['psql','-U','postgres','-d',db,'-At','-v','ON_ERROR_STOP=1'],input=query.encode()).stdout.decode().strip()
backup=run(['pg_dump','-U','postgres','-d','postgres','--format=custom','--no-owner','--schema=public','--schema=private','--schema=auth','--schema=storage','--schema=iskra_private']).stdout
path=root/'synthetic-backup.dump';path.write_bytes(backup);path.chmod(0o600)
# pg_restore runs against a fresh DB; PostgreSQL's default public schema remains.
# pg_trgm was installed in public in the historical schema, so recreate it first.
toc=run(['pg_restore','--list'],input=backup).stdout.decode()
entries='\n'.join(line for line in toc.splitlines() if ' SCHEMA - public ' not in line)+'\n'
name='iskra_restore_qa_'+uuid.uuid4().hex[:8]
run(['createdb','-U','postgres','--template=template0',name])
try:
 sql(name,'create schema if not exists extensions; create extension pg_trgm with schema public;')
 run(['sh','-c','cat > /tmp/iskra-restore-list.txt'],input=entries.encode())
 run(['pg_restore','-U','supabase_admin','--exit-on-error','--use-list=/tmp/iskra-restore-list.txt','--dbname='+name],input=backup)
 fingerprint="""select json_build_object(
 'students',(select count(*) from public.students),
 'auth_users',(select count(*) from auth.users),
 'attempts',(select count(*) from public.homework_attempts),
 'progress',(select count(*) from public.lesson_progress),
 'payment_rows',(select count(*) from public.payments),
 'storage_objects',(select count(*) from storage.objects),
 'policies',(select count(*) from pg_policies where schemaname in ('public','storage')),
 'progress_digest',(select md5(coalesce(string_agg(id::text||status||coalesce(score::text,'null')||attachments::text,'' order by id),'')) from public.lesson_progress),
 'attempt_digest',(select md5(coalesce(string_agg(id::text||status||coalesce(score::text,'null')||answers::text,'' order by id),'')) from public.homework_attempts));"""
 before=json.loads(sql('postgres',fingerprint));after=json.loads(sql(name,fingerprint));assert before==after,(before,after)
 result={'status':'PASS','scope':'Synthetic local DB domain/Auth/Storage metadata and DB-stored answers; separate restore; object binary storage not included','backup_bytes':len(backup),'fingerprints_match':True,'counts':before,'productionModified':False}
 (root/'evidence/restore.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS: separate synthetic restore; counts, policies, progress and attempt checksums match')
finally:
 # Only the uniquely named database created above is disposable.
 run(['dropdb','-U','postgres',name])
 run(['rm','-f','/tmp/iskra-restore-list.txt'])
