import { requireJson } from "../middleware.js";
import { logger } from "../services/logger.js";
import { createPollWebhookClient } from "../services/poll-service.js";
import {
  MAX_POLL_GAME_NAME_LENGTH,
  POLL_CATEGORIES,
  pollSchedule,
  cleanString,
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
function requireUser(request, response, auth) {
  const user = auth.getUser(request);
  if (!user) {
    response.status(401).json({ error: "Discord login required." });
    return null;
  }
  return user;
}

function validateVote(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !Number.isInteger(input.gameIndex) ||
    input.gameIndex < 0 ||
    input.gameIndex > 2
  ) {
    return { error: "gameIndex must be 0, 1, or 2." };
  }
  return { value: input.gameIndex };
}

function parseResults(row) {
  if (!row.resultsJson) return null;
  try {
    return JSON.parse(row.resultsJson);
  } catch {
    return null;
  }
}

export function validatePolls(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }
  const polls = input.polls;
  if (!polls || typeof polls !== "object" || Array.isArray(polls)) {
    return {
      error:
        "polls must be an object with modern, classic, and wildcard games.",
    };
  }
  const value = {};
  for (const category of POLL_CATEGORIES) {
    if (!Array.isArray(polls[category]) || polls[category].length !== 3) {
      return { error: `${category} must contain exactly 3 games.` };
    }
    const games = [];
    for (const game of polls[category]) {
      const cleaned = cleanString(
        game,
        `${category} game`,
        MAX_POLL_GAME_NAME_LENGTH,
        true,
      );
      if (cleaned.error) return { error: cleaned.error };
      games.push(cleaned.value);
    }
    if (
      new Set(games.map((game) => game.toLocaleLowerCase())).size !==
      games.length
    ) {
      return { error: `${category} games must be unique.` };
    }
    value[category] = games;
  }
  return { value };
}

function parseGames(row) {
  try {
    const games = JSON.parse(row.gamesJson);
    return Array.isArray(games) ? games : [];
  } catch {
    return [];
  }
}
function resultsForGames(games, counts) {
  const countByIndex = new Map(
    counts.map((count) => [Number(count.gameIndex), Number(count.votes)]),
  );
  const results = games.map((gameName, gameIndex) => ({
    gameName,
    votes: countByIndex.get(gameIndex) || 0,
    winner: false,
  }));
  const highest = Math.max(0, ...results.map((result) => result.votes));
  return results.map((result) => ({
    ...result,
    winner: highest > 0 && result.votes === highest,
  }));
}

function statusFor(row, now, schedule) {
  if (row.finalizedAt) return "closed";
  if (row.lastError) return "error";
  if (row.warningSentAt) return "warning";
  if (row.openedAt) return "open";
  if (now >= schedule.closeAt.getTime()) return "missed";
  if (now >= schedule.openAt.getTime()) return "ready";
  return "scheduled";
}

function stateFor(event, rows, now = Date.now()) {
  const categories = {};
  for (const row of rows) {
    const schedule = pollSchedule(event.eventDate, event.startTime);
    categories[row.category] = {
      category: row.category,
      games: parseGames(row),
      status: statusFor(row, now, schedule),
      messageId: row.webhookMessageId,
      openedAt: row.openedAt,
      warningSentAt: row.warningSentAt,
      finalizedAt: row.finalizedAt,
      results: row.resultsJson ? JSON.parse(row.resultsJson) : null,
      lastError: row.lastError,
      schedule: {
        openAt: schedule.openAt.toISOString(),
        warningAt: schedule.warningAt.toISOString(),
        closeAt: schedule.closeAt.toISOString(),
      },
    };
  }
  return POLL_CATEGORIES.map(
    (category) =>
      categories[category] || {
        category,
        games: [],
        status: "unconfigured",
        messageId: null,
        openedAt: null,
        warningSentAt: null,
        finalizedAt: null,
        results: null,
        lastError: null,
        schedule: null,
      },
  );
}
function publicPollState(event, row, counts, voterGameIndex, now) {
  const schedule = pollSchedule(event.eventDate, event.startTime);
  const games = parseGames(row);
  const closed = Boolean(row.finalizedAt) || now >= schedule.closeAt.getTime();
  const open = !closed && now >= schedule.openAt.getTime();
  const liveResults = resultsForGames(games, counts);
  return {
    category: row.category,
    games,
    status: closed ? "closed" : open ? "open" : "scheduled",
    schedule: {
      openAt: schedule.openAt.toISOString(),
      warningAt: schedule.warningAt.toISOString(),
      closeAt: schedule.closeAt.toISOString(),
    },
    voterGameIndex,
    results: parseResults(row) || liveResults,
  };
}

export function createPollProcessor(
  db,
  pollClient = createPollWebhookClient(),
  now = () => Date.now(),
) {
  const findEvent = db.prepare(
    "SELECT id, name, slug, event_date AS eventDate, start_time AS startTime FROM events WHERE slug = ?",
  );
  const listPolls = db.prepare(
    "SELECT id, category, games_json AS gamesJson, webhook_message_id AS webhookMessageId, opened_at AS openedAt, warning_sent_at AS warningSentAt, finalized_at AS finalizedAt, results_json AS resultsJson, last_error AS lastError FROM event_polls WHERE event_id = ? ORDER BY category",
  );
  const listVoteCounts = db.prepare(
    "SELECT game_index AS gameIndex, COUNT(*) AS votes FROM poll_votes WHERE poll_id = ? GROUP BY game_index",
  );
  const updatePoll = db.prepare(
    "UPDATE event_polls SET webhook_message_id = COALESCE(?, webhook_message_id), opened_at = COALESCE(?, opened_at), warning_sent_at = COALESCE(?, warning_sent_at), finalized_at = COALESCE(?, finalized_at), results_json = COALESCE(?, results_json), last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND category = ?",
  );

  async function processEvent(event) {
    const current = now();
    const schedule = pollSchedule(event.eventDate, event.startTime);
    const rows = listPolls.all(event.id);
    for (const row of rows) {
      const games = parseGames(row);
      try {
        if (
          !row.webhookMessageId &&
          current >= schedule.openAt.getTime() &&
          current < schedule.closeAt.getTime()
        ) {
          const durationHours =
            (schedule.closeAt.getTime() - current) / 3_600_000;
          const messageId = await pollClient.open({
            eventName: event.name,
            category: row.category,
            games,
            durationHours,
          });
          updatePoll.run(
            messageId,
            new Date(current).toISOString(),
            null,
            null,
            null,
            null,
            event.id,
            row.category,
          );
          row.webhookMessageId = messageId;
          row.openedAt = new Date(current).toISOString();
        }
        if (
          row.webhookMessageId &&
          !row.warningSentAt &&
          current >= schedule.warningAt.getTime() &&
          current < schedule.closeAt.getTime()
        ) {
          await pollClient.warn({
            messageId: row.webhookMessageId,
            eventName: event.name,
            category: row.category,
          });
          updatePoll.run(
            null,
            null,
            new Date(current).toISOString(),
            null,
            null,
            null,
            event.id,
            row.category,
          );
          row.warningSentAt = new Date(current).toISOString();
        }
        if (
          row.webhookMessageId &&
          !row.finalizedAt &&
          current >= schedule.closeAt.getTime()
        ) {
          const results = resultsForGames(games, listVoteCounts.all(row.id));
          await pollClient.finalize({
            messageId: row.webhookMessageId,
            eventName: event.name,
            category: row.category,
            games,
            results,
          });
          updatePoll.run(
            null,
            null,
            null,
            new Date(current).toISOString(),
            JSON.stringify(results),
            null,
            event.id,
            row.category,
          );
          row.finalizedAt = new Date(current).toISOString();
          row.resultsJson = JSON.stringify(results);
        }
        if (row.lastError)
          updatePoll.run(
            null,
            null,
            null,
            null,
            null,
            null,
            event.id,
            row.category,
          );
      } catch (error) {
        logger.error(
          `Poll lifecycle failed for ${event.slug}/${row.category}`,
          error,
        );
        updatePoll.run(
          null,
          null,
          null,
          null,
          null,
          error.message,
          event.id,
          row.category,
        );
      }
    }
    return stateFor(event, listPolls.all(event.id), current);
  }

  async function processDue() {
    const events = db
      .prepare(
        "SELECT id, name, slug, event_date AS eventDate, start_time AS startTime FROM events",
      )
      .all();
    const processed = [];
    for (const event of events) {
      const rows = listPolls.all(event.id);
      if (rows.length)
        processed.push({
          event: { name: event.name, slug: event.slug },
          polls: await processEvent(event),
        });
    }
    return processed;
  }

  return { processEvent, processDue, stateFor };
}

export default function registerPolls(app, { db, auth, pollClient }) {
  const findEvent = db.prepare(
    "SELECT id, name, slug, event_date AS eventDate, start_time AS startTime FROM events WHERE slug = ?",
  );
  const listPolls = db.prepare(
    "SELECT id, category, games_json AS gamesJson, webhook_message_id AS webhookMessageId, opened_at AS openedAt, warning_sent_at AS warningSentAt, finalized_at AS finalizedAt, results_json AS resultsJson, last_error AS lastError FROM event_polls WHERE event_id = ? ORDER BY category",
  );
  const listVoteCounts = db.prepare(
    "SELECT game_index AS gameIndex, COUNT(*) AS votes FROM poll_votes WHERE poll_id = ? GROUP BY game_index",
  );
  const findVote = db.prepare(
    "SELECT game_index AS gameIndex FROM poll_votes WHERE poll_id = ? AND discord_id = ?",
  );
  const saveVote = db.prepare(
    "INSERT INTO poll_votes (poll_id, discord_id, game_index) VALUES (?, ?, ?) ON CONFLICT(poll_id, discord_id) DO UPDATE SET game_index = excluded.game_index, updated_at = CURRENT_TIMESTAMP",
  );
  const insertPoll = db.prepare(
    "INSERT INTO event_polls (event_id, category, games_json) VALUES (?, ?, ?)",
  );
  const updateGames = db.prepare(
    "UPDATE event_polls SET games_json = ?, last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE event_id = ? AND category = ? AND opened_at IS NULL",
  );
  const processor = createPollProcessor(db, pollClient);
  app.get("/polls/current", (req, res) => {
    const events = db
      .prepare(
        "SELECT id, name, slug, event_date AS eventDate, start_time AS startTime FROM events ORDER BY event_date ASC, start_time ASC, id ASC",
      )
      .all();
    const now = Date.now();
    const user = auth.getUser(req);
    const event = events.find((candidate) => {
      const schedule = pollSchedule(candidate.eventDate, candidate.startTime);
      return (
        schedule.closeAt.getTime() > now &&
        listPolls.all(candidate.id).length > 0
      );
    });
    if (!event) {
      res.json({ event: null, polls: [] });
      return;
    }
    const polls = listPolls
      .all(event.id)
      .map((row) =>
        publicPollState(
          event,
          row,
          listVoteCounts.all(row.id),
          user
            ? (findVote.get(row.id, user.discordId)?.gameIndex ?? null)
            : null,
          now,
        ),
      );
    res.json({
      event: {
        name: event.name,
        slug: event.slug,
        eventDate: event.eventDate,
        startTime: event.startTime,
      },
      polls,
    });
  });

  app.post("/events/:slug/polls/:category/vote", (req, res) => {
    const user = requireUser(req, res, auth);
    if (!user) return;
    if (!POLL_CATEGORIES.includes(req.params.category)) {
      res.status(404).json({ error: "Poll category not found." });
      return;
    }
    requireJson(req, res, () => {
      const validation = validateVote(req.body);
      if (validation.error) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const event = findEvent.get(req.params.slug);
      const row =
        event &&
        listPolls
          .all(event.id)
          .find((poll) => poll.category === req.params.category);
      if (!event || !row) {
        res.status(404).json({ error: "Poll not found." });
        return;
      }
      const schedule = pollSchedule(event.eventDate, event.startTime);
      const now = Date.now();
      if (
        row.finalizedAt ||
        now < schedule.openAt.getTime() ||
        now >= schedule.closeAt.getTime()
      ) {
        res.status(409).json({ error: "This poll is not open for voting." });
        return;
      }
      const games = parseGames(row);
      if (validation.value >= games.length) {
        res
          .status(400)
          .json({ error: "That game is not available in this poll." });
        return;
      }
      saveVote.run(row.id, user.discordId, validation.value);
      res.json({
        poll: publicPollState(
          event,
          row,
          listVoteCounts.all(row.id),
          validation.value,
          now,
        ),
      });
    });
  });

  app.get("/events/:slug/polls", (req, res) => {
    if (!requireAdmin(req, res, auth)) return;
    const event = findEvent.get(req.params.slug);
    if (!event) {
      res.status(404).json({ error: "Event not found." });
      return;
    }
    res.json({ polls: processor.stateFor(event, listPolls.all(event.id)) });
  });

  app.put("/events/:slug/polls", (req, res) => {
    if (!requireAdmin(req, res, auth)) return;
    requireJson(req, res, () => {
      const event = findEvent.get(req.params.slug);
      if (!event) {
        res.status(404).json({ error: "Event not found." });
        return;
      }
      const validation = validatePolls(req.body);
      if (validation.error) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const existing = new Map(
        listPolls.all(event.id).map((row) => [row.category, row]),
      );
      const schedule = pollSchedule(event.eventDate, event.startTime);
      if (
        existing.size &&
        (Date.now() >= schedule.openAt.getTime() ||
          [...existing.values()].some((row) => row.openedAt))
      ) {
        res
          .status(409)
          .json({
            error: "Poll games cannot be changed after polling has opened.",
          });
        return;
      }
      try {
        for (const category of POLL_CATEGORIES) {
          if (existing.has(category))
            updateGames.run(
              JSON.stringify(validation.value[category]),
              event.id,
              category,
            );
          else
            insertPoll.run(
              event.id,
              category,
              JSON.stringify(validation.value[category]),
            );
        }
        res.json({ polls: processor.stateFor(event, listPolls.all(event.id)) });
      } catch (error) {
        logger.error(`Failed to save poll games for ${event.slug}`, error);
        res.status(500).json({ error: "Unable to save poll games." });
      }
    });
  });

  app.post("/events/:slug/polls/process", async (req, res) => {
    if (!requireAdmin(req, res, auth)) return;
    const event = findEvent.get(req.params.slug);
    if (!event) {
      res.status(404).json({ error: "Event not found." });
      return;
    }
    try {
      res.json({ polls: await processor.processEvent(event) });
    } catch (error) {
      logger.error(`Failed to process polls for ${event.slug}`, error);
      res.status(502).json({ error: "Unable to process polls." });
    }
  });

  app.locals.pollProcessor = processor;
}
