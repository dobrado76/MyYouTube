import { useEffect, useMemo, useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Channel, ChannelPreference } from '@shared/schemas/channel'
import type { ChannelSyncProgress } from '@shared/ipc/api'
import {
  PrefBlockedIcon,
  PrefFavouriteIcon,
  PrefMutedIcon,
  PrefNormalIcon,
  SearchIcon,
  UnsubscribeIcon
} from '../components/icons'
import { callApi } from '../lib/api'
import { useAppStore } from '../store/appStore'

const FILTER_DEBOUNCE_MS = 300

const prefs: Array<{
  id: ChannelPreference
  label: string
  Icon: () => JSX.Element
}> = [
  { id: 'normal', label: 'Normal', Icon: PrefNormalIcon },
  { id: 'favourite', label: 'Favourite', Icon: PrefFavouriteIcon },
  { id: 'muted', label: 'Muted', Icon: PrefMutedIcon },
  { id: 'blocked', label: 'Blocked', Icon: PrefBlockedIcon }
]

export function SubscriptionsPage(): JSX.Element {
  const navigate = useNavigate()
  const { auth, signIn, openChannel, notifyFeedRefreshed } = useAppStore()
  const [channels, setChannels] = useState<Channel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<ChannelSyncProgress | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [filterInput, setFilterInput] = useState('')
  const [filterQuery, setFilterQuery] = useState('')

  async function load(): Promise<void> {
    try {
      const list = await callApi(() => window.myyoutube.channels.list())
      setChannels(list.filter((c) => c.subscribed))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!busy) {
      setElapsedSec(0)
      return
    }
    const started = Date.now()
    const timer = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilterQuery(filterInput.trim())
    }, FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [filterInput])

  const filteredChannels = useMemo(() => {
    if (!filterQuery) return channels
    const needle = filterQuery.toLowerCase()
    return channels.filter((channel) => {
      const title = channel.title.toLowerCase()
      const description = (channel.description ?? '').toLowerCase()
      return title.includes(needle) || description.includes(needle)
    })
  }, [channels, filterQuery])

  async function sync(): Promise<void> {
    setBusy(true)
    setProgress({
      phase: 'fetching',
      current: 0,
      total: 0,
      detail: 'Starting sync…'
    })
    setError(null)
    setStatus(null)
    const stopProgress = window.myyoutube.channels.onSyncProgress((next) => {
      setProgress(next)
      // Roster is written first — reload so the list jumps from ~4 to ~200 quickly.
      if (next.phase === 'subscriptions' || (next.phase === 'uploads' && next.current === 1)) {
        void load()
      }
    })
    try {
      if (!auth?.signedIn) await signIn()
      const result = await callApi(() => window.myyoutube.channels.syncSubscriptions())
      notifyFeedRefreshed()
      await load()
      const summary = `Cached ${result.videos.toLocaleString()} uploads across ${result.channels.toLocaleString()} channels (newest ~100 per channel). Personal feed shows 24 at a time — use Load more.`
      if (result.failedChannels > 0) {
        setError(
          `${summary} ${result.failedChannels} upload sync(s) failed` +
            (result.failures[0] ? ` (${result.failures[0]})` : '')
        )
        setStatus(null)
      } else {
        setError(null)
        setStatus(summary)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      setStatus(null)
    } finally {
      stopProgress()
      setProgress(null)
      setBusy(false)
    }
  }

  async function setPreference(channelId: string, preference: ChannelPreference): Promise<void> {
    const updated = await callApi(() =>
      window.myyoutube.channels.setPreference(channelId, preference)
    )
    setChannels((prev) => prev.map((c) => (c.id === channelId ? updated : c)))
  }

  async function unsubscribe(channelId: string): Promise<void> {
    await callApi(() => window.myyoutube.channels.unsubscribe(channelId))
    setChannels((prev) => prev.filter((c) => c.id !== channelId))
  }

  function currentPreference(channel: Channel): ChannelPreference {
    if (channel.blocked) return 'blocked'
    if (channel.muted) return 'muted'
    if (channel.favourite) return 'favourite'
    return 'normal'
  }

  const syncLabel = (() => {
    if (!busy) return 'Sync subscriptions'
    if (!progress) return `Syncing… ${elapsedSec}s`
    if (progress.phase === 'fetching') {
      if (progress.current > 0) {
        return `List ${progress.current}+ (${elapsedSec}s)`
      }
      return `Page 1… (${elapsedSec}s)`
    }
    if (progress.phase === 'subscriptions') {
      return `Saving ${progress.channelsRegistered ?? progress.total}…`
    }
    if (progress.phase === 'uploads') {
      const pct =
        progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
      return `Uploads ${progress.current}/${progress.total} · ${pct}%`
    }
    return 'Finishing…'
  })()

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {channels.length} channel{channels.length === 1 ? '' : 's'}
            {busy
              ? ` · ${progress?.detail ?? 'working…'} · ${elapsedSec}s`
              : ''}
          </p>
        </div>
        <button type="button" className="primary" disabled={busy} onClick={() => void sync()}>
          {syncLabel}
        </button>
      </div>

      {busy ? (
        <p className="muted" role="status" aria-live="polite">
          {progress?.detail ?? 'Sync in progress…'}
          {progress?.phase === 'uploads' && progress.channelTitle
            ? ` (${progress.channelTitle})`
            : ''}
          . For ~200 channels, uploads can take several minutes — the timer means it’s still
          alive.
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {status && !error ? (
        <p className="muted" role="status">
          {status}
        </p>
      ) : null}

      {channels.length === 0 ? (
        <p className="empty">No subscribed channels cached yet. Sync to import them.</p>
      ) : (
        <>
          <div className="channel-filter">
            <span className="channel-filter-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="search"
              className="channel-filter-input"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Filter by name or description…"
              aria-label="Filter subscriptions"
            />
            {filterQuery ? (
              <span className="channel-filter-count">
                {filteredChannels.length} / {channels.length}
              </span>
            ) : null}
          </div>

          {filteredChannels.length === 0 ? (
            <p className="empty">No subscriptions match “{filterQuery}”.</p>
          ) : (
            <div className="channel-list">
              {filteredChannels.map((channel) => (
                <div key={channel.id} className="channel-row">
                  <button
                    type="button"
                    className="channel-open"
                    title={`Open channel: ${channel.title}`}
                    aria-label={`Open channel: ${channel.title}`}
                    onClick={() => {
                      openChannel({ id: channel.id, title: channel.title })
                      navigate(`/channel/${channel.id}`)
                    }}
                  >
                    <div className="channel-avatar" aria-hidden="true">
                      {channel.thumbnailUrl ? (
                        <img src={channel.thumbnailUrl} alt="" loading="lazy" />
                      ) : (
                        <span>{channelInitial(channel.title)}</span>
                      )}
                    </div>
                    <div className="channel-meta">
                      <h3>{channel.title}</h3>
                      <p>{channel.description || 'No description'}</p>
                    </div>
                  </button>
                  <div className="prefs">
                    {prefs.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        className={`icon-btn${currentPreference(channel) === id ? ' active' : ''}`}
                        title={label}
                        aria-label={label}
                        aria-pressed={currentPreference(channel) === id}
                        onClick={() => void setPreference(channel.id, id)}
                      >
                        <Icon />
                      </button>
                    ))}
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Unsubscribe from MyYouTube feed (YouTube subscription unchanged)"
                      aria-label="Unsubscribe from MyYouTube feed"
                      onClick={() => void unsubscribe(channel.id)}
                    >
                      <UnsubscribeIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function channelInitial(title: string): string {
  const trimmed = title.trim()
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
}
