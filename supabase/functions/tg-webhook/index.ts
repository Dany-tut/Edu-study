// tg-webhook — принимает апдейты от Telegram и пишет входящие в tg_threads/tg_messages.
// verify_jwt=false; защита — секретный токен в заголовке X-Telegram-Bot-Api-Secret-Token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("forbidden", { status: 403 });
  let update: Record<string, any> = {}; try { update = await req.json(); } catch { return new Response("ok"); }
  const msg = update.message ?? update.edited_message; const chat = msg?.chat;
  if (!msg || !chat) return new Response("ok");
  const text: string = (msg.text ?? msg.caption ?? "[вложение]").toString().slice(0, 4000);
  const now = new Date().toISOString();
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: thread, error } = await sb.from("tg_threads").upsert({ chat_id: chat.id, username: chat.username ?? null, first_name: chat.first_name ?? null, last_name: chat.last_name ?? null, last_message_text: text.slice(0,200), last_message_at: now, last_in_at: now }, { onConflict: "chat_id" }).select("id").single();
  if (error || !thread) return new Response("ok");
  await sb.from("tg_messages").insert({ thread_id: thread.id, direction: "in", text, tg_message_id: msg.message_id ?? null });
  return new Response("ok");
});
