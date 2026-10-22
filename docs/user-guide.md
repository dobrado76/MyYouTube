# User guide — MyYouTube

Version **0.1.17**. Labels below match the UI.

## Chrome (always visible)

Top bar, left to right:

- Wordmark **MyYouTube**.
- Browse icons: **Home**, **Subscriptions**, **Search**. A **Channel** icon appears only while a channel tab is open (tooltip is the channel title).
- Library icons: **History**, **Saved**, **Queue** (badge count = up-next plus the playing video), **Play** (highlighted when a session exists).
- Search box placeholder **Search YouTube…**, a history dropdown, and a Search button. Submitting navigates to `/search?q=…`.
- Account icon: signed-in initial, or `?` when signed out. Tooltip `Not signed in — open Account` or the account label. Opens Account settings.
- **Settings** gear.

Tabs stay mounted so leaving Home does not throw away its scroll state until filters or a sync epoch change.

## Video cards

| Control | Where | Tooltip / name | Result |
| --- | --- | --- | --- |
| Thumbnail or title | Home, Channel, Search, Saved | Watch now (mini player). Shift-click opens Play | Starts playback in the mini player. Normal click does **not** leave the tab. The video that was playing moves to the **front** of up-next |
| Queue icon | Those cards | Watch later / Already in queue | Appends to up-next. Does nothing if it is already playing, already queued, or up-next is already 100 items (no error dialog) |
| Bookmark | Except Saved, which uses Remove | Save to collection | Save-to… picker (multi-select and create) |
| Check | Home and Channel only | Not watching | Marks watched locally and drops the card. Search cards do **not** have this button |
| Eye-off | Home, Channel, Search | Not watching (hide) | Sets `hidden`. Does not delete the YouTube video. An alert appears if the database write fails |

Channel name on the card opens the Channel tab.

Duration is `m:ss` or `h:mm:ss`. Age is relative (`5m ago`, `3h ago`, `2d ago`, `2mo ago`).

## Home — Personal feed

**What:** Chronological videos from channels with `subscribed = 1` that are not blocked, muted, or hidden as a channel, and videos that are not hidden.

**Refresh:** Reloads the **local** cache only. It does not import from YouTube. Button label **Refresh** / **Refreshing…**. Disabled while a load is busy.

**Counts** under the title when the library is non-empty: `N cached`, optionally `M match filters`, and `showing K`.

**Hide Shorts** and **Unwatched only** are on the page and persist.

**Load more:** 24 videos per page. If filters hide an entire page, the app auto-requests further local pages until something is visible, the cursor ends, or **8** empty pages in a row.

After **Subscriptions → Sync** finishes, Home reloads even if you never left the tab.

Empty states (exact intent of the copy):

- Not signed in: `Sign in, then use Subscriptions → Sync to import channels and uploads.`
- Nothing cached: `No videos cached yet. Open Subscriptions → Sync to import uploads (newest ~100 per channel).`
- Cache exists but filters exclude the loaded rows: a count plus `none match your current filters`.
- Eight empty pages in a row: `No more videos match your filters` and a hint to turn filters off or sync from Subscriptions.
- A page was fully filtered but a cursor remains: `Nothing visible on this page matches your filters. Load more or adjust filters above.`

Home **Refresh** never creates live videos by itself.

Home never lists now-playing or up-next.

## Subscriptions

**Sync subscriptions** imports from YouTube when provider is Live:

1. Downloads your subscription list (pages of 50).
2. Saves channel rows.
3. Fetches newest uploads: **2 pages × 50** items per channel (about the newest **100** videos), then stores metadata.
4. Reconciles channels that disappeared from YouTube. Channels you added only inside MyYouTube stay subscribed.
5. Per-channel upload errors are recorded (up to 8 messages) and do **not** wipe the roster. Sync does not mark everyone unsubscribed before it finishes.

While running, the button shows elapsed seconds and phase text. A second sync is rejected: `A subscription sync is already running. Wait for it to finish, or check Subscriptions.`

**Filter** box: name or description, debounced.

Each row: avatar, title, description, preference icons **Normal**, **Favourite**, **Muted**, **Blocked**, and unsubscribe.

- **Muted** or **Blocked** channels drop out of Home.
- **Unsubscribe** sets a local flag. YouTube’s subscription is unchanged. Tooltip: `Unsubscribe from MyYouTube feed (YouTube subscription unchanged)`. A later sync will not turn that channel back on until you subscribe again inside MyYouTube.
- Opening the row opens the Channel tab.

Favourite does not currently change Home sort order (Home stays chronological).

## Channel tab

One channel at a time. Opening another replaces it. The tab survives restart until **Close**.

Videos come from the local library for that channel id, even if the channel is not currently subscribed. Hide Shorts and Unwatched only match Home.

**Refresh** calls YouTube for that channel’s uploads playlist, up to **5** pages, then reloads the list. Button: **Refresh** / **Refreshing…** / status `Syncing uploads…`. This is the control to use when a large channel looks stale. Bulk sync only stored about 100 recent uploads per channel.

**Close** clears the tab and returns Home. If filters exhaust the local pages, the message tells you to turn filters off or use **Refresh** on this page (that Refresh calls YouTube). It does not say to use Subscriptions sync.

Auto-fill of empty filtered pages uses the same 8-page cap as Home.

## Search

Page field placeholder **Search videos…**. Submit or the toolbar Search button runs the query. Typing alone does not call YouTube.

While it runs with nothing on screen yet: `Searching…`, or `Searching for unwatched matches…` if Unwatched only is on.

Each explicit search or uncached **Load more** / **Keep scanning** spends **one** `search.list` call (`maxResults` 50). The app then keeps only about **24** visible hits if it can, walking **already cached** later pages (at most 10) without another live call. That is why Unwatched only can show `Keep scanning` instead of `Load more` when the current batch was entirely filtered and a next page token still exists.

Empty copy:

- `No results for “…”` when YouTube returned nothing.
- `No unwatched matches in this batch for “…”`. Load more to keep scanning.
- `No matching results for “…” (queued or watched may be filtered out).`

Cache key is lowercased query + page token + limit. Entries older than **6 hours** are ignored.

The top bar and the Search page each have a **History** dropdown of recent queries. That is not the History tab. The empty-search hint `Recent queries appear in History` means that dropdown.

Blocked keywords apply to search hits as well as to the SQL feed. Search cards can be hidden; they cannot be marked watched from the card (use Play → **Mark watched**, or Home/Channel’s check button).

## Queue

Heading **Queue**. Summary: `1 playing` or `Nothing playing`, plus `N up next`.

**Clear all** (shown when something is playing or queued) clears now playing, up-next, **and** the Previous history.

Empty hint refers to card **Watch** and **Queue** actions (the card tooltips are **Watch now** and **Watch later**).

**Now playing:** **Open Play** opens the Play tab. **Stop** clears now playing and navigates to `/play` (it does not by itself clear up-next).

**Up next:** drag the `⋮⋮` handle to reorder. **Watch** plays that item (current video moves to the front of up-next). **Remove** drops it from up-next only. Right-click menu: **Move to front of the queue**, **Move to back of the queue**, **Remove**. Escape or a click outside closes the menu.

If up-next already has 100 items, **Watch later** does nothing and shows no message.

Queue items stay off Home, Search, and Channel until they leave the session.

## Play and mini player

**Play** is a keep-alive tab. On every other tab, the same session is a **bottom-right mini player** (not hidden with `display:none`).

- Mini player chrome: **Expand** (tooltip `Open Play tab`) and **Close player** (clears now playing; if you were on Play, you go Home).
- Overlay **Previous** walks play history. It does not mark watched. The video you leave is put at the front of up-next.
- Overlay **Next** marks watched only when saved progress is at least the watched threshold, then plays up-next. A video marked watched this way is **not** pushed onto play history, so Previous will not return to it. Below the threshold, Next still advances but keeps the video on play history.
- When playback **ends**, the video is always marked watched, it **is** kept on play history (Previous can return), and up-next starts if there is one. If nothing is queued, Replay can show.
- **Replay** resets progress and starts from the beginning. Otherwise opens **resume** from the saved fraction.
- Play-page actions under the title: **Mark watched**, **Hide**, **Open on YouTube** (youtube.com in the browser, using the playable id), **Back to feed**. If the channel is not in the local subscription set: **Subscribe** / **Subscribing…** (local only).
- If the iframe fails: `Player error — try Open on YouTube.`
- Shift-click Watch now opens Play; a normal click stays on the browsing tab with the mini player.

Player settings (cinema, captions, quality, autoplay-on-open) are under Settings → Player. The official YouTube iframe performs playback. MyYouTube does not choose formats or strip ads.

Closing the window asks the renderer to flush progress (about 0.8 seconds, then the window is force-destroyed so a stuck page cannot leave a zombie process). A second close attempt force-quits immediately.

## Saved

Local **collections** (named folders). Not YouTube playlists. No sync to Google.

Left list: type a name (placeholder `Name (e.g. Programming)`) and create. Rename and delete are on the collection. Duplicate names are rejected: `A collection with that name already exists`. Empty name: `Collection name is required`.

Bookmark on a card opens **Save to collection** (checkbox membership, create inline). On the Saved page, the card’s right action is **Remove from this collection**.

## History

Sections:

| Section | What you see | Recovery |
| --- | --- | --- |
| Watched | Marked watched, newest mark first | **Restore (clear watched)** |
| Hidden | Hidden and not watched | **Unhide** returns them to Home/Search |
| All hidden | Every hidden video, including watched | **Unhide** |

Default section when you open History is **Hidden**. Filter box debounces (~280 ms) over title, description, and channel title. **Clear filter** resets it.

Row actions: Watch now, Watch later, Restore or Unhide, **Block channel**.

The list reloads when the tab is shown.

## Account and settings

See [configuration.md](configuration.md). Account is also reachable from the person icon (`/account` opens the Account section). The gear opens Settings and starts on Appearance unless the route is `/account`.

## Keyboard and clicks worth knowing

- Shift-click a card’s watch control: open Play.
- Escape closes the queue context menu.
- There is no documented global shortcut map beyond those controls.
