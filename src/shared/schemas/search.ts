import { z } from 'zod'
import { VideoSchema } from './video'

export const SearchQueryInputSchema = z.object({
  query: z.string().min(1).max(200),
  pageToken: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(50).default(20)
})

export type SearchQueryInput = z.infer<typeof SearchQueryInputSchema>

export const SearchPageSchema = z.object({
  items: z.array(VideoSchema),
  nextPageToken: z.string().nullable(),
  query: z.string()
})

export type SearchPage = z.infer<typeof SearchPageSchema>
