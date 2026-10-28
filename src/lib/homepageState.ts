import { reactive } from "vue";

export type Season = "winter" | "spring" | "summer" | "autumn";

export type NextEvent = {
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

export type HomepageInitialState = {
  nextEvent: NextEvent | null;
};

export const homepageState = reactive<HomepageInitialState>({
  nextEvent: null,
});

export function applyHomepageState(state: HomepageInitialState | null | undefined) {
  homepageState.nextEvent = state?.nextEvent || null;
}

/**
 * Only the SSG build bakes the next event into the HTML. Plain `vite dev` has
 * no build-time state, so fetch it there; production never refetches.
 */
export async function loadHomepageStateForDev() {
  // Same origin; `vite dev` proxies /api to the local API.
  const response = await fetch("/api/next-date");
  if (!response.ok) {
    if (response.status === 404) {
      homepageState.nextEvent = null;
      return;
    }
    throw new Error(`Request failed (${response.status}).`);
  }
  homepageState.nextEvent = (await response.json()) as NextEvent;
}

export function formatEventDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const dateValue = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateValue);
}

export function formatEventTime(time: string) {
  const [hourText = "0", minute = "00"] = time.split(":");
  let hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour %= 12;
  if (hour === 0) hour = 12;
  return minute === "00" ? `${hour}${suffix}` : `${hour}:${minute}${suffix}`;
}

const londonOffset = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  timeZoneName: "longOffset",
});

/**
 * Events are stored as wall-clock UK dates and times. Structured data needs an
 * explicit offset, so resolve it for the Europe/London zone on that day.
 */
export function formatEventDateTimeIso(date: string, time: string) {
  const instant = new Date(`${date}T${time}:00Z`);
  const zoneName = londonOffset
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  const offset = zoneName && zoneName !== "GMT" ? zoneName.replace("GMT", "") : "+00:00";
  return `${date}T${time}:00${offset}`;
}
