import type { AuthStatus } from '@shared/schemas/auth'
import { getSettings, patchSettings } from '../db/repositories/settings'
import {
  clearCredentials,
  getCredentialsStatus,
  readCredentials,
  upsertCredentials,
  type CredentialsStatus
} from './credentials'
import { getOAuthSetupInfo, refreshAccessToken, runGoogleOAuth } from './oauth'
import { clearTokens, readTokens, writeTokens } from './tokens'

export type { CredentialsStatus }

export function getAuthStatus(): AuthStatus {
  const settings = getSettings()
  const tokens = readTokens()
  const creds = getCredentialsStatus()
  const mockMode = settings.youtubeProvider === 'mock'

  if (mockMode) {
    return {
      signedIn: Boolean(tokens?.accountLabel) || tokens?.accessToken === 'mock-access-token',
      accountLabel: tokens?.accountLabel ?? null,
      provider: 'mock',
      mockMode: true
    }
  }

  return {
    signedIn: Boolean(tokens?.accessToken) && creds.configured,
    accountLabel: tokens?.accountLabel ?? null,
    provider: 'live',
    mockMode: false
  }
}

export function credentialsStatus(): CredentialsStatus {
  return getCredentialsStatus()
}

export function oauthSetupInfo(): {
  redirectUri: string
  recommendedClientType: 'Desktop app'
} {
  return getOAuthSetupInfo()
}

export function saveGoogleCredentials(input: {
  clientId?: string
  clientSecret?: string
  apiKey?: string | null
}): CredentialsStatus {
  const status = upsertCredentials(input)
  // Saving real credentials implies live API use.
  patchSettings({ youtubeProvider: 'live' })
  return status
}

export function clearGoogleCredentials(): CredentialsStatus {
  clearCredentials()
  clearTokens()
  patchSettings({ youtubeProvider: 'mock' })
  return getCredentialsStatus()
}

export async function signIn(): Promise<AuthStatus> {
  const settings = getSettings()
  const credentials = readCredentials()

  // Offline / fixture path when explicitly on mock and no credentials.
  if (settings.youtubeProvider === 'mock' && !credentials) {
    writeTokens({
      accessToken: 'mock-access-token',
      accountLabel: 'Mock User',
      expiryDate: Date.now() + 86_400_000
    })
    return getAuthStatus()
  }

  if (!credentials) {
    throw Object.assign(
      new Error('Add your Google Client ID and Client Secret in Settings first.'),
      { code: 'auth.notConfigured' }
    )
  }

  const tokens = await runGoogleOAuth(credentials)
  const existing = readTokens()
  writeTokens({
    ...tokens,
    refreshToken: tokens.refreshToken ?? existing?.refreshToken,
    accountLabel: tokens.accountLabel ?? existing?.accountLabel
  })
  patchSettings({ youtubeProvider: 'live' })
  return getAuthStatus()
}

export async function signOut(): Promise<AuthStatus> {
  clearTokens()
  return getAuthStatus()
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = readTokens()
  if (!tokens?.accessToken) return null
  if (tokens.accessToken === 'mock-access-token') return tokens.accessToken

  const stillValid = tokens.expiryDate && tokens.expiryDate > Date.now() + 60_000
  if (stillValid) return tokens.accessToken

  if (!tokens.refreshToken) return null
  const credentials = readCredentials()
  if (!credentials) return null

  try {
    const refreshed = await refreshAccessToken(credentials, tokens.refreshToken)
    writeTokens({
      ...tokens,
      ...refreshed,
      accountLabel: tokens.accountLabel
    })
    return refreshed.accessToken
  } catch {
    return null
  }
}
