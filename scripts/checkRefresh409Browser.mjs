import { chromium, webkit } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const f = JSON.parse(readFileSync(process.env.ISKRA_REFRESH_FIXTURE, 'utf8')), out = process.env.ISKRA_REFRESH_ARTIFACTS, origin = process.env.ISKRA_REFRESH_ORIGIN ?? 'http://127.0.0.1:18439', engine = process.env.ISKRA_REFRESH_ENGINE ?? 'chromium', baseline = process.env.ISKRA_REFRESH_BASELINE === '1';
assert.equal(new URL(origin).hostname, '127.0.0.1');
mkdirSync(out, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'webkit' ? {} : { channel: 'chrome' }), context = await browser.newContext(), result = { engine, baseline, checks: [] };
const control = async (cmd) => { const r = await context.request.post(origin + '/qa-control', { data: cmd }); assert.equal(r.status(), 200); };
const stats = async () => await (await context.request.get(origin + '/qa-control')).json();
const ready = p => p.waitForFunction(() => window.__refreshQA && document.documentElement.dataset.ready === 'true');
const session = p => p.evaluate(() => window.__refreshQA.session());
const lists = p => p.evaluate(() => window.__ownerlessQA.lists);
async function verify(p, a) { await p.waitForFunction(label => window.__ownerlessQA?.actor.endsWith(' ' + label) && document.documentElement.dataset.ready === 'true', a.label); assert.equal(await session(p), a.id); const s = await lists(p); for (const [k, id] of Object.entries({ groups: a.group, students: a.student, homework: a.homework, hard: a.progress })) {
    assert.equal(s[k].value.length, 1, k);
    assert.equal(s[k].value[0].id, id, k);
} }
async function login(p, a) { await p.getByLabel('Email', { exact: true }).fill(a.email); await p.getByLabel('Пароль', { exact: true }).fill(a.password); await p.getByRole('button', { name: 'Войти', exact: true }).click(); await p.waitForFunction(() => window.__ownerlessQA.actor.endsWith(' A') || window.__ownerlessQA.actor.endsWith(' B')); await verify(p, a); }
async function open() { const p = await context.newPage(); await p.goto(origin + '/gate/' + f.gate); await ready(p); return p; }
try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    let first = await open();
    await login(first, f.actors[0]);
    await first.evaluate(() => { const k = Object.keys(localStorage).find(k => k.endsWith('-auth-token')); const s = JSON.parse(localStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 1; localStorage.setItem(k, JSON.stringify(s)); });
    await first.close();
    await control({ clear: true, mode: 'collision' });
    let pages = await Promise.all(Array.from({ length: 5 }, () => open()));
    await new Promise(r => setTimeout(r, 800));
    const cold = await stats(), sessions = await Promise.all(pages.map(session));
    result.cold = { maxActive: cold.maxActive, refreshRequests: cold.logs.filter(x => x.refresh).length, conflicts: cold.logs.filter(x => x.refresh && x.status === 409).length, sessionsPreserved: sessions.filter(x => x === f.actors[0].id).length, webLocks: await pages[0].evaluate(() => window.__refreshQA.locks) };
    writeFileSync(out + '/cold.json', JSON.stringify(result.cold, null, 2));
    await pages[0].screenshot({ path: out + '/cold.png', fullPage: true });
    if (baseline) {
        assert.ok(result.cold.maxActive > 1);
        assert.ok(result.cold.conflicts > 0);
        assert.ok(result.cold.sessionsPreserved < 5);
        result.checks.push('BASELINE reproduces concurrent refresh, conflict and session loss');
    }
    else {
        assert.equal(result.cold.maxActive, 1);
        assert.equal(result.cold.conflicts, 0);
        assert.equal(result.cold.sessionsPreserved, 5);
        for (const p of pages)
            await verify(p, f.actors[0]);
        result.checks.push('five cold tabs preserve A and serialize real refresh');
        await control({ clear: true, mode: 'collision' });
        await Promise.all(pages.map(p => p.evaluate(() => window.__refreshQA.refresh())));
        const manual = await stats();
        assert.equal(manual.maxActive, 1);
        assert.equal(manual.logs.filter(x => x.refresh && x.status === 409).length, 0);
        for (const p of pages)
            await verify(p, f.actors[0]);
        result.checks.push('five explicit refresh calls serialized; A retained');
        const untilHeld = async () => { for (let i = 0; i < 100; i++) {
            if ((await stats()).held)
                return;
            await new Promise(r => setTimeout(r, 30));
        } throw Error('Refresh was not held'); };
        const passwordIssued = async () => { for (let i = 0; i < 100; i++) {
            if ((await stats()).logs.some(x => x.path === '/auth/v1/token' && !x.refresh && x.status === 200))
                return;
            await new Promise(r => setTimeout(r, 30));
        } throw Error('Staged password verification did not complete'); };
        const allEmpty = async () => { for (const p of pages) {
            await p.waitForFunction(() => window.__ownerlessQA.actor === 'Нет сессии' && Object.values(window.__ownerlessQA.lists).every(x => !x.loading && x.value.length === 0));
            assert.equal(await session(p), null);
        } };
        await control({ clear: true, mode: 'normal', hold: true });
        const pendingLogoutRefresh = pages[0].evaluate(() => window.__refreshQA.refresh());
        await untilHeld();
        await pages[1].getByRole('button', { name: 'Выйти' }).click();
        await pages[1].waitForFunction(() => window.__ownerlessQA.busy);
        await new Promise(r => setTimeout(r, 350));
        await control({ release: true });
        await pendingLogoutRefresh;
        await allEmpty();
        result.checks.push('logout queued during delayed refresh; all tabs empty after completion; no A resurrection');
        await login(pages[1], f.actors[0]);
        for (const p of pages)
            await verify(p, f.actors[0]);
        await pages[2].evaluate(() => { window.__switchFrames = []; window.__switchRecording = true; function frame() { window.__switchFrames.push({ actor: window.__ownerlessQA.actor, ids: [...document.querySelectorAll('[data-row-id]')].map(x => x.getAttribute('data-row-id')) }); if (window.__switchRecording)
            requestAnimationFrame(frame); } requestAnimationFrame(frame); });
        await control({ clear: true, hold: true });
        const pendingSwitch = pages[0].evaluate(() => window.__refreshQA.refresh());
        await untilHeld();
        await pages[2].getByRole('button', { name: 'Выйти' }).click();
        await pages[2].getByLabel('Email', { exact: true }).fill(f.actors[1].email);
        await pages[2].getByLabel('Пароль', { exact: true }).fill(f.actors[1].password);
        await pages[2].getByRole('button', { name: 'Войти', exact: true }).click();
        await passwordIssued();
        await pages[2].waitForFunction(async () => { const q = await navigator.locks.query(); return q.pending.length >= 2; });
        assert.ok(!(await stats()).logs.some(x => x.path === '/auth/v1/logout'));
        await control({ release: true });
        await pendingSwitch;
        for (const p of pages)
            await verify(p, f.actors[1]);
        const frames = await pages[2].evaluate(() => { window.__switchRecording = false; return window.__switchFrames; });
        const bIds = new Set([f.actors[1].group, f.actors[1].student, f.actors[1].homework, f.actors[1].progress]);
        for (const frame of frames)
            if (frame.actor.endsWith(' B'))
                assert.ok(frame.ids.every(x => bIds.has(x)), 'A row after B');
        writeFileSync(out + '/switch-frames.json', JSON.stringify(frames));
        await pages[2].screenshot({ path: out + '/account-B.png', fullPage: true });
        result.checks.push('delayed A refresh + logout + B login: all five tabs only B; transition frames owner-safe');
        await control({ clear: true, hold: true });
        const closing = pages[0].evaluate(() => window.__refreshQA.refresh()).catch(() => null);
        await untilHeld();
        await Promise.race([pages[0].close().then(() => closing), new Promise((_, reject) => setTimeout(() => reject(Error("Closing lock-holder did not settle within 3 seconds")), 3000))]);
        pages = pages.slice(1);
        await control({ release: true });
        await pages[0].evaluate(() => window.__refreshQA.refresh());
        for (const p of pages)
            await verify(p, f.actors[1]);
        pages.push(await open());
        await verify(pages.at(-1), f.actors[1]);
        result.checks.push('closing lock-holder tab releases lock; remaining tabs refresh B');
        if (!process.env.ISKRA_REFRESH_SKIP_TIMEOUT) {
            await control({ clear: true, hold: true });
            const timed = pages[0].evaluate(() => window.__refreshQA.refresh());
            await untilHeld();
            const started = Date.now();
            await pages[1].getByRole('button', { name: 'Выйти' }).click();
            const timeoutResult = await Promise.race([timed, new Promise((_, reject) => setTimeout(() => reject(Error("Transport timeout did not settle within 35 seconds")), 35000))]);
            await control({ release: true });
            await allEmpty();
            result.timeout = { elapsed_ms: Date.now() - started, error: timeoutResult.error };
            assert.ok(result.timeout.elapsed_ms < 35000);
            assert.equal(timeoutResult.error?.name, 'AuthRetryableFetchError');
            result.checks.push('30s transport timeout releases Auth lock; queued logout completes; no session resurrection');
        }
        await login(pages[1], f.actors[1]);
        for (const p of pages)
            await verify(p, f.actors[1]);
        const final = await stats();
        assert.ok(!final.logs.some(x => (x.query ?? '').includes('eq.null')));
        result.checks.push('fresh B login; all lists and tabs recover');
        await control({ clear: true, hold: true });
        const cancelRefresh = pages[0].evaluate(() => window.__refreshQA.refresh());
        await untilHeld();
        await pages[2].getByLabel('Email', { exact: true }).fill(f.actors[0].email);
        await pages[2].getByLabel('Пароль', { exact: true }).fill(f.actors[0].password);
        await pages[2].getByRole('button', { name: 'Войти', exact: true }).click();
        await passwordIssued();
        await pages[2].waitForFunction(async () => { const q = await navigator.locks.query(); return q.pending.length >= 1; });
        await pages[2].evaluate(() => window.__refreshQA.cancelLogin());
        await pages[2].waitForFunction(() => !window.__ownerlessQA.busy);
        await control({ release: true });
        await cancelRefresh;
        for (const p of pages)
            await verify(p, f.actors[1]);
        await new Promise(r => setTimeout(r, 150));
        for (const p of pages)
            await verify(p, f.actors[1]);
        assert.ok(!(await stats()).logs.some(x => x.path === '/auth/v1/user'));
        result.checks.push('cancelled queued A login never commits or clears current B session');
    }
    result.status = 'PASS';
    console.log(JSON.stringify(result));
}
catch (e) {
    result.status = 'FAIL';
    result.error = e.stack;
    process.exitCode = 1;
    console.log(e.stack);
}
finally {
    await control({ release: true }).catch(() => { });
    writeFileSync(out + '/result.json', JSON.stringify(result, null, 2));
    await context.tracing.stop({ path: out + '/trace.zip' });
    await context.close();
    await browser.close();
}
