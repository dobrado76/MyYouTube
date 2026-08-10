import type {
  ProviderChannel,
  ProviderVideo,
  SearchQuery,
  VideoPage,
  YouTubeProvider
} from './types'

/**
 * Live YouTube Data API v3 provider.
 * Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and a completed OAuth flow.
 * Until OAuth tokens exist, methods throw `auth.expired`.
 */
export class YouTubeApiProvider implements YouTubeProvider {
  readonly name = 'live' as const

  constructor(private readonly getAccessToken: () => Promise<string | null>) {}

  private async token(): Promise<string> {
    const accessToken = await this.getAccessToken()
    if (!accessToken) {
      throw Object.assign(new Error('Not signed in to Google'), { code: 'auth.expired' })
    }
    return accessToken
  }

  private async youtubeFetch<T>(path: string, params: Record<string, string>): Promise<T> {
    const accessToken = await this.token()
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (response.ok) {
      return (await response.json()) as T
    }

    const bodyText = await response.text()
    throw mapYouTubeHttpError(response.status, bodyText, path)
  }

  async getSubscriptions(): Promise<ProviderChannel[]> {
    const channels: ProviderChannel[] = []
    let pageToken: string | undefined

    do {
      const params: Record<string, string> = {
        part: 'snippet',
        mine: 'true',
        maxResults: '50'
      }
      if (pageToken) params.pageToken = pageToken

      const data = await this.youtubeFetch<{
        items?: Array<{
          snippet?: {
            resourceId?: { channelId?: string }
            title?: string
            description?: string
            thumbnails?: { default?: { url?: string } }
          }
        }>
        nextPageToken?: string
      }>('subscriptions', params)

      for (const item of data.items ?? []) {
        const id = item.snippet?.resourceId?.channelId
        if (!id) continue
        channels.push({
          id,
          title: item.snippet?.title ?? id,
          description: item.snippet?.description ?? null,
          thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? null
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    return channels
  }

  async getChannel(channelId: string): Promise<ProviderChannel> {
    const data = await this.youtubeFetch<{
      items?: Array<{
        id?: string
        snippet?: {
          title?: string
          description?: string
          thumbnails?: { default?: { url?: string } }
        }
        contentDetails?: { relatedPlaylists?: { uploads?: string } }
      }>
    }>('channels', {
      part: 'snippet,contentDetails',
      id: channelId
    })

    const item = data.items?.[0]
    if (!item?.id) {
      throw Object.assign(new Error(`Channel not found: ${channelId}`), { code: 'api.notFound' })
    }

    return {
      id: item.id,
      title: item.snippet?.title ?? item.id,
      description: item.snippet?.description ?? null,
      thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? null,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null
    }
  }

  async getChannelUploads(
    channelId: string,
    opts?: { pageToken?: string; uploadsPlaylistId?: string | null }
  ): Promise<VideoPage> {
    let playlistId = opts?.uploadsPlaylistId
    if (!playlistId) {
      const channel = await this.getChannel(channelId)
      playlistId = channel.uploadsPlaylistId
    }
    if (!playlistId) {
      return { items: [], nextPageToken: null }
    }

    const params: Record<string, string> = {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '25'
    }
    if (opts?.pageToken) params.pageToken = opts.pageToken

    const data = await this.youtubeFetch<{
      items?: Array<{
        contentDetails?: { videoId?: string }
        snippet?: {
          title?: string
          description?: string
          publishedAt?: string
          channelId?: string
          channelTitle?: string
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
        }
      }>
      nextPageToken?: string
    }>('playlistItems', params)

    const ids = (data.items ?? [])
      .map((item) => item.contentDetails?.videoId)
      .filter((id): id is string => Boolean(id))

    const details = await this.getVideos(ids)
    return { items: details, nextPageToken: data.nextPageToken ?? null }
  }

  async getVideos(ids: string[]): Promise<ProviderVideo[]> {
    if (ids.length === 0) return []
    const data = await this.youtubeFetch<{
      items?: Array<{
        id?: string
        snippet?: {
          title?: string
          description?: string
          publishedAt?: string
          channelId?: string
          channelTitle?: string
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } }
        }
        contentDetails?: { duration?: string }
        statistics?: { viewCount?: string; likeCount?: string }
      }>
    }>('videos', {
      part: 'snippet,contentDetails,statistics',
      id: ids.slice(0, 50).join(',')
    })

    return (data.items ?? []).map((item) => {
      const durationSeconds = parseIsoDuration(item.contentDetails?.duration)
      const isShort = durationSeconds != null && durationSeconds <= 60
      return {
        id: item.id ?? '',
        channelId: item.snippet?.channelId ?? '',
        channelTitle: item.snippet?.channelTitle,
        title: item.snippet?.title ?? item.id ?? '',
        description: item.snippet?.description ?? null,
        publishedAt: item.snippet?.publishedAt ?? null,
        durationSeconds,
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
        viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
        likeCount: item.statistics?.likeCount ? Number(item.statistics.likeCount) : null,
        isShort
      }
    })
  }

  async search(query: SearchQuery): Promise<VideoPage> {
    const params: Record<string, string> = {
      part: 'snippet',
      type: 'video',
      q: query.query,
      maxResults: String(query.limit ?? 20)
    }
    if (query.pageToken) params.pageToken = query.pageToken

    const data = await this.youtubeFetch<{
      items?: Array<{ id?: { videoId?: string } }>
      nextPageToken?: string
    }>('search', params)

    const ids = (data.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id))
    const items = await this.getVideos(ids)
    return { items, nextPageToken: data.nextPageToken ?? null }
  }
}

function parseIsoDuration(iso?: string): number | null {
  if (!iso) return null
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return null
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return hours * 3600 + minutes * 60 + seconds
}

type GoogleApiErrorBody = {
  error?: {
    code?: number
    message?: string
    status?: string
    errors?: Array<{ reason?: string; message?: string; domain?: string }>
  }
}

function mapYouTubeHttpError(status: number, bodyText: string, path: string): Error {
  let reason = ''
  let apiMessage = ''
  try {
    const parsed = JSON.parse(bodyText) as GoogleApiErrorBody
    reason = parsed.error?.errors?.[0]?.reason ?? ''
    apiMessage = parsed.error?.message ?? parsed.error?.errors?.[0]?.message ?? ''
  } catch {
    apiMessage = bodyText.slice(0, 240)
  }

  if (status === 401) {
    return Object.assign(new Error('YouTube auth expired — sign in again.'), {
      code: 'auth.expired'
    })
  }

  if (status === 403) {
    if (reason === 'accessNotConfigured' || /has not been used|is disabled|Access Not Configured/i.test(apiMessage)) {
      return Object.assign(
        new Error(
          'YouTube Data API v3 is not enabled for this Google Cloud project. Enable it under APIs & Services → Library → YouTube Data API v3, wait a minute, then Refresh again.'
        ),
        { code: 'api.notConfigured' }
      )
    }
    if (reason === 'quotaExceeded' || /quota/i.test(apiMessage) || /quota/i.test(reason)) {
      const searchBucket = /Search Queries/i.test(apiMessage)
      return Object.assign(
        new Error(
          searchBucket
            ? 'YouTube search quota exceeded for today (default ~100 search.list calls/day per Google Cloud project). Cached searches still work; quota resets at midnight Pacific Time.'
            : 'YouTube API quota exceeded for today. Try again tomorrow (resets midnight Pacific Time).'
        ),
        { code: 'api.quota' }
      )
    }
    if (reason === 'subscriptionForbidden') {
      return Object.assign(
        new Error(
          'Google denied subscription access. Sign out, sign in again, and pick the YouTube channel that owns those subscriptions (brand accounts can differ from the Gmail login).'
        ),
        { code: 'api.forbidden' }
      )
    }
    if (reason === 'insufficientPermissions' || reason === 'forbidden') {
      return Object.assign(
        new Error(
          'Missing YouTube permission. Sign out and sign in again to grant youtube.readonly access.'
        ),
        { code: 'api.forbidden' }
      )
    }

    const detail = apiMessage || reason || 'forbidden'
    return Object.assign(new Error(`YouTube API forbidden (${path}): ${detail}`), {
      code: 'api.forbidden'
    })
  }

  if (status === 404) {
    return Object.assign(new Error(apiMessage || `YouTube resource not found (${path})`), {
      code: 'api.notFound'
    })
  }

  return Object.assign(
    new Error(apiMessage || `YouTube API error (${status}) on ${path}`),
    { code: 'api.network' }
  )
}
