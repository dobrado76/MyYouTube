import type { JSX } from 'react'
import {
  GOOGLE_CLOUD_CONSOLE_URL,
  GOOGLE_CLOUD_CREDENTIALS_URL,
  GOOGLE_CLOUD_OAUTH_CONSENT_URL,
  YOUTUBE_DATA_API_LIBRARY_URL
} from '@shared/constants/googleCloud'

type Props = {
  redirectUri: string
  onBack: () => void
  onCopyRedirect: () => void
  copiedRedirect: boolean
}

export function GoogleSetupHelp({
  redirectUri,
  onBack,
  onCopyRedirect,
  copiedRedirect
}: Props): JSX.Element {
  return (
    <div className="settings-stack google-setup-help">
      <div className="settings-actions">
        <button type="button" className="ghost" onClick={onBack}>
          ← Back to Account
        </button>
      </div>

      <div className="settings-card">
        <h2>Set up YouTube Data API v3</h2>
        <p className="settings-note">
          MyYouTube talks to Google with <strong>YouTube Data API v3</strong> and a Desktop OAuth
          client. Credentials stay on this PC under Electron <code>userData</code> — never commit
          them to git.
        </p>
      </div>

      <div className="settings-card">
        <h2>1. Create or pick a Google Cloud project</h2>
        <ol className="help-steps">
          <li>
            Open the{' '}
            <a href={GOOGLE_CLOUD_CONSOLE_URL} target="_blank" rel="noreferrer">
              Google Cloud Console
            </a>
            .
          </li>
          <li>Sign in with the Google account that will own the API project.</li>
          <li>
            Use the project picker (top bar) → <strong>New Project</strong> (or select an existing
            one). Name it e.g. <em>MyYouTube</em>.
          </li>
        </ol>
      </div>

      <div className="settings-card">
        <h2>2. Enable YouTube Data API v3</h2>
        <ol className="help-steps">
          <li>
            Open the API library page for YouTube Data API v3:
            <div className="path-controls help-link-row">
              <input type="text" readOnly value={YOUTUBE_DATA_API_LIBRARY_URL} />
              <button
                type="button"
                className="primary"
                onClick={() => window.open(YOUTUBE_DATA_API_LIBRARY_URL, '_blank')}
              >
                Open
              </button>
            </div>
          </li>
          <li>
            Confirm the correct project is selected, then click <strong>Enable</strong>.
          </li>
          <li>Wait a minute if the console says the API is still provisioning.</li>
        </ol>
      </div>

      <div className="settings-card">
        <h2>3. Configure the OAuth consent screen</h2>
        <ol className="help-steps">
          <li>
            Open{' '}
            <a href={GOOGLE_CLOUD_OAUTH_CONSENT_URL} target="_blank" rel="noreferrer">
              OAuth consent screen
            </a>
            .
          </li>
          <li>
            Choose <strong>External</strong> (unless you use a Google Workspace org that requires
            Internal) → Create.
          </li>
          <li>
            App name: <em>MyYouTube</em>. User support email: your address. Developer contact: your
            address. Save and continue.
          </li>
          <li>
            Scopes: you can leave defaults for a personal app; MyYouTube requests{' '}
            <code>youtube.readonly</code> plus basic OpenID profile at sign-in.
          </li>
          <li>
            Test users: while the app is in <strong>Testing</strong>, add the Google account(s) that
            will sign in to MyYouTube. Save.
          </li>
        </ol>
      </div>

      <div className="settings-card">
        <h2>4. Create a Desktop OAuth client</h2>
        <ol className="help-steps">
          <li>
            Open{' '}
            <a href={GOOGLE_CLOUD_CREDENTIALS_URL} target="_blank" rel="noreferrer">
              Credentials
            </a>{' '}
            → <strong>Create credentials</strong> → <strong>OAuth client ID</strong>.
          </li>
          <li>
            Application type: <strong>Desktop app</strong> (recommended). Name it e.g.{' '}
            <em>MyYouTube Desktop</em>.
          </li>
          <li>
            If you must use a <strong>Web application</strong> client instead, add this exact
            Authorized redirect URI:
            <div className="path-controls help-link-row">
              <input type="text" readOnly value={redirectUri} />
              <button type="button" onClick={onCopyRedirect}>
                {copiedRedirect ? 'Copied' : 'Copy'}
              </button>
            </div>
          </li>
          <li>
            Create → copy the <strong>Client ID</strong> and <strong>Client secret</strong>.
          </li>
        </ol>
      </div>

      <div className="settings-card">
        <h2>5. Paste into MyYouTube</h2>
        <ol className="help-steps">
          <li>
            Go back to <strong>Settings → Account</strong>.
          </li>
          <li>
            Paste Client ID and Client Secret → <strong>Save credentials</strong> (switches provider
            to Live).
          </li>
          <li>
            Click <strong>Sign in with Google</strong> and finish the browser consent flow.
          </li>
          <li>
            Open <strong>Subscriptions → Sync</strong>, then <strong>Home → Refresh</strong>.
          </li>
        </ol>
      </div>

      <div className="settings-card">
        <h2>Quota tip</h2>
        <p className="settings-note">
          Google gives each project a daily API budget. The personal feed uses subscriptions and
          uploads playlists (cheap). <strong>Search</strong> uses a separate, tighter Search Queries
          limit — avoid unnecessary searches. Prefer Home refresh when possible.
        </p>
      </div>

      <div className="settings-actions">
        <button type="button" className="primary" onClick={onBack}>
          Done — back to Account
        </button>
      </div>
    </div>
  )
}
