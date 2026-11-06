// reminders-send — отправляет созревшие напоминания ученикам ботом Искры.
// Будит его крон reminders-dispatch (миграция 20261108100000_tg_reminders.sql),
// только когда в reminder_outbox есть строки к отправке.
//
// verify_jwt=false; защита — заголовок x-reminders-secret (тот же, что в Vault
// под именем reminders_cron_secret). Секреты: TELEGRAM_BOT_TOKEN,
// REMINDERS_CRON_SECRET, APP_URL (необязательно, кнопка «Открыть Искру»).
//
// Итог каждой строки — reminders_mark: sent; failed + blocked (ученик
// заблокировал бота, чат не найден); временная ошибка (429, 5xx, сеть) —
// обратно в очередь через 2 минуты, до 3 попыток.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type SendResult = { ok: true } | { ok: false; error: string; blocked: boolean; retry: boolean };

/** Ответ Telegram → итог строки. */
export function classify(status: number, description: string): SendResult {
  if (status >= 200 && status < 300) return { ok: true };
  const d = description.toLowerCase();
  if (status === 403 || d.includes("chat not found") || d.includes("user is deactivated")) {
    return { ok: false, error: d.includes("blocked") ? "blocked" : d.includes("deactivated") ? "deactivated" : status === 403 ? "forbidden" : "chat_not_found", blocked: true, retry: false };
  }
  if (status === 429 || status >= 500) return { ok: false, error: `telegram_${status}`, blocked: false, retry: true };
  return { ok: false, error: `telegram_${status}: ${description.slice(0, 200)}`, blocked: false, retry: false };
}

export function messageText(title: string, body: string): string {
  return `<b>${esc(title)}</b>\n${esc(body)}`;
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("REMINDERS_CRON_SECRET");
  if (!secret || req.headers.get("x-reminders-secret") !== secret) return new Response("forbidden", { status: 403 });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "not_configured" }), { status: 200 });
  const appUrl = Deno.env.get("APP_URL") ?? "https://edu-study-app.vercel.app";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: rows, error } = await sb.rpc("reminders_claim", { p_limit: 50 });
  if (error) return new Response(JSON.stringify({ error: "claim_failed" }), { status: 500 });
  let sent = 0, failed = 0;
  for (const r of (rows ?? []) as { id: string; chat_id: number; title: string; body: string }[]) {
    let result: SendResult;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: r.chat_id,
          text: messageText(r.title, r.body),
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "Открыть Искру", url: appUrl }]] },
        }),
      });
      const json = await res.json().catch(() => ({}));
      result = classify(res.status, String(json?.description ?? ""));
    } catch {
      result = { ok: false, error: "network", blocked: false, retry: true };
    }
    if (result.ok) sent++; else failed++;
    await sb.rpc("reminders_mark", result.ok
      ? { p_id: r.id, p_ok: true }
      : { p_id: r.id, p_ok: false, p_error: result.error, p_blocked: result.blocked, p_retry: result.retry });
    // Telegram: не больше ~30 сообщений в секунду на бота.
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
});
