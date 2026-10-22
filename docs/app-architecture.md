# How the app is put together — MyYouTube

This is the support-level architecture. The longer engineering note remains [ARCHITECTURE.md](ARCHITECTURE.md). If they disagree, the source tree wins.

## Processes

```text
Renderer (React, Zustand, no Node)
    → preload contextBridge window.myyoutube
    → Electron main
         → SQLite (better-sqlite3)
         → Google OAuth + YouTube Data API v3
         → local http server for the packaged UI
         → official YouTube IFrame (loaded by the renderer)
```

Main owns tokens, API calls, the database, sync, and settings. The renderer owns screens and asks main through typed IPC validated with Zod.

## Startup

1. Optional `.env.local` / `.env` loaded if keys are unset.
2. `userData` path resolved (`MYYOUTUBE_USER_DATA` or `%APPDATA%\myyoutube`, with the legacy product-name fallback).
3. Hardware-acceleration boot file applied **before** `app.ready`.
4. Database migrations, token store, credential store, window state.
5. IPC handlers registered.
6. Window restored from `window-state.json`.
7. Packaged builds: `RendererServer` on `127.0.0.1:0`. Dev: `ELECTRON_RENDERER_URL`.
8. Renderer bootstraps settings and auth, restores hash route, then mounts tabs.

## Feed data flow

YouTube subscriptions and playlist items are **copied** into `channels` and `videos`. Home reads SQL. Sync is explicit (Subscriptions). Channel Refresh updates one channel’s recent uploads. Nothing in the feed path inserts “recommended” videos that are not from that import or from search.

Search writes `search_cache` (ids plus page token, 6-hour TTL) and upserts video rows so cards can render offline afterward.

## Playback data flow

Watch now writes `nowPlaying` and shifts the previous item according to queue rules in the renderer store, then persists settings. Progress events go to `watch_history`. The iframe is YouTube’s. MyYouTube stores a fraction of duration, not a downloaded file.

## Shutdown

`close` is intercepted once so the renderer can flush playback and the current route. After 800 ms, or on a second close, the window is `destroy()`ed. `window-all-closed` stops the renderer server, closes SQLite, and quits (non-macOS).

## Security boundary

- Renderer sandbox is configured with context isolation and **nodeIntegration: false**. Preload is not sandboxed (`sandbox: false` on the preload bridge) so IPC can be exposed. The page itself has no Node.
- Tokens never go to the renderer except as “signed in” status and an account label.
- External links open with `shell.openExternal`.
- OAuth loopback is `127.0.0.1` only.

## External systems

| System | Role |
| --- | --- |
| YouTube Data API v3 | Subscriptions, channel uploads, video details, search |
| Google OAuth | Identity and refreshable access token |
| YouTube IFrame Player | Playback only |
| Electron / Chromium | Window, GPU, autoplay policies |
| NSIS (electron-builder) | Windows installer the app can launch from a folder you choose |

See the responsibility tables in the consolidated support guide’s integration section (also summarized in [getting-started.md](getting-started.md)).
