import { useNavigate } from 'react-router-dom'
import type { JSX, MouseEvent } from 'react'
import { videoToQueueItem } from '@shared/schemas/queue'
import type { Video } from '@shared/schemas/video'
import { callApi, formatAge, formatDuration } from '../lib/api'
import { useAppStore } from '../store/appStore'
import { SaveMenu } from './SaveMenu'

type Props = {
  video: Video
  onHide?: (videoId: string) => void
  onMarkWatched?: (videoId: string) => void
  /** Remove from the currently open Saved collection. */
  onUnsave?: (videoId: string) => void
  onCollectionsChanged?: () => void
  /** When true, hide the Save-to… bookmark (Saved tab uses Remove only). */
  hideSaveButton?: boolean
}

export function VideoCard({
  video,
  onHide,
  onMarkWatched,
  onUnsave,
  onCollectionsChanged,
  hideSaveButton = false
}: Props): JSX.Element {
  const navigate = useNavigate()
  const watchNow = useAppStore((s) => s.watchNow)
  const enqueue = useAppStore((s) => s.enqueue)
  const openChannel = useAppStore((s) => s.openChannel)
  const omitFromDiscovery = useAppStore((s) => s.omitFromDiscovery)
  const inQueue = useAppStore(
    (s) => s.nowPlaying?.id === video.id || s.queue.some((q) => q.id === video.id)
  )

  async function handleHide(): Promise<void> {
    // Optimistic: drop from Discovery immediately so in-flight search cannot resurrect it.
    omitFromDiscovery(video.id)
    onHide?.(video.id)
    try {
      await callApi(() => window.myyoutube.videos.hide(video.id))
    } catch (err) {
      // Persist failed — keep dismissed for this session but surface the error.
      const message = err instanceof Error ? err.message : 'Failed to hide video'
      throw Object.assign(new Error(message), { cause: err })
    }
  }

  function handleWatch(event?: MouseEvent): void {
    watchNow(videoToQueueItem(video))
    // Shift-click opens the Play tab; normal click stays browsing (mini player).
    if (event?.shiftKey) {
      navigate(`/watch/${video.id}`)
    }
  }

  function handleQueue(): void {
    enqueue(videoToQueueItem(video))
  }

  function handleChannel(event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    const title = video.channelTitle ?? video.channelId
    openChannel({ id: video.channelId, title })
    navigate(`/channel/${video.channelId}`)
  }

  return (
    <article className={`video-card${video.watched ? ' watched' : ''}`}>
      <button type="button" className="thumb-wrap" onClick={(e) => handleWatch(e)}>
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div />
        )}
        {video.durationSeconds != null ? (
          <span className="duration">{formatDuration(video.durationSeconds)}</span>
        ) : null}
      </button>
      <div className="video-meta">
        <h3>
          <button
            type="button"
            className="linkish video-title"
            onClick={(e) => handleWatch(e)}
            title={`${video.title} (Shift-click: open Play tab)`}
          >
            {video.title}
          </button>
        </h3>
        <p className="video-subline">
          <button
            type="button"
            className="linkish channel-link"
            onClick={handleChannel}
            title={`Open channel: ${video.channelTitle ?? video.channelId}`}
          >
            {video.channelTitle ?? video.channelId}
          </button>
          {video.publishedAt ? ` · ${formatAge(video.publishedAt)}` : ''}
          {video.watched ? ' · Watched' : ''}
        </p>
      </div>
      <div className="card-actions">
        <div className="card-actions-main">
          <button
            type="button"
            className="icon-btn primary"
            onClick={(e) => handleWatch(e)}
            title="Watch now (mini player) · Shift-click: Play tab"
            aria-label="Watch now in mini player"
          >
            <PlayIcon />
          </button>
          <button
            type="button"
            className={`icon-btn${inQueue ? ' is-placeholder' : ''}`}
            onClick={handleQueue}
            disabled={inQueue}
            title={inQueue ? 'Already in queue' : 'Watch later'}
            aria-label={inQueue ? 'Already in queue' : 'Watch later'}
            aria-hidden={inQueue}
            tabIndex={inQueue ? -1 : undefined}
          >
            <QueueIcon />
          </button>
          {hideSaveButton ? null : (
            <SaveMenu videoId={video.id} onChanged={onCollectionsChanged} />
          )}
          {onMarkWatched ? (
            <button
              type="button"
              className="icon-btn"
              onClick={() => onMarkWatched(video.id)}
              title="Not watching"
              aria-label="Not watching"
            >
              <CheckIcon />
            </button>
          ) : null}
        </div>
        {onUnsave ? (
          <button
            type="button"
            className="icon-btn card-action-hide"
            onClick={() => onUnsave(video.id)}
            title="Remove from this collection"
            aria-label="Remove from this collection"
          >
            <RemoveSavedIcon />
          </button>
        ) : onHide ? (
          <button
            type="button"
            className="icon-btn card-action-hide"
            onClick={() => {
              void handleHide().catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'Failed to hide video'
                window.alert(message)
              })
            }}
            title="Not watching (hide)"
            aria-label="Not watching (hide)"
          >
            <HideIcon />
          </button>
        ) : null}
      </div>
    </article>
  )
}

function PlayIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  )
}

function QueueIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 5h14v2H3V5zm0 6h10v2H3v-2zm0 6h10v2H3v-2zm14-5.5V9h2v2.5H22v2h-3V16h-2v-2.5H14v-2h3z"
      />
    </svg>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M9.55 18.2 3.8 12.45l1.4-1.4 4.35 4.35L18.8 6.15l1.4 1.4L9.55 18.2z"
      />
    </svg>
  )
}

function HideIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 6.5c3.8 0 7.1 2.1 8.8 5.5-.5 1-1.2 1.9-2 2.7l-1.45-1.45c.45-.55.8-1.15 1.05-1.8C17.2 9.45 14.75 8 12 8c-.55 0-1.1.07-1.6.2L8.9 6.7c.95-.35 1.98-.55 3.1-.55zM2.1 3.5l2.2 2.2C2.9 6.95 1.8 8.55 1.2 10.4 2.9 14.9 7.1 18 12 18c1.4 0 2.75-.3 3.95-.8l3.55 3.55 1.4-1.4L3.5 2.1 2.1 3.5zm6.7 6.7 1.5 1.5c-.05.1-.05.2-.05.3 0 1.1.9 2 2 2 .1 0 .2 0 .3-.05l1.5 1.5c-.55.25-1.15.4-1.8.4-2.2 0-4-1.8-4-4 0-.65.15-1.25.4-1.8zm3.55-.7 2.85 2.85.05-.35c0-1.1-.9-2-2-2l-.9.5zM12 16c-2.75 0-5.2-1.45-6.4-3.6.35-.7.85-1.3 1.4-1.85l1.5 1.5c-.15.4-.25.85-.25 1.3 0 1.85 1.5 3.35 3.35 3.35.45 0 .9-.1 1.3-.25l1.35 1.35c-.7.3-1.45.5-2.25.5z"
      />
    </svg>
  )
}

function RemoveSavedIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm-1 10H8v-2h8v2z"
      />
    </svg>
  )
}
