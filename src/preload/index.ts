import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc/channels'
import type { MyYouTubeApi } from '@shared/ipc/api'
import type { Result } from '@shared/result'

async function invoke<T>(channel: string, payload?: unknown): Promise<Result<T>> {
  return ipcRenderer.invoke(channel, payload) as Promise<Result<T>>
}

const api: MyYouTubeApi = {
  auth: {
    getStatus: () => invoke(IpcChannels.authGetStatus),
    signIn: () => invoke(IpcChannels.authSignIn),
    signOut: () => invoke(IpcChannels.authSignOut),
    credentialsStatus: () => invoke(IpcChannels.authCredentialsStatus),
    saveCredentials: (input) => invoke(IpcChannels.authSaveCredentials, input),
    clearCredentials: () => invoke(IpcChannels.authClearCredentials),
    oauthSetupInfo: () => invoke(IpcChannels.authOAuthSetupInfo)
  },
  settings: {
    get: () => invoke(IpcChannels.settingsGet),
    patch: (patch) => invoke(IpcChannels.settingsPatch, patch)
  },
  app: {
    hardwareAccelerationStatus: () => invoke(IpcChannels.appHardwareAccelerationStatus),
    relaunch: () => invoke(IpcChannels.appRelaunch),
    onFlushBeforeQuit: (handler) => {
      const listener = (): void => {
        void Promise.resolve(handler()).finally(() => {
          void ipcRenderer.invoke(IpcChannels.appFlushDone)
        })
      }
      ipcRenderer.on(IpcChannels.appFlushBeforeQuit, listener)
      return () => {
        ipcRenderer.removeListener(IpcChannels.appFlushBeforeQuit, listener)
      }
    },
    flushDone: () => invoke(IpcChannels.appFlushDone)
  },
  feed: {
    query: (input) => invoke(IpcChannels.feedQuery, input ?? {}),
    refresh: () => invoke(IpcChannels.feedRefresh)
  },
  channels: {
    list: () => invoke(IpcChannels.channelsList),
    listBlocked: () => invoke(IpcChannels.channelsListBlocked),
    setPreference: (channelId, preference) =>
      invoke(IpcChannels.channelsSetPreference, { channelId, preference }),
    unsubscribe: (channelId) => invoke(IpcChannels.channelsUnsubscribe, { channelId }),
    subscribe: (channelId) => invoke(IpcChannels.channelsSubscribe, { channelId }),
    syncSubscriptions: () => invoke(IpcChannels.channelsSyncSubscriptions)
  },
  videos: {
    get: (videoId) => invoke(IpcChannels.videosGet, { videoId }),
    hide: (videoId) => invoke(IpcChannels.videosHide, { videoId }),
    unhide: (videoId) => invoke(IpcChannels.videosUnhide, { videoId })
  },
  history: {
    upsertProgress: (videoId, watchProgress, completed) =>
      invoke(IpcChannels.historyUpsertProgress, {
        videoId,
        watchProgress,
        completed
      }),
    markWatched: (videoId, completed = true) =>
      invoke(IpcChannels.historyMarkWatched, { videoId, completed }),
    unmarkWatched: (videoId) => invoke(IpcChannels.historyUnmarkWatched, { videoId }),
    list: () => invoke(IpcChannels.historyList),
    listWatched: (input) => invoke(IpcChannels.historyListWatched, input ?? {}),
    listHidden: (input) => invoke(IpcChannels.historyListHidden, input ?? {})
  },
  search: {
    query: (input) => invoke(IpcChannels.searchQuery, input)
  },
  updates: {
    getVersion: () => invoke(IpcChannels.updatesGetVersion),
    pickFolder: () => invoke(IpcChannels.updatesPickFolder),
    check: () => invoke(IpcChannels.updatesCheck),
    install: (installerPath) => invoke(IpcChannels.updatesInstall, { installerPath })
  }
}

contextBridge.exposeInMainWorld('myyoutube', api)
