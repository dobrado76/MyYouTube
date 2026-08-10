type YtNamespace = {
  Player: new (
    elementId: string | HTMLElement,
    options: {
      videoId?: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YtPlayer }) => void
        onStateChange?: (event: { data: number; target: YtPlayer }) => void
        onPlaybackQualityChange?: (event: { data: string; target: YtPlayer }) => void
        onApiChange?: (event: { target: YtPlayer }) => void
        onError?: (event: { data: number; target: YtPlayer }) => void
      }
    }
  ) => YtPlayer
}

export type YtPlayer = {
  destroy: () => void
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  getPlaybackQuality: () => string
  setPlaybackQuality: (quality: string) => void
  getAvailableQualityLevels: () => string[]
  setOption: (module: string, option: string, value: unknown) => void
  getOption: (module: string, option: string) => unknown
  getOptions: (module?: string) => string[]
}

declare global {
  interface Window {
    YT?: YtNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YtNamespace> | null = null

export function loadYoutubeIframeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    const timeout = window.setTimeout(() => {
      reject(new Error('Timed out loading YouTube IFrame API'))
    }, 15000)

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout)
      previous?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube IFrame API failed to initialize'))
    }

    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.ytIframeApi = '1'
      script.onerror = () => {
        window.clearTimeout(timeout)
        reject(new Error('Failed to load YouTube IFrame API script'))
      }
      document.head.appendChild(script)
    }
  })

  return apiPromise
}
