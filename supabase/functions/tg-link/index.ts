// tg-link — одноразовая ссылка t.me/<бот>?start=<код> для карточки ученика.
// verify_jwt=true. Права (учитель этого ученика, функция reminders включена)
// проверяет tg_link_create под JWT учителя; здесь — только имя бота из getMe.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
let botName: string | null = null;
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return json({ error: "not_configured" });
  let body: Record<string, unknown> = {}; try { body = await req.json(); } catch { /* пусто */ }
  const studentId = String(body.student_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return json({ error: "bad_request" }, 400);
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data, error } = await user.rpc("tg_link_create", { p_student: studentId });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row?.code) return json({ error: "forbidden" }, 403);
  if (!botName) {
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()).catch(() => null);
    botName = me?.result?.username ?? null;
  }
  if (!botName) return json({ error: "bot_unavailable" }, 502);
  return json({ url: `https://t.me/${botName}?start=${row.code}`, expires_at: row.expires_at });
});
