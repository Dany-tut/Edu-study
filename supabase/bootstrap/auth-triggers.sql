CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER trg_sync_student_last_visit AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION sync_student_last_visit();
