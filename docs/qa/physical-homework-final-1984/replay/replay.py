"""Physical ordinary-UI replay. Run only after scenario/signature/fixture preflight.
No API writes/session injection. Fresh fixture seeding is a separate explicit step.
"""
import argparse,json,pathlib,time,urllib.request,subprocess,os,re
ap=argparse.ArgumentParser();ap.add_argument('stage',choices=['student-first','student-first-resume','teacher-return','student-retry','teacher-accept','student-final','student-b','student-b-resume']);ap.add_argument('--fixture-root',required=True);ap.add_argument('--candidate-sha',required=True);ap.add_argument('--allow-device',action='store_true');args=ap.parse_args()
r=pathlib.Path(args.fixture_root);assert str(r).startswith('/tmp/iskra-')
assert args.allow_device,'Device action is opt-in after parent gives final window'
f=json.loads((r/'fixture-private.json').read_text());labels=f['casesLabel'];title=labels['A']['title'];student=labels['A']['studentName'];other=labels['B']['title'];log=r/'replay-commands.jsonl'

def call(c):
 with log.open('a') as h:h.write(json.dumps({'sha':args.candidate_sha,'stage':args.stage,**c},ensure_ascii=False)+'\n')
 req=urllib.request.Request('http://127.0.0.1:18082/command',data=json.dumps(c).encode(),headers={'Content-Type':'application/json'},method='POST')
 out=json.load(urllib.request.urlopen(req,timeout=80));assert out.get('ok')=='true' or c.get('required')=='false',(c.get('command'),out.get('reason'))
 return out

def probe(label,kind='action',contains=False):return call({'command':'probe','type':kind,'label':label,**({'match':'contains'} if contains else {})})

def target(label,kind='action',contains=False,nav=False,timeout=30):
 until=time.monotonic()+timeout
 while True:
  p=probe(label,kind,contains)
  if p.get('exists')=='true':break
  assert time.monotonic()<until,'Missing UI target '+label;time.sleep(.25)
 # A label may exist above/below viewport. Scroll towards the actual frame, rather
 # than blindly swiping up; isHittable alone proved insufficient behind bottomnav.
 for attempt in range(12):
  if attempt:p=probe(label,kind,contains)
  if p.get('exists')!='true' or p.get('enabled')!='true':time.sleep(.3);continue
  assert 'frameY' in p,'Build runner with QA-only frame probes before replay'
  y,bottom,navtop=map(float,[p['frameY'],p['frameBottom'],p['navTop']])
  if p.get('hittable')=='true' and (nav or (y>=72 and bottom<=navtop-8)):return
  direction='down' if y<72 else 'up'
  call({'command':'swipe','direction':direction})
 raise AssertionError('No safe above-nav frame for '+label)

def tap(label,kind='action',contains=False,nav=False):
 target(label,kind,contains,nav);call({'command':'tap','type':kind,'label':label,**({'match':'contains'}if contains else {})})
def done():
 p=probe('Done','button')
 if p.get('hittable')=='true':call({'command':'tap','type':'button','label':'Done'})
def fill(label,value=None,secret=None,kind='textField'):
 target(label,kind);call({'command':'type','type':kind,'label':label,'clear':'1','verify':'1',**({'secretKey':secret}if secret else {'text':value})})
def snap(name,required=(),absent=()):
 end=time.monotonic()+25
 while True:
  out=call({'command':'snapshot','name':name});ax=out.get('ax','')
  for x in absent:assert x not in ax,'Foreign context '+x
  if all(x in ax for x in required):break
  assert time.monotonic()<end,'Loaded expected context did not converge: '+name
  time.sleep(.3)
 # A separate screenshot after confirmed loaded AX prevents skeleton proof.
 call({'command':'snapshot','name':name+'-loaded'});return ax

def consent_ready():
 end=time.monotonic()+60;absent_since=None
 while time.monotonic()<end:
  if probe('Согласен(а) на обработку данных.').get('exists')=='true':
   absent_since=None
   ax=call({'command':'snapshot','name':'consent-checkbox-state'})['ax']
   line=next((x for x in ax.splitlines() if 'Switch,' in x and "label: 'Согласен(а) на обработку данных.'" in x),'')
   checked=re.search(r'value: ([01])',line)
   if not checked:continue
   if checked.group(1)=='0':tap('Согласен(а) на обработку данных.')
   call({'command':'tap','label':'Принимаю и продолжаю','required':'false'})
  else:
   absent_since=absent_since or time.monotonic()
   if time.monotonic()-absent_since>=3 and probe('Дневник').get('exists')=='true':return
  time.sleep(.3)
 raise AssertionError('Consent gate did not settle; no attempt to bypass it')

def login(role,account,initial=False):
 rolelabel='Я ученик' if role=='student' else 'Я препод'
 if initial or probe(rolelabel,contains=True).get('exists')=='true':tap(rolelabel,contains=True)
 fill('Email',secret=account+'Email');tap('Показать пароль');fill('Пароль',secret=account+'Password');tap('Скрыть пароль');done();tap('Войти')
 if role=='student':
  for _ in range(80):
   if probe('Согласен(а) на обработку данных.').get('exists')=='true' or probe('Дневник').get('exists')=='true':break
   time.sleep(.25)
  consent_ready();target('Дневник',nav=True)
 else:target('Журнал',nav=True)
 # Transport must produce a verified auth/user actor marker after the real login.
 expected=f['cases']['A' if account.endswith('A') else 'B']['studentAuthId' if role=='student' else 'teacherId']
 actor=json.loads((r/'last-verified-actor.json').read_text());assert actor['userId']==expected and actor['authViaUI'] is True

def logout(role):
 started=int(time.time()*1000);tap('Профиль' if role=='student' else 'Ещё',nav=True);tap('Выйти из аккаунта');
 # Final student fix must land directly on login form, no teacher-profile workaround.
 target('Я ученик',contains=True) if role=='student' else target('Email','textField')
 assert probe('Выйти из аккаунта').get('exists')!='true'
 proof=json.loads((r/'last-logout.json').read_text());assert proof['method']=='POST' and proof['status'] in [200,204] and proof['timestamp']>=started,'Real awaited logout POST must finish before login form'
 expected=f['cases']['B' if args.stage.startswith('student-b') else 'A']['studentAuthId' if role=='student' else 'teacherId'];assert proof['userId']==expected
 proof.update(sha=args.candidate_sha,stage=args.stage,expectedActorMatched=True);(r/(args.stage+'-logout-proof.json')).write_text(json.dumps(proof,indent=2))
 snap('normal-'+role+'-logout-signed-out',('С чего начнём?',) if role=='student' else ('Email',),['QA Final Homework'])

def change_role(role):
 if probe('Выбрать роль').get('exists')=='true':tap('Выбрать роль')
 tap('Я ученик' if role=='student' else 'Я препод',contains=True)
 target('Email','textField');assert probe('Журнал').get('exists')!='true','No teacher cabinet without fresh teacher Auth'
def diary(title_to_open,mode='Задания'):
 tap('Дневник',nav=True);tap(mode)
 if mode=='Задания':tap(title_to_open,'button',True)
 else:tap('Зачтено · История попыток · '+title_to_open,'other')
def submit(answer):
 fill('Впиши слово или фразу…','6',kind='textView');done();fill('Развёрнутый ответ…',answer,kind='textView');done();tap('Сдать домашку');target('Продолжить');snap('submitted-confirmation',('Отправлено на проверку',));tap('Продолжить')
def server_phase(phase):
 env=os.environ.copy();env['QA_FIXTURE_ROOT']=str(r);env['QA_REQUIRE_WRITE_ACTOR']='1'
 subprocess.run(['node',str(pathlib.Path(__file__).with_name('verify_phase.mjs')),phase],env=env,check=True)
def teacher_open(answer):
 tap('Журнал',nav=True);tap(title,'button',True);snap('teacher-exact-assignment-attempt',(title,student,answer),[other])
 # Before every verdict require signed actor proof and exact owner-homework ref.
 actor=json.loads((r/'last-verified-actor.json').read_text());assert actor['userId']==f['cases']['A']['teacherId']
 env=os.environ.copy();env['QA_FIXTURE_ROOT']=str(r);env['QA_CANDIDATE_SHA']=args.candidate_sha;subprocess.run(['node',str(pathlib.Path(__file__).with_name('verify_context.mjs'))],env=env,check=True)
 context=json.loads((r/'last-verified-write-context.json').read_text());assert context['studentId']==f['cases']['A']['studentId'] and context['lessonRef']==f['cases']['A']['ref']

if args.stage in ['student-first','student-first-resume']:
 if args.stage=='student-first':login('student','studentA',True)
 else:consent_ready()
 diary(title);snap('studentA-loaded-start',(title,'Маркер A'),[other]);fill('Впиши слово или фразу…','6',kind='textView');done();fill('Развёрнутый ответ…','qaanswerafirst',kind='textView');done();position=probe('Развёрнутый ответ…','textView');assert position.get('hittable')=='true' and float(position['frameY'])>=72 and float(position['frameBottom'])<=float(position['navTop'])-8,'Keyboard dismiss must keep the long answer visible; no reset to page start';snap('studentA-draft-after-done',('qaanswerafirst',));call({'command':'cold'});diary(title);call({'command':'assertValue','type':'textView','label':'Впиши слово или фразу…','text':'6'});call({'command':'assertValue','type':'textView','label':'Развёрнутый ответ…','text':'qaanswerafirst'});tap('Сдать домашку');target('Продолжить');tap('Продолжить');server_phase('submitted');logout('student');change_role('teacher')
elif args.stage=='teacher-return':
 login('teacher','teacherA');teacher_open('qaanswerafirst');fill('Комментарий','qareturna',kind='textView');done();tap('Вернуть на доработку');server_phase('returned');logout('teacher');change_role('student')
elif args.stage=='student-retry':
 login('student','studentA');diary(title);snap('studentA-returned',(title,'qareturna','Возвращено'));tap('Пройти заново');submit('qaansweracorrected');server_phase('resubmitted');logout('student');change_role('teacher')
elif args.stage=='teacher-accept':
 login('teacher','teacherA');teacher_open('qaansweracorrected');fill('Итоговый результат, %','90');done();fill('Комментарий','qaaccepta',kind='textView');done();tap('Принять работу');server_phase('accepted');logout('teacher');change_role('student')
elif args.stage=='student-final':
 login('student','studentA');diary(title,'Журнал работ');snap('studentA-history',(title,'Попытка 1','Попытка 2','qareturna','qaaccepta','90%'),[other]);tap('Открыть работу');snap('studentA-accepted-answer',(title,'qaansweracorrected','ДЗ зачтено · 90%'));logout('student')
elif args.stage in ['student-b','student-b-resume']:
 if args.stage=='student-b':login('student','studentB')
 else:consent_ready()
 tap('Дневник',nav=True);tap('Задания');snap('studentB-own-list',(other,),[title]);tap(other,'button',True);target('Впиши слово или фразу…','textView');snap('studentB-blank-work',(other,'Маркер B'),[title,'qaanswerafirst','qaansweracorrected','qareturna','qaaccepta']);logout('student')
print('Physical UI stage complete:',args.stage)
