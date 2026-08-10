import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export type GoogleCredentials = {
  clientId: string
  clientSecret: string
  apiKey?: string
}

export type CredentialsStatus = {
  configured: boolean
  clientId: string
  clientIdMasked: string | null
  hasClientSecret: boolean
  hasApiKey: boolean
}

let credentialsDir: string | null = null

export function initCredentialsStore(userDataPath: string): void {
  credentialsDir = join(userDataPath, 'tokens')
  if (!existsSync(credentialsDir)) {
    mkdirSync(credentialsDir, { recursive: true })
  }
}

function credentialsPath(): string {
  if (!credentialsDir) throw new Error('Credentials store not initialized')
  return join(credentialsDir, 'google-client.json')
}

export function readCredentials(): GoogleCredentials | null {
  const path = credentialsPath()
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<GoogleCredentials>
      if (parsed.clientId && parsed.clientSecret) {
        return {
          clientId: parsed.clientId,
          clientSecret: parsed.clientSecret,
          apiKey: parsed.apiKey || undefined
        }
      }
    } catch {
      // fall through to env fallback
    }
  }

  // Optional env fallback for advanced/CI — Settings UI is the normal path.
  const envId = process.env.GOOGLE_CLIENT_ID?.trim()
  const envSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (envId && envSecret) {
    return {
      clientId: envId,
      clientSecret: envSecret,
      apiKey: process.env.GOOGLE_API_KEY?.trim() || undefined
    }
  }

  return null
}

export function writeCredentials(credentials: GoogleCredentials): void {
  writeFileSync(credentialsPath(), JSON.stringify(credentials, null, 2), 'utf8')
}

export function clearCredentials(): void {
  const path = credentialsPath()
  if (existsSync(path)) unlinkSync(path)
}

export function getCredentialsStatus(): CredentialsStatus {
  const creds = readCredentials()
  if (!creds) {
    return {
      configured: false,
      clientId: '',
      clientIdMasked: null,
      hasClientSecret: false,
      hasApiKey: false
    }
  }
  return {
    configured: true,
    clientId: creds.clientId,
    clientIdMasked: maskSecret(creds.clientId),
    hasClientSecret: Boolean(creds.clientSecret),
    hasApiKey: Boolean(creds.apiKey)
  }
}

export function upsertCredentials(input: {
  clientId?: string
  clientSecret?: string
  apiKey?: string | null
}): CredentialsStatus {
  const existing = readCredentials()
  const clientId = (input.clientId ?? existing?.clientId ?? '').trim()
  const clientSecret = (input.clientSecret ?? existing?.clientSecret ?? '').trim()

  if (!clientId || !clientSecret) {
    throw Object.assign(
      new Error('Google Client ID and Client Secret are both required.'),
      { code: 'auth.credentialsIncomplete' }
    )
  }

  let apiKey: string | undefined
  if (input.apiKey === null) {
    apiKey = undefined
  } else if (typeof input.apiKey === 'string') {
    apiKey = input.apiKey.trim() || undefined
  } else {
    apiKey = existing?.apiKey
  }

  writeCredentials({ clientId, clientSecret, apiKey })
  return getCredentialsStatus()
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}
