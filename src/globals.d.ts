// Build-time constants injected by Vite's `define` (see vite.config.ts).
// Format: "<version>·<gitShortHash>", e.g. "1.0.625·a1b2c3d".
declare const __APP_VERSION__: string
// Порядковый номер коммита — растущее число, по которому сборка сравнивается с
// той, что лежит на сервере (/version.json).
declare const __APP_BUILD__: number
// Короткий хеш коммита сборки.
declare const __APP_COMMIT__: string
