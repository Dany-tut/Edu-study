import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { isStopCommand, parentStartCode, reportMessage, weekLabel, welcomeMessage } from "./parentReport.ts";

Deno.test("weekLabel: одна и две недели месяца", () => {
  assertEquals(weekLabel("2026-11-02"), "2–8 ноября");
  assertEquals(weekLabel("2026-10-26"), "26 октября – 1 ноября");
});

Deno.test("reportMessage: цифры, фразы, экранирование", () => {
  const text = reportMessage(
    { week_start: "2026-11-02", child: "Маша", subject: "Химия", lessons_total: 3, lessons_attended: 3, hw_done: 2, hw_returned: 1, avg_pct: 81, prev_avg_pct: 74 },
    "Решает <ОВР> & цепочки", "Сроки домашки", "Анна Сергеевна",
  );
  assertStringIncludes(text, "<b>Маша · неделя 2–8 ноября</b>");
  assertStringIncludes(text, "Уроки: 3 из 3");
  assertStringIncludes(text, "сдано 2, на доработке 1");
  assertStringIncludes(text, "Средний балл: 81% (было 74%)");
  assertStringIncludes(text, "Решает &lt;ОВР&gt; &amp; цепочки");
  assertStringIncludes(text, "<i>Анна Сергеевна · химия</i>");
});

Deno.test("reportMessage: пустая неделя без фраз", () => {
  const text = reportMessage({ week_start: "2026-11-02", child: "Артём" }, null, "  ", "Учитель");
  assertStringIncludes(text, "Уроков на этой неделе не было");
  assertStringIncludes(text, "не сдавались");
  assertEquals(text.includes("Работаем над"), false);
});

Deno.test("команды бота", () => {
  assertEquals(parentStartCode("/start p_abcdef23456k"), "abcdef23456k");
  assertEquals(parentStartCode("/start@iskra_bot p_ABCDEF23456K"), "abcdef23456k");
  assertEquals(parentStartCode("/start s_abcdef23456k"), null);
  assertEquals(parentStartCode("/start"), null);
  assertEquals(isStopCommand("/stop"), true);
  assertEquals(isStopCommand("/stop please"), false);
  assertStringIncludes(welcomeMessage("Ольга", "Маша", "Анна <С>"), "Анна &lt;С&gt;");
});
