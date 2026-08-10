import type { SearchPage, SearchQueryInput } from '@shared/schemas/search'
import type { Video } from '@shared/schemas/video'
import * as videoRepo from '../db/repositories/videos'
import * as channelRepo from '../db/repositories/channels'
import * as searchCache from '../db/repositories/searchCache'
import { getYouTubeProvider } from '../youtube/provider'

export async function searchVideos(input: SearchQueryInput): Promise<SearchPage> {
  const limit = input.limit
  const pageToken = input.pageToken ?? null
  const cached = searchCache.getCachedSearch(input.query, pageToken, limit)
  if (cached) {
    const items = hydrateVideos(cached.videoIds)
    if (items.length > 0 || cached.videoIds.length === 0) {
      return {
        items,
        nextPageToken: cached.nextPageToken,
        query: input.query
      }
    }
  }

  const provider = getYouTubeProvider()
  const page = await provider.search({
    query: input.query,
    pageToken,
    limit
  })

  for (const video of page.items) {
    if (!channelRepo.getChannel(video.channelId)) {
      channelRepo.upsertChannel({
        id: video.channelId,
        title: video.channelTitle ?? video.channelId,
        subscribed: false,
        fetchedAt: new Date().toISOString()
      })
    }
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
      isShort: video.isShort,
      fetchedAt: new Date().toISOString()
    })
  }

  const videoIds = page.items.map((v) => v.id)
  searchCache.putCachedSearch(input.query, pageToken, limit, videoIds, page.nextPageToken)

  return {
    items: hydrateVideos(videoIds),
    nextPageToken: page.nextPageToken,
    query: input.query
  }
}

function hydrateVideos(videoIds: string[]): Video[] {
  return videoIds
    .map((id) => videoRepo.getVideo(id))
    .filter((v): v is Video => v != null && !v.hidden)
}
