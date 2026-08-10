import { z } from 'zod'

export const UpdateCheckResultSchema = z.object({
  currentVersion: z.string(),
  updateAvailable: z.boolean(),
  latestVersion: z.string().nullable(),
  installerPath: z.string().nullable(),
  installerName: z.string().nullable(),
  checkedAt: z.string(),
  folder: z.string()
})

export type UpdateCheckResult = z.infer<typeof UpdateCheckResultSchema>

export const InstallUpdateInputSchema = z.object({
  installerPath: z.string().min(1)
})
