// Real application hooks + real local Supabase Auth/REST. Fixture data stays private.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const fixture = JSON.parse(readFileSync(process.env.ISKRA_OWNERLESS_FIXTURE, 'utf8'));
const origin = process.env.ISKRA_OWNERLESS_BASE_URL;
if (!origin || !['localhost', '127.0.0.1', '192.168.1.36'].includes(new URL(origin).hostname))
    throw Error('An explicitly isolated local QA origin is required');
const out = process.env.ISKRA_OWNERLESS_ARTIFACTS;
if (!out)
    throw Error('Private artifact directory required');
mkdirSync(out, { recursive: true });
const engine = process.env.ISKRA_OWNERLESS_ENGINE || 'chromium';
const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'webkit' ? {} : { channel: 'chrome' });
const matrix = [
    [320, 568], [390, 844], [768, 1024], [1280, 820], [1280, 600], [844, 390],
].flatMap(([width, height]) => ['light', 'dark'].flatMap(colorScheme => ['no-preference', 'reduce'].map(reducedMotion => ({ viewport: { width, height }, colorScheme, reducedMotion }))));
const results = [];
const ids = a => ({ groups: a.group, students: a.student, homework: a.homework, hard: a.progress });
try {
    for (let i = 0; i < matrix.length; i++) {
        const config = matrix[i], context = await browser.newContext({ ...config, ignoreHTTPSErrors: true, extraHTTPHeaders: { 'X-Iskra-QA-Run': `matrix-${engine}-${i}` } });
        const page = await context.newPage(), errors = [], record = { engine, config, status: 'RUNNING', checks: [], frames: 0 };
        page.on('pageerror', e => errors.push(e.message));
        await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
        const ready = () => page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
        const snapshot = () => page.evaluate(() => window.__ownerlessQA);
        async function verify(a) { await ready(); const s = await snapshot(); for (const [key, id] of Object.entries(ids(a))) {
            assert.equal(s.lists[key].value.length, 1, key);
            assert.equal(s.lists[key].value[0].id, id, key + ' owner');
        } }
        async function empty() { await ready(); const s = await snapshot(); for (const x of Object.values(s.lists))
            assert.equal(x.value.length, 0); }
        async function login(a) { await page.getByLabel('Email', { exact: true }).fill(a.email); await page.getByLabel('Пароль', { exact: true }).fill(a.password); await page.getByRole('button', { name: 'Войти', exact: true }).click(); await page.waitForFunction(label => window.__ownerlessQA.actor === 'QA PR29 ' + label, a.label); await verify(a); }
        async function reload() { for (const key of ['groups', 'students', 'homework', 'hard']) {
            const button = page.getByRole('button', { name: 'Обновить ' + key, exact: true });
            await button.click();
            await ready();
        } }
        try {
            await page.goto(origin + '/gate/' + fixture.gate);
            await empty();
            record.checks.push('cold-signed-out-empty');
            await page.evaluate(() => { window.__frames = []; const frame = () => { const a = document.querySelector('[data-testid=actor]')?.textContent; const ids = [...document.querySelectorAll('[data-row-id]')].map(e => e.getAttribute('data-row-id')); window.__frames.push({ at: performance.now(), actor: a, ids }); if (window.__frames.length < 5000)
                requestAnimationFrame(frame); }; requestAnimationFrame(frame); });
            await login(fixture.actors[0]);
            await reload();
            await verify(fixture.actors[0]);
            record.checks.push('A-four-owned-lists-and-each-reload');
            await page.getByRole('button', { name: 'Выйти локально' }).click();
            await empty();
            await reload();
            await empty();
            record.checks.push('logout-repeated-reload-empty');
            await login(fixture.actors[1]);
            await verify(fixture.actors[1]);
            record.checks.push('B-without-document-reload');
            const frames = await page.evaluate(() => window.__frames), aIds = new Set(Object.values(ids(fixture.actors[0]))), bIds = new Set(Object.values(ids(fixture.actors[1])));
            for (const f of frames) {
                const allowed = f.actor === 'QA PR29 A' ? aIds : f.actor === 'QA PR29 B' ? bIds : new Set();
                assert.ok(f.ids.every(id => allowed.has(id)), 'old/foreign rows in a transition frame');
            }
            record.frames = frames.length;
            writeFileSync(`${out}/${engine}-${i}-frames.json`, JSON.stringify(frames));
            record.checks.push('frames-start-before-auth-change-owner-safe');
            for (const [position, y] of [['start', 0], ['middle', 0.5], ['end', 1]]) {
                await page.evaluate(v => scrollTo(0, v * (document.documentElement.scrollHeight - innerHeight)), y);
                await page.waitForTimeout(50);
                if (i % 4 === 0)
                    await page.screenshot({ path: `${out}/${engine}-${i}-${position}.png` });
            }
            const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, smallTargets: [...document.querySelectorAll('button,input')].filter(e => e.getBoundingClientRect().height < 44).length }));
            assert.equal(geometry.overflow, false, 'horizontal page overflow');
            assert.equal(geometry.smallTargets, 0, 'control target <44px');
            record.checks.push('scroll-start-middle-end-and-target-geometry');
            await page.reload();
            await verify(fixture.actors[1]);
            record.checks.push('cold-reload-B');
            assert.deepEqual(errors, []);
            record.status = 'PASS';
        }
        catch (e) {
            record.status = 'FAIL';
            record.error = e.message;
            await page.screenshot({ path: `${out}/${engine}-${i}-FAIL.png`, fullPage: true });
            process.exitCode = 1;
        }
        finally {
            results.push(record);
            await context.tracing.stop({ path: `${out}/${engine}-${i}-trace.zip` });
            await context.close();
            writeFileSync(`${out}/matrix-${engine}.json`, JSON.stringify(results, null, 2));
        }
        console.log(`${record.status} ${engine} ${config.viewport.width}x${config.viewport.height} ${config.colorScheme} ${config.reducedMotion}`);
    }
}
finally {
    await browser.close();
}
