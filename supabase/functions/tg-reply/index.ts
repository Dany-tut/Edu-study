// tg-reply — ответ админа из админки → уходит человеку в Telegram + запись 'out'.
// verify_jwt=true; дополнительно проверяем роль admin.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return json({ error: "not_configured" }, 200);
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (user?.app_metadata?.role !== "admin") return json({ error: "forbidden" }, 403);
  let body: Record<string, unknown> = {}; try { body = await req.json(); } catch {}
  const threadId = String(body.thread_id ?? ""); const text = String(body.text ?? "").trim().slice(0, 4000);
  if (!threadId || !text) return json({ error: "bad_request" }, 400);
  const svc = createClient(url, service);
  const { data: thread } = await svc.from("tg_threads").select("chat_id").eq("id", threadId).single();
  if (!thread) return json({ error: "thread_not_found" }, 404);
  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: thread.chat_id, text }) });
  const tgJson = await tg.json().catch(() => ({}));
  if (!tg.ok) return json({ ok: false, tg: tgJson }, 502);
  const now = new Date().toISOString();
  await svc.from("tg_messages").insert({ thread_id: threadId, direction: "out", text, tg_message_id: tgJson?.result?.message_id ?? null });
  await svc.from("tg_threads").update({ last_message_text: text.slice(0, 200), last_message_at: now }).eq("id", threadId);
  return json({ ok: true });
});
