import { execFileSync } from 'node:child_process'
import { readFileSync, appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import postcss from 'postcss'

const CSS = 'src/components/teacher/localTranscription.css'
const cosmetic = new Set(['--segmented-track-radius','--segmented-item-radius','--segmented-item-flex','gap','column-gap','row-gap','width','min-width','padding-inline','text-align'])
// Only this independently exercised PC header has a short suite. Unknown changes fail closed.
function partition(css) {
  const root = postcss.parse(css), local = [], rest = []
  for (const node of root.nodes) {
    if (node.type === 'comment') continue
    const allowed = node.type === 'rule' && /^\[data-platform=["']?pc["']?\] \.chapter-header(?:--modes|-modes)(?: \.chapter-header-(?:title|modes|clock)| \.chapter-count| \[role=["']?tab["']?\])?$/.test(node.selector)
      && node.nodes.every(d => d.type === 'comment' || (d.type === 'decl' && cosmetic.has(d.prop) && !/[{};]|url\s*\(|expression\s*\(|@import/i.test(d.value)))
    const normalized = node.toString()
    ;(allowed ? local : rest).push(normalized)
  }
  return {local,rest}
}
export function classify({files,before,after,manual=false}) {
  if(manual || !files.includes(CSS) || files.some(p=>p!==CSS && p!=='public/version.json' && !/^docs\/qa\/[^/]+\.md$/.test(p)))return 'full'
  try {
    const a=partition(before),b=partition(after)
    return JSON.stringify(a.rest)===JSON.stringify(b.rest) && JSON.stringify(a.local)!==JSON.stringify(b.local) ? 'chapter-ui' : 'full'
  } catch {return 'full'}
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
export function scopeFromGit({event={},eventName='',ref='',head='HEAD',base:explicitBase}={}) {
  if(eventName==='workflow_dispatch')return 'full'
  let base=explicitBase
  if(!base){
    if(eventName==='push' && ref==='refs/heads/main')base=event.before
    else base=git('merge-base','origin/main',head)
  }
  if(!/^[a-f0-9]{40}$/.test(base??'') || /^0+$/.test(base))return 'full'
  git('merge-base','--is-ancestor',base,head)
  // Whole branch diff, never just its last commit; a rename/deletion is not cosmetic.
  const changes=git('diff','--name-status','--no-renames',base,head).split('\n').filter(Boolean)
  if(changes.some(line=>!/^M\t|^A\tdocs\/qa\//.test(line)))return 'full'
  const files=changes.map(line=>line.split('\t')[1])
  return classify({files,before:git('show',`${base}:${CSS}`),after:git('show',`${head}:${CSS}`)})
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  let scope='full'
  try {scope=scopeFromGit({event:JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')),eventName:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF})}catch(error){console.log('Full suite: cannot prove cosmetic scope:',error.message)}
  console.log(`CI scope: ${scope}`)
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`scope=${scope}\n`)
}
