# Gamers Unite API

Minimal standalone Node API for site services. First service: game recommendations.

## Requirements

Node.js 24 or newer. The API uses built-in `node:http` and `node:sqlite` plus the dependencies declared in `src-api/package.json`.

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

## Discord authentication

Admin access uses Discord OAuth2 authorization-code login with the `identify` scope. Create a Discord application, add `DISCORD_REDIRECT_URI` to its OAuth2 redirect URLs, and configure these variables before starting the API:

| Variable | Purpose |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord application client ID |
| `DISCORD_CLIENT_SECRET` | Discord application client secret |
| `DISCORD_REDIRECT_URI` | Registered callback URL, e.g. `https://gamersunitelan.com/api/auth/discord/callback` |
| `DISCORD_FRONTEND_URL` | Frontend URL to return to after login, e.g. `https://gamersunitelan.com` |
| `DISCORD_ADMIN_USER_IDS` | Comma-separated Discord user IDs allowed to administer the gallery |
| `SESSION_TTL_MS` | Session lifetime in milliseconds (default: 7 days) |

The admin page starts login at `/api/auth/discord`. The API exchanges the code server-side, stores only a hash of the session token in SQLite, and sends the browser an `HttpOnly` session cookie. `DISCORD_ADMIN_USER_IDS` is checked on every admin request, so changing the variable takes effect after the API restarts. `POST /api/auth/logout` clears the session.
Do not copy the Discord OAuth2 URL Generator output into `DISCORD_REDIRECT_URI`; that generated URL is what the API builds at runtime. The environment variable must contain only the registered callback URL, such as `http://localhost:5173/api/auth/discord/callback` during local development.

## Endpoints

```sh
curl http://localhost:3000/health
curl http://localhost:3000/api/game-recommendations
curl -X POST http://localhost:3000/api/game-recommendations \
  -H 'Content-Type: application/json' \
  -d '{"gameName":"Team Fortress 2","description":"Great LAN game","recommendedBy":"Alex"}'
```

`POST /api/game-recommendations` requires `gameName`; `description` and `recommendedBy` are optional. Duplicate ASCII names are rejected case-insensitively. All API requests are limited to 30 requests per IP per minute by default. Set `RATE_LIMIT_MAX` or `RATE_LIMIT_WINDOW_MS` to change this. Requests over the limit return `429` with a `Retry-After` header.

## Persistence

By default SQLite data persists at `src-api/data/gamers-unite.sqlite`. That path is ignored by Git. Set `DATABASE_PATH` to persist elsewhere. Deployments with ephemeral filesystems will lose local SQLite data on restart, so use persistent disk before relying on recommendations in production.

## Gallery: events and images

`services/storage.js` is a thin wrapper around the official `@aws-sdk/client-s3` package, so it speaks real S3 protocol against any S3-compatible endpoint — MinIO today, Hetzner Object Storage or AWS/R2 later, with zero code changes. Add the dependency at the repo root:

```sh
npm install @aws-sdk/client-s3
```

S3 only ever stores bytes. SQLite (`events` and `images` tables) is the source of truth for which images exist, their explicit display order, event visibility, cover-image visibility, event ownership, and which image is an event's cover photo. This means the app never needs to list bucket contents to render the gallery — it queries the DB and builds public URLs from stored keys.

### Endpoints

```sh
# List events (used for GalleryPage's event columns)
curl http://localhost:3000/api/events

# Create an event
curl -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>' \
  -d '{"name":"Winter LAN 2026","eventDate":"2026-01-17","season":"winter"}'

# Update event details or gallery visibility settings
# `galleryVisible` hides the event from public list/detail responses;
# `showCoverImage` omits the cover from public event photos.
curl -X PATCH http://localhost:3000/api/events/winter-lan-2026 \
  -H 'Content-Type: application/json' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>' \
  -d '{"season":"winter","galleryVisible":true,"showCoverImage":true}'

# Admin-only list/detail access to hidden events
curl 'http://localhost:3000/api/events?includeHidden=true' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>'
curl 'http://localhost:3000/api/events/winter-lan-2026?includeHidden=true' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>'

# Upload a photo to an event. The first upload becomes the cover
# automatically; pass ?cover=true to make a later upload the cover instead.
curl -X POST 'http://localhost:3000/api/events/winter-lan-2026/images?filename=hall.jpg' \
  -H 'Content-Type: image/jpeg' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>' \
  --data-binary @hall.jpg

# Delete a single image
curl -X DELETE http://localhost:3000/api/images/<id> \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>'

# Set the complete image display order
curl -X PATCH http://localhost:3000/api/events/winter-lan-2026/images/order \
  -H 'Content-Type: application/json' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>' \
  -d '{"imageIds":["<image-id-2>","<image-id-1>"]}'

# Delete an event and all of its images (DB rows and S3 objects)
curl -X DELETE http://localhost:3000/api/events/winter-lan-2026 \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>'
```

`GET /api/events` and `GET /api/events/:slug` are public and omit hidden events/images. Admin requests may add `includeHidden=true` when authenticated through Discord and included in `DISCORD_ADMIN_USER_IDS`. Creating and updating events, reordering/uploading images, and deleting either require an admin Discord session. Allowed image types: PNG, JPEG, WebP, GIF. Max upload size is 8MB by default (`MAX_IMAGE_SIZE`, in bytes). If storage env vars aren't set, image upload routes return `503`; event/game-recommendation routes keep working normally.

### Discord game polls

The admin page can save exactly three games for each `modern`, `classic`, and `wildcard` category on an event. The API scheduler posts one native Discord poll per category one calendar month before the event, edits each poll with a one-week warning, and edits each closed poll with its vote results and a generated SVG winner image one week before the event. The scheduler runs on API startup and every minute thereafter; `POST /api/events/:slug/polls/process` is available to an administrator for a manual retry.

Set `DISCORD_POLLS_WEBHOOK_URL` to an HTTPS Discord webhook URL. Keep it private: the URL contains the webhook token and grants permission to post and edit messages. Polls are persisted in SQLite, so restarts do not duplicate messages. If the webhook is temporarily unavailable, the failed lifecycle step is retried on the next scheduler run.

The poll configuration endpoints require the same Discord administrator session as event management:

```sh
curl -X PUT http://localhost:3000/api/events/summer-lan-2026/polls \
  -H 'Content-Type: application/json' \
  -H 'Cookie: gul_session=<DISCORD_SESSION_COOKIE>' \
  -d '{"polls":{"modern":["Halo MCC","Rust","Soldat"],"classic":["Team Fortress 2","Battlefield 1942","Heretic II"],"wildcard":["Fall Guys","Jackbox Games","Blur"]}}'
```

Polls are scheduled from the event start date/time in UTC. Changing games after a category has opened is rejected to preserve the Discord message/results relationship.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `S3_BUCKET` | Bucket name, e.g. `gul-images` |
| `S3_ENDPOINT` | e.g. `https://minio.gamersunitelan.com` (self-hosted) or Hetzner's regional endpoint |
| `S3_REGION` | Any string is fine for MinIO; use the real region for Hetzner/AWS |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credentials for the bucket |
| `PUBLIC_ASSET_URL_BASE` | Public base URL images are served from, e.g. `https://images.gamersunitelan.com/gul-images` |
| `S3_FORCE_PATH_STYLE` | Defaults to `true` (required by MinIO and most non-AWS providers). Set to `false` for AWS if you prefer virtual-hosted-style URLs |
| `MAX_IMAGE_SIZE` | Max upload size in bytes (default 8MB) |
| `RATE_LIMIT_MAX` | API requests allowed per IP per window (default 30) |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in milliseconds (default 60000) |

### Self-hosting with MinIO on Coolify

1. In Coolify, add a new service and pick the MinIO template (or deploy the `minio/minio` image directly with a persistent volume mounted at `/data`).
2. Give it a subdomain in Coolify (e.g. `minio.gamersunitelan.com`) so Traefik issues a cert — same step your other subdomains needed.
3. Log into the MinIO console, create a bucket (e.g. `gul-images`), and set its access policy to public **read-only** (so `PUBLIC_ASSET_URL_BASE` works without presigning every URL). Create an access key/secret scoped to that bucket for the API to use — don't reuse MinIO's root credentials here.
4. Set `PUBLIC_ASSET_URL_BASE` to `https://minio.gamersunitelan.com/gul-images` (path-style), or put Cloudflare/a CDN in front of it if you want a nicer public hostname.
5. Back up the MinIO data volume periodically — it has no built-in replication, and it shares disk with everything else on the server.

Switching to Hetzner Object Storage (or any S3-compatible provider) later means creating a bucket there and updating `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `PUBLIC_ASSET_URL_BASE` — `services/storage.js` and `server.js` don't change.
