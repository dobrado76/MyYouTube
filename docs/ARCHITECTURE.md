# Architecture — MyYouTube

**Audience:** implementers starting from an empty repo.  
**Related:** [DECISIONS.md](DECISIONS.md), [IPC_CONTRACT.md](IPC_CONTRACT.md), [PRODUCT_SPEC.md](PRODUCT_SPEC.md) §5–§8, §56–§59.

---

## Process model

```text
┌─────────────────────────────────────────────────────────────┐
│ Renderer (React + Zustand)                                  │
│  Home / Subscriptions / Search / Queue / Play / Settings UI │
│  YouTube IFrame Player (official embed only)                │
│  NO nodeIntegration — no fs, no SQLite, no secrets          │
│  Packaged: loaded from http://127.0.0.1 (not file://)       │
└───────────────────────────┬─────────────────────────────────┘
                            │ contextBridge (typed IPC)
┌───────────────────────────▼─────────────────────────────────┐
│ Preload                                                     │
│  Expose narrow API; Zod-validated invoke wrappers           │
└───────────────────────────┬─────────────────────────────────┘
                            │ ipcMain.handle
┌───────────────────────────▼─────────────────────────────────┐
│ Main (Node)                                                 │
│  youtube/   OAuth, Data API v3, rate/quota awareness        │
│  db/        SQLite + migrations                             │
│  feed/      aggregate uploads, filters                      │
│  rendererServer  loopback HTTP for packaged UI (D30)        │
│  recs/      scoring + explanations                          │
│  settings/  JSON or SQLite settings                         │
│  ai/        optional classifiers (stub until Phase 4)       │
└───────────────┬─────────────────────────────┬───────────────┘
                ▼                             ▼
         userData SQLite              Google / YouTube APIs
```

Dev uses Vite’s `ELECTRON_RENDERER_URL` (`http://localhost:…`). Release builds must not use `loadFile` / `file://` — YouTube returns **Error 153** without an http(s) parent origin.

## Suggested source layout (when scaffolding)

```text
src/
  main/
    index.ts
    ipc/register.ts
    youtube/
    db/
    feed/
    recommendations/
    filters/
    history/
    settings/
    security/
  preload/
    index.ts
  renderer/
    App.tsx
    routes/
    components/
    store/
    styles/
  shared/
    schemas/          # Zod + TS types shared across processes
    ipc/              # channel names + API types
```

Names may vary; keep **YouTube I/O**, **DB**, **scoring**, and **UI** separable and mockable.

## Startup sequence (product)

1. Open window; load local DB.  
2. Render **cached** feed immediately.  
3. Check auth; refresh tokens if needed.  
4. If stale: sync subscriptions → discover uploads → fill metadata gaps.  
5. Optionally classify (later); always recompute scores when rules/inputs change.  
6. Patch UI — never block first paint on a full network sync.

## Feed source separation

Three explicit sources (never silently blended):

| Source | Meaning |
| ------ | ------- |
| Subscriptions | Only channels the user subscribed to (via API) |
| Discover | Optional personal discovery (explicit UI) |
| Search | Explicit user queries |

## Player boundary

- Renderer hosts the official YouTube IFrame / supported embed.  
- Main never fetches media binaries for playback.  
- Surrounding chrome (title, queue, hide, rate, “Why?”) is MyYouTube UI.

## Mockability

`YouTubeProvider` interface with at least:

- `YouTubeApiProvider` (live)  
- `MockYouTubeProvider` (fixtures, no quota)

All sync/feed/search code depends on the interface, not raw `fetch` scattered in UI.
