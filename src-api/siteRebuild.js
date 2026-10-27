import { logger } from "./logger.js";
import { findNextUpcomingEvent } from "./nextEvent.js";
import {
  getSiteBuildState,
  markSiteRebuildComplete,
  markSiteRebuildPending,
} from "./siteBuildState.js";

const DEFAULT_DEBOUNCE_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 20_000;
const DEFAULT_POLL_TIMEOUT_MS = 15 * 60_000;
const RETRY_DELAYS_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000];
const FINAL_FAILURE_STATUSES = new Set(["failed", "cancelled-by-user"]);

function defaultSetTimer(fn, ms) {
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  return timer;
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

/**
 * Triggers a Coolify deployment of the static site so its baked-in next-event
 * date is regenerated. Tracks whether that deployment actually succeeded in
 * the site_build_state table, retrying with backoff until it does.
 */
export function createSiteRebuild({
  db,
  env = process.env,
  fetchImpl = fetch,
  log = logger,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  pollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  retryDelaysMs = RETRY_DELAYS_MS,
  sleep = defaultSleep,
  setTimer = defaultSetTimer,
  clearTimer = clearTimeout,
  now = Date.now,
} = {}) {
  const coolifyUrl = (env.COOLIFY_URL || "").replace(/\/+$/, "");
  const token = env.COOLIFY_TOKEN || "";
  const siteUuid = env.SITE_APP_UUID || "";
  const configured = Boolean(coolifyUrl && token && siteUuid);

  let timer;
  let timerDueAt = 0;
  let inFlight;
  let retryIndex = 0;
  let warnedMissingConfig = false;

  function authHeaders() {
    return { Authorization: `Bearer ${token}`, Accept: "application/json" };
  }

  async function deploy() {
    const nextEvent = findNextUpcomingEvent(db);
    const eventId = nextEvent?.id ?? null;
    markSiteRebuildPending(db, eventId);

    const deployResponse = await fetchImpl(
      `${coolifyUrl}/api/v1/deploy?uuid=${encodeURIComponent(siteUuid)}&force=true`,
      { method: "POST", headers: authHeaders() },
    );
    if (!deployResponse.ok) {
      throw new Error(`Coolify deploy request failed (${deployResponse.status})`);
    }

    const payload = await deployResponse.json();
    const deploymentUuid = payload?.deployments?.[0]?.deployment_uuid;
    if (!deploymentUuid) {
      throw new Error("Coolify deploy response did not include a deployment uuid");
    }

    const deadline = now() + pollTimeoutMs;
    while (now() < deadline) {
      await sleep(pollIntervalMs);
      const statusResponse = await fetchImpl(
        `${coolifyUrl}/api/v1/deployments/${encodeURIComponent(deploymentUuid)}`,
        { headers: authHeaders() },
      );
      if (!statusResponse.ok) {
        throw new Error(`Coolify deployment status request failed (${statusResponse.status})`);
      }

      const { status } = await statusResponse.json();
      if (status === "finished") {
        markSiteRebuildComplete(db, eventId);
        log.info("Site rebuild finished", { deploymentUuid, eventId });
        return;
      }
      if (FINAL_FAILURE_STATUSES.has(status)) {
        throw new Error(`Coolify deployment ${deploymentUuid} ended with status "${status}"`);
      }
    }

    throw new Error(`Coolify deployment ${deploymentUuid} did not finish within ${pollTimeoutMs}ms`);
  }

  function schedule(delayMs, fn) {
    // Keep the earliest pending fire: a deployment already queued will read
    // the latest data anyway, and a restart recovery must not be pushed back.
    const dueAt = now() + delayMs;
    if (timer !== undefined && timerDueAt <= dueAt) return;

    if (timer !== undefined) clearTimer(timer);
    timerDueAt = dueAt;
    timer = setTimer(() => {
      timer = undefined;
      timerDueAt = 0;
      void fn();
    }, delayMs);
  }

  function scheduleRetry() {
    const delay = retryDelaysMs[Math.min(retryIndex, retryDelaysMs.length - 1)];
    retryIndex += 1;
    log.warn(`Site rebuild failed; retrying in ${delay}ms`);
    schedule(delay, run);
  }

  function warnMissingConfig() {
    if (warnedMissingConfig) return;
    warnedMissingConfig = true;
    log.warn(
      "Site rebuild skipped: set COOLIFY_URL, COOLIFY_TOKEN and SITE_APP_UUID to enable it.",
    );
  }

  function run() {
    if (!configured) {
      warnMissingConfig();
      return Promise.resolve();
    }
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        await deploy();
        retryIndex = 0;
      } catch (error) {
        log.error("Site rebuild failed", error);
        scheduleRetry();
      } finally {
        inFlight = undefined;
      }
    })();

    return inFlight;
  }

  function requestSiteRebuild(delayMs = debounceMs) {
    if (!configured) {
      warnMissingConfig();
      return;
    }

    // Debounce: several edits in a row result in a single deployment.
    schedule(delayMs, run);
  }

  function rebuildNow() {
    cancel();
    return run();
  }

  function cancel() {
    if (timer !== undefined) {
      clearTimer(timer);
      timer = undefined;
    }
    timerDueAt = 0;
  }

  function start() {
    if (!configured) {
      warnMissingConfig();
      return;
    }

    if (getSiteBuildState(db).rebuildPending) {
      log.info("Outstanding site rebuild found at startup; requesting a new deployment.");
      requestSiteRebuild(0);
    }
  }

  return {
    start,
    cancel,
    rebuildNow,
    requestSiteRebuild,
    isConfigured: configured,
  };
}
