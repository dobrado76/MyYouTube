import {
  AppSettingsSchema,
  DEFAULT_APPEARANCE,
  DEFAULT_PLAYER,
  DEFAULT_SETTINGS,
  type AppSettings,
  type AppSettingsPatch
} from '@shared/schemas/settings'
import { writeHardwareAccelerationPreference } from '../../hardwareAcceleration'
import { getDb } from '../index'

const SETTINGS_KEY = 'app'

function syncHardwareAccelerationBootFile(settings: AppSettings): void {
  try {
    writeHardwareAccelerationPreference(settings.hardwareAcceleration)
  } catch {
    // Boot file may not be initialized in tests; ignore.
  }
}

export function getSettings(): AppSettings {
  const row = getDb()
    .prepare('SELECT value_json FROM application_settings WHERE key = ?')
    .get(SETTINGS_KEY) as { value_json: string } | undefined

  if (!row) {
    return setSettings(DEFAULT_SETTINGS)
  }

  try {
    const parsed = JSON.parse(row.value_json) as Record<string, unknown>
    return AppSettingsSchema.parse({
      ...parsed,
      appearance: {
        ...DEFAULT_APPEARANCE,
        ...(typeof parsed.appearance === 'object' && parsed.appearance
          ? parsed.appearance
          : {})
      },
      player: {
        ...DEFAULT_PLAYER,
        ...(typeof parsed.player === 'object' && parsed.player ? parsed.player : {})
      },
      searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
      playQueue: Array.isArray(parsed.playQueue) ? parsed.playQueue : [],
      playHistory: Array.isArray(parsed.playHistory) ? parsed.playHistory : [],
      nowPlaying: parsed.nowPlaying === undefined ? null : parsed.nowPlaying
    })
  } catch {
    // Soft-recover — never wipe a live play queue because one field failed to parse.
    try {
      const parsed = JSON.parse(row.value_json) as Record<string, unknown>
      const recovered = AppSettingsSchema.parse({
        ...DEFAULT_SETTINGS,
        ...parsed,
        appearance: {
          ...DEFAULT_APPEARANCE,
          ...(typeof parsed.appearance === 'object' && parsed.appearance
            ? parsed.appearance
            : {})
        },
        player: {
          ...DEFAULT_PLAYER,
          ...(typeof parsed.player === 'object' && parsed.player ? parsed.player : {})
        },
        searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
        playQueue: Array.isArray(parsed.playQueue) ? parsed.playQueue : [],
        playHistory: Array.isArray(parsed.playHistory) ? parsed.playHistory : [],
        nowPlaying: parsed.nowPlaying === undefined ? null : parsed.nowPlaying
      })
      return setSettings(recovered)
    } catch {
      return setSettings(DEFAULT_SETTINGS)
    }
  }
}

export function setSettings(settings: AppSettings): AppSettings {
  getDb()
    .prepare(
      `
    INSERT INTO application_settings (key, value_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
  `
    )
    .run(SETTINGS_KEY, JSON.stringify(settings))
  syncHardwareAccelerationBootFile(settings)
  return settings
}

export function patchSettings(patch: AppSettingsPatch): AppSettings {
  const current = getSettings()
  // Only apply keys that are explicitly present — never treat `undefined` as "clear".
  const next = AppSettingsSchema.parse({
    ...current,
    ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
    ...(patch.hideShorts !== undefined ? { hideShorts: patch.hideShorts } : {}),
    ...(patch.feedMode !== undefined ? { feedMode: patch.feedMode } : {}),
    ...(patch.watchedThreshold !== undefined
      ? { watchedThreshold: patch.watchedThreshold }
      : {}),
    ...(patch.blockedKeywords !== undefined
      ? { blockedKeywords: patch.blockedKeywords }
      : {}),
    ...(patch.youtubeProvider !== undefined
      ? { youtubeProvider: patch.youtubeProvider }
      : {}),
    ...(patch.sidebarCollapsed !== undefined
      ? { sidebarCollapsed: patch.sidebarCollapsed }
      : {}),
    ...(patch.updatesFolder !== undefined ? { updatesFolder: patch.updatesFolder } : {}),
    ...(patch.searchHistory !== undefined ? { searchHistory: patch.searchHistory } : {}),
    ...(patch.hardwareAcceleration !== undefined
      ? { hardwareAcceleration: patch.hardwareAcceleration }
      : {}),
    ...(patch.nowPlaying !== undefined ? { nowPlaying: patch.nowPlaying } : {}),
    ...(patch.playQueue !== undefined ? { playQueue: patch.playQueue } : {}),
    ...(patch.playHistory !== undefined ? { playHistory: patch.playHistory } : {}),
    appearance: {
      ...current.appearance,
      ...(patch.appearance ?? {})
    },
    player: {
      ...current.player,
      ...(patch.player ?? {})
    }
  })
  return setSettings(next)
}
