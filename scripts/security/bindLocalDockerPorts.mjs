// Supabase CLI publishes HostIp=""; explicitly recreate ONLY this disposable
// project's published containers with loopback bindings, preserving named volumes.
import { execFileSync } from 'node:child_process'
import http from 'node:http'
const project='iskra-local-security'
const socket=execFileSync('docker',['context','inspect','--format','{{.Endpoints.docker.Host}}'],{encoding:'utf8'}).trim().replace('unix://','')
async function api(method,path,body) {
 return new Promise((resolve,reject)=>{
  const req=http.request({socketPath:socket,path,method,headers:{'Content-Type':'application/json'}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{if(res.statusCode>=400)return reject(Error(`Docker ${method} ${path}: HTTP ${res.statusCode}`));resolve(data?JSON.parse(data):{})})});req.on('error',reject);if(body)req.write(JSON.stringify(body));req.end()
 })
}
for(const prefix of ['supabase_db_','supabase_kong_','supabase_inbucket_']) {
 const name=prefix+project
 const original=await api('GET',`/containers/${name}/json`)
 const host=original.HostConfig
 if(Object.values(host.PortBindings??{}).flat().every(p=>p.HostIp==='127.0.0.1'))continue
 for(const [port,bindings] of Object.entries(host.PortBindings??{}))host.PortBindings[port]=[...new Map(bindings.map(p=>[p.HostPort,{...p,HostIp:'127.0.0.1'}])).values()]
 const networking={EndpointsConfig:Object.fromEntries(Object.entries(original.NetworkSettings.Networks).map(([key,value])=>[key,{Aliases:value.Aliases,IPAMConfig:value.IPAMConfig}]))}
 // Kong's generated TLS/config files live in its writable layer, not a volume.
 // Preserve that layer in a temporary LOCAL image before recreation.
 if(prefix==='supabase_kong_') {
  const committed=await api('POST',`/commit?container=${name}&pause=false`)
  original.Config.Image=committed.Id
 }
 await api('POST',`/containers/${name}/stop?t=15`)
 await api('DELETE',`/containers/${name}`)
 await api('POST',`/containers/create?name=${name}`,{...original.Config,HostConfig:host,NetworkingConfig:networking})
 await api('POST',`/containers/${name}/start`)
 console.log(`Recreated ${name}: loopback only, existing volumes and limits preserved`)
}
