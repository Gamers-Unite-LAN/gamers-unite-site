import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "./db.js";
import {
  createApiServer,
  createRateLimiter,
  getCorsHeaders,
  validateEvent,
  validateGameRecommendation,
} from "./server.js";

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

async function withServer(
  fn,
  { storage = createFakeStorage(), uploadKey = "test-secret" } = {},
) {
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
  assert.deepEqual(
    validateGameRecommendation({
      gameName: "  Team Fortress 2 ",
      description: "  Great LAN game.  ",
      recommendedBy: "  Alex  ",
    }),
    {
      value: {
        gameName: "Team Fortress 2",
        description: "Great LAN game.",
        recommendedBy: "Alex",
      },
    },
  );
});

test("rejects invalid game recommendations", () => {
  assert.deepEqual(validateGameRecommendation({ gameName: "   " }), {
    error: "gameName is required.",
  });
  assert.deepEqual(validateGameRecommendation({ gameName: 42 }), {
    error: "gameName must be a string.",
  });
  assert.deepEqual(validateGameRecommendation([]), {
    error: "Request body must be a JSON object.",
  });
});

test("allows only production origin outside development", () => {
  assert.equal(
    getCorsHeaders("https://gamersunitelan.com", false)[
      "access-control-allow-origin"
    ],
    "https://gamersunitelan.com",
  );
  assert.deepEqual(getCorsHeaders("https://evil.example", false), {});
  assert.equal(
    getCorsHeaders("http://localhost:5173", true)[
      "access-control-allow-origin"
    ],
    "http://localhost:5173",
  );
});

test("limits recommendations per client within its window", () => {
  const limit = createRateLimiter(2, 1_000);
  assert.equal(limit("127.0.0.1", 0).allowed, true);
  assert.equal(limit("127.0.0.1", 1).allowed, true);
  assert.deepEqual(limit("127.0.0.1", 2), { allowed: false, retryAfter: 1 });
  assert.equal(limit("127.0.0.1", 1_000).allowed, true);
});
test("limits requests across API endpoints per client", async () => {
  const db = createDatabase(":memory:");
  const server = createApiServer(db, createRateLimiter(1, 1_000), null);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const first = await fetch(`${baseUrl}/health`);
    assert.equal(first.status, 200);

    const second = await fetch(`${baseUrl}/events`);
    assert.equal(second.status, 429);
    assert.equal(second.headers.get("retry-after"), "1");
    assert.deepEqual(await second.json(), {
      error: "Too many requests. Try again shortly.",
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("stores, lists, and rejects duplicate recommendations", async () => {
  const db = createDatabase(":memory:");
  const server = createApiServer(db, createRateLimiter(), null);
  await new Promise((resolve) => server.listen(0, resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const create = await fetch(`${baseUrl}/game-recommendations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gameName: "Quake 3",
        description: "Fast LAN chaos",
      }),
    });
    assert.equal(create.status, 201);
    assert.equal((await create.json()).gameRecommendation.gameName, "Quake 3");

    const list = await fetch(`${baseUrl}/game-recommendations`);
    assert.deepEqual(
      (await list.json()).gameRecommendations.map(({ gameName }) => gameName),
      ["Quake 3"],
    );

    const duplicate = await fetch(`${baseUrl}/game-recommendations`, {
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

test("validates event seasons and derives a slug from the name", () => {
  assert.deepEqual(
    validateEvent({
      name: "Winter LAN 2026",
      eventDate: "2026-01-17",
      season: "winter",
    }),
    {
      value: {
        name: "Winter LAN 2026",
        eventDate: "2026-01-17",
        startTime: "10:00",
        endTime: "18:00",
        season: "winter",
        slug: "winter-lan-2026",
      },
    },
  );
  assert.deepEqual(
    validateEvent({ name: "Winter LAN", eventDate: "2026-01-17" }),
    {
      error: "season must be a string.",
    },
  );
  assert.deepEqual(
    validateEvent({
      name: "Winter LAN",
      eventDate: "2026-01-17",
      season: "monsoon",
    }),
    {
      error: "season must be one of: winter, spring, summer, autumn.",
    },
  );
  assert.deepEqual(
    validateEvent({
      name: "Winter LAN",
      eventDate: "17-01-2026",
      season: "winter",
    }),
    {
      error: "eventDate must be in YYYY-MM-DD format.",
    },
  );
  assert.deepEqual(
    validateEvent({
    name: "Winter LAN",
    eventDate: "2026-01-17",
    startTime: "1000",
    season: "winter",
    }),
    {
    error: "startTime must be in HH:MM format.",
    },
  );
  assert.deepEqual(
    validateEvent({
    name: "Winter LAN",
    eventDate: "2026-01-17",
    startTime: "18:00",
    endTime: "10:00",
    season: "winter",
    }),
    {
    error: "endTime must be later than startTime.",
    },
  );
});

test("creates an event and rejects duplicate slugs by disambiguating", async () => {
  await withServer(async ({ baseUrl }) => {
    const create = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Winter LAN",
        eventDate: "2026-01-17",
        season: "winter",
      }),
    });
    assert.equal(create.status, 201);
    const { event } = await create.json();
    assert.equal(event.slug, "winter-lan");
    assert.equal(event.startTime, "10:00");
    assert.equal(event.endTime, "18:00");

    const createAgain = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Winter LAN",
        eventDate: "2027-01-16",
        season: "winter",
      }),
    });
    assert.equal(createAgain.status, 201);
    assert.equal((await createAgain.json()).event.slug, "winter-lan-2");
  });
});

test("updates event name, date, time, and season", async () => {
  await withServer(async ({ baseUrl }) => {
    const create = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Legacy LAN",
        eventDate: "2026-08-01",
        season: "summer",
      }),
    });
    const { event } = await create.json();

    const update = await fetch(`${baseUrl}/events/${event.slug}`, {
      method: "PATCH",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Renamed LAN",
        eventDate: "2026-08-02",
        startTime: "11:00",
        endTime: "19:30",
        season: null,
      }),
    });
    assert.equal(update.status, 200);
    assert.deepEqual((await update.json()).event, {
      name: "Renamed LAN",
      slug: "legacy-lan",
      eventDate: "2026-08-02",
      startTime: "11:00",
      endTime: "19:30",
      season: null,
      galleryVisible: true,
      showCoverImage: true,
    });

    const detail = await fetch(`${baseUrl}/events/${event.slug}`);
    assert.deepEqual((await detail.json()).event, {
      name: "Renamed LAN",
      slug: "legacy-lan",
      eventDate: "2026-08-02",
      startTime: "11:00",
      endTime: "19:30",
      season: null,
      galleryVisible: true,
      showCoverImage: true,
    });
  });
});

test("returns the next upcoming event date time", async () => {
  await withServer(async ({ baseUrl }) => {
    await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Past LAN",
        eventDate: "2020-01-01",
        season: "winter",
      }),
    });

    await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Later LAN",
        eventDate: "2099-07-05",
        startTime: "12:00",
        endTime: "20:00",
        season: "summer",
      }),
    });

    await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Sooner LAN",
        eventDate: "2099-07-04",
        startTime: "09:30",
        endTime: "18:30",
        season: "summer",
      }),
    });

    const response = await fetch(`${baseUrl}/next-date`);
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.nextDateTime, "2099-07-04T09:30:00");
    assert.equal(body.endDateTime, "2099-07-04T18:30:00");
    assert.deepEqual(body.event, {
      name: "Sooner LAN",
      slug: "sooner-lan",
      eventDate: "2099-07-04",
      startTime: "09:30",
      endTime: "18:30",
      season: "summer",
    });
  });
});

test("rejects event creation without an upload key", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Winter LAN", eventDate: "2026-01-17" }),
    });
    assert.equal(response.status, 401);
  });
});

test("uploads images to an event, auto-assigns the first as cover, and lists them", async () => {
  await withServer(async ({ baseUrl, storage }) => {
    const createEvent = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Summer LAN",
        eventDate: "2026-07-04",
        season: "summer",
      }),
    });
    const { event } = await createEvent.json();

    const uploadOne = await fetch(
      `${baseUrl}/events/${event.slug}/images?filename=one.png`,
      {
        method: "POST",
        headers: authed({ "content-type": "image/png" }),
        body: Buffer.from("first-image-bytes"),
      },
    );
    assert.equal(uploadOne.status, 201);
    const first = (await uploadOne.json()).image;
    assert.equal(first.isCover, true);

    const uploadTwo = await fetch(
      `${baseUrl}/events/${event.slug}/images?filename=two.png`,
      {
        method: "POST",
        headers: authed({ "content-type": "image/png" }),
        body: Buffer.from("second-image-bytes"),
      },
    );
    const second = (await uploadTwo.json()).image;
    assert.equal(second.isCover, false);

    const setCover = await fetch(`${baseUrl}/images/${second.id}/cover`, {
      method: "PATCH",
      headers: authed(),
    });
    assert.equal(setCover.status, 200);

    const eventDetailResponse = await fetch(`${baseUrl}/events/${event.slug}`);
    const { event: eventDetails, images } = await eventDetailResponse.json();
    assert.deepEqual(
      images.map((img) => img.id),
      [first.id, second.id],
    );
    assert.equal(eventDetails.season, "summer");
    assert.equal(images.find((img) => img.id === first.id).isCover, false);
    assert.equal(images.find((img) => img.id === second.id).isCover, true);

    const list = await fetch(`${baseUrl}/events`);
    const { events } = await list.json();
    assert.equal(events[0].season, "summer");
    assert.equal(
      events[0].coverUrl,
      `https://images.example/images/${event.slug}/${second.id}`,
    );
    assert.equal(storage.objects.size, 2);
  });
});

test("does not auto-assign a cover after an existing cover is deleted", async () => {
  await withServer(async ({ baseUrl }) => {
    const createEvent = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Existing Images LAN",
        eventDate: "2026-11-01",
        season: "autumn",
      }),
    });
    const { event } = await createEvent.json();

    const firstUpload = await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("first-image"),
    });
    const firstImage = (await firstUpload.json()).image;

    const existingUpload = await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("existing-image"),
    });
    assert.equal((await existingUpload.json()).image.isCover, false);

    const remove = await fetch(`${baseUrl}/images/${firstImage.id}`, {
      method: "DELETE",
      headers: authed(),
    });
    assert.equal(remove.status, 204);

    const secondUpload = await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("second-image"),
    });
    assert.equal((await secondUpload.json()).image.isCover, false);
  });
});

test("404s image uploads for an unknown event", async () => {
  await withServer(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/events/does-not-exist/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("bytes"),
    });
    assert.equal(response.status, 404);
  });
});

test("rejects disallowed content types for image uploads", async () => {
  await withServer(async ({ baseUrl }) => {
    const createEvent = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Autumn LAN",
        eventDate: "2026-10-10",
        season: "autumn",
      }),
    });
    const { event } = await createEvent.json();

    const response = await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "application/pdf" }),
      body: Buffer.from("not-an-image"),
    });
    assert.equal(response.status, 400);
  });
});

test("deleting an image removes it from storage and clears cover if needed", async () => {
  await withServer(async ({ baseUrl, storage }) => {
    const createEvent = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Spring LAN",
        eventDate: "2026-04-12",
        season: "spring",
      }),
    });
    const { event } = await createEvent.json();

    const upload = await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("cover-image-bytes"),
    });
    const { image } = await upload.json();

    const remove = await fetch(`${baseUrl}/images/${image.id}`, {
      method: "DELETE",
      headers: authed(),
    });
    assert.equal(remove.status, 204);
    assert.equal(storage.objects.size, 0);

    const eventDetail = await fetch(`${baseUrl}/events/${event.slug}`);
    const { images } = await eventDetail.json();
    assert.deepEqual(images, []);
  });
});

test("deleting an event cascades to its images in both S3 and the DB", async () => {
  await withServer(async ({ baseUrl, storage }) => {
    const createEvent = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({
        name: "Old LAN",
        eventDate: "2020-01-01",
        season: "winter",
      }),
    });
    const { event } = await createEvent.json();

    await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("one"),
    });
    await fetch(`${baseUrl}/events/${event.slug}/images`, {
      method: "POST",
      headers: authed({ "content-type": "image/png" }),
      body: Buffer.from("two"),
    });
    assert.equal(storage.objects.size, 2);

    const remove = await fetch(`${baseUrl}/events/${event.slug}`, {
      method: "DELETE",
      headers: authed(),
    });
    assert.equal(remove.status, 204);
    assert.equal(storage.objects.size, 0);

    const gone = await fetch(`${baseUrl}/events/${event.slug}`);
    assert.equal(gone.status, 404);
  });
});

test("reports 503 for image uploads when storage is unconfigured", async () => {
  await withServer(
    async ({ baseUrl }) => {
      const createEvent = await fetch(`${baseUrl}/events`, {
        method: "POST",
        headers: authed({ "content-type": "application/json" }),
        body: JSON.stringify({
          name: "No Storage LAN",
          eventDate: "2026-02-02",
          season: "winter",
        }),
      });
      const { event } = await createEvent.json();

      const response = await fetch(`${baseUrl}/events/${event.slug}/images`, {
        method: "POST",
        headers: authed({ "content-type": "image/png" }),
        body: Buffer.from("bytes"),
      });
      assert.equal(response.status, 503);
    },
    { storage: null },
  );
});
test("hides gallery events, hides covers, and persists image order", async () => {
  await withServer(async ({ baseUrl }) => {
    const create = await fetch(`${baseUrl}/events`, {
      method: "POST",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ name: "Controls LAN", eventDate: "2026-12-12", season: "winter" }),
    });
    const { event } = await create.json();
    const images = [];
    for (const name of ["one.png", "two.png", "three.png"]) {
      const response = await fetch(`${baseUrl}/events/${event.slug}/images?filename=${name}`, {
        method: "POST",
        headers: authed({ "content-type": "image/png" }),
        body: Buffer.from(name),
      });
      images.push((await response.json()).image);
    }

    const settings = await fetch(`${baseUrl}/events/${event.slug}`, {
      method: "PATCH",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ galleryVisible: false, showCoverImage: false }),
    });
    assert.equal(settings.status, 200);

    const publicList = await fetch(`${baseUrl}/events`);
    assert.deepEqual((await publicList.json()).events, []);
    assert.equal((await fetch(`${baseUrl}/events/${event.slug}`)).status, 404);

    const reorder = await fetch(`${baseUrl}/events/${event.slug}/images/order`, {
      method: "PATCH",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ imageIds: images.map((image) => image.id).reverse() }),
    });
    assert.equal(reorder.status, 200);

    const adminDetail = await fetch(`${baseUrl}/events/${event.slug}?includeHidden=true`, { headers: authed() });
    const adminBody = await adminDetail.json();
    assert.deepEqual(adminBody.images.map((image) => image.id), images.map((image) => image.id).reverse());
    assert.equal(adminBody.event.galleryVisible, false);
    assert.equal(adminBody.event.showCoverImage, false);

    await fetch(`${baseUrl}/events/${event.slug}`, {
      method: "PATCH",
      headers: authed({ "content-type": "application/json" }),
      body: JSON.stringify({ galleryVisible: true }),
    });
    const visibleList = await fetch(`${baseUrl}/events`);
    const listedEvent = (await visibleList.json()).events[0];
    assert.equal(listedEvent.coverUrl, null);
    const publicDetail = await fetch(`${baseUrl}/events/${event.slug}`);
    assert.deepEqual((await publicDetail.json()).images.map((image) => image.id), [images[2].id, images[1].id]);
  });
});
