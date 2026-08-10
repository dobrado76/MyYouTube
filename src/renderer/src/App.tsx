import { useEffect, type JSX } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { flushPlaybackSession } from './lib/playbackFlush'
import { useAppStore } from './store/appStore'

export default function App(): JSX.Element {
  const { ready, error, bootstrap } = useAppStore()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  // Persist exact playback position + queue before the window is destroyed.
  useEffect(() => {
    return window.myyoutube.app.onFlushBeforeQuit(async () => {
      await flushPlaybackSession()
      await useAppStore.getState().persistPlaybackNow()
    })
  }, [])

  if (!ready) {
    return (
      <div className="main">
        <p className="muted">Starting MyYouTube…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main">
        <p className="error">{error}</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={null} />
        <Route path="subscriptions" element={null} />
        <Route path="search" element={null} />
        <Route path="queue" element={null} />
        <Route path="settings" element={null} />
        <Route path="play" element={null} />
        <Route path="watch/:videoId" element={null} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
