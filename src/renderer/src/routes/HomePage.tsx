import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import type { Video } from '@shared/schemas/video'
import { VideoCard } from '../components/VideoCard'
import { callApi } from '../lib/api'
import {
  filterDiscoveryVideos,
  sortedVideoIdList,
  useOmittedDiscoveryIds,
  useSortedVideoIds
} from '../lib/discovery'
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
    settings
  } = useAppStore()
  const sortedIds = useSortedVideoIds()
  const omittedIds = useOmittedDiscoveryIds()
  const [items, setItems] = useState<Video[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (opts?: { reset?: boolean; cursor?: string | null }) => {
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
        setItems((prev) => (opts?.reset ? page.items : [...prev, ...page.items]))
        setCursor(page.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed')
      } finally {
        setLoading(false)
      }
    },
    [hideShorts, unwatchedOnly]
  )

  useEffect(() => {
    if (!activated) return
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

  // After triage clears the visible page, keep fetching until something shows or the feed ends.
  useEffect(() => {
    if (!activated || loading || refreshing || error) return
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
  }, [activated, visibleItems.length, cursor, loading, refreshing, error, load])

  async function refresh(): Promise<void> {
    setRefreshing(true)
    setError(null)
    try {
      if (!auth?.signedIn) {
        await signIn()
      }
      await callApi(() => window.myyoutube.feed.refresh())
      setLoading(true)
      await load({ reset: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  function hideVideo(videoId: string): void {
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function markWatched(videoId: string): Promise<void> {
    omitFromDiscovery(videoId)
    setItems((prev) => prev.filter((v) => v.id !== videoId))
    await callApi(() => window.myyoutube.history.markWatched(videoId, true))
  }

  const busy = loading || loadingMore
  const trulyEmpty = !busy && visibleItems.length === 0 && !cursor

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
