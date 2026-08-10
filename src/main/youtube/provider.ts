import { getSettings } from '../db/repositories/settings'
import { YouTubeApiProvider } from './api'
import { MockYouTubeProvider } from './mock'
import type { YouTubeProvider } from './types'

let accessTokenProvider: (() => Promise<string | null>) | null = null

export function setAccessTokenProvider(fn: () => Promise<string | null>): void {
  accessTokenProvider = fn
}

export function getYouTubeProvider(): YouTubeProvider {
  const settings = getSettings()
  if (settings.youtubeProvider === 'live') {
    return new YouTubeApiProvider(async () => {
      if (!accessTokenProvider) return null
      return accessTokenProvider()
    })
  }
  return new MockYouTubeProvider()
}
