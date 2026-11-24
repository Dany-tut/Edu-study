-- Testly now pings Iskra the moment a teacher grades (Testly trigger
-- testly_iskra_on_grade → testly-sync). The sweep stays only as a safety net
-- for lost pings, so once an hour is enough.
select cron.alter_job(jobid, schedule := '17 * * * *') from cron.job where jobname = 'testly-sweep';
