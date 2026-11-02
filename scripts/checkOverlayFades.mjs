import assert from 'node:assert/strict'
import { build } from 'esbuild'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
const result=await build({entryPoints:['src/lib/dropdownPosition.ts'],bundle:true,platform:'node',format:'esm',write:false})
mkdirSync('node_modules/.cache',{recursive:true});writeFileSync('node_modules/.cache/dropdown-position-check.mjs',result.outputFiles[0].text)
const {dropdownPosition:position}=await import('../node_modules/.cache/dropdown-position-check.mjs')
for(const width of [320,390,1280,1440]) for(const height of [320,520,740,900]) for(const top of [8,height/2,height-44]) for(const left of [0,width-24]) for(const menuWidth of [100,320,900]){
 const p=position({left,top,bottom:top+36,width:180},{width,height},284,menuWidth)
 assert.ok(p.left>=8&&p.left+p.width<=width-8)
 assert.ok(p.maxHeight>=0&&p.maxHeight<=height-16)
 const start=p.up?height-p.bottom-p.maxHeight:p.top
 assert.ok(start>=8-0.001&&start+p.maxHeight<=height-8+0.001,JSON.stringify({width,height,top,p}))
}
const read=p=>readFileSync(p,'utf8')
assert.match(read('src/components/Modal.tsx'),/<FadeText lines=\{2\}/)
assert.match(read('src/components/MobileSheet.tsx'),/<FadeText lines=\{2\}/)
for(const path of ['src/components/teacher/TeacherSelect.tsx','src/components/teacher/SubjectPicker.tsx','src/components/MultiSelectField.tsx','src/components/NotificationPopup.tsx'])assert.ok(read(path).includes('viewportDropdownPosition'),path+' must stay within the viewport')
assert.match(read('src/components/MultiSelectField.tsx'),/aria-label=\{`\$\{t\('Удалить'\)\}/)
assert.match(read('src/components/NotificationPopup.tsx'),/fadeMode="mask"/)
assert.match(read('src/components/teacher/TeacherSelect.tsx'),/marginRight: editable && onDeleteOption \? 28 : 0/,'Editable rows must reserve space for the delete action')
console.log('Overlay fades: 288 narrow/short/edge positioning cases, fixed-action and shared-title integration passed')
// Explicit icons/actions must be siblings of the text mask, throughout the app.
const {default:ts}=await import('typescript')
const {readdirSync}=await import('node:fs')
const path=await import('node:path')
const files=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(d,e.name)):[path.join(d,e.name)])
function maskedIcons(source,file){
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),icons=new Set(),fail=[]
 sf.forEachChild(n=>{if(ts.isImportDeclaration(n)&&/icons\/(appIcons|SubjectMark|LoopIcon)$/.test(n.moduleSpecifier.text))n.importClause?.namedBindings?.elements?.forEach(x=>icons.add(x.name.text))})
 function visit(n){
  if(ts.isJsxElement(n)&&(/textFadeStyle|textFadeLines|data-text-fade/.test(n.openingElement.getText(sf))||n.openingElement.tagName.getText(sf)==='FadeText')){
   function child(c){if((ts.isJsxSelfClosingElement(c)||ts.isJsxOpeningElement(c))&&(icons.has(c.tagName.getText(sf))||['svg','img','button','input','select'].includes(c.tagName.getText(sf))))fail.push(file+':'+(sf.getLineAndCharacterOfPosition(c.getStart(sf)).line+1));ts.forEachChild(c,child)}
   n.children.forEach(child)
  }
  ts.forEachChild(n,visit)
 }visit(sf);return fail
}
assert.deepEqual(files('src').filter(f=>f.endsWith('.tsx')&&!path.basename(f).startsWith('_')).flatMap(f=>maskedIcons(read(f),f)),[],'Move icons and controls outside text masks')
assert.equal(maskedIcons('import {Check} from "./icons/appIcons"; const x=<FadeText><Check/>label</FadeText>','bad.tsx').length,1)
assert.equal(maskedIcons('const x=<span><svg/><FadeText>label</FadeText><button>close</button></span>','good.tsx').length,0)
console.log('Overlay fades: explicit icons and controls stay outside marked text across all TSX sources')

assert.ok(read('src/components/teacher/TeacherSelect.tsx').includes('(mobile || hoverDel === o.value)'), 'Delete actions must be visible without hover on phones')
