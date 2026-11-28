// Учебные файлы курса «Бухгалтерия» — лежат в public/courses/accounting/ и
// отдаются сайтом как есть. Урок прикрепляет в «Материалы» те файлы, которые
// упоминает его текст (см. accountingLessons.ts), — в базе у курса
// lessons.materials пуст, а ученик должен скачать файл из урока.
// Размеры сверяет scripts/checkAccounting.mjs: при замене файла обновите число.
import type { LessonFile, LessonFiles } from '../../lib/lessonFiles'

export const ACC_FILE_SIZES: Record<string, number> = {
  'alfa.xls': 5632,
  'beta.xls': 5632,
  'chislennost-formuly-praktikum.xlsx': 11921,
  'chislennost-papka-vygruzok.zip': 19455,
  'chislennost-power-query.zip': 45133,
  'chislennost-shablon.xlsx': 3193507,
  'formuly-dlya-raboty.xlsx': 36784,
  'kalendar-srokov-2027.xlsx': 30468,
  'kalkulyacii-proizvodstva.xlsx': 35200,
  'konsolidaciya-gruppy.xlsx': 55644,
  'kontragenty-dlya-importa.xlsx': 8627,
  'kp-shablon.xlsx': 14663,
  'osv-shablon.xlsx': 11076,
  'otvety-vedomstvam.xlsx': 12430,
  'pasport-processa.xlsx': 17347,
  'platezhki-dlya-proverki.xlsx': 13023,
  'praktikum-ishodnyj.xlsx': 14674,
  'samozanyatye-kontrol.xlsx': 22550,
  'sverka-shablon.xlsx': 14832,
  'uchebnye-fajly-windows.zip': 23671,
  'vygruzki-dlya-power-query.zip': 27173,
  'vypiska-1c-klient-bank.zip': 895,
  'zakrytie-mesyaca-cheklist.xlsx': 10840,
  'zup-vygruzka-obrazec.xlsx': 11926,
}

const MIME: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  zip: 'application/zip',
}

const NAME_RE = /[a-z0-9][a-z0-9-]*\.(?:xlsx|xls|zip)(?![a-z])/g

/** Файлы, которые называет текст урока, — в порядке первого упоминания. */
export function accLessonFiles(texts: string[]): LessonFiles {
  const names: string[] = []
  for (const text of texts) {
    for (const name of text.match(NAME_RE) ?? []) {
      if (ACC_FILE_SIZES[name] !== undefined && !names.includes(name)) names.push(name)
    }
  }
  if (!names.length) return {}
  return {
    materials: names.map((name): LessonFile => ({
      id: `acc-file:${name}`,
      name,
      path: `courses/accounting/${name}`,
      size: ACC_FILE_SIZES[name],
      mime: MIME[name.split('.').pop() ?? ''] ?? 'application/octet-stream',
      url: `/courses/accounting/${name}`,
      // Настоящий файл с известным размером, а не внешняя ссылка учителя.
      r2: true,
    })),
  }
}
