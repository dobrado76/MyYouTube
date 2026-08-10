export type ProviderChannel = {
  id: string
  title: string
  description?: string | null
  thumbnailUrl?: string | null
  uploadsPlaylistId?: string | null
}

export type ProviderVideo = {
  id: string
  channelId: string
  channelTitle?: string
  title: string
  description?: string | null
  publishedAt?: string | null
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  viewCount?: number | null
  likeCount?: number | null
  isShort?: boolean | null
}

export type VideoPage = {
  items: ProviderVideo[]
  nextPageToken: string | null
}

export type SearchQuery = {
  query: string
  pageToken?: string | null
  limit?: number
}

export interface YouTubeProvider {
  readonly name: 'mock' | 'live'
  getSubscriptions(): Promise<ProviderChannel[]>
  getChannel(channelId: string): Promise<ProviderChannel>
  getChannelUploads(
    channelId: string,
    opts?: { pageToken?: string; uploadsPlaylistId?: string | null }
  ): Promise<VideoPage>
  getVideos(ids: string[]): Promise<ProviderVideo[]>
  search(query: SearchQuery): Promise<VideoPage>
}
