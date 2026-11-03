-- Pin the three legacy pure schedule helpers reported by the security advisor.
-- pg_temp is explicit and last so caller temp objects cannot shadow app helpers.
alter function public._hhmm_diff(text,text)
  set search_path to pg_catalog, public, extensions, pg_temp;
alter function public._hhmm_plus(text,integer)
  set search_path to pg_catalog, public, extensions, pg_temp;
alter function public._schedule_label(date,text)
  set search_path to pg_catalog, public, extensions, pg_temp;
