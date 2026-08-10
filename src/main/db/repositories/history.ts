import type { WatchHistoryEntry } from '@shared/schemas/history'
import { getDb } from '../index'
import { mapHistory, type WatchHistoryRow } from '../mappers'

export function upsertProgress(
  videoId: string,
  watchProgress: number,
  completed?: boolean,
  watchedThreshold = 0.7
): WatchHistoryEntry {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = db
    .prepare('SELECT * FROM watch_history WHERE video_id = ?')
    .get(videoId) as WatchHistoryRow | undefined

  const isCompleted =
    completed ??
    (existing?.completed === 1 || watchProgress >= watchedThreshold ? true : false)

  if (!existing) {
    db.prepare(
      `
      INSERT INTO watch_history (video_id, first_opened_at, last_opened_at, watch_progress, completed)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(videoId, now, now, watchProgress, isCompleted ? 1 : 0)
  } else {
    db.prepare(
      `
      UPDATE watch_history
      SET last_opened_at = ?,
          watch_progress = ?,
          completed = ?
      WHERE video_id = ?
    `
    ).run(now, watchProgress, isCompleted ? 1 : 0, videoId)
  }

  return getHistory(videoId)!
}

export function markWatched(videoId: string, completed = true): WatchHistoryEntry {
  return upsertProgress(videoId, completed ? 1 : 0, completed)
}

/** Clear completed so the video can reappear under Unwatched filters. */
export function unmarkWatched(videoId: string): WatchHistoryEntry | null {
  const db = getDb()
  const existing = db
    .prepare('SELECT * FROM watch_history WHERE video_id = ?')
    .get(videoId) as WatchHistoryRow | undefined
  if (!existing) return null
  db.prepare(
    `
    UPDATE watch_history
    SET completed = 0,
        watch_progress = CASE
          WHEN watch_progress IS NULL OR watch_progress >= 0.98 THEN 0
          ELSE watch_progress
        END
    WHERE video_id = ?
  `
  ).run(videoId)
  return getHistory(videoId)
}

export function getHistory(videoId: string): WatchHistoryEntry | null {
  const row = getDb()
    .prepare('SELECT * FROM watch_history WHERE video_id = ?')
    .get(videoId) as WatchHistoryRow | undefined
  return row ? mapHistory(row) : null
}

export function listHistory(limit = 50): WatchHistoryEntry[] {
  const rows = getDb()
    .prepare(
      `
    SELECT * FROM watch_history
    ORDER BY COALESCE(last_opened_at, first_opened_at) DESC
    LIMIT ?
  `
    )
    .all(limit) as WatchHistoryRow[]
  return rows.map(mapHistory)
}

export function recordOpen(videoId: string): WatchHistoryEntry {
  const existing = getHistory(videoId)
  if (!existing) {
    return upsertProgress(videoId, 0, false)
  }
  const now = new Date().toISOString()
  getDb()
    .prepare('UPDATE watch_history SET last_opened_at = ? WHERE video_id = ?')
    .run(now, videoId)
  return getHistory(videoId)!
}
