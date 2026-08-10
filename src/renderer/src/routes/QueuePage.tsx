import { useEffect, useRef, useState, type DragEvent, type JSX, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { QueueItem } from '@shared/schemas/queue'
import { formatDuration } from '../lib/api'
import { useAppStore } from '../store/appStore'

type MenuState = {
  videoId: string
  x: number
  y: number
} | null

export function QueuePage(): JSX.Element {
  const navigate = useNavigate()
  const {
    nowPlaying,
    queue,
    watchNow,
    removeFromQueue,
    moveQueueItem,
    reorderQueue,
    flushPlayback,
    clearNowPlaying,
    clearQueue
  } = useAppStore()
  const [menu, setMenu] = useState<MenuState>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(event: Event): void {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null)
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function openMenu(event: MouseEvent, videoId: string): void {
    event.preventDefault()
    setMenu({ videoId, x: event.clientX, y: event.clientY })
  }

  function onDragStart(index: number): void {
    setDragIndex(index)
  }

  function onDragOver(event: DragEvent, index: number): void {
    event.preventDefault()
    if (dragIndex == null || dragIndex === index) return
    reorderQueue(dragIndex, index)
    setDragIndex(index)
  }

  function onDragEnd(): void {
    setDragIndex(null)
    flushPlayback()
  }

  function playItem(item: QueueItem): void {
    watchNow(item)
    navigate(`/watch/${item.id}`)
  }

  return (
    <section className="queue-page">
      <div className="page-header">
        <div>
          <h1>Queue</h1>
          <p>
            {nowPlaying ? '1 playing' : 'Nothing playing'}
            {queue.length ? ` · ${queue.length} up next` : ''}
          </p>
        </div>
        {nowPlaying || queue.length > 0 ? (
          <button type="button" onClick={() => clearQueue()}>
            Clear all
          </button>
        ) : null}
      </div>

      {!nowPlaying && queue.length === 0 ? (
        <p className="muted">
          Use <strong>Watch</strong> on a card to play now (current video stays up next), or{' '}
          <strong>Queue</strong> to add to the end.
        </p>
      ) : null}

      {nowPlaying ? (
        <div className="queue-section">
          <h2>Now playing</h2>
          <article className="queue-row is-playing">
            <div className="queue-thumb">
              {nowPlaying.thumbnailUrl ? (
                <img src={nowPlaying.thumbnailUrl} alt="" />
              ) : (
                <div className="queue-thumb-empty" />
              )}
            </div>
            <div className="queue-meta">
              <h3>
                <Link to={`/watch/${nowPlaying.id}`}>{nowPlaying.title}</Link>
              </h3>
              <p>
                {nowPlaying.channelTitle ?? 'Channel'}
                {nowPlaying.durationSeconds != null
                  ? ` · ${formatDuration(nowPlaying.durationSeconds)}`
                  : ''}
              </p>
            </div>
            <div className="queue-row-actions">
              <button type="button" className="primary" onClick={() => playItem(nowPlaying)}>
                Open Play
              </button>
              <button
                type="button"
                onClick={() => {
                  clearNowPlaying()
                  navigate('/play')
                }}
              >
                Stop
              </button>
            </div>
          </article>
        </div>
      ) : null}

      <div className="queue-section">
        <h2>Up next</h2>
        {queue.length === 0 ? (
          <p className="muted">Queue is empty.</p>
        ) : (
          <ul className="queue-list">
            {queue.map((item, index) => (
              <li key={item.id}>
                <article
                  className={`queue-row${dragIndex === index ? ' is-dragging' : ''}`}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(event) => onDragOver(event, index)}
                  onDragEnd={onDragEnd}
                  onContextMenu={(event) => openMenu(event, item.id)}
                >
                  <span className="queue-handle" title="Drag to reorder" aria-hidden>
                    ⋮⋮
                  </span>
                  <div className="queue-thumb">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" />
                    ) : (
                      <div className="queue-thumb-empty" />
                    )}
                  </div>
                  <div className="queue-meta">
                    <h3>
                      <button type="button" className="linkish" onClick={() => playItem(item)}>
                        {item.title}
                      </button>
                    </h3>
                    <p>
                      {item.channelTitle ?? 'Channel'}
                      {item.durationSeconds != null
                        ? ` · ${formatDuration(item.durationSeconds)}`
                        : ''}
                    </p>
                  </div>
                  <div className="queue-row-actions">
                    <button type="button" className="primary" onClick={() => playItem(item)}>
                      Watch
                    </button>
                    <button type="button" onClick={() => removeFromQueue(item.id)}>
                      Remove
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              moveQueueItem(menu.videoId, 'front')
              setMenu(null)
            }}
          >
            Move to front of the queue
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              moveQueueItem(menu.videoId, 'back')
              setMenu(null)
            }}
          >
            Move to back of the queue
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              removeFromQueue(menu.videoId)
              setMenu(null)
            }}
          >
            Remove
          </button>
        </div>
      ) : null}
    </section>
  )
}
