import express from "express";
import { ALLOWED_IMAGE_TYPES, MAX_BODY_SIZE, MAX_IMAGE_SIZE } from "./utils.js";

export function requireJson(req, res, next) {
  const contentType = req.headers["content-type"]
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    res.status(400).json({ error: "Content-Type must be application/json." });
    return;
  }

  express.json({ limit: MAX_BODY_SIZE, strict: false })(req, res, (err) => {
    if (!err) return next();
    if (err.type === "entity.too.large") {
      res.status(400).json({ error: "Request body is too large." });
      return;
    }
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }
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
        res
          .status(413)
          .json({
            error: `Request body must be ${MAX_IMAGE_SIZE} bytes or fewer.`,
          });
        return;
      }
      next(err);
    },
  );
}
