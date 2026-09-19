import { createServer as createHttpServer } from "node:http";
import { pathToFileURL } from "node:url";
import express from "express";
import { createAuth } from "./auth.js";
import { createDatabase } from "./db.js";
import { createStorage } from "./storage.js";
import { getCorsHeaders, createRateLimiter } from "./utils.js";
import { requestLogger } from "./middleware.js";
import { logger } from "./logger.js";
import { validateEvent } from "./endpoints/events.js";
import { validateGameRecommendation } from "./endpoints/game-recommendations.js";
import { loadEndpoints } from "./endpoints/index.js";
export {
  getCorsHeaders,
  createRateLimiter,
  validateEvent,
  validateGameRecommendation,
};

function createStorageOrNull() {
  try {
    const storage = createStorage();
    logger.info("Storage driver initialized successfully");
    return storage;
  } catch (error) {
    logger.warn(
      "S3 Storage unconfigured; image upload/deletion routes will be disabled",
    );
    logger.error(`Failed to initialize storage driver: ${error.message}`);
    return null;
  }
}

export function createApiServer(
  db = createDatabase(),
  rateLimit = createRateLimiter(),
  storage = createStorageOrNull(),
  auth = createAuth(db),
) {
  const app = express();
  app.disable("x-powered-by");

  // HTTP access logging
  app.use(requestLogger);

  // CORS middleware applying the same whitelist logic
  app.use((req, res, next) => {
    const corsHeaders = getCorsHeaders(req.headers.origin);
    for (const [name, value] of Object.entries(corsHeaders)) {
      res.setHeader(name, value);
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Rate limit every API request after CORS preflight handling.
  app.use((req, res, next) => {
    const client = req.socket.remoteAddress || "unknown";
    const limit = rateLimit(client);
    if (limit.allowed) {
      next();
      return;
    }

    logger.warn(`Rate limit exceeded for ${client}`, {
      path: req.originalUrl,
      retryAfter: limit.retryAfter,
    });
    res.set("retry-after", String(limit.retryAfter));
    res.status(429).json({ error: "Too many requests. Try again shortly." });
  });

  // Auto-import all endpoint modules from ./endpoints
  const context = { db, storage, auth };
  loadEndpoints(app, context);

  // Catch-all 404 handler for unmatched routes
  app.use((req, res) => {
    logger.warn(`Unmatched route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Not found." });
  });

  return createHttpServer(app);
}

export function startServer() {
  const db = createDatabase();
  const server = createApiServer(db);
  const port = Number(process.env.PORT || 3000);

  server.listen(port, () => {
    logger.info(`Gamers Unite API listening on http://localhost:${port}`);
  });

  const shutdown = () => {
    logger.info("Server shutting down gracefully...");
    server.close(() => {
      db.close();
      logger.info("Database connection closed. Goodbye.");
    });
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
