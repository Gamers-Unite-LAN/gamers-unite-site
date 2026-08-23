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

## Gallery: events and images

`storage.js` is a thin wrapper around the official `@aws-sdk/client-s3` package, so it speaks real S3 protocol against any S3-compatible endpoint — MinIO today, Hetzner Object Storage or AWS/R2 later, with zero code changes. Add the dependency at the repo root:

```sh
npm install @aws-sdk/client-s3
```

S3 only ever stores bytes. SQLite (`events` and `images` tables) is the source of truth for which images exist, which event they belong to, upload order, and which image is an event's cover photo. This means the app never needs to list bucket contents to render the gallery — it queries the DB and builds public URLs from stored keys.

### Endpoints

```sh
# List events (used for GalleryPage's event columns)
curl http://localhost:3000/api/events

# Create an event
curl -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <UPLOAD_API_KEY>' \
  -d '{"name":"Winter LAN 2026","eventDate":"2026-01-17"}'
# slug is derived from name ("winter-lan-2026") unless you pass one explicitly

# Get one event + its images (used when a gallery tile is clicked)
curl http://localhost:3000/api/events/winter-lan-2026

# Upload a photo to an event. The first upload becomes the cover
# automatically; pass ?cover=true to make a later upload the cover instead.
curl -X POST 'http://localhost:3000/api/events/winter-lan-2026/images?filename=hall.jpg' \
  -H 'Content-Type: image/jpeg' \
  -H 'Authorization: Bearer <UPLOAD_API_KEY>' \
  --data-binary @hall.jpg

# Delete a single image
curl -X DELETE http://localhost:3000/api/images/<id> \
  -H 'Authorization: Bearer <UPLOAD_API_KEY>'

# Delete an event and all of its images (DB rows and S3 objects)
curl -X DELETE http://localhost:3000/api/events/winter-lan-2026 \
  -H 'Authorization: Bearer <UPLOAD_API_KEY>'
```

`GET /api/events` and `GET /api/events/:slug` are public. Creating events, uploading images, and deleting either require `Authorization: Bearer <UPLOAD_API_KEY>`. Allowed image types: PNG, JPEG, WebP, GIF. Max upload size is 8MB by default (`MAX_IMAGE_SIZE`, in bytes). If storage env vars aren't set, image upload routes return `503`; event/game-recommendation routes keep working normally.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `S3_BUCKET` | Bucket name, e.g. `gul-images` |
| `S3_ENDPOINT` | e.g. `https://minio.gamersunitelan.com` (self-hosted) or Hetzner's regional endpoint |
| `S3_REGION` | Any string is fine for MinIO; use the real region for Hetzner/AWS |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credentials for the bucket |
| `S3_PUBLIC_URL_BASE` | Public base URL images are served from, e.g. `https://images.gamersunitelan.com/gul-images` |
| `S3_FORCE_PATH_STYLE` | Defaults to `true` (required by MinIO and most non-AWS providers). Set to `false` for AWS if you prefer virtual-hosted-style URLs |
| `UPLOAD_API_KEY` | Shared secret required to create/upload/delete events and images |
| `MAX_IMAGE_SIZE` | Max upload size in bytes (default 8MB) |

### Self-hosting with MinIO on Coolify

1. In Coolify, add a new service and pick the MinIO template (or deploy the `minio/minio` image directly with a persistent volume mounted at `/data`).
2. Give it a subdomain in Coolify (e.g. `minio.gamersunitelan.com`) so Traefik issues a cert — same step your other subdomains needed.
3. Log into the MinIO console, create a bucket (e.g. `gul-images`), and set its access policy to public **read-only** (so `S3_PUBLIC_URL_BASE` works without presigning every URL). Create an access key/secret scoped to that bucket for the API to use — don't reuse MinIO's root credentials here.
4. Set `S3_PUBLIC_URL_BASE` to `https://minio.gamersunitelan.com/gul-images` (path-style), or put Cloudflare/a CDN in front of it if you want a nicer public hostname.
5. Back up the MinIO data volume periodically — it has no built-in replication, and it shares disk with everything else on the server.

Switching to Hetzner Object Storage (or any other S3-compatible provider) later means creating a bucket there and updating `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_PUBLIC_URL_BASE` — `storage.js` and `server.js` don't change.
