# Gamers Unite API

Minimal standalone Node API for site services. First service: game recommendations.

## Requirements

Node.js 24 or newer. This API uses built-in `node:http` and `node:sqlite`; no packages are required.

## Run

From repository root:

```sh
npm run api:dev
# or
npm run api:start
npm run api:test
```

API listens on `http://localhost:3000` by default. Set `PORT` to change it.

## CORS

Production permits browser requests only from `https://gamersunitelan.com`. `npm run api:dev` additionally permits `http://localhost:*` and `http://127.0.0.1:*`. Keep `NODE_ENV` unset or set it to `production` for deployed API processes.

## Endpoints

```sh
curl http://localhost:3000/health
curl http://localhost:3000/api/game-recommendations
curl -X POST http://localhost:3000/api/game-recommendations \
  -H 'Content-Type: application/json' \
  -d '{"gameName":"Team Fortress 2","description":"Great LAN game","recommendedBy":"Alex"}'
```

`POST /api/game-recommendations` requires `gameName`; `description` and `recommendedBy` are optional. Duplicate ASCII names are rejected case-insensitively. Recommendation submissions are limited to 30 requests per IP per minute by default. Set `RATE_LIMIT_MAX` or `RATE_LIMIT_WINDOW_MS` to change this.

## Persistence

By default SQLite data persists at `src-api/data/gamers-unite.sqlite`. That path is ignored by Git. Set `DATABASE_PATH` to persist elsewhere. Deployments with ephemeral filesystems will lose local SQLite data on restart, so use persistent disk before relying on recommendations in production.
