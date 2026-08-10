import type { Result } from '../result'
import type { AuthStatus } from '../schemas/auth'
import type { CredentialsStatus, SaveCredentialsInput } from '../schemas/credentials'
import type { Channel, ChannelPreference } from '../schemas/channel'
import type { FeedPage, FeedQueryInput } from '../schemas/feed'
import type { WatchHistoryEntry } from '../schemas/history'
import type { SearchPage, SearchQueryInput } from '../schemas/search'
import type { AppSettings, AppSettingsPatch } from '../schemas/settings'
import type { UpdateCheckResult } from '../schemas/updates'
import type { Video, VideoDetail } from '../schemas/video'

export type HardwareAccelerationStatus = {
  enabled: boolean
  active: boolean
  restartRequired: boolean
}

export type MyYouTubeApi = {
  auth: {
    getStatus: () => Promise<Result<AuthStatus>>
    signIn: () => Promise<Result<AuthStatus>>
    signOut: () => Promise<Result<AuthStatus>>
    credentialsStatus: () => Promise<Result<CredentialsStatus>>
    saveCredentials: (input: SaveCredentialsInput) => Promise<Result<CredentialsStatus>>
    clearCredentials: () => Promise<Result<CredentialsStatus>>
    oauthSetupInfo: () =>
      Promise<Result<{ redirectUri: string; recommendedClientType: 'Desktop app' }>>
  }
  settings: {
    get: () => Promise<Result<AppSettings>>
    patch: (patch: AppSettingsPatch) => Promise<Result<AppSettings>>
  }
  app: {
    hardwareAccelerationStatus: () => Promise<Result<HardwareAccelerationStatus>>
    relaunch: () => Promise<Result<{ relaunching: true }>>
    onFlushBeforeQuit: (handler: () => void | Promise<void>) => () => void
    flushDone: () => Promise<Result<{ ok: true }>>
  }
  feed: {
    query: (input?: Partial<FeedQueryInput>) => Promise<Result<FeedPage>>
    refresh: () => Promise<Result<{ channels: number; videos: number }>>
  }
  channels: {
    list: () => Promise<Result<Channel[]>>
    setPreference: (
      channelId: string,
      preference: ChannelPreference
    ) => Promise<Result<Channel>>
    /** Remove from MyYouTube feed (local; YouTube subscription unchanged). */
    unsubscribe: (channelId: string) => Promise<Result<Channel>>
    /** Add to MyYouTube feed (local; YouTube subscription unchanged). */
    subscribe: (channelId: string) => Promise<Result<Channel>>
    syncSubscriptions: () => Promise<Result<{ channels: number; videos: number }>>
  }
  videos: {
    get: (videoId: string) => Promise<Result<VideoDetail>>
    hide: (videoId: string) => Promise<Result<Video>>
  }
  history: {
    upsertProgress: (
      videoId: string,
      watchProgress: number,
      completed?: boolean
    ) => Promise<Result<WatchHistoryEntry>>
    markWatched: (videoId: string, completed?: boolean) => Promise<Result<WatchHistoryEntry>>
    list: () => Promise<Result<WatchHistoryEntry[]>>
  }
  search: {
    query: (input: SearchQueryInput) => Promise<Result<SearchPage>>
  }
  updates: {
    getVersion: () => Promise<Result<string>>
    pickFolder: () => Promise<Result<string | null>>
    check: () => Promise<Result<UpdateCheckResult>>
    install: (installerPath: string) => Promise<Result<{ launched: true }>>
  }
}
