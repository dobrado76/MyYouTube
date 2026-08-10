import { useMemo } from 'react'
import type { Video } from '@shared/schemas/video'
import { useAppStore } from '../store/appStore'

/**
 * Sorted session ids (now playing + up-next). Discovery surfaces must omit these —
 * Queue is the only place triage/"wanna watch" items belong.
 */
export function useSortedVideoIds(): Set<string> {
  const nowPlayingId = useAppStore((s) => s.nowPlaying?.id ?? null)
  const queueIds = useAppStore((s) => s.queue.map((q) => q.id).join('\0'))
  return useMemo(() => {
    const ids = new Set(queueIds ? queueIds.split('\0') : [])
    if (nowPlayingId) ids.add(nowPlayingId)
    return ids
  }, [nowPlayingId, queueIds])
}

export function sortedVideoIdList(): string[] {
  const { nowPlaying, queue } = useAppStore.getState()
  const ids = new Set<string>()
  if (nowPlaying) ids.add(nowPlaying.id)
  for (const item of queue) ids.add(item.id)
  return [...ids]
}

/** Filter discovery lists: drop Sorted; optionally drop watched. */
export function filterDiscoveryVideos(
  items: Video[],
  sortedIds: Set<string>,
  unwatchedOnly: boolean
): Video[] {
  return items.filter((video) => {
    if (sortedIds.has(video.id)) return false
    if (unwatchedOnly && video.watched) return false
    return true
  })
}
