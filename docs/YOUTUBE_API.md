# YouTube API — MyYouTube

Operational rules for Data API v3. Always verify current Google documentation before coding.

## Surfaces

| Surface | Use |
| ------- | --- |
| Data API v3 | channels, videos, playlistItems, subscriptions, search |
| OAuth 2.0 | User consent; store refresh token locally |
| IFrame Player API | Playback in renderer only |

## Provider interface (required)

```ts
interface YouTubeProvider {
  getSubscriptions(): Promise<Channel[]>
  getChannel(channelId: string): Promise<Channel>
  getChannelUploads(channelId: string, opts?: { pageToken?: string }): Promise<VideoPage>
  getVideos(ids: string[]): Promise<Video[]>
  search(query: SearchQuery): Promise<SearchResultPage>
}
```

Implementations: `YouTubeApiProvider`, `MockYouTubeProvider`.

## Quota philosophy (PRODUCT_SPEC §25, §50)

- Cache aggressively (see TTLs below).  
- Batch `videos.list` ids.  
- Prefer **uploads playlist** enumeration over search for subscription feed.  
- Search only on **explicit submit**; debounce UI but do not fire API on every keystroke.  
- Persist search result pages briefly; reuse video metadata cache.  
- Manual Refresh + startup refresh for uploads; subscription list ~ daily or manual.  
- Diagnostics page later: local request counters (exact Google quota may be unavailable).

## Suggested cache TTLs

| Resource | Refresh |
| -------- | ------- |
| Video metadata | ~24h (sooner if very new) |
| Channel metadata | ~7 days |
| Subscription list | manual or ~1/day |
| Upload discovery | startup + manual Refresh |
| Search results | ~6 hours in SQLite `search_cache`; keyed by query + pageToken + limit |

### Search Queries quota (important)

Google allocates a **separate** daily budget for `search.list` (often ~100 calls/project/day by default). Each search page and each Load more consumes one call. The **personal feed does not use search** — it uses `subscriptions` + `playlistItems` (uploads) + `videos`/`channels` metadata.

## Shorts

API may not always label Shorts cleanly. Heuristic (duration + available signals) with user override; default hide ON (D8).

## Error mapping

Map to stable IPC error codes, e.g.:

- `auth.expired`  
- `api.quota`  
- `api.network`  
- `api.notFound`  
- `api.forbidden` (private/region)  

UI keeps cached content available.
