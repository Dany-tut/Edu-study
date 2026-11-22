-- The proposed native SQL reader inherited provider PUBLIC write privileges.
-- Retire this unused identity; the server exporter uses no SQL login on the VPS.
alter role iskra_server_backup nologin password null;
revoke pg_read_all_data from iskra_server_backup;
alter role iskra_server_backup nobypassrls;
