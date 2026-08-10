import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { routeFromHash, routeFromLocation } from '@shared/lib/lastRoute'
import { useAppStore } from '../store/appStore'

/** Keep-alive: stay mounted after first visit so tab state survives within the session. */
export function useActivated(active: boolean): boolean {
  const [activated, setActivated] = useState(active)
  useEffect(() => {
    if (active) setActivated(true)
  }, [active])
  return activated
}

/** Persist the active tab; restore happens in bootstrap before `ready`. */
export function useSessionRoutePersistence(): void {
  const { pathname, search } = useLocation()
  const ready = useAppStore((s) => s.ready)
  const startupRoute = useAppStore((s) => s.startupRoute)

  useEffect(() => {
    // Do not persist `/` (or any path) until startup restore has settled.
    if (!ready || startupRoute) return
    const next = routeFromLocation(pathname, search)
    if (next === useAppStore.getState().settings.lastRoute) return

    const timer = setTimeout(() => {
      if (useAppStore.getState().startupRoute) return
      if (useAppStore.getState().settings.lastRoute === next) return
      void useAppStore.getState().patchSettings({ lastRoute: next })
    }, 150)

    return () => {
      clearTimeout(timer)
      if (useAppStore.getState().startupRoute) return
      // Flush on dep change / unmount so a cancelled debounce cannot lose the tab.
      if (useAppStore.getState().settings.lastRoute !== next) {
        void useAppStore.getState().patchSettings({ lastRoute: next })
      }
    }
  }, [ready, startupRoute, pathname, search])
}

export async function persistCurrentRoute(): Promise<void> {
  const route = routeFromHash(window.location.hash)
  if (useAppStore.getState().settings.lastRoute === route) return
  await useAppStore.getState().patchSettings({ lastRoute: route })
}
