import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Video } from '@shared/schemas/video'
import { SearchIcon } from '../components/icons'
import { VideoCard } from '../components/VideoCard'
import { callApi } from '../lib/api'
import { useAppStore } from '../store/appStore'

export function SearchPage(): JSX.Element {
  const [params, setParams] = useSearchParams()
  const { settings, recordSearch, unwatchedOnly, setUnwatchedOnly } = useAppStore()
  const history = settings.searchHistory
  const lastFetchedQuery = useRef<string | null>(null)
  const inflightQuery = useRef<string | null>(null)
  const fetchGeneration = useRef(0)

  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Video[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visibleItems = unwatchedOnly ? items.filter((video) => !video.watched) : items

  async function fetchSearch(q: string, force = false): Promise<void> {
    const trimmed = q.trim()
    if (!trimmed) return
    if (!force && (lastFetchedQuery.current === trimmed || inflightQuery.current === trimmed)) {
      return
    }

    const generation = ++fetchGeneration.current
    inflightQuery.current = trimmed
    lastFetchedQuery.current = trimmed
    setLoading(true)
    setError(null)
    try {
      const page = await callApi(() =>
        window.myyoutube.search.query({ query: trimmed, limit: 20 })
      )
      if (generation !== fetchGeneration.current) return
      setItems(page.items)
      setNextPageToken(page.nextPageToken)
      await recordSearch(trimmed)
    } catch (err) {
      if (generation !== fetchGeneration.current) return
      // Allow retry after failure.
      if (lastFetchedQuery.current === trimmed) lastFetchedQuery.current = null
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      if (inflightQuery.current === trimmed) inflightQuery.current = null
      if (generation === fetchGeneration.current) setLoading(false)
    }
  }

  // Restore last history query into the URL once — does not itself hit the API.
  useEffect(() => {
    if (params.get('q') != null) return
    const last = history[0]?.trim()
    if (last) setParams({ q: last }, { replace: true })
  }, [params, history, setParams])

  useEffect(() => {
    const qParam = params.get('q')
    if (qParam == null) return
    const trimmed = qParam.trim()
    setDraft(trimmed)
    if (!trimmed) return
    setQuery(trimmed)
    void fetchSearch(trimmed)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when URL q changes
  }, [params])

  async function runSearch(raw: string): Promise<void> {
    const q = raw.trim()
    if (!q) return
    setDraft(q)
    setQuery(q)
    setParams({ q })
    await fetchSearch(q, true)
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault()
    void runSearch(draft)
  }

  async function loadMore(): Promise<void> {
    if (!nextPageToken || !query) return
    setLoading(true)
    try {
      const page = await callApi(() =>
        window.myyoutube.search.query({ query, pageToken: nextPageToken, limit: 20 })
      )
      setItems((prev) => [...prev, ...page.items])
      setNextPageToken(page.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function hideVideo(videoId: string): void {
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  return (
    <section>
      <form className="search-toolbar" onSubmit={onSubmit}>
        <input
          className="search-toolbar-query"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search videos…"
          aria-label="Search query"
          list="search-history-page"
        />
        <select
          className="history-select"
          aria-label="Search history"
          value=""
          onChange={(e) => {
            if (e.target.value) void runSearch(e.target.value)
          }}
        >
          <option value="">History</option>
          {history.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
        <datalist id="search-history-page">
          {history.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
        <button type="submit" className="icon-btn primary" title="Search" aria-label="Search">
          <SearchIcon />
        </button>
        <label className="filter-row search-toolbar-filter">
          <input
            type="checkbox"
            checked={unwatchedOnly}
            onChange={(e) => setUnwatchedOnly(e.target.checked)}
          />
          Unwatched only
        </label>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {loading && items.length === 0 ? <p className="muted">Searching…</p> : null}
      {!loading && query && items.length === 0 ? (
        <p className="empty">No results for “{query}”.</p>
      ) : null}
      {!loading && query && items.length > 0 && visibleItems.length === 0 ? (
        <p className="empty">No unwatched results for “{query}”.</p>
      ) : null}
      {!query && items.length === 0 && history.length === 0 ? (
        <p className="muted">Search from here or the top bar. Recent queries appear in History.</p>
      ) : null}

      <div className="video-grid">
        {visibleItems.map((video) => (
          <VideoCard key={video.id} video={video} onHide={hideVideo} />
        ))}
      </div>

      {nextPageToken ? (
        <div className="load-more">
          <button type="button" disabled={loading} onClick={() => void loadMore()}>
            Load more
          </button>
        </div>
      ) : null}
    </section>
  )
}
