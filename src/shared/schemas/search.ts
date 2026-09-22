import { z } from 'zod'
import { SEARCH_PAGE_SIZE } from '../constants/search'
import { VideoSchema } from './video'

export const SearchQueryInputSchema = z.object({
  query: z.string().min(1).max(200),
  pageToken: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(SEARCH_PAGE_SIZE).default(SEARCH_PAGE_SIZE),
  /** Live Discovery filter — prefer over persisted settings so toggle is instant. */
  unwatchedOnly: z.boolean().optional()
})

export type SearchQueryInput = z.infer<typeof SearchQueryInputSchema>

export const SearchPageSchema = z.object({
  items: z.array(VideoSchema),
  nextPageToken: z.string().nullable(),
  query: z.string()
})

export type SearchPage = z.infer<typeof SearchPageSchema>
