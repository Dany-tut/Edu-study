// Родитель подключается к отчётам через того же бота, что и tg-webhook.
//
// Обрабатываем только две команды и только для родителей:
//   /start p_<код> — привязать чат к контакту родителя (код выдаёт учитель);
//   /stop          — отписать все родительские подписки этого чата.
// Остальные апдейты возвращаем вызывающему: они идут в обычный разбор
// обращений (tg_threads).
//
// МЕСТО ОБЪЕДИНЕНИЯ: напоминания ученикам (функция reminders) тоже привязывают
// чат через /start, с другим префиксом. Когда обе ветки в main, один диспетчер
// /start в tg-webhook разводит префиксы, а /stop гасит обе подписки.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { isStopCommand, parentStartCode, welcomeMessage } from "./parentReport.ts";

async function reply(token: string | undefined, chatId: number, text: string) {
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => undefined);
}

/** true — апдейт наш и уже обработан. */
// deno-lint-ignore no-explicit-any
export async function handleParentCommand(sb: SupabaseClient, msg: any, token: string | undefined): Promise<boolean> {
  const chatId = msg?.chat?.id;
  const text = typeof msg?.text === "string" ? msg.text : "";
  if (typeof chatId !== "number" || !text.startsWith("/")) return false;

  const code = parentStartCode(text);
  if (code) {
    const { data, error } = await sb.rpc("parent_contact_link_chat", { p_code: code, p_chat: chatId });
    if (error) { console.error("parent link", error.message); return false; }
    if (!data) {
      await reply(token, chatId, "Ссылка устарела или уже использована. Попросите преподавателя прислать новую.");
      return true;
    }
    const d = data as { parent: string; child: string; teacher: string };
    await reply(token, chatId, welcomeMessage(d.parent, d.child, d.teacher));
    return true;
  }

  if (isStopCommand(text)) {
    const { data, error } = await sb.rpc("parent_contact_stop_chat", { p_chat: chatId });
    if (error || !data) return false; // не родитель — пусть разбирает основной код
    await reply(token, chatId, "Готово: отчёты больше не придут. Чтобы подключиться снова, попросите у преподавателя новую ссылку.");
    return true;
  }
  return false;
}
