# Decisions — MyYouTube

Locked choices for **this** repository. When [PRODUCT_SPEC.md](PRODUCT_SPEC.md) lists alternatives, this table wins.

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D1 | **Electron + electron-vite** desktop app (not Tauri, not pure local web for v1) | Match intended desktop architecture; one locked stack for agents |
| D2 | Renderer **sandbox + contextIsolation**; **no Node** in renderer | Security; secrets and DB stay in main |
| D3 | Typed preload IPC + **Zod**; Result `{ ok, value } \| { ok: false, error }` | Safe boundaries; consistent errors |
| D4 | All personal state under Electron **`userData`** (SQLite, tokens, caches) | Portable, reinstall-friendly, never pollute repo |
| D5 | **YouTube Data API v3** + Google OAuth + **IFrame Player API** only | ToS / supported surfaces |
| D6 | **No** stream URL extraction, download, ad/auth bypass, or website scraping for API-covered data | Policy + maintainability |
| D7 | Subscription feed **never** silently injects discovery/recommended non-subscription items | Core product honesty |
| D8 | Default **Hide Shorts = ON**; heuristic if API unclear; user-correctable | Attention control |
| D9 | **Autoplay opened Watch video** defaults **on** (user-togglable); **no autoplay-next** and **no infinite scroll** by default; pagination or Load more | Convenience for intentional opens; still avoid attention traps |
| D10 | Explicit interests / blocks **override** inferred behaviour | Philosophy §2.1 |
| D11 | Recommendation scores store **components** for “Why?” explanations | Transparency |
| D12 | Ranking weights in editable config (JSON/settings); UI exposure Phase 2+ | Deterministic, testable |
| D13 | MVP **without** AI/embeddings; `VideoClassifier` interface reserved | Ship useful client first |
| D14 | Aggressive **caching** + conservative quota; search only on explicit submit (debounced typing does not fire search) | Quota philosophy |
| D15 | Mock YouTube provider + fixtures required before heavy live API work | Dev without burning quota |
| D16 | Themes via **CSS variables**; modes **light / dark / system / custom** with editable accent, palette, fonts, and font size | Appearance without library lock-in |
| D17 | Windows-first packaging; other OS later if needed | Primary user platform |
| D18 | Watched default: **≥ 70%** progress (configurable); also explicit mark-watched | Local history independence |
| D19 | Prefer **playlist-based upload discovery** (`uploads` playlist) over expensive search for feed | Quota |
| D20 | Product display name **MyYouTube** (capital T); npm/package id remains `myyoutube` | Brand spelling matches YouTube; package name stays lowercase |
| D21 | Updates via a **user-configured local folder** of setup installers; Check Updates + Install launches the newer NSIS setup (no silent cloud auto-update in MVP) | Simple personal deploy path; keep install under user control |
| D22 | Google Client ID / Secret / optional API key configured in **Settings UI**, persisted in `userData` — no required manual `.env` edits for normal use | Operator UX; secrets stay out of the repo |
| D23 | **Horizontal top tab bar** navigation (no left sidebar); cinema Watch uses full content width under chrome | Full-width video; keep primary nav without a side rail |
| D24 | **Hardware acceleration** toggle in Settings → Performance; when off, disable Chromium GPU (incl. accelerated video decode) before `app.ready` via boot file in `userData`; requires restart | Free GPU for AI training; YouTube IFrame shares Electron’s Chromium process |
| D25 | **Play** is a keep-alive tab; on other tabs a **bottom-right mini player** shows the same session (not `display:none`) | Interrupt-free browsing with glanceable playback |
| D26 | **Queue** tab + card actions as triage: **Watch now**; **Watch later** (queue) removes the card from Home immediately and from feed queries until dequeued (Queue tab only); **Not watching** via mark-watched / hide also removes from Home. Watch plays now (current stays at front of up-next; up-next never cleared); drag/context reorder; on ended → mark watched + autoplay next | Feed as sorter into watch-later vs not-watching, without YouTube Home autoplay-next |
| D27 | Resume playback from saved watch progress; never restart from 0 unless finished — then show **Replay** (resets progress and plays from start) | Continuity across sessions / tab switches |
| D28 | Persist **nowPlaying** + **playQueue** + resume progress in settings; flush player position on window close so Play restores exact spot after restart | Restart-safe Watch/Queue continuity |
| D29 | Player overlay **Previous / Next** (Play + mini player) walks `playHistory` / up-next; **Next** marks watched when progress **≥ `watchedThreshold`** (Settings → Feed; default 0.7) and drops the item from the session (no playHistory); below that, Previous still works; ended always marks watched | Queue navigation without leaving the player; one threshold for “watched” |
| D30 | Packaged app serves the renderer over **`http://127.0.0.1:<ephemeral>`** (not `file://`) so the YouTube IFrame Player gets a valid http origin | Avoids YouTube Error 153 in release builds |
| D31 | **History** tab: Watched / Hidden only (sorted by mark/hide time; Restore/Unhide). **Settings → Filters**: blocked channels + keyword filters (case-insensitive title/description substrings); both apply to Home + Search | History = archive; Settings = ongoing filters |

## Deferred (explicitly not locked yet)

- Cloud sync of MyYouTube preferences  
- YouTube playlist sync for collections  
- Local LLM / embedding provider choice  
- Exact Shorts detection beyond heuristics  

---

Update this file whenever a product or architecture choice is finalized during implementation.
