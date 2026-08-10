import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { IpcChannels } from '@shared/ipc/channels'
import { err, ok, type Result } from '@shared/result'
import {
  FeedQueryInputSchema,
  MarkWatchedInputSchema,
  SearchQueryInputSchema,
  ChannelIdInputSchema,
  SetChannelPreferenceInputSchema,
  AppSettingsPatchSchema,
  InstallUpdateInputSchema,
  SaveCredentialsInputSchema,
  UpsertProgressInputSchema,
  VideoIdInputSchema
} from '@shared/schemas'
import * as auth from '../auth/service'
import * as channelRepo from '../db/repositories/channels'
import * as historyRepo from '../db/repositories/history'
import * as settingsRepo from '../db/repositories/settings'
import * as videoRepo from '../db/repositories/videos'
import * as feed from '../feed/service'
import * as search from '../search/service'
import * as updates from '../updates/service'
import {
  getHardwareAccelerationStatus,
  relaunchApp
} from '../hardwareAcceleration'
import { resolvePlayableId } from '../youtube/fixtures'

type Handler = (...args: unknown[]) => Promise<unknown> | unknown

function wrap(handler: Handler) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]): Promise<Result<unknown>> => {
    try {
      const value = await handler(...args)
      return ok(value)
    } catch (error) {
      if (error instanceof ZodError) {
        return err('validation', error.errors.map((e) => e.message).join('; '))
      }
      const code =
        typeof error === 'object' && error && 'code' in error
          ? String((error as { code: string }).code)
          : 'internal'
      const message = error instanceof Error ? error.message : 'Unknown error'
      return err(code, message)
    }
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(
    IpcChannels.authGetStatus,
    wrap(() => auth.getAuthStatus())
  )
  ipcMain.handle(
    IpcChannels.authSignIn,
    wrap(() => auth.signIn())
  )
  ipcMain.handle(
    IpcChannels.authSignOut,
    wrap(() => auth.signOut())
  )
  ipcMain.handle(
    IpcChannels.authCredentialsStatus,
    wrap(() => auth.credentialsStatus())
  )
  ipcMain.handle(
    IpcChannels.authSaveCredentials,
    wrap((raw) => {
      const input = SaveCredentialsInputSchema.parse(raw)
      return auth.saveGoogleCredentials(input)
    })
  )
  ipcMain.handle(
    IpcChannels.authClearCredentials,
    wrap(() => auth.clearGoogleCredentials())
  )
  ipcMain.handle(
    IpcChannels.authOAuthSetupInfo,
    wrap(() => auth.oauthSetupInfo())
  )

  ipcMain.handle(
    IpcChannels.settingsGet,
    wrap(() => settingsRepo.getSettings())
  )
  ipcMain.handle(
    IpcChannels.settingsPatch,
    wrap((raw) => {
      const patch = AppSettingsPatchSchema.parse(raw)
      return settingsRepo.patchSettings(patch)
    })
  )
  ipcMain.handle(
    IpcChannels.appHardwareAccelerationStatus,
    wrap(() => {
      const settings = settingsRepo.getSettings()
      return getHardwareAccelerationStatus(settings.hardwareAcceleration)
    })
  )
  ipcMain.handle(
    IpcChannels.appRelaunch,
    wrap(() => {
      // Respond first, then relaunch on next tick so the IPC result can flush.
      setImmediate(() => relaunchApp())
      return { relaunching: true as const }
    })
  )

  ipcMain.handle(
    IpcChannels.feedQuery,
    wrap((raw) => {
      const input = FeedQueryInputSchema.parse(raw ?? {})
      return feed.queryFeed(input)
    })
  )
  ipcMain.handle(
    IpcChannels.feedRefresh,
    wrap(() => feed.refreshSubscriptionsAndUploads())
  )

  ipcMain.handle(
    IpcChannels.channelsList,
    wrap(() => channelRepo.listChannels())
  )
  ipcMain.handle(
    IpcChannels.channelsSetPreference,
    wrap((raw) => {
      const input = SetChannelPreferenceInputSchema.parse(raw)
      const channel = channelRepo.setChannelPreference(input.channelId, input.preference)
      if (!channel) {
        throw Object.assign(new Error('Channel not found'), { code: 'api.notFound' })
      }
      return channel
    })
  )
  ipcMain.handle(
    IpcChannels.channelsUnsubscribe,
    wrap((raw) => {
      const input = ChannelIdInputSchema.parse(raw)
      const channel = channelRepo.unsubscribeChannel(input.channelId)
      if (!channel) {
        throw Object.assign(new Error('Channel not found'), { code: 'api.notFound' })
      }
      return channel
    })
  )
  ipcMain.handle(
    IpcChannels.channelsSubscribe,
    wrap(async (raw) => {
      const input = ChannelIdInputSchema.parse(raw)
      const channel = await feed.subscribeChannel(input.channelId)
      if (!channel) {
        throw Object.assign(new Error('Channel not found'), { code: 'api.notFound' })
      }
      return channel
    })
  )
  ipcMain.handle(
    IpcChannels.channelsSyncSubscriptions,
    wrap(() => feed.refreshSubscriptionsAndUploads())
  )

  ipcMain.handle(
    IpcChannels.videosGet,
    wrap((raw) => {
      const { videoId } = VideoIdInputSchema.parse(raw)
      const video = videoRepo.getVideo(videoId)
      if (!video) {
        throw Object.assign(new Error('Video not found'), { code: 'api.notFound' })
      }
      historyRepo.recordOpen(videoId)
      return {
        ...video,
        playableId: resolvePlayableId(videoId),
        channelSubscribed: channelRepo.isChannelSubscribed(video.channelId)
      }
    })
  )
  ipcMain.handle(
    IpcChannels.videosHide,
    wrap((raw) => {
      const { videoId } = VideoIdInputSchema.parse(raw)
      const video = videoRepo.hideVideo(videoId)
      if (!video) {
        throw Object.assign(new Error('Video not found'), { code: 'api.notFound' })
      }
      return video
    })
  )

  ipcMain.handle(
    IpcChannels.historyUpsertProgress,
    wrap((raw) => {
      const input = UpsertProgressInputSchema.parse(raw)
      const settings = settingsRepo.getSettings()
      return historyRepo.upsertProgress(
        input.videoId,
        input.watchProgress,
        input.completed,
        settings.watchedThreshold
      )
    })
  )
  ipcMain.handle(
    IpcChannels.historyMarkWatched,
    wrap((raw) => {
      const input = MarkWatchedInputSchema.parse(raw)
      return historyRepo.markWatched(input.videoId, input.completed)
    })
  )
  ipcMain.handle(
    IpcChannels.historyList,
    wrap(() => historyRepo.listHistory())
  )

  ipcMain.handle(
    IpcChannels.searchQuery,
    wrap((raw) => {
      const input = SearchQueryInputSchema.parse(raw)
      return search.searchVideos(input)
    })
  )

  ipcMain.handle(
    IpcChannels.updatesGetVersion,
    wrap(() => updates.getCurrentAppVersion())
  )
  ipcMain.handle(
    IpcChannels.updatesPickFolder,
    wrap(() => updates.pickUpdatesFolder())
  )
  ipcMain.handle(
    IpcChannels.updatesCheck,
    wrap(() => updates.checkForUpdates())
  )
  ipcMain.handle(
    IpcChannels.updatesInstall,
    wrap((raw) => {
      const input = InstallUpdateInputSchema.parse(raw)
      return updates.installUpdate(input.installerPath)
    })
  )
}
