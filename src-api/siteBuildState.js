/**
 * Single-row table that records which event the deployed site was last built
 * for, and whether a rebuild for a newer event is still outstanding.
 */
export function getSiteBuildState(db) {
  const row = db
    .prepare(`
      SELECT last_built_for_event_id AS lastBuiltForEventId,
        rebuild_pending AS rebuildPending,
        pending_event_id AS pendingEventId
      FROM site_build_state
      WHERE id = 1
    `)
    .get();

  return {
    lastBuiltForEventId: row?.lastBuiltForEventId ?? null,
    rebuildPending: Boolean(row?.rebuildPending),
    pendingEventId: row?.pendingEventId ?? null,
  };
}

export function markSiteRebuildPending(db, eventId) {
  db.prepare(`
    UPDATE site_build_state
    SET rebuild_pending = 1, pending_event_id = ?
    WHERE id = 1
  `).run(eventId);
}

export function markSiteRebuildComplete(db, eventId) {
  db.prepare(`
    UPDATE site_build_state
    SET rebuild_pending = 0, pending_event_id = NULL, last_built_for_event_id = ?
    WHERE id = 1
  `).run(eventId);
}
