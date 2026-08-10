# MyYouTube — project plan

**This file is the canonical plan for this repo.** Open `F:\Sites\MyYoutube` as its own workspace. Do **not** depend on any other project, chat, or codebase.

**Working title:** MyYouTube  
**Status:** First public Windows MVP (`v0.1.x`) — Phases 1–7 plus queue/play session. Ranked recommendations still Phase 8+. Implement against `docs/` + this file.  
**License:** [MIT](LICENSE)

---

## What we are building

A **personal YouTube client** for a single authenticated user: browse subscriptions, search, and watch via the **official YouTube player**, while **MyYouTube** (not YouTube Home) decides what appears — local filtering, organisation, watch state, and transparent recommendation ranking.

Core line:

> YouTube decides what videos exist. MyYouTube decides what the user sees.

## Stack (locked for this repo)

| Layer | Choice |
| ----- | ------ |
| Shell | **Electron** + electron-vite (Windows-first desktop) |
| UI | React + TypeScript (strict) |
| State (renderer) | Zustand |
| Validation | Zod on IPC / settings / API envelopes |
| Main process | Node — YouTube Data API client, OAuth token vault, SQLite, sync, scoring |
| Renderer | **No Node integration** — UI + IFrame Player only via typed preload IPC |
| Local DB | SQLite under Electron `userData` (migrations required) |
| Tests / quality | Vitest, ESLint (0 warnings), Prettier |

The upstream product doc allowed Tauri or a pure local web app; **this repo locks Electron** so agents and humans share one architecture.

## Non-goals (MVP / v1)

- Downloading videos / reverse-engineering stream URLs
- Bypassing ads, auth, or YouTube ToS
- Scraping youtube.com when Data API v3 exists
- Reproducing YouTube Home engagement ranking
- Silent injection of discovery into the subscription feed
- Autoplay / infinite scroll by default
- Mandatory AI / embeddings in MVP

## Doc map

| Doc | Read when |
| --- | --------- |
| [README.md](README.md) | Overview + how to open the project |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution norms |
| [LICENSE](LICENSE) | MIT |
| [docs/README.md](docs/README.md) | Reading order for agents |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | GitHub Release copy |
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | Full product + technical specification (source of truth for behaviour) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Electron process model, folders, sync flow |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Locked product/tech decisions (D-numbers) |
| [docs/IPC_CONTRACT.md](docs/IPC_CONTRACT.md) | Main ↔ renderer API sketch |
| [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md) | `userData`, secrets, DB paths |
| [docs/SECURITY.md](docs/SECURITY.md) | OAuth, tokens, logging, ToS posture |
| [docs/YOUTUBE_API.md](docs/YOUTUBE_API.md) | Data API v3, quota, caching rules |
| [docs/RECOMMENDATIONS.md](docs/RECOMMENDATIONS.md) | Scoring, explainability, interests |
| [docs/UI_DESIGN.md](docs/UI_DESIGN.md) | Screens, chrome, anti-attention-trap UX |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phased build order + MVP criteria |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Entities + SQLite sketch |

## Immediate next work (when building)

MVP shell through filters, queue, and play session is in place. Prefer:

1. Polish and harden Windows installer / first-run UX for public users.
2. Ranked feed + explainability (Phase 8 / PRODUCT Phase 2) when ready.
3. Channel groups & collections (Phase 9) after ranking basics.
4. Optional AI classifiers only after MVP criteria stay green.

Do **not** start AI classification until MVP criteria in IMPLEMENTATION_PLAN are met.

## Agent rules

See [.cursor/rules/project.mdc](.cursor/rules/project.mdc). This project is standalone.
