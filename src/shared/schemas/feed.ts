import { z } from 'zod'
import { VideoSchema } from './video'

export const FeedModeSchema = z.enum(['chrono', 'ranked', 'priority'])
export type FeedMode = z.infer<typeof FeedModeSchema>

export const FeedFiltersSchema = z.object({
  hideShorts: z.boolean().default(true),
  unwatchedOnly: z.boolean().default(false),
  minDurationSeconds: z.number().int().nonnegative().nullable().default(null),
  channelId: z.string().nullable().default(null)
})

export type FeedFilters = z.infer<typeof FeedFiltersSchema>

export const FeedQueryInputSchema = z.object({
  mode: FeedModeSchema.default('chrono'),
  filters: FeedFiltersSchema.partial().optional(),
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(50).default(24)
})

export type FeedQueryInput = z.infer<typeof FeedQueryInputSchema>

export const FeedPageSchema = z.object({
  items: z.array(VideoSchema),
  nextCursor: z.string().nullable(),
  source: z.literal('subscriptions'),
  mode: FeedModeSchema
})

export type FeedPage = z.infer<typeof FeedPageSchema>
