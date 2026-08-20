import { z } from 'zod'
import { VideoSchema } from './video'

export const CollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.string(),
  updatedAt: z.string(),
  sortOrder: z.number().int(),
  videoCount: z.number().int().nonnegative()
})

export type Collection = z.infer<typeof CollectionSchema>

export const CreateCollectionInputSchema = z.object({
  name: z.string().trim().min(1).max(80)
})

export type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>

export const RenameCollectionInputSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().trim().min(1).max(80)
})

export type RenameCollectionInput = z.infer<typeof RenameCollectionInputSchema>

export const CollectionIdInputSchema = z.object({
  collectionId: z.string().min(1)
})

export const CollectionVideoInputSchema = z.object({
  collectionId: z.string().min(1),
  videoId: z.string().min(1)
})

export type CollectionVideoInput = z.infer<typeof CollectionVideoInputSchema>

export const ListCollectionVideosInputSchema = z.object({
  collectionId: z.string().min(1),
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(40)
})

export type ListCollectionVideosInput = z.infer<typeof ListCollectionVideosInputSchema>

export const CollectionVideosPageSchema = z.object({
  items: z.array(VideoSchema),
  nextCursor: z.string().nullable()
})

export type CollectionVideosPage = z.infer<typeof CollectionVideosPageSchema>

/** Memberships for the Save picker (checked folders). */
export const VideoCollectionMembershipSchema = z.object({
  videoId: z.string(),
  collectionIds: z.array(z.string())
})

export type VideoCollectionMembership = z.infer<typeof VideoCollectionMembershipSchema>
