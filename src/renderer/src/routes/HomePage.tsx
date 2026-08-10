import { useCallback, useEffect, useState, type JSX } from 'react'
import type { Video } from '@shared/schemas/video'
import { VideoCard } from '../components/VideoCard'
import { callApi } from '../lib/api'
import { useAppStore } from '../store/appStore'

export function HomePage(): JSX.Element {
  const { auth, hideShorts, unwatchedOnly, setHideShorts, setUnwatchedOnly, signIn } =
    useAppStore()
  const [items, setItems] = useState<Video[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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
    setLoading(true)
    void load({ reset: true })
  }, [load])

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

  async function hideVideo(videoId: string): Promise<void> {
    await callApi(() => window.myyoutube.videos.hide(videoId))
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function markWatched(videoId: string): Promise<void> {
    await callApi(() => window.myyoutube.history.markWatched(videoId, true))
    setItems((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, watched: true, watchProgress: 1 } : v))
    )
  }

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
      {loading ? <p className="muted">Loading cached feed…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="empty">
          No videos yet. Use Refresh to sync subscriptions
          {hideShorts ? ' (Shorts are hidden)' : ''}.
        </p>
      ) : null}

      <div className="video-grid">
        {items.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onHide={(id) => void hideVideo(id)}
            onMarkWatched={(id) => void markWatched(id)}
          />
        ))}
      </div>

      {cursor ? (
        <div className="load-more">
          <button type="button" onClick={() => void load({ cursor })}>
            Load more
          </button>
        </div>
      ) : null}
    </section>
  )
}
