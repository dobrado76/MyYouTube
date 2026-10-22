import { DEFAULT_SETTINGS, type AppSettings } from '@shared/schemas/settings'
import type { FeedPage, FeedQueryInput } from '@shared/schemas/feed'
import { FeedFiltersSchema } from '@shared/schemas/feed'
import * as channelRepo from '../db/repositories/channels'
import * as videoRepo from '../db/repositories/videos'
import { getSettings } from '../db/repositories/settings'
import { getYouTubeProvider } from '../youtube/provider'
import type { ProviderChannel, YouTubeProvider } from '../youtube/types'

/** Newest uploads per channel on full Subscriptions sync (playlist page size is 50). */
const BULK_SYNC_UPLOAD_PAGES = 2
/** Deeper pull when refreshing a single channel tab. */
const CHANNEL_REFRESH_UPLOAD_PAGES = 5
const SUBSCRIBE_UPLOAD_PAGES = 3

export async function queryFeed(input: FeedQueryInput): Promise<FeedPage> {
  const settings = getSettings()
  const filters = FeedFiltersSchema.parse({
    hideShorts: input.filters?.hideShorts ?? settings.hideShorts,
    unwatchedOnly: input.filters?.unwatchedOnly ?? settings.unwatchedOnly,
    minDurationSeconds: input.filters?.minDurationSeconds ?? null,
    channelId: input.filters?.channelId ?? null
  })

  // Discovery ≠ Sorted: never return now-playing / up-next on Home or Channel.
  const excludeVideoIds = [
    ...new Set([
      ...(settings.nowPlaying ? [settings.nowPlaying.id] : []),
      ...settings.playQueue.map((item) => item.id),
      ...(input.excludeVideoIds ?? [])
    ])
  ]

  const queryOpts = {
    filters,
    cursor: input.cursor ?? null,
    limit: input.limit,
    blockedKeywords: settings.blockedKeywords,
    excludeVideoIds,
    watchedThreshold: settings.watchedThreshold
  }

  const { items, nextCursor } = videoRepo.queryFeedVideos(queryOpts)
  const matchingTotal = videoRepo.countFeedVideos({
    filters,
    blockedKeywords: settings.blockedKeywords,
    excludeVideoIds,
    watchedThreshold: settings.watchedThreshold
  })
  const libraryTotal = videoRepo.countSubscribedLibraryVideos()

  return {
    items,
    nextCursor,
    source: 'subscriptions',
    mode: input.mode,
    matchingTotal,
    libraryTotal
  }
}

export async function refreshSubscriptionsAndUploads(
  onProgress?: (progress: {
    phase: 'fetching' | 'subscriptions' | 'uploads' | 'done'
    current: number
    total: number
    channelTitle?: string
    channelsRegistered?: number
    detail?: string
  }) => void
): Promise<{
  channels: number
  videos: number
  failedChannels: number
  failures: string[]
}> {
  const provider = getYouTubeProvider()

  onProgress?.({
    phase: 'fetching',
    current: 0,
    total: 0,
    detail: 'Asking YouTube for your subscription list…'
  })

  // Fetch the full YouTube list BEFORE touching local subscribed flags.
  const subscriptions = await provider.getSubscriptions({
    onPage: ({ loaded, page, status }) => {
      onProgress?.({
        phase: 'fetching',
        current: loaded,
        total: Math.max(loaded, page * 50),
        detail:
          status === 'requesting'
            ? `Requesting YouTube subscription page ${page}… (${loaded} so far)`
            : `Got page ${page} — ${loaded} channels so far`
      })
    }
  })
  const youtubeIds = new Set(subscriptions.map((sub) => sub.id))

  // Locally added feed channels must survive a Google sync.
  const localOnlyIds = channelRepo
    .listChannels({ subscribedOnly: true })
    .filter((channel) => !youtubeIds.has(channel.id))
    .map((channel) => channel.id)

  // Phase 1 — restore the full subscription roster quickly (no uploads yet).
  onProgress?.({
    phase: 'subscriptions',
    current: 0,
    total: subscriptions.length,
    detail: `Saving ${subscriptions.length} channels locally…`
  })
  for (const sub of subscriptions) {
    const local = channelRepo.getChannel(sub.id)
    channelRepo.upsertChannel({
      id: sub.id,
      title: sub.title,
      description: sub.description ?? local?.description,
      thumbnailUrl: sub.thumbnailUrl ?? local?.thumbnailUrl,
      uploadsPlaylistId: local?.uploadsPlaylistId,
      subscribed: true,
      fetchedAt: new Date().toISOString()
    })
  }
  channelRepo.reconcileYoutubeSubscriptions(youtubeIds, localOnlyIds)
  onProgress?.({
    phase: 'subscriptions',
    current: subscriptions.length,
    total: subscriptions.length,
    channelsRegistered: subscriptions.length,
    detail: `Restored ${subscriptions.length} channels — fetching newest uploads next…`
  })

  // Phase 2 — newest uploads per channel (continue on errors; don't drop the roster).
  let videos = 0
  let failedChannels = 0
  const failures: string[] = []
  let index = 0

  for (const sub of subscriptions) {
    index += 1
    onProgress?.({
      phase: 'uploads',
      current: index,
      total: subscriptions.length,
      channelTitle: sub.title,
      channelsRegistered: subscriptions.length,
      detail: `Uploads ${index}/${subscriptions.length}: ${sub.title}`
    })

    try {
      let channel: ProviderChannel = sub
      const local = channelRepo.getChannel(sub.id)
      if (local?.uploadsPlaylistId) {
        channel = {
          ...sub,
          uploadsPlaylistId: local.uploadsPlaylistId,
          description: local.description ?? sub.description,
          thumbnailUrl: local.thumbnailUrl ?? sub.thumbnailUrl
        }
      } else {
        try {
          channel = await provider.getChannel(sub.id)
        } catch {
          // Keep subscription snippet if details fail; uploads sync may still work later.
        }
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

      // Newest pages per channel on bulk sync. Channel tab Refresh goes deeper.
      videos += await syncChannelUploads(channel, provider, { maxPages: BULK_SYNC_UPLOAD_PAGES })
    } catch (err) {
      failedChannels += 1
      const message = err instanceof Error ? err.message : String(err)
      failures.push(`${sub.title}: ${message}`)
      try {
        channelRepo.upsertChannel({
          id: sub.id,
          title: sub.title,
          description: sub.description,
          thumbnailUrl: sub.thumbnailUrl,
          subscribed: true,
          fetchedAt: new Date().toISOString()
        })
      } catch {
        // ignore
      }
    }
  }

  onProgress?.({
    phase: 'done',
    current: subscriptions.length,
    total: subscriptions.length,
    channelsRegistered: subscriptions.length,
    detail: `Done — ${subscriptions.length} channels, ${videos} videos`
  })

  return {
    channels: subscriptions.length,
    videos,
    failedChannels,
    failures: failures.slice(0, 8)
  }
}

/** Pull latest uploads for one channel from YouTube into the local library. */
export async function refreshChannelUploads(channelId: string): Promise<{ videos: number }> {
  const provider = getYouTubeProvider()
  const local = channelRepo.getChannel(channelId)

  let remote: ProviderChannel
  try {
    remote = await provider.getChannel(channelId)
  } catch (error) {
    if (!local) throw error
    remote = {
      id: local.id,
      title: local.title,
      description: local.description,
      thumbnailUrl: local.thumbnailUrl,
      uploadsPlaylistId: local.uploadsPlaylistId
    }
  }

  channelRepo.upsertChannel({
    id: remote.id,
    title: remote.title,
    description: remote.description,
    thumbnailUrl: remote.thumbnailUrl,
    uploadsPlaylistId: remote.uploadsPlaylistId,
    subscribed: local?.subscribed ?? false,
    fetchedAt: new Date().toISOString()
  })

  const videos = await syncChannelUploads(remote, provider, {
    maxPages: CHANNEL_REFRESH_UPLOAD_PAGES
  })
  return { videos }
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
    await syncChannelUploads(remote, provider, { maxPages: SUBSCRIBE_UPLOAD_PAGES })
  } catch {
    // Channel row is enough; uploads can arrive on the next full sync.
  }

  return channelRepo.getChannel(remote.id)
}

function inferShort(durationSeconds: number | null | undefined): boolean | null {
  if (durationSeconds == null) return null
  return durationSeconds <= 60
}

async function syncChannelUploads(
  channel: ProviderChannel,
  provider: YouTubeProvider,
  opts?: { maxPages?: number }
): Promise<number> {
  let videos = 0
  let pageToken: string | undefined
  let pages = 0
  const maxPages = opts?.maxPages ?? 3

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
  } while (pageToken && pages < maxPages)

  return videos
}
