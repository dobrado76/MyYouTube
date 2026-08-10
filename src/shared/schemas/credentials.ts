import { z } from 'zod'

export const CredentialsStatusSchema = z.object({
  configured: z.boolean(),
  clientId: z.string(),
  clientIdMasked: z.string().nullable(),
  hasClientSecret: z.boolean(),
  hasApiKey: z.boolean()
})

export type CredentialsStatus = z.infer<typeof CredentialsStatusSchema>

export const SaveCredentialsInputSchema = z.object({
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  /** Pass null to clear; omit to keep existing; string to set */
  apiKey: z.union([z.string(), z.null()]).optional()
})

export type SaveCredentialsInput = z.infer<typeof SaveCredentialsInputSchema>
