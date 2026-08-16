import assert from "node:assert/strict";
import test from "node:test";
import { createDatabase } from "./db.js";
import { createApiServer, createRateLimiter, getCorsHeaders, validateGameRecommendation } from "./server.js";

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
  const server = createApiServer(db);
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
