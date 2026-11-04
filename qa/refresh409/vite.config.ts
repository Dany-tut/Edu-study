import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({ plugins: [process.env.ISKRA_REFRESH_NEGATIVE === '1' ? {
            name: 'refresh409-negative-control', enforce: 'pre' as const,
            transform(code: string, id: string) {
                if (!id.endsWith('/src/lib/supabase.ts'))
                    return;
                const option = /^\s*\.\.\.\(typeof navigator[^\n]*\n/gm;
                if ([...code.matchAll(option)].length !== 1)
                    throw Error('Expected exactly one Auth lock option');
                return code.replace(option, '');
            },
        } : null, react()], define: { __APP_VERSION__: JSON.stringify('Refresh409 QA'), __APP_BUILD__: '0', __APP_COMMIT__: JSON.stringify('local-only') }, build: { outDir: 'dist-refresh409-qa', rollupOptions: { input: resolve('qa/refresh409/index.html') } } });
