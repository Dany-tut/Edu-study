import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import postcss from 'postcss'
import { build } from 'esbuild'
const files = dir => readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])
const failures=[]
function inspect(source,file) {
 const fail=(node,message)=>failures.push(`${file}:${node?.getStart ? sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1 : node?.source?.start?.line ?? 1}: ${message}`)
 let sf
 if(file.endsWith('.css')) {
  postcss.parse(source).walkDecls(d=>{if(d.prop==='text-overflow'&&/ellipsis/i.test(d.value)||/^(?:-webkit-)?line-clamp$/.test(d.prop))fail(d,'Use a measured text fade instead of CSS ellipsis/clamp')})
 } else {
  sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  const name=n=>n.name&&(ts.isIdentifier(n.name)||ts.isStringLiteral(n.name))?n.name.text:''
  const visit=n=>{
   if(ts.isPropertyAssignment(n)&&(/^(WebkitLineClamp|lineClamp)$/.test(name(n))||name(n)==='textOverflow'&&/['"`]ellipsis['"`]/.test(n.initializer.getText(sf))))fail(n,'Use textFadeStyle/textFadeLines instead of ellipsis/clamp')
   if(ts.isJsxAttribute(n)&&name(n)==='className'&&n.initializer&&/(?:^|[\s'"`:])(?:truncate|text-ellipsis|line-clamp-\d+)(?=[\s'"`}]|$)/.test(n.initializer.getText(sf)))fail(n,'Use text-fade or text-fade-2 instead of truncation utilities')
   if(ts.isBinaryExpression(n)&&n.operatorToken.kind===ts.SyntaxKind.PlusToken&&ts.isStringLiteral(n.right)&&n.right.text.startsWith('…')&&/\.slice\(/.test(n.left.getText(sf)) || ts.isTemplateExpression(n)&&n.templateSpans.some(span=>span.literal.text.startsWith('…')&&/\.slice\(/.test(span.expression.getText(sf))))fail(n,'Keep the complete label in the DOM; do not append an ellipsis after slice()')
   ts.forEachChild(n,visit)
  };visit(sf)
 }
}
for(const file of files('src').filter(f=>/\.(tsx?|css)$/.test(f)))inspect(readFileSync(file,'utf8'),file)
assert.deepEqual(failures,[],failures.join('\n'))
// Negative and positive fixtures exercise the guard, including conditional styles.
for(const [source,file] of [
 ["const s={textOverflow: small ? 'clip' : 'ellipsis'}",'negative.ts'],
 ["const s={WebkitLineClamp:2}",'negative.ts'],
 ['const v=<span className="font-bold truncate"/>','negative.tsx'],
 ['.label{text-overflow:ellipsis}','negative.css'],
 ['.label{-webkit-line-clamp:2}','negative.css'],
 ["const s=label.slice(0,20)+'…'",'negative.ts'],
]) { const before=failures.length;inspect(source,file);assert.ok(failures.length>before,`Guard missed ${source}`) }
failures.length=0
inspect("const v=<span className=\"text-fade\">{text}</span>; const loading='Подождите…'; const initials=name.slice(0,1)",'positive.tsx')
assert.deepEqual(failures,[])
const result=await build({entryPoints:['src/lib/textFades.ts'],bundle:true,platform:'node',format:'esm',write:false})
mkdirSync('node_modules/.cache',{recursive:true});writeFileSync('node_modules/.cache/text-fades-check.mjs',result.outputFiles[0].text)
const {textFadeMask:mask,textFadeLines}=await import('../node_modules/.cache/text-fades-check.mjs')
assert.equal(mask(100,20,100,20).image,'')
assert.equal(mask(100,20,101,20).image,'')
assert.equal(mask(0,20,200,20).image,'')
assert.match(mask(100,20,300,20).image,/to right/)
assert.match(mask(100,20,300,20,1,true).image,/to left/)
assert.match(mask(100,40,100,100,2).image,/to bottom/)
assert.match(mask(100,20,100,60,1).image,/to bottom/)
assert.equal(textFadeLines(0).overflow,'visible')
assert.equal(textFadeLines(3).maxHeight,'calc(3 * 1lh)')
assert.ok(readFileSync('src/main.tsx','utf8').includes('startTextFades()'),'The shared observer must start for every application route')
console.log('Text fades: all source files, guard fixtures, single/multiline/RTL/fit/resize mask cases passed')
