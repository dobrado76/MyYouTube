import { z } from 'zod'
import type { Video } from './video'

export const QueueItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  channelTitle: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  /** Last known playback fraction 0–1 for resume across restarts. */
  resumeProgress: z.number().min(0).max(1).nullable().optional()
})

export type QueueItem = z.infer<typeof QueueItemSchema>

export function videoToQueueItem(video: Pick<
  Video,
  'id' | 'title' | 'channelTitle' | 'thumbnailUrl' | 'durationSeconds' | 'watchProgress'
>): QueueItem {
  return {
    id: video.id,
    title: video.title,
    channelTitle: video.channelTitle,
    thumbnailUrl: video.thumbnailUrl,
    durationSeconds: video.durationSeconds,
    resumeProgress: video.watchProgress ?? null
  }
}
