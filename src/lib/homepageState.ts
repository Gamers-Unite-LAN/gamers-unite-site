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

function endpoint(path: string) {
  const base = (import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${base}${path}`;
}

export function applyHomepageState(state: HomepageInitialState | null | undefined) {
  homepageState.nextEvent = state?.nextEvent || null;
}

export async function loadHomepageStateFromApi() {
  const response = await fetch(endpoint("/api/next-date"));
  if (!response.ok) {
    if (response.status === 404) {
      homepageState.nextEvent = null;
      return;
    }
    throw new Error(`Request failed (${response.status}).`);
  }
  homepageState.nextEvent = await response.json() as NextEvent;
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
