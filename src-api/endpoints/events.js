import { requireImageBody, requireJson } from "../middleware.js";
import { generateImageId, isValidPathSegment, keyForImage } from "../storage.js";
import { logger } from "../logger.js";
import {
  ALLOWED_IMAGE_TYPES,
  cleanString,
  EVENT_DATE_PATTERN,
  isAuthorizedUploader,
  MAX_EVENT_NAME_LENGTH,
  MAX_IMAGE_SIZE,
  slugify,
} from "../utils.js";

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

export default function registerEvents(app, { db, storage }) {
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

  app.get("/api/events", (req, res) => {
    const rows = listEvents.all();
    res.json({
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
  });

  app.post("/api/events", (req, res) => {
    if (!isAuthorizedUploader(req)) {
      logger.warn("Unauthorized attempt to create event", { ip: req.socket.remoteAddress });
      res.status(401).json({
        error: "Missing or invalid upload credentials.",
      });
      return;
    }

    requireJson(req, res, () => {
      const validation = validateEvent(req.body);
      if (validation.error) {
        logger.warn(`Event validation failed: ${validation.error}`);
        res.status(400).json({ error: validation.error });
        return;
      }

      try {
        const slug = uniqueSlug(validation.value.slug);
        const result = insertEvent.run(
          validation.value.name,
          slug,
          validation.value.eventDate,
        );
        logger.info(`Event created: "${validation.value.name}" (slug: ${slug}, id: ${result.lastInsertRowid})`);
        res.status(201).json({
          event: {
            id: result.lastInsertRowid,
            name: validation.value.name,
            slug,
            eventDate: validation.value.eventDate,
          },
        });
      } catch (error) {
        logger.error("Failed to insert event into database", error);
        res.status(500).json({ error: "Unable to create event." });
      }
    });
  });

  app.get("/api/events/:slug", (req, res) => {
    const event = findEventBySlug.get(req.params.slug);
    if (!event) {
      logger.warn(`Event lookup not found: ${req.params.slug}`);
      res.status(404).json({ error: "Event not found." });
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

    res.json({
      event: {
        name: event.name,
        slug: event.slug,
        eventDate: event.eventDate,
      },
      images,
    });
  });

  app.post("/api/events/:slug/images", (req, res) => {
    if (!storage) {
      logger.error("Image upload rejected: storage is not configured");
      res.status(503).json({
        error: "Image storage is not configured.",
      });
      return;
    }

    if (!isAuthorizedUploader(req)) {
      logger.warn("Unauthorized attempt to upload image", { ip: req.socket.remoteAddress, slug: req.params.slug });
      res.status(401).json({
        error: "Missing or invalid upload credentials.",
      });
      return;
    }

    const event = findEventBySlug.get(req.params.slug);
    if (!event) {
      logger.warn(`Image upload rejected: event "${req.params.slug}" not found`);
      res.status(404).json({ error: "Event not found." });
      return;
    }

    const contentType = req.headers["content-type"]
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      logger.warn(`Disallowed image Content-Type: ${contentType}`, { slug: req.params.slug });
      res.status(400).json({
        error: `Content-Type must be one of: ${[...ALLOWED_IMAGE_TYPES].join(", ")}.`,
      });
      return;
    }

    requireImageBody(req, res, async () => {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        logger.warn("Image upload payload empty or invalid buffer", { slug: req.params.slug });
        res.status(413).json({
          error: `Request body must be between 1 byte and ${MAX_IMAGE_SIZE} bytes.`,
        });
        return;
      }

      const filenameHint =
        typeof req.query.filename === "string" ? req.query.filename : "";
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
          req.query.cover === "true" || !event.coverImageId;
        if (makeCover) setEventCover.run(id, event.id);

        logger.info(`Uploaded image ${id} for event "${event.slug}" (${body.length} bytes, cover: ${makeCover})`);
        res.status(201).json({
          image: { id, url: imageUrl, isCover: makeCover },
        });
      } catch (error) {
        logger.error(`Failed to store image ${storageKey} in storage`, error);
        res.status(502).json({ error: "Unable to store image." });
      }
    });
  });

  app.delete("/api/images/:id", async (req, res) => {
    if (!storage) {
      logger.error("Image deletion rejected: storage is not configured");
      res.status(503).json({ error: "Image storage is not configured." });
      return;
    }

    if (!isAuthorizedUploader(req)) {
      logger.warn("Unauthorized attempt to delete image", { ip: req.socket.remoteAddress, imageId: req.params.id });
      res.status(401).json({
        error: "Missing or invalid upload credentials.",
      });
      return;
    }

    const id = req.params.id;
    if (!isValidPathSegment(id)) {
      logger.warn(`Invalid image ID format for deletion: ${id}`);
      res.status(400).json({ error: "Invalid image id." });
      return;
    }

    const image = findImageById.get(id);
    if (!image) {
      logger.warn(`Image deletion not found: ${id}`);
      res.status(404).json({ error: "Image not found." });
      return;
    }

    try {
      await storage.deleteImage(image.storageKey);
      deleteImageById.run(id);
      logger.info(`Deleted image ${id} (${image.storageKey})`);
      res.status(204).end();
    } catch (error) {
      logger.error(`Failed to delete image ${image.storageKey} from storage`, error);
      res.status(502).json({ error: "Unable to delete image." });
    }
  });

  app.delete("/api/events/:slug", async (req, res) => {
    if (!isAuthorizedUploader(req)) {
      logger.warn("Unauthorized attempt to delete event", { ip: req.socket.remoteAddress, slug: req.params.slug });
      res.status(401).json({
        error: "Missing or invalid upload credentials.",
      });
      return;
    }

    const slug = req.params.slug;
    const event = findEventBySlug.get(slug);
    if (!event) {
      logger.warn(`Event deletion not found: ${slug}`);
      res.status(404).json({ error: "Event not found." });
      return;
    }

    const images = listImagesForEvent.all(event.id);
    try {
      if (storage) {
        for (const image of images) {
          await storage.deleteImage(image.storageKey);
        }
      }
      deleteEventById.run(event.id);
      logger.info(`Deleted event "${slug}" and cascaded ${images.length} image(s)`);
      res.status(204).end();
    } catch (error) {
      logger.error(`Failed to cascade delete event "${slug}" images or row`, error);
      res.status(502).json({ error: "Unable to delete event." });
    }
  });
}
