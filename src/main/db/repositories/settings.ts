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

/** Serialize read-modify-write so concurrent patches cannot wipe playQueue / lastRoute. */
let writeChain: Promise<unknown> = Promise.resolve()

function syncHardwareAccelerationBootFile(settings: AppSettings): void {
  try {
    writeHardwareAccelerationPreference(settings.hardwareAcceleration)
  } catch {
    // Boot file may not be initialized in tests; ignore.
  }
}

function parseSettingsRow(valueJson: string): AppSettings {
  const parsed = JSON.parse(valueJson) as Record<string, unknown>
  return AppSettingsSchema.parse({
    ...parsed,
    appearance: {
      ...DEFAULT_APPEARANCE,
      ...(typeof parsed.appearance === 'object' && parsed.appearance ? parsed.appearance : {})
    },
    player: {
      ...DEFAULT_PLAYER,
      ...(typeof parsed.player === 'object' && parsed.player ? parsed.player : {})
    },
    searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
    playQueue: Array.isArray(parsed.playQueue) ? parsed.playQueue : [],
    playHistory: Array.isArray(parsed.playHistory) ? parsed.playHistory : [],
    nowPlaying: parsed.nowPlaying === undefined ? null : parsed.nowPlaying,
    activeChannel: parsed.activeChannel === undefined ? null : parsed.activeChannel,
    lastRoute: typeof parsed.lastRoute === 'string' && parsed.lastRoute ? parsed.lastRoute : '/'
  })
}

export function getSettings(): AppSettings {
  const row = getDb()
    .prepare('SELECT value_json FROM application_settings WHERE key = ?')
    .get(SETTINGS_KEY) as { value_json: string } | undefined

  if (!row) {
    return setSettingsSync(DEFAULT_SETTINGS)
  }

  try {
    return parseSettingsRow(row.value_json)
  } catch {
    // Soft-recover — never wipe a live play queue because one field failed to parse.
    try {
      const parsed = JSON.parse(row.value_json) as Record<string, unknown>
      const recovered = parseSettingsRow(
        JSON.stringify({
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
          nowPlaying: parsed.nowPlaying === undefined ? null : parsed.nowPlaying,
          activeChannel: parsed.activeChannel === undefined ? null : parsed.activeChannel,
          lastRoute:
            typeof parsed.lastRoute === 'string' && parsed.lastRoute ? parsed.lastRoute : '/'
        })
      )
      return setSettingsSync(recovered)
    } catch {
      return setSettingsSync(DEFAULT_SETTINGS)
    }
  }
}

function setSettingsSync(settings: AppSettings): AppSettings {
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

export function setSettings(settings: AppSettings): AppSettings {
  return setSettingsSync(settings)
}

function applyPatch(current: AppSettings, patch: AppSettingsPatch): AppSettings {
  return AppSettingsSchema.parse({
    ...current,
    ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
    ...(patch.hideShorts !== undefined ? { hideShorts: patch.hideShorts } : {}),
    ...(patch.unwatchedOnly !== undefined ? { unwatchedOnly: patch.unwatchedOnly } : {}),
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
    ...(patch.activeChannel !== undefined ? { activeChannel: patch.activeChannel } : {}),
    ...(patch.lastRoute !== undefined ? { lastRoute: patch.lastRoute } : {}),
    appearance: {
      ...current.appearance,
      ...(patch.appearance ?? {})
    },
    player: {
      ...current.player,
      ...(patch.player ?? {})
    }
  })
}

function patchSettingsUnlocked(patch: AppSettingsPatch): AppSettings {
  return setSettingsSync(applyPatch(getSettings(), patch))
}

/** Sync helper for main-process call sites that cannot await. Prefer `patchSettings`. */
export function patchSettingsSync(patch: AppSettingsPatch): AppSettings {
  return patchSettingsUnlocked(patch)
}

/** Serialized patch — safe against concurrent queue / route / filter writes. */
export async function patchSettings(patch: AppSettingsPatch): Promise<AppSettings> {
  const task = (): AppSettings => patchSettingsUnlocked(patch)
  const result = writeChain.then(task, task)
  writeChain = result.then(
    () => undefined,
    () => undefined
  )
  return result
}
