// External proposal only. Caller must supply the confirmed immutable chapter
// baseline belonging to the same course/auth scope; never latestCourse values.
import { chapterPayload, publishedChapters, type ChapterVariants } from './chapterVariants'
import type { LessonTimecode } from '../data/lessonContent'
type ModuleWitness = {id:string;label:string;position:number}
export function buildWholeWitnessChapterArgs(input: {
 courseShortId:string; baseline:string; modules:readonly ModuleWitness[]; lessonShortId:string;
 variants:ChapterVariants; expectedCodes:LessonTimecode[]; expectedVariants?:ChapterVariants|null;
}) {
 const requested = chapterPayload(input.variants)
 return structuredClone({p_course_short_id:input.courseShortId,p_baseline:input.baseline,
  p_expected_modules:[...input.modules],p_lesson_short_id:input.lessonShortId,
  p_chapter_payload:{source:input.variants.source,...requested,
   expected_timecodes:publishedChapters(input.expectedCodes),expected_chapter_variants:input.expectedVariants??null}})
}
