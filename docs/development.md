# Development — MyYouTube

Version **0.1.17**. Contributors: also read [CONTRIBUTING.md](../CONTRIBUTING.md), [DECISIONS.md](DECISIONS.md), and [PLAN.md](../PLAN.md).

## Requirements

- Node.js 20+ and npm.
- Windows is the packaged target. `npm run dev` uses Electron and can run on the developer’s OS.
- Python/build tools may be required to compile `better-sqlite3` for the installed Electron ABI (`postinstall` runs `electron-builder install-app-deps`).

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Dependencies and native module rebuild |
| `npm run dev` | electron-vite dev server |
| `npm run build` | Production bundle in `out/` |
| `npm run preview` | Preview the production bundle |
| `npm run typecheck` | `tsc` for main and renderer |
| `npm test` | Vitest once |
| `npm run lint` | ESLint, zero warnings |
| `npm run format` | Prettier on `src` |
| `npm run dist` | Patch bump, build, unsigned NSIS into `release/`, delete older installers |
| `npm run icons` | Regenerate icons (PowerShell) |
| `npm run docs:bundle` | Rebuild root `AI-SUPPORT.md` from `docs/` sources |
| `npm run docs:check` | Fail if `AI-SUPPORT.md` does not match sources (does not rewrite files) |

Isolated profile: set `MYYOUTUBE_USER_DATA` before `npm run dev`.

## Layout

- `src/main` — Electron main, SQLite, YouTube, auth, IPC.
- `src/preload` — `window.myyoutube`.
- `src/renderer` — React routes.
- `src/shared` — Zod schemas and IPC channel names (imported by all sides).
- `docs/` — product specs **and** the support set listed in [README.md](README.md).
- User databases must not be committed.

## Tests

Vitest covers narrow units (for example duration/shorts helpers, update version parsing, YouTube error mapping). There is no full Electron UI test harness in-repo. Do not treat a green `npm test` as proof of sync or player behaviour.

## Changing behaviour

Update the matching support doc in the same change:

- UI label or flow → `docs/user-guide.md` and `docs/FAQ.md`.
- Setting or default → `docs/configuration.md`.
- Error string → `docs/troubleshooting.md` and `docs/reference.md`.
- IPC or limits → `docs/reference.md`.
- Then `npm run docs:bundle`.

Product locks live in `docs/DECISIONS.md`. Do not add discovery injection, stream extraction, or renderer Node access.

## Packaging notes

`npm run dist` sets `CSC_IDENTITY_AUTO_DISCOVERY=false`. Installers are unsigned. `scripts/afterPack.mjs` runs after pack. `scripts/clean-old-releases.mjs` removes older setup exes. Output name looks like `release/MyYouTube Setup 0.1.x.exe`.

## Support docs bundle

Source order is fixed in `scripts/bundle-ai-support.mjs`. Do not hand-edit `AI-SUPPORT.md` except by changing those sources and rebundling. `docs/support-evaluation.md` is **not** bundled (maintainer-only).
