import { describe, expect, it } from 'vitest'
import { mockVideos } from './fixtures'

function inferShort(durationSeconds: number | null | undefined): boolean | null {
  if (durationSeconds == null) return null
  return durationSeconds <= 60
}

describe('shorts heuristic', () => {
  it('flags videos under or equal to 60s as Shorts', () => {
    const shorts = mockVideos.filter((v) => inferShort(v.durationSeconds))
    expect(shorts.length).toBeGreaterThan(0)
    expect(shorts.every((v) => (v.durationSeconds ?? 999) <= 60)).toBe(true)
  })

  it('keeps long-form videos out of Shorts', () => {
    const longForm = mockVideos.filter((v) => inferShort(v.durationSeconds) === false)
    expect(longForm.some((v) => v.id === 'vid_rust_async')).toBe(true)
  })
})
