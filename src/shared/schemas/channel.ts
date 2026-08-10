import { z } from 'zod'

export const ChannelPreferenceSchema = z.enum(['normal', 'favourite', 'muted', 'blocked'])
export type ChannelPreference = z.infer<typeof ChannelPreferenceSchema>

export const ChannelSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  uploadsPlaylistId: z.string().nullable(),
  subscribed: z.boolean(),
  hidden: z.boolean(),
  muted: z.boolean(),
  favourite: z.boolean(),
  blocked: z.boolean(),
  userRating: z.number().nullable(),
  fetchedAt: z.string().nullable()
})

export type Channel = z.infer<typeof ChannelSchema>

export const SetChannelPreferenceInputSchema = z.object({
  channelId: z.string().min(1),
  preference: ChannelPreferenceSchema
})

export const ChannelIdInputSchema = z.object({
  channelId: z.string().min(1)
})
