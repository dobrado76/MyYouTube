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

/** Session-dismissed ids (hide / not-watching) kept off all Discovery surfaces. */
export function useOmittedDiscoveryIds(): Set<string> {
  const omittedKey = useAppStore((s) => s.omittedDiscoveryIds.join('\0'))
  return useMemo(
    () => new Set(omittedKey ? omittedKey.split('\0') : []),
    [omittedKey]
  )
}

export function sortedVideoIdList(): string[] {
  const { nowPlaying, queue } = useAppStore.getState()
  const ids = new Set<string>()
  if (nowPlaying) ids.add(nowPlaying.id)
  for (const item of queue) ids.add(item.id)
  return [...ids]
}

export function isVideoWatched(video: Video, watchedThreshold: number): boolean {
  if (video.watched) return true
  if (video.watchProgress != null && video.watchProgress >= watchedThreshold) return true
  return false
}

/** Filter discovery lists: drop Sorted / omitted / hidden; optionally drop watched. */
export function filterDiscoveryVideos(
  items: Video[],
  sortedIds: Set<string>,
  unwatchedOnly: boolean,
  opts?: { watchedThreshold?: number; omittedIds?: Set<string> }
): Video[] {
  const threshold = opts?.watchedThreshold ?? 0.7
  const omittedIds = opts?.omittedIds
  return items.filter((video) => {
    if (omittedIds?.has(video.id)) return false
    if (video.hidden) return false
    if (sortedIds.has(video.id)) return false
    if (unwatchedOnly && isVideoWatched(video, threshold)) return false
    return true
  })
}
