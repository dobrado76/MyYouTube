# Product — MyYouTube

Documented against application version **0.1.17** (see repository `package.json`). Older installed builds may differ. This file describes **implemented** behaviour. Planned work is in [roadmap.md](roadmap.md).

## What it is

MyYouTube is a personal **Windows desktop** YouTube client (Electron). It lists videos from channels you subscribe to, lets you search on purpose, and plays video with the **official YouTube IFrame Player**. It does not replace YouTube’s video hosting. It replaces YouTube Home’s ranking with a local chronological library you control.

Tagline used in the project: YouTube decides what videos exist. MyYouTube decides what you see.

## Who it is for

People who want a subscription inbox instead of an engagement feed: chronological uploads, local hide/watched state, explicit search, and a queue that stays off the discovery lists.

## What it does

- Imports YouTube subscriptions and a limited window of recent uploads into a local SQLite library.
- Shows a **Personal feed** (Home) from that cache, with Hide Shorts and Unwatched only.
- Opens one **Channel** tab at a time for a deeper look at one channel’s cached videos, with its own Refresh that pulls more uploads from YouTube.
- **Search** uses YouTube Data API `search.list` only when you submit a query or explicitly load more, with a local cache (about 6 hours).
- **Queue** and **Play** (including a mini player) are a separate “sorted” session. Those videos are kept off Home, Search, and Channel.
- **Saved** collections are local folders, not YouTube playlists.
- **History** lists watched and hidden videos so you can restore or unhide them.
- **Settings** holds Google credentials, mock vs live provider, appearance, player, GPU, feed threshold, keyword/channel filters, and local installer updates.

## What it does not do

- It does not download videos, extract stream URLs, skip ads, or scrape youtube.com for data the Data API covers.
- It does not silently mix YouTube recommendations into the subscription feed.
- It does not autoplay the next video by default as an infinite feed. Next in the player follows the queue and marks watched according to the watched threshold.
- Local unsubscribe does **not** unsubscribe you on YouTube. Local subscribe does **not** create a YouTube subscription. OAuth scope is `youtube.readonly`.
- Ranked or “For you” home modes are not the shipping Home behaviour. `feedMode` exists in settings (`chrono`, `ranked`, `priority`) but Home and Channel always query `chrono`.
- There is no cloud sync of preferences, no YouTube playlist sync, and no in-app AI or embeddings.
- macOS and Linux installers are not the supported packaging target. Development may run wherever Electron runs; the shipped installer path is Windows NSIS.

## Design rules that affect what you see

1. **Discovery vs Sorted.** Home, Search, and Channel never show the video that is now playing or anything in the up-next queue. The Queue tab is where those items live.
2. **Hide Shorts defaults on.** A video is treated as a Short when duration is 60 seconds or less (or when the provider already flagged it).
3. **Watched** means explicitly marked watched, or playback progress at or above the watched threshold (default **0.7**, that is 70%). Settings → Feed changes the threshold. The same threshold is used when **Next** decides whether to mark the current video watched.
4. **Pagination, not infinite scroll.** Lists load a page (Home/Channel: 24 videos; History: 40). If the visible page is empty because filters hid everything, the app may automatically request more local pages, up to **8** consecutive empty pages, then stop and show a filters message. You can also press **Load more**.
5. **YouTube import is Subscriptions → Sync**, not Home → Refresh. Home Refresh only reloads the local cache. Channel Refresh asks YouTube for more of that one channel.

## Data you own locally

Personal state lives under Electron user data, normally `%APPDATA%\myyoutube\` on Windows (library file `myyoutube.sqlite`, tokens, window state). It is not stored in the git repository. Details are in [configuration.md](configuration.md).
