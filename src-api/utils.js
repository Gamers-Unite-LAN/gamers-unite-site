export const MAX_BODY_SIZE = 16 * 1024;
export const MAX_GAME_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 1_000;
export const MAX_RECOMMENDER_LENGTH = 120;
export const MAX_IMAGE_SIZE = Number(
  process.env.MAX_IMAGE_SIZE || 8 * 1024 * 1024,
);
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
export const MAX_EVENT_NAME_LENGTH = 120;
export const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);
export const RATE_LIMIT_WINDOW_MS = Number(
  process.env.RATE_LIMIT_WINDOW_MS || 60_000,
);
export const PRODUCTION_ORIGIN = "https://gamersunitelan.com";

export function getCorsHeaders(
  origin,
  development = process.env.NODE_ENV !== "production",
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

export function isAuthorizedUploader(request) {
  const configured = process.env.UPLOAD_API_KEY;
  if (!configured) return false;
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === configured;
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

export function cleanString(value, field, maxLength, required = false) {
  if (value === undefined && !required) return { value: "" };
  if (typeof value !== "string") return { error: `${field} must be a string.` };

  const trimmed = value.trim();
  if (required && !trimmed) return { error: `${field} is required.` };
  if (trimmed.length > maxLength)
    return { error: `${field} must be ${maxLength} characters or fewer.` };

  return { value: trimmed };
}

export function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
