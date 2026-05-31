// Fires when someone successfully enters the /aircraft passphrase.
// Posts a Telegram alert via the bot configured in env vars.
// Required env vars (set in Netlify dashboard):
//   TELEGRAM_BOT_TOKEN  - the bot's token from BotFather
//   TELEGRAM_CHAT_ID    - the chat to notify

const TELEGRAM_API = "https://api.telegram.org/bot";

exports.handler = async (event) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { statusCode: 500, body: "unconfigured" };
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    payload = {};
  }

  const headers = event.headers || {};
  const ip =
    headers["x-nf-client-connection-ip"] ||
    (headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown";
  const ua = (headers["user-agent"] || "unknown").slice(0, 160);
  const page = String(payload.page || "unknown").slice(0, 200);
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);

  let geo = "";
  if (ip && ip !== "unknown") {
    try {
      const resp = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const j = await resp.json();
        const parts = [j.city, j.region, j.country_name].filter(Boolean);
        if (parts.length) geo = parts.join(", ");
      }
    } catch (_) {
      /* geo lookup is best-effort */
    }
  }

  const text = [
    "🛬 <b>aircraftBroker unlock</b>",
    `<b>When:</b> ${ts} UTC`,
    `<b>From:</b> ${escapeHtml(ip)}${geo ? ` (${escapeHtml(geo)})` : ""}`,
    `<b>Page:</b> ${escapeHtml(page)}`,
    `<b>UA:</b> <code>${escapeHtml(ua)}</code>`,
  ].join("\n");

  // Diagnostic: surface Telegram error details to help debug env-var issues.
  // Token length is logged so you can see if the env var was truncated or
  // padded without exposing the secret itself.
  const tokenLen = token.length;
  const tokenHead = token.slice(0, 4);
  try {
    const tgResp = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!tgResp.ok) {
      const body = (await tgResp.text()).slice(0, 400);
      const chatIdHex = Array.from(chatId)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(" ");
      return {
        statusCode: 502,
        body: `telegram error: status=${tgResp.status} ` +
              `tokenLen=${tokenLen} tokenHead=${tokenHead} ` +
              `chatIdLen=${chatId.length} ` +
              `chatIdRaw="${chatId}" ` +
              `chatIdHex="${chatIdHex}" ` +
              `body=${body}`,
      };
    }
  } catch (e) {
    return {
      statusCode: 502,
      body: `telegram fetch failed: ${e?.message || String(e)} ` +
            `tokenLen=${tokenLen} tokenHead=${tokenHead}`,
    };
  }

  return {
    statusCode: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
    body: "",
  };
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
