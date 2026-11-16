import { supabase } from './supabase'
import { createSharedQuery, useSharedQuery } from './sharedQuery'

export type CourseLesson = {
  id: string
  courseTitle: string
  lessonTitle: string
  subject: string
}

const courseLessonsQuery = createSharedQuery<CourseLesson[]>(async () => {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, courses(title, subject)')
    .order('position')
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    lessonTitle: row.title,
    courseTitle: row.courses?.title ?? '',
    subject: row.courses?.subject ?? '',
  }))
}, [], { refreshOnFocusMs: 30_000 })

export function useCourseLessons(): CourseLesson[] {
  return useSharedQuery(courseLessonsQuery).value
}

export const reloadCourseLessons = () => courseLessonsQuery.reload()
