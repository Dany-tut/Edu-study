create role anon; create role authenticated; create role service_role;
create schema auth; create schema cron;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.uid',true),'')::uuid$$;
create function public.is_admin() returns boolean language sql as $$select coalesce(current_setting('fixture.admin',true),'')='true'$$;
create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
create table public.analytics_events(id bigint generated always as identity primary key,created_at timestamptz default now(),event text,meta jsonb default '{}',ua text,path text,session_id text,user_id uuid,student_id uuid,role text);
