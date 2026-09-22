import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

export function ChannelPage({ active }: Props): JSX.Element {
  const activated = useActivated(active)
  const navigate = useNavigate()
  const { channelId: routeChannelId } = useParams()
  const {
    activeChannel,
    openChannel,
    clearActiveChannel,
    hideShorts,
    unwatchedOnly,
    setHideShorts,
    setUnwatchedOnly,
    omitFromDiscovery,
    settings,
    auth,
    signIn,
    feedEpoch,
    notifyFeedRefreshed
  } = useAppStore()
  const sortedIds = useSortedVideoIds()
  const omittedIds = useOmittedDiscoveryIds()

  const channelId = activeChannel?.id ?? routeChannelId ?? null
  const channelTitle = activeChannel?.title ?? channelId ?? 'Channel'

  const [items, setItems] = useState<Video[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [filterExhausted, setFilterExhausted] = useState(false)
  const loadGeneration = useRef(0)
  const paginationRef = useRef<FeedPaginationState>(INITIAL_FEED_PAGINATION_STATE)

  useEffect(() => {
    if (!routeChannelId) return
    if (activeChannel?.id === routeChannelId) return
    openChannel({ id: routeChannelId, title: routeChannelId })
  }, [routeChannelId, activeChannel?.id, openChannel])

  useEffect(() => {
    if (activated) return
    loadGeneration.current += 1
  }, [activated])

  const load = useCallback(
    async (opts?: { reset?: boolean; cursor?: string | null }) => {
      if (!channelId) return
      const generation = ++loadGeneration.current
      setError(null)
      try {
        const page = await callApi(() =>
          window.myyoutube.feed.query({
            mode: 'chrono',
            cursor: opts?.cursor ?? null,
            filters: {
              hideShorts,
              unwatchedOnly,
              channelId
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

        if (opts?.reset) {
          const fromPage = page.items[0]?.channelTitle
          if (fromPage) openChannel({ id: channelId, title: fromPage })
        }
      } catch (err) {
        if (generation !== loadGeneration.current) return
        setError(err instanceof Error ? err.message : 'Failed to load channel')
      } finally {
        if (generation === loadGeneration.current) setLoading(false)
      }
    },
    [channelId, hideShorts, unwatchedOnly, openChannel]
  )

  const nextSessionKey =
    channelId != null
      ? `${channelId}|${hideShorts ? 1 : 0}|${unwatchedOnly ? 1 : 0}|${feedEpoch}`
      : null

  useEffect(() => {
    if (!activated) return
    if (!channelId || !nextSessionKey) {
      setItems([])
      setCursor(null)
      setSessionKey(null)
      setLoading(false)
      return
    }
    if (sessionKey === nextSessionKey) return
    setSessionKey(nextSessionKey)
    paginationRef.current = INITIAL_FEED_PAGINATION_STATE
    setFilterExhausted(false)
    setLoading(true)
    setItems([])
    setCursor(null)
    void load({ reset: true })
  }, [activated, channelId, nextSessionKey, sessionKey, load])

  const visibleItems = useMemo(
    () =>
      filterDiscoveryVideos(items, sortedIds, unwatchedOnly, {
        watchedThreshold: settings.watchedThreshold,
        omittedIds
      }),
    [items, sortedIds, unwatchedOnly, settings.watchedThreshold, omittedIds]
  )


  // After triage clears the visible page, keep fetching until something shows or the feed ends.
  useEffect(() => {
    if (!activated || loading || loadingMore || refreshing || error) return
    if (visibleItems.length > 0 || !cursor || filterExhausted) return
    let cancelled = false
    setLoadingMore(true)
    void load({ cursor }).finally(() => {
      if (!cancelled) setLoadingMore(false)
    })
    return () => {
      cancelled = true
      setLoadingMore(false)
    }
  }, [
    activated,
    visibleItems.length,
    cursor,
    filterExhausted,
    loading,
    loadingMore,
    refreshing,
    error,
    load
  ])

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
    if (!channelId) return
    setRefreshing(true)
    setError(null)
    try {
      if (!auth?.signedIn) {
        await signIn()
      }
      await callApi(() => window.myyoutube.channels.refreshUploads(channelId))
      notifyFeedRefreshed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  function hideVideo(videoId: string): void {
    // Do not bump loadGeneration — that aborts in-flight loads and sticks loading.
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function markWatched(videoId: string): Promise<void> {
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
    await callApi(() => window.myyoutube.history.markWatched(videoId, true))
  }

  function closeChannel(): void {
    loadGeneration.current += 1
    clearActiveChannel()
    setItems([])
    setCursor(null)
    setSessionKey(null)
    navigate('/')
  }

  if (!channelId) {
    return (
      <section>
        <p className="muted">No channel selected. Open one from a video card.</p>
      </section>
    )
  }

  const busy = loading || loadingMore || refreshing
  const trulyEmpty = !busy && visibleItems.length === 0 && !cursor && !filterExhausted
  const canLoadMore = Boolean(cursor) && !filterExhausted && !busy

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 title={channelTitle}>{channelTitle}</h1>
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
        <div className="header-actions">
          <button
            type="button"
            className="primary"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="ghost" onClick={closeChannel} title="Close channel">
            Close
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {busy && visibleItems.length === 0 ? (
        <p className="muted">
          {refreshing ? 'Syncing uploads…' : loadingMore ? 'Loading more…' : 'Loading channel…'}
        </p>
      ) : null}

      {!busy && visibleItems.length === 0 && canLoadMore ? (
        <p className="muted">
          Nothing visible on this page matches your filters. Load more or adjust filters above.
        </p>
      ) : null}

      {filterExhausted && visibleItems.length === 0 && !busy ? (
        <p className="empty">
          No more videos match your filters in the local library
          {hideShorts ? ' (Shorts are hidden)' : ''}
          {unwatchedOnly ? ' (watched and queued are hidden)' : ''}. Try turning off filters or
          use Refresh to sync more uploads.
        </p>
      ) : null}

      {trulyEmpty ? (
        <p className="empty">
          No videos for this channel in the local library
          {hideShorts ? ' (Shorts are hidden)' : ''}
          {unwatchedOnly ? ' (watched and queued are hidden)' : ''}.
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
