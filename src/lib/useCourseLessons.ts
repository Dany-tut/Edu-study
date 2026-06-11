import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export type CourseLesson = {
  id: string
  courseTitle: string
  lessonTitle: string
  subject: string
}

export function useCourseLessons(): CourseLesson[] {
  const [lessons, setLessons] = useState<CourseLesson[]>([])

  useEffect(() => {
    supabase
      .from('lessons')
      .select('id, title, courses(title, subject)')
      .order('position')
      .then(({ data }) => {
        if (data) {
          setLessons(
            data.map((row: any) => ({
              id: row.id,
              lessonTitle: row.title,
              courseTitle: row.courses?.title ?? '',
              subject: row.courses?.subject ?? '',
            }))
          )
        }
      })
  }, [])

  return lessons
}
