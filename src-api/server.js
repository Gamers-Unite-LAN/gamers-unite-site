import { createServer as createHttpServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createDatabase } from "./db.js";

const MAX_BODY_SIZE = 16 * 1024;
const MAX_GAME_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_RECOMMENDER_LENGTH = 120;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const PRODUCTION_ORIGIN = "https://gamersunitelan.com";

export function getCorsHeaders(origin, development = process.env.NODE_ENV === "development") {
  const allowed = origin === PRODUCTION_ORIGIN || (development && /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin || ""));
  return allowed ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    vary: "Origin",
  } : {};
}

export function createRateLimiter(maxRequests = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS) {
  const requests = new Map();

  return (key, now = Date.now()) => {
    const entry = requests.get(key);
    if (!entry || now >= entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    entry.count += 1;
    return { allowed: entry.count <= maxRequests, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  };
}

function cleanString(value, field, maxLength, required = false) {
  if (value === undefined && !required) return { value: "" };
  if (typeof value !== "string") return { error: `${field} must be a string.` };

  const trimmed = value.trim();
  if (required && !trimmed) return { error: `${field} is required.` };
  if (trimmed.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer.` };

  return { value: trimmed };
}

export function validateGameRecommendation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const gameName = cleanString(input.gameName, "gameName", MAX_GAME_NAME_LENGTH, true);
  if (gameName.error) return gameName;

  const description = cleanString(input.description, "description", MAX_DESCRIPTION_LENGTH);
  if (description.error) return description;

  const recommendedBy = cleanString(input.recommendedBy, "recommendedBy", MAX_RECOMMENDER_LENGTH);
  if (recommendedBy.error) return recommendedBy;

  return {
    value: {
      gameName: gameName.value,
      description: description.value,
      recommendedBy: recommendedBy.value,
    },
  };
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_BODY_SIZE) {
    throw new Error("Request body is too large.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export function createApiServer(db = createDatabase(), rateLimit = createRateLimiter()) {
  const listRecommendations = db.prepare(`
    SELECT id, game_name AS gameName, description, recommended_by AS recommendedBy, created_at AS createdAt
    FROM game_recommendations
    ORDER BY created_at DESC, id DESC
  `);
  const addRecommendation = db.prepare(`
    INSERT INTO game_recommendations (game_name, description, recommended_by)
    VALUES (?, ?, ?)
  `);
  const findRecommendation = db.prepare(`
    SELECT id, game_name AS gameName, description, recommended_by AS recommendedBy, created_at AS createdAt
    FROM game_recommendations
    WHERE id = ?
  `);

  return createHttpServer(async (request, response) => {
    const corsHeaders = getCorsHeaders(request.headers.origin);
    for (const [name, value] of Object.entries(corsHeaders)) response.setHeader(name, value);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/game-recommendations") {
      sendJson(response, 200, { gameRecommendations: listRecommendations.all() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/game-recommendations") {
      const client = request.socket.remoteAddress || "unknown";
      const limit = rateLimit(client);
      if (!limit.allowed) {
        sendJson(response, 429, { error: "Too many recommendations. Try again shortly." }, { "retry-after": limit.retryAfter });
        return;
      }

      if (request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
        sendJson(response, 400, { error: "Content-Type must be application/json." });
        return;
      }

      let body;
      try {
        body = await readJson(request);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
        return;
      }

      const validation = validateGameRecommendation(body);
      if (validation.error) {
        sendJson(response, 400, { error: validation.error });
        return;
      }

      try {
        const result = addRecommendation.run(
          validation.value.gameName,
          validation.value.description,
          validation.value.recommendedBy,
        );
        sendJson(response, 201, { gameRecommendation: findRecommendation.get(result.lastInsertRowid) });
      } catch (error) {
        if (error.code === "ERR_SQLITE_ERROR" && error.errcode === 2067) {
          sendJson(response, 409, { error: "This game has already been recommended." });
          return;
        }

        sendJson(response, 500, { error: "Unable to save game recommendation." });
      }
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  });
}

export function startServer() {
  const db = createDatabase();
  const server = createApiServer(db);
  const port = Number(process.env.PORT || 3000);

  server.listen(port, () => {
    console.log(`Gamers Unite API listening on http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => db.close());
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
