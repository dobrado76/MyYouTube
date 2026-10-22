# Getting started — MyYouTube

Version covered: **0.1.17**. Platform target: **Windows 10/11**.

## Two ways to run it

| Way | When | Needs Node? | Needs Google? |
| --- | --- | --- | --- |
| Installed app (`MyYouTube Setup x.y.z.exe`) | Everyday use | No | Only for live YouTube data |
| From source (`npm run dev`) | Development | Node.js 20+ and npm | Only if you switch to Live |

**Mock (fixtures)** is the default provider. The UI works offline with sample channels and videos. Live data requires Google Cloud credentials and sign-in.

## Install a Windows build

1. Obtain `MyYouTube Setup <version>.exe` (NSIS). The project builds it with `npm run dist` into `release/`. There is no automatic download from a vendor CDN inside the app.
2. Run the installer. It is **unsigned** by default (`signAndEditExecutable: false`). Windows SmartScreen may warn. That is an OS trust prompt, not a MyYouTube error.
3. Launch **MyYouTube**.
4. Expect the **Personal feed** (Home). With a new profile and mock provider, **Refresh** shows fixture videos. With Live and no sync yet, Home tells you to sign in and use **Subscriptions → Sync**.

App data is **not** inside the install folder. Upgrading the installer keeps the library unless you delete the user-data folder.

## First-run checklist (live YouTube)

1. Open **Settings** (gear, top right) → **Account**.
2. If you have not created credentials, open **Help** on that page (Google Cloud setup) or follow the steps below.
3. Paste **Client ID** and **Client Secret**. API key is optional. **Save**.
4. Saving credentials switches the provider to **Live** automatically.
5. **Sign in with Google**. A system browser opens. Approve `youtube.readonly` (plus OpenID email/profile).
6. Register this exact redirect URI on the OAuth client if Google rejects the callback:

   `http://127.0.0.1:17355/callback`

   Client type must be **Desktop app**.
7. Open **Subscriptions** and press **Sync subscriptions**. Wait until the button returns to **Sync subscriptions**. Large accounts take minutes. The button shows phases (`Page 1…`, `Saving…`, `Uploads n/total`).
8. Open **Home**. You should see cached uploads. The subtitle shows counts such as `N cached · M match filters · showing K`.

## Google Cloud (integration only)

Authoritative console:

- https://console.cloud.google.com/
- Enable API: https://console.cloud.google.com/apis/library/youtube.googleapis.com
- Credentials: https://console.cloud.google.com/apis/credentials
- Consent screen: https://console.cloud.google.com/apis/credentials/consent

MyYouTube needs:

- YouTube Data API v3 **enabled** on that project.
- An OAuth client of type **Desktop app**.
- Authorized redirect URI `http://127.0.0.1:17355/callback`.
- Scope granted at sign-in: `https://www.googleapis.com/auth/youtube.readonly` (the app also requests openid, email, and profile).

Google’s own consent-screen, quota, and billing rules are Google’s. MyYouTube does not document every Cloud Console screen.

## Develop from source

```bash
git clone https://github.com/MeaningfulnessMediaGroup/MyYoutube.git
cd MyYoutube
npm install
npm run dev
```

Expected: an Electron window titled MyYouTube, Vite hot reload, mock fixtures if provider is Mock.

Optional isolated profile (PowerShell):

```powershell
$env:MYYOUTUBE_USER_DATA="F:\path\to\.dev-user-data"
npm run dev
```

`MYTUBE_USER_DATA` is still accepted as a legacy name for the same override.

No `.env` file is required. If present, `.env.local` or `.env` can set variables only when they are not already in the environment. Do not commit secrets.

## Verify it works

| Check | Expected |
| --- | --- |
| Window opens | Title MyYouTube, tab icons for Home, Subscriptions, Search, History, Saved, Queue, Play |
| Mock Home → Refresh | Fixture videos appear without Google |
| Live, signed in, after Sync | Real channel names on Subscriptions; videos on Home |
| Watch now on a card | Mini player bottom-right; you stay on the current tab |
| Shift-click Watch now | Play tab opens |
| Close and reopen | Last route, queue, and now-playing resume if they were saved |

## Shared library between dev and installed app

`npm run dev` and the installed app share one profile when both use `%APPDATA%\myyoutube` (Windows paths are usually case-insensitive, so `%APPDATA%\MyYouTube` is the same folder). If only the product-name folder has `myyoutube.sqlite`, that folder is used. To keep them apart, set `MYYOUTUBE_USER_DATA`.
