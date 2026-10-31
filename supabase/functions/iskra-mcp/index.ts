import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@2.4.0'
import { pipeline } from 'npm:@supabase/middleware@1.0.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.2'
import { z } from 'npm:zod@4.6.7'

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })
const fail = (message: string) => ({ content: [{ type: 'text' as const, text: message }], isError: true })

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'iskra', version: '1.0.0' })

        server.registerTool('list_my_courses', {
          title: 'Мои курсы в Искре',
          description: 'Показывает только курсы, созданные в кабинете преподавателя, который подключил Claude.',
          inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(50) }),
          annotations: { readOnlyHint: true, openWorldHint: false },
        }, async ({ limit }) => {
          const { data: auth, error: authError } = await supabase.auth.getUser()
          if (authError || !auth.user) return fail('Не удалось проверить аккаунт Искры.')
          const { data: staff, error: staffError } = await supabase.rpc('is_staff')
          if (staffError || staff !== true) return fail('Для этой операции нужен аккаунт преподавателя Искры.')
          const { data, error } = await supabase
            .from('courses')
            .select('id, short_id, title, subject, level, status')
            .eq('created_by', auth.user.id)
            .order('updated_at', { ascending: false })
            .limit(limit)
          if (error) return fail('Не удалось загрузить курсы Искры.')
          return text(data ?? [])
        })

        server.registerTool('create_course', {
          title: 'Создать курс в Искре',
          description: 'Создаёт черновик курса в кабинете подключившегося преподавателя и добавляет первый модуль. Не публикует курс и не открывает его ученикам.',
          inputSchema: z.object({
            title: z.string().trim().min(1).max(160),
            subject: z.string().trim().min(1).max(80),
            level: z.string().trim().max(80).default(''),
            description: z.string().trim().max(4000).default(''),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
        }, async ({ title, subject, level, description }) => {
          const { data: auth, error: authError } = await supabase.auth.getUser()
          if (authError || !auth.user) return fail('Не удалось проверить аккаунт Искры.')
          const { data: staff, error: staffError } = await supabase.rpc('is_staff')
          if (staffError || staff !== true) return fail('Для этой операции нужен аккаунт преподавателя Искры.')

          const ownerId = auth.user.id
          const shortId = `mcp-${ownerId.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`
          const { data: course, error } = await supabase.from('courses').insert({
            short_id: shortId,
            title,
            subject,
            level,
            description,
            kind: 'course',
            status: 'draft',
            created_by: ownerId,
          }).select('id, short_id, title, subject, level, status').single()
          if (error || !course) return fail('Искра не смогла сохранить курс. Проверьте данные и попробуйте ещё раз.')

          const { data: module, error: moduleError } = await supabase.from('course_modules').insert({
            course_id: course.id,
            label: 'Модуль 1',
            position: 0,
          }).select('id').single()
          if (moduleError || !module) {
            await supabase.from('courses').delete().eq('id', course.id).eq('created_by', ownerId)
            return fail('Курс не удалось завершить: не создался первый модуль. Изменения отменены.')
          }
          return text({ ...course, module_id: module.id, note: 'Сохранён как черновик; публикацией управляет преподаватель в Искре.' })
        })

        server.registerTool('add_course_lesson', {
          title: 'Добавить урок в курс Искры',
          description: 'Добавляет урок и текст конспекта в черновой курс, принадлежащий подключившему Claude преподавателю. Не изменяет чужие, расшаренные или опубликованные курсы.',
          inputSchema: z.object({
            course_id: z.string().uuid(),
            title: z.string().trim().min(1).max(160),
            content: z.string().trim().max(12000).default(''),
            description: z.string().trim().max(2000).default(''),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
        }, async ({ course_id, title, content, description }) => {
          const { data: auth, error: authError } = await supabase.auth.getUser()
          if (authError || !auth.user) return fail('Не удалось проверить аккаунт Искры.')
          const { data: staff, error: staffError } = await supabase.rpc('is_staff')
          if (staffError || staff !== true) return fail('Для этой операции нужен аккаунт преподавателя Искры.')

          const { data: course, error: courseError } = await supabase.from('courses')
            .select('id, short_id, subject, status').eq('id', course_id).eq('created_by', auth.user.id).maybeSingle()
          if (courseError || !course) return fail('Курс не найден в вашем кабинете Искры.')
          if (course.status !== 'draft') return fail('Claude может добавлять уроки только в черновые курсы. Сначала создайте черновик или переведите курс в черновики в Искре.')

          let { data: module } = await supabase.from('course_modules').select('id')
            .eq('course_id', course.id).order('position').limit(1).maybeSingle()
          if (!module) {
            const { data, error } = await supabase.from('course_modules').insert({ course_id: course.id, label: 'Модуль 1', position: 0 }).select('id').single()
            if (error || !data) return fail('Не удалось создать модуль курса.')
            module = data
          }

          const { data: last } = await supabase.from('lessons').select('position')
            .eq('course_id', course.id).order('position', { ascending: false }).limit(1).maybeSingle()
          const position = (last?.position ?? -1) + 1
          const lessonShortId = `${course.short_id}-mcp-${crypto.randomUUID().slice(0, 8)}`
          const paragraphs = content.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
            .map((paragraph, i) => ({ id: `${lessonShortId}-p${i + 1}`, text: paragraph }))
          const { data: lesson, error } = await supabase.from('lessons').insert({
            short_id: lessonShortId,
            course_id: course.id,
            module_id: module.id,
            title,
            position,
            lesson_number: position,
            kind: 'lesson',
            description: description || null,
            content: { paragraphs },
          }).select('id, short_id, title, position').single()
          if (error || !lesson) return fail('Не удалось сохранить урок в Искре.')
          return text({ course: course.short_id, lesson, note: 'Урок добавлен в черновой курс; проверьте содержание в Искре перед публикацией.' })
        })

        server.registerTool('create_test_for_lesson', {
          title: 'Добавить тест к уроку Искры',
          description: 'Создаёт тест из вопросов с вариантами ответа и вопросов со свободным ответом, затем связывает его с уроком в вашем черновом курсе. Существующий тест не перезаписывается.',
          inputSchema: z.object({
            course_id: z.string().uuid(),
            lesson_id: z.string().uuid(),
            title: z.string().trim().min(1).max(160),
            questions: z.array(z.discriminatedUnion('type', [
              z.object({
                type: z.literal('choice'),
                question: z.string().trim().min(1).max(1000),
                options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
                correct_index: z.number().int().min(0).max(5),
                explanation: z.string().trim().max(1000).default(''),
              }).superRefine((item, ctx) => {
                if (item.correct_index >= item.options.length) {
                  ctx.addIssue({ code: 'custom', path: ['correct_index'], message: 'correct_index must point to an existing option' })
                }
              }),
              z.object({
                type: z.literal('free'),
                question: z.string().trim().min(1).max(1000),
                answer: z.string().trim().min(1).max(1000),
                explanation: z.string().trim().max(1000).default(''),
              }),
            ])).min(1).max(30),
          }),
          annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
        }, async ({ course_id, lesson_id, title, questions }) => {
          const { data: auth, error: authError } = await supabase.auth.getUser()
          if (authError || !auth.user) return fail('Не удалось проверить аккаунт Искры.')
          const { data: staff, error: staffError } = await supabase.rpc('is_staff')
          if (staffError || staff !== true) return fail('Для этой операции нужен аккаунт преподавателя Искры.')

          const { data: course } = await supabase.from('courses').select('id, subject, status')
            .eq('id', course_id).eq('created_by', auth.user.id).maybeSingle()
          if (!course) return fail('Курс не найден в вашем кабинете Искры.')
          if (course.status !== 'draft') return fail('Claude может добавлять тесты только в черновые курсы. Сначала переведите курс в черновики в Искре.')
          const { data: lesson } = await supabase.from('lessons').select('id, title, trainer_id')
            .eq('id', lesson_id).eq('course_id', course.id).maybeSingle()
          if (!lesson) return fail('Урок не найден в этом курсе.')
          if (lesson.trainer_id) return fail('К уроку уже прикреплён тест. Чтобы сохранить его, сначала проверьте урок в Искре и уберите прежний тест вручную.')

          const trainerQuestions = questions.map(item => ({
            id: crypto.randomUUID(),
            text: item.question,
            answer: item.type === 'choice' ? item.options[item.correct_index] : item.answer,
            ...(item.type === 'choice' ? {
              answers: item.options.map((answer, answerIndex) => ({ id: crypto.randomUUID(), text: answer, correct: answerIndex === item.correct_index })),
            } : {}),
            explanation: item.explanation,
            difficulty: 'medium',
            part: 1,
            source: 'manual',
            questionType: item.type,
            maxPoints: 1,
          }))
          const { data: trainer, error: trainerError } = await supabase.from('trainers').insert({
            title,
            topic: `К уроку «${lesson.title}»`,
            subject: course.subject || '',
            difficulty: 'medium',
            time_per_question: 30,
            questions: trainerQuestions,
            created_by: auth.user.id,
          }).select('id, title').single()
          if (trainerError || !trainer) return fail('Не удалось создать тест в Искре.')

          const { data: linked, error: linkError } = await supabase.from('lessons').update({ trainer_id: trainer.id })
            .eq('id', lesson.id).eq('course_id', course.id).is('trainer_id', null).select('id').maybeSingle()
          if (linkError || !linked) {
            await supabase.from('trainers').delete().eq('id', trainer.id).eq('created_by', auth.user.id)
            return fail('Не удалось прикрепить тест к уроку. Тест отменён, существующий урок не изменён.')
          }
          return text({ test: trainer, lesson: lesson.title, question_count: trainerQuestions.length, note: 'Тест прикреплён к уроку как черновое изменение. Проверьте его в Искре перед выдачей ученикам.' })
        })

        return server
      })
      return handler.fetch(req)
    },
  ),
)
