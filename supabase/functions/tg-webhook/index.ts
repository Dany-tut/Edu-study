// tg-webhook — принимает апдейты от Telegram и пишет входящие в tg_threads/tg_messages.
// verify_jwt=false; защита — секретный токен в заголовке X-Telegram-Bot-Api-Secret-Token.
//
// Напоминания ученикам (функция reminders): «/start <код>» по ссылке из карточки
// ученика связывает чат с учеником (tg_link_claim), «/stop» отвязывает. Код в
// журнал диалогов не пишется.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleParentCommand } from "../_shared/parentLink.ts";
const START = /^\/start(?:@\w+)?\s+([0-9a-f]{32})\s*$/i;
const STOP = /^\/stop(?:@\w+)?\s*$/i;
async function reply(chatId: number, text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  try { await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text }) }); } catch { /* ответ бота не важнее записи */ }
}
Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("forbidden", { status: 403 });
  let update: Record<string, any> = {}; try { update = await req.json(); } catch { return new Response("ok"); }
  const msg = update.message ?? update.edited_message; const chat = msg?.chat;
  if (!msg || !chat) return new Response("ok");
  let text: string = (msg.text ?? msg.caption ?? "[вложение]").toString().slice(0, 4000);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // /stop гасит обе подписки чата: родительские отчёты и напоминания ученику.
  if (update.message && STOP.test(text.trim())) {
    const [{ data: p }, { data: s }] = await Promise.all([
      sb.rpc("parent_contact_stop_chat", { p_chat: chat.id }),
      sb.rpc("tg_unlink_chat", { p_chat: chat.id }),
    ]);
    const parent = Number(p) > 0, student = Number(s) > 0;
    if (parent || student) {
      await reply(chat.id, parent && student
        ? "Готово: отчёты и напоминания больше не придут. Чтобы подключиться снова, попросите новую ссылку."
        : parent
          ? "Готово: отчёты больше не придут. Чтобы подключиться снова, попросите у преподавателя новую ссылку."
          : "Напоминания отключены. Чтобы вернуть, попросите у учителя новую ссылку.");
    }
    // Команда родителя в обращения не пишется; ученика — пишется, как раньше.
    if (parent && !student) return new Response("ok");
  } else if (await handleParentCommand(sb, msg, Deno.env.get("TELEGRAM_BOT_TOKEN"))) {
    // Родитель: /start p_<код>. Не попадает в обращения.
    return new Response("ok");
  }
  const start = update.message && chat.type === "private" ? START.exec(text.trim()) : null;
  if (start) {
    const { data: name } = await sb.rpc("tg_link_claim", { p_code: start[1].toLowerCase(), p_chat: chat.id, p_username: chat.username ?? null, p_first_name: chat.first_name ?? null });
    await reply(chat.id, name
      ? `${name}, готово! Сюда будут приходить напоминания об уроках и домашке. Отключиться — /stop`
      : "Ссылка устарела или уже использована. Попросите учителя прислать новую.");
    text = name ? "/start · подключил напоминания" : "/start · ссылка не подошла";
  }
  const now = new Date().toISOString();
  const { data: thread, error } = await sb.from("tg_threads").upsert({ chat_id: chat.id, username: chat.username ?? null, first_name: chat.first_name ?? null, last_name: chat.last_name ?? null, last_message_text: text.slice(0,200), last_message_at: now, last_in_at: now }, { onConflict: "chat_id" }).select("id").single();
  if (error || !thread) return new Response("ok");
  await sb.from("tg_messages").insert({ thread_id: thread.id, direction: "in", text, tg_message_id: msg.message_id ?? null });
  return new Response("ok");
});
