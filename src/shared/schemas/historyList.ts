import { z } from 'zod'
import { VideoSchema } from './video'

/** Video row in History with the timestamp used for sorting (watched / hidden). */
export const HistoryVideoSchema = VideoSchema.extend({
  markedAt: z.string()
})

export type HistoryVideo = z.infer<typeof HistoryVideoSchema>

export const HistoryListInputSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(40),
  /** Case-insensitive match on title, description, and channel title. */
  query: z.string().max(200).optional().default('')
})

export type HistoryListInput = z.infer<typeof HistoryListInputSchema>

export const HistoryListPageSchema = z.object({
  items: z.array(HistoryVideoSchema),
  nextCursor: z.string().nullable()
})

export type HistoryListPage = z.infer<typeof HistoryListPageSchema>
