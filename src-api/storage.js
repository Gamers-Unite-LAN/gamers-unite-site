import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const SAFE_EXTENSION = /\.[a-zA-Z0-9]{1,8}$/;

// This wrapper only ever speaks the S3 API. Swapping providers later
// (MinIO -> Hetzner Object Storage -> R2/AWS/etc.) means changing these
// env vars only -- nothing in server.js or this file needs to change.
//
// The SQLite `images`/`events` tables (see db.js) are the source of truth
// for which images exist, their order, and event ownership -- this module
// only ever writes/deletes/reads bytes at a given key. Nothing here lists
// bucket contents; that's deliberate, so S3 and the DB can't drift apart
// silently (an object with no DB row is just orphaned, not "discovered").
export function createStorage({
  bucket = process.env.S3_BUCKET,
  endpoint = process.env.S3_ENDPOINT,
  region = process.env.S3_REGION || "auto",
  accessKeyId = process.env.S3_ACCESS_KEY_ID,
  secretAccessKey = process.env.S3_SECRET_ACCESS_KEY,
  publicUrlBase = process.env.S3_PUBLIC_URL_BASE,
  forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false",
} = {}) {
  if (!bucket) throw new Error("S3_BUCKET is required.");
  if (!publicUrlBase) throw new Error("S3_PUBLIC_URL_BASE is required to build image URLs.");

  const client = new S3Client({
    endpoint,
    region,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    // MinIO and most non-AWS S3-compatible providers need path-style URLs
    // (https://host/bucket/key) rather than virtual-hosted style. AWS itself
    // is fine with either, so this default is safe everywhere.
    forcePathStyle,
  });

  function publicUrl(key) {
    return `${publicUrlBase.replace(/\/+$/, "")}/${key}`;
  }

  return {
    async putImage(key, body, contentType) {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }));
      return publicUrl(key);
    },

    async deleteImage(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    publicUrl,
  };
}

// Generates a collision-proof id while preserving the file extension
// (needed so browsers/CDNs get the right content type from the URL). This
// is both the DB primary key for the image row and the last path segment
// of its S3 key.
export function generateImageId(originalName) {
  const extension = SAFE_EXTENSION.exec(originalName || "")?.[0].toLowerCase() || "";
  return `${randomUUID()}${extension}`;
}

// Validates a path segment (an event slug or image id) before it's used to
// build a storage key or a SQL lookup, so something like `../../secrets`
// can never reach the S3 client or filesystem-shaped assumptions.
export function isValidPathSegment(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 200 && !value.includes("/") && !value.includes("..");
}

export function keyForImage(eventSlug, id) {
  return `images/${eventSlug}/${id}`;
}
