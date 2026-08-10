import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { HomePage } from '../routes/HomePage'
import { QueuePage } from '../routes/QueuePage'
import { SearchPage } from '../routes/SearchPage'
import { SettingsPage } from '../routes/SettingsPage'
import { SubscriptionsPage } from '../routes/SubscriptionsPage'
import { WatchPage } from '../routes/WatchPage'
import { useAppStore } from '../store/appStore'
import { SearchIcon } from './icons'

export function Layout(): JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { settings, auth, playVideoId, queue, clearNowPlaying, openWatchById } = useAppStore()
  const [query, setQuery] = useState('')
  const history = settings.searchHistory

  const showHome = pathname === '/'
  const showSubscriptions = pathname.startsWith('/subscriptions')
  const showSearch = pathname.startsWith('/search')
  const showQueue = pathname.startsWith('/queue')
  const showSettings = pathname.startsWith('/settings')
  const showPlay = pathname === '/play' || pathname.startsWith('/watch/')
  const cinemaPlay = showPlay && settings.player.mode === 'cinema'
  const playPath = playVideoId ? `/watch/${playVideoId}` : '/play'
  const queueCount = queue.length + (playVideoId ? 1 : 0)

  // Deep-link / refresh: hydrate nowPlaying when opening /watch/:id with no session.
  useEffect(() => {
    const match = pathname.match(/^\/watch\/([^/]+)/)
    if (!match?.[1]) return
    if (playVideoId != null) return
    void openWatchById(match[1]).catch(() => undefined)
  }, [pathname, playVideoId, openWatchById])

  function runSearch(raw: string): void {
    const q = raw.trim()
    if (!q) return
    setQuery(q)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  function onSearch(event: FormEvent): void {
    event.preventDefault()
    runSearch(query)
  }

  function dismissMiniPlayer(): void {
    clearNowPlaying()
    if (showPlay) navigate('/')
  }

  const playPanelMode = showPlay ? 'is-active' : playVideoId ? 'is-mini' : 'is-hidden'

  return (
    <div className={`app-shell${cinemaPlay ? ' cinema-shell' : ''}`}>
      <header className="chrome">
        <div className="brand">
          My<span>YouTube</span>
        </div>

        <nav className="tab-bar" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}>
            Home
          </NavLink>
          <NavLink
            to="/subscriptions"
            className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
          >
            Subscriptions
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) => `tab-link${isActive || showSearch ? ' active' : ''}`}
          >
            Search
          </NavLink>
          <NavLink
            to="/queue"
            className={({ isActive }) => `tab-link${isActive || showQueue ? ' active' : ''}`}
          >
            Queue{queueCount > 0 ? ` (${queueCount})` : ''}
          </NavLink>
          <NavLink
            to={playPath}
            className={({ isActive }) =>
              `tab-link${isActive || showPlay ? ' active' : ''}${playVideoId ? ' has-session' : ''}`
            }
          >
            Play
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
          >
            Settings
          </NavLink>
        </nav>

        <div className="topbar-end">
          {!cinemaPlay && !showSearch ? (
            <form className="topbar-search" onSubmit={onSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search YouTube…"
                aria-label="Search"
                list="search-history-top"
              />
              <select
                className="history-select"
                aria-label="Search history"
                value=""
                onChange={(e) => {
                  if (e.target.value) runSearch(e.target.value)
                }}
              >
                <option value="">History</option>
                {history.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <datalist id="search-history-top">
                {history.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
              <button
                type="submit"
                className="icon-btn primary"
                title="Search"
                aria-label="Search"
              >
                <SearchIcon />
              </button>
            </form>
          ) : null}
          <div className="topbar-actions">
            <span>{auth?.signedIn ? auth.accountLabel ?? 'Signed in' : 'Not signed in'}</span>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tab-panel" hidden={!showHome}>
          <HomePage />
        </div>
        <div className="tab-panel" hidden={!showSubscriptions}>
          <SubscriptionsPage />
        </div>
        <div className="tab-panel" hidden={!showSearch}>
          <SearchPage />
        </div>
        <div className="tab-panel" hidden={!showQueue}>
          <QueuePage />
        </div>
        <div className="tab-panel" hidden={!showSettings}>
          <SettingsPage />
        </div>
        <div
          className={`tab-panel play-panel${cinemaPlay ? ' cinema-panel' : ''} ${playPanelMode}`}
          aria-hidden={!showPlay && !playVideoId}
        >
          {playPanelMode === 'is-mini' ? (
            <div className="mini-player-chrome">
              <button
                type="button"
                className="ghost"
                onClick={() => navigate(playPath)}
                title="Open Play tab"
              >
                Expand
              </button>
              <button
                type="button"
                className="ghost mini-player-close"
                onClick={dismissMiniPlayer}
                title="Close player"
                aria-label="Close player"
              >
                ×
              </button>
            </div>
          ) : null}
          <WatchPage />
        </div>
      </main>
    </div>
  )
}
