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
    signIn,
    omitFromDiscovery,
    settings,
    notifyFeedRefreshed
  } = useAppStore()
  const sortedIds = useSortedVideoIds()
  const omittedIds = useOmittedDiscoveryIds()
  const [items, setItems] = useState<Video[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterExhausted, setFilterExhausted] = useState(false)
  const loadGeneration = useRef(0)
  const paginationRef = useRef<FeedPaginationState>(INITIAL_FEED_PAGINATION_STATE)

  useEffect(() => {
    if (activated) return
    loadGeneration.current += 1
  }, [activated])

  const load = useCallback(
    async (opts?: { reset?: boolean; cursor?: string | null }) => {
      const generation = ++loadGeneration.current
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
        if (generation !== loadGeneration.current) return

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
      } catch (err) {
        if (generation !== loadGeneration.current) return
        setError(err instanceof Error ? err.message : 'Failed to load feed')
      } finally {
        if (generation === loadGeneration.current) setLoading(false)
      }
    },
    [hideShorts, unwatchedOnly]
  )

  useEffect(() => {
    if (!activated) return
    paginationRef.current = INITIAL_FEED_PAGINATION_STATE
    setFilterExhausted(false)
    setLoading(true)
    void load({ reset: true })
  }, [load, activated])

  const visibleItems = useMemo(
    () =>
      filterDiscoveryVideos(items, sortedIds, unwatchedOnly, {
        watchedThreshold: settings.watchedThreshold,
        omittedIds
      }),
    [items, sortedIds, unwatchedOnly, settings.watchedThreshold, omittedIds]
  )

  async function loadMore(): Promise<void> {
    if (!cursor || loadingMore || filterExhausted) return
    setLoadingMore(true)
    try {
      await load({ cursor })
    } finally {
      setLoadingMore(false)
    }
  }

  async function refresh(): Promise<void> {
    setRefreshing(true)
    setError(null)
    try {
      if (!auth?.signedIn) {
        await signIn()
      }
      await callApi(() => window.myyoutube.feed.refresh())
      notifyFeedRefreshed()
      paginationRef.current = INITIAL_FEED_PAGINATION_STATE
      setFilterExhausted(false)
      setLoading(true)
      await load({ reset: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  function hideVideo(videoId: string): void {
    loadGeneration.current += 1
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function markWatched(videoId: string): Promise<void> {
    loadGeneration.current += 1
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
    await callApi(() => window.myyoutube.history.markWatched(videoId, true))
  }

  const busy = loading || loadingMore || refreshing
  const trulyEmpty = !busy && visibleItems.length === 0 && !cursor && !filterExhausted
  const canLoadMore = Boolean(cursor) && !filterExhausted && !busy

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Personal feed</h1>
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
        <button type="button" className="primary" disabled={refreshing} onClick={() => void refresh()}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!auth?.signedIn ? (
        <p className="muted">
          Sign in (mock mode works offline) and refresh to import subscription uploads.
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {busy && visibleItems.length === 0 ? (
        <p className="muted">{loadingMore ? 'Loading more…' : 'Loading cached feed…'}</p>
      ) : null}

      {!busy && visibleItems.length === 0 && canLoadMore ? (
        <p className="muted">
          Nothing visible on this page matches your filters. Load more or adjust filters above.
        </p>
      ) : null}

      {filterExhausted && visibleItems.length === 0 && !busy ? (
        <p className="empty">
          No more videos match your filters
          {hideShorts ? ' (Shorts are hidden)' : ''}
          {unwatchedOnly ? ' (watched and queued are hidden)' : ''}. Try turning off filters or
          use Refresh.
        </p>
      ) : null}

      {trulyEmpty ? (
        <p className="empty">
          No videos yet. Use Refresh to sync subscriptions
          {hideShorts ? ' (Shorts are hidden)' : ''}.
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
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
