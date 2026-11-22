const {PGlite} = await import(process.argv[2] || '@electric-sql/pglite');
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid'; create table public.lessons(id uuid primary key,short_id text,content jsonb,youtube_url text,description text,timecodes jsonb,chapter_variants jsonb,materials jsonb,homework jsonb,test_tasks jsonb,updated_at timestamptz); create table public.students(id uuid primary key,name text); insert into public.lessons(id,short_id,content,youtube_url) values('00000000-0000-0000-0000-000000000001','fixture','{"transcript":{"text":"keep"}}','https://example.com/video');`);
await db.exec(fs.readFileSync(root+'/supabase/migrations/20261122031218_data_preservation_history.sql','utf8'));
async function blocked(sql){let failed=false;try{await db.exec(sql)}catch(e){if(!e.message.includes('ISKRA_DATA_PRESERVATION'))throw e;failed=true}if(!failed)throw Error('not blocked: '+sql)}
await blocked(`update public.lessons set youtube_url=null`);
await blocked(`update public.lessons set content='{"paragraphs":["new"]}'`);
await blocked(`truncate public.lessons`);
await db.exec(`update public.lessons set description='a real edit'`);
let rows=(await db.query(`select old_row from iskra_history.row_versions where operation='UPDATE'`)).rows;
if(rows.length!==1||rows[0].old_row.youtube_url!=='https://example.com/video')throw Error('archive missing');
await db.exec(`delete from public.lessons`);
if((await db.query(`select count(*)::int n from iskra_history.row_versions where operation='DELETE'`)).rows[0].n!==1)throw Error('delete not archived');
await blocked(`delete from iskra_history.row_versions`);await blocked(`truncate iskra_history.row_versions`);
await db.exec(`set role authenticated`);
try{await db.query(`select * from iskra_history.row_versions`);throw Error('history leaked')}catch(e){if(!e.message.includes('permission denied'))throw e}
await db.exec(`reset role;`);
console.log('PASS: baseline, empty-field guard, nested transcript guard, update/delete archival, truncate rejection, append-only history, client isolation');await db.close();
const ddlDb=new PGlite();
await ddlDb.exec(`create role anon;create role authenticated;create role service_role;create schema iskra_history;create table public.lessons(id uuid, content jsonb); create function public.stub() returns trigger language plpgsql as 'begin return old; end';create trigger iskra_preserve_row before delete on public.lessons for each row execute function public.stub();`);
await ddlDb.exec(fs.readFileSync(root+'/supabase/migrations/20261122031608_data_preservation_drop_guard.sql','utf8'));
await ddlDb.exec(fs.readFileSync(root+'/supabase/migrations/20261122031649_data_preservation_trigger_drop_fix.sql','utf8'));
for (const sql of ['drop table public.lessons','alter table public.lessons drop column content','drop schema iskra_history cascade','drop trigger iskra_preserve_row on public.lessons']){
 let failed=false;try{await ddlDb.exec(sql)}catch(e){if(!e.message.includes('ISKRA_DATA_PRESERVATION'))throw e;failed=true}if(!failed)throw Error('DDL not blocked '+sql);
}
await ddlDb.exec('create table public.unrelated_test(id int);drop table public.unrelated_test');
console.log('PASS: protected table/column/history/trigger DROP blocked, unrelated migration allowed');await ddlDb.close();
const coverage=new PGlite();
await coverage.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';create table public.lessons(id uuid,content jsonb);create table public.confidence_log(id int,correct boolean);insert into public.confidence_log values(1,true);`);
for (const name of ['20261122031218_data_preservation_history.sql','20261122031608_data_preservation_drop_guard.sql','20261122031649_data_preservation_trigger_drop_fix.sql',...fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('_default_data_history_coverage.sql'))])await coverage.exec(fs.readFileSync(root+'/supabase/migrations/'+name,'utf8'));
const requireBlocked=async sql=>{let ok=false;try{await coverage.exec(sql)}catch(e){if(!e.message.includes('ISKRA_DATA_PRESERVATION'))throw e;ok=true}if(!ok)throw Error('not blocked '+sql)};
if((await coverage.query(`select count(*)::int n from iskra_history.row_versions where table_name='public.confidence_log' and operation='BASELINE'`)).rows[0].n!==1)throw Error('confidence baseline missing');
await coverage.exec(`create table public.future_notes_v2(id int primary key,note text);insert into public.future_notes_v2 values(1,'original');update public.future_notes_v2 set note='edited';`);
if((await coverage.query(`select old_row->>'note' note from iskra_history.row_versions where table_name='public.future_notes_v2' and operation='UPDATE'`)).rows[0].note!=='original')throw Error('new table not archived');
await requireBlocked('truncate public.future_notes_v2');
await requireBlocked('alter table public.future_notes_v2 disable trigger all');
await requireBlocked('alter table public.future_notes_v2 enable replica trigger iskra_preserve_row');
await requireBlocked('alter table iskra_history.row_versions disable trigger history_append_only');
await requireBlocked('delete from iskra_history.protected_tables');
await coverage.exec(`set session_replication_role=replica;update public.future_notes_v2 set note='replicated';set session_replication_role=origin;`);
if((await coverage.query(`select count(*)::int n from iskra_history.row_versions where table_name='public.future_notes_v2' and operation='UPDATE'`)).rows[0].n!==2)throw Error('replica mode bypassed history');
await coverage.exec(`create table public.future_part(id int,note text) partition by range(id);create table public.future_part_1 partition of public.future_part for values from(0)to(10);insert into public.future_part values(1,'partition original');update public.future_part set note='partition edit';`);
if((await coverage.query(`select count(*)::int n from iskra_history.row_versions where table_name='public.future_part_1' and operation='UPDATE'`)).rows[0].n!==1)throw Error('partition not archived');
await requireBlocked('truncate public.future_part_1');
console.log('PASS: confidence baseline, automatic table/partition coverage, disable-trigger rejection, replica-mode preservation, protected registry');await coverage.close();
