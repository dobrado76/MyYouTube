import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Video } from '@shared/schemas/video'
import { VideoCard } from '../components/VideoCard'
import { callApi } from '../lib/api'
import {
  filterDiscoveryVideos,
  sortedVideoIdList,
  useOmittedDiscoveryIds,
  useSortedVideoIds
} from '../lib/discovery'
import { mergeFeedPageItems } from '../lib/feedLoader'
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
  const loadGeneration = useRef(0)

  useEffect(() => {
    if (!routeChannelId) return
    if (activeChannel?.id === routeChannelId) return
    openChannel({ id: routeChannelId, title: routeChannelId })
  }, [routeChannelId, activeChannel?.id, openChannel])

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
        setItems((prev) =>
          mergeFeedPageItems(prev, page.items, Boolean(opts?.reset), omitted)
        )
        setCursor(page.nextCursor)
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
    // Keep-alive: returning to this tab with the same channel + filters keeps scroll/items.
    if (sessionKey === nextSessionKey) return
    setSessionKey(nextSessionKey)
    setLoading(true)
    setItems([])
    setCursor(null)
    void load({ reset: true })
  }, [activated, channelId, nextSessionKey, sessionKey, load])

  // Discovery ≠ Sorted: queued / now-playing never appear on Channel (same as Home).
  const visibleItems = useMemo(
    () =>
      filterDiscoveryVideos(items, sortedIds, unwatchedOnly, {
        watchedThreshold: settings.watchedThreshold,
        omittedIds
      }),
    [items, sortedIds, unwatchedOnly, settings.watchedThreshold, omittedIds]
  )

  useEffect(() => {
    if (!activated || loading || loadingMore || refreshing || error) return
    if (visibleItems.length > 0 || !cursor) return
    let cancelled = false
    setLoadingMore(true)
    void load({ cursor }).finally(() => {
      if (!cancelled) setLoadingMore(false)
    })
    return () => {
      cancelled = true
      setLoadingMore(false)
    }
  }, [activated, visibleItems.length, cursor, loading, loadingMore, refreshing, error, load])

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

  function closeChannel(): void {
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
  const trulyEmpty = !busy && visibleItems.length === 0 && !cursor

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

      {cursor && visibleItems.length > 0 ? (
        <div className="load-more">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => {
              setLoadingMore(true)
              void load({ cursor }).finally(() => setLoadingMore(false))
            }}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
