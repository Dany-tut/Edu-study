import { defineConfig, mergeConfig } from 'vite'
import base from './vite.config'
export default mergeConfig(base, defineConfig({ optimizeDeps: { entries: ['qa/journal-tooltips-save/index.html'] } }))
