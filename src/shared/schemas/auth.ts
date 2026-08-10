import { z } from 'zod'

export const AuthStatusSchema = z.object({
  signedIn: z.boolean(),
  accountLabel: z.string().nullable(),
  provider: z.enum(['mock', 'live']),
  mockMode: z.boolean()
})

export type AuthStatus = z.infer<typeof AuthStatusSchema>
