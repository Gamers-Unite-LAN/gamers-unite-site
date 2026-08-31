import { createServer as createHttpServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createDatabase } from "./db.js";
import {
  createStorage,
  generateImageId,
  isValidPathSegment,
  keyForImage,
} from "./storage.js";

const MAX_BODY_SIZE = 16 * 1024;
const MAX_GAME_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_RECOMMENDER_LENGTH = 120;
const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_SIZE || 8 * 1024 * 1024);
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_EVENT_NAME_LENGTH = 120;
const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const PRODUCTION_ORIGIN = "https://gamersunitelan.com";

export function getCorsHeaders(
  origin,
  development = process.env.NODE_ENV === "development",
) {
  const allowed =
    origin === PRODUCTION_ORIGIN ||
    (development &&
      /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin || ""));
  return allowed
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization",
        vary: "Origin",
      }
    : {};
}

// Uploads and deletes require a shared secret; listing/serving images is
// public since these are public website assets. Set UPLOAD_API_KEY in the
// environment -- if it's unset, uploads/deletes are refused rather than
// left open.
function isAuthorizedUploader(request) {
  const configured = process.env.UPLOAD_API_KEY;
  if (!configured) return false;
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === configured;
}

async function readBinaryBody(request, maxSize) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (
    !Number.isFinite(contentLength) ||
    contentLength <= 0 ||
    contentLength > maxSize
  ) {
    throw new Error(
      `Request body must be between 1 byte and ${maxSize} bytes.`,
    );
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxSize)
      throw new Error(`Request body must be ${maxSize} bytes or fewer.`);
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export function createRateLimiter(
  maxRequests = RATE_LIMIT_MAX,
  windowMs = RATE_LIMIT_WINDOW_MS,
) {
  const requests = new Map();

  return (key, now = Date.now()) => {
    const entry = requests.get(key);
    if (!entry || now >= entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    entry.count += 1;
    return {
      allowed: entry.count <= maxRequests,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  };
}

function cleanString(value, field, maxLength, required = false) {
  if (value === undefined && !required) return { value: "" };
  if (typeof value !== "string") return { error: `${field} must be a string.` };

  const trimmed = value.trim();
  if (required && !trimmed) return { error: `${field} is required.` };
  if (trimmed.length > maxLength)
    return { error: `${field} must be ${maxLength} characters or fewer.` };

  return { value: trimmed };
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const name = cleanString(input.name, "name", MAX_EVENT_NAME_LENGTH, true);
  if (name.error) return name;

  const eventDate = cleanString(input.eventDate, "eventDate", 10, true);
  if (eventDate.error) return eventDate;
  if (!EVENT_DATE_PATTERN.test(eventDate.value)) {
    return { error: "eventDate must be in YYYY-MM-DD format." };
  }

  const slugInput = cleanString(input.slug, "slug", 80);
  if (slugInput.error) return slugInput;
  const slug = slugInput.value ? slugify(slugInput.value) : slugify(name.value);
  if (!slug) return { error: "Could not derive a valid slug from name." };

  return { value: { name: name.value, eventDate: eventDate.value, slug } };
}

export function validateGameRecommendation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const gameName = cleanString(
    input.gameName,
    "gameName",
    MAX_GAME_NAME_LENGTH,
    true,
  );
  if (gameName.error) return gameName;

  const description = cleanString(
    input.description,
    "description",
    MAX_DESCRIPTION_LENGTH,
  );
  if (description.error) return description;

  const recommendedBy = cleanString(
    input.recommendedBy,
    "recommendedBy",
    MAX_RECOMMENDER_LENGTH,
  );
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
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const contentLength = Number(request.headers["content-length"] || 0);
  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_BODY_SIZE
  ) {
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

function createStorageOrNull() {
  try {
    return createStorage();
  } catch {
    // Missing S3_* env vars. Game recommendations still work; image
    // routes report 503 instead of crashing the whole process.
    return null;
  }
}

export function createApiServer(
  db = createDatabase(),
  rateLimit = createRateLimiter(),
  storage = createStorageOrNull(),
) {
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

  const insertEvent = db.prepare(
    `INSERT INTO events (name, slug, event_date) VALUES (?, ?, ?)`,
  );
  const listEvents = db.prepare(`
    SELECT e.id, e.name, e.slug, e.event_date AS eventDate, i.storage_key AS coverStorageKey
    FROM events e
    LEFT JOIN images i ON i.id = e.cover_image_id
    ORDER BY e.event_date DESC, e.id DESC
  `);
  const findEventBySlug = db.prepare(`
    SELECT id, name, slug, event_date AS eventDate, cover_image_id AS coverImageId
    FROM events WHERE slug = ?
  `);
  const deleteEventById = db.prepare(`DELETE FROM events WHERE id = ?`);

  const insertImage = db.prepare(`
    INSERT INTO images (id, event_id, storage_key, content_type, size_bytes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const listImagesForEvent = db.prepare(`
    SELECT id, storage_key AS storageKey, content_type AS contentType, size_bytes AS sizeBytes, created_at AS createdAt
    FROM images WHERE event_id = ?
    ORDER BY rowid ASC
  `);
  const findImageById = db.prepare(`
    SELECT id, event_id AS eventId, storage_key AS storageKey
    FROM images WHERE id = ?
  `);
  const deleteImageById = db.prepare(`DELETE FROM images WHERE id = ?`);
  const setEventCover = db.prepare(
    `UPDATE events SET cover_image_id = ? WHERE id = ?`,
  );

  function uniqueSlug(baseSlug) {
    if (!findEventBySlug.get(baseSlug)) return baseSlug;
    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;
      if (!findEventBySlug.get(candidate)) return candidate;
    }
    throw new Error("Could not generate a unique slug.");
  }

  return createHttpServer(async (request, response) => {
    const corsHeaders = getCorsHeaders(request.headers.origin);
    for (const [name, value] of Object.entries(corsHeaders))
      response.setHeader(name, value);

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

    if (request.method === "GET" && url.pathname === "/api/validate") {
      if (!isAuthorizedUploader(request)) {
        sendJson(response, 401, { valid: false });
        return;
      } else {
        return sendJson(response, 200, { valid: true });
      }
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/game-recommendations"
    ) {
      sendJson(response, 200, {
        gameRecommendations: listRecommendations.all(),
      });
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/game-recommendations"
    ) {
      const client = request.socket.remoteAddress || "unknown";
      const limit = rateLimit(client);
      if (!limit.allowed) {
        sendJson(
          response,
          429,
          { error: "Too many recommendations. Try again shortly." },
          { "retry-after": limit.retryAfter },
        );
        return;
      }

      if (
        request.headers["content-type"]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase() !== "application/json"
      ) {
        sendJson(response, 400, {
          error: "Content-Type must be application/json.",
        });
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
        sendJson(response, 201, {
          gameRecommendation: findRecommendation.get(result.lastInsertRowid),
        });
      } catch (error) {
        if (error.code === "ERR_SQLITE_ERROR" && error.errcode === 2067) {
          sendJson(response, 409, {
            error: "This game has already been recommended.",
          });
          return;
        }

        sendJson(response, 500, {
          error: "Unable to save game recommendation.",
        });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/events") {
      const rows = listEvents.all();
      sendJson(response, 200, {
        events: rows.map((row) => ({
          name: row.name,
          slug: row.slug,
          eventDate: row.eventDate,
          coverUrl:
            row.coverStorageKey && storage
              ? storage.publicUrl(row.coverStorageKey)
              : null,
        })),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/events") {
      if (!isAuthorizedUploader(request)) {
        sendJson(response, 401, {
          error: "Missing or invalid upload credentials.",
        });
        return;
      }

      if (
        request.headers["content-type"]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase() !== "application/json"
      ) {
        sendJson(response, 400, {
          error: "Content-Type must be application/json.",
        });
        return;
      }

      let body;
      try {
        body = await readJson(request);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
        return;
      }

      const validation = validateEvent(body);
      if (validation.error) {
        sendJson(response, 400, { error: validation.error });
        return;
      }

      try {
        const slug = uniqueSlug(validation.value.slug);
        const result = insertEvent.run(
          validation.value.name,
          slug,
          validation.value.eventDate,
        );
        sendJson(response, 201, {
          event: {
            id: result.lastInsertRowid,
            name: validation.value.name,
            slug,
            eventDate: validation.value.eventDate,
          },
        });
      } catch {
        sendJson(response, 500, { error: "Unable to create event." });
      }
      return;
    }

    const eventSlugMatch = url.pathname.match(
      /^\/api\/events\/([^/]+)(?:\/(images))?$/,
    );
    if (eventSlugMatch) {
      const [, slug, subresource] = eventSlugMatch;
      const event = findEventBySlug.get(decodeURIComponent(slug));

      if (request.method === "GET" && !subresource) {
        if (!event) {
          sendJson(response, 404, { error: "Event not found." });
          return;
        }
        const images = listImagesForEvent.all(event.id).map((image) => ({
          id: image.id,
          url: storage ? storage.publicUrl(image.storageKey) : null,
          contentType: image.contentType,
          sizeBytes: image.sizeBytes,
          createdAt: image.createdAt,
          isCover: image.id === event.coverImageId,
        }));
        sendJson(response, 200, {
          event: {
            name: event.name,
            slug: event.slug,
            eventDate: event.eventDate,
          },
          images,
        });
        return;
      }

      if (request.method === "POST" && subresource === "images") {
        if (!storage) {
          sendJson(response, 503, {
            error: "Image storage is not configured.",
          });
          return;
        }
        if (!isAuthorizedUploader(request)) {
          sendJson(response, 401, {
            error: "Missing or invalid upload credentials.",
          });
          return;
        }
        if (!event) {
          sendJson(response, 404, { error: "Event not found." });
          return;
        }

        const contentType = request.headers["content-type"]
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
          sendJson(response, 400, {
            error: `Content-Type must be one of: ${[...ALLOWED_IMAGE_TYPES].join(", ")}.`,
          });
          return;
        }

        let body;
        try {
          body = await readBinaryBody(request, MAX_IMAGE_SIZE);
        } catch (error) {
          sendJson(response, 413, { error: error.message });
          return;
        }

        const filenameHint = url.searchParams.get("filename") || "";
        const id = generateImageId(filenameHint);
        const storageKey = keyForImage(event.slug, id);

        try {
          const imageUrl = await storage.putImage(
            storageKey,
            body,
            contentType,
          );
          insertImage.run(id, event.id, storageKey, contentType, body.length);

          const makeCover =
            url.searchParams.get("cover") === "true" || !event.coverImageId;
          if (makeCover) setEventCover.run(id, event.id);

          sendJson(response, 201, {
            image: { id, url: imageUrl, isCover: makeCover },
          });
        } catch {
          sendJson(response, 502, { error: "Unable to store image." });
        }
        return;
      }
    }

    if (
      request.method === "DELETE" &&
      url.pathname.startsWith("/api/images/")
    ) {
      if (!storage) {
        sendJson(response, 503, { error: "Image storage is not configured." });
        return;
      }
      if (!isAuthorizedUploader(request)) {
        sendJson(response, 401, {
          error: "Missing or invalid upload credentials.",
        });
        return;
      }

      const id = decodeURIComponent(url.pathname.slice("/api/images/".length));
      if (!isValidPathSegment(id)) {
        sendJson(response, 400, { error: "Invalid image id." });
        return;
      }

      const image = findImageById.get(id);
      if (!image) {
        sendJson(response, 404, { error: "Image not found." });
        return;
      }

      try {
        await storage.deleteImage(image.storageKey);
        deleteImageById.run(id);
        response.writeHead(204);
        response.end();
      } catch {
        sendJson(response, 502, { error: "Unable to delete image." });
      }
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname.startsWith("/api/events/")
    ) {
      if (!isAuthorizedUploader(request)) {
        sendJson(response, 401, {
          error: "Missing or invalid upload credentials.",
        });
        return;
      }

      const slug = decodeURIComponent(
        url.pathname.slice("/api/events/".length),
      );
      const event = findEventBySlug.get(slug);
      if (!event) {
        sendJson(response, 404, { error: "Event not found." });
        return;
      }

      const images = listImagesForEvent.all(event.id);
      try {
        if (storage) {
          for (const image of images)
            await storage.deleteImage(image.storageKey);
        }
        deleteEventById.run(event.id);
        response.writeHead(204);
        response.end();
      } catch {
        sendJson(response, 502, { error: "Unable to delete event." });
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
