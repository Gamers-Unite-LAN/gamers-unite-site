import { requireJson } from "../middleware.js";
import { cleanString, MAX_DESCRIPTION_LENGTH, MAX_GAME_NAME_LENGTH, MAX_RECOMMENDER_LENGTH } from "../utils.js";

export function validateGameRecommendation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const gameName = cleanString(
    input.gameName,
    "gameName",
    MAX_GAME_NAME_LENGTH,
    true,
  );
  if (gameName.error) return gameName;

  const description = cleanString(
    input.description,
    "description",
    MAX_DESCRIPTION_LENGTH,
  );
  if (description.error) return description;

  const recommendedBy = cleanString(
    input.recommendedBy,
    "recommendedBy",
    MAX_RECOMMENDER_LENGTH,
  );
  if (recommendedBy.error) return recommendedBy;

  return {
    value: {
      gameName: gameName.value,
      description: description.value,
      recommendedBy: recommendedBy.value,
    },
  };
}

export default function registerGameRecommendations(app, { db, rateLimit }) {
  const listRecommendations = db.prepare(`
    SELECT id, game_name AS gameName, description, recommended_by AS recommendedBy, created_at AS createdAt
    FROM game_recommendations
    ORDER BY created_at DESC, id DESC
  `);
  const addRecommendation = db.prepare(`
    INSERT INTO game_recommendations (game_name, description, recommended_by)
    VALUES (?, ?, ?)
  `);
  const findRecommendation = db.prepare(`
    SELECT id, game_name AS gameName, description, recommended_by AS recommendedBy, created_at AS createdAt
    FROM game_recommendations
    WHERE id = ?
  `);

  app.get("/api/game-recommendations", (req, res) => {
    res.json({ gameRecommendations: listRecommendations.all() });
  });

  app.post("/api/game-recommendations", (req, res) => {
    const client = req.socket.remoteAddress || "unknown";
    const limit = rateLimit(client);
    if (!limit.allowed) {
      res.set("retry-after", String(limit.retryAfter));
      res.status(429).json({ error: "Too many recommendations. Try again shortly." });
      return;
    }

    requireJson(req, res, () => {
      const validation = validateGameRecommendation(req.body);
      if (validation.error) {
        res.status(400).json({ error: validation.error });
        return;
      }

      try {
        const result = addRecommendation.run(
          validation.value.gameName,
          validation.value.description,
          validation.value.recommendedBy,
        );
        res.status(201).json({
          gameRecommendation: findRecommendation.get(result.lastInsertRowid),
        });
      } catch (error) {
        if (error.code === "ERR_SQLITE_ERROR" && error.errcode === 2067) {
          res.status(409).json({
            error: "This game has already been recommended.",
          });
          return;
        }
        res.status(500).json({
          error: "Unable to save game recommendation.",
        });
      }
    });
  });
}
