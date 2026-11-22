import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const file=resolve('qa/course-atomic-save/database.mjs')
const source=readFileSync(file,'utf8')
const fixture=source.slice(0,source.indexOf('await as(owner)'))
const probeFile=process.env.COURSE_PROBE_MIGRATION || 'supabase/migrations/20261122100928_course_content_qa_probe.sql'
const sql=readFileSync(probeFile,'utf8').replaceAll('00e3a0efbf','qa-course').replaceAll('1eaf6264-0a38-41f7-bd53-4a404764393f','11111111-1111-4111-8111-111111111111')
const tests=`
await db.exec(${JSON.stringify(sql)});
await as(owner);
lessons=Array.from({length:80},(_,i)=>({...lesson('qa-'+i,i%2?modB:modA),position:i,lesson_number:i}));
const probe=async({key='qa-course',baseline=stamp,mods=modules,data=lessons,courseFields=fields,changes={}}={})=>(await rows('select save_course_content_probe_20261122($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb) result',[key,baseline,JSON.stringify(courseFields),JSON.stringify(mods),JSON.stringify(data),JSON.stringify(changes)]))[0].result;
let result=await probe();stamp=result.stamp;assert.equal(result.lessons.length,80);
async function snapshot(){await db.exec('reset role');return JSON.stringify(await rows("select jsonb_build_object('courses',(select jsonb_agg(to_jsonb(c) order by id) from courses c),'lessons',(select jsonb_agg(to_jsonb(l) order by id) from lessons l),'modules',(select jsonb_agg(to_jsonb(m) order by id) from course_modules m),'enrollments',(select jsonb_agg(to_jsonb(e)) from course_enrollments e),'history',(select count(*) from changes)) data"))}
async function denied(actor,opts,pattern,mfa='on'){
 const before=await snapshot();
 if(actor==='anon')await db.exec('set role anon');else await as(actor,mfa);
 await assert.rejects(probe(opts),pattern);
 assert.equal(await snapshot(),before,'probe denial must leave all data/stamps/history unchanged');
 await as(owner);
}
await denied(other,{},/QA probe scope denied/);
await denied('',{},/QA probe scope denied/);
await denied('anon',{},/permission denied/);
await denied(owner,{key:'foreign-course'},/QA probe scope denied/);
await denied(owner,{key:null},/QA probe scope denied/);
await denied(owner,{courseFields:{...fields,status:'published'}},/QA probe requires an unassigned draft/);
await denied(owner,{changes:{students:{[other]:true}}},/QA probe requires an unassigned draft/);
await denied(owner,{changes:{modes:{[other]:'full'}}},/QA probe requires an unassigned draft/);
await denied(owner,{changes:{unexpected:true}},/QA probe requires an unassigned draft/);
await denied(owner,{},/Course not found or not owned/,'off');
await db.exec('reset role');await rows("update courses set group_ids=array['"+other+"'::uuid] where id='"+course+"'");
await denied(owner,{},/QA probe requires an unassigned draft/);
await db.exec('reset role');await rows("update courses set group_ids='{}' where id='"+course+"'");
await rows("insert into course_enrollments(course_id,student_id,access_mode,created_by) values('"+course+"','"+other+"','custom','"+owner+"')");
await denied(owner,{},/QA probe requires no enrollments/);
await db.exec('reset role');await rows("delete from course_enrollments where course_id='"+course+"'");
await rows("update courses set status='published' where id='"+course+"'");
await denied(owner,{},/QA probe requires an unassigned draft/);
console.log('PASS actual restricted probe SQL: allowed owner QA80; foreign/null course, foreign/no owner, anon, MFA, publication, authoritative audience/enrollments, grant/mode/unknown intents all denied before writes; full snapshot/history unchanged');
await db.close();
`
mkdirSync('node_modules/.cache',{recursive:true})
const output=resolve('node_modules/.cache/course-probe-authority.mjs')
writeFileSync(output,(fixture+tests).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(file).href)))
await import(pathToFileURL(output))
