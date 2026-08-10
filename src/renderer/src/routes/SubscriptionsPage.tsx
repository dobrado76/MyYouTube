import { useEffect, useMemo, useState, type JSX } from 'react'
import type { Channel, ChannelPreference } from '@shared/schemas/channel'
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
  const { auth, signIn } = useAppStore()
  const [channels, setChannels] = useState<Channel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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
    try {
      if (!auth?.signedIn) await signIn()
      await callApi(() => window.myyoutube.channels.syncSubscriptions())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
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

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
        </div>
        <button type="button" className="primary" disabled={busy} onClick={() => void sync()}>
          {busy ? 'Syncing…' : 'Sync subscriptions'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

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
                  <div className="channel-main">
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
                  </div>
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
