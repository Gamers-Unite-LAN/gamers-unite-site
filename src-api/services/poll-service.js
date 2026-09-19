import { POLL_CATEGORIES } from "../utils.js";
const DISCORD_WEBHOOK_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "ptb.discord.com",
]);

function webhookUrl() {
  const value = process.env.DISCORD_POLLS_WEBHOOK_URL;
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DISCORD_POLLS_WEBHOOK_URL must be a valid URL.");
  }
  if (url.protocol !== "https:" || !DISCORD_WEBHOOK_HOSTS.has(url.hostname) || !/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname)) {
    throw new Error("DISCORD_POLLS_WEBHOOK_URL must be a Discord HTTPS webhook URL.");
  }
  return url;
}

async function discordRequest(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Discord webhook request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : "."}`);
  }
  return response;
}

function categoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildPollResultsImage({ eventName, category, results }) {
  const title = `${eventName} — ${categoryLabel(category)} winner`;
  const winnerLines = results.filter((result) => result.winner).map((result) => `${result.gameName} · ${result.votes} vote${result.votes === 1 ? "" : "s"}`);
  const lines = winnerLines.length ? winnerLines : ["No votes recorded"];
  const text = lines.map((line, index) => `<text x="600" y="${320 + index * 58}" text-anchor="middle" class="winner">${escapeXml(line)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#141125"/><stop offset="1" stop-color="#362318"/></linearGradient></defs><rect width="1200" height="675" fill="url(#bg)"/><circle cx="1040" cy="80" r="220" fill="#f59e0b" opacity=".12"/><circle cx="120" cy="620" r="250" fill="#22c55e" opacity=".1"/><text x="600" y="170" text-anchor="middle" fill="#fbbf24" font-family="Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="4">GAMERS UNITE LAN</text><text x="600" y="245" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="42" font-weight="700">${escapeXml(title)}</text>${text}<text x="600" y="590" text-anchor="middle" fill="#cbd5e1" font-family="Arial,sans-serif" font-size="22">Poll closed · thanks for voting</text><style>.winner{fill:#fff;font-family:Arial,sans-serif;font-size:34px;font-weight:700}</style></svg>`;
}


export function createPollWebhookClient() {
  return {
    async open({ eventName, category, games }) {
      const url = webhookUrl();
      if (!url) throw new Error("DISCORD_POLLS_WEBHOOK_URL is not configured.");
      const voteUrl = `${(process.env.DISCORD_FRONTEND_URL || "https://gamersunitelan.com").replace(/\/$/, "")}/polls`;
      const response = await discordRequest(`${url}?wait=true`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: `🎮 ${eventName}: ${categoryLabel(category)} game poll is open! Vote at ${voteUrl}`,
          embeds: [{
            title: `${categoryLabel(category)} games`,
            description: games.map((game, index) => `**${index + 1}. ${game}**`).join("\n"),
            footer: { text: "Discord login required to vote" },
          }],
        }),
      });
      return (await response.json()).id;
    },
    async warn({ messageId, eventName, category }) {
      const url = webhookUrl();
      if (!url) throw new Error("DISCORD_POLLS_WEBHOOK_URL is not configured.");
      await discordRequest(`${url}/messages/${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: `⏳ ${eventName}: ${categoryLabel(category)} game poll closes in one week — cast your vote!` }),
      });
    },
    async finalize({ messageId, eventName, category, results }) {
      const url = webhookUrl();
      if (!url) throw new Error("DISCORD_POLLS_WEBHOOK_URL is not configured.");
      const svg = buildPollResultsImage({ eventName, category, results });
      const form = new FormData();
      form.append("payload_json", JSON.stringify({
        content: `🏆 ${eventName}: ${categoryLabel(category)} poll results are final! Winner${results.filter((row) => row.winner).length === 1 ? "" : "s"}: ${results.filter((row) => row.winner).map((row) => row.gameName).join(" / ") || "No votes"}`,
        embeds: [{ title: `${categoryLabel(category)} poll results`, image: { url: "attachment://poll-results.svg" } }],
        attachments: [{ id: "0", filename: "poll-results.svg", description: "Generated poll results" }],
      }));
      form.append("files[0]", new Blob([svg], { type: "image/svg+xml" }), "poll-results.svg");
      await discordRequest(`${url}/messages/${encodeURIComponent(messageId)}`, { method: "PATCH", body: form });
      return results;
    },
  };
}

