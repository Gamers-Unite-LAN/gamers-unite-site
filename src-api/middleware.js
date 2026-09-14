import express from "express";
import { logger } from "./logger.js";
import { ALLOWED_IMAGE_TYPES, MAX_BODY_SIZE, MAX_IMAGE_SIZE } from "./utils.js";

export function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip = req.socket.remoteAddress || "unknown";

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const meta = { ip, duration: `${duration}ms` };

    if (statusCode >= 500) {
      logger.error(`${method} ${originalUrl} -> ${statusCode}`, meta);
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} -> ${statusCode}`, meta);
    } else {
      logger.info(`${method} ${originalUrl} -> ${statusCode}`, meta);
    }
  });

  next();
}

export function requireJson(req, res, next) {
  const contentType = req.headers["content-type"]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    logger.warn(`Invalid Content-Type for JSON request: ${contentType || "none"}`, { path: req.originalUrl });
    res.status(400).json({ error: "Content-Type must be application/json." });
    return;
  }

  express.json({ limit: MAX_BODY_SIZE, strict: false })(req, res, (err) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      logger.warn(`JSON body exceeded limit of ${MAX_BODY_SIZE} bytes`, { path: req.originalUrl });
      res.status(400).json({ error: "Request body is too large." });
      return;
    }
    if (err.type === "entity.parse.failed") {
      logger.warn("Failed to parse JSON body", { path: req.originalUrl });
      res.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }
    logger.error("Unexpected error in JSON body parser", err, { path: req.originalUrl });
    next(err);
  });
}

export function requireImageBody(req, res, next) {
  express.raw({ type: [...ALLOWED_IMAGE_TYPES], limit: MAX_IMAGE_SIZE })(
    req,
    res,
    (err) => {
      if (!err) return next();
      if (err.type === "entity.too.large") {
        logger.warn(`Image payload exceeded size limit of ${MAX_IMAGE_SIZE} bytes`, { path: req.originalUrl });
        res
          .status(413)
          .json({
            error: `Request body must be ${MAX_IMAGE_SIZE} bytes or fewer.`,
          });
        return;
      }
      logger.error("Unexpected error in raw image parser", err, { path: req.originalUrl });
      next(err);
    },
  );
}
