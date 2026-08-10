import { useEffect, useId, useRef, useState, type JSX } from 'react'
import type { PlayerQuality, PlayerSettings } from '@shared/schemas/settings'
import { callApi } from '../lib/api'
import { registerPlayerFlusher } from '../lib/playbackFlush'
import { loadYoutubeIframeApi, type YtPlayer } from '../lib/youtubeApi'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

type Props = {
  /** YouTube video id for the IFrame. */
  videoId: string
  /** Local catalog id used for watch-history progress. */
  progressKey: string
  title: string
  player: PlayerSettings
  /** Saved fraction 0–1 from history. */
  resumeProgress?: number | null
  /** Metadata duration for initial `start` param (seconds). */
  durationSeconds?: number | null
  /** Video already completed — do not auto-start from zero; show Replay. */
  finished?: boolean
  /** When true, start playback on ready even if the autoplay setting is off (queue advance). */
  forcePlay?: boolean
  canPrevious?: boolean
  canNext?: boolean
  onPrevious?: () => void
  onNext?: () => void
  onActualQuality?: (quality: string) => void
  onEnded?: () => void
  onProgress?: (progress: number, completed: boolean) => void
}

const YT_ENDED = 0
const YT_PLAYING = 1
const YT_PAUSED = 2
const RESUME_MIN = 0.02
const RESUME_MAX = 0.98
const SAVE_EVERY_MS = 5000

export function YouTubePlayer({
  videoId,
  progressKey,
  title,
  player,
  resumeProgress = null,
  durationSeconds = null,
  finished = false,
  forcePlay = false,
  canPrevious = false,
  canNext = false,
  onPrevious,
  onNext,
  onActualQuality,
  onEnded,
  onProgress
}: Props): JSX.Element {
  const reactId = useId().replace(/:/g, '')
  const elementId = `yt-player-${reactId}`
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const onEndedRef = useRef(onEnded)
  const onProgressRef = useRef(onProgress)
  const progressKeyRef = useRef(progressKey)
  const [error, setError] = useState<string | null>(null)
  const [showReplay, setShowReplay] = useState(finished)
  const replayRef = useRef(false)
  const finishedAtOpenRef = useRef(finished)
  const resumeProgressRef = useRef(resumeProgress)
  const durationSecondsRef = useRef(durationSeconds)

  onEndedRef.current = onEnded
  onProgressRef.current = onProgress
  progressKeyRef.current = progressKey

  // Lock resume/finished policy per opened video (ignore mid-playback "watched" flips).
  useEffect(() => {
    finishedAtOpenRef.current = finished
    resumeProgressRef.current = resumeProgress
    durationSecondsRef.current = durationSeconds
    setShowReplay(finished)
    replayRef.current = false
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-bootstrap when the video changes
  }, [progressKey])

  useEffect(() => {
    let cancelled = false
    let created: YtPlayer | null = null
    let saveTimer: ReturnType<typeof setInterval> | null = null
    // Capture per-instance identity — never write this player's time under another video's key.
    const effectProgressKey = progressKey
    const effectResume = resumeProgress
    const effectDuration = durationSeconds
    const openedFinished = finished
    const startSeconds = resumeStartSeconds(effectResume, effectDuration, openedFinished)
    const autoStart = (player.autoplay || forcePlay) && !openedFinished

    function readProgress(yt: YtPlayer): number | null {
      try {
        const duration = yt.getDuration()
        if (!Number.isFinite(duration) || duration <= 0) return null
        const current = yt.getCurrentTime()
        if (!Number.isFinite(current) || current < 0) return null
        return Math.min(1, Math.max(0, current / duration))
      } catch {
        return null
      }
    }

    async function saveProgress(yt: YtPlayer, completed?: boolean): Promise<void> {
      const progress = readProgress(yt)
      if (progress == null) return
      // Avoid clobbering a finished entry with a near-zero read during teardown.
      if (!completed && progress < 0.005) return
      const done = completed ?? progress >= RESUME_MAX
      try {
        await callApi(() =>
          window.myyoutube.history.upsertProgress(effectProgressKey, progress, done)
        )
        // Only update live session UI when this instance is still the active video.
        if (progressKeyRef.current === effectProgressKey) {
          onProgressRef.current?.(progress, done)
        }
      } catch {
        // Best-effort persistence.
      }
    }

    async function flushProgress(): Promise<void> {
      const yt = created ?? playerRef.current
      if (!yt) return
      await saveProgress(yt)
    }

    const unregisterFlusher = registerPlayerFlusher(() => flushProgress())

    void loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return

        const origin =
          window.location.protocol === 'http:' || window.location.protocol === 'https:'
            ? window.location.origin
            : undefined

        created = new YT.Player(elementId, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            ...(origin ? { origin } : {}),
            cc_load_policy: player.captionsEnabled ? 1 : 0,
            cc_lang_pref: player.captionLanguage,
            autoplay: autoStart ? 1 : 0,
            ...(startSeconds != null ? { start: startSeconds } : {})
          },
          events: {
            onReady: (event) => {
              if (cancelled || progressKeyRef.current !== effectProgressKey) return
              applyQuality(event.target, player.preferredQuality)
              applyCaptions(event.target, player.captionsEnabled, player.captionLanguage)

              if (openedFinished && !replayRef.current) {
                try {
                  event.target.pauseVideo()
                } catch {
                  // ignore
                }
                setShowReplay(true)
                onActualQuality?.(safeQuality(event.target))
                return
              }

              const resume = effectResume ?? 0
              if (resume > RESUME_MIN && resume < RESUME_MAX) {
                try {
                  const duration = event.target.getDuration()
                  if (duration > 0) {
                    event.target.seekTo(resume * duration, true)
                  }
                } catch {
                  // start= playerVar may still apply
                }
              }

              if (autoStart) {
                try {
                  event.target.playVideo()
                } catch {
                  // Browser/autoplay policy may block; user can press play.
                }
              }
              onActualQuality?.(safeQuality(event.target))
            },
            onStateChange: (event) => {
              if (cancelled || progressKeyRef.current !== effectProgressKey) return
              if (event.data === YT_PLAYING) {
                setShowReplay(false)
                if (!saveTimer) {
                  saveTimer = setInterval(() => {
                    if (cancelled || progressKeyRef.current !== effectProgressKey) return
                    const yt = playerRef.current
                    if (yt) void saveProgress(yt)
                  }, SAVE_EVERY_MS)
                }
              }
              if (event.data === YT_PAUSED) {
                void saveProgress(event.target)
              }
              if (event.data === YT_ENDED) {
                if (saveTimer) {
                  clearInterval(saveTimer)
                  saveTimer = null
                }
                void saveProgress(event.target, true).finally(() => {
                  if (cancelled || progressKeyRef.current !== effectProgressKey) return
                  setShowReplay(true)
                  onEndedRef.current?.()
                })
              }
            },
            onApiChange: (event) => {
              applyCaptions(event.target, player.captionsEnabled, player.captionLanguage)
            },
            onPlaybackQualityChange: (event) => {
              onActualQuality?.(event.data)
            },
            onError: () => {
              if (!cancelled) setError('Player error — try Open on YouTube.')
            }
          }
        })
        playerRef.current = created
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load player')
        }
      })

    return () => {
      cancelled = true
      // Prevent destroy/teardown from advancing the queue via onEnded.
      onEndedRef.current = undefined
      unregisterFlusher()
      if (saveTimer) {
        clearInterval(saveTimer)
        saveTimer = null
      }
      void flushProgress()
      try {
        created?.destroy()
      } catch {
        // ignore
      }
      if (playerRef.current === created) {
        playerRef.current = null
      }
    }
    // Recreate when identity / caption bootstrap prefs change (not when progress updates).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, progressKey, forcePlay, player.autoplay, player.captionLanguage, player.captionsEnabled])

  useEffect(() => {
    const yt = playerRef.current
    if (!yt) return
    applyQuality(yt, player.preferredQuality)
    onActualQuality?.(safeQuality(yt))
  }, [player.preferredQuality, onActualQuality])

  useEffect(() => {
    const yt = playerRef.current
    if (!yt) return
    applyCaptions(yt, player.captionsEnabled, player.captionLanguage)
  }, [player.captionsEnabled, player.captionLanguage])

  async function handleReplay(): Promise<void> {
    replayRef.current = true
    finishedAtOpenRef.current = false
    setShowReplay(false)
    try {
      await callApi(() => window.myyoutube.history.upsertProgress(progressKey, 0, false))
      onProgress?.(0, false)
    } catch {
      // Still attempt local replay.
    }
    const yt = playerRef.current
    if (!yt) return
    try {
      yt.seekTo(0, true)
      yt.playVideo()
    } catch {
      setError('Could not restart playback')
    }
  }

  const showQueueNav = Boolean(onPrevious || onNext)

  return (
    <div className="player-frame" title={title}>
      <div id={elementId} ref={hostRef} className="player-host" />
      {showQueueNav ? (
        <div className="player-queue-nav" aria-label="Queue navigation">
          <button
            type="button"
            className="player-queue-nav-btn prev"
            aria-label="Previous in queue"
            title="Previous"
            disabled={!canPrevious || !onPrevious}
            onClick={() => onPrevious?.()}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="player-queue-nav-btn next"
            aria-label="Next in queue"
            title="Next"
            disabled={!canNext || !onNext}
            onClick={() => onNext?.()}
          >
            <ChevronRightIcon />
          </button>
        </div>
      ) : null}
      {showReplay ? (
        <div className="player-replay-overlay">
          <button type="button" className="primary" onClick={() => void handleReplay()}>
            Replay
          </button>
        </div>
      ) : null}
      {error ? <p className="player-error">{error}</p> : null}
    </div>
  )
}

function resumeStartSeconds(
  resumeProgress: number | null | undefined,
  durationSeconds: number | null | undefined,
  finished: boolean
): number | undefined {
  if (finished) return undefined
  if (resumeProgress == null || durationSeconds == null || durationSeconds <= 0) return undefined
  if (resumeProgress <= RESUME_MIN || resumeProgress >= RESUME_MAX) return undefined
  return Math.floor(resumeProgress * durationSeconds)
}

function applyQuality(yt: YtPlayer, quality: PlayerQuality): void {
  try {
    if (quality === 'auto') return
    yt.setPlaybackQuality(quality)
  } catch {
    // YouTube may ignore quality requests.
  }
}

function applyCaptions(yt: YtPlayer, enabled: boolean, language: string): void {
  try {
    if (enabled) {
      yt.setOption('captions', 'track', { languageCode: language })
      yt.setOption('cc', 'track', { languageCode: language })
    } else {
      yt.setOption('captions', 'track', {})
      yt.setOption('cc', 'track', {})
    }
  } catch {
    // Caption module may be unavailable for some videos.
  }
}

function safeQuality(yt: YtPlayer): string {
  try {
    return yt.getPlaybackQuality() || 'auto'
  } catch {
    return 'auto'
  }
}
