// Synthetic local Storage backup/restore with byte-for-byte validation.
import {createClient} from '@supabase/supabase-js'
import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs'
import {randomUUID,createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const root=process.env.ISKRA_LOCAL_DIR||'/tmp/iskra-local-security',cfg=JSON.parse(readFileSync(root+'/status.json','utf8'));assert.equal(new URL(cfg.API_URL).hostname,'127.0.0.1')
const c=createClient(cfg.API_URL,cfg.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
async function ok(p){const r=await p;if(r.error)throw r.error;return r.data}
const rows=JSON.parse(execFileSync('docker',['exec','supabase_db_iskra-local-security','psql','-U','postgres','-d','postgres','-Atc',"select coalesce(json_agg(json_build_object('bucket',bucket_id,'name',name)),'[]'::json) from storage.objects where bucket_id='homework-photos'"],{encoding:'utf8'}))
assert.ok(rows.length,'Need synthetic photo fixtures from the HTTP matrix')
const target='qa-restore-'+randomUUID().slice(0,8),folder=root+'/synthetic-storage-backup';mkdirSync(folder,{recursive:true});chmodSync(folder,0o700)
const manifest=[];let created=false
try{
 await ok(c.storage.createBucket(target,{public:false}));created=true
 for(const [i,row] of rows.entries()){
  const blob=await ok(c.storage.from(row.bucket).download(row.name)),bytes=Buffer.from(await blob.arrayBuffer()),sha=createHash('sha256').update(bytes).digest('hex'),file=`object-${i}.bin`
  writeFileSync(folder+'/'+file,bytes,{mode:0o600});manifest.push({...row,file,sha256:sha,bytes:bytes.length})
  await ok(c.storage.from(target).upload(file,bytes,{contentType:blob.type||'application/octet-stream',upsert:false}))
  const restored=await ok(c.storage.from(target).download(file));assert.equal(createHash('sha256').update(Buffer.from(await restored.arrayBuffer())).digest('hex'),sha)
 }
 writeFileSync(folder+'/manifest.json',JSON.stringify(manifest,null,2),{mode:0o600})
 writeFileSync(root+'/evidence/storage-restore.json',JSON.stringify({status:'PASS',scope:'Synthetic localhost homework photos, downloaded backup bytes and restored into a new private temporary bucket; hash validation',objects:manifest.length,totalBytes:manifest.reduce((n,r)=>n+r.bytes,0),productionModified:false},null,2))
 console.log(`PASS: ${manifest.length} synthetic Storage objects backed up and restored byte-for-byte`)
}finally{if(created){await ok(c.storage.emptyBucket(target));await ok(c.storage.deleteBucket(target))}}
