-- Frequency and the admin report concept await explicit user selection.
select cron.unschedule(jobid) from cron.job where jobname='iskra-transcript-corrections-review';
