import type { CELesson, CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { lessonShortIdMap } from './lessonReferences'
import { plainTitle } from './lessonKey'
import { theoryToParagraphs } from './theoryImages'

/** The same serializer is used by the legacy and transactional save paths. */
export function courseAtomicRows(c: CourseEdData, courseDbId: string, editorModules: CourseEdData['modules'], moduleDbIdByLocalId: Record<string, string>) {
    const shortId = c.dbCourseId ?? c.id
    const firstModuleLocalId = editorModules[0].id
    // 2. Order lessons (module order → lessonIds → ungrouped to first module).
    const ordered: Array<{ lesson: CELesson; moduleLocalId: string }> = []
    const lessonsById = new Map(c.lessons.map(lesson => [lesson.id, lesson]))
    const seen = new Set<string>()
    for (const m of editorModules) {
      for (const lid of m.lessonIds) {
        const lesson = lessonsById.get(lid)
        if (lesson && !seen.has(lid)) { ordered.push({ lesson, moduleLocalId: m.id }); seen.add(lid) }
      }
    }
    for (const lesson of c.lessons) {
      if (!seen.has(lesson.id)) { ordered.push({ lesson, moduleLocalId: firstModuleLocalId }); seen.add(lesson.id) }
    }

    // 3. Upsert lessons with a stable per-lesson short_id (see lessonShortIdMap),
    //    preserving lesson_progress across reorders (keyed by short_id, not FK).
    const shortIdByLessonId = lessonShortIdMap(shortId, c.lessons)
    const lessonRows = ordered.map(({ lesson, moduleLocalId }, i) => ({
      short_id: shortIdByLessonId[lesson.id] ?? `${shortId}-${i}`,
      course_id: courseDbId,
      module_id: moduleDbIdByLocalId[moduleLocalId] ?? null,
      // Номер урока рисует интерфейс — в названии его не храним.
      title: plainTitle(lesson.title),
      position: i,
      lesson_number: i,
      youtube_url: lesson.videoUrl ?? null,
      // Главы записи. Пустые строки не пишем: пустая глава в плеере ученика —
      // это безымянная засечка на шкале, которую он не может ни понять, ни снять.
      timecodes: (lesson.timecodes ?? [])
        .filter(tc => tc.label.trim())
        .map(tc => ({ time: tc.time, label: tc.label.trim(), seconds: tc.seconds })),
      ...(lesson.chapterVariants ? {chapter_variants:lesson.chapterVariants} : {}),
      description: lesson.description ?? null,
      // Конспект → lessons.content.paragraphs, откуда его читает вкладка
      // «Конспект» у ученика. Пустой конспект пишем как {}, чтобы не затирать
      // содержимое, заведённое другим путём, пустым массивом абзацев.
      content: {
        ...(lesson.transcript && lesson.transcript.source === (lesson.videoUrl?.trim() || '') ? { transcript: lesson.transcript } : {}),
        ...(lesson.theory?.trim() || lesson.recapParagraphs?.length
        ? {
            paragraphs: [
              ...(lesson.theory?.trim() ? theoryToParagraphs(
                lesson.theory,
                lesson.theoryImages,
                shortIdByLessonId[lesson.id] ?? lesson.id,
              ) : []),
              // «Итоги занятия» из записи — после конспекта, с таймкодами.
              ...(lesson.recapParagraphs ?? []),
            ],
          }
        : {}),
        ...(lesson.selfCheck?.length ? { selfCheck: lesson.selfCheck } : {}),
        ...(lesson.recapCardSetId ? { cardSetId: lesson.recapCardSetId } : {}),
        ...(lesson.recapCardGroupId ? { cardGroupId: lesson.recapCardGroupId } : {}),
      },
      kind: lesson.kind ?? 'lesson',
      test_tasks: lesson.testTasks ?? [],
      // Файлы урока: сами объекты уже в бакете lesson-materials, здесь — их
      // пути и метаданные. Отсюда их читает экран урока у ученика.
      materials: lesson.files ?? {},
      scheduled_date: lesson.scheduledDate ?? null,
      scheduled_time: lesson.scheduledTime ?? null,
      scheduled_duration: lesson.scheduledDuration ?? null,
      rec_date: lesson.recDate ?? null,
      rec_time: lesson.recTime ?? null,
      rec_duration: lesson.recDuration ?? null,
      lesson_sched_manual: lesson.lessonSchedManual ?? false,
      delivery_mode: lesson.deliveryMode ?? 'live',
      // Homework («Домашки» tab) lives only in editor state — persist it as a
      // JSONB blob so it survives a re-entry. Hard tasks live inline in the
      // task arrays via the isHard flag.
      homework: {
        hwTitle: lesson.hwTitle ?? null,
        hwTarget: lesson.hwTarget ?? null,
        hwDate: lesson.hwDate ?? null,
        hwTime: lesson.hwTime ?? null,
        hwDateManual: lesson.hwDateManual ?? false,
        hwTasks: lesson.hwTasks ?? [],
        recHwTitle: lesson.recHwTitle ?? null,
        recHwTarget: lesson.recHwTarget ?? null,
        recHwDate: lesson.recHwDate ?? null,
        recHwTime: lesson.recHwTime ?? null,
        recHwDateManual: lesson.recHwDateManual ?? false,
        recHwTasks: lesson.recHwTasks ?? [],
        extraHw: lesson.extraHw ?? [],
      },
    }))

    return { ordered, shortIdByLessonId, lessonRows }
}

export function courseAtomicModules(c: CourseEdData): CourseEdData['modules'] | null {
  // Production acceptance exposed a statement timeout with the full RLS stack.
  // Keep the proven save path until the server replacement passes real QA.
  return null
}

export function eligibleCourseAtomicModules(c: CourseEdData) {
  const kept = c.modules.filter(m => m.label.trim() || m.lessonIds.length > 0)
  // A saved empty course still has its single stable unnamed module. Reuse
  // that identity instead of forcing six round trips through a legacy local ID.
  const modules = kept.length ? kept : c.lessons.length === 0 && c.modules.length === 1 ? c.modules : []
  // Legacy local identities need an authoritative reconciliation read first.
  return c.dbCourseId && modules.length && modules.every(m => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id)) ? modules : null
}
