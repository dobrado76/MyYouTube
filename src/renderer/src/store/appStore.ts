import { create } from 'zustand'
import type { AuthStatus } from '@shared/schemas/auth'
import type { QueueItem } from '@shared/schemas/queue'
import type { AppSettings, AppSettingsPatch } from '@shared/schemas/settings'
import { DEFAULT_SETTINGS } from '@shared/schemas/settings'
import { callApi } from '../lib/api'
import { applyAppearance } from '../lib/theme'

const MAX_SEARCH_HISTORY = 25
const MAX_QUEUE = 100
const MAX_PLAY_HISTORY = 50

type AppState = {
  ready: boolean
  auth: AuthStatus | null
  settings: AppSettings
  error: string | null
  hideShorts: boolean
  unwatchedOnly: boolean
  /** Active Play-tab video id (derived from nowPlaying). */
  playVideoId: string | null
  nowPlaying: QueueItem | null
  queue: QueueItem[]
  /** Recently played for Previous (most recent last). */
  playHistory: QueueItem[]
  bootstrap: () => Promise<void>
  refreshAuth: () => Promise<void>
  patchSettings: (patch: AppSettingsPatch) => Promise<void>
  recordSearch: (query: string) => Promise<void>
  setHideShorts: (value: boolean) => void
  setUnwatchedOnly: (value: boolean) => void
  /** @deprecated prefer watchNow / clearNowPlaying */
  setPlayVideoId: (videoId: string | null) => void
  watchNow: (item: QueueItem) => void
  enqueue: (item: QueueItem) => void
  clearNowPlaying: () => void
  clearQueue: () => void
  removeFromQueue: (videoId: string) => void
  moveQueueItem: (videoId: string, to: 'front' | 'back') => void
  reorderQueue: (fromIndex: number, toIndex: number) => void
  flushPlayback: () => void
  /** Awaitable persist of nowPlaying + queue (and in-flight progress). */
  persistPlaybackNow: () => Promise<void>
  /** Update resume for the active item only when `videoId` still matches nowPlaying. */
  updateNowPlayingProgress: (videoId: string, progress: number, completed?: boolean) => void
  /**
   * Skip to next up-next item. Marks current watched when resumeProgress
   * meets settings.watchedThreshold.
   */
  playNextInQueue: () => Promise<QueueItem | null>
  /** Skip to previous from playHistory (does not mark watched). */
  playPreviousInQueue: () => QueueItem | null
  finishCurrentAndPlayNext: () => Promise<QueueItem | null>
  openWatchById: (videoId: string) => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  applyTheme: (settings: AppSettings) => void
}

let playbackPersistTimer: ReturnType<typeof setTimeout> | null = null
/** Serialize playback writes so a stale in-flight patch cannot wipe a newer queue. */
let playbackWriteChain: Promise<void> = Promise.resolve()

function pushPlayHistory(history: QueueItem[], item: QueueItem): QueueItem[] {
  return [...history.filter((h) => h.id !== item.id), item].slice(-MAX_PLAY_HISTORY)
}

function withLivePlayback(
  settings: AppSettings,
  get: () => AppState
): AppSettings {
  const { nowPlaying, queue, playHistory } = get()
  return {
    ...settings,
    nowPlaying,
    playQueue: queue,
    playHistory
  }
}

async function writePlaybackSettings(get: () => AppState, set: (partial: Partial<AppState>) => void): Promise<void> {
  const run = async (): Promise<void> => {
    // Read immediately before IPC so we always persist the latest session.
    const { nowPlaying, queue, playHistory } = get()
    const settings = await callApi(() =>
      window.myyoutube.settings.patch({ nowPlaying, playQueue: queue, playHistory })
    )
    // Never let a round-tripped patch replace live queue/nowPlaying/history.
    set({ settings: withLivePlayback(settings, get) })
  }
  playbackWriteChain = playbackWriteChain.then(run, run)
  await playbackWriteChain
}

function schedulePlaybackPersist(get: () => AppState, set: (partial: Partial<AppState>) => void): void {
  if (playbackPersistTimer) clearTimeout(playbackPersistTimer)
  playbackPersistTimer = setTimeout(() => {
    playbackPersistTimer = null
    void writePlaybackSettings(get, set)
  }, 800)
}

function persistPlayback(get: () => AppState, set: (partial: Partial<AppState>) => void): void {
  void writePlaybackSettings(get, set)
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  auth: null,
  settings: DEFAULT_SETTINGS,
  error: null,
  hideShorts: DEFAULT_SETTINGS.hideShorts,
  unwatchedOnly: false,
  playVideoId: null,
  nowPlaying: null,
  queue: [],
  playHistory: [],

  applyTheme: (settings) => {
    applyAppearance(settings.theme, settings.appearance)
  },

  bootstrap: async () => {
    if (get().ready) return
    try {
      const [settings, auth] = await Promise.all([
        callApi(() => window.myyoutube.settings.get()),
        callApi(() => window.myyoutube.auth.getStatus())
      ])
      get().applyTheme(settings)
      const nowPlaying = settings.nowPlaying
      set({
        settings,
        auth,
        hideShorts: settings.hideShorts,
        nowPlaying,
        queue: settings.playQueue,
        playHistory: settings.playHistory,
        playVideoId: nowPlaying?.id ?? null,
        ready: true,
        error: null
      })
    } catch (error) {
      set({
        ready: true,
        error: error instanceof Error ? error.message : 'Failed to start'
      })
    }
  },

  refreshAuth: async () => {
    const auth = await callApi(() => window.myyoutube.auth.getStatus())
    set({ auth })
  },

  patchSettings: async (patch) => {
    const settings = await callApi(() => window.myyoutube.settings.patch(patch))
    get().applyTheme(settings)
    // Playback session lives in memory after bootstrap — never rehydrate queue
    // from a settings patch response (stale IPC can otherwise wipe up-next).
    set({
      settings: withLivePlayback(settings, get),
      hideShorts: settings.hideShorts
    })
  },

  recordSearch: async (query) => {
    const q = query.trim()
    if (!q) return
    const current = get().settings.searchHistory
    const next = [q, ...current.filter((entry) => entry !== q)].slice(0, MAX_SEARCH_HISTORY)
    if (next.length === current.length && next.every((entry, i) => entry === current[i])) {
      return
    }
    await get().patchSettings({ searchHistory: next })
  },

  setHideShorts: (value) => {
    set({ hideShorts: value })
    void get().patchSettings({ hideShorts: value })
  },

  setUnwatchedOnly: (value) => set({ unwatchedOnly: value }),

  setPlayVideoId: (videoId) => {
    if (!videoId) {
      get().clearNowPlaying()
      return
    }
    void get().openWatchById(videoId)
  },

  watchNow: (item) => {
    const { nowPlaying, queue, playHistory } = get()
    // Keep up-next intact: demote current to front, drop only the new item's duplicate.
    let nextQueue = queue.filter((q) => q.id !== item.id)
    if (nowPlaying && nowPlaying.id !== item.id) {
      nextQueue = [nowPlaying, ...nextQueue.filter((q) => q.id !== nowPlaying.id)]
    }
    nextQueue = nextQueue.slice(0, MAX_QUEUE)
    set({
      nowPlaying: item,
      playVideoId: item.id,
      queue: nextQueue,
      // Playing a new video does not clear prior/up-next history.
      playHistory: playHistory.filter((h) => h.id !== item.id)
    })
    persistPlayback(get, set)
  },

  enqueue: (item) => {
    const { nowPlaying, queue } = get()
    if (nowPlaying?.id === item.id) return
    if (queue.some((q) => q.id === item.id)) return
    if (queue.length >= MAX_QUEUE) return
    set({ queue: [...queue, item] })
    persistPlayback(get, set)
  },

  clearNowPlaying: () => {
    set({ nowPlaying: null, playVideoId: null })
    persistPlayback(get, set)
  },

  clearQueue: () => {
    set({ nowPlaying: null, playVideoId: null, queue: [], playHistory: [] })
    persistPlayback(get, set)
  },

  removeFromQueue: (videoId) => {
    set({ queue: get().queue.filter((q) => q.id !== videoId) })
    persistPlayback(get, set)
  },

  moveQueueItem: (videoId, to) => {
    const queue = [...get().queue]
    const index = queue.findIndex((q) => q.id === videoId)
    if (index < 0) return
    const item = queue.splice(index, 1)[0]
    if (!item) return
    if (to === 'front') queue.unshift(item)
    else queue.push(item)
    set({ queue })
    persistPlayback(get, set)
  },

  reorderQueue: (fromIndex, toIndex) => {
    const queue = [...get().queue]
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= queue.length ||
      toIndex >= queue.length ||
      fromIndex === toIndex
    ) {
      return
    }
    const item = queue.splice(fromIndex, 1)[0]
    if (!item) return
    queue.splice(toIndex, 0, item)
    set({ queue })
  },

  flushPlayback: () => {
    if (playbackPersistTimer) {
      clearTimeout(playbackPersistTimer)
      playbackPersistTimer = null
    }
    persistPlayback(get, set)
  },

  persistPlaybackNow: async () => {
    if (playbackPersistTimer) {
      clearTimeout(playbackPersistTimer)
      playbackPersistTimer = null
    }
    await writePlaybackSettings(get, set)
  },

  updateNowPlayingProgress: (videoId, progress, completed = false) => {
    const np = get().nowPlaying
    // Drop stale flushes from a player that was just replaced by Next/Previous/Watch.
    if (!np || np.id !== videoId) return
    const nextProgress = completed ? 1 : progress
    if (
      np.resumeProgress != null &&
      Math.abs(np.resumeProgress - nextProgress) < 0.004 &&
      !completed
    ) {
      return
    }
    set({
      nowPlaying: {
        ...np,
        resumeProgress: nextProgress
      }
    })
    schedulePlaybackPersist(get, set)
  },

  playNextInQueue: async () => {
    const { nowPlaying, queue, playHistory, settings } = get()
    const next = queue[0]
    if (!next) return null
    const threshold = settings.watchedThreshold
    const progress = nowPlaying?.resumeProgress ?? 0
    const markWatched = Boolean(nowPlaying && progress >= threshold)
    if (markWatched && nowPlaying) {
      try {
        await callApi(() => window.myyoutube.history.markWatched(nowPlaying.id, true))
      } catch {
        // Still advance even if mark-watched fails.
      }
    }
    const rest = queue
      .slice(1)
      .filter((q) => q.id !== nowPlaying?.id && q.id !== next.id)
    // Watched via Next leaves the session; otherwise keep for Previous.
    const nextHistory =
      nowPlaying && !markWatched ? pushPlayHistory(playHistory, nowPlaying) : playHistory
    set({
      nowPlaying: next,
      playVideoId: next.id,
      queue: rest,
      playHistory: nextHistory.filter((h) => h.id !== next.id)
    })
    persistPlayback(get, set)
    return next
  },

  playPreviousInQueue: () => {
    const { nowPlaying, queue, playHistory } = get()
    if (!playHistory.length) return null
    const prev = playHistory[playHistory.length - 1]
    if (!prev) return null
    const nextHistory = playHistory.slice(0, -1)
    let nextQueue = queue.filter((q) => q.id !== prev.id)
    if (nowPlaying && nowPlaying.id !== prev.id) {
      nextQueue = [nowPlaying, ...nextQueue.filter((q) => q.id !== nowPlaying.id)].slice(
        0,
        MAX_QUEUE
      )
    }
    set({
      nowPlaying: prev,
      playVideoId: prev.id,
      queue: nextQueue,
      playHistory: nextHistory
    })
    persistPlayback(get, set)
    return prev
  },

  finishCurrentAndPlayNext: async () => {
    const current = get().nowPlaying
    if (current) {
      try {
        await callApi(() => window.myyoutube.history.markWatched(current.id, true))
      } catch {
        // Still advance the queue even if mark-watched fails.
      }
    }
    const { queue, playHistory } = get()
    const next = queue[0] ?? null
    const rest = next ? queue.slice(1) : []
    set({
      nowPlaying: next,
      playVideoId: next?.id ?? null,
      queue: rest,
      playHistory: current ? pushPlayHistory(playHistory, current) : playHistory
    })
    await writePlaybackSettings(get, set)
    return next
  },

  openWatchById: async (videoId) => {
    if (get().nowPlaying?.id === videoId) return
    const detail = await callApi(() => window.myyoutube.videos.get(videoId))
    get().watchNow({
      id: detail.id,
      title: detail.title,
      channelTitle: detail.channelTitle,
      thumbnailUrl: detail.thumbnailUrl,
      durationSeconds: detail.durationSeconds,
      resumeProgress: detail.watchProgress ?? null
    })
  },

  signIn: async () => {
    const auth = await callApi(() => window.myyoutube.auth.signIn())
    set({ auth })
  },

  signOut: async () => {
    const auth = await callApi(() => window.myyoutube.auth.signOut())
    set({ auth })
  }
}))
