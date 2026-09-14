import type { HomepageInitialState, NextEvent, Season } from "./homepageState";

type EventRow = {
  name: string;
  slug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  season: Season | null;
};

function toEventDateTime(eventDate: string, eventTime: string) {
  return new Date(`${eventDate}T${eventTime}:00`);
}

export async function loadHomepageInitialState(): Promise<HomepageInitialState> {
  // @ts-expect-error Server-only import from the colocated API package.
  const { createDatabase } = await import("../../src-api/db.js");
  const db = createDatabase();

  try {
    const event = db.prepare(`
      SELECT name, slug, event_date AS eventDate,
        start_time AS startTime, end_time AS endTime, season
      FROM events
      ORDER BY event_date ASC, start_time ASC, id ASC
    `).all().find((row: EventRow) => toEventDateTime(row.eventDate, row.startTime).getTime() >= Date.now()) as EventRow | undefined;

    if (!event) return { nextEvent: null };

    return {
      nextEvent: {
        nextDateTime: `${event.eventDate}T${event.startTime}:00`,
        endDateTime: `${event.eventDate}T${event.endTime}:00`,
        event: {
          name: event.name,
          slug: event.slug,
          eventDate: event.eventDate,
          startTime: event.startTime,
          endTime: event.endTime,
          season: event.season,
        },
      } satisfies NextEvent,
    };
  } finally {
    db.close();
  }
}
