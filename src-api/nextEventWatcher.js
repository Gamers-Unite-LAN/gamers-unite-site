import { logger } from "./logger.js";
import { findNextUpcomingEvent } from "./nextEvent.js";
import { getSiteBuildState } from "./siteBuildState.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const END_GRACE_MS = 5 * MINUTE;

function defaultSchedule(fn, ms) {
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  return timer;
}

/**
 * Rebuilds the site when the next event changes, and again shortly after the
 * current event ends (no data change happens at that moment).
 */
export function createNextEventWatcher({
  db,
  rebuild,
  log = logger,
  schedule = defaultSchedule,
  now = Date.now,
}) {
  function tick() {
    const nextEvent = findNextUpcomingEvent(db, now());
    const state = getSiteBuildState(db);
    const nextEventId = nextEvent?.id ?? null;

    if (state.lastBuiltForEventId !== nextEventId || state.rebuildPending) {
      rebuild.requestSiteRebuild();
    }

    if (!nextEvent) return HOUR;

    const untilEnd = nextEvent.endsAt.getTime() - now() + END_GRACE_MS;
    return Math.min(Math.max(untilEnd, MINUTE), HOUR);
  }

  function start() {
    const loop = () => {
      let delay = 5 * MINUTE;
      try {
        delay = tick();
      } catch (error) {
        log.error("Next event watcher failed", error);
      }
      schedule(loop, delay);
    };

    loop();
  }

  return { tick, start };
}
