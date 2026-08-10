import { useEffect, useRef, useState, type JSX } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { PlayerMode, PlayerQuality } from '@shared/schemas/settings'
import type { QueueItem } from '@shared/schemas/queue'
import type { VideoDetail } from '@shared/schemas/video'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { callApi, formatAge, formatDuration } from '../lib/api'
import { useAppStore } from '../store/appStore'

const QUALITY_OPTIONS: Array<{ value: PlayerQuality; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'highres', label: 'Highest' },
  { value: 'hd1080', label: '1080p' },
  { value: 'hd720', label: '720p' },
  { value: 'large', label: '480p' },
  { value: 'medium', label: '360p' },
  { value: 'small', label: '240p' }
]

const RESUME_RESET = 0.02

const CAPTION_LANGS: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh-Hans', label: 'Chinese (Simplified)' },
  { value: 'zh-Hant', label: 'Chinese (Traditional)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' }
]

export function WatchPage(): JSX.Element {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const {
    settings,
    patchSettings,
    playVideoId: videoId,
    nowPlaying,
    queue,
    playHistory,
    playNextInQueue,
    playPreviousInQueue,
    finishCurrentAndPlayNext,
    updateNowPlayingProgress
  } = useAppStore()
  const player = settings.player
  const [video, setVideo] = useState<VideoDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actualQuality, setActualQuality] = useState<string>('auto')
  const [forcePlay, setForcePlay] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const endingRef = useRef(false)
  const skipForceReset = useRef(false)
  /** Video id the mounted player is responsible for (ignore stale ended after Watch). */
  const endedForIdRef = useRef<string | null>(null)
  const onPlayTab = pathname === '/play' || pathname.startsWith('/watch/')

  useEffect(() => {
    endingRef.current = false
    if (!videoId) {
      endedForIdRef.current = null
      setVideo(null)
      setError(null)
      setActualQuality('auto')
      setForcePlay(false)
      return
    }
    if (skipForceReset.current) {
      skipForceReset.current = false
    } else {
      setForcePlay(false)
    }
    let cancelled = false
    setError(null)
    setSubscribeError(null)
    // Drop stale detail immediately so the previous video's progress cannot seed the next.
    setVideo((prev) => (prev?.id === videoId ? prev : null))
    void callApi(() => window.myyoutube.videos.get(videoId))
      .then((value) => {
        if (!cancelled) {
          endedForIdRef.current = value.id
          setVideo(value)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setVideo(null)
          setError(err instanceof Error ? err.message : 'Failed to load video')
        }
      })
    return () => {
      cancelled = true
    }
  }, [videoId])

  function syncPlayRoute(item: QueueItem | null): void {
    if (!onPlayTab) return
    if (item) navigate(`/watch/${item.id}`, { replace: true })
    else navigate('/play', { replace: true })
  }

  async function handleQueueSkip(direction: 'previous' | 'next'): Promise<void> {
    if (endingRef.current) return
    setForcePlay(true)
    skipForceReset.current = true
    const item =
      direction === 'next' ? await playNextInQueue() : playPreviousInQueue()
    if (!item) {
      setForcePlay(false)
      skipForceReset.current = false
      return
    }
    syncPlayRoute(item)
  }

  async function handleEnded(): Promise<void> {
    if (endingRef.current) return
    const endedId = endedForIdRef.current
    const liveId = useAppStore.getState().nowPlaying?.id
    // Watch/Play already moved the session — do not drain the queue.
    if (!endedId || liveId !== endedId) return
    endingRef.current = true
    try {
      setForcePlay(true)
      skipForceReset.current = true
      const next = await finishCurrentAndPlayNext()
      if (next) {
        syncPlayRoute(next)
      } else {
        setForcePlay(false)
        syncPlayRoute(null)
      }
    } finally {
      endingRef.current = false
    }
  }

  async function markWatched(): Promise<void> {
    if (!videoId) return
    await callApi(() => window.myyoutube.history.markWatched(videoId, true))
    setVideo((prev) => (prev ? { ...prev, watched: true, watchProgress: 1 } : prev))
  }

  async function hide(): Promise<void> {
    if (!videoId) return
    await callApi(() => window.myyoutube.videos.hide(videoId))
    setVideo((prev) => (prev ? { ...prev, hidden: true } : prev))
  }

  async function subscribeToChannel(): Promise<void> {
    if (!video?.channelId || video.channelSubscribed || subscribing) return
    setSubscribing(true)
    setSubscribeError(null)
    try {
      await callApi(() => window.myyoutube.channels.subscribe(video.channelId))
      setVideo((prev) => (prev ? { ...prev, channelSubscribed: true } : prev))
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Failed to subscribe')
    } finally {
      setSubscribing(false)
    }
  }

  function patchPlayer(partial: Partial<typeof player>): void {
    void patchSettings({ player: partial })
  }

  if (!videoId) {
    return (
      <section className="play-empty">
        <h1>Play</h1>
        <p className="muted">
          Choose a video from Home or Search. Playback stays here so you can browse other tabs
          without interrupting it.
        </p>
        <Link to="/">
          <button type="button" className="primary">
            Browse feed
          </button>
        </Link>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <p className="error">{error}</p>
        <Link to="/">Back to feed</Link>
      </section>
    )
  }

  if (!video || video.id !== videoId) {
    return (
      <section>
        <p className="muted">Loading player…</p>
      </section>
    )
  }

  const cinema = player.mode === 'cinema'
  const finished =
    Boolean(video.watched) || (video.watchProgress != null && video.watchProgress >= 0.98)
  // Prefer this video's own history / queue resume — never another item's cursor.
  const sessionProgress =
    nowPlaying?.id === video.id ? (nowPlaying.resumeProgress ?? null) : null
  const ownProgress = video.watchProgress ?? null
  const resumeProgress = finished
    ? 0
    : Math.max(ownProgress ?? 0, sessionProgress ?? 0) || null

  const playerNode = (
    <YouTubePlayer
      key={video.id}
      videoId={video.playableId}
      progressKey={video.id}
      title={video.title}
      player={player}
      resumeProgress={resumeProgress}
      durationSeconds={video.durationSeconds}
      finished={finished}
      forcePlay={forcePlay && !finished}
      canPrevious={playHistory.length > 0}
      canNext={queue.length > 0}
      onPrevious={() => void handleQueueSkip('previous')}
      onNext={() => void handleQueueSkip('next')}
      onActualQuality={setActualQuality}
      onEnded={() => void handleEnded()}
      onProgress={(progress, completed) => {
        updateNowPlayingProgress(progress, completed)
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                watchProgress: progress,
                watched: completed ? true : progress <= RESUME_RESET ? false : prev.watched
              }
            : prev
        )
      }}
    />
  )

  const meta = (
    <>
      <div className="player-controls">
        <label>
          Mode
          <select
            value={player.mode}
            onChange={(e) => patchPlayer({ mode: e.target.value as PlayerMode })}
          >
            <option value="default">Default</option>
            <option value="cinema">Cinema (viewport fit)</option>
          </select>
        </label>

        <label className="inline-check">
          <input
            type="checkbox"
            checked={player.autoplay}
            onChange={(e) => patchPlayer({ autoplay: e.target.checked })}
          />
          Autoplay
        </label>

        <label className="inline-check">
          <input
            type="checkbox"
            checked={player.captionsEnabled}
            onChange={(e) => patchPlayer({ captionsEnabled: e.target.checked })}
          />
          Captions
        </label>

        <label>
          Caption language
          <select
            value={player.captionLanguage}
            disabled={!player.captionsEnabled}
            onChange={(e) => patchPlayer({ captionLanguage: e.target.value })}
          >
            {CAPTION_LANGS.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quality
          <select
            value={player.preferredQuality}
            onChange={(e) => patchPlayer({ preferredQuality: e.target.value as PlayerQuality })}
          >
            {QUALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <span className="muted player-quality-hint">Playing: {actualQuality || 'auto'}</span>
      </div>

      <div>
        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.4rem' }}>{video.title}</h1>
        <div className="watch-channel-row">
          <p className="muted">
            {video.channelTitle ?? video.channelId}
            {video.publishedAt ? ` · ${formatAge(video.publishedAt)}` : ''}
            {video.durationSeconds != null ? ` · ${formatDuration(video.durationSeconds)}` : ''}
            {video.watched ? ' · Watched' : ''}
          </p>
          {!video.channelSubscribed ? (
            <button
              type="button"
              className="primary watch-subscribe"
              title="Add to MyYouTube subscriptions (YouTube subscription unchanged)"
              disabled={subscribing}
              onClick={() => void subscribeToChannel()}
            >
              {subscribing ? 'Subscribing…' : 'Subscribe'}
            </button>
          ) : null}
        </div>
        {subscribeError ? <p className="error">{subscribeError}</p> : null}
      </div>

      <div className="watch-actions">
        <button type="button" className="primary" onClick={() => void markWatched()}>
          Mark watched
        </button>
        <button type="button" onClick={() => void hide()}>
          Hide
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${video.playableId}`}
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">Open on YouTube</button>
        </a>
        <Link to="/">
          <button type="button" className="ghost">
            Back to feed
          </button>
        </Link>
      </div>

      {video.description ? <p className="watch-description">{video.description}</p> : null}
    </>
  )

  return (
    <section className={`watch-layout${cinema ? ' cinema' : ''}`}>
      {cinema ? (
        <>
          <div className="cinema-stage">{playerNode}</div>
          <div className="cinema-meta">{meta}</div>
        </>
      ) : (
        <>
          {playerNode}
          {meta}
        </>
      )}
    </section>
  )
}
