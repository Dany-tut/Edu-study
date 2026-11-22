import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const file=resolve('qa/course-atomic-save/database.mjs')
const source=readFileSync(file,'utf8')
const fixture=source.slice(0,source.indexOf('await as(owner)'))
const tests="await db.exec(readFileSync(new URL('../../supabase/migrations/20261122103014_course_legacy_conflict_http.sql',import.meta.url),'utf8'));\nawait as(owner);\nconst before=JSON.stringify(await rows('select to_jsonb(c) data from courses c order by id'));\nawait assert.rejects(save({baseline:'2000-01-01Z'}),e=>{assert.equal(e.code,'PGRST');const body=JSON.parse(e.message);assert.equal(body.code,'40001');assert.ok(body.message.startsWith('ISKRA_COURSE_CONFLICT:'));assert.deepEqual(JSON.parse(e.detail),{status:409,headers:{}});return true});\nassert.equal(JSON.stringify(await rows('select to_jsonb(c) data from courses c order by id')),before);\nconsole.log('PASS legacy CAS: SQL PGRST avoids retry; HTTP409 body keeps40001/prefix for cached clients; no writes');await db.close();\n"
mkdirSync('node_modules/.cache',{recursive:true})
const output=resolve('node_modules/.cache/course-legacy-conflict.mjs')
writeFileSync(output,(fixture+tests).replaceAll('import.meta.url',JSON.stringify(pathToFileURL(file).href)))
await import(pathToFileURL(output))
