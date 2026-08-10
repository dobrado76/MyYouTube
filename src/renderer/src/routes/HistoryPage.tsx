import { useCallback, useEffect, useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HistoryVideo } from '@shared/schemas/historyList'
import { videoToQueueItem } from '@shared/schemas/queue'
import {
  PlayIcon,
  PrefBlockedIcon,
  QueueIcon,
  SearchIcon,
  UndoIcon,
  VisibilityIcon
} from '../components/icons'
import { callApi, formatAge, formatDuration } from '../lib/api'
import { useAppStore } from '../store/appStore'

const SECTIONS = [
  { id: 'watched', label: 'Watched' },
  { id: 'hidden', label: 'Hidden' }
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const SECTION_COPY: Record<SectionId, { title: string; blurb: string }> = {
  watched: {
    title: 'Watched',
    blurb: 'Videos marked watched, newest mark first. Restore to clear the watched flag.'
  },
  hidden: {
    title: 'Hidden',
    blurb: 'Videos you hid from the feed, newest hide first. Unhide returns them to Home.'
  }
}

const SEARCH_DEBOUNCE_MS = 280

export function HistoryPage(): JSX.Element {
  const navigate = useNavigate()
  const { watchNow, enqueue } = useAppStore()
  const [section, setSection] = useState<SectionId>('watched')
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<HistoryVideo[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce filter text; reset when switching Watched / Hidden.
  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(draft.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [draft])

  const loadVideos = useCallback(
    async (opts?: { reset?: boolean; cursor?: string | null }) => {
      setError(null)
      try {
        const page = await callApi(() =>
          section === 'watched'
            ? window.myyoutube.history.listWatched({
                cursor: opts?.cursor ?? null,
                limit: 40,
                query
              })
            : window.myyoutube.history.listHidden({
                cursor: opts?.cursor ?? null,
                limit: 40,
                query
              })
        )
        setItems((prev) => (opts?.reset ? page.items : [...prev, ...page.items]))
        setCursor(page.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    },
    [section, query]
  )

  useEffect(() => {
    setLoading(true)
    setItems([])
    setCursor(null)
    void loadVideos({ reset: true })
  }, [loadVideos])

  function switchSection(next: SectionId): void {
    setSection(next)
    setDraft('')
    setQuery('')
  }

  async function restoreWatched(videoId: string): Promise<void> {
    await callApi(() => window.myyoutube.history.unmarkWatched(videoId))
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function restoreHidden(videoId: string): Promise<void> {
    await callApi(() => window.myyoutube.videos.unhide(videoId))
    setItems((prev) => prev.filter((v) => v.id !== videoId))
  }

  async function blockChannel(channelId: string): Promise<void> {
    await callApi(() => window.myyoutube.channels.setPreference(channelId, 'blocked'))
    setItems((prev) => prev.filter((v) => v.channelId !== channelId))
  }

  function playVideo(video: HistoryVideo): void {
    watchNow(videoToQueueItem(video))
    navigate(`/watch/${video.id}`)
  }

  function queueVideo(video: HistoryVideo): void {
    enqueue(videoToQueueItem(video))
  }

  const copy = SECTION_COPY[section]
  const filterPlaceholder =
    section === 'watched' ? 'Filter watched…' : 'Filter hidden…'

  return (
    <div className="settings-page history-page">
      <aside className="settings-nav" aria-label="History sections">
        <div className="settings-nav-title">History</div>
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`settings-nav-link${section === item.id ? ' active' : ''}`}
            onClick={() => switchSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="settings-pane">
        <header className="settings-pane-header">
          <h1>{copy.title}</h1>
          <p>{copy.blurb}</p>
        </header>

        <div className="history-filter-bar">
          <SearchIcon />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            maxLength={200}
          />
          {draft ? (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setDraft('')
                setQuery('')
              }}
              title="Clear filter"
              aria-label="Clear filter"
            >
              Clear
            </button>
          ) : null}
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="settings-stack">
          {loading && items.length === 0 ? <p className="muted">Loading…</p> : null}
          {!loading && items.length === 0 ? (
            <p className="muted">
              {query
                ? `No matches for “${query}” in ${section === 'watched' ? 'Watched' : 'Hidden'}.`
                : 'Nothing here yet.'}
            </p>
          ) : null}

          <ul className="history-list">
            {items.map((video) => (
              <li key={video.id}>
                <article className="history-row">
                  <button
                    type="button"
                    className="history-row-thumb"
                    onClick={() => playVideo(video)}
                    title="Watch now"
                    aria-label={`Watch ${video.title}`}
                  >
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="history-row-thumb-empty" />
                    )}
                  </button>
                  <div className="history-row-meta">
                    <button
                      type="button"
                      className="linkish history-row-title"
                      onClick={() => playVideo(video)}
                      title={video.title}
                    >
                      {video.title}
                    </button>
                    <p>
                      <span className="history-row-channel">
                        {video.channelTitle ?? video.channelId}
                      </span>
                      {video.durationSeconds != null
                        ? ` · ${formatDuration(video.durationSeconds)}`
                        : ''}
                      {video.markedAt ? ` · ${formatAge(video.markedAt)}` : ''}
                    </p>
                  </div>
                  <div className="history-row-actions">
                    <button
                      type="button"
                      className="icon-btn primary"
                      onClick={() => playVideo(video)}
                      title="Watch now"
                      aria-label="Watch now"
                    >
                      <PlayIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => queueVideo(video)}
                      title="Watch later"
                      aria-label="Watch later"
                    >
                      <QueueIcon />
                    </button>
                    {section === 'watched' ? (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void restoreWatched(video.id)}
                        title="Restore (clear watched)"
                        aria-label="Restore (clear watched)"
                      >
                        <UndoIcon />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void restoreHidden(video.id)}
                        title="Unhide"
                        aria-label="Unhide"
                      >
                        <VisibilityIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => void blockChannel(video.channelId)}
                      title="Block channel"
                      aria-label="Block channel"
                    >
                      <PrefBlockedIcon />
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          {cursor ? (
            <div className="settings-actions">
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadVideos({ cursor })}
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
