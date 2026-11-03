import React from 'react'
import {createRoot} from 'react-dom/client'
import '../../../src/index.css'
import ErrorBoundary from '../../../src/components/ErrorBoundary'
import WidgetBoundary from '../../../src/components/teacher/WidgetBoundary'
import {setJourneyReporter,observeReloadedJourneys} from '../../../src/lib/diagnosticJourney'
// Explicit fixture only; never imports App, signs in or mutates backend data.
sessionStorage.setItem('iskra:telemetry-source','qa')
setJourneyReporter((event,meta)=>{
  const rows=JSON.parse(sessionStorage.getItem('qa:journey-events')??'[]')
  rows.push({event,meta});sessionStorage.setItem('qa:journey-events',JSON.stringify(rows))
})
observeReloadedJourneys()
const initiallyBroken=sessionStorage.getItem('qa:next-boot')!=='fixed'
function Lesson(){
  if(initiallyBroken && !(window as unknown as {qaAllowRender:boolean}).qaAllowRender){sessionStorage.setItem('qa:next-boot','fixed');throw Error('Fixture lesson render failed')}
  return <p role="status">Урок открыт · fixture</p>
}
const widget=location.search.includes('widget')
createRoot(document.getElementById('root')!).render(widget?<div style={{width:280,height:180}}><WidgetBoundary><Lesson/></WidgetBoundary></div>:<ErrorBoundary><Lesson/></ErrorBoundary>)
