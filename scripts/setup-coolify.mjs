#!/usr/bin/env node
/**
 * One-shot, idempotent Coolify setup for the next-event rebuild pipeline.
 *
 * Usage:
 *   COOLIFY_API_URL=https://coolify.example.com \
 *   COOLIFY_PROVISION_TOKEN=... \
 *   COOLIFY_API_TOKEN=... \
 *   node scripts/setup-coolify.mjs [--dry-run]
 *
 * Env:
 *   COOLIFY_API_URL          Coolify instance URL (required)
 *   COOLIFY_PROVISION_TOKEN  token with read + write + deploy abilities (required)
 *   COOLIFY_API_TOKEN        deploy-only token stored in the apps (required unless --dry-run)
 *   API_APP / SITE_APP       app UUID or name (defaults: gamers-unite-site-api / gamers-unite-site)
 *   SITE_URL                 public site URL (default: https://gamersunitelan.com)
 *   SKIP_DEPLOY=1            configure only, do not deploy
 */

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const base = (process.env.COOLIFY_API_URL || "").replace(/\/+$/, "");
const provisionToken = process.env.COOLIFY_PROVISION_TOKEN || "";
const deployToken = process.env.COOLIFY_API_TOKEN || "";
const apiAppIdentifier = process.env.API_APP || "gamers-unite-site-api";
const siteAppIdentifier = process.env.SITE_APP || "gamers-unite-site";
const siteUrl = (process.env.SITE_URL || "https://gamersunitelan.com").replace(/\/+$/, "");
const skipDeploy = process.env.SKIP_DEPLOY === "1" || dryRun;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (!base) fail("COOLIFY_API_URL is required.");
if (!provisionToken) fail("COOLIFY_PROVISION_TOKEN is required (read + write + deploy abilities).");
if (!deployToken && !dryRun) {
  fail("COOLIFY_API_TOKEN is required: a deploy-only token to store in the apps.");
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${provisionToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    if (response.status === 403) {
      throw new Error(
        `${method} ${path} -> 403. The provisioning token needs read, write and deploy abilities.`,
      );
    }
    throw new Error(`${method} ${path} -> ${response.status} ${detail}`);
  }

  return data;
}

async function resolveApp(identifier) {
  const applications = await api("/applications");
  const needle = identifier.toLowerCase();
  const match = applications.find(
    (application) =>
      application.uuid === identifier ||
      application.name?.toLowerCase() === needle ||
      (application.fqdn || "").toLowerCase().includes(needle),
  );
  if (!match) {
    const known = applications.map((application) => `${application.name} (${application.uuid})`).join(", ");
    throw new Error(`No Coolify application matched "${identifier}". Known applications: ${known || "none"}`);
  }
  return match;
}

async function applyEnvs(app, envs) {
  const payload = { data: envs };
  if (dryRun) {
    console.log(`[dry-run] PATCH /applications/${app.uuid}/envs/bulk ${JSON.stringify(payload, null, 2)}`);
    return;
  }
  await api(`/applications/${app.uuid}/envs/bulk`, { method: "PATCH", body: payload });
  console.log(`configured ${envs.length} variable(s) on ${app.name}`);
}

async function applyScheduledTask(app, task) {
  const tasks = await api(`/applications/${app.uuid}/scheduled-tasks`);
  const existing = tasks.find((candidate) => candidate.name === task.name);

  if (dryRun) {
    console.log(
      `[dry-run] ${existing ? `PATCH /applications/${app.uuid}/scheduled-tasks/${existing.uuid}` : `POST /applications/${app.uuid}/scheduled-tasks`} ${JSON.stringify(task, null, 2)}`,
    );
    return;
  }

  if (existing) {
    await api(`/applications/${app.uuid}/scheduled-tasks/${existing.uuid}`, { method: "PATCH", body: task });
    console.log(`updated scheduled task "${task.name}" on ${app.name}`);
    return;
  }

  await api(`/applications/${app.uuid}/scheduled-tasks`, { method: "POST", body: task });
  console.log(`created scheduled task "${task.name}" on ${app.name}`);
}

async function deploy(app, label) {
  if (skipDeploy) {
    console.log(`skipped ${label} deployment (SKIP_DEPLOY or --dry-run)`);
    return;
  }

  const payload = await api(`/deploy?uuid=${encodeURIComponent(app.uuid)}&force=true`, { method: "POST" });
  const deploymentUuid = payload?.deployments?.[0]?.deployment_uuid;
  if (!deploymentUuid) throw new Error(`${label}: Coolify did not return a deployment uuid`);

  console.log(`${label}: deployment ${deploymentUuid} queued`);
  const deadline = Date.now() + 20 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const { status } = await api(`/deployments/${deploymentUuid}`);
    console.log(`${label}: ${status}`);
    if (status === "finished") return;
    if (status === "failed" || status === "cancelled-by-user") {
      throw new Error(`${label}: deployment ${deploymentUuid} ${status}`);
    }
  }
  throw new Error(`${label}: deployment ${deploymentUuid} did not finish within 20 minutes`);
}

try {
  const { version } = await api("/version");
  console.log(`Coolify ${version ?? "(unknown version)"} at ${base}`);

  const apiApp = await resolveApp(apiAppIdentifier);
  const siteApp = await resolveApp(siteAppIdentifier);
  console.log(`api app: ${apiApp.name} (${apiApp.uuid})`);
  console.log(`site app: ${siteApp.name} (${siteApp.uuid})`);

  const apiEnvs = [
    { key: "COOLIFY_API_URL", value: base, is_buildtime: false, is_runtime: true },
    { key: "SITE_APP_UUID", value: siteApp.uuid, is_buildtime: false, is_runtime: true },
  ];
  if (deployToken) {
    apiEnvs.push({
      key: "COOLIFY_API_TOKEN",
      value: deployToken,
      is_buildtime: false,
      is_runtime: true,
      is_shown_once: true,
    });
  }

  await applyEnvs(apiApp, apiEnvs);

  const siteEnvs = [
    { key: "VITE_API_URL", value: `${siteUrl}/api`, is_buildtime: true, is_runtime: false },
    { key: "COOLIFY_API_URL", value: base, is_buildtime: false, is_runtime: true },
    { key: "SITE_APP_UUID", value: siteApp.uuid, is_buildtime: false, is_runtime: true },
  ];
  if (deployToken) {
    siteEnvs.push({
      key: "COOLIFY_API_TOKEN",
      value: deployToken,
      is_buildtime: false,
      is_runtime: true,
      is_shown_once: true,
    });
  }

  await applyEnvs(siteApp, siteEnvs);

  await applyScheduledTask(siteApp, {
    name: "Site rebuild backstop",
    command: 'wget -q -O /dev/null --header="Authorization: Bearer $COOLIFY_API_TOKEN" --post-data="" "$COOLIFY_API_URL/api/v1/deploy?uuid=$SITE_APP_UUID&force=true"',
    frequency: "0 3 * * *",
    timeout: 300,
    enabled: true,
  });

  // The site build fetches the API, so the API must be deployed first.
  await deploy(apiApp, "api");
  await deploy(siteApp, "site");

  console.log("done");
} catch (error) {
  fail(error.message);
}
