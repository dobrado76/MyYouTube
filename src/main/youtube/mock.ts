import { mockChannels, mockVideos } from './fixtures'
import type {
  ProviderChannel,
  ProviderVideo,
  SearchQuery,
  VideoPage,
  YouTubeProvider
} from './types'

function delay(ms = 40): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockYouTubeProvider implements YouTubeProvider {
  readonly name = 'mock' as const

  async getSubscriptions(): Promise<ProviderChannel[]> {
    await delay()
    return mockChannels.map((c) => ({ ...c }))
  }

  async getChannel(channelId: string): Promise<ProviderChannel> {
    await delay()
    const channel = mockChannels.find((c) => c.id === channelId)
    if (!channel) {
      throw Object.assign(new Error(`Channel not found: ${channelId}`), { code: 'api.notFound' })
    }
    return { ...channel }
  }

  async getChannelUploads(
    channelId: string,
    opts?: { pageToken?: string }
  ): Promise<VideoPage> {
    await delay()
    const items = mockVideos
      .filter((v) => v.channelId === channelId)
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    const start = opts?.pageToken ? Number.parseInt(opts.pageToken, 10) : 0
    const pageSize = 5
    const slice = items.slice(start, start + pageSize)
    const next = start + pageSize < items.length ? String(start + pageSize) : null
    return { items: slice.map((v) => ({ ...v })), nextPageToken: next }
  }

  async getVideos(ids: string[]): Promise<ProviderVideo[]> {
    await delay()
    const set = new Set(ids)
    return mockVideos.filter((v) => set.has(v.id)).map((v) => ({ ...v }))
  }

  async search(query: SearchQuery): Promise<VideoPage> {
    await delay()
    const q = query.query.trim().toLowerCase()
    const matched = mockVideos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (v.description ?? '').toLowerCase().includes(q) ||
        (v.channelTitle ?? '').toLowerCase().includes(q)
    )
    const start = query.pageToken ? Number.parseInt(query.pageToken, 10) : 0
    const limit = query.limit ?? 50
    const slice = matched.slice(start, start + limit)
    const next = start + limit < matched.length ? String(start + limit) : null
    return { items: slice.map((v) => ({ ...v })), nextPageToken: next }
  }
}
