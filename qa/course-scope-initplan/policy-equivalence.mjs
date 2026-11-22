import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE || '/tmp/iskra-visibility-test-deps/node_modules/@electric-sql/pglite/dist/index.js').href)
const db = new PGlite()
const manifest = JSON.parse(readFileSync(new URL('./live-metadata.json', import.meta.url), 'utf8'))
const baseline = readFileSync(new URL('./baseline-helper.sql', import.meta.url), 'utf8')
const policyBaseline = readFileSync(new URL('./baseline-policies.sql', import.meta.url), 'utf8')
const policyCandidate = readFileSync(new URL('./candidate-policies.sql', import.meta.url), 'utf8')
const ident = s => '"' + s.replaceAll('"', '""') + '"'
const lit = s => "'" + s.replaceAll("'", "''") + "'"
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const rows = async (sql, params = []) => (await db.query(sql, params)).rows
await db.exec(`create role authenticated; create role anon; create role service_role;
create role supabase_auth_admin; create role dashboard_user;
create schema auth;
create table auth.mfa_factors(user_id uuid,status text);
create table public.profiles(id uuid primary key,role text);
create table public.groups(id uuid primary key,created_by uuid);
create table public.students(id uuid primary key,auth_user_id uuid,group_id uuid,created_by uuid);
create table public.courses(id uuid primary key,created_by uuid,title text,student_ids uuid[],group_ids uuid[]);
create table public.course_shares(id uuid primary key,course_id uuid,teacher_id uuid);
create table public.course_modules(id uuid primary key,course_id uuid,label text,position int);
create table public.lessons(id uuid primary key,course_id uuid,module_id uuid,short_id text,title text);
create table public.course_enrollments(id uuid primary key,course_id uuid,student_id text,created_by uuid);
create table public.course_item_visibility(id uuid primary key,course_id uuid,item_kind text,item_key text,hidden boolean);
grant usage on schema auth,public to authenticated,anon,service_role;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;`)
for (const name of ['uid', 'jwt', 'my_student_ids', 'my_group_ids', 'my_taught_group_ids', 'is_admin', 'is_staff', 'mfa_ok', 'my_course_ids']) {
  const f = manifest.functions.find(f => f.name === name)
  assert.ok(f, name)
  await db.exec(f.definition)
  const signature = `${ident(f.schema)}.${ident(name)}()`
  await db.exec(`alter function ${signature} owner to ${ident(f.owner)}; revoke all on function ${signature} from public,anon,authenticated,service_role,supabase_auth_admin,dashboard_user;`)
  for (const acl of (f.acl?.slice(1,-1).split(',') ?? ['=X/postgres'])) {
    const grantee = acl.slice(0, acl.indexOf('=')), permissions = acl.slice(acl.indexOf('=')+1, acl.indexOf('/'))
    if (permissions.includes('X')) await db.exec(`grant execute on function ${signature} to ${grantee ? ident(grantee) : 'public'}`)
  }
}
for (const policy of manifest.policies) {
  const table = `public.${ident(policy.tablename)}`
  await db.exec(`alter table ${table} enable row level security`)
  await db.exec(`create policy ${ident(policy.policyname)} on ${table} as ${policy.permissive} for ${policy.cmd}
    to ${policy.roles.map(ident).join(',')} ${policy.qual ? `using (${policy.qual})` : ''} ${policy.with_check ? `with check (${policy.with_check})` : ''}`)
}
const teacherIds = [1,2,3,4,5,6]
await db.exec(`insert into profiles values ${teacherIds.map(n=>`('${id(n)}','teacher')`).join(',')};
insert into groups values ('${id(301)}','${id(4)}'),('${id(302)}','${id(2)}'),('${id(303)}','${id(4)}');
insert into students values
('${id(201)}','${id(101)}',null,'${id(2)}'),
('${id(202)}','${id(102)}','${id(301)}','${id(4)}'),
('${id(203)}','${id(103)}',null,'${id(2)}'),
('${id(204)}','${id(104)}','${id(301)}','${id(4)}'),
('${id(205)}','${id(104)}','${id(302)}','${id(2)}'),
('${id(206)}','${id(104)}','${id(301)}','${id(4)}'),
('${id(207)}','${id(106)}',null,'${id(2)}'),
('${id(209)}','${id(107)}','${id(303)}','${id(4)}');
insert into auth.mfa_factors values('${id(1)}','verified'),('${id(2)}','unverified');`)
const cases = [
 ['owner-A',1,[],[]],['owner-B',2,[],[]],['shared',2,[],[]],['direct-student',2,[201],[]],
 ['group-student',2,[],[301]],['enrollment',2,[],[]],['taught-direct-member',2,[204],[]],
 ['taught-group-member',2,[],[303]],['taught-enrolled-member',2,[],[]],['null-arrays',2,null,null],
 ['empty-arrays',2,[],[]],['duplicate-arrays',2,[201,201],[301,301]],['foreign',5,[999],[]],
 ['unowned-null',null,null,null],['null-array-elements',2,[null],[null]],
]
const array = values => values === null ? 'null' : `array[${values.map(n=>n===null?'null':lit(id(n))).join(',')}]::uuid[]`
for (const [index,[name,owner,students,groups]] of cases.entries()) {
  const cid = id(801+index), mid = id(901+index), lid = id(1001+index)
  await db.exec(`insert into courses values('${cid}',${owner===null?'null':lit(id(owner))},${lit(name)},${array(students)},${array(groups)});
  insert into course_modules values('${mid}','${cid}','${name}',10);
  insert into lessons values('${lid}','${cid}','${mid}',${lit(name)},${lit(name)});
  insert into course_enrollments values('${id(1101+index)}','${cid}','${id(999)}',${owner===null?'null':lit(id(owner))});`)
}
await db.exec(`insert into course_shares values('${id(1201)}','${id(803)}','${id(3)}');
insert into course_enrollments values('${id(1202)}','${id(806)}','${id(203)}','${id(2)}'),('${id(1203)}','${id(809)}','${id(206)}','${id(2)}');
insert into course_item_visibility values
('${id(1301)}','${id(804)}','module','${id(904)}',true),
('${id(1302)}','${id(805)}','lesson','group-student',true),
('${id(1303)}','${id(803)}','module','${id(903)}',true);`)
const tables = ['courses','lessons','course_modules','course_enrollments']
const actors = [
 {name:'teacher-owner',uid:1,role:'teacher',aal:'aal2'},
 {name:'teacher-owner-MFA-unverified',uid:1,role:'teacher',aal:'aal1'},
 {name:'teacher-owner-no-verified-factor',uid:2,role:'teacher',aal:'aal1'},
 {name:'teacher-shared',uid:3,role:'teacher',aal:'aal2'},
 {name:'teacher-taught-groups',uid:4,role:'teacher',aal:'aal2'},
 {name:'foreign-teacher-empty-scope',uid:6,role:'teacher',aal:'aal2'},
 {name:'student-direct',uid:101,role:'student',aal:'aal1'},
 {name:'student-group',uid:102,role:'student',aal:'aal2'},
 {name:'student-enrolled',uid:103,role:'student',aal:'aal2'},
 {name:'student-multiple-rows-duplicate-group',uid:104,role:'student',aal:'aal2'},
 {name:'student-empty',uid:105,role:'student',aal:'aal2'},
 {name:'student-null-group',uid:106,role:'student',aal:'aal2'},
 {name:'student-taught-group',uid:107,role:'student',aal:'aal2'},
 {name:'admin-owner',uid:1,role:'admin',aal:'aal2'},
 {name:'admin-nonowner',uid:106,role:'admin',aal:'aal2'},
 {name:'authenticated-null-subject',uid:null,role:'student',aal:'aal1'},
 {name:'anon-null-subject',uid:null,role:null,aal:'aal1',dbRole:'anon'},
]
async function act(actor) {
  await db.exec(`reset role; set role ${actor.dbRole ?? 'authenticated'}`)
  // Synthetic test principals only. No real JWT/session is read or printed.
  await rows("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({sub:actor.uid===null?null:id(actor.uid),role:actor.dbRole??'authenticated',aal:actor.aal,app_metadata:{role:actor.role}})])
}
async function checked(sql) {
  await db.exec('savepoint policy_check')
  try {
    const result = await rows(sql)
    await db.exec('rollback to savepoint policy_check; release savepoint policy_check')
    return {ids:result.map(row=>row.id).sort()}
  } catch (error) {
    await db.exec('rollback to savepoint policy_check; release savepoint policy_check')
    return {error:error.code}
  }
}
async function matrix() {
  const results = []
  for (const actor of actors) {
    await act(actor)
    let scope
    try { scope=(await rows('select my_course_ids() ids'))[0].ids.sort() } catch(error){scope={error:error.code}}
    const policies = {}
    await db.exec('begin')
    for (const table of tables) {
      policies[table] = {select:await checked(`select id from ${table} order by id`)}
      const field = table === 'courses' || table === 'lessons' ? 'title' : table === 'course_modules' ? 'label' : 'student_id'
      policies[table].update = await checked(`update ${table} set ${field}=${field} returning id`)
      policies[table].delete = await checked(`delete from ${table} returning id`)
    }
    // Cross-owner and actor-owned WITH CHECK outcomes, each rolled back locally.
    policies.courseOwnInsert = await checked(`insert into courses values('${id(9001)}',auth.uid(),'NEW','{}','{}') returning id`)
    policies.courseForeignInsert = await checked(`insert into courses values('${id(9002)}','${id(5)}','OTHER','{}','{}') returning id`)
    policies.moduleForeignInsert = await checked(`insert into course_modules values('${id(9003)}','${id(813)}','OTHER',1) returning id`)
    policies.lessonForeignInsert = await checked(`insert into lessons values('${id(9004)}','${id(813)}','${id(913)}','new','OTHER') returning id`)
    policies.enrollmentForeignInsert = await checked(`insert into course_enrollments values('${id(9005)}','${id(813)}','${id(201)}',auth.uid()) returning id`)
    policies.courseOwnerReassign = await checked(`update courses set created_by='${id(5)}' where id='${id(801)}' returning id`)
    await db.exec('rollback')
    results.push({actor:actor.name,scope,policies})
  }
  return results
}
const properties = async () => (await rows(`select pg_get_userbyid(proowner) owner,prosecdef,provolatile,proconfig,proacl::text from pg_proc where oid='public.my_course_ids()'::regprocedure`))[0]
await db.exec('reset role')
const originalProperties=await properties()
const oldResults=await matrix()
await db.exec('reset role'); await db.exec(policyCandidate)
assert.deepEqual(await properties(),originalProperties,'Policy-only change leaves original helper owner/security/search_path/grants untouched')
const liveBody=(await rows("select pg_get_functiondef('public.my_course_ids()'::regprocedure) body"))[0].body
assert.equal(liveBody.trim(),baseline.trim(),'ORIGINAL helper body remains exactly unchanged')
const currentPolicies=await rows("select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public'")
const targets=new Set(['courses/read_all_courses','lessons/read_all_lessons','course_modules/anyone can read course_modules','course_enrollments/read_all_course_enrollments'])
let changed=0
for(const old of manifest.policies){
 const actual=currentPolicies.find(p=>p.tablename===old.tablename&&p.policyname===old.policyname)
 const expected=structuredClone(old)
 if(targets.has(old.tablename+'/'+old.policyname)){expected.qual=expected.qual.replace('unnest(my_course_ids())','unnest(( SELECT my_course_ids() AS my_course_ids))::uuid[]');changed++}
 // pg_get_expr may canonicalize parentheses/qualification; verify all other policy attributes exactly.
 for(const key of ['tablename','policyname','permissive','roles','cmd','with_check'])assert.deepEqual(actual[key],old[key],old.policyname+':'+key)
 if(!targets.has(old.tablename+'/'+old.policyname))assert.equal(actual.qual,old.qual,old.policyname+' must not change')
 else assert.ok(actual.qual.includes('SELECT my_course_ids()'),old.policyname+': explicit scalar SELECT added')
}
assert.equal(changed,4)
const newResults=await matrix()
assert.deepEqual(newResults,oldResults,'every actor and four-table read/write outcome is unchanged')
const named=Object.fromEntries(newResults.map(row=>[row.actor,row]))
const courseName = uuid => cases[Number(uuid.slice(-12))-801]?.[0]
assert.deepEqual(named['teacher-owner'].scope.map(courseName),['owner-A'])
assert.deepEqual(named['teacher-shared'].scope.map(courseName),['shared'])
assert.deepEqual(named['foreign-teacher-empty-scope'].scope,[])
assert.ok(named['teacher-taught-groups'].scope.map(courseName).includes('taught-direct-member'))
assert.ok(named['teacher-taught-groups'].scope.map(courseName).includes('taught-group-member'))
assert.ok(named['teacher-taught-groups'].scope.map(courseName).includes('taught-enrolled-member'))
assert.ok(named['student-direct'].scope.map(courseName).includes('direct-student'))
assert.ok(named['student-group'].scope.map(courseName).includes('group-student'))
assert.ok(named['student-enrolled'].scope.map(courseName).includes('enrollment'))
assert.ok(named['student-multiple-rows-duplicate-group'].scope.map(courseName).includes('taught-direct-member'))
assert.deepEqual(named['authenticated-null-subject'].scope,[])
assert.equal(named['anon-null-subject'].scope.error,'42501')
for(const table of tables)assert.deepEqual(named['teacher-owner-MFA-unverified'].policies[table].select.ids,[])
assert.ok(named['student-direct'].policies.courses.select.ids.includes(id(804)))
assert.equal(named['student-direct'].policies.course_modules.select.ids.includes(id(904)),false,'hidden module denied to assigned student')
assert.equal(named['student-group'].policies.lessons.select.ids.includes(id(1005)),false,'hidden lesson denied to group student')
assert.ok(named['teacher-shared'].policies.course_modules.select.ids.includes(id(903)),'shared teacher retains hidden module')
assert.equal(named['admin-nonowner'].policies.courses.select.ids.length,cases.length,'admin read policy unchanged')

// LOCAL counters only. Matrix above used the exact original function bodies.
// Instrumentation is added only for a separate planning/evaluation-topology pass.
await db.exec('reset role; create schema scope_probe')
const counted=['uid','my_student_ids','my_group_ids','my_taught_group_ids','my_course_ids']
for(const name of counted)await db.exec(`create sequence scope_probe.${name}; grant usage,select on sequence scope_probe.${name} to authenticated,anon`)
await db.exec('grant usage on schema scope_probe to authenticated,anon')
for(const name of counted){
 const f=manifest.functions.find(f=>f.name===name),definition=f.definition
 const delimiter=definition.match(/AS (\$[^$]*\$)/)[1]
 const body=definition.slice(definition.indexOf(delimiter)+delimiter.length,definition.lastIndexOf(delimiter)).trim().replace(/;$/,'')
 const profiled=definition.replace(body,`with count_call as materialized (select nextval('scope_probe.${name}') n) select value from (${body}) actual(value) cross join count_call where count_call.n>0`)
 await db.exec(profiled)
}
async function counters(){
 const result={}
 for(const name of counted){const row=(await rows(`select last_value,is_called from scope_probe.${name}`))[0];result[name]=row.is_called?Number(row.last_value):0}
 return result
}
const difference=(a,b)=>Object.fromEntries(counted.map(name=>[name,a[name]-b[name]]))
async function profile(policy){
 await db.exec('reset role');await db.exec(policy)
 const result=[]
 for(const actor of [actors[4],actors[0],actors[9],actors[5],actors[13]]){
  await db.exec('reset role; deallocate all; prepare scope_policy_query as select id from public.lessons order by id')
  for(const name of counted)await db.exec(`alter sequence scope_probe.${name} restart with 1`)
  await act(actor)
  await rows('explain (format json) execute scope_policy_query')
  const plan=await counters()
  const visible=(await rows('execute scope_policy_query')).map(r=>r.id)
  const after=await counters()
  const visibleAgain=(await rows('execute scope_policy_query')).map(r=>r.id)
  const twice=await counters()
  assert.deepEqual(visibleAgain,visible)
  assert.ok(twice.my_course_ids>=after.my_course_ids)
  const nextActor=actor.uid===1?actors[9]:actors[0]
  await act(nextActor)
  const changedActor=(await rows('execute scope_policy_query')).map(r=>r.id)
  const expectedActor=newResults.find(r=>r.actor===nextActor.name).policies.lessons.select.ids
  assert.deepEqual(changedActor,expectedActor,'same prepared plan must recheck current actor without permission caching')
  result.push({actor:actor.name,planOnly:plan,firstExecution:difference(after,plan),secondExecution:difference(twice,after),visibleCount:visible.length})
 }
 return result
}
const oldCounters=await profile(policyBaseline),newCounters=await profile(policyCandidate)
assert.deepEqual(newCounters.map(r=>r.visibleCount),oldCounters.map(r=>r.visibleCount))
assert.ok(newCounters.some((r,i)=>r.planOnly.my_course_ids<oldCounters[i].planOnly.my_course_ids),'Policy candidate must reduce planner evaluation in at least one controlled case')
const output={scope:'LOCAL policy-only comparison, ORIGINAL my_course_ids semantics, four-table policies + unchanged direct visibility/share dependencies',actors:actors.length,policyComparisons:actors.length*(tables.length*3+6),sourceFunctionProperties:originalProperties,changedPolicies:4,policyCases:newResults,oldCounters,newCounters,productionTimingClaim:false}
writeFileSync(process.env.ISKRA_SCOPE_QA_RESULT || '/tmp/iskra-course-scope-policy-equivalence-results.json',JSON.stringify(output,null,2)+'\n')
console.log('PASS course-scope policy-only: '+actors.length+' actors, '+output.policyComparisons+' read/write comparisons, four SELECT wrappers, original helper/roles/WITH CHECK unchanged, planner evaluations reduced, runtime scope and prepared-plan actor freshness preserved; not HTTP timing')
await db.close()
