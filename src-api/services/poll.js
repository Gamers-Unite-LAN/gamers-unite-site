import { Resvg } from "@resvg/resvg-js";
const DISCORD_API_BASE = "https://discord.com/api/v10";

function botToken() {
  const value = process.env.DISCORD_BOT_TOKEN;
  if (!value) throw new Error("DISCORD_BOT_TOKEN is not configured.");
  return value;
}

function pollChannelId() {
  const value = process.env.DISCORD_POLLS_CHANNEL_ID;
  if (!/^\d+$/.test(value || "")) {
    throw new Error("DISCORD_POLLS_CHANNEL_ID must be a Discord channel ID.");
  }
  return value;
}

async function discordRequest(path, options = {}) {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Bot ${botToken()}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Discord bot request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : "."}`);
  }
  return response;
}


function categoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function voteUrl() {
  return `${(process.env.DISCORD_FRONTEND_URL || "https://gamersunitelan.com").replace(/\/$/, "")}/polls`;
}

function voteComponents() {
  return [{
    type: 1,
    components: [{ type: 2, style: 5, label: "Vote", url: voteUrl() }],
  }];
}



function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildPollImage({ eventName, category, results, finalized = false }) {
  const totalVotes = results.reduce((total, result) => total + result.votes, 0);
  const maxVotes = Math.max(1, ...results.map((result) => result.votes));
  const rows = results.map((result, index) => {
    const y = 180 + index * 110;
    const percentage = totalVotes ? (result.votes / totalVotes) * 100 : 0;
    const barWidth = Math.round((result.votes / maxVotes) * 900);
    const winnerLabel = finalized && result.winner ? " · Winner" : "";
    return `<rect x="60" y="${y}" width="1080" height="84" rx="16" fill="#25213a"/><text x="90" y="${y + 32}" fill="#fff" font-family="Arial,sans-serif" font-size="25" font-weight="700">${escapeXml(result.gameName)}${winnerLabel}</text><text x="1110" y="${y + 32}" text-anchor="end" fill="#ddd8ed" font-family="Arial,sans-serif" font-size="22">${result.votes} vote${result.votes === 1 ? "" : "s"} · ${percentage.toFixed(1)}%</text><rect x="90" y="${y + 51}" width="900" height="10" rx="5" fill="#403a59"/><rect x="90" y="${y + 51}" width="${barWidth}" height="10" rx="5" fill="#fbbf24"/>`;
  }).join("");
  const title = `${eventName} — ${categoryLabel(category)} games`;
  const subtitle = finalized ? "Final results" : "Live results · updates hourly";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#141125"/><stop offset="1" stop-color="#362318"/></linearGradient></defs><rect width="1200" height="675" fill="url(#bg)"/><circle cx="1040" cy="80" r="220" fill="#f59e0b" opacity=".12"/><circle cx="120" cy="620" r="250" fill="#22c55e" opacity=".1"/><text x="60" y="72" fill="#fbbf24" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">GAMERS UNITE LAN</text><text x="60" y="120" fill="#fff" font-family="Arial,sans-serif" font-size="36" font-weight="700">${escapeXml(title)}</text><text x="60" y="150" fill="#c9c3d7" font-family="Arial,sans-serif" font-size="20">${subtitle}</text>${rows}<text x="60" y="570" fill="#c9c3d7" font-family="Arial,sans-serif" font-size="20">${totalVotes} total vote${totalVotes === 1 ? "" : "s"}</text><text x="1140" y="570" text-anchor="end" fill="#fbbf24" font-family="Arial,sans-serif" font-size="20" font-weight="700">Vote on the website</text></svg>`;
}

function renderPollPng(svg) {
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

function pollMessageForm(content, png, components) {
  const form = new FormData();
  form.append("payload_json", JSON.stringify({
    content,
    components,
    attachments: [{ id: "0", filename: "poll.png", description: "Poll results" }],
  }));
  form.append("files[0]", new Blob([png], { type: "image/png" }), "poll.png");
  return form;
}

function buildPollResultsImage({ eventName, category, results }) {
  return buildPollImage({ eventName, category, results, finalized: true });
}


export function createPollBotClient() {
  return {
    async open({ eventName, category, games, results }) {
      const currentResults = results || games.map((gameName) => ({ gameName, votes: 0 }));
      const form = pollMessageForm(
        `🎮 ${eventName}: ${categoryLabel(category)} game poll is open! Vote using the button below.`,
        renderPollPng(buildPollImage({ eventName, category, results: currentResults })),
        voteComponents(),
      );
      const response = await discordRequest(`/channels/${pollChannelId()}/messages`, { method: "POST", body: form });
      return (await response.json()).id;
    },
    async updateResults({ messageId, eventName, category, results }) {
      const form = pollMessageForm(
        `🎮 ${eventName}: ${categoryLabel(category)} game poll — vote using the button below.`,
        renderPollPng(buildPollImage({ eventName, category, results })),
        voteComponents(),
      );
      await discordRequest(`/channels/${pollChannelId()}/messages/${encodeURIComponent(messageId)}`, { method: "PATCH", body: form });
    },
    async warn({ messageId, eventName, category }) {
      await discordRequest(`/channels/${pollChannelId()}/messages/${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: `⏳ ${eventName}: ${categoryLabel(category)} game poll closes in one week — use the Vote button.` }),
      });
    },
    async finalize({ messageId, eventName, category, results }) {
      const form = pollMessageForm(
        `🏆 ${eventName}: ${categoryLabel(category)} poll results are final! Winner${results.filter((row) => row.winner).length === 1 ? "" : "s"}: ${results.filter((row) => row.winner).map((row) => row.gameName).join(" / ") || "No votes"}`,
        renderPollPng(buildPollResultsImage({ eventName, category, results })),
        [],
      );
      await discordRequest(`/channels/${pollChannelId()}/messages/${encodeURIComponent(messageId)}`, { method: "PATCH", body: form });
      return results;
    },
  };
}

