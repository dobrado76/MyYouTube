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
  channelsRefreshUploads: 'channels.refreshUploads',

  videosGet: 'videos.get',
  videosHide: 'videos.hide',
  videosUnhide: 'videos.unhide',

  historyUpsertProgress: 'history.upsertProgress',
  historyMarkWatched: 'history.markWatched',
  historyUnmarkWatched: 'history.unmarkWatched',
  historyList: 'history.list',
  historyListWatched: 'history.listWatched',
  historyListHidden: 'history.listHidden',

  channelsListBlocked: 'channels.listBlocked',

  searchQuery: 'search.query',

  collectionsList: 'collections.list',
  collectionsCreate: 'collections.create',
  collectionsRename: 'collections.rename',
  collectionsDelete: 'collections.delete',
  collectionsAddVideo: 'collections.addVideo',
  collectionsRemoveVideo: 'collections.removeVideo',
  collectionsListVideos: 'collections.listVideos',
  collectionsListForVideo: 'collections.listForVideo',

  updatesGetVersion: 'updates.getVersion',
  updatesPickFolder: 'updates.pickFolder',
  updatesCheck: 'updates.check',
  updatesInstall: 'updates.install'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
