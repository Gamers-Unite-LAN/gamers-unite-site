import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "./db.js";
import { createNextEventWatcher } from "./nextEventWatcher.js";
import { createSiteRebuild } from "./siteRebuild.js";
import { getSiteBuildState, markSiteRebuildComplete } from "./siteBuildState.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const silent = { info() {}, warn() {}, error() {} };
const env = {
  COOLIFY_API_URL: "https://coolify.test",
  COOLIFY_API_TOKEN: "test-token",
  SITE_APP_UUID: "site-app-uuid",
};

function addEvent(db, { name, date, start = "10:00", end = "18:00" }) {
  const result = db
    .prepare(
      "INSERT INTO events (name, slug, event_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
    )
    .run(name, name.toLowerCase().replace(/\s+/g, "-"), date, start, end);
  return Number(result.lastInsertRowid);
}

function jsonResponse(payload, status = 200) {
  const body = JSON.stringify(payload);
  return {
    ok: status < 400,
    status,
    json: async () => payload,
    text: async () => body,
  };
}

function fakeCoolify({ deployStatus = 200, statuses = ["finished"] } = {}) {
  const calls = [];
  const pending = [...statuses];

  async function fetchImpl(url, init = {}) {
    calls.push({ url, method: init.method || "GET" });

    if (url.includes("/api/v1/deploy?")) {
      if (deployStatus >= 400) return jsonResponse({ message: "boom" }, deployStatus);
      return jsonResponse({ deployments: [{ deployment_uuid: "deployment-1" }] });
    }

    return jsonResponse({ status: pending.length > 1 ? pending.shift() : pending[0] });
  }

  fetchImpl.calls = calls;
  return fetchImpl;
}

function watcherHarness(db, now) {
  const requests = [];
  const watcher = createNextEventWatcher({
    db,
    rebuild: { requestSiteRebuild: () => requests.push(now()) },
    log: silent,
    now,
    schedule: () => {},
  });
  return { watcher, requests };
}

test("watcher rebuilds when the next event changes and sleeps until it ends", () => {
  const db = createDatabase(":memory:");
  const eventId = addEvent(db, { name: "Winter LAN", date: "2026-12-05" });
  const now = () => Date.parse("2026-12-05T17:40:00");

  const { watcher, requests } = watcherHarness(db, now);

  // Fresh state: the site was never built for this event.
  assert.equal(watcher.tick(), 25 * MINUTE);
  assert.equal(requests.length, 1);

  // Matching state: no rebuild.
  markSiteRebuildComplete(db, eventId);
  assert.equal(watcher.tick(), 25 * MINUTE);
  assert.equal(requests.length, 1);

  // Pending rebuild: request again even though the id matches.
  db.prepare("UPDATE site_build_state SET rebuild_pending = 1 WHERE id = 1").run();
  watcher.tick();
  assert.equal(requests.length, 2);

  db.close();
});

test("watcher handles no upcoming event", () => {
  const db = createDatabase(":memory:");
  addEvent(db, { name: "Past LAN", date: "2026-01-10" });
  const { watcher, requests } = watcherHarness(db, () => Date.parse("2026-12-05T17:40:00"));

  assert.equal(watcher.tick(), HOUR);
  assert.equal(requests.length, 0);
  assert.equal(getSiteBuildState(db).lastBuiltForEventId, null);

  db.close();
});

test("watcher caps the sleep at one hour", () => {
  const db = createDatabase(":memory:");
  addEvent(db, { name: "Summer LAN", date: "2027-06-05" });
  const { watcher } = watcherHarness(db, () => Date.parse("2026-12-05T17:40:00"));

  assert.equal(watcher.tick(), HOUR);
  db.close();
});

test("watcher counts a running event as next until it ends", () => {
  const db = createDatabase(":memory:");
  const eventId = addEvent(db, {
    name: "Running LAN",
    date: "2026-12-05",
    start: "10:00",
    end: "18:00",
  });
  markSiteRebuildComplete(db, eventId);

  const during = watcherHarness(db, () => Date.parse("2026-12-05T15:00:00"));
  assert.equal(during.watcher.tick(), HOUR);
  assert.equal(during.requests.length, 0);

  const after = watcherHarness(db, () => Date.parse("2026-12-05T19:00:00"));
  assert.equal(after.requests.length, 0);
  assert.equal(after.watcher.tick(), HOUR);

  db.close();
});

test("quick edits are debounced into one deploy call", async () => {
  const db = createDatabase(":memory:");
  addEvent(db, { name: "Winter LAN", date: "2026-12-05" });
  const fetchImpl = fakeCoolify();
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl,
    log: silent,
    sleep: async () => {},
  });

  controller.requestSiteRebuild(10);
  controller.requestSiteRebuild(10);
  controller.requestSiteRebuild(10);

  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(fetchImpl.calls.filter((call) => call.method === "POST").length, 1);
  controller.cancel();
  db.close();
});

test("an earlier scheduled rebuild is not delayed by a later request", () => {
  const db = createDatabase(":memory:");
  const scheduled = [];
  const cleared = [];
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl: fakeCoolify(),
    log: silent,
    now: () => 1_000,
    setTimer: (fn, ms) => {
      scheduled.push(ms);
      return scheduled.length;
    },
    clearTimer: (timer) => cleared.push(timer),
  });

  controller.requestSiteRebuild(0);
  controller.requestSiteRebuild();

  assert.deepEqual(scheduled, [0]);
  assert.deepEqual(cleared, []);
  db.close();
});

test("successful deployment records the built event and clears pending", async () => {
  const db = createDatabase(":memory:");
  const eventId = addEvent(db, { name: "Winter LAN", date: "2026-12-05" });
  const fetchImpl = fakeCoolify({ statuses: ["queued", "in_progress", "finished"] });
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl,
    log: silent,
    sleep: async () => {},
  });

  await controller.rebuildNow();

  const deployCall = fetchImpl.calls[0];
  assert.equal(deployCall.method, "POST");
  assert.match(deployCall.url, /\/api\/v1\/deploy\?uuid=site-app-uuid&force=true$/);
  assert.deepEqual(getSiteBuildState(db), {
    lastBuiltForEventId: eventId,
    rebuildPending: false,
    pendingEventId: null,
  });

  db.close();
});

test("failed deployment keeps pending state and schedules a backoff retry", async () => {
  const db = createDatabase(":memory:");
  addEvent(db, { name: "Winter LAN", date: "2026-12-05" });
  const fetchImpl = fakeCoolify({ statuses: ["failed"] });
  const scheduled = [];
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl,
    log: silent,
    sleep: async () => {},
    setTimer: (fn, ms) => {
      scheduled.push(ms);
      return scheduled.length;
    },
    clearTimer: () => {},
  });

  await controller.rebuildNow();

  assert.deepEqual(scheduled, [5 * MINUTE]);
  assert.equal(getSiteBuildState(db).rebuildPending, true);

  db.close();
});

test("Coolify errors are logged, not thrown", async () => {
  const db = createDatabase(":memory:");
  addEvent(db, { name: "Winter LAN", date: "2026-12-05" });
  const fetchImpl = fakeCoolify({ deployStatus: 500 });
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl,
    log: silent,
    sleep: async () => {},
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await controller.rebuildNow();
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(getSiteBuildState(db).rebuildPending, true);

  db.close();
});

test("Coolify failures log the response body", async () => {
  const db = createDatabase(":memory:");
  addEvent(db, { name: "Winter LAN", date: "2026-12-05" });
  const errors = [];
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl: fakeCoolify({ deployStatus: 403 }),
    log: {
      info() {},
      warn() {},
      error(message, error) {
        errors.push(`${message}: ${error?.message}`);
      },
    },
    sleep: async () => {},
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await controller.rebuildNow();
  assert.match(errors[0], /403/);
  assert.match(errors[0], /boom/);

  db.close();
});

test("an unavailable database is reported without crashing", async () => {
  const db = {
    prepare() {
      throw new Error("database is down");
    },
  };
  const fetchImpl = fakeCoolify();
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl,
    log: silent,
    sleep: async () => {},
    setTimer: () => 1,
    clearTimer: () => {},
  });

  await controller.rebuildNow();
  assert.equal(fetchImpl.calls.length, 0);
});

test("startup re-requests an outstanding rebuild", () => {
  const db = createDatabase(":memory:");
  db.prepare("UPDATE site_build_state SET rebuild_pending = 1 WHERE id = 1").run();
  const scheduled = [];
  const controller = createSiteRebuild({
    db,
    env,
    fetchImpl: fakeCoolify(),
    log: silent,
    setTimer: (fn, ms) => {
      scheduled.push(ms);
      return scheduled.length;
    },
    clearTimer: () => {},
  });

  controller.start();
  assert.deepEqual(scheduled, [0]);
  db.close();
});

test("missing Coolify configuration disables rebuilds without throwing", async () => {
  const db = createDatabase(":memory:");
  const fetchImpl = fakeCoolify();
  const controller = createSiteRebuild({ db, env: {}, fetchImpl, log: silent });

  controller.start();
  controller.requestSiteRebuild();
  await controller.rebuildNow();

  assert.equal(controller.isConfigured, false);
  assert.equal(fetchImpl.calls.length, 0);
  db.close();
});
