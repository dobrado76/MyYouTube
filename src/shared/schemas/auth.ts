import { z } from 'zod'

export const AuthStatusSchema = z.object({
  signedIn: z.boolean(),
  accountLabel: z.string().nullable(),
  /** Google profile photo URL (OpenID `picture`), when available. */
  accountPictureUrl: z.string().min(1).nullable(),
  provider: z.enum(['mock', 'live']),
  mockMode: z.boolean()
})

export type AuthStatus = z.infer<typeof AuthStatusSchema>
