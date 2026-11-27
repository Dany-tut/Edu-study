// Модули курса по порядку прохождения. Номера (EXPNN) — из ТЗ и не меняются;
// порядок отличается в одном месте: «Переход на 2027 год» стоит сразу после
// налогов и закрытия месяца — он опирается на них, а ИИ, автоматизация,
// безопасность и итоговые проекты идут последними как надстройка.
// ВНИМАНИЕ: порядок задаёт short_id уроков (acc-ru-N). После заведения курса в
// базу менять его нельзя без переноса lessons.content (см. accountingLessons.ts).
// Новые модули — ТОЛЬКО в конец списка (EXT01 добавлен 25.11.2026 после заведения
// курса в базу; EXP22…EXT05…EXP25 — 27.11.2026): так уже заведённые short_id не сдвигаются.
import type { AccModule } from './types'
import { EXP00 } from './exp00'
import { EXP01 } from './exp01'
import { EXP02 } from './exp02'
import { EXP03 } from './exp03'
import { EXP04 } from './exp04'
import { EXP05 } from './exp05'
import { EXP06 } from './exp06'
import { EXP07 } from './exp07'
import { EXP08 } from './exp08'
import { EXP09 } from './exp09'
import { EXP10 } from './exp10'
import { EXP11 } from './exp11'
import { EXP12 } from './exp12'
import { EXP13 } from './exp13'
import { EXP14 } from './exp14'
import { EXP15 } from './exp15'
import { EXP16 } from './exp16'
import { EXP17 } from './exp17'
import { EXP18 } from './exp18'
import { EXP19 } from './exp19'
import { EXP20 } from './exp20'
import { EXP21 } from './exp21'
import { EXT01 } from './ext01'
import { EXP22 } from './exp22'
import { EXT06 } from './ext06'
import { EXT02 } from './ext02'
import { EXT07 } from './ext07'
import { EXT03 } from './ext03'
import { EXT04 } from './ext04'
import { EXT05 } from './ext05'
import { EXP23 } from './exp23'
import { EXP24 } from './exp24'
import { EXP25 } from './exp25'

export const MODULES: AccModule[] = [EXP00, EXP01, EXP02, EXP03, EXP04, EXP05, EXP06, EXP07, EXP08, EXP09, EXP10, EXP11, EXP12, EXP13, EXP14, EXP15, EXP16, EXP21, EXP17, EXP18, EXP19, EXP20, EXT01,
  // v9 (27.11.2026): версия Excel → Power Query → численность → рецепты → энциклопедия функций → отраслевые проекты
  EXP22, EXT06, EXT02, EXT07, EXT03, EXT04, EXT05, EXP23, EXP24, EXP25]
