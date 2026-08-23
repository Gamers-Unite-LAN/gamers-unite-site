import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "./db.js";
import { createApiServer, createRateLimiter, getCorsHeaders, validateEvent, validateGameRecommendation } from "./server.js";

function createFakeStorage() {
  const objects = new Map();
  return {
    objects,
    async putImage(key, body, contentType) {
      objects.set(key, { body, contentType });
      return `https://images.example/${key}`;
    },
    async deleteImage(key) {
      objects.delete(key);
    },
    publicUrl(key) {
      return `https://images.example/${key}`;
    },
  };
}

async function withServer(fn, { storage = createFakeStorage(), uploadKey = "test-secret" } = {}) {
  const db = createDatabase(":memory:");
  const previousKey = process.env.UPLOAD_API_KEY;
  process.env.UPLOAD_API_KEY = uploadKey;
  const server = createApiServer(db, createRateLimiter(), storage);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await fn({ baseUrl, storage, db });
  } finally {
    process.env.UPLOAD_API_KEY = previousKey;
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
}

function authed(headers = {}) {
  return { authorization: "Bearer test-secret", ...headers };
}

test("validates and trims game recommendations", () => {
  assert.deepEqual(validateGameRecommendation({
    gameName: "  Team Fortress 2 ",
    description: "  Great LAN game.  ",
    recommendedBy: "  Alex  ",
  }), {
    value: {
      gameName: "Team Fortress 2",
      description: "Great LAN game.",
      recommendedBy: "Alex",
    },
  });
});

test("rejects invalid game recommendations", () => {
  assert.deepEqual(validateGameRecommendation({ gameName: "   " }), { error: "gameName is required." });
  assert.deepEqual(validateGameRecommendation({ gameName: 42 }), { error: "gameName must be a string." });
  assert.deepEqual(validateGameRecommendation([]), { error: "Request body must be a JSON object." });
});

test("allows only production origin outside development", () => {
  assert.equal(getCorsHeaders("https://gamersunitelan.com", false)["access-control-allow-origin"], "https://gamersunitelan.com");
  assert.deepEqual(getCorsHeaders("https://evil.example", false), {});
  assert.equal(getCorsHeaders("http://localhost:5173", true)["access-control-allow-origin"], "http://localhost:5173");
});

test("limits recommendations per client within its window", () => {
  const limit = createRateLimiter(2, 1_000);
  assert.equal(limit("127.0.0.1", 0).allowed, true);
  assert.equal(limit("127.0.0.1", 1).allowed, true);
  assert.deepEqual(limit("127.0.0.1", 2), { allowed: false, retryAfter: 1 });
  assert.equal(limit("127.0.0.1", 1_000).allowed, true);
});

test("stores, lists, and rejects duplicate recommendations", async () => {
  const db = createDatabase(":memory:");
  const server = createApiServer(db, createRateLimiter(), null);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const create = await fetch(`${baseUrl}/api/game-recommendations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameName: "Quake 3", description: "Fast LAN chaos" }),
    });
    assert.equal(create.status, 201);
    assert.equal((await create.json()).gameRecommendation.gameName, "Quake 3");

    const list = await fetch(`${baseUrl}/api/game-recommendations`);
    assert.deepEqual((await list.json()).gameRecommendations.map(({ gameName }) => gameName), ["Quake 3"]);

    const duplicate = await fetch(`${baseUrl}/api/game-recommendations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameName: "quake 3" }),
    });
    assert.equal(duplicate.status, 409);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("validates event input and derives a slug from the name", () => {
  assert.deepEqual(validateEvent({ name: "Winter LAN 2026", eventDate: "2026-01-17" }), {
    value: { name: "Winter LAN 2026", eventDate: "2026-01-17", slug: "winter-lan-2026" },
  });
  assert.deepEqual(validateEvent({ name: "", eventDate: "2026-01-17" }), { error: "name is required." });
  assert.deepEqual(validateEvent({ name: "Winter LAN", eventDate: "17-01-2026" }), {
    error: "eventDate must be in YYYY-MM-DD format.",
  });
});

test("creates an event and rejects duplicate slugs by disambiguating", async () => {
  await withServer(async ({ baseUrl }) => {
    const create = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Winter LAN", eventDate: "2026-01-17" }),
    });
    assert.equal(create.status, 201);
    const { event } = await create.json();
    assert.equal(event.slug, "winter-lan");

    const createAgain = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Winter LAN", eventDate: "2027-01-16" }),
    });
    assert.equal(createAgain.status, 201);
    assert.equal((await createAgain.json()).event.slug, "winter-lan-2");
  });
});

test("rejects event creation without an upload key", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Winter LAN", eventDate: "2026-01-17" }),
    });
    assert.equal(response.status, 401);
  });
});

test("uploads images to an event, auto-assigns the first as cover, and lists them", async () => {
  await withServer(async ({ baseUrl, storage }) => {
    const createEvent = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Summer LAN", eventDate: "2026-07-04" }),
    });
    const { event } = await createEvent.json();

    const uploadOne = await fetch(`${baseUrl}/api/events/${event.slug}/images?filename=one.png`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("first-image-bytes"),
    });
    assert.equal(uploadOne.status, 201);
    const first = (await uploadOne.json()).image;
    assert.equal(first.isCover, true);

    const uploadTwo = await fetch(`${baseUrl}/api/events/${event.slug}/images?filename=two.png`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("second-image-bytes"),
    });
    const second = (await uploadTwo.json()).image;
    assert.equal(second.isCover, false);

    const eventDetail = await fetch(`${baseUrl}/api/events/${event.slug}`);
    const { images } = await eventDetail.json();
    assert.deepEqual(images.map((img) => img.id), [first.id, second.id]);
    assert.equal(images.find((img) => img.id === first.id).isCover, true);

    const list = await fetch(`${baseUrl}/api/events`);
    const { events } = await list.json();
    assert.equal(events[0].coverUrl, `https://images.example/images/${event.slug}/${first.id}`);
    assert.equal(storage.objects.size, 2);
  });
});

test("404s image uploads for an unknown event", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/events/does-not-exist/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("bytes"),
    });
    assert.equal(response.status, 404);
  });
});

test("rejects disallowed content types for image uploads", async () => {
  await withServer(async ({ baseUrl }) => {
    const createEvent = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Autumn LAN", eventDate: "2026-10-10" }),
    });
    const { event } = await createEvent.json();

    const response = await fetch(`${baseUrl}/api/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "application/pdf" }),
      body: Buffer.from("not-an-image"),
    });
    assert.equal(response.status, 400);
  });
});

test("deleting an image removes it from storage and clears cover if needed", async () => {
  await withServer(async ({ baseUrl, storage }) => {
    const createEvent = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Spring LAN", eventDate: "2026-04-12" }),
    });
    const { event } = await createEvent.json();

    const upload = await fetch(`${baseUrl}/api/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("cover-image-bytes"),
    });
    const { image } = await upload.json();

    const remove = await fetch(`${baseUrl}/api/images/${image.id}`, {
      method: "DELETE",
      headers: authed(),
    });
    assert.equal(remove.status, 204);
    assert.equal(storage.objects.size, 0);

    const eventDetail = await fetch(`${baseUrl}/api/events/${event.slug}`);
    const { images } = await eventDetail.json();
    assert.deepEqual(images, []);
  });
});

test("deleting an event cascades to its images in both S3 and the DB", async () => {
  await withServer(async ({ baseUrl, storage }) => {
    const createEvent = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Old LAN", eventDate: "2020-01-01" }),
    });
    const { event } = await createEvent.json();

    await fetch(`${baseUrl}/api/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("one"),
    });
    await fetch(`${baseUrl}/api/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("two"),
    });
    assert.equal(storage.objects.size, 2);

    const remove = await fetch(`${baseUrl}/api/events/${event.slug}`, {
      method: "DELETE",
      headers: authed(),
    });
    assert.equal(remove.status, 204);
    assert.equal(storage.objects.size, 0);

    const gone = await fetch(`${baseUrl}/api/events/${event.slug}`);
    assert.equal(gone.status, 404);
  });
});

test("reports 503 for image uploads when storage is unconfigured", async () => {
  await withServer(async ({ baseUrl }) => {
    const createEvent = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "No Storage LAN", eventDate: "2026-02-02" }),
    });
    const { event } = await createEvent.json();

    const response = await fetch(`${baseUrl}/api/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("bytes"),
    });
    assert.equal(response.status, 503);
  }, { storage: null });
});
