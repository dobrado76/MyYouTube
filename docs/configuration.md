# Configuration — MyYouTube

Version **0.1.17**. Settings are edited in the **Settings** gear (or the account icon, which opens Account). Changes are written to SQLite immediately through serialized settings patches. There is no separate Save button for appearance, player, feed, or filters. Google credentials use an explicit **Save**.

## Where settings live

| Item | Location |
| --- | --- |
| Library and settings JSON | `%APPDATA%\myyoutube\myyoutube.sqlite` (override: `MYYOUTUBE_USER_DATA`) |
| OAuth client id/secret/optional API key | `<userData>/tokens/google-client.json` |
| OAuth tokens | `<userData>/tokens/google-oauth.json` |
| Window size/position | `<userData>/window-state.json` |
| Hardware acceleration boot flag | `<userData>/hardware-acceleration.json` (applied **before** the next launch) |
| Quality debug log | `<userData>/youtube-quality.log` |

Settings rows are inside `application_settings`, not a loose JSON file you edit by hand. Hand-editing the database is unsupported. Back up the whole userData folder before any manual repair.

## Settings sections (exact labels)

Left nav: **Account**, **Provider**, **YouTube provider** title is “YouTube provider”, **Appearance**, **Player**, **Performance**, **Feed**, **Filters**, **Updates**.

### Account — Google account

| Control | Effect |
| --- | --- |
| Client ID | Required with Client Secret. Placeholder looks like `xxxx.apps.googleusercontent.com` |
| Client Secret | Required. Stored in userData, not the repo |
| API key | Optional |
| Save credentials | Persists credentials. Busy label `Saving…`. Success: `Credentials saved. Sign in with Google next.` Switches provider to Live. Disabled until an id and secret are available |
| Clear | Shown once credentials exist. Removes saved client id/secret/API key. Failure text: `Could not clear credentials` |
| Sign in with Google | Opens the system browser. Disabled until credentials are saved. Waiting label: `Waiting for Google…`. The loopback wait is **5 minutes**, then `Sign-in timed out. Try again.` (`auth.timeout`) |
| Sign out | Clears the OAuth session used for API calls. Local videos remain |
| Status line | `Needs credentials`, `Ready to sign in`, or the account label when signed in |
| Help | In-app Google Cloud walkthrough |
| Redirect URI | Shown so you can copy `http://127.0.0.1:17355/callback` into Google Cloud |

Error if you sign in with no credentials: `Add your Google Client ID and Client Secret in Settings first.`

Both id and secret are required together: `Google Client ID and Client Secret are both required.`

### Provider — YouTube provider

| Value | Meaning |
| --- | --- |
| Mock (fixtures) | Offline sample data. No quota |
| Live Data API | Real YouTube Data API v3 using the signed-in token |

Note in the UI: saving Google credentials switches to Live automatically. Mock needs no quota.

### Appearance

| Control | Default |
| --- | --- |
| Theme | `system` (also `light`, `dark`, `custom`) |
| Accent | `#c1121f` |
| Background | `#f7f4f4` |
| Surface | `#ffffff` |
| Muted panel (`sidebar` key) | `#f0eaea` |
| Text | `#1f1416` |
| Muted text | `#6b5a5e` |
| UI font | `Segoe UI, Trebuchet MS, sans-serif` |
| Display font | `Georgia, Palatino Linotype, serif` |
| Font size | 15 px (allowed 12–22) |

Custom colours appear when theme is **custom**. **Reset appearance** restores `DEFAULT_APPEARANCE`. Theme applies immediately in the window.

### Player

| Control | Default | Effect |
| --- | --- | --- |
| Mode: Default / Cinema (viewport fit) | Default | Cinema uses full content width under the chrome |
| Autoplay when opening a video | On | Starts playback when you open a video. This is **not** autoplay-next of an endless Home feed |
| Captions on by default | Off | Caption language field default `en` |
| Preferred quality | Auto | Menu labels: Auto, Highest, 1080p, 720p, 480p, 360p, 240p (stored as `auto`, `highres`, `hd1080`, `hd720`, `large`, `medium`, `small`) |

Quality is applied inside the YouTube embed (storage key `yt-player-quality` plus a locked quality range). The parent page’s `setPlaybackQuality` is not relied on. If quality seems stuck, the UI notes hardware acceleration. Failures of YouTube’s own ABR are YouTube’s.

### Performance

**Hardware acceleration** default **on**. Turning it off writes the boot file. The page says restart is required and offers **Restart MyYouTube** (`Restarting…` while it relaunches). The change disables Chromium GPU, including accelerated video decode, for this Electron process (the iframe shares that process). It applies on the next launch, not the moment you untick it. Failure strings: `Could not update GPU setting`, `Could not relaunch`.

### Feed

| Control | Default |
| --- | --- |
| Hide Shorts by default | On |
| Watched threshold | 0.7 (slider clamped to 0.1–1 in the settings UI) |

Home and Channel also have checkboxes **Hide Shorts** and **Unwatched only**. Those write the same settings, so they persist across sessions.

`feedMode` (`chrono` / `ranked` / `priority`) is stored and defaults to `chrono`. The visible feeds always request chronological mode. Ranked scoring is not a user-facing Home mode in this version.

### Filters

- **Blocked channels** — list of channels you marked Blocked. Unblock from here.
- **Keyword filters** — case-insensitive substrings (1–80 characters, up to 100). Matching title or description is excluded from Home and Search. Placeholder example: `spoilers`.

Blocked, muted, or hidden **channels** are excluded from the Home feed. A Channel tab still shows that channel’s local videos even if you are not currently subscribed (single-channel view).

### Updates

| Control | Meaning |
| --- | --- |
| Updates folder | A directory you choose that contains `MyYouTube Setup *.exe` files |
| Check for updates | Compares installer filenames/versions in that folder with the running app |
| Install | Launches a newer NSIS installer. It does not silently download from the internet |

Errors (exact):

- `Set an updates folder first.`
- `Updates folder not found: …`
- `Installer must be inside the configured updates folder.`
- `Installer file no longer exists.`
- `File is not a recognized MyYouTube installer.`
- `Invalid current app version: …`

There is no cloud auto-update.

## Other persisted session fields

These are not all labelled in Settings, but they survive restart:

| Field | Meaning |
| --- | --- |
| nowPlaying, playQueue, playHistory | Playback session (queue cap 100, history cap 50) |
| activeChannel | The open Channel tab until you press Close |
| lastRoute | Restored on launch (path and query, max 500 characters) |
| searchHistory | Up to 25 recent queries kept in the UI (schema max 40) |
| sidebarCollapsed | Stored; the current UI is a top tab bar, not a left sidebar |
| unwatchedOnly | Persisted |

Session-only (lost on restart): `omittedDiscoveryIds` (videos you hid or marked not-watching this session, so in-flight loads cannot put them back). The database `hidden` / `completed` flags are what persist.

## Environment variables

| Variable | Effect |
| --- | --- |
| `MYYOUTUBE_USER_DATA` | Absolute path for the profile directory |
| `MYTUBE_USER_DATA` | Legacy alias |
| `ELECTRON_RENDERER_URL` | Dev only: load the renderer from Vite instead of the local http server |
| `CSC_IDENTITY_AUTO_DISCOVERY` | Set `false` by the `dist` script so packaging does not look for a code-signing cert |

## Defaults that surprise people

- Hide Shorts **on**.
- Unwatched only **off** until you tick it (then it stays on).
- Provider **mock** until you save Google credentials.
- Hardware acceleration **on** until you turn it off and restart.
- Home **Refresh** does not call YouTube.
