import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { Video } from '@shared/schemas/video'
import { VideoCard } from '../components/VideoCard'
import { callApi } from '../lib/api'
import {
  filterDiscoveryVideos,
  countVisibleDiscoveryVideos,
  sortedVideoIdList,
  useOmittedDiscoveryIds,
  useSortedVideoIds
} from '../lib/discovery'
import {
  INITIAL_FEED_PAGINATION_STATE,
  applyFeedPage,
  type FeedPaginationState
} from '../lib/feedLoader'
import { useActivated } from '../lib/sessionRoute'
import { useAppStore } from '../store/appStore'

type Props = {
  active: boolean
}

export function HomePage({ active }: Props): JSX.Element {
  const activated = useActivated(active)
  const {
    auth,
    hideShorts,
    unwatchedOnly,
    setHideShorts,
    setUnwatchedOnly,
    omitFromDiscovery,
    settings,
    feedEpoch
  } = useAppStore()
  const sortedIds = useSortedVideoIds()
  const omittedIds = useOmittedDiscoveryIds()
  const [items, setItems] = useState<Video[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [matchingTotal, setMatchingTotal] = useState(0)
  const [libraryTotal, setLibraryTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterExhausted, setFilterExhausted] = useState(false)
  const loadGeneration = useRef(0)
  const paginationRef = useRef<FeedPaginationState>(INITIAL_FEED_PAGINATION_STATE)
  const autoFillRef = useRef(false)
  const cursorRef = useRef<string | null>(null)
  cursorRef.current = cursor

  // Abort in-flight work when the tab is hidden (keep-alive leaves `activated` true).
  useEffect(() => {
    if (active) return
    loadGeneration.current += 1
    autoFillRef.current = false
    setLoading(false)
    setLoadingMore(false)
    setRefreshing(false)
  }, [active])

  const load = useCallback(
    async (opts?: { reset?: boolean; cursor?: string | null }) => {
      const generation = ++loadGeneration.current
      const isReset = Boolean(opts?.reset)
      if (isReset) setLoading(true)
      setError(null)
      try {
        const page = await callApi(() =>
          window.myyoutube.feed.query({
            mode: 'chrono',
            cursor: opts?.cursor ?? null,
            filters: {
              hideShorts,
              unwatchedOnly
            },
            excludeVideoIds: sortedVideoIdList(),
            limit: 24
          })
        )
        if (generation !== loadGeneration.current) return null

        const omitted = useAppStore.getState().omittedDiscoveryIds
        const startPagination = opts?.reset
          ? INITIAL_FEED_PAGINATION_STATE
          : paginationRef.current

        let applied!: ReturnType<typeof applyFeedPage>
        setItems((prev) => {
          applied = applyFeedPage(
            opts?.reset ? [] : prev,
            page.items,
            Boolean(opts?.reset),
            omitted,
            startPagination,
            page.nextCursor,
            countVisibleDiscoveryVideos
          )
          return applied.mergedItems
        })

        paginationRef.current = applied.pagination
        setFilterExhausted(applied.pagination.exhausted && applied.visibleCount === 0)
        setCursor(applied.nextCursor)
        if (typeof page.matchingTotal === 'number') setMatchingTotal(page.matchingTotal)
        if (typeof page.libraryTotal === 'number') setLibraryTotal(page.libraryTotal)
        return applied
      } catch (err) {
        if (generation !== loadGeneration.current) return null
        setError(err instanceof Error ? err.message : 'Failed to load feed')
        return null
      } finally {
        if (isReset && generation === loadGeneration.current) setLoading(false)
      }
    },
    [hideShorts, unwatchedOnly]
  )

  useEffect(() => {
    if (!activated) return
    paginationRef.current = INITIAL_FEED_PAGINATION_STATE
    setFilterExhausted(false)
    void load({ reset: true })
    // feedEpoch: reload after Subscriptions sync (keep-alive otherwise stays stale).
  }, [load, activated, feedEpoch])

  const visibleItems = useMemo(
    () =>
      filterDiscoveryVideos(items, sortedIds, unwatchedOnly, {
        watchedThreshold: settings.watchedThreshold,
        omittedIds
      }),
    [items, sortedIds, unwatchedOnly, settings.watchedThreshold, omittedIds]
  )

  // After triage clears the visible page, keep fetching until something shows or the feed ends.
  // Single-flight loop: do not re-enter on loadingMore/cursor updates (that caused the flash).
  useEffect(() => {
    if (!active || loading || refreshing || error) return
    if (visibleItems.length > 0 || filterExhausted) return
    if (!cursorRef.current) return
    if (autoFillRef.current) return

    let cancelled = false
    autoFillRef.current = true
    setLoadingMore(true)
    let nextCursor: string | null = cursorRef.current

    void (async () => {
      try {
        while (!cancelled && nextCursor) {
          const applied = await load({ cursor: nextCursor })
          if (cancelled || !applied) break
          if (applied.visibleCount > 0) break
          if (applied.pagination.exhausted || !applied.nextCursor) break
          nextCursor = applied.nextCursor
        }
      } finally {
        autoFillRef.current = false
        if (!cancelled) setLoadingMore(false)
      }
    })()

    return () => {
      cancelled = true
      autoFillRef.current = false
      setLoadingMore(false)
    }
  }, [active, visibleItems.length, filterExhausted, loading, refreshing, error, load])

  async function loadMore(): Promise<void> {
    if (!cursor || loadingMore || filterExhausted) return
    setLoadingMore(true)
    try {
      await load({ cursor })
    } finally {
      setLoadingMore(false)
    }
  }

  /** Reload the local feed only. YouTube import is Subscriptions → Sync (can take minutes). */
  async function refresh(): Promise<void> {
    setRefreshing(true)
    setError(null)
    paginationRef.current = INITIAL_FEED_PAGINATION_STATE
    setFilterExhausted(false)
    try {
      await load({ reset: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  function hideVideo(videoId: string): void {
    // Do not bump loadGeneration — that aborts in-flight load and sticks loading.
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function markWatched(videoId: string): Promise<void> {
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
    await callApi(() => window.myyoutube.history.markWatched(videoId, true))
  }

  const busy = loading || loadingMore || refreshing
  const trulyEmpty =
    !busy && visibleItems.length === 0 && !cursor && !filterExhausted && libraryTotal === 0
  const filteredEmpty =
    !busy && visibleItems.length === 0 && !cursor && !filterExhausted && libraryTotal > 0
  const canLoadMore = Boolean(cursor) && !filterExhausted && !busy

  const emptyBusyMessage = refreshing
    ? 'Refreshing feed…'
    : loadingMore
      ? 'Loading more…'
      : 'Loading feed…'

  const libraryHint =
    libraryTotal > 0
      ? `${libraryTotal.toLocaleString()} cached` +
        (matchingTotal !== libraryTotal
          ? ` · ${matchingTotal.toLocaleString()} match filters`
          : '') +
        (canLoadMore || visibleItems.length > 0
          ? ` · showing ${visibleItems.length.toLocaleString()}`
          : '')
      : null

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Personal feed</h1>
          {libraryHint ? (
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {libraryHint}
            </p>
          ) : null}
          <div className="header-filters" style={{ marginTop: '0.65rem' }}>
            <label className="filter-row">
              <input
                type="checkbox"
                checked={hideShorts}
                onChange={(e) => setHideShorts(e.target.checked)}
              />
              Hide Shorts
            </label>
            <label className="filter-row">
              <input
                type="checkbox"
                checked={unwatchedOnly}
                onChange={(e) => setUnwatchedOnly(e.target.checked)}
              />
              Unwatched only
            </label>
          </div>
        </div>
        <button type="button" className="primary" disabled={busy} onClick={() => void refresh()}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!auth?.signedIn ? (
        <p className="muted">
          Sign in, then use <strong>Subscriptions → Sync</strong> to import channels and uploads.
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {busy && visibleItems.length === 0 ? <p className="muted">{emptyBusyMessage}</p> : null}

      {!busy && visibleItems.length === 0 && canLoadMore ? (
        <p className="muted">
          Nothing visible on this page matches your filters. Load more or adjust filters above.
        </p>
      ) : null}

      {filterExhausted && visibleItems.length === 0 && !busy ? (
        <p className="empty">
          No more videos match your filters
          {hideShorts ? ' (Shorts are hidden)' : ''}
          {unwatchedOnly ? ' (watched and queued are hidden)' : ''}. Try turning off filters, or sync
          new uploads from Subscriptions.
        </p>
      ) : null}

      {filteredEmpty ? (
        <p className="empty">
          {libraryTotal.toLocaleString()} videos are cached, but none match your current filters
          {hideShorts ? ' (Shorts are hidden)' : ''}
          {unwatchedOnly ? ' (watched and queued are hidden)' : ''}. Try turning filters off, or use{' '}
          <strong>Load more</strong> after relaxing them.
        </p>
      ) : null}

      {trulyEmpty ? (
        <p className="empty">
          No videos cached yet. Open <strong>Subscriptions → Sync</strong> to import uploads (newest
          ~100 per channel).
        </p>
      ) : null}

      <div className="video-grid">
        {visibleItems.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onHide={hideVideo}
            onMarkWatched={(id) => void markWatched(id)}
          />
        ))}
      </div>

      {canLoadMore ? (
        <div className="load-more">
          <button type="button" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore
              ? 'Loading…'
              : `Load more${matchingTotal > visibleItems.length ? ` (${(matchingTotal - visibleItems.length).toLocaleString()} left)` : ''}`}
          </button>
        </div>
      ) : null}
    </section>
  )
}
