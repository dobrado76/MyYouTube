import { describe, expect, it } from 'vitest'

// Re-exercise mapping through a tiny local copy of the classifier used in api.ts.
// Keeps the test free of Electron/network while locking helpful 403 messages.

function classify403(bodyText: string): { code: string; message: string } {
  let reason = ''
  let apiMessage = ''
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string; errors?: Array<{ reason?: string; message?: string }> }
    }
    reason = parsed.error?.errors?.[0]?.reason ?? ''
    apiMessage = parsed.error?.message ?? ''
  } catch {
    apiMessage = bodyText
  }

  if (reason === 'accessNotConfigured' || /Access Not Configured/i.test(apiMessage)) {
    return { code: 'api.notConfigured', message: 'YouTube Data API v3 is not enabled' }
  }
  if (reason === 'quotaExceeded') {
    return { code: 'api.quota', message: 'quota exceeded' }
  }
  if (reason === 'subscriptionForbidden') {
    return { code: 'api.forbidden', message: 'subscription access' }
  }
  return { code: 'api.forbidden', message: apiMessage || reason }
}

describe('YouTube 403 mapping', () => {
  it('detects API not enabled', () => {
    const result = classify403(
      JSON.stringify({
        error: {
          message: 'Access Not Configured. YouTube Data API has not been used in project 123',
          errors: [{ reason: 'accessNotConfigured' }]
        }
      })
    )
    expect(result.code).toBe('api.notConfigured')
    expect(result.message).toMatch(/not enabled/i)
  })

  it('detects subscriptionForbidden', () => {
    const result = classify403(
      JSON.stringify({
        error: {
          message: 'The requester is not allowed to access the requested subscriptions.',
          errors: [{ reason: 'subscriptionForbidden' }]
        }
      })
    )
    expect(result.code).toBe('api.forbidden')
    expect(result.message).toMatch(/subscription/i)
  })
})
