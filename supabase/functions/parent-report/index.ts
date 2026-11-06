// Edge Function: отчёт родителю (функция parent_report, миграция 20261108110000).
//
// mode = 'send' — отправить утверждённые отчёты. Cron по воскресеньям
//   (x-digest-secret = DIGEST_SECRET) — всем учителям с включённой функцией;
//   учитель по JWT («Отправить сейчас») — только свои.
//   Telegram: весь текст отчёта каждому подключённому родителю. Без Telegram
//   отчёт считается доставленным, если у ученика есть ссылка на страницу.
//   Иначе — «не дошёл» с причиной.
// mode = 'page'  — страница по ссылке /#/r/<токен>, без входа. Только имя
//   ребёнка, предмет, учитель и отправленные недели.
// mode = 'bot'   — имя бота для ссылки-приглашения t.me/<бот>?start=p_<код>.
//
// Доступ учителя проверяет база: parent_report_guard (функция выдана и
// включена, MFA пройдена) — сюда приходим через его же RPC.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { MFA_REQUIRED, mfaPending } from "../_shared/mfa.ts";
import { reportMessage, type ReportStats } from "../_shared/parentReport.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Due = {
  id: string; teacher_id: string; teacher_name: string; stats: ReportStats;
  strengths: string | null; focus: string | null; chats: number[]; has_link: boolean;
};

async function tgSend(token: string, chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body?.ok !== false, code: res.status, description: String(body?.description ?? "") };
}

async function send(admin: SupabaseClient, token: string | undefined, teacher: string | null) {
  const { data, error } = await admin.rpc("parent_reports_due", { p_teacher: teacher });
  if (error) throw new Error(`due: ${error.message}`);
  let sent = 0, failed = 0;
  for (const r of (data ?? []) as Due[]) {
    let tg = 0, blocked = 0, tgError = "";
    if (token) {
      const text = reportMessage(r.stats ?? {}, r.strengths, r.focus, r.teacher_name);
      for (const chat of r.chats ?? []) {
        const res = await tgSend(token, chat, text);
        if (res.ok) tg++;
        else if (res.code === 403) blocked++;
        else tgError = res.description.slice(0, 120);
      }
    }
    const ok = tg > 0 || r.has_link;
    // Причина — словами для учителя, без сырых ответов API (ALERT-01).
    const reason = ok ? null
      : blocked > 0 ? "Родитель заблокировал бота"
      : (r.chats ?? []).length === 0 ? "Родитель не подключён и ссылки нет"
      : !token ? "Telegram не настроен"
      : "Telegram не принял сообщение";
    if (!ok && tgError) console.error("parent-report tg", r.id, tgError);
    const { error: markError } = await admin.rpc("parent_report_mark", {
      p_id: r.id, p_ok: ok, p_error: reason, p_delivered: { tg, blocked, link: r.has_link },
    });
    if (markError) console.error("parent-report mark", r.id, markError.message);
    if (ok) sent++; else failed++;
  }
  return { sent, failed };
}

let botName: string | null = null;
async function bot(token: string | undefined) {
  if (botName) return botName;
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()).catch(() => null);
  botName = typeof res?.result?.username === "string" ? res.result.username : null;
  return botName;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const cronSecret = Deno.env.get("DIGEST_SECRET");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* пустое тело */ }
  const mode = String(body.mode ?? "");

  // Страница по ссылке — без входа, только по токену.
  if (mode === "page") {
    const tok = String(body.token ?? "").toLowerCase();
    if (!/^[a-z0-9]{24}$/.test(tok)) return json({ error: "not_found" }, 404);
    const { data, error } = await admin.rpc("parent_report_page", { p_token: tok });
    if (error) { console.error("parent-report page", error.message); return json({ error: "unavailable" }, 503); }
    if (!data) return json({ error: "not_found" }, 404);
    return json(data);
  }

  const secret = req.headers.get("x-digest-secret");
  const isCron = !!(cronSecret && secret && secret === cronSecret);
  let teacher: string | null = null;
  if (!isCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    if (mfaPending(user, authHeader)) return json(MFA_REQUIRED, 403);
    // Функция выдана и включена — проверяет база тем же правилом, что и экран.
    const { error: guard } = await caller.rpc("parent_reports_summary");
    if (guard) return json({ error: "forbidden" }, 403);
    teacher = user.id;
  }

  try {
    if (mode === "bot") return json({ username: await bot(token) });
    if (mode === "send") return json(await send(admin, token, isCron ? null : teacher));
    return json({ error: "bad_request" }, 400);
  } catch (e) {
    console.error("parent-report", mode, e);
    return json({ error: "failed" }, 500);
  }
});
