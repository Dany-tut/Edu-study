/** Add newly introduced widgets without restoring ones the student intentionally hid. */
export function mergeWidgetOrder(saved:number[], known:number[], current:number[], priority?:number):number[]{
  const fresh=current.filter(id=>!known.includes(id)),order=[...new Set(saved)]
  return [...(priority!==undefined&&fresh.includes(priority)&&!order.includes(priority)?[priority]:[]),...order,...fresh.filter(id=>id!==priority&&!order.includes(id))]
}
