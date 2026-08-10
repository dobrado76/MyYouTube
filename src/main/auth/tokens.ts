import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

export type TokenBundle = {
  accessToken: string
  refreshToken?: string
  expiryDate?: number
  accountLabel?: string
}

let tokensDir: string | null = null

export function initTokenStore(userDataPath: string): void {
  tokensDir = join(userDataPath, 'tokens')
  if (!existsSync(tokensDir)) {
    mkdirSync(tokensDir, { recursive: true })
  }
}

function tokenPath(): string {
  if (!tokensDir) throw new Error('Token store not initialized')
  return join(tokensDir, 'google-oauth.json')
}

export function readTokens(): TokenBundle | null {
  const path = tokenPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as TokenBundle
  } catch {
    return null
  }
}

export function writeTokens(tokens: TokenBundle): void {
  writeFileSync(tokenPath(), JSON.stringify(tokens, null, 2), 'utf8')
}

export function clearTokens(): void {
  const path = tokenPath()
  if (existsSync(path)) {
    unlinkSync(path)
  }
}
