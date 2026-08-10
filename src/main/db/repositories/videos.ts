import type { FeedFilters } from '@shared/schemas/feed'
import type { HistoryListPage, HistoryVideo } from '@shared/schemas/historyList'
import type { Video } from '@shared/schemas/video'
import { appendBlockedKeywordClauses } from '../keywordFilter'
import { getDb } from '../index'
import { mapVideo, type VideoRow } from '../mappers'

export function upsertVideo(video: {
  id: string
  channelId: string
  title: string
  description?: string | null
  publishedAt?: string | null
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  viewCount?: number | null
  likeCount?: number | null
  isShort?: boolean | null
  fetchedAt?: string | null
}): void {
  getDb()
    .prepare(
      `
    INSERT INTO videos (
      id, channel_id, title, description, published_at, duration_seconds,
      thumbnail_url, view_count, like_count, is_short, fetched_at
    ) VALUES (
      @id, @channelId, @title, @description, @publishedAt, @durationSeconds,
      @thumbnailUrl, @viewCount, @likeCount, @isShort, @fetchedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      channel_id = excluded.channel_id,
      title = excluded.title,
      description = COALESCE(excluded.description, videos.description),
      published_at = COALESCE(excluded.published_at, videos.published_at),
      duration_seconds = COALESCE(excluded.duration_seconds, videos.duration_seconds),
      thumbnail_url = COALESCE(excluded.thumbnail_url, videos.thumbnail_url),
      view_count = COALESCE(excluded.view_count, videos.view_count),
      like_count = COALESCE(excluded.like_count, videos.like_count),
      is_short = COALESCE(excluded.is_short, videos.is_short),
      fetched_at = COALESCE(excluded.fetched_at, videos.fetched_at)
  `
    )
    .run({
      id: video.id,
      channelId: video.channelId,
      title: video.title,
      description: video.description ?? null,
      publishedAt: video.publishedAt ?? null,
      durationSeconds: video.durationSeconds ?? null,
      thumbnailUrl: video.thumbnailUrl ?? null,
      viewCount: video.viewCount ?? null,
      likeCount: video.likeCount ?? null,
      isShort: video.isShort === null || video.isShort === undefined ? null : video.isShort ? 1 : 0,
      fetchedAt: video.fetchedAt ?? new Date().toISOString()
    })
}

export function getVideo(id: string): Video | null {
  const row = getDb()
    .prepare(
      `
    SELECT v.*, c.title AS channel_title,
      CASE WHEN wh.completed = 1 THEN 1 ELSE 0 END AS watched,
      wh.watch_progress AS watch_progress
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN watch_history wh ON wh.video_id = v.id
    WHERE v.id = ?
  `
    )
    .get(id) as VideoRow | undefined
  return row ? mapVideo(row) : null
}

export function hideVideo(id: string): Video | null {
  const now = new Date().toISOString()
  getDb()
    .prepare('UPDATE videos SET hidden = 1, hidden_at = ? WHERE id = ?')
    .run(now, id)
  return getVideo(id)
}

export function unhideVideo(id: string): Video | null {
  getDb()
    .prepare('UPDATE videos SET hidden = 0, hidden_at = NULL WHERE id = ?')
    .run(id)
  return getVideo(id)
}

export function queryFeedVideos(opts: {
  filters: FeedFilters
  cursor: string | null
  limit: number
  blockedKeywords?: string[]
  /** Watch-later / now-playing ids — keep these off Home (Queue tab only). */
  excludeVideoIds?: string[]
}): { items: Video[]; nextCursor: string | null } {
  const db = getDb()
  const where: string[] = [
    'v.hidden = 0',
    'c.subscribed = 1',
    'c.blocked = 0',
    'c.muted = 0',
    'c.hidden = 0'
  ]
  const params: Record<string, string | number> = {
    limit: opts.limit
  }

  if (opts.filters.hideShorts) {
    where.push('(v.is_short IS NULL OR v.is_short = 0)')
  }
  if (opts.filters.unwatchedOnly) {
    where.push('(wh.completed IS NULL OR wh.completed = 0)')
  }
  if (opts.filters.minDurationSeconds != null) {
    where.push('(v.duration_seconds IS NULL OR v.duration_seconds >= @minDuration)')
    params.minDuration = opts.filters.minDurationSeconds
  }
  if (opts.filters.channelId) {
    where.push('v.channel_id = @channelId')
    params.channelId = opts.filters.channelId
  }
  const excludeIds = [...new Set((opts.excludeVideoIds ?? []).filter(Boolean))]
  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map((_, i) => `@ex${i}`)
    where.push(`v.id NOT IN (${placeholders.join(', ')})`)
    excludeIds.forEach((id, i) => {
      params[`ex${i}`] = id
    })
  }
  appendBlockedKeywordClauses(where, params, opts.blockedKeywords ?? [])
  if (opts.cursor) {
    where.push('(v.published_at < @cursor OR (v.published_at = @cursor AND v.id < @cursorId))')
    const [publishedAt, id] = opts.cursor.split('|')
    params.cursor = publishedAt ?? ''
    params.cursorId = id ?? ''
  }

  const sql = `
    SELECT v.*, c.title AS channel_title,
      CASE WHEN wh.completed = 1 THEN 1 ELSE 0 END AS watched,
      wh.watch_progress AS watch_progress
    FROM videos v
    INNER JOIN channels c ON c.id = v.channel_id
    LEFT JOIN watch_history wh ON wh.video_id = v.id
    WHERE ${where.join(' AND ')}
    ORDER BY v.published_at DESC, v.id DESC
    LIMIT @limit
  `

  const rows = db.prepare(sql).all(params) as VideoRow[]
  const items = rows.map(mapVideo)
  const last = items[items.length - 1]
  const nextCursor =
    items.length === opts.limit && last?.publishedAt
      ? `${last.publishedAt}|${last.id}`
      : null

  return { items, nextCursor }
}

function mapHistoryVideo(row: VideoRow): HistoryVideo {
  const video = mapVideo(row)
  return {
    ...video,
    markedAt: row.marked_at ?? video.hiddenAt ?? video.fetchedAt ?? new Date(0).toISOString()
  }
}

function appendHistorySearchClause(
  where: string[],
  params: Record<string, string | number>,
  query: string | undefined
): void {
  const needle = query?.trim().toLowerCase() ?? ''
  if (!needle) return
  where.push(
    `(INSTR(LOWER(v.title), @histQ) > 0 OR INSTR(LOWER(COALESCE(v.description, '')), @histQ) > 0 OR INSTR(LOWER(COALESCE(c.title, '')), @histQ) > 0)`
  )
  params.histQ = needle
}

export function listWatchedVideos(opts: {
  cursor: string | null
  limit: number
  query?: string
}): HistoryListPage {
  const db = getDb()
  const where = ['wh.completed = 1']
  const params: Record<string, string | number> = { limit: opts.limit }
  appendHistorySearchClause(where, params, opts.query)
  if (opts.cursor) {
    where.push(
      `(COALESCE(wh.last_opened_at, wh.first_opened_at) < @cursor OR (COALESCE(wh.last_opened_at, wh.first_opened_at) = @cursor AND v.id < @cursorId))`
    )
    const [markedAt, id] = opts.cursor.split('|')
    params.cursor = markedAt ?? ''
    params.cursorId = id ?? ''
  }

  const rows = db
    .prepare(
      `
    SELECT v.*, c.title AS channel_title,
      1 AS watched,
      wh.watch_progress AS watch_progress,
      COALESCE(wh.last_opened_at, wh.first_opened_at) AS marked_at
    FROM watch_history wh
    INNER JOIN videos v ON v.id = wh.video_id
    LEFT JOIN channels c ON c.id = v.channel_id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(wh.last_opened_at, wh.first_opened_at) DESC, v.id DESC
    LIMIT @limit
  `
    )
    .all(params) as VideoRow[]

  const items = rows.map(mapHistoryVideo)
  const last = items[items.length - 1]
  const nextCursor =
    items.length === opts.limit && last ? `${last.markedAt}|${last.id}` : null
  return { items, nextCursor }
}

export function listHiddenVideos(opts: {
  cursor: string | null
  limit: number
  query?: string
}): HistoryListPage {
  const db = getDb()
  const where = ['v.hidden = 1']
  const params: Record<string, string | number> = { limit: opts.limit }
  appendHistorySearchClause(where, params, opts.query)
  if (opts.cursor) {
    where.push(
      `(COALESCE(v.hidden_at, v.fetched_at, '') < @cursor OR (COALESCE(v.hidden_at, v.fetched_at, '') = @cursor AND v.id < @cursorId))`
    )
    const [markedAt, id] = opts.cursor.split('|')
    params.cursor = markedAt ?? ''
    params.cursorId = id ?? ''
  }

  const rows = db
    .prepare(
      `
    SELECT v.*, c.title AS channel_title,
      CASE WHEN wh.completed = 1 THEN 1 ELSE 0 END AS watched,
      wh.watch_progress AS watch_progress,
      COALESCE(v.hidden_at, v.fetched_at) AS marked_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN watch_history wh ON wh.video_id = v.id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(v.hidden_at, v.fetched_at) DESC, v.id DESC
    LIMIT @limit
  `
    )
    .all(params) as VideoRow[]

  const items = rows.map(mapHistoryVideo)
  const last = items[items.length - 1]
  const nextCursor =
    items.length === opts.limit && last ? `${last.markedAt}|${last.id}` : null
  return { items, nextCursor }
}
