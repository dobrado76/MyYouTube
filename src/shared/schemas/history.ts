import { z } from 'zod'

export const WatchHistoryEntrySchema = z.object({
  videoId: z.string(),
  firstOpenedAt: z.string().nullable(),
  lastOpenedAt: z.string().nullable(),
  watchProgress: z.number().nullable(),
  completed: z.boolean(),
  rating: z.number().nullable()
})

export type WatchHistoryEntry = z.infer<typeof WatchHistoryEntrySchema>

export const UpsertProgressInputSchema = z.object({
  videoId: z.string().min(1),
  watchProgress: z.number().min(0).max(1),
  completed: z.boolean().optional()
})

export const MarkWatchedInputSchema = z.object({
  videoId: z.string().min(1),
  completed: z.boolean().default(true)
})
