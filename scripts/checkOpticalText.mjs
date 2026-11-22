import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
const entry = `
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import FadeText from './src/components/FadeText';
import OpticalText from './src/components/OpticalText';
import {textFadeLines} from './src/lib/textFades';
import {opticalTextOffset} from './src/lib/opticalText';
// Frozen pre-opt-in public markup, release 3564: keep unrelated labels untouched.
function PriorFadeText({children,style,className,lines=1,fadeMode='block'}) {
 return <span className={className} data-text-fade={lines} data-text-fade-mode={fadeMode==='last-line'?'last-line':undefined} title={typeof children==='string'?children:undefined} style={{display:'block',minWidth:0,maxWidth:'100%',...style,...(lines>1?textFadeLines(lines):{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'clip'})}}>{children}</span>
}
const samples=[{children:'Краткая подпись'},{children:'Long label',lines:2,fadeMode:'last-line',style:{fontWeight:700}},{children:2026},{children:<strong>Rich label</strong>}];
export const comparisons=samples.map(props=>[renderToStaticMarkup(<PriorFadeText {...props}/>),renderToStaticMarkup(<FadeText {...props}/>)]);
export const optIn=renderToStaticMarkup(<FadeText optical lines={2}>Полный текст</FadeText>);
export const buttonLabel=renderToStaticMarkup(<button><OpticalText as="iskra-button-label">Сохранить</OpticalText><span>3</span></button>);
export const rich=renderToStaticMarkup(<FadeText optical><strong>Rich label</strong></FadeText>);
export {opticalTextOffset};`
const result = await build({ stdin: { contents:entry, resolveDir:process.cwd(), loader:'tsx' }, bundle:true, write:false, platform:'node', format:'esm', jsx:'automatic', packages:'external', logLevel:'silent' })
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/optical-text-check.mjs',result.outputFiles[0].text)
const {comparisons,optIn,rich,buttonLabel,opticalTextOffset:offset}=await import('../node_modules/.cache/optical-text-check.mjs')
for(const [before,after] of comparisons)assert.equal(after,before,'Default FadeText markup changed')
assert.match(optIn,/data-optical-text="true"/)
assert.match(optIn,/title="Полный текст"/)
assert.match(optIn,/data-text-fade="2"/)
assert.doesNotMatch(rich,/data-optical-text/,'Rich labels must not move icons or nested actions')
assert.match(buttonLabel,/<iskra-button-label\b[^>]*pointer-events:none[^>]*>Сохранить<\/iskra-button-label><span>3<\/span>/)
assert.equal(offset(NaN,3,9,2,14),0)
assert.equal(offset(15,3,9,2,NaN),0)
assert.equal(offset(15,3,9,2,0),0)
assert.ok(Math.abs(offset(100,0,0,0,14))<=14*.15)
console.log('Optical text: unchanged default markup, opt-in title/fade preservation, rich-content exclusion, invalid metrics fallback and bounded offsets passed')
