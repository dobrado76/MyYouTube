import type { Video } from '@shared/schemas/video'

/** Merge a feed page into local state, dropping session-dismissed and hidden rows. */
export function mergeFeedPageItems(
  prev: Video[],
  incoming: Video[],
  reset: boolean,
  omittedIds: ReadonlySet<string> | readonly string[]
): Video[] {
  const omitted = omittedIds instanceof Set ? omittedIds : new Set(omittedIds)
  const filtered = incoming.filter((video) => !omitted.has(video.id) && !video.hidden)
  if (reset) return filtered
  const seen = new Set(prev.map((video) => video.id))
  const merged = [...prev]
  for (const video of filtered) {
    if (seen.has(video.id)) continue
    merged.push(video)
    seen.add(video.id)
  }
  return merged
}
