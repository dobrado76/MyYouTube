import type { Video } from '@shared/schemas/video'

/** Max manual/auto page fetches that find nothing visible before stopping pagination. */
export const MAX_STALE_VISIBLE_PAGE_LOADS = 8

export type FeedPaginationState = {
  staleVisibleLoads: number
  exhausted: boolean
}

export const INITIAL_FEED_PAGINATION_STATE: FeedPaginationState = {
  staleVisibleLoads: 0,
  exhausted: false
}

export function nextFeedPaginationState(
  state: FeedPaginationState,
  opts: {
    visibleCount: number
    pageItemCount: number
    nextCursor: string | null
  }
): FeedPaginationState {
  if (opts.visibleCount > 0) {
    return INITIAL_FEED_PAGINATION_STATE
  }
  const staleVisibleLoads = state.staleVisibleLoads + 1
  if (opts.pageItemCount === 0 && !opts.nextCursor) {
    return { staleVisibleLoads, exhausted: true }
  }
  if (staleVisibleLoads >= MAX_STALE_VISIBLE_PAGE_LOADS) {
    return { staleVisibleLoads, exhausted: true }
  }
  return { staleVisibleLoads, exhausted: false }
}

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

export type ApplyFeedPageResult = {
  mergedItems: Video[]
  visibleCount: number
  pagination: FeedPaginationState
  nextCursor: string | null
}

/** Apply one feed page to prior items and update pagination (always counts the fetch). */
export function applyFeedPage(
  prev: Video[],
  pageItems: Video[],
  reset: boolean,
  omittedIds: readonly string[],
  pagination: FeedPaginationState,
  nextCursor: string | null,
  visibleOf: (items: Video[]) => number
): ApplyFeedPageResult {
  const mergedItems = mergeFeedPageItems(prev, pageItems, reset, omittedIds)
  const visibleCount = visibleOf(mergedItems)
  const nextPagination = nextFeedPaginationState(pagination, {
    visibleCount,
    pageItemCount: pageItems.length,
    nextCursor
  })
  return {
    mergedItems,
    visibleCount,
    pagination: nextPagination,
    nextCursor: nextPagination.exhausted ? null : nextCursor
  }
}
