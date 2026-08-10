import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { shell } from 'electron'
import { URL } from 'node:url'
import type { GoogleCredentials } from './credentials'
import type { TokenBundle } from './tokens'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/youtube.readonly'
].join(' ')

/** Fixed port so Authorized redirect URIs can be registered exactly in Google Cloud. */
export const OAUTH_LOOPBACK_PORT = 17355

export function getOAuthRedirectUri(): string {
  return `http://127.0.0.1:${OAUTH_LOOPBACK_PORT}/callback`
}

export function getOAuthSetupInfo(): {
  redirectUri: string
  recommendedClientType: 'Desktop app'
} {
  return {
    redirectUri: getOAuthRedirectUri(),
    recommendedClientType: 'Desktop app'
  }
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

type LoopbackSession = {
  port: number
  waitForCode: () => Promise<string>
  close: () => void
}

function startLoopbackServer(expectedState: string): Promise<LoopbackSession> {
  return new Promise((resolveListen, rejectListen) => {
    let finished = false
    let rejectWait: ((error: Error) => void) | null = null
    let resolveWait: ((code: string) => void) | null = null

    const timeout = setTimeout(() => {
      finished = true
      server.close()
      const error = Object.assign(new Error('Sign-in timed out. Try again.'), {
        code: 'auth.timeout'
      })
      rejectWait?.(error)
    }, 5 * 60 * 1000)

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (url.pathname !== '/callback') {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        const error = url.searchParams.get('error')
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`<html><body><h1>Sign-in failed</h1><p>${error}</p></body></html>`)
          finished = true
          clearTimeout(timeout)
          server.close()
          rejectWait?.(
            Object.assign(new Error(url.searchParams.get('error_description') || error), {
              code: 'auth.denied'
            })
          )
          return
        }

        const state = url.searchParams.get('state')
        const code = url.searchParams.get('code')
        if (!code || state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end('<html><body><h1>Invalid OAuth response</h1></body></html>')
          finished = true
          clearTimeout(timeout)
          server.close()
          rejectWait?.(
            Object.assign(new Error('Invalid OAuth callback'), { code: 'auth.invalidCallback' })
          )
          return
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(
          '<html><body style="font-family:Segoe UI,sans-serif;padding:2rem">' +
            '<h1>MyYouTube signed in</h1><p>You can close this tab and return to the app.</p>' +
            '</body></html>'
        )
        finished = true
        clearTimeout(timeout)
        server.close()
        resolveWait?.(code)
      } catch (err) {
        finished = true
        clearTimeout(timeout)
        server.close()
        rejectWait?.(err instanceof Error ? err : new Error('OAuth callback failed'))
      }
    })

    server.on('error', (err) => {
      clearTimeout(timeout)
      if (!finished) rejectListen(err)
      else rejectWait?.(err)
    })

    server.listen(OAUTH_LOOPBACK_PORT, '127.0.0.1', () => {
      resolveListen({
        port: OAUTH_LOOPBACK_PORT,
        waitForCode: () =>
          new Promise<string>((resolve, reject) => {
            if (finished) {
              reject(new Error('OAuth session already finished'))
              return
            }
            resolveWait = resolve
            rejectWait = reject
          }),
        close: () => {
          clearTimeout(timeout)
          server.close()
        }
      })
    })
  })
}

export async function runGoogleOAuth(credentials: GoogleCredentials): Promise<TokenBundle> {
  const state = base64Url(randomBytes(16))
  const { verifier, challenge } = createPkce()
  const redirectUri = getOAuthRedirectUri()

  let loopback: LoopbackSession
  try {
    loopback = await startLoopbackServer(state)
  } catch (error) {
    throw Object.assign(
      new Error(
        `Could not start sign-in listener on port ${OAUTH_LOOPBACK_PORT}. Close anything using that port and try again.`
      ),
      { code: 'auth.portInUse', cause: error }
    )
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', credentials.clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  try {
    const codePromise = loopback.waitForCode()
    await shell.openExternal(authUrl.toString())
    const code = await codePromise

    const body = new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!response.ok) {
      const text = await response.text()
      throw Object.assign(new Error(`Token exchange failed: ${text}`), {
        code: 'auth.tokenExchange'
      })
    }

    const json = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      id_token?: string
    }

    const profile = await fetchAccountProfile(json.access_token, json.id_token)

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiryDate: Date.now() + (json.expires_in ?? 3600) * 1000,
      accountLabel: profile.accountLabel,
      accountPictureUrl: profile.accountPictureUrl
    }
  } catch (error) {
    loopback.close()
    throw error
  }
}

export async function refreshAccessToken(
  credentials: GoogleCredentials,
  refreshToken: string
): Promise<TokenBundle> {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!response.ok) {
    throw Object.assign(new Error('Failed to refresh Google access token'), {
      code: 'auth.expired'
    })
  }

  const json = (await response.json()) as {
    access_token: string
    expires_in?: number
    refresh_token?: string
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiryDate: Date.now() + (json.expires_in ?? 3600) * 1000
  }
}

export type AccountProfile = {
  accountLabel: string
  accountPictureUrl?: string
}

export async function fetchAccountProfile(
  accessToken: string,
  idToken?: string
): Promise<AccountProfile> {
  let accountLabel = 'Google account'
  let accountPictureUrl: string | undefined

  if (idToken) {
    try {
      const payload = JSON.parse(
        Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString('utf8')
      ) as { email?: string; name?: string; picture?: string }
      if (payload.email) accountLabel = payload.email
      else if (payload.name) accountLabel = payload.name
      if (payload.picture) accountPictureUrl = payload.picture
    } catch {
      // ignore
    }
  }

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    if (response.ok) {
      const json = (await response.json()) as {
        email?: string
        name?: string
        picture?: string
      }
      accountLabel = json.email || json.name || accountLabel
      if (json.picture) accountPictureUrl = json.picture
    }
  } catch {
    // ignore
  }

  return { accountLabel, accountPictureUrl }
}
