import { DEFAULT_SETTINGS, type AppSettings } from '@shared/schemas/settings'
import type { FeedPage, FeedQueryInput } from '@shared/schemas/feed'
import { FeedFiltersSchema } from '@shared/schemas/feed'
import * as channelRepo from '../db/repositories/channels'
import * as videoRepo from '../db/repositories/videos'
import { getSettings } from '../db/repositories/settings'
import { getYouTubeProvider } from '../youtube/provider'

export async function queryFeed(input: FeedQueryInput): Promise<FeedPage> {
  const settings = getSettings()
  const filters = FeedFiltersSchema.parse({
    hideShorts: input.filters?.hideShorts ?? settings.hideShorts,
    unwatchedOnly: input.filters?.unwatchedOnly ?? false,
    minDurationSeconds: input.filters?.minDurationSeconds ?? null,
    channelId: input.filters?.channelId ?? null
  })

  const { items, nextCursor } = videoRepo.queryFeedVideos({
    filters,
    cursor: input.cursor ?? null,
    limit: input.limit
  })

  return {
    items,
    nextCursor,
    source: 'subscriptions',
    mode: input.mode
  }
}

export async function refreshSubscriptionsAndUploads(): Promise<{
  channels: number
  videos: number
}> {
  const provider = getYouTubeProvider()
  const subscriptions = await provider.getSubscriptions()

  channelRepo.markAllUnsubscribed()

  let videos = 0
  for (const sub of subscriptions) {
    let channel = sub
    try {
      channel = await provider.getChannel(sub.id)
    } catch {
      // Keep subscription snippet if channel details fail.
    }

    channelRepo.upsertChannel({
      id: channel.id,
      title: channel.title,
      description: channel.description,
      thumbnailUrl: channel.thumbnailUrl,
      uploadsPlaylistId: channel.uploadsPlaylistId,
      subscribed: true,
      fetchedAt: new Date().toISOString()
    })

    let pageToken: string | undefined
    let pages = 0
    do {
      const page = await provider.getChannelUploads(channel.id, {
        pageToken,
        uploadsPlaylistId: channel.uploadsPlaylistId
      })
      for (const video of page.items) {
        videoRepo.upsertVideo({
          id: video.id,
          channelId: video.channelId,
          title: video.title,
          description: video.description,
          publishedAt: video.publishedAt,
          durationSeconds: video.durationSeconds,
          thumbnailUrl: video.thumbnailUrl,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          isShort: video.isShort ?? inferShort(video.durationSeconds),
          fetchedAt: new Date().toISOString()
        })
        videos += 1
      }
      pageToken = page.nextPageToken ?? undefined
      pages += 1
    } while (pageToken && pages < 3)
  }

  return { channels: subscriptions.length, videos }
}

export function resolveFeedDefaults(settings?: AppSettings): {
  hideShorts: boolean
  feedMode: AppSettings['feedMode']
} {
  const s = settings ?? getSettings()
  return {
    hideShorts: s.hideShorts ?? DEFAULT_SETTINGS.hideShorts,
    feedMode: s.feedMode
  }
}

/**
 * Add a channel to the local MyYouTube subscription set (YouTube OAuth is readonly —
 * this does not create a Google subscription).
 */
export async function subscribeChannel(channelId: string): Promise<
  Awaited<ReturnType<typeof channelRepo.getChannel>>
> {
  const provider = getYouTubeProvider()
  const remote = await provider.getChannel(channelId)
  channelRepo.clearLocalUnsubscribed(remote.id)
  channelRepo.upsertChannel({
    id: remote.id,
    title: remote.title,
    description: remote.description,
    thumbnailUrl: remote.thumbnailUrl,
    uploadsPlaylistId: remote.uploadsPlaylistId,
    subscribed: true,
    fetchedAt: new Date().toISOString()
  })

  try {
    const page = await provider.getChannelUploads(remote.id, {
      uploadsPlaylistId: remote.uploadsPlaylistId
    })
    for (const video of page.items) {
      videoRepo.upsertVideo({
        id: video.id,
        channelId: video.channelId,
        title: video.title,
        description: video.description,
        publishedAt: video.publishedAt,
        durationSeconds: video.durationSeconds,
        thumbnailUrl: video.thumbnailUrl,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        isShort: video.isShort ?? inferShort(video.durationSeconds),
        fetchedAt: new Date().toISOString()
      })
    }
  } catch {
    // Channel row is enough; uploads can arrive on the next full sync.
  }

  return channelRepo.getChannel(remote.id)
}

function inferShort(durationSeconds: number | null | undefined): boolean | null {
  if (durationSeconds == null) return null
  return durationSeconds <= 60
}
