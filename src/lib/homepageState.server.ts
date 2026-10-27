import type { HomepageInitialState, NextEvent, Season } from "./homepageState";

type NextDateResponse = {
  nextDateTime: string;
  endDateTime: string;
  event: {
    name: string;
    slug: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    season: Season | null;
  };
};

const ATTEMPTS = 5;
const ATTEMPT_TIMEOUT_MS = 10_000;

// Promise.withResolvers needs TS >= 5.5 lib; the project pins TS 5.4.
function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function apiUrl() {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (!base) {
    throw new Error("VITE_API_URL must be set so the build can fetch the next event.");
  }
  return base;
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      // A 4xx is a real answer (404 = no upcoming event), not a transient outage.
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`API returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < ATTEMPTS - 1) {
      await delay(2 ** attempt * 1000);
    }
  }

  throw new Error(`Next event fetch failed after ${ATTEMPTS} attempts`, {
    cause: lastError,
  });
}

export async function loadHomepageInitialState(): Promise<HomepageInitialState> {
  const response = await fetchWithRetry(`${apiUrl()}/next-date`);

  if (response.status === 404) {
    return { nextEvent: null };
  }

  if (!response.ok) {
    throw new Error(`Next event fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as NextDateResponse;
  return {
    nextEvent: {
      nextDateTime: data.nextDateTime,
      endDateTime: data.endDateTime,
      event: data.event,
    } satisfies NextEvent,
  };
}
