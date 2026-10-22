# Technical reference — MyYouTube

Version **0.1.17**. This is how the program behaves, not a second copy of Google’s API reference.

## Versions and compatibility

- `package.json` `version` is the app version baked into builds.
- `npm run dist` runs `bump:patch` **before** packaging, so a dist build’s version is one patch above the commit you started from unless you account for that.
- Windows NSIS is the only packaged target (`appId` `com.myyoutube.app`).
- Behaviour below is this source tree. Do not assume a 0.1.0 installer matches Channel Refresh or the sync safety rules.

## Navigation routes

| Route | Screen |
| --- | --- |
| `/` | Home / Personal feed |
| `/subscriptions` | Subscriptions |
| `/search?q=` | Search |
| `/channel/:id` | Channel tab |
| `/history` | History |
| `/saved` | Saved collections |
| `/queue` | Queue |
| `/play` and `/watch/:videoId` | Play |
| `/account` | Settings, Account section |
| `/settings` | Settings (opens on Appearance) |

Last route is restored from settings before the first Home fetch.

## Feed query

IPC `feed.query`. Page size requested by Home and Channel: **24** (schema allows 1–50).

SQL order: `published_at DESC, id DESC`. Cursor: `publishedAt|id`.

Home (no channel id) requires: video not hidden; channel subscribed, not blocked, not muted, not hidden.

Channel id set: video not hidden and `channel_id` matches. Subscription flag is **not** required.

Optional filters:

- Hide Shorts: `is_short` is null or 0.
- Unwatched only: `watch_history.completed` is not 1, **and** `watch_progress` is null or **below** `watchedThreshold`.
- Keyword: `INSTR` of lowercased keyword in title and description must be 0.
- Exclude ids: now playing, play queue, and ids the renderer sends (same set).

Short inference when the provider omits the flag: duration ≤ **60** seconds.

`matchingTotal` counts rows matching filters. `libraryTotal` counts videos on subscribed channels. Home shows those numbers.

Response `mode` echoes the request. Callers send `chrono`. `source` is always `subscriptions` even for a single channel.

## Sync quotas (this app’s choices, not Google’s price list)

| Action | YouTube calls (shape) |
| --- | --- |
| Subscriptions → Sync | `subscriptions.list` mine=true, 50/page, all pages; then per channel `channels.list` if uploads playlist id is unknown; `playlistItems` **2** pages, 50 each; `videos.list` for those ids |
| Channel → Refresh | channel details + **5** playlist pages |
| Subscribe from a video | channel details + **3** playlist pages |
| Home → Refresh | **none** (local SQL) |
| Search submit / uncached Load more | **one** `search.list` (max 50) plus `videos.list`. Further pages only if already in `search_cache` and younger than **6 hours**, at most **10** cached fill pages after the live call |

Concurrent syncs: error code `busy`.

Upload failures: sync continues; `failedChannels` and up to 8 `failures` strings (`Channel title: message`).

## Watched and hidden

- Progress is 0–1. Completed when explicitly marked or when progress ≥ threshold (default 0.7). Settings UI clamps the slider to 0.1–1.
- **Next** uses that threshold and does **not** add the finished item to play history when it marks watched.
- **Ended** always completes and **does** push the video onto play history before starting up-next (`finishCurrentAndPlayNext`).
- **Previous** does not complete. The video you leave is inserted at the front of up-next.
- Hide sets `hidden = 1` and `hidden_at`. Unhide clears both. Hide does not call YouTube.
- Session omit list is memory-only in the renderer store.

## Queue limits

- Up-next max **100**. **Watch later** past that limit is ignored with no dialog.
- **Watch now** moves the previous now-playing item to the front of up-next (it is not discarded).
- **Clear all** on Queue clears now playing, up-next, and play history. **Stop** on the now-playing row clears only now playing, then opens `/play`.
- Play history max **50** (most recent last).
- Search history UI cap **25** (stored array schema max 40).
- Discovery exclude list sent by the renderer is capped by schema at **150** ids.

## Playback

- Official IFrame Player script from YouTube. Packaged UI origin is `http://127.0.0.1` on an ephemeral port (`RendererServer`), not `file://`.
- Preferred quality is written into the embed’s `yt-player-quality` and locked with `setPlaybackQualityRange(target, target)`. Log: `userData/youtube-quality.log`.
- Close: renderer flush, then main force-destroys the window after **800 ms** if flush has not finished. Second close force-quits.

## OAuth

- Redirect: `http://127.0.0.1:17355/callback` (fixed port).
- PKCE. Scope string includes openid, email, profile, and `https://www.googleapis.com/auth/youtube.readonly`.
- Access token refresh uses the stored refresh token. Failures surface as `Failed to refresh Google access token`.
- Secrets are not logged by policy. Do not add logging of tokens.

## Error codes (IPC `error.code` when set)

| Code | Typical message |
| --- | --- |
| `auth.timeout` | Sign-in timed out after 5 minutes |
| `auth.invalidCallback` | Invalid OAuth callback |
| `api.notConfigured` | YouTube Data API v3 is not enabled… |
| `api.quota` | Quota exceeded (search bucket called out separately) |
| `api.forbidden` | subscriptionForbidden, insufficientPermissions, or other 403 |
| `api.notFound` | Missing channel, video, or collection |
| `api.network` | Other HTTP failure from YouTube |
| `busy` | Sync already running |
| `validation` | Zod or empty collection name |
| `updates.noFolder` | Set an updates folder first |
| `updates.launchFailed` | Installer could not be opened |
| `internal` | Uncoded exception |

The renderer shows `error.message` to the user.

## Collections

Names unique case-insensitively. Videos must already exist in `videos` to be saved. Deleting a collection cascades membership, not the video row.

## Migrations

SQLite migrations in `src/main/db/migrations.ts` run at startup. Applied ids are stored in `schema_migrations`. The app does not expose a downgrade. Copy the database file before experimenting with schema.

## IPC shape

Every invoke returns `{ ok: true, value }` or `{ ok: false, error: { code, message } }`. Channel names live in `src/shared/ipc/channels.ts`. The renderer never gets Node or the database.

## Mock provider

Fixture channels and videos in `src/main/youtube/fixtures.ts`. Upload pages are 5 items. Search filters fixtures by title, description, and channel title. No network.
