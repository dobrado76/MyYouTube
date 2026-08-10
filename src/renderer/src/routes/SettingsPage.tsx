import { useEffect, useState, type JSX } from 'react'
import {
  DEFAULT_APPEARANCE,
  type Appearance,
  type PlayerMode,
  type PlayerQuality,
  type ThemeMode
} from '@shared/schemas/settings'
import type { CredentialsStatus } from '@shared/schemas/credentials'
import type { UpdateCheckResult } from '@shared/schemas/updates'
import type { HardwareAccelerationStatus } from '@shared/ipc/api'
import { callApi } from '../lib/api'
import { useAppStore } from '../store/appStore'

const FONT_OPTIONS = [
  'Segoe UI, Trebuchet MS, sans-serif',
  'Georgia, Palatino Linotype, serif',
  'Trebuchet MS, Segoe UI, sans-serif',
  'Palatino Linotype, Book Antiqua, serif',
  'Consolas, Courier New, monospace',
  'Verdana, Geneva, sans-serif'
]

type ColorKey = keyof Pick<
  Appearance,
  'accent' | 'background' | 'surface' | 'sidebar' | 'text' | 'mutedText'
>

const COLOR_FIELDS: Array<{ key: ColorKey; label: string }> = [
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'sidebar', label: 'Muted panel' },
  { key: 'text', label: 'Text' },
  { key: 'mutedText', label: 'Muted text' }
]

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'provider', label: 'Provider' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'player', label: 'Player' },
  { id: 'performance', label: 'Performance' },
  { id: 'feed', label: 'Feed' },
  { id: 'updates', label: 'Updates' }
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const SECTION_COPY: Record<SectionId, { title: string; blurb: string }> = {
  account: {
    title: 'Google account',
    blurb: 'OAuth credentials and sign-in. Secrets stay in userData.'
  },
  provider: {
    title: 'YouTube provider',
    blurb: 'Live API vs offline mock fixtures.'
  },
  appearance: {
    title: 'Appearance',
    blurb: 'Theme, colors, and fonts for the whole app.'
  },
  player: {
    title: 'Player',
    blurb: 'Default Watch layout, captions, and quality.'
  },
  performance: {
    title: 'Performance',
    blurb: 'GPU / hardware acceleration for Electron and YouTube playback.'
  },
  feed: {
    title: 'Feed',
    blurb: 'Shorts filtering and watched threshold.'
  },
  updates: {
    title: 'Updates',
    blurb: 'Install newer builds from a local folder.'
  }
}

export function SettingsPage(): JSX.Element {
  const { settings, auth, patchSettings, signIn, signOut, refreshAuth } = useAppStore()
  const { appearance, theme } = settings
  const showCustomColors = theme === 'custom'
  const [section, setSection] = useState<SectionId>('account')
  const [appVersion, setAppVersion] = useState('…')
  const [folderDraft, setFolderDraft] = useState(settings.updatesFolder)
  const [checking, setChecking] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [credStatus, setCredStatus] = useState<CredentialsStatus | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [credBusy, setCredBusy] = useState(false)
  const [credMessage, setCredMessage] = useState<string | null>(null)
  const [credError, setCredError] = useState<string | null>(null)
  const [signInBusy, setSignInBusy] = useState(false)
  const [redirectUri, setRedirectUri] = useState('http://127.0.0.1:17355/callback')
  const [copiedRedirect, setCopiedRedirect] = useState(false)
  const [hwStatus, setHwStatus] = useState<HardwareAccelerationStatus | null>(null)
  const [hwBusy, setHwBusy] = useState(false)
  const [hwError, setHwError] = useState<string | null>(null)

  useEffect(() => {
    setFolderDraft(settings.updatesFolder)
  }, [settings.updatesFolder])

  useEffect(() => {
    void callApi(() => window.myyoutube.app.hardwareAccelerationStatus())
      .then(setHwStatus)
      .catch(() => setHwStatus(null))
  }, [settings.hardwareAcceleration])

  useEffect(() => {
    void callApi(() => window.myyoutube.updates.getVersion())
      .then(setAppVersion)
      .catch(() => setAppVersion('unknown'))
  }, [])

  useEffect(() => {
    void callApi(() => window.myyoutube.auth.credentialsStatus())
      .then((status) => {
        setCredStatus(status)
        if (status.configured) setClientId(status.clientId)
      })
      .catch(() => setCredStatus(null))

    void callApi(() => window.myyoutube.auth.oauthSetupInfo())
      .then((info) => setRedirectUri(info.redirectUri))
      .catch(() => undefined)
  }, [])

  function patchAppearance(partial: Partial<Appearance>): void {
    void patchSettings({ appearance: partial })
  }

  function resetAppearance(): void {
    void patchSettings({
      theme: 'system',
      appearance: DEFAULT_APPEARANCE
    })
  }

  async function saveUpdatesFolder(folder: string): Promise<void> {
    setFolderDraft(folder)
    await patchSettings({ updatesFolder: folder })
  }

  async function browseUpdatesFolder(): Promise<void> {
    setUpdateError(null)
    try {
      const folder = await callApi(() => window.myyoutube.updates.pickFolder())
      if (folder) {
        await saveUpdatesFolder(folder)
        setUpdateResult(null)
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Could not pick folder')
    }
  }

  async function checkUpdates(): Promise<void> {
    setChecking(true)
    setUpdateError(null)
    try {
      if (folderDraft !== settings.updatesFolder) {
        await saveUpdatesFolder(folderDraft.trim())
      }
      const result = await callApi(() => window.myyoutube.updates.check())
      setUpdateResult(result)
    } catch (error) {
      setUpdateResult(null)
      setUpdateError(error instanceof Error ? error.message : 'Update check failed')
    } finally {
      setChecking(false)
    }
  }

  async function installUpdate(): Promise<void> {
    if (!updateResult?.installerPath) return
    setInstalling(true)
    setUpdateError(null)
    try {
      await callApi(() => window.myyoutube.updates.install(updateResult.installerPath!))
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Could not launch installer')
      setInstalling(false)
    }
  }

  async function saveCredentials(): Promise<void> {
    setCredBusy(true)
    setCredError(null)
    setCredMessage(null)
    try {
      const status = await callApi(() =>
        window.myyoutube.auth.saveCredentials({
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
          apiKey: apiKey.trim() ? apiKey.trim() : undefined
        })
      )
      setCredStatus(status)
      setClientSecret('')
      setApiKey('')
      setCredMessage('Credentials saved. Sign in with Google next.')
      await patchSettings({ youtubeProvider: 'live' })
      await refreshAuth()
    } catch (error) {
      setCredError(error instanceof Error ? error.message : 'Could not save credentials')
    } finally {
      setCredBusy(false)
    }
  }

  async function clearCredentials(): Promise<void> {
    setCredBusy(true)
    setCredError(null)
    setCredMessage(null)
    try {
      const status = await callApi(() => window.myyoutube.auth.clearCredentials())
      setCredStatus(status)
      setClientId('')
      setClientSecret('')
      setApiKey('')
      setCredMessage('Credentials cleared. Back on mock mode.')
      await refreshAuth()
    } catch (error) {
      setCredError(error instanceof Error ? error.message : 'Could not clear credentials')
    } finally {
      setCredBusy(false)
    }
  }

  async function handleSignIn(): Promise<void> {
    setSignInBusy(true)
    setCredError(null)
    try {
      await signIn()
      setCredMessage('Signed in with Google.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed'
      setCredError(
        /redirect_uri|invalid_request|Access blocked/i.test(message)
          ? `${message} — Add this exact Authorized redirect URI in Google Cloud Console: ${redirectUri}`
          : message
      )
    } finally {
      setSignInBusy(false)
    }
  }

  async function copyRedirectUri(): Promise<void> {
    try {
      await navigator.clipboard.writeText(redirectUri)
      setCopiedRedirect(true)
      setTimeout(() => setCopiedRedirect(false), 2000)
    } catch {
      setCredError(`Copy failed — select and copy manually: ${redirectUri}`)
    }
  }

  async function setHardwareAcceleration(enabled: boolean): Promise<void> {
    setHwBusy(true)
    setHwError(null)
    try {
      await patchSettings({ hardwareAcceleration: enabled })
      const status = await callApi(() => window.myyoutube.app.hardwareAccelerationStatus())
      setHwStatus(status)
    } catch (error) {
      setHwError(error instanceof Error ? error.message : 'Could not update GPU setting')
    } finally {
      setHwBusy(false)
    }
  }

  async function relaunchApp(): Promise<void> {
    setHwBusy(true)
    setHwError(null)
    try {
      await callApi(() => window.myyoutube.app.relaunch())
    } catch (error) {
      setHwBusy(false)
      setHwError(error instanceof Error ? error.message : 'Could not relaunch')
    }
  }

  const copy = SECTION_COPY[section]

  return (
    <div className="settings-page">
      <aside className="settings-nav" aria-label="Settings sections">
        <div className="settings-nav-title">Settings</div>
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`settings-nav-link${section === item.id ? ' active' : ''}`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <div className="settings-pane">
        <header className="settings-pane-header">
          <h1>{copy.title}</h1>
          <p>{copy.blurb}</p>
        </header>

        {section === 'account' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <div className="settings-card-head">
                <h2>Sign-in</h2>
                <span className="settings-note">
                  {auth?.signedIn
                    ? auth.accountLabel ?? 'Signed in'
                    : credStatus?.configured
                      ? 'Ready to sign in'
                      : 'Needs credentials'}
                </span>
              </div>
              <div className="settings-actions">
                {auth?.signedIn ? (
                  <button type="button" onClick={() => void signOut()}>
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    disabled={signInBusy || !credStatus?.configured}
                    onClick={() => void handleSignIn()}
                  >
                    {signInBusy ? 'Waiting for Google…' : 'Sign in with Google'}
                  </button>
                )}
              </div>
              {auth?.signedIn ? (
                <p className="settings-note">Provider: {auth.provider}</p>
              ) : null}
            </div>

            <div className="settings-card">
              <div className="settings-card-head">
                <h2>OAuth credentials</h2>
              </div>
              <p className="settings-note">
                Enable <strong>YouTube Data API v3</strong> in the same Google Cloud project. Prefer a{' '}
                <strong>Desktop</strong> OAuth client; Web clients need the redirect URI below.
              </p>

              <label className="settings-field">
                <span>Authorized redirect URI</span>
                <div className="path-controls">
                  <input id="oauth-redirect" type="text" value={redirectUri} readOnly />
                  <button type="button" onClick={() => void copyRedirectUri()}>
                    {copiedRedirect ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </label>

              <label className="settings-field">
                <span>Client ID</span>
                <input
                  id="google-client-id"
                  type="text"
                  value={clientId}
                  placeholder={credStatus?.clientIdMasked ?? 'xxxx.apps.googleusercontent.com'}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="settings-field">
                <span>Client Secret</span>
                <input
                  id="google-client-secret"
                  type="password"
                  value={clientSecret}
                  placeholder={
                    credStatus?.hasClientSecret
                      ? '•••••••• (saved — leave blank to keep)'
                      : 'Client secret'
                  }
                  onChange={(e) => setClientSecret(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <label className="settings-field">
                <span>API key (optional)</span>
                <input
                  id="google-api-key"
                  type="password"
                  value={apiKey}
                  placeholder={
                    credStatus?.hasApiKey ? '•••••••• (saved — leave blank to keep)' : 'Optional API key'
                  }
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="new-password"
                />
              </label>

              <div className="settings-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    credBusy ||
                    (!clientId.trim() && !credStatus?.configured) ||
                    (!clientSecret.trim() && !credStatus?.hasClientSecret)
                  }
                  onClick={() => void saveCredentials()}
                >
                  {credBusy ? 'Saving…' : 'Save credentials'}
                </button>
                {credStatus?.configured ? (
                  <button type="button" disabled={credBusy} onClick={() => void clearCredentials()}>
                    Clear
                  </button>
                ) : null}
              </div>

              <p className="settings-note">
                {credStatus?.configured
                  ? `Configured · ${credStatus.clientIdMasked}`
                  : 'Not configured'}
              </p>
            </div>

            {credError ? <p className="error">{credError}</p> : null}
            {credMessage ? <p className="settings-note">{credMessage}</p> : null}
          </div>
        ) : null}

        {section === 'provider' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <label className="settings-field">
                <span>Provider</span>
                <select
                  id="provider"
                  value={settings.youtubeProvider}
                  onChange={(e) =>
                    void patchSettings({
                      youtubeProvider: e.target.value as 'mock' | 'live'
                    })
                  }
                >
                  <option value="mock">Mock (fixtures)</option>
                  <option value="live">Live Data API</option>
                </select>
              </label>
              <p className="settings-note">
                Saving Google credentials switches to Live automatically. Mock needs no quota.
              </p>
            </div>
          </div>
        ) : null}

        {section === 'appearance' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <label className="settings-field inline">
                <span>Theme</span>
                <select
                  id="theme-mode"
                  value={theme}
                  onChange={(e) => void patchSettings({ theme: e.target.value as ThemeMode })}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="custom">Custom</option>
                </select>
              </label>

              <label className="settings-field inline">
                <span>Accent</span>
                <input
                  id="accent"
                  type="color"
                  value={appearance.accent}
                  onChange={(e) => patchAppearance({ accent: e.target.value })}
                />
              </label>

              {showCustomColors ? (
                <div className="color-grid">
                  {COLOR_FIELDS.filter((f) => f.key !== 'accent').map((field) => (
                    <label key={field.key} className="color-field">
                      <span>{field.label}</span>
                      <input
                        type="color"
                        value={appearance[field.key]}
                        onChange={(e) => patchAppearance({ [field.key]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="settings-note">Choose Custom theme to edit the full palette.</p>
              )}
            </div>

            <div className="settings-card">
              <label className="settings-field inline">
                <span>UI font</span>
                <select
                  id="font-sans"
                  value={appearance.fontFamily}
                  onChange={(e) => patchAppearance({ fontFamily: e.target.value })}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font.split(',')[0]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field inline">
                <span>Display font</span>
                <select
                  id="font-display"
                  value={appearance.fontDisplay}
                  onChange={(e) => patchAppearance({ fontDisplay: e.target.value })}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={`d-${font}`} value={font} style={{ fontFamily: font }}>
                      {font.split(',')[0]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field inline">
                <span>Font size</span>
                <input
                  id="font-size"
                  type="number"
                  min={12}
                  max={22}
                  step={1}
                  value={appearance.fontSizePx}
                  onChange={(e) => patchAppearance({ fontSizePx: Number(e.target.value) })}
                />
              </label>

              <div className="appearance-preview">
                Preview: <strong>MyYouTube</strong> with your accent, fonts, and size.
              </div>

              <div className="settings-actions">
                <button type="button" onClick={resetAppearance}>
                  Reset appearance
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {section === 'player' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <label className="settings-field inline">
                <span>Mode</span>
                <select
                  id="player-mode"
                  value={settings.player.mode}
                  onChange={(e) =>
                    void patchSettings({ player: { mode: e.target.value as PlayerMode } })
                  }
                >
                  <option value="default">Default</option>
                  <option value="cinema">Cinema (viewport fit)</option>
                </select>
              </label>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.player.autoplay}
                  onChange={(e) =>
                    void patchSettings({ player: { autoplay: e.target.checked } })
                  }
                />
                Autoplay when opening a video
              </label>

              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.player.captionsEnabled}
                  onChange={(e) =>
                    void patchSettings({ player: { captionsEnabled: e.target.checked } })
                  }
                />
                Captions on by default
              </label>

              <label className="settings-field inline">
                <span>Caption language</span>
                <input
                  id="caption-lang"
                  type="text"
                  value={settings.player.captionLanguage}
                  onChange={(e) =>
                    void patchSettings({ player: { captionLanguage: e.target.value || 'en' } })
                  }
                />
              </label>

              <label className="settings-field inline">
                <span>Preferred quality</span>
                <select
                  id="player-quality"
                  value={settings.player.preferredQuality}
                  onChange={(e) =>
                    void patchSettings({
                      player: { preferredQuality: e.target.value as PlayerQuality }
                    })
                  }
                >
                  <option value="auto">Auto</option>
                  <option value="highres">Highest</option>
                  <option value="hd1080">1080p</option>
                  <option value="hd720">720p</option>
                  <option value="large">480p</option>
                  <option value="medium">360p</option>
                  <option value="small">240p</option>
                </select>
              </label>
              <p className="settings-note">YouTube may still auto-adjust quality during playback.</p>
            </div>
          </div>
        ) : null}

        {section === 'performance' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <div className="settings-card-head">
                <h2>Hardware acceleration</h2>
                <span className="settings-note">
                  {hwStatus
                    ? hwStatus.active
                      ? 'Active this session'
                      : 'Disabled this session'
                    : '…'}
                </span>
              </div>
              <p className="settings-note">
                When off, Chromium runs without the GPU — UI compositing and YouTube IFrame video
                decode both fall back to software. Use this while the GPU is saturated (e.g. AI
                training). Playback may use more CPU and feel less smooth.
              </p>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.hardwareAcceleration}
                  disabled={hwBusy}
                  onChange={(e) => void setHardwareAcceleration(e.target.checked)}
                />
                Enable hardware acceleration
              </label>
              {hwStatus?.restartRequired ? (
                <>
                  <p className="settings-note">
                    Restart required to{' '}
                    {settings.hardwareAcceleration ? 'enable' : 'disable'} GPU acceleration for this
                    process.
                  </p>
                  <div className="settings-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={hwBusy}
                      onClick={() => void relaunchApp()}
                    >
                      {hwBusy ? 'Restarting…' : 'Restart MyYouTube'}
                    </button>
                  </div>
                </>
              ) : null}
              {hwError ? <p className="error">{hwError}</p> : null}
            </div>
          </div>
        ) : null}

        {section === 'feed' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={settings.hideShorts}
                  onChange={(e) => void patchSettings({ hideShorts: e.target.checked })}
                />
                Hide Shorts by default
              </label>

              <label className="settings-field inline">
                <span>Watched threshold</span>
                <input
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={settings.watchedThreshold}
                  onChange={(e) =>
                    void patchSettings({ watchedThreshold: Number(e.target.value) })
                  }
                />
              </label>
              <p className="settings-note">Fraction of video watched before counting as watched (0.1–1).</p>
            </div>
          </div>
        ) : null}

        {section === 'updates' ? (
          <div className="settings-stack">
            <div className="settings-card">
              <div className="settings-stat">
                <span>Installed version</span>
                <strong>v{appVersion}</strong>
              </div>

              <label className="settings-field">
                <span>Updates folder</span>
                <div className="path-controls">
                  <input
                    id="updates-folder"
                    type="text"
                    value={folderDraft}
                    placeholder="e.g. F:\Builds\MyYouTube\release"
                    onChange={(e) => setFolderDraft(e.target.value)}
                    onBlur={() => {
                      if (folderDraft.trim() !== settings.updatesFolder) {
                        void saveUpdatesFolder(folderDraft.trim())
                      }
                    }}
                  />
                  <button type="button" onClick={() => void browseUpdatesFolder()}>
                    Browse…
                  </button>
                </div>
              </label>

              <p className="settings-note">
                Point at a folder that receives new setup installers from <code>npm run dist</code>.
              </p>

              <div className="settings-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={checking || !folderDraft.trim()}
                  onClick={() => void checkUpdates()}
                >
                  {checking ? 'Checking…' : 'Check Updates'}
                </button>
                {updateResult?.updateAvailable && updateResult.installerPath ? (
                  <button
                    type="button"
                    className="primary"
                    disabled={installing}
                    onClick={() => void installUpdate()}
                  >
                    {installing ? 'Launching installer…' : `Install v${updateResult.latestVersion}`}
                  </button>
                ) : null}
              </div>

              {updateError ? <p className="error">{updateError}</p> : null}
              {!updateError && updateResult ? (
                <p className={updateResult.updateAvailable ? undefined : 'settings-note'}>
                  {updateResult.updateAvailable
                    ? `Update available: v${updateResult.latestVersion} (${updateResult.installerName}). Install runs the setup and closes MyYouTube.`
                    : updateResult.latestVersion
                      ? `Up to date (folder latest is v${updateResult.latestVersion}).`
                      : 'No MyYouTube setup installers found in that folder.'}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
