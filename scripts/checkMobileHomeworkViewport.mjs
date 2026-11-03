// Actual phone homework viewport, portals and keyboard scroll policy; no backend.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.ISKRA_PLAYWRIGHT_MODULE || "playwright"
);
const out =
  process.env.ISKRA_QA_OUTPUT || "/tmp/iskra-mobile-homework-viewport-qa";
mkdirSync(out, { recursive: true });
const entry = `import React,{useState,useRef,useEffect}from'react';import{createRoot}from'react-dom/client';
import Viewport,{HomeworkViewportChrome as Chrome}from'./src/components/MobileHomeworkViewport';
import{useHomeworkKeyboardScroll,scrollHomeworkFlowToStart}from'./src/lib/useHomeworkKeyboardScroll';window.__resetEmpty=()=>scrollHomeworkFlowToStart(null);
function App(){const[c,S]=useState({open:false,flow:false,step:0,finished:false,mobile:true,short:false,large:false,count:18});window.__set=v=>S(x=>({...x,...v}));const card=useRef(null);useHomeworkKeyboardScroll(c.mobile,c.open,c.flow,c.finished,c.step);useEffect(()=>{if(c.flow)scrollHomeworkFlowToStart(card.current)},[c.step,c.flow]);useEffect(()=>{window.__keyboard=c.open;window.dispatchEvent(new Event('qa-keyboard'));if(window.__mutation&&!c.open)window.scrollTo(0,0)},[c.open]);return <><Viewport><div ref={card} data-answer-card style={{background:'var(--card)',borderRadius:24,padding:16}}><h1>QA Homework A</h1>{Array.from({length:c.short?1:c.count},(_,i)=><p key={i} style={{lineHeight:'28px'}}>Условие A-{i+1}: длинный текст и ответ ученика.</p>)}<textarea aria-label="Ответ A" defaultValue="answer-a-identity" style={{fontSize:16,width:'100%',height:100}}/></div><Chrome><header data-qa-top style={{position:'fixed',top:30,left:16,height:40}}>QA A · Назад</header></Chrome><Chrome bottom><nav data-qa-bottom style={{position:'fixed',bottom:88,left:16,right:16,height:c.large?180:64,background:'var(--card)',borderRadius:24}}><button onClick={()=>S(x=>({...x,step:x.step+1}))} style={{height:44}}>Следующее</button></nav></Chrome></Viewport><nav data-qa-nav style={{position:'fixed',bottom:12,left:24,right:24,height:62,background:'var(--card)',borderRadius:24}}>Навигация</nav></>};createRoot(document.getElementById('root')).render(<App/>);`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true,
  write: false,
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "local-viewport-fixture",
      setup(b) {
        b.onResolve({ filter: /lib\/useKeyboardInset$/ }, () => ({
          path: "keyboard",
          namespace: "qa",
        }));
        b.onResolve({ filter: /store\/dashboardStore$/ }, () => ({
          path: "store",
          namespace: "qa",
        }));
        b.onLoad({ filter: /.*/, namespace: "qa" }, (a) => ({
          contents:
            a.path === "store"
              ? `export const useDashboard={getState:()=>({setLessonScrolled:v=>window.__docked=v})}`
              : `import{useSyncExternalStore}from'react';export const useKeyboardOpen=()=>useSyncExternalStore(fn=>{window.addEventListener('qa-keyboard',fn);return()=>window.removeEventListener('qa-keyboard',fn)},()=>window.__keyboard||false);`,
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
// Integration guards: the real homework routes through the tested surface/policy.
const dashboard = readFileSync("src/pages/DashboardPage.tsx", "utf8"),
  flow = readFileSync("src/components/HomeworkFlow.tsx", "utf8");
assert.match(
  dashboard,
  /showHomework && lesson && homework \? \([\s\S]*?<MobileHomeworkViewport key=\{homeworkRef\}>/,
);
assert.match(
  flow,
  /useHomeworkKeyboardScroll\(isMobile, keyboardOpen, flowMode, flowFinished, flowStep\)/,
);
assert.match(flow, /scrollHomeworkFlowToStart\(card\)/);
assert.doesNotMatch(flow, /window\.scrollTo\(0, 0\)/);
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const theme of ["light", "dark"])
    for (const width of [320, 390]) {
      const height = width === 320 ? 568 : 844,
        context = await browser.newContext({ viewport: { width, height } }),
        p = await context.newPage();
      await p.setContent(
        `<style>*{box-sizing:border-box}body{margin:0;background:${theme === "dark" ? "#111113" : "#f5f5f7"};color:${theme === "dark" ? "#eee" : "#222"};--color-bg:${theme === "dark" ? "#111113" : "#f5f5f7"};--card:${theme === "dark" ? "#222225" : "white"}}</style><div id="root"></div>`,
      );
      await p.addScriptTag({ content: bundle.outputFiles[0].text });
      await p.locator("[data-answer-card]").waitFor();
      const set = async (value) => {
        await p.evaluate((v) => window.__set(v), value);
        await p.waitForTimeout(60);
      };
      const read = () =>
        p
          .locator("[data-homework-scroll]")
          .evaluate((e) => ({
            top: e.scrollTop,
            max: e.scrollHeight - e.clientHeight,
            overflow: e.style.overflowY,
            mask: getComputedStyle(e).maskImage,
            padding: parseFloat(getComputedStyle(e).paddingTop),
            first: e.firstElementChild.getBoundingClientRect().top,
            body: document.scrollingElement.scrollHeight,
            windowY: window.scrollY,
            clearance: parseFloat(getComputedStyle(e).paddingBottom) - 48,
          }));
      let initial = await read();
      assert.equal(initial.top, 0);
      assert.equal(initial.first, initial.padding);
      assert.notEqual(initial.mask, "none");
      assert.equal(initial.body, height);
      for (const fixed of [
        "[data-qa-top]",
        "[data-qa-bottom]",
        "[data-qa-nav]",
      ])
        assert.equal(
          await p
            .locator(fixed)
            .evaluate((e) => !!e.closest("[data-homework-scroll]")),
          false,
        );
      await p.screenshot({ path: `${out}/${theme}-${width}-start.png` });
      await p.evaluate(() => {
        window.__frames = [];
        window.__capture = true;
        const tick = () => {
          if (!window.__capture) return;
          const e = document.querySelector("[data-homework-scroll]");
          window.__frames.push({
            top: e.scrollTop,
            mask: getComputedStyle(e).maskImage,
            windowY: window.scrollY,
          });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await p.locator("[data-homework-scroll]").hover();
      await p.mouse.wheel(0, Math.min(200, initial.max / 2));
      await p.waitForTimeout(180);
      let middle = await read();
      assert.ok(middle.top > 0 && middle.top < middle.max);
      assert.notEqual(middle.mask, "none");
      await p.screenshot({ path: `${out}/${theme}-${width}-middle.png` });
      const answer = await p
        .getByRole("textbox", { name: "Ответ A" })
        .inputValue();
      // A long-list keyboard cycle keeps the currently focused answer's reading offset.
      await p.getByRole("textbox", { name: "Ответ A" }).focus();
      const before = await read();
      await set({ open: true });
      await set({ open: false });
      const after = await read();
      assert.equal(after.top, before.top);
      assert.equal(
        await p.getByRole("textbox", { name: "Ответ A" }).inputValue(),
        answer,
      );
      for (let i = 0; i < 5; i++) {
        await set({ open: true });
        await set({ open: false });
      }
      assert.equal((await read()).top, before.top);
      await set({ flow: true });
      await p
        .locator("[data-homework-scroll]")
        .evaluate((e) => (e.scrollTop = 350));
      await set({ open: true });
      assert.equal((await read()).overflow, "hidden");
      await set({ open: false });
      assert.equal((await read()).overflow, "auto");
      assert.equal((await read()).top, 350);
      await set({ open: true });
      await set({ step: 1 });
      assert.equal((await read()).top, 0);
      await set({ open: false });
      assert.equal((await read()).top, 0);
      await p.locator('[data-homework-scroll]').evaluate(e => e.scrollTop = 250);
    await p.evaluate(() => window.__resetEmpty());
    assert.equal((await read()).top, 0);
    await set({ flow: false, large: true });
      assert.ok((await read()).clearance >= 268);
      await p.mouse.wheel(0, 10000);
      await p.waitForTimeout(180);
      const end = await read();
      assert.equal(end.top, end.max);
      await p.screenshot({ path: `${out}/${theme}-${width}-end.png` });
      await set({ count: 25 });
      assert.ok((await read()).max > end.max);
      await p.mouse.wheel(0, -10000);
      await p.waitForTimeout(180);
      assert.equal((await read()).top, 0);
      await set({ short: true, large: false });
      await p.waitForTimeout(100);
      const short = await read();
      assert.equal(short.max, 0);
      assert.equal(short.mask, "none");
      await p.evaluate(() => (window.__capture = false));
      const frames = await p.evaluate(() => window.__frames);
      assert.ok(frames.every((f) => f.windowY === 0));
      assert.ok(
        frames.every(
          (f) => f.mask === "none" || f.mask.startsWith("linear-gradient("),
        ),
      );
      results.push({
        theme,
        width,
        height,
        status: "PASS",
        initial,
        middle,
        beforeDismiss: before,
        afterDismiss: after,
        end,
        short,
        frames,
      });
      await context.close();
    }
  // Preserve the legacy body-scroll position too: the old effect fails this control.
  const c = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    }),
    p = await c.newPage();
  await p.setContent('<div id="root"></div>');
  await p.addScriptTag({ content: bundle.outputFiles[0].text });
  await p.locator("[data-answer-card]").waitFor();
  await p.evaluate(() => {
    document.body.style.height = "3000px";
    window.scrollTo(0, 600);
  });
  await p.evaluate(() => window.__set({ mobile: false, open: true }));
  await p.waitForTimeout(50);
  await p.evaluate(() => window.__set({ open: false }));
  await p.waitForTimeout(50);
  assert.equal(await p.evaluate(() => window.scrollY), 600);
  await p.evaluate(() => {
    window.__mutation = true;
    window.__set({ open: true });
  });
  await p.waitForTimeout(50);
  await p.evaluate(() => window.__set({ open: false }));
  await p.waitForTimeout(50);
  assert.equal(await p.evaluate(() => window.scrollY), 0);
  results.push({
    name: "negative control old keyboard-hide reset loses600px",
    status: "PASS",
  });
  await c.close();
} finally {
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    status: "PASS",
    cases: results.map(({ theme, width, name, status }) => ({
      theme,
      width,
      name,
      status,
    })),
  }),
);
