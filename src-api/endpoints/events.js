import { requireImageBody, requireJson } from "../middleware.js";
import {
  generateImageId,
  isValidPathSegment,
  keyForImage,
} from "../storage.js";
import { logger } from "../logger.js";
import {
  ALLOWED_IMAGE_TYPES,
  cleanString,
  DEFAULT_EVENT_END_TIME,
  DEFAULT_EVENT_START_TIME,
  EVENT_DATE_PATTERN,
  EVENT_SEASONS,
  EVENT_TIME_PATTERN,
  MAX_EVENT_NAME_LENGTH,
  MAX_IMAGE_SIZE,
  slugify,
} from "../utils.js";
function requireAdmin(request, response, auth) {
  const user = auth.getUser(request);
  if (!user) {
    response.status(401).json({ error: "Discord login required." });
    return false;
  }
  if (!auth.isAdmin(request)) {
    response.status(403).json({ error: "Administrator access required." });
    return false;
  }
  return true;
}

function canIncludeHidden(request, auth) {
  return request.query.includeHidden === "true" && auth.isAdmin(request);
}

function validateSeason(value) {
  const season = cleanString(value, "season", 20, true);
  if (season.error) return season;
  if (!EVENT_SEASONS.includes(season.value)) {
    return { error: `season must be one of: ${EVENT_SEASONS.join(", ")}.` };
  }
  return season;
}

function validateEventTime(value, field, fallback) {
  if (value === undefined) return { value: fallback };
  const eventTime = cleanString(value, field, 5, true);
  if (eventTime.error) return eventTime;
  if (!EVENT_TIME_PATTERN.test(eventTime.value)) {
    return { error: `${field} must be in HH:MM format.` };
  }
  return eventTime;
}

function toEventDateTime(eventDate, eventTime) {
  return new Date(`${eventDate}T${eventTime}:00`);
}

function validateEventWindow(startTime, endTime) {
  if (endTime <= startTime) {
    return { error: "endTime must be later than startTime." };
  }
  return null;
}

function validateBoolean(value, field, fallback) {
  if (value === undefined) return { value: fallback };
  if (typeof value !== "boolean") return { error: `${field} must be a boolean.` };
  return { value };
}

function validateEventUpdate(input, current) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const name =
    input.name === undefined
      ? { value: current.name }
      : cleanString(input.name, "name", MAX_EVENT_NAME_LENGTH, true);
  if (name.error) return name;

  const eventDate =
    input.eventDate === undefined
      ? { value: current.eventDate }
      : cleanString(input.eventDate, "eventDate", 10, true);
  if (eventDate.error) return eventDate;
  if (!EVENT_DATE_PATTERN.test(eventDate.value)) {
    return { error: "eventDate must be in YYYY-MM-DD format." };
  }

  const startTime = validateEventTime(input.startTime, "startTime", current.startTime);
  if (startTime.error) return startTime;
  const endTime = validateEventTime(input.endTime, "endTime", current.endTime);
  if (endTime.error) return endTime;
  const eventWindow = validateEventWindow(startTime.value, endTime.value);
  if (eventWindow) return eventWindow;

  const season =
    input.season === undefined
      ? { value: current.season }
      : input.season === null || input.season === ""
        ? { value: null }
        : validateSeason(input.season);
  if (season.error) return season;

  const galleryVisible = validateBoolean(input.galleryVisible, "galleryVisible", Boolean(current.galleryVisible));
  if (galleryVisible.error) return galleryVisible;
  const showCoverImage = validateBoolean(input.showCoverImage, "showCoverImage", Boolean(current.showCoverImage));
  if (showCoverImage.error) return showCoverImage;

  return {
    value: {
      name: name.value,
      eventDate: eventDate.value,
      startTime: startTime.value,
      endTime: endTime.value,
      season: season.value,
      galleryVisible: galleryVisible.value,
      showCoverImage: showCoverImage.value,
    },
  };
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

  const startTime = validateEventTime(input.startTime, "startTime", DEFAULT_EVENT_START_TIME);
  if (startTime.error) return startTime;
  const endTime = validateEventTime(input.endTime, "endTime", DEFAULT_EVENT_END_TIME);
  if (endTime.error) return endTime;
  const eventWindow = validateEventWindow(startTime.value, endTime.value);
  if (eventWindow) return eventWindow;

  const season = validateSeason(input.season);
  if (season.error) return season;

  const slugInput = cleanString(input.slug, "slug", 80);
  if (slugInput.error) return slugInput;
  const slug = slugInput.value ? slugify(slugInput.value) : slugify(name.value);
  if (!slug) return { error: "Could not derive a valid slug from name." };

  return {
    value: {
      name: name.value,
      eventDate: eventDate.value,
      startTime: startTime.value,
      endTime: endTime.value,
      season: season.value,
      slug,
    },
  };
}

export default function registerEvents(app, { db, storage, auth }) {
  const insertEvent = db.prepare(
    `INSERT INTO events (name, slug, event_date, start_time, end_time, season) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const listEvents = db.prepare(`
    SELECT e.id, e.name, e.slug, e.event_date AS eventDate,
      e.start_time AS startTime, e.end_time AS endTime, e.season,
      e.gallery_visible AS galleryVisible, e.show_cover_image AS showCoverImage,
      i.storage_key AS coverStorageKey
    FROM events e
    LEFT JOIN images i ON i.id = e.cover_image_id
    ORDER BY e.event_date DESC, e.start_time DESC, e.id DESC
  `);
  const listEventsByStart = db.prepare(`
    SELECT id, name, slug, event_date AS eventDate,
      start_time AS startTime, end_time AS endTime, season
    FROM events
    ORDER BY event_date ASC, start_time ASC, id ASC
  `);
  const findEventBySlug = db.prepare(`
    SELECT id, name, slug, event_date AS eventDate,
      start_time AS startTime, end_time AS endTime, season,
      gallery_visible AS galleryVisible, show_cover_image AS showCoverImage,
      cover_image_id AS coverImageId
    FROM events WHERE slug = ?
  `);
  const deleteEventById = db.prepare(`DELETE FROM events WHERE id = ?`);

  const insertImage = db.prepare(`
    INSERT INTO images (id, event_id, storage_key, content_type, size_bytes, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const nextImageOrder = db.prepare(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS nextOrder FROM images WHERE event_id = ?`,
  );
  const countImagesForEvent = db.prepare(
    `SELECT COUNT(*) AS count FROM images WHERE event_id = ?`,
  );
  const listImagesForEvent = db.prepare(`
    SELECT id, storage_key AS storageKey, content_type AS contentType, size_bytes AS sizeBytes,
      created_at AS createdAt
    FROM images WHERE event_id = ?
    ORDER BY display_order ASC, rowid ASC
  `);
  const findImageById = db.prepare(`
    SELECT id, event_id AS eventId, storage_key AS storageKey
    FROM images WHERE id = ?
  `);
  const deleteImageById = db.prepare(`DELETE FROM images WHERE id = ?`);
  const setEventCover = db.prepare(
    `UPDATE events SET cover_image_id = ? WHERE id = ?`,
  );
  const updateEvent = db.prepare(
    `UPDATE events SET name = ?, event_date = ?, start_time = ?, end_time = ?, season = ?, gallery_visible = ?, show_cover_image = ? WHERE id = ?`,
  );
  const updateImageOrder = db.prepare(
    `UPDATE images SET display_order = ? WHERE id = ? AND event_id = ?`,
  );

  function uniqueSlug(baseSlug) {
    if (!findEventBySlug.get(baseSlug)) return baseSlug;
    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;
      if (!findEventBySlug.get(candidate)) return candidate;
    }
    throw new Error("Could not generate a unique slug.");
  }

  app.get("/events", (req, res) => {
    const includeHidden = canIncludeHidden(req, auth);
    const rows = listEvents.all().filter((row) => includeHidden || row.galleryVisible);
    res.json({
      events: rows.map((row) => ({
        name: row.name,
        slug: row.slug,
        eventDate: row.eventDate,
        startTime: row.startTime,
        endTime: row.endTime,
        season: row.season,
        galleryVisible: Boolean(row.galleryVisible),
        showCoverImage: Boolean(row.showCoverImage),
        coverUrl:
          row.showCoverImage && row.coverStorageKey && storage
            ? storage.publicUrl(row.coverStorageKey)
            : null,
      })),
    });
  });

  app.get("/next-date", (req, res) => {
    const now = Date.now();
    const event = listEventsByStart
      .all()
      .find((row) => toEventDateTime(row.eventDate, row.startTime).getTime() >= now);

    if (!event) {
      res.status(404).json({ error: "No upcoming events found." });
      return;
    }

    res.json({
      nextDateTime: `${event.eventDate}T${event.startTime}:00`,
      endDateTime: `${event.eventDate}T${event.endTime}:00`,
      event: {
        name: event.name,
        slug: event.slug,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
        season: event.season,
      },
    });
  });

  app.post("/events", (req, res) => {
    if (!requireAdmin(req, res, auth)) return;

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
          validation.value.startTime,
          validation.value.endTime,
          validation.value.season,
        );
        logger.info(`Event created: "${validation.value.name}" (slug: ${slug}, id: ${result.lastInsertRowid})`);
        res.status(201).json({
          event: {
            id: result.lastInsertRowid,
            name: validation.value.name,
            slug,
            eventDate: validation.value.eventDate,
            startTime: validation.value.startTime,
            endTime: validation.value.endTime,
            season: validation.value.season,
            galleryVisible: true,
            showCoverImage: true,
          },
        });
      } catch (error) {
        logger.error("Failed to insert event into database", error);
        res.status(500).json({ error: "Unable to create event." });
      }
    });
  });

  app.patch("/events/:slug", (req, res) => {
    if (!requireAdmin(req, res, auth)) return;

    requireJson(req, res, () => {
      const event = findEventBySlug.get(req.params.slug);
      if (!event) {
        res.status(404).json({ error: "Event not found." });
        return;
      }

      const validation = validateEventUpdate(req.body, event);
      if (validation.error) {
        res.status(400).json({ error: validation.error });
        return;
      }

      updateEvent.run(
        validation.value.name,
        validation.value.eventDate,
        validation.value.startTime,
        validation.value.endTime,
        validation.value.season,
        validation.value.galleryVisible ? 1 : 0,
        validation.value.showCoverImage ? 1 : 0,
        event.id,
      );
      res.json({
        event: {
          name: validation.value.name,
          slug: event.slug,
          eventDate: validation.value.eventDate,
          startTime: validation.value.startTime,
          endTime: validation.value.endTime,
          season: validation.value.season,
          galleryVisible: validation.value.galleryVisible,
          showCoverImage: validation.value.showCoverImage,
        },
      });
    });
  });

  app.get("/events/:slug", (req, res) => {
    const event = findEventBySlug.get(req.params.slug);
    const includeHidden = canIncludeHidden(req, auth);
    if (!event || (!includeHidden && !event.galleryVisible)) {
      logger.warn(`Event lookup not found: ${req.params.slug}`);
      res.status(404).json({ error: "Event not found." });
      return;
    }

    const images = listImagesForEvent
      .all(event.id)
      .filter((image) => includeHidden || event.showCoverImage || image.id !== event.coverImageId)
      .map((image) => ({
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
        startTime: event.startTime,
        endTime: event.endTime,
        season: event.season,
        galleryVisible: Boolean(event.galleryVisible),
        showCoverImage: Boolean(event.showCoverImage),
      },
      images,
    });
  });

  app.patch("/events/:slug/images/order", (req, res) => {
    if (!requireAdmin(req, res, auth)) return;

    requireJson(req, res, () => {
      const event = findEventBySlug.get(req.params.slug);
      if (!event) {
        res.status(404).json({ error: "Event not found." });
        return;
      }

      const imageIds = req.body?.imageIds;
      const currentImages = listImagesForEvent.all(event.id);
      const currentIds = new Set(currentImages.map((image) => image.id));
      if (
        !Array.isArray(imageIds) ||
        imageIds.length !== currentImages.length ||
        imageIds.some((id) => typeof id !== "string" || !currentIds.has(id)) ||
        new Set(imageIds).size !== imageIds.length
      ) {
        res.status(400).json({ error: "imageIds must contain every event image exactly once." });
        return;
      }

      try {
        db.exec("BEGIN");
        imageIds.forEach((id, index) => updateImageOrder.run(index, id, event.id));
        db.exec("COMMIT");
        res.json({ imageIds });
      } catch (error) {
        db.exec("ROLLBACK");
        logger.error(`Failed to reorder images for event "${event.slug}"`, error);
        res.status(500).json({ error: "Unable to reorder images." });
      }
    });
  });

  app.post("/events/:slug/images", (req, res) => {
    if (!storage) {
      logger.error("Image upload rejected: storage is not configured");
      res.status(503).json({
        error: "Image storage is not configured.",
      });
      return;
    }

    if (!requireAdmin(req, res, auth)) return;

    const event = findEventBySlug.get(req.params.slug);
    if (!event) {
      logger.warn(
        `Image upload rejected: event "${req.params.slug}" not found`,
      );
      res.status(404).json({ error: "Event not found." });
      return;
    }

    const contentType = req.headers["content-type"]
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      logger.warn(`Disallowed image Content-Type: ${contentType}`, {
        slug: req.params.slug,
      });
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

      const filenameHint = typeof req.query.filename === "string" ? req.query.filename : "";
      const id = generateImageId(filenameHint);
      const storageKey = keyForImage(event.slug, id);
      const hasExistingImages = Number(countImagesForEvent.get(event.id).count) > 0;
      const displayOrder = Number(nextImageOrder.get(event.id).nextOrder);

      try {
        const imageUrl = await storage.putImage(storageKey, body, contentType);
        insertImage.run(id, event.id, storageKey, contentType, body.length, displayOrder);

        const makeCover =
          req.query.cover === "true" || (!event.coverImageId && !hasExistingImages);
        if (makeCover) setEventCover.run(id, event.id);

        logger.info(
          `Uploaded image ${id} for event "${event.slug}" (${body.length} bytes, cover: ${makeCover})`,
        );
        res.status(201).json({
          image: { id, url: imageUrl, isCover: makeCover },
        });
      } catch (error) {
        logger.error(`Failed to store image ${storageKey} in storage`, error);
        res.status(502).json({ error: "Unable to store image." });
      }
    });
  });
  app.get("/images/:slug/:id", async (req, res) => {
    if (!storage) {
      res.status(503).json({ error: "Image storage is not configured." });
      return;
    }

    const { slug, id } = req.params;
    if (!isValidPathSegment(slug) || !isValidPathSegment(id)) {
      res.status(400).json({ error: "Invalid image path." });
      return;
    }

    const key = keyForImage(slug, id);
    try {
      const { body, contentType, contentLength } = await storage.getImage(key);
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      body.pipe(res);
    } catch (error) {
      if (error.name === "NoSuchKey") {
        res.status(404).json({ error: "Image not found." });
        return;
      }
      logger.error(`Failed to fetch image ${key} from storage`, error);
      res.status(502).json({ error: "Unable to fetch image." });
    }
  });

  app.patch("/images/:id/cover", (req, res) => {
    if (!requireAdmin(req, res, auth)) return;

    const id = req.params.id;
    if (!isValidPathSegment(id)) {
      res.status(400).json({ error: "Invalid image id." });
      return;
    }

    const image = findImageById.get(id);
    if (!image) {
      res.status(404).json({ error: "Image not found." });
      return;
    }

    setEventCover.run(image.id, image.eventId);
    logger.info(`Set image ${id} as event cover`);
    res.json({ image: { id, isCover: true } });
  });
  app.delete("/images/:id", async (req, res) => {
    if (!storage) {
      logger.error("Image deletion rejected: storage is not configured");
      res.status(503).json({ error: "Image storage is not configured." });
      return;
    }

    if (!requireAdmin(req, res, auth)) return;

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
      logger.error(
        `Failed to delete image ${image.storageKey} from storage`,
        error,
      );
      res.status(502).json({ error: "Unable to delete image." });
    }
  });

  app.delete("/events/:slug", async (req, res) => {
    if (!requireAdmin(req, res, auth)) return;

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
      logger.info(
        `Deleted event "${slug}" and cascaded ${images.length} image(s)`,
      );
      res.status(204).end();
    } catch (error) {
      logger.error(
        `Failed to cascade delete event "${slug}" images or row`,
        error,
      );
      res.status(502).json({ error: "Unable to delete event." });
    }
  });
}
