import { useEffect, useState, type FormEvent, type JSX } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChannelPage } from '../routes/ChannelPage'
import { HistoryPage } from '../routes/HistoryPage'
import { HomePage } from '../routes/HomePage'
import { QueuePage } from '../routes/QueuePage'
import { SearchPage } from '../routes/SearchPage'
import { SettingsPage } from '../routes/SettingsPage'
import { SubscriptionsPage } from '../routes/SubscriptionsPage'
import { WatchPage } from '../routes/WatchPage'
import { routeFromLocation } from '@shared/lib/lastRoute'
import { useSessionRoutePersistence } from '../lib/sessionRoute'
import { useAppStore } from '../store/appStore'
import {
  AccountIcon,
  ChannelIcon,
  HistoryIcon,
  HomeIcon,
  PlayIcon,
  QueueIcon,
  SearchIcon,
  SettingsIcon,
  SubscriptionsIcon
} from './icons'

export function Layout(): JSX.Element {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const {
    settings,
    auth,
    playVideoId,
    queue,
    activeChannel,
    startupRoute,
    clearStartupRoute,
    clearNowPlaying,
    openWatchById
  } = useAppStore()
  const [query, setQuery] = useState('')
  const history = settings.searchHistory

  useSessionRoutePersistence()

  // Prefer startupRoute until the router hash matches — avoids Home flashing/fetching first.
  const viewPath = startupRoute ?? pathname
  useEffect(() => {
    if (!startupRoute) return
    const current = routeFromLocation(pathname, search)
    if (current !== startupRoute) {
      navigate(startupRoute, { replace: true })
      return
    }
    clearStartupRoute()
  }, [startupRoute, pathname, search, navigate, clearStartupRoute])

  const showHome = viewPath === '/'
  const showSubscriptions = viewPath.startsWith('/subscriptions')
  const showSearch = viewPath.startsWith('/search')
  const showChannel = viewPath.startsWith('/channel')
  const showQueue = viewPath.startsWith('/queue')
  const showHistory = viewPath.startsWith('/history')
  const showAccount = viewPath.startsWith('/account')
  const showSettings = viewPath.startsWith('/settings')
  const showPrefs = showAccount || showSettings
  const showPlay = viewPath === '/play' || viewPath.startsWith('/watch/')
  const cinemaPlay = showPlay && settings.player.mode === 'cinema'
  const playPath = playVideoId ? `/watch/${playVideoId}` : '/play'
  const channelPath = activeChannel ? `/channel/${activeChannel.id}` : '/channel'
  const queueCount = queue.length + (playVideoId ? 1 : 0)

  // Deep-link / refresh: hydrate nowPlaying when opening /watch/:id with no session.
  useEffect(() => {
    const match = viewPath.match(/^\/watch\/([^/]+)/)
    if (!match?.[1]) return
    if (playVideoId != null) return
    void openWatchById(match[1]).catch(() => undefined)
  }, [viewPath, playVideoId, openWatchById])

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
  const accountTooltip = auth?.signedIn
    ? (auth.accountLabel ?? 'Signed in')
    : 'Not signed in — open Account'
  const accountInitial = (auth?.accountLabel?.trim().charAt(0) || '?').toUpperCase()

  return (
    <div className={`app-shell${cinemaPlay ? ' cinema-shell' : ''}`}>
      <header className="chrome">
        <div className="chrome-start">
          <div className="brand">
            My<span>YouTube</span>
          </div>

          <nav className="tab-bar" aria-label="Main">
            <div className="tab-bar-group" aria-label="Browse">
              <NavLink
                to="/"
                end
                title="Home"
                aria-label="Home"
                className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
              >
                <HomeIcon />
              </NavLink>
              <NavLink
                to="/subscriptions"
                title="Subscriptions"
                aria-label="Subscriptions"
                className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
              >
                <SubscriptionsIcon />
              </NavLink>
              <NavLink
                to="/search"
                title="Search"
                aria-label="Search"
                className={({ isActive }) => `tab-link${isActive || showSearch ? ' active' : ''}`}
              >
                <SearchIcon />
              </NavLink>
              {activeChannel ? (
                <NavLink
                  to={channelPath}
                  title={activeChannel.title}
                  aria-label={`Channel: ${activeChannel.title}`}
                  className={({ isActive }) =>
                    `tab-link${isActive || showChannel ? ' active' : ''}`
                  }
                >
                  <ChannelIcon />
                </NavLink>
              ) : null}
            </div>
            <div className="tab-bar-group" aria-label="Library">
              <NavLink
                to="/history"
                title="History"
                aria-label="History"
                className={({ isActive }) =>
                  `tab-link${isActive || showHistory ? ' active' : ''}`
                }
              >
                <HistoryIcon />
              </NavLink>
              <NavLink
                to="/queue"
                title="Queue"
                aria-label={queueCount > 0 ? `Queue (${queueCount})` : 'Queue'}
                className={({ isActive }) =>
                  `tab-link tab-link-queue${isActive || showQueue ? ' active' : ''}`
                }
              >
                <QueueIcon />
                {queueCount > 0 ? <span className="tab-count">{queueCount}</span> : null}
              </NavLink>
              <NavLink
                to={playPath}
                title="Play"
                aria-label="Play"
                className={({ isActive }) =>
                  `tab-link${isActive || showPlay ? ' active' : ''}${playVideoId ? ' has-session' : ''}`
                }
              >
                <PlayIcon />
              </NavLink>
            </div>
          </nav>
        </div>

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
                <option value="">Recent</option>
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
          <div className="topbar-actions" aria-label="Account and settings">
            <NavLink
              to="/account"
              title={accountTooltip}
              aria-label={accountTooltip}
              className={({ isActive }) =>
                `tab-link tab-link-account${isActive || showAccount ? ' active' : ''}${auth?.signedIn ? ' is-signed-in' : ''}`
              }
            >
              {auth?.signedIn && auth.accountPictureUrl ? (
                <img className="account-avatar" src={auth.accountPictureUrl} alt="" />
              ) : auth?.signedIn ? (
                <span className="account-avatar-fallback" aria-hidden="true">
                  {accountInitial}
                </span>
              ) : (
                <AccountIcon />
              )}
            </NavLink>
            <NavLink
              to="/settings"
              title="Settings"
              aria-label="Settings"
              className={({ isActive }) => `tab-link${isActive || showSettings ? ' active' : ''}`}
            >
              <SettingsIcon />
            </NavLink>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="tab-panel" hidden={!showHome}>
          <HomePage active={showHome} />
        </div>
        <div className="tab-panel" hidden={!showSubscriptions}>
          <SubscriptionsPage />
        </div>
        <div className="tab-panel" hidden={!showSearch}>
          <SearchPage />
        </div>
        <div className="tab-panel" hidden={!showChannel}>
          <ChannelPage active={showChannel} />
        </div>
        <div className="tab-panel" hidden={!showQueue}>
          <QueuePage />
        </div>
        <div className="tab-panel" hidden={!showHistory}>
          <HistoryPage />
        </div>
        <div className="tab-panel" hidden={!showPrefs}>
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
