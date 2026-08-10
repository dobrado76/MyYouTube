export const IpcChannels = {
  authGetStatus: 'auth.getStatus',
  authSignIn: 'auth.signIn',
  authSignOut: 'auth.signOut',
  authCredentialsStatus: 'auth.credentialsStatus',
  authSaveCredentials: 'auth.saveCredentials',
  authClearCredentials: 'auth.clearCredentials',
  authOAuthSetupInfo: 'auth.oauthSetupInfo',

  settingsGet: 'settings.get',
  settingsPatch: 'settings.patch',
  appHardwareAccelerationStatus: 'app.hardwareAccelerationStatus',
  appRelaunch: 'app.relaunch',
  appFlushBeforeQuit: 'app.flushBeforeQuit',
  appFlushDone: 'app.flushDone',

  feedQuery: 'feed.query',
  feedRefresh: 'feed.refresh',

  channelsList: 'channels.list',
  channelsSetPreference: 'channels.setPreference',
  channelsUnsubscribe: 'channels.unsubscribe',
  channelsSubscribe: 'channels.subscribe',
  channelsSyncSubscriptions: 'channels.syncSubscriptions',

  videosGet: 'videos.get',
  videosHide: 'videos.hide',

  historyUpsertProgress: 'history.upsertProgress',
  historyMarkWatched: 'history.markWatched',
  historyList: 'history.list',

  searchQuery: 'search.query',

  updatesGetVersion: 'updates.getVersion',
  updatesPickFolder: 'updates.pickFolder',
  updatesCheck: 'updates.check',
  updatesInstall: 'updates.install'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
