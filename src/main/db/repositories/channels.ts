import type { Channel, ChannelPreference } from '@shared/schemas/channel'
import { getDb } from '../index'
import { mapChannel, type ChannelRow } from '../mappers'

export function listChannels(opts?: { subscribedOnly?: boolean }): Channel[] {
  const db = getDb()
  const sql = opts?.subscribedOnly
    ? `SELECT * FROM channels WHERE subscribed = 1 ORDER BY title COLLATE NOCASE`
    : `SELECT * FROM channels ORDER BY title COLLATE NOCASE`
  return (db.prepare(sql).all() as ChannelRow[]).map(mapChannel)
}

export function getChannel(id: string): Channel | null {
  const row = getDb().prepare('SELECT * FROM channels WHERE id = ?').get(id) as ChannelRow | undefined
  return row ? mapChannel(row) : null
}

export function upsertChannel(channel: {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  uploadsPlaylistId?: string | null
  subscribed?: boolean
  fetchedAt?: string | null
}): void {
  const db = getDb()
  db.prepare(
    `
    INSERT INTO channels (
      id, title, description, thumbnail_url, uploads_playlist_id, subscribed, fetched_at
    ) VALUES (
      @id, @title, @description, @thumbnailUrl, @uploadsPlaylistId, @subscribed, @fetchedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = COALESCE(excluded.description, channels.description),
      thumbnail_url = COALESCE(excluded.thumbnail_url, channels.thumbnail_url),
      uploads_playlist_id = COALESCE(excluded.uploads_playlist_id, channels.uploads_playlist_id),
      subscribed = CASE
        WHEN channels.local_unsubscribed = 1 THEN 0
        ELSE excluded.subscribed
      END,
      fetched_at = COALESCE(excluded.fetched_at, channels.fetched_at)
  `
  ).run({
    id: channel.id,
    title: channel.title,
    description: channel.description ?? null,
    thumbnailUrl: channel.thumbnailUrl ?? null,
    uploadsPlaylistId: channel.uploadsPlaylistId ?? null,
    subscribed: channel.subscribed === false ? 0 : 1,
    fetchedAt: channel.fetchedAt ?? new Date().toISOString()
  })
}

/** Hide from MyYouTube feed; does not call YouTube unsubscribe (readonly scope). */
export function unsubscribeChannel(channelId: string): Channel | null {
  getDb()
    .prepare(
      `
    UPDATE channels
    SET subscribed = 0, local_unsubscribed = 1
    WHERE id = ?
  `
    )
    .run(channelId)
  return getChannel(channelId)
}

export function clearLocalUnsubscribed(channelId: string): void {
  getDb().prepare('UPDATE channels SET local_unsubscribed = 0 WHERE id = ?').run(channelId)
}

export function isChannelSubscribed(channelId: string): boolean {
  const row = getDb()
    .prepare('SELECT subscribed FROM channels WHERE id = ?')
    .get(channelId) as { subscribed: number } | undefined
  return row?.subscribed === 1
}

export function setChannelPreference(channelId: string, preference: ChannelPreference): Channel | null {
  const db = getDb()
  const flags = {
    favourite: preference === 'favourite' ? 1 : 0,
    muted: preference === 'muted' ? 1 : 0,
    blocked: preference === 'blocked' ? 1 : 0,
    hidden: preference === 'blocked' ? 1 : 0
  }
  db.prepare(
    `
    UPDATE channels
    SET favourite = @favourite, muted = @muted, blocked = @blocked, hidden = @hidden
    WHERE id = @channelId
  `
  ).run({ channelId, ...flags })
  return getChannel(channelId)
}

export function markAllUnsubscribed(): void {
  getDb().prepare('UPDATE channels SET subscribed = 0').run()
}
