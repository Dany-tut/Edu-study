import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
export default defineConfig({
 root:fileURLToPath(new URL('../..',import.meta.url)),
 cacheDir:'node_modules/.cache/widget-size-review-vite',
 plugins:[react()],
 resolve:{dedupe:['react','react-dom']},
 optimizeDeps:{include:['react','react-dom/client','react/jsx-runtime','lottie-react','framer-motion']},
 define:{__APP_VERSION__:JSON.stringify('widget-review'),__APP_BUILD__:'0',__APP_COMMIT__:JSON.stringify('local-review')},
 server:{host:'127.0.0.1',port:5185,strictPort:true},
})
