// Отдельно от apChemistry.ts: Конструктору нужна только эта карта, а не ~37 KB
// данных курса, которые сборщик не умеет выбросить из-за вызовов на уровне модуля.

/** Maps a constructor course id to its Supabase course short_id, so enrollment
 *  works even for AP courses already cached in localStorage (without dbCourseId). */
export const AP_DB_COURSE_BY_CONSTRUCTOR_ID: Record<string, string> = {
  'ap-c-ru': 'apchem-ru',
  'ap-c-en': 'apchem-en',
}
