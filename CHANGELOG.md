# Changelog

All notable changes to **MyYouTube** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- YouTube IFrame **Error 153** in packaged installs: serve the renderer over `http://127.0.0.1` instead of `file://` (dev already used Vite’s http URL)

### Planned

- Ranked / priority personal feed with explainable score components
- Channel groups and collections
- Optional local classifiers (behind an interface; off by default)

---

## [0.1.1] — 2026-08-10

First public Windows MVP cut (patch bumps from `npm run dist` may increment the patch further on your machine).

### Added

- Electron + React desktop shell with horizontal top tabs (Home, Subscriptions, Search, Queue, Play, Settings)
- Google OAuth (Desktop) + credentials in Settings; mock YouTube provider for offline/dev use
- Personal chronological feed from subscription uploads (local SQLite cache)
- Subscriptions management: sync, avatars, name/description filter (300ms debounce), preference icons (normal / favourite / muted / blocked), local unsubscribe
- Search with explicit submit, Load more, local result-page cache (~6 hours)
- Official YouTube IFrame Player on Play tab: cinema mode, captions, quality preference, autoplay-on-open toggle
- Keep-alive Play session + bottom-right mini player on other tabs
- Watch queue: Watch now / Queue on cards, Queue tab with drag reorder & context menu
- Player overlay Previous / Next; Next marks watched when progress &gt; 60%
- Resume playback from saved progress; finished videos show Replay (no silent restart from 0)
- Persist now-playing, up-next, play history, and resume across restarts (flush on quit)
- Subscribe on Play when the video’s channel is not in the local subscription set
- Settings: appearance (theme / custom colours & fonts), player, performance (hardware acceleration), feed-related options, local updates folder
- Windows NSIS packaging via `npm run dist` (unsigned by default; `afterPack` sets icon/version without winCodeSign symlink unpack)

### Security / policy

- Renderer sandboxed; no Node in renderer; secrets and SQLite under Electron `userData` only
- YouTube Data API v3 + OAuth + IFrame Player only — no stream URL extraction

### Notes

- Search is subject to Google’s daily **Search Queries** quota; the personal feed does not use `search.list`
- Local subscribe/unsubscribe do not change your Google/YouTube subscription (OAuth scope is readonly)

---

## [0.1.0] — 2026-08-10

Initial tagged baseline for the public repository (same MVP scope as 0.1.1; use the highest published installer version from `release/`).

[Unreleased]: https://github.com/MeaningfulnessMediaGroup/MyYoutube/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/MeaningfulnessMediaGroup/MyYoutube/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MeaningfulnessMediaGroup/MyYoutube/releases/tag/v0.1.0
