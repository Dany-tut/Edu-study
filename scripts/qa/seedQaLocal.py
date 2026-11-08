"""Наполняет ЛОКАЛЬНУЮ QA-базу (127.0.0.1:54321): учитель, ученик, группа, курс с 3 уроками и ДЗ.
Пароли генерируются здесь и пишутся только в .env.local основной папки (без вывода на экран).
"""
import urllib.error, json, secrets, string, sys, uuid, datetime, urllib.request, re

API = 'http://127.0.0.1:54321'
SR = sys.argv[1]           # local service_role key
COURSE = json.load(open(sys.argv[2]))
ENV = sys.argv[3]          # path to .env.local
assert API.startswith('http://127.0.0.1')

def call(method, path, body=None, prefer=None):
    req = urllib.request.Request(API + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={'apikey': SR, 'Authorization': 'Bearer ' + SR, 'Content-Type': 'application/json',
                 **({'Prefer': prefer} if prefer else {})})
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode()
            return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {path} -> {e.code}: {e.read().decode()[:400]}')

def pw():
    a = string.ascii_letters + string.digits
    return ''.join(secrets.choice(a) for _ in range(14)) + '7a'

t_email, t_pw = 'qa-teacher@iskra.test', pw()
s_email, s_pw = 'test-qa-0001@uchenik.iskra', pw()

teacher = call('POST', '/auth/v1/admin/users', {'email': t_email, 'password': t_pw, 'email_confirm': True,
    'app_metadata': {'role': 'teacher'}, 'user_metadata': {'name': 'Тест QA', 'first_name': 'Тест', 'last_name': 'QA', 'subject': 'Корейский'}})
tid = teacher['id']
call('PATCH', f'/rest/v1/profiles?id=eq.{tid}', {'subjects': ['korean'], 'role': 'teacher'})

gid = str(uuid.uuid4())
call('POST', '/rest/v1/groups', {'id': gid, 'name': 'QA-группа', 'subject': 'Корейский', 'created_by': tid,
    'start_date': datetime.date.today().isoformat(), 'total_lessons': 3})

sid = str(uuid.uuid4())
call('POST', '/rest/v1/students', {'id': sid, 'group_id': gid, 'name': 'Тест QA', 'created_by': tid, 'person_id': sid,
    'started_at': datetime.date.today().isoformat()})
student = call('POST', '/auth/v1/admin/users', {'email': s_email, 'password': s_pw, 'email_confirm': True,
    'user_metadata': {'role': 'student', 'name': 'Тест QA'}})
call('PATCH', f'/rest/v1/students?id=eq.{sid}', {'auth_user_id': student['id'], 'email': s_email})

c = COURSE['course']; cid = str(uuid.uuid4())
course = {k: v for k, v in c.items() if k in ('kind', 'title', 'subject', 'level', 'description', 'color', 'bg')}
course.update({'short_id': 'qa-kohg-0001', 'id': cid, 'title': 'QA · ' + c['title'], 'status': 'published', 'created_by': tid, 'group_ids': [gid], 'student_ids': [],
               'published_at': datetime.datetime.now(datetime.timezone.utc).isoformat()})
call('POST', '/rest/v1/courses', course)
mod_map = {}
for m in COURSE['modules'] or []:
    nid = str(uuid.uuid4()); mod_map[m['id']] = nid
    call('POST', '/rest/v1/course_modules', {'id': nid, 'course_id': cid, 'label': m['label'], 'position': m['position']})
keep = ('title', 'position', 'youtube_url', 'description', 'materials', 'shape', 'lesson_number', 'content', 'timecodes', 'kind',
        'test_tasks', 'homework', 'delivery_mode')
today = datetime.date.today()
for i, l in enumerate(COURSE['lessons']):
    lid = str(uuid.uuid4())
    row = {k: l.get(k) for k in keep}
    row.update({'short_id': f'qa-kohg-0001-{i}', 'id': lid, 'course_id': cid, 'module_id': mod_map.get(l.get('module_id'))})
    call('POST', '/rest/v1/lessons', row)
    d = today + datetime.timedelta(days=i - 1)
    call('POST', '/rest/v1/schedule_lessons', {'group_id': gid, 'date': d.isoformat(), 'time_start': '18:00', 'time_end': '19:00',
        'subject': 'Корейский', 'lesson_title': l['title'], 'lesson_number': l.get('lesson_number') or i + 1, 'lesson_id': lid,
        'status': 'completed' if i == 0 else 'upcoming'})
try:
    call('POST', '/rest/v1/rpc/seed_student_progress', {'p_student_id': sid, 'p_group_id': gid})
except Exception as e:
    print('seed_student_progress:', e)

block = ('\n# --- QA: ТОЛЬКО ЛОКАЛЬНАЯ база (supabase start, 127.0.0.1:54321). На проде этих аккаунтов нет. ---\n'
         f'QA_SUPABASE_URL=http://127.0.0.1:54321\n'
         f'QA_TEACHER_EMAIL={t_email}\nQA_TEACHER_PASSWORD={t_pw}\n'
         f'QA_STUDENT_LOGIN={s_email}\nQA_STUDENT_PASSWORD={s_pw}\n')
src = open(ENV).read()
src = re.sub(r'\n# --- QA: .*?(?=\n# ---(?! QA)|\Z)', '', src, flags=re.S)
src = re.sub(r'^QA_[A-Z_]+=.*\n?', '', src, flags=re.M)
open(ENV, 'w').write(src.rstrip('\n') + '\n' + block)
print(json.dumps({'teacher': tid, 'group': gid, 'student': sid, 'course': cid, 'lessons': len(COURSE['lessons'])}))
