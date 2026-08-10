# Release notes — MyYouTube

Human-facing notes for GitHub Releases. Technical detail lives in [CHANGELOG.md](../CHANGELOG.md).

Replace `<owner>` with the GitHub user or organisation when publishing.

---

## MyYouTube 0.1.1 — First public MVP (Windows)

**Release date:** 2026-08-10  
**Installer:** `MyYouTube Setup 0.1.1.exe` (or the patch version produced by `npm run dist` on your machine)

### Highlights

MyYouTube is a personal YouTube client for Windows. Watch subscription uploads and search results through the official player, with a local queue, resume, and preferences — without living on YouTube Home.

### What’s included

- Personal feed from your subscribed channels (chronological, cached)
- Search (quota-aware; results cached on disk)
- Play tab with cinema mode, captions, quality preference, resume & Replay
- Mini player while you browse other tabs
- Queue (watch now / up-next, reorder, previous/next on the player)
- Subscriptions manager with channel preferences
- Settings for Google credentials, appearance, player, and hardware acceleration
- Optional updates from a folder of NSIS installers you control

### Requirements

- Windows 10 or 11
- For live data: Google Cloud OAuth **Desktop** client + YouTube Data API v3 enabled

### Getting started

1. Install from the `.exe` (SmartScreen may warn on unsigned builds — expected for personal/MVP signing).
2. Open **Settings**, paste your Google OAuth Client ID and Secret, save.
3. Sign in, open **Subscriptions → Sync**, then **Home → Refresh**.

### Known limitations

- OAuth uses **readonly** YouTube scope: in-app Subscribe / Unsubscribe only affect the **MyYouTube** feed, not your Google subscriptions.
- Google’s default **search** quota is tight (~100 `search.list` calls/day per project). Prefer the personal feed; search results are cached to help.
- Ranked / “why this video?” recommendations are **not** in this release (chrono feed only).
- Windows-only packaging for now; builds are **not code-signed**.

### Upgrade / data

App data lives under Electron `userData` (not inside the install folder). Upgrading the installer keeps your local DB, tokens, and queue unless you clear app data.

### Links

- Changelog: [CHANGELOG.md](../CHANGELOG.md)
- Docs: [docs/README.md](README.md)
- Security: [SECURITY.md](SECURITY.md)

---

## GitHub Release checklist

When cutting a release:

1. Ensure `CHANGELOG.md` has a dated section for the version.
2. `npm run dist` (or build the installer you intend to ship).
3. Tag: `git tag -a v0.1.1 -m "MyYouTube v0.1.1"` and push the tag.
4. Create a GitHub Release; paste this section (trimmed) as the body.
5. Attach `release/MyYouTube Setup <version>.exe` (and `.blockmap` if you use it).
