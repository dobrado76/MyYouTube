import { z } from 'zod'

export const VideoSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  channelTitle: z.string().optional(),
  title: z.string(),
  description: z.string().nullable(),
  publishedAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
  thumbnailUrl: z.string().nullable(),
  viewCount: z.number().nullable(),
  likeCount: z.number().nullable(),
  isShort: z.boolean().nullable(),
  hidden: z.boolean(),
  /** ISO time when the video was hidden (null if not hidden / unknown). */
  hiddenAt: z.string().nullable().optional(),
  recommendationScore: z.number().nullable(),
  fetchedAt: z.string().nullable(),
  watched: z.boolean().optional(),
  watchProgress: z.number().nullable().optional()
})

export type Video = z.infer<typeof VideoSchema>

export const VideoDetailSchema = VideoSchema.extend({
  playableId: z.string(),
  /** Whether the video's channel is in the local MyYouTube subscription set. */
  channelSubscribed: z.boolean().default(false)
})

export type VideoDetail = z.infer<typeof VideoDetailSchema>

export const VideoIdInputSchema = z.object({
  videoId: z.string().min(1)
})
