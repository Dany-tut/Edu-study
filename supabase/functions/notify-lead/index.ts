// notify-lead — шлёт заявку с лендинга в Telegram.
// Секреты: supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n).trim();
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN"); const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) return new Response(JSON.stringify({ ok:false, reason:"not_configured" }), { status:200, headers:{...CORS,"Content-Type":"application/json"} });
  let body: Record<string, unknown> = {}; try { body = await req.json(); } catch {}
  const name = clip(body.name,120)||"—", contact = clip(body.contact,200), plan = clip(body.plan,60)||"—", message = clip(body.message,2000);
  if (!contact) return new Response(JSON.stringify({error:"contact_required"}), { status:400, headers:{...CORS,"Content-Type":"application/json"} });
  const text = `\u{1F4E9} <b>Новая заявка с лендинга</b>\n\n<b>Имя:</b> ${esc(name)}\n<b>Контакт:</b> ${esc(contact)}\n<b>Тариф:</b> ${esc(plan)}`+(message?`\n<b>Сообщение:</b> ${esc(message)}`:"");
  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ chat_id:chatId, text, parse_mode:"HTML", disable_web_page_preview:true }) });
  return new Response(JSON.stringify({ ok: tg.ok }), { status: tg.ok?200:502, headers:{...CORS,"Content-Type":"application/json"} });
});
