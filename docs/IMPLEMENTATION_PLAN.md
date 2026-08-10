# Implementation plan — MyYouTube

Build **incrementally**. Do not implement all PRODUCT_SPEC phases at once.  
Canonical MVP criteria mirror PRODUCT_SPEC §60–§61 / §80–§81.

---

## Phase 0 — Spec freeze (done when this folder exists)

- [x] Product specification in repo  
- [x] Architecture / decisions / IPC / data model docs  
- [x] Scaffold empty Electron app (starts Phase 1)

---

## Phase 1 — Application shell

- [x] electron-vite + React + TS strict + Zustand + Zod  
- [x] Routing: Home, Subscriptions, Search, Queue, Play/Watch, Settings  
- [x] Horizontal top tab bar + theme tokens (light/dark/system/custom)  
- [x] Preload IPC returning typed Result envelopes  

**Exit:** App launches, navigates, persists theme.

---

## Phase 2 — Local database

- [x] SQLite under `userData`  
- [x] Migrations for channels, videos, watch_history, settings (see [DATA_MODEL.md](DATA_MODEL.md))  
- [x] Repositories; no raw SQL in renderer  

**Exit:** CRUD round-trip via IPC; survives restart.

---

## Phase 3 — Auth + YouTube provider

- [x] Mock sign-in + token file under `userData`  
- [x] Google OAuth loopback (PKCE + browser)  
- [x] Credentials via Settings UI (stored in `userData`, not `.env`)  
- [x] `YouTubeProvider` interface + Mock + live API client  
- [x] Settings: account connect/disconnect + provider toggle  

**Exit:** Authenticate; mock mode works offline with fixtures.

---

## Phase 4 — Subscriptions + chronological feed (first useful build)

- [x] Import subscriptions; cache channels  
- [x] Discover recent uploads (uploads playlist / mock fixtures)  
- [x] Chronological feed UI (cards: thumb, title, channel, age, duration)  
- [x] Cached-first render; manual Refresh  

**Exit:** Useful daily driver without ranking.

---

## Phase 5 — Player

- [x] Watch route with official IFrame player  
- [x] Record local open; mark watched  
- [x] Actions: Open on YouTube, Hide, Mark watched  

**Exit:** Play without visiting YouTube Home.

---

## Phase 6 — Search

- [x] Explicit submit search (mock + live provider)  
- [x] Persist search_cache TTL reuse (~6h, query + page token + limit)  
- [x] Filters: type videos (MVP); unwatched filter in UI  

**Exit:** Search → open player.

---

## Phase 7 — Filters + local state

- [x] Hide Shorts (default on)  
- [x] Unwatched filter  
- [x] Favourite / muted / blocked channels  
- [x] Hidden videos  

**Exit:** MVP checklist below.

---

## Phase 8 — Recommendation engine (PRODUCT Phase 2)

- Interests model  
- Weighted score + stored components  
- Ranked / Priority feed modes  
- “Why?” panel  
- Editable weights  

**Exit:** Phase 2 completion criteria in PRODUCT_SPEC §82.

---

## Phase 9 — Organisation (PRODUCT Phase 3)

- Channel groups  
- Collections  
- [x] Watch queue (manual order, persist; Play session + mini player + prev/next)  
- Presets; advanced filters; topic mute/block  

---

## Phase 10 — Optional AI (PRODUCT Phase 4+)

- `VideoClassifier` implementations  
- Embeddings / novelty / clickbait — all optional and off by default  

---

## MVP completion criteria

The MVP is done when:

1. Launch MyYouTube.  
2. Authenticate with Google.  
3. Import subscribed channels.  
4. Show recent uploads from those channels.  
5. Hide Shorts.  
6. Filter/sort videos.  
7. Select a video.  
8. Play via supported YouTube player.  
9. Record local watch state.  
10. Search YouTube.  
11. Mark channels favourite / normal / muted / blocked.  
12. Restart uses cached data.  
13. User never needs YouTube Home for this workflow.

---

## Agent implementation rules (from PRODUCT_SPEC §84)

1. Incremental work.  
2. Separate YouTube / DB / UI / scoring.  
3. App works without AI.  
4. TypeScript strict; avoid `any`.  
5. Mockable providers.  
6. Cache over chatty API.  
7. Never commit secrets or personal DB.  
8. No undocumented APIs / scraping shortcuts.  
9. Migrations for schema changes.  
10. Deterministic, testable scoring; store explanation components.  
11. Never mix subscription + discovery silently.  
12. No autoplay / infinite scroll unless later explicitly requested.  
13. When convenience conflicts with user control, keep user control.  
14. Re-check current YouTube/Google docs before each API feature.
