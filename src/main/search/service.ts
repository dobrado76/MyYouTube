import { SEARCH_PAGE_SIZE } from '@shared/constants/search'
import type { SearchPage, SearchQueryInput } from '@shared/schemas/search'
import type { Video } from '@shared/schemas/video'
import * as videoRepo from '../db/repositories/videos'
import * as channelRepo from '../db/repositories/channels'
import * as searchCache from '../db/repositories/searchCache'
import { getSettings } from '../db/repositories/settings'
import { videoMatchesBlockedKeyword } from '../db/keywordFilter'
import { getYouTubeProvider } from '../youtube/provider'

/** Prefer a useful grid; stop early once we have this many keepers. */
const TARGET_VISIBLE = 24
/**
 * Each live `search.list` costs 100 quota units (~100 calls/day on the free cap).
 * One user click = at most one live call; further fill only walks local cache (free).
 */
const MAX_LIVE_PAGES_PER_ACTION = 1
/** Safety cap while draining already-cached pages after the live call. */
const MAX_CACHED_FILL_PAGES = 10

export async function searchVideos(input: SearchQueryInput): Promise<SearchPage> {
  const limit = input.limit ?? SEARCH_PAGE_SIZE
  const target = Math.min(limit, TARGET_VISIBLE)
  let pageToken = input.pageToken ?? null
  const collected: Video[] = []
  let nextPageToken: string | null = null
  let liveCalls = 0
  let cachedFills = 0

  while (true) {
    const cached = searchCache.getCachedSearch(input.query, pageToken, limit)
    const wouldBeLive = cached == null
    if (wouldBeLive && liveCalls >= MAX_LIVE_PAGES_PER_ACTION) break
    if (!wouldBeLive && liveCalls > 0 && cachedFills >= MAX_CACHED_FILL_PAGES) break

    const page = await searchOnePage(input.query, pageToken, limit, cached)
    if (wouldBeLive) liveCalls += 1
    else if (liveCalls > 0) cachedFills += 1

    collected.push(...page.items)
    nextPageToken = page.nextPageToken
    if (collected.length >= target || !nextPageToken) break

    // After the live page, only continue if the next page is already cached (quota-free).
    if (liveCalls >= MAX_LIVE_PAGES_PER_ACTION) {
      if (!searchCache.getCachedSearch(input.query, nextPageToken, limit)) break
    }
    pageToken = nextPageToken
  }

  return {
    items: collected,
    nextPageToken,
    query: input.query
  }
}

async function searchOnePage(
  query: string,
  pageToken: string | null,
  limit: number,
  cached: ReturnType<typeof searchCache.getCachedSearch>
): Promise<SearchPage> {
  if (cached) {
    return {
      items: hydrateVideos(cached.videoIds),
      nextPageToken: cached.nextPageToken,
      query
    }
  }

  const provider = getYouTubeProvider()
  const page = await provider.search({
    query,
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
  searchCache.putCachedSearch(query, pageToken, limit, videoIds, page.nextPageToken)

  return {
    items: hydrateVideos(videoIds),
    nextPageToken: page.nextPageToken,
    query
  }
}

function hydrateVideos(videoIds: string[]): Video[] {
  const settings = getSettings()
  const keywords = settings.blockedKeywords
  const threshold = settings.watchedThreshold
  return videoIds
    .map((id) => videoRepo.getVideo(id))
    .filter((v): v is Video => {
      if (v == null || v.hidden) return false
      const channel = channelRepo.getChannel(v.channelId)
      if (channel?.blocked) return false
      if (videoMatchesBlockedKeyword(v, keywords)) return false
      if (settings.unwatchedOnly) {
        if (v.watched) return false
        if (v.watchProgress != null && v.watchProgress >= threshold) return false
      }
      return true
    })
}
