import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({
  plugins:[{name:'qa-subjects-api',enforce:'pre',resolveId(source,importer){
    if(importer&&!importer.includes('/qa/student-subjects/supabase.ts')&&/\/supabase(?:\.ts)?$/.test(source))return path.resolve('qa/student-subjects/supabase.ts')
  }},react()],
  define:{__APP_VERSION__:'"qa-subjects"',__APP_BUILD__:'0',__APP_COMMIT__:'"940c8856+subjects"'},
  server:{host:'127.0.0.1',port:18767,strictPort:true},
})
