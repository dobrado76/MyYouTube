import { z } from 'zod'

export const AppErrorSchema = z.object({
  code: z.string(),
  message: z.string()
})

export type AppError = z.infer<typeof AppErrorSchema>

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err(code: string, message: string): Result<never> {
  return { ok: false, error: { code, message } }
}

export function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok
}
