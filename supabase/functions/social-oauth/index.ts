// Точка входа функции. Вся логика — в handler.ts (чтобы тест мог звать handler
// без запуска Deno.serve; ср. функцию drive-video).
import { handler } from './handler.ts'

Deno.serve(handler)
