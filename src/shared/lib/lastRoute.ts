const ALLOWED = new Set([
  '/',
  '/subscriptions',
  '/search',
  '/queue',
  '/history',
  '/account',
  '/settings',
  '/play'
])

export function routeFromLocation(pathname: string, search = ''): string {
  if (pathname === '/search') return `/search${search}`
  return pathname || '/'
}

export function routeFromHash(hash: string): string {
  const raw = hash.replace(/^#/, '') || '/'
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  const q = withSlash.indexOf('?')
  const pathname = q >= 0 ? withSlash.slice(0, q) : withSlash
  const search = q >= 0 ? withSlash.slice(q) : ''
  return routeFromLocation(pathname, search)
}

export function normalizeLastRoute(
  raw: string,
  opts: { activeChannelId: string | null; playVideoId: string | null }
): string {
  const trimmed = (raw || '/').trim() || '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const q = withSlash.indexOf('?')
  const pathname = (q >= 0 ? withSlash.slice(0, q) : withSlash) || '/'
  const search = q >= 0 ? withSlash.slice(q) : ''

  if (ALLOWED.has(pathname)) {
    return pathname === '/search' ? `/search${search}` : pathname
  }

  if (pathname === '/channel' || /^\/channel\/[^/]+$/.test(pathname)) {
    return opts.activeChannelId ? `/channel/${opts.activeChannelId}` : '/'
  }

  const watchMatch = pathname.match(/^\/watch\/([^/]+)$/)
  if (watchMatch) {
    const id = opts.playVideoId ?? watchMatch[1]
    return id ? `/watch/${id}` : '/play'
  }

  return '/'
}
