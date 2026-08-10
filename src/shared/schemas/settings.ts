import { z } from 'zod'
import { FeedModeSchema } from './feed'
import { QueueItemSchema } from './queue'

export const ThemeModeSchema = z.enum(['light', 'dark', 'system', 'custom'])
export type ThemeMode = z.infer<typeof ThemeModeSchema>

/** @deprecated Use ThemeMode — kept as alias for call sites */
export const ThemeSchema = ThemeModeSchema
export type Theme = ThemeMode

const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Expected #RRGGBB hex color')

export const AppearanceSchema = z.object({
  accent: HexColorSchema.default('#c1121f'),
  background: HexColorSchema.default('#f7f4f4'),
  surface: HexColorSchema.default('#ffffff'),
  sidebar: HexColorSchema.default('#f0eaea'),
  text: HexColorSchema.default('#1f1416'),
  mutedText: HexColorSchema.default('#6b5a5e'),
  fontFamily: z.string().min(1).default('Segoe UI, Trebuchet MS, sans-serif'),
  fontDisplay: z.string().min(1).default('Georgia, Palatino Linotype, serif'),
  fontSizePx: z.number().min(12).max(22).default(15)
})

export type Appearance = z.infer<typeof AppearanceSchema>

export const DEFAULT_APPEARANCE: Appearance = AppearanceSchema.parse({})

export const PlayerModeSchema = z.enum(['default', 'cinema'])
export type PlayerMode = z.infer<typeof PlayerModeSchema>

export const PlayerQualitySchema = z.enum([
  'auto',
  'highres',
  'hd1080',
  'hd720',
  'large',
  'medium',
  'small'
])
export type PlayerQuality = z.infer<typeof PlayerQualitySchema>

export const PlayerSettingsSchema = z.object({
  mode: PlayerModeSchema.default('default'),
  /** Start playback when opening a video on Watch (not autoplay-next). */
  autoplay: z.boolean().default(true),
  captionsEnabled: z.boolean().default(false),
  captionLanguage: z.string().min(2).max(10).default('en'),
  preferredQuality: PlayerQualitySchema.default('auto')
})

export type PlayerSettings = z.infer<typeof PlayerSettingsSchema>
export const DEFAULT_PLAYER: PlayerSettings = PlayerSettingsSchema.parse({})

export const AppSettingsSchema = z.object({
  theme: ThemeModeSchema.default('system'),
  appearance: AppearanceSchema.default(DEFAULT_APPEARANCE),
  player: PlayerSettingsSchema.default(DEFAULT_PLAYER),
  hideShorts: z.boolean().default(true),
  feedMode: FeedModeSchema.default('chrono'),
  watchedThreshold: z.number().min(0).max(1).default(0.7),
  youtubeProvider: z.enum(['mock', 'live']).default('mock'),
  sidebarCollapsed: z.boolean().default(false),
  updatesFolder: z.string().default(''),
  searchHistory: z.array(z.string().min(1).max(200)).max(40).default([]),
  /** Chromium/Electron + IFrame video GPU. Change requires app restart. */
  hardwareAcceleration: z.boolean().default(true),
  /** Currently playing item (Play tab / mini player). */
  nowPlaying: QueueItemSchema.nullable().default(null),
  /** Up-next queue (does not include nowPlaying). */
  playQueue: z.array(QueueItemSchema).max(100).default([]),
  /** Recently played items for Previous (most recent last). */
  playHistory: z.array(QueueItemSchema).max(50).default([])
})

export type AppSettings = z.infer<typeof AppSettingsSchema>

export const AppSettingsPatchSchema = z.object({
  theme: ThemeModeSchema.optional(),
  appearance: AppearanceSchema.partial().optional(),
  player: PlayerSettingsSchema.partial().optional(),
  hideShorts: z.boolean().optional(),
  feedMode: FeedModeSchema.optional(),
  watchedThreshold: z.number().min(0).max(1).optional(),
  youtubeProvider: z.enum(['mock', 'live']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  updatesFolder: z.string().optional(),
  searchHistory: z.array(z.string().min(1).max(200)).max(40).optional(),
  hardwareAcceleration: z.boolean().optional(),
  nowPlaying: QueueItemSchema.nullable().optional(),
  playQueue: z.array(QueueItemSchema).max(100).optional(),
  playHistory: z.array(QueueItemSchema).max(50).optional()
})
export type AppSettingsPatch = z.infer<typeof AppSettingsPatchSchema>

export const DEFAULT_SETTINGS: AppSettings = AppSettingsSchema.parse({})
