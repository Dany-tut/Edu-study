// Render the actual private ResultModal source, without booting Auth/backend.
import { build } from "esbuild";
import ts from "typescript";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.ISKRA_PLAYWRIGHT_MODULE || "playwright"
);
const out = process.env.ISKRA_QA_OUTPUT || "/tmp/iskra-result-modal-qa";
mkdirSync(out, { recursive: true });
const source = readFileSync("src/components/HomeworkFlow.tsx", "utf8");
const ast = ts.createSourceFile(
  "HomeworkFlow.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const declaration = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "ResultModal",
);
assert.ok(declaration, "Actual ResultModal declaration exists");
const actual = declaration.getText(ast);
const entry = (
  code,
) => `import React,{useRef,useState}from'react';import{createRoot}from'react-dom/client';import{motion}from'framer-motion';import{Send,CircleAlert}from'./src/components/icons/appIcons';import{PURPLE}from'./src/lib/theme';import{EN}from'./src/lib/i18nEn';
const useT=()=>key=>window.__lang==='en'?EN[key]??key:key;
const ConfettiCanvas=({active})=><span hidden data-qa-confetti={String(active)}/>;
const PartyPopperLottie=()=> <span data-qa-success-icon/>;const HardStarLottie=()=> <span/>;
const EmojiSlider=({onChange})=><button onClick={()=>onChange(3)}>QA assessment</button>;
const playUnlock=()=>window.__unlocks++;const vibrate=()=>{};
${code}
window.__calls=[];window.__unlocks=0;window.__root=createRoot(document.getElementById('root'));window.__render=props=>window.__root.render(<ResultModal key={JSON.stringify(props)} {...props} onContinue={async(...args)=>{window.__calls.push(args);if(window.__fail)throw Error('QA rejected')}}/>);`;
const bundles = {};
for (const [name, code] of [
  ["actual", actual],
  [
    "old",
    actual.replace(
      "const passed = context === 'basic'",
      "const passed = showHard && context === 'basic'",
    ),
  ],
]) {
  const result = await build({
    stdin: { contents: entry(code), resolveDir: process.cwd(), loader: "tsx" },
    bundle: true,
    write: false,
    format: "iife",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  bundles[name] = result.outputFiles[0].text;
}
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ])
    for (const theme of ["light", "dark"])
      for (const lang of ["ru", "en"]) {
        const context = await browser.newContext({ viewport }),
          p = await context.newPage();
        await p.setContent(
          `<style>*{box-sizing:border-box}body{margin:0;font-family:Arial;--color-bg-input:${theme === "dark" ? "#202024" : "#fff"};--color-bg-3:${theme === "dark" ? "#303035" : "#f5f5f7"};--color-text:${theme === "dark" ? "#f5f5f7" : "#222"};--color-text-2:${theme === "dark" ? "#ccc" : "#555"};--color-muted:#888;--color-green-accent:#2b7;--color-accent:#96e;--color-amber:#c80}</style><div id="root"></div>`,
        );
        await p.evaluate((lang) => (window.__lang = lang), lang);
        await p.addScriptTag({ content: bundles.actual });
        for (const showHard of [false, true])
          for (const score of [79, 80, 100, undefined]) {
            await p.evaluate((props) => window.__render(props), {
              context: "basic",
              recommendationScore: 80,
              showHard,
              score,
            });
            await p.waitForTimeout(70);
            const text = await p.locator("body").innerText(),
              passed = score !== undefined && score >= 80,
              hard = passed && showHard;
            assert.equal(
              await p
                .locator("[data-qa-confetti]")
                .getAttribute("data-qa-confetti"),
              String(passed),
            );
            assert.equal(
              await p.locator("[data-qa-success-icon]").count(),
              passed ? 1 : 0,
            );
            const cta =
              lang === "en" ? "Start the advanced level" : "Приступить к харду";
            const hardButton = p.getByRole("button", {
              name: cta,
              exact: true,
            });
            // Use the actual translated label, independent of the exact English wording.
            const buttons = await p.getByRole("button").allTextContents();
            const primary = p.getByRole("button").last();
            assert.equal(buttons.length, hard ? 3 : 2);
            if (score === undefined) {
              assert.match(
                text,
                lang === "en"
                  ? /Submitted for review!/
                  : /Отправлено на проверку!/,
              );
              assert.doesNotMatch(text, /80|100/);
            } else if (passed) {
              assert.match(
                text,
                new RegExp(
                  lang === "en" ? `Excellent, ${score}` : `Отлично, ${score}`,
                ),
              );
              assert.match(
                text,
                lang === "en" ? /threshold passed/ : /порог пройден/,
              );
            } else {
              assert.match(
                text,
                new RegExp(lang === "en" ? `So far ${score}` : `Пока ${score}`),
              );
              assert.match(
                text,
                showHard
                  ? lang === "en"
                    ? /1 to unlock the advanced level/
                    : /1 до открытия харда/
                  : lang === "en"
                    ? /1 to threshold/
                    : /1 до порога/,
              );
            }
            if (!showHard)
              assert.doesNotMatch(
                text,
                lang === "en" ? /advanced level|hard level/i : /хар[дт]/i,
              );
            await primary.click();
            await p.waitForTimeout(30);
            const call = await p.evaluate(() => window.__calls.at(-1));
            assert.equal(call[1] === true, hard);
            if (hard) {
              await p.getByRole("button").nth(1).click();
              await p.waitForTimeout(20);
              assert.equal(
                await p.evaluate(() => window.__calls.at(-1)[1]),
                false,
              );
            }
            if (score === 100 && !showHard)
              await p.screenshot({
                path: `${out}/${theme}-${lang}-${viewport.width}-basic-only-100.png`,
              });
            results.push({
              viewport,
              theme,
              lang,
              score: score ?? "pending",
              showHard,
              passed,
              hard,
              status: "PASS",
            });
          }
        // Pending hard submissions remain sent for review, not a basic success.
        await p.evaluate(() =>
          window.__render({ context: "hard", showHard: true }),
        );
        await p.waitForTimeout(30);
        assert.equal(
          await p
            .locator("[data-qa-confetti]")
            .getAttribute("data-qa-confetti"),
          "false",
        );
        await p.evaluate(() => {
          window.__fail = true;
          window.__render({
            context: "basic",
            score: 100,
            recommendationScore: 80,
            showHard: false,
          });
        });
        await p.waitForTimeout(30);
        await p.getByRole("button").last().click();
        await p.getByRole("alert").waitFor();
        assert.equal(await p.getByRole("button").last().isEnabled(), true);
        await p.evaluate(() => (window.__fail = false));
        await p.getByRole("button").last().click();
        await p.waitForTimeout(30);
        assert.equal(await p.getByRole("alert").count(), 0);
        await context.close();
      }
  const c = await browser.newContext(),
    p = await c.newPage();
  await p.setContent('<div id="root"></div>');
  await p.addScriptTag({ content: bundles.old });
  await p.evaluate(() =>
    window.__render({
      context: "basic",
      score: 100,
      recommendationScore: 80,
      showHard: false,
    }),
  );
  await p.waitForTimeout(30);
  assert.equal(
    await p.locator("[data-qa-confetti]").getAttribute("data-qa-confetti"),
    "false",
  );
  assert.match(await p.locator("body").innerText(), /Пока 100/);
  results.push({
    name: "negative control old showHard predicate mislabels100",
    status: "PASS",
  });
  await c.close();
} finally {
  writeFileSync(
    `${out}/report.json`,
    JSON.stringify(
      {
        sourceSha256: createHash("sha256").update(actual).digest("hex"),
        results,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(
  JSON.stringify({
    status: "PASS",
    matrixCases: results.length - 1,
    negativeControl: "old showHard dependency reproduced",
  }),
);
