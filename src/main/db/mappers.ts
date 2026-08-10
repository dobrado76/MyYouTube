import type { Channel } from '@shared/schemas/channel'
import type { Video } from '@shared/schemas/video'
import type { WatchHistoryEntry } from '@shared/schemas/history'

export type ChannelRow = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  uploads_playlist_id: string | null
  subscribed: number
  hidden: number
  muted: number
  favourite: number
  blocked: number
  user_rating: number | null
  fetched_at: string | null
}

export type VideoRow = {
  id: string
  channel_id: string
  title: string
  description: string | null
  published_at: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  view_count: number | null
  like_count: number | null
  is_short: number | null
  hidden: number
  recommendation_score: number | null
  fetched_at: string | null
  channel_title?: string | null
  watched?: number | null
  watch_progress?: number | null
}

export type WatchHistoryRow = {
  video_id: string
  first_opened_at: string | null
  last_opened_at: string | null
  watch_progress: number | null
  completed: number
  rating: number | null
}

export function mapChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    uploadsPlaylistId: row.uploads_playlist_id,
    subscribed: row.subscribed === 1,
    hidden: row.hidden === 1,
    muted: row.muted === 1,
    favourite: row.favourite === 1,
    blocked: row.blocked === 1,
    userRating: row.user_rating,
    fetchedAt: row.fetched_at
  }
}

export function mapVideo(row: VideoRow): Video {
  return {
    id: row.id,
    channelId: row.channel_id,
    channelTitle: row.channel_title ?? undefined,
    title: row.title,
    description: row.description,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
    thumbnailUrl: row.thumbnail_url,
    viewCount: row.view_count,
    likeCount: row.like_count,
    isShort: row.is_short === null ? null : row.is_short === 1,
    hidden: row.hidden === 1,
    recommendationScore: row.recommendation_score,
    fetchedAt: row.fetched_at,
    watched: row.watched === 1,
    watchProgress: row.watch_progress ?? null
  }
}

export function mapHistory(row: WatchHistoryRow): WatchHistoryEntry {
  return {
    videoId: row.video_id,
    firstOpenedAt: row.first_opened_at,
    lastOpenedAt: row.last_opened_at,
    watchProgress: row.watch_progress,
    completed: row.completed === 1,
    rating: row.rating
  }
}
