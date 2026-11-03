import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import GoogleFormImportModal from '../../src/components/teacher/GoogleFormImportModal'
import '../../src/index.css'
function Stand() {
  const [open, setOpen] = useState(true)
  return <><button onClick={() => setOpen(true)}>Открыть импорт</button><GoogleFormImportModal open={open} onClose={() => setOpen(false)} onImport={async (form, ids) => {
    const qa = window as unknown as { __imports: unknown[]; __rejectImport?: boolean }
    qa.__imports.push({ title: form.title, ids })
    if (qa.__rejectImport) throw new Error('controlled failure')
  }} /></>
}
createRoot(document.getElementById('root')!).render(<Stand />)
