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

## Next event and static-site rebuilds

`GET /api/next-date` returns the earliest event that has not ended yet, ordered by start time, so an event that is currently running still counts as the next one. It responds `404` with `{"error":"No upcoming events found."}` when there is none, and carries `Cache-Control: public, max-age=60`.

The site renders once at build time, so the API redeploys it whenever the next event changes:

| Variable | Purpose |
| --- | --- |
| `COOLIFY_API_URL` | Public URL of the Coolify instance |
| `COOLIFY_API_TOKEN` | Coolify API token with the deploy permission only (secret) |
| `SITE_APP_UUID` | UUID of the static site app in Coolify |

Creating, updating or deleting an event schedules a rebuild, debounced to one deployment per 30 seconds. A background watcher also compares the current next event with the event the site was last built for (`site_build_state` table), and wakes shortly after that event ends so the site moves on to the following event (or TBA). A rebuild is tracked to completion by polling the Coolify deployment: on success the built event is recorded, on failure it stays pending and is retried after 5 minutes, 15 minutes, then hourly. A pending rebuild is re-requested when the API restarts.

Rebuilds need a single API instance; multiple replicas would each trigger deployments. If the variables above are missing, the API logs a warning and skips rebuilds, which keeps local development working.

No cron or scheduled task is needed. The watcher wakes on a data change, shortly after the current event ends, on every failed-deployment retry, and on startup when a rebuild is still pending, so a daily rebuild would only repeat work the API already knows is done. The site container holds no Coolify credentials as a result.

Variable names avoid Coolify's predefined `COOLIFY_URL` (which the container already receives as the app's own URL).

### Coolify setup

Create a token under **Keys & Tokens** with the deploy ability only, then:

1. **API app → Environment Variables**: `COOLIFY_API_URL` (e.g. `https://coolify.example.com`), `COOLIFY_API_TOKEN` (the deploy token, secret), `SITE_APP_UUID` (UUID of the site app). `src-api/docker-compose.yaml` forwards these three into the container, so they must be set on the app, not only in the compose file.
2. Nothing to configure on the site app. The API is served from `/api` on the site's own origin, and the build derives that URL from Coolify's predefined `COOLIFY_URL`. Set `VITE_API_URL` as a build variable only if the API ever moves to a different host.
3. Deploy the API first and wait for it to finish, then deploy the site. The site build fetches `/next-date` from the running API and fails if it cannot reach it. The build log prints `[next-event] GET <url> -> <status>`.

Edge caching still needs one check in Cloudflare: HTML must not be cached by a Cache Rule; `/api/next-date` already sends `max-age=60`.

## Persistence

By default SQLite data persists at `src-api/data/gamers-unite.sqlite`. That path is ignored by Git. Set `DATABASE_PATH` to persist elsewhere. Deployments with ephemeral filesystems will lose local SQLite data on restart, so use persistent disk before relying on recommendations in production.

## Gallery: events and images

`storage.js` is a thin wrapper around the official `@aws-sdk/client-s3` package, so it speaks real S3 protocol against any S3-compatible endpoint — MinIO today, Hetzner Object Storage or AWS/R2 later, with zero code changes. Add the dependency at the repo root:

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

Switching to Hetzner Object Storage (or any other S3-compatible provider) later means creating a bucket there and updating `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `PUBLIC_ASSET_URL_BASE` — `storage.js` and `server.js` don't change.
