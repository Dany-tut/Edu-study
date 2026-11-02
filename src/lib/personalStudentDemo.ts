import { getStudentSession, type StudentSession } from './studentSession';
export const PERSONAL_DEMO_PREFIX = 'personal-demo-';
const MODE_KEY = 'iskra:personal-demo:v1';
const WEEK = 7 * 24 * 60 * 60 * 1000;
const progressKey = (owner: string) => `${MODE_KEY}:progress:${owner}`;
type Mode = {
    owner: string;
    expires: number;
};
export type PersonalDemoRow = {
    id: string;
    lesson_ref: string;
    student_id: string;
    status: string;
    score?: number | null;
    comment?: string;
    attachments?: unknown;
    [key: string]: unknown;
};
/** Explicit, browser-local presentation mode, bound to the student selected at activation.
 * This does not grant access to any account or server data. */
export function personalDemoOwner(session: StudentSession | null = getStudentSession()): string | null {
    try {
        const url = new URL(window.location.href);
        const option = url.searchParams.get('demo');
        if (option === 'off') {
            localStorage.removeItem(MODE_KEY);
            url.searchParams.delete('demo');
            window.history.replaceState(null, '', url.href);
            return null;
        }
        if (url.hash.startsWith('#/teacher'))
            return null;
        if (!session || !['даниил макаренко', 'данил макаренко'].includes(session.name.trim().replace(/\s+/g, ' ').toLowerCase()))
            return null;
        let mode = JSON.parse(localStorage.getItem(MODE_KEY) ?? 'null') as Mode | null;
        if (option === 'danil') {
            if (mode?.owner !== session.id || !(mode.expires > Date.now())) {
                mode = { owner: session.id, expires: Date.now() + WEEK };
                localStorage.setItem(MODE_KEY, JSON.stringify(mode));
            }
            url.searchParams.delete('demo');
            window.history.replaceState(null, '', url.href);
        }
        return mode?.owner === session.id && mode.expires > Date.now() ? session.id : null;
    }
    catch {
        return null;
    }
}
export function personalDemoRows(owner: string): PersonalDemoRow[] {
    try {
        const rows: unknown = JSON.parse(localStorage.getItem(progressKey(owner)) ?? '[]');
        return Array.isArray(rows) ? rows.filter((row): row is PersonalDemoRow => !!row && typeof row === 'object'
            && row.student_id === owner && typeof row.lesson_ref === 'string'
            && row.lesson_ref.startsWith(PERSONAL_DEMO_PREFIX)).slice(-1000) : [];
    }
    catch {
        return [];
    }
}
/** Intercept synthetic references at the shared database transport boundary.
 * They must NEVER reach the server, even after disabling the preview or switching accounts.
 * Normal account requests pass through unchanged. */
export async function personalDemoResponse(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const text = request.method === 'GET' || request.method === 'HEAD' || !request.headers.get('Content-Type')?.includes('json') ? '' : await request.clone().text();
    if (!decodeURIComponent(url.pathname + url.search).includes(PERSONAL_DEMO_PREFIX) && !text.includes(PERSONAL_DEMO_PREFIX))
        return null;
    const owner = personalDemoOwner();
    const rejected = () => Response.json({ code: 'LOCAL_PREVIEW', message: 'Это временный пример. Откройте заполненный просмотр в своём профиле.' }, { status: 403 });
    if (!owner)
        return rejected();
    if (url.pathname === '/rest/v1/lesson_progress') {
        const rows = personalDemoRows(owner);
        const filter = (value: string | null) => value?.startsWith('eq.') ? value.slice(3) : null;
        const ref = filter(url.searchParams.get('lesson_ref'));
        const id = filter(url.searchParams.get('id'));
        const student = filter(url.searchParams.get('student_id'));
        if (student && student !== owner)
            return rejected();
        let selected = rows.filter(row => (!ref || row.lesson_ref === ref) && (!id || row.id === id));
        if (request.method === 'POST' || request.method === 'PATCH') {
            const body = JSON.parse(text) as Partial<PersonalDemoRow> | Partial<PersonalDemoRow>[];
            const patches = Array.isArray(body) ? body : [body];
            if (patches.some(p => p.student_id && p.student_id !== owner))
                return rejected();
            selected = patches.flatMap(patch => {
                const lessonRef = patch.lesson_ref ?? ref ?? selected[0]?.lesson_ref;
                if (!lessonRef?.startsWith(PERSONAL_DEMO_PREFIX))
                    return [];
                const previous = rows.find(row => row.lesson_ref === lessonRef);
                const row: PersonalDemoRow = { status: 'current', ...previous, ...patch,
                    id: previous?.id ?? `${PERSONAL_DEMO_PREFIX}row-${lessonRef}`, lesson_ref: lessonRef, student_id: owner };
                const at = rows.findIndex(item => item.lesson_ref === lessonRef);
                if (at < 0)
                    rows.push(row);
                else
                    rows[at] = row;
                return [row];
            });
            try {
                localStorage.setItem(progressKey(owner), JSON.stringify(rows));
            }
            catch {
                return Response.json({ message: 'Не удалось сохранить ответы в браузере.' }, { status: 507 });
            }
        }
        else if (request.method !== 'GET' && request.method !== 'HEAD')
            return rejected();
        const single = request.headers.get('Accept')?.includes('vnd.pgrst.object');
        return Response.json(single ? selected[0] ?? null : selected);
    }
    // Diary metadata and participation have in-memory fallbacks for fully loaded lessons.
    if (request.method === 'GET' || request.method === 'HEAD') {
        return Response.json(request.headers.get('Accept')?.includes('vnd.pgrst.object') ? null : []);
    }
    return rejected();
}
