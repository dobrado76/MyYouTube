import { randomUUID } from 'crypto'
import type {
  Collection,
  CollectionVideosPage,
  VideoCollectionMembership
} from '@shared/schemas/collection'
import type { Video } from '@shared/schemas/video'
import { getDb } from '../index'
import { mapVideo, type VideoRow } from '../mappers'

type CollectionRow = {
  id: string
  name: string
  created_at: string
  updated_at: string
  sort_order: number
  video_count: number
}

function mapCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    videoCount: row.video_count
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function listCollections(): Collection[] {
  const rows = getDb()
    .prepare(
      `
    SELECT c.*,
      (SELECT COUNT(*) FROM collection_videos cv WHERE cv.collection_id = c.id) AS video_count
    FROM collections c
    ORDER BY c.sort_order ASC, c.name COLLATE NOCASE ASC
  `
    )
    .all() as CollectionRow[]
  return rows.map(mapCollection)
}

export function getCollection(id: string): Collection | null {
  const row = getDb()
    .prepare(
      `
    SELECT c.*,
      (SELECT COUNT(*) FROM collection_videos cv WHERE cv.collection_id = c.id) AS video_count
    FROM collections c
    WHERE c.id = ?
  `
    )
    .get(id) as CollectionRow | undefined
  return row ? mapCollection(row) : null
}

export function createCollection(name: string): Collection {
  const cleaned = normalizeName(name)
  if (!cleaned) {
    throw Object.assign(new Error('Collection name is required'), { code: 'validation' })
  }
  const db = getDb()
  const existing = db
    .prepare(`SELECT id FROM collections WHERE name = ? COLLATE NOCASE`)
    .get(cleaned) as { id: string } | undefined
  if (existing) {
    throw Object.assign(new Error('A collection with that name already exists'), {
      code: 'validation'
    })
  }
  const now = new Date().toISOString()
  const id = randomUUID()
  const maxOrder = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM collections`).get() as {
    m: number
  }
  db.prepare(
    `
    INSERT INTO collections (id, name, created_at, updated_at, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(id, cleaned, now, now, maxOrder.m + 1)
  return getCollection(id)!
}

export function renameCollection(id: string, name: string): Collection {
  const cleaned = normalizeName(name)
  if (!cleaned) {
    throw Object.assign(new Error('Collection name is required'), { code: 'validation' })
  }
  const db = getDb()
  const current = getCollection(id)
  if (!current) {
    throw Object.assign(new Error('Collection not found'), { code: 'api.notFound' })
  }
  const clash = db
    .prepare(`SELECT id FROM collections WHERE name = ? COLLATE NOCASE AND id != ?`)
    .get(cleaned, id) as { id: string } | undefined
  if (clash) {
    throw Object.assign(new Error('A collection with that name already exists'), {
      code: 'validation'
    })
  }
  const now = new Date().toISOString()
  db.prepare(`UPDATE collections SET name = ?, updated_at = ? WHERE id = ?`).run(
    cleaned,
    now,
    id
  )
  return getCollection(id)!
}

export function deleteCollection(id: string): { deleted: true } {
  const db = getDb()
  const result = db.prepare(`DELETE FROM collections WHERE id = ?`).run(id)
  if (result.changes === 0) {
    throw Object.assign(new Error('Collection not found'), { code: 'api.notFound' })
  }
  return { deleted: true }
}

export function addVideoToCollection(collectionId: string, videoId: string): Collection {
  const db = getDb()
  const collection = getCollection(collectionId)
  if (!collection) {
    throw Object.assign(new Error('Collection not found'), { code: 'api.notFound' })
  }
  const video = db.prepare(`SELECT id FROM videos WHERE id = ?`).get(videoId) as
    | { id: string }
    | undefined
  if (!video) {
    throw Object.assign(new Error('Video not found'), { code: 'api.notFound' })
  }
  const now = new Date().toISOString()
  db.prepare(
    `
    INSERT INTO collection_videos (collection_id, video_id, added_at, sort_order)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(collection_id, video_id) DO NOTHING
  `
  ).run(collectionId, videoId, now)
  db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(now, collectionId)
  return getCollection(collectionId)!
}

export function removeVideoFromCollection(collectionId: string, videoId: string): Collection {
  const db = getDb()
  const collection = getCollection(collectionId)
  if (!collection) {
    throw Object.assign(new Error('Collection not found'), { code: 'api.notFound' })
  }
  db.prepare(`DELETE FROM collection_videos WHERE collection_id = ? AND video_id = ?`).run(
    collectionId,
    videoId
  )
  db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    collectionId
  )
  return getCollection(collectionId)!
}

export function listVideoMembership(videoId: string): VideoCollectionMembership {
  const rows = getDb()
    .prepare(`SELECT collection_id FROM collection_videos WHERE video_id = ?`)
    .all(videoId) as Array<{ collection_id: string }>
  return {
    videoId,
    collectionIds: rows.map((r) => r.collection_id)
  }
}

export function listCollectionVideos(opts: {
  collectionId: string
  cursor: string | null
  limit: number
}): CollectionVideosPage {
  const db = getDb()
  if (!getCollection(opts.collectionId)) {
    throw Object.assign(new Error('Collection not found'), { code: 'api.notFound' })
  }

  const where = ['cv.collection_id = @collectionId']
  const params: Record<string, string | number> = {
    collectionId: opts.collectionId,
    limit: opts.limit
  }

  if (opts.cursor) {
    where.push(
      `(cv.added_at < @cursor OR (cv.added_at = @cursor AND cv.video_id < @cursorId))`
    )
    const [addedAt, id] = opts.cursor.split('|')
    params.cursor = addedAt ?? ''
    params.cursorId = id ?? ''
  }

  const rows = db
    .prepare(
      `
    SELECT v.*, c.title AS channel_title,
      CASE WHEN wh.completed = 1 THEN 1 ELSE 0 END AS watched,
      wh.watch_progress AS watch_progress,
      cv.added_at AS marked_at
    FROM collection_videos cv
    JOIN videos v ON v.id = cv.video_id
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN watch_history wh ON wh.video_id = v.id
    WHERE ${where.join(' AND ')}
    ORDER BY cv.added_at DESC, cv.video_id DESC
    LIMIT @limit
  `
    )
    .all(params) as Array<VideoRow & { marked_at?: string }>

  const items: Video[] = rows.map(mapVideo)
  const last = rows[rows.length - 1]
  const nextCursor =
    rows.length === opts.limit && last?.marked_at
      ? `${last.marked_at}|${last.id}`
      : null

  return { items, nextCursor }
}
