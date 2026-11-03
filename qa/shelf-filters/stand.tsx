import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {SortDropdown, FacetDropdown, SubjectFacet} from '../../src/components/teacher/ShelfFilters'
import '../../src/index.css'
function Stand(){
 const [sort,setSort]=useState('newest'),[level,setLevel]=useState(''),[subjects,setSubjects]=useState<string[]>([])
 return <main style={{padding:16,maxWidth:600,margin:'auto'}}>
  <h1>Искра · управление фильтрами</h1><button style={{minHeight:44}}>Вне списка</button>
  <section data-qa="sort"><SortDropdown value={sort} onChange={setSort} accent="var(--color-accent)" options={[["newest","Новые"],["oldest","Старые"],["az","А → Я"]]}/><output>{sort}</output></section>
  <section data-qa="facet" style={{marginTop:24}}><FacetDropdown value={level} onChange={setLevel} accent="var(--color-accent)" options={['ЕГЭ','TOPIK I']} allLabel="Все уровни" searchable/><output>{level||'all'}</output></section>
  <section data-qa="subjects" style={{marginTop:24}}><SubjectFacet values={subjects} onChange={setSubjects} accent="var(--color-accent)" only={['chemistry','korean']} searchable/><output>{subjects.join(',')||'none'}</output></section>

 </main>
}
createRoot(document.getElementById('root')!).render(<Stand/> )
