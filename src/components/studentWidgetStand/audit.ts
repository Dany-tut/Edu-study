export type AuditResult={widget:number;state:string;size:string;issues:string[];width:number;height:number}
/** Inspect actual painted controls/regions, not just the configured frame size.
 * Text fades and vertical list scrolling are intentional; art/shadows may protrude. */
export function auditWidget(card:HTMLElement):string[]{
 const issues=new Set<string>(),bounds=card.getBoundingClientRect(),epsilon=1.5
 const outside=(r:DOMRect,b:DOMRect)=>r.left<b.left-epsilon||r.right>b.right+epsilon||r.top<b.top-epsilon||r.bottom>b.bottom+epsilon
 for(const [selector,label] of [['.ihw-heading','Заголовок'],['.ihw-footer','Подвал'],['.ihw-body','Содержимое']] as const){
  const el=card.querySelector<HTMLElement>(selector);if(el&&el.getBoundingClientRect().width>0&&outside(el.getBoundingClientRect(),bounds))issues.add(`${label} за границей карточки`)
 }
 const overlaps=(a:DOMRect,b:DOMRect)=>a.left<b.right-epsilon&&a.right>b.left+epsilon&&a.top<b.bottom-epsilon&&a.bottom>b.top+epsilon
 const footer=card.querySelector<HTMLElement>('.ihw-footer')?.getBoundingClientRect()
 const header=card.querySelector<HTMLElement>('.ihw-heading')?.getBoundingClientRect()
 const body=card.querySelector<HTMLElement>('.ihw-body')?.getBoundingClientRect()
 if(body&&footer&&overlaps(body,footer))issues.add('Содержимое пересекает подвал')
 if(body&&header&&overlaps(body,header))issues.add('Содержимое пересекает заголовок')
 for(const button of card.querySelectorAll<HTMLElement>('button')){
  const r=button.getBoundingClientRect();if(r.width===0||r.height===0)continue
  if(outside(r,bounds))issues.add('Кнопка за границей карточки')
  if(button.closest('.ihw-footer')&&footer&&outside(r,footer))issues.add('Кнопка не помещается в подвал')
  if(button.closest('.ihw-body')&&footer&&overlaps(r,footer))issues.add('Кнопка перекрывает подвал')
 }
 for(const el of card.querySelectorAll<HTMLElement>('.ihw-main,.next-work-copy,.ihw-task-copy,.ihw-stats,.ihw-metric,.ihw-task-mark')){
  if(!el.clientWidth||!el.clientHeight)continue
  if(el.scrollWidth>el.clientWidth+epsilon)issues.add(`Горизонтальное переполнение: ${el.classList[0]}`)
  if(el.scrollHeight>el.clientHeight+epsilon)issues.add(`Вертикальное переполнение: ${el.classList[0]}`)
 }
 if(card.dataset?.state==='loading'){
  const skeletons=[...card.querySelectorAll<HTMLElement>('.next-work-skeleton .skeleton')]
  if(!skeletons.some(el=>{const r=el.getBoundingClientRect();return r.width>=20&&r.height>=4}))issues.add('Загрузка без видимой заглушки')
  if(card.querySelector('.next-work-action'))issues.add('Действие доступно до загрузки работы')
 }
 const copy=card.querySelector<HTMLElement>('.next-work-copy')?.getBoundingClientRect()
 if(copy&&body&&outside(copy,body))issues.add('Текст не помещается в область задания')
 return [...issues]
}
