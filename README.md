# MyYouTube

**MyYouTube** is a personal desktop YouTube client. You browse **your** subscriptions, search when you mean to, and play through the **official YouTube IFrame Player** — while MyYouTube decides what appears in the feed, not YouTube Home.

> YouTube decides what videos exist. MyYouTube decides what you see.

| | |
| --- | --- |
| **Platform** | Windows (Electron) |
| **Status** | First public MVP (`v0.1.x`) |
| **License** | [MIT](LICENSE) |
| **Spec** | [PLAN.md](PLAN.md) · [docs/](docs/) |

---

## Why

YouTube Home optimises for engagement. MyYouTube is built for **agency**:

- Chronological **personal feed** from channels you subscribe to (no silent discovery mix-in)
- Local watch history, hide, and channel preferences (favourite / muted / blocked)
- Explicit search only (not keystroke spam against the API)
- Transparent architecture aimed at explainable ranking later (not yet the default Home mode)
- Playback stays on the official embed — no stream ripping, no scraping for API-covered data

---

## Features (MVP)

- **Home** — Personal feed from subscribed channel uploads (cached, refresh on demand)
- **Subscriptions** — Sync channels, avatars, filter, preference icons, local unsubscribe
- **Search** — Explicit query + Load more; results cached locally (~6h) to protect quota
- **Queue** — Watch now / add to up-next, drag reorder, context menu, clear all
- **Play** — Keep-alive player, cinema mode, captions/quality controls, resume & Replay
- **Mini player** — Continues on other tabs (bottom-right vignette)
- **Queue nav** — Previous / Next on the player overlay (Play + mini)
- **Settings** — Google credentials, provider mock/live, appearance, player, performance (incl. hardware acceleration), updates folder
- **Updates** — Install newer NSIS builds from a folder you choose (no silent cloud auto-update)

---

## Screenshots

_Add screenshots under `docs/images/` after the first tagged release if you want them on the GitHub landing page._

---

## Requirements

- **Windows 10/11** (primary target)
- **Node.js 20+** (LTS recommended) and npm
- For live YouTube data: a Google Cloud project with **YouTube Data API v3** enabled and an OAuth client of type **Desktop app**

---

## Quick start (development)

```bash
git clone https://github.com/MeaningfulnessMediaGroup/MyYoutube.git
cd MyYoutube
npm install
npm run dev
```

**Mock mode is the default.** You can exercise the UI with fixtures and no Google account.

### Live Google account

1. [Google Cloud Console](https://console.cloud.google.com/) → enable **YouTube Data API v3**.
2. Create OAuth credentials → application type **Desktop app**.
3. Enable **YouTube Data API v3**:  
   https://console.cloud.google.com/apis/library/youtube.googleapis.com  
   (or **Settings → Account → Help** for the full walkthrough).
4. In MyYouTube: **Settings → Account** → paste **Client ID** and **Client Secret** (API key optional) → **Save**.
5. **Sign in with Google** (system browser; tokens stay under Electron `userData`).

No `.env` file is required for normal use. Secrets must never be committed — see [docs/SECURITY.md](docs/SECURITY.md) and [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md).

### Isolated profile (optional)

```powershell
$env:MYYOUTUBE_USER_DATA="F:\path\to\.dev-user-data"
npm run dev
```

---

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Electron + Vite HMR |
| `npm run build` | Production bundle → `out/` |
| `npm run dist` | Bump patch version, build, package Windows NSIS installer → `release/` (removes older installers afterward) |
| `npm run typecheck` | Strict TypeScript (main + renderer) |
| `npm test` | Vitest |
| `npm run lint` | ESLint (zero warnings) |
| `npm run format` | Prettier |
| `npm run icons` | Regenerate app icons from `resources/` |

Installer output example: `release/MyYouTube Setup 0.1.x.exe` (unsigned by default).

---

## Architecture (short)

```text
Renderer (React + Zustand)  →  preload (typed IPC + Zod)  →  Main (Node)
                                                              ├─ OAuth / YouTube Data API
                                                              ├─ SQLite (userData)
                                                              ├─ Feed sync & search cache
                                                              └─ Settings / queue persistence
```

Playback uses the **official IFrame Player** only. The renderer has **no Node integration**.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/IPC_CONTRACT.md](docs/IPC_CONTRACT.md).

---

## Quota & API notes

- The **personal feed** uses subscriptions + uploads playlists — **not** `search.list`.
- **Search** hits Google’s separate **Search Queries** daily budget (often ~100 calls/project/day by default). Each search and each “Load more” counts. Results are cached locally to reduce repeats.
- Prefer **Refresh** on Home over hammering Search. See [docs/YOUTUBE_API.md](docs/YOUTUBE_API.md).

---

## Documentation

| Doc | Contents |
| --- | -------- |
| [PLAN.md](PLAN.md) | Canonical project plan |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | Human-facing release notes |
| [docs/README.md](docs/README.md) | Doc index & reading order |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Full product specification |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phases & MVP checklist |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Locked decisions (D1–D29) |
| [docs/SECURITY.md](docs/SECURITY.md) | Secrets, OAuth, ToS posture |

---

## Roadmap (high level)

**Done in MVP:** shell, SQLite, OAuth + mock/live providers, subscription feed, player, search, filters, queue/play session, settings, Windows installer path.

**Next (not required for v0.1):** ranked / priority feeds with explainable scores, channel groups & collections, richer Shorts detection, optional local AI classifiers.

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

---

## Contributing

Issues and PRs are welcome once the repo is public. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and keep product locks in [docs/DECISIONS.md](docs/DECISIONS.md) unless you are changing them deliberately (and documenting why).

---

## License

[MIT](LICENSE) © MeaningfulnessMediaGroup

YouTube is a trademark of Google LLC. This project is not affiliated with or endorsed by Google or YouTube.
