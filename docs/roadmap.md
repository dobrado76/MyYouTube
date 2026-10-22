# Roadmap — MyYouTube

Version **0.1.17**. Only items grounded in the repository’s decisions and README are listed. Undated ideas are not commitments.

## Implemented in this version

- Electron shell, SQLite, mock and live YouTube providers.
- Google OAuth (desktop loopback, PKCE, `youtube.readonly`).
- Subscription sync with progress, local unsubscribe, channel preferences.
- Chronological Home from the local cache; Channel tab with a deeper refresh.
- Explicit search with a 6-hour cache and a one-live-call-per-action quota guard.
- Hide, watched threshold, keyword filters, blocked channels.
- Queue, Play, mini player, resume, Replay, Previous/Next.
- Saved collections (local only).
- History (watched / hidden / all hidden).
- Appearance themes, player options, hardware-acceleration toggle (restart).
- Local NSIS update check/install from a folder you choose.
- Windows installer build script.

## Known limitations (not bugs by themselves)

- Bulk sync keeps only about the newest 100 uploads per channel. Older catalogue needs Channel → Refresh, and even that is capped at 5 playlist pages per click.
- Home is chronological only. `ranked` and `priority` feed modes are stored but not what the screens request.
- Favourite does not reorder Home.
- Collections do not sync to YouTube playlists.
- No download, no offline video files, no ad blocking.
- Search quota is Google’s daily search budget, shared by the Cloud project.
- Hardware acceleration changes apply on next launch.
- Unsigned Windows installer.
- No first-class macOS/Linux packages.

## Explicitly deferred (docs/DECISIONS.md)

- Cloud sync of MyYouTube preferences.
- YouTube playlist sync for collections.
- Local LLM / embedding provider.
- Shorts detection beyond the duration heuristic.

## Not planned unless a decision says so

Do not assume multi-account switching, comments, live chat, SponsorBlock, or a “recommended” home row. They are not in the shipping UI.
