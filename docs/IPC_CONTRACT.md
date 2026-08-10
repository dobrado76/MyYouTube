# IPC contract (sketch) — MyYouTube

Renderer talks to main only through preload (`window.myyoutube`). Channel names live in `src/shared/ipc/channels.ts`; API surface in `src/shared/ipc/api.ts`.

## Envelope

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } }
```

## Suggested namespaces

### `auth.*`

| Method | Purpose |
| ------ | ------- |
| `auth.getStatus` | Signed-in?, account label |
| `auth.signIn` | Start Google OAuth (loopback) or mock |
| `auth.signOut` | Clear local tokens |
| `auth.credentialsStatus` | Whether Client ID/Secret/API key are saved |
| `auth.saveCredentials` | Save Google credentials from Settings UI |
| `auth.clearCredentials` | Remove saved credentials + tokens |

### `feed.*`

| Method | Purpose |
| ------ | ------- |
| `feed.query` | Page of videos: mode (chrono/ranked/…), filters, sort, cursor |
| `feed.refresh` | Kick subscription/upload sync (async; progress events later) |
| `feed.getModes` | Available modes + active filters |

### `channels.*`

| Method | Purpose |
| ------ | ------- |
| `channels.list` | Cached channels + local flags |
| `channels.setPreference` | favourite / muted / blocked / rating |
| `channels.unsubscribe` | Remove from MyYouTube feed (local; YouTube sub unchanged) |
| `channels.subscribe` | Add to MyYouTube feed (local; YouTube sub unchanged) |
| `channels.syncSubscriptions` | Pull subscriptions from API |

### `videos.*`

| Method | Purpose |
| ------ | ------- |
| `videos.get` | One video + local state + optional score explanation |
| `videos.hide` | Hide locally |
| `videos.setTopics` | Manual topics (later) |

### `history.*`

| Method | Purpose |
| ------ | ------- |
| `history.upsertProgress` | progress / completed |
| `history.markWatched` | Explicit |
| `history.list` | Recent |

### `search.*`

| Method | Purpose |
| ------ | ------- |
| `search.query` | Explicit search; returns cached or live results |
| `search.clearCache` | Diagnostics / settings |

### `queue.*` / `collections.*`

CRUD for watch queue and collections (Phase 3).

### `recs.*`

| Method | Purpose |
| ------ | ------- |
| `recs.explain` | Components for a video id |
| `recs.getWeights` / `setWeights` | Ranking config |
| `recs.listInterests` / `upsertInterest` | Explicit interests |

### `settings.*`

Get/patch settings (feed defaults, Shorts, appearance, watched threshold, updates folder).

### `updates.*`

| Method | Purpose |
| ------ | ------- |
| `updates.getVersion` | Current app version (`package.json` / build) |
| `updates.pickFolder` | Native folder picker for the updates directory |
| `updates.check` | Scan folder for newer `MyYouTube*Setup*.exe` |
| `updates.install` | Launch installer from that folder, then quit app |

### Events (main → renderer)

Optional later: `sync:progress`, `sync:done`, `auth:expired`.

## Rules

- No unbounded “give me all videos” without pagination.  
- Paths to DB/files never exposed as raw filesystem strings for user browsing (not a file manager).  
- Validate every invoke payload with Zod in main.
