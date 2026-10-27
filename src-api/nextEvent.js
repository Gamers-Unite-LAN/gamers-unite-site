export function toEventDateTime(eventDate, eventTime) {
  return new Date(`${eventDate}T${eventTime}:00`);
}

/**
 * The next event is the earliest event that has not ended yet, so an event
 * that is currently running still counts as "next".
 */
export function findNextUpcomingEvent(db, now = Date.now()) {
  const rows = db
    .prepare(`
      SELECT id, name, slug, event_date AS eventDate,
        start_time AS startTime, end_time AS endTime, season
      FROM events
      ORDER BY event_date ASC, start_time ASC, id ASC
    `)
    .all();

  const row = rows.find(
    (candidate) =>
      toEventDateTime(candidate.eventDate, candidate.endTime).getTime() > now,
  );

  return row
    ? { ...row, endsAt: toEventDateTime(row.eventDate, row.endTime) }
    : null;
}
