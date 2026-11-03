import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({plugins:[{name:'qa-hook-data',enforce:'pre',resolveId(source,importer){if(importer?.includes('/components/teacher/widgets/')&&/\/lib\/(useHomeData|useGroups|useFinances)$/.test(source))return path.resolve('qa/widget-navigation/mock.ts')}},react()],define:{__APP_VERSION__:'"qa"',__APP_BUILD__:'1957',__APP_COMMIT__:'"c74e0f2"','import.meta.env.VITE_SUPABASE_URL':'"http://127.0.0.1:5268"','import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':'"fixture-placeholder"'},server:{host:'127.0.0.1',port:5268,strictPort:true}})
