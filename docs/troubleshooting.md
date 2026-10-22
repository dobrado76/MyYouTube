# Troubleshooting — MyYouTube

Version **0.1.17**. Prefer the least destructive check first. Do not delete `%APPDATA%\myyoutube` unless you accept losing the library, tokens, queue, and settings. Copy that folder somewhere else before you remove it.

## Personal feed is empty or “not up to date”

**Symptom:** Home shows little or nothing, or videos are older than YouTube.

**Causes:**

- Provider is Mock (fixtures only) or you are not signed in.
- **Subscriptions → Sync** has never completed. Home **Refresh** does not call YouTube.
- Sync only stores about the newest **100** uploads per channel (2×50). Older videos are absent until you open that channel and press **Refresh** (up to 5 playlist pages).
- Hide Shorts and/or Unwatched only filtered them out. The subtitle `N cached · M match filters` shows this.
- Channel is muted, blocked, or locally unsubscribed.
- Keyword filter matched the title or description.
- Video is hidden, watched above the threshold, or sitting in the queue / now playing (those are hidden from Discovery on purpose).

**Checks:**

1. Settings → Provider is **Live Data API**, and the account icon shows you signed in.
2. Subscriptions lists the channel. If not, run **Sync subscriptions** and wait until the button is idle.
3. Turn off **Unwatched only** and **Hide Shorts** on Home.
4. Settings → Filters: remove keywords; unblock the channel.
5. History → Hidden / Watched: Unhide or Restore if you dismissed it.
6. Queue: remove it from up-next if you expected it on Home.
7. Open the channel and press **Refresh**.

**Expected:** Home subtitle counts rise and cards appear. Sync can take many minutes; the button text should change (`Uploads i/n`).

## Stuck on “Loading more…” or the window stops responding

**Symptom:** Channel or Home stays on `Loading more…`, or the UI repaints but clicks and close do nothing.

**Causes:** An empty filtered page used to request the next page forever. Current builds stop after **8** consecutive pages with nothing visible (`No more videos match your filters…`). A frozen renderer can still delay quit.

**Checks:**

1. Update to a build that includes the 8-page cap (0.1.x line that matches this document).
2. Turn off Unwatched only.
3. If the window is frozen: click close once (force-destroy after ~0.8 s). Click close again to force quit immediately. If the OS already killed the window and a process remains, end **MyYouTube** / **electron** in Task Manager. In `npm run dev`, a Node/Electron parent can remain in the terminal after the window dies; stop that terminal job separately.
4. Do not delete the database as a first step.

**Expected:** Either cards, a Load more button, or the filters-exhausted message. The process exits after close.

## Hide does nothing or the card comes back

**Symptom:** Eye-off hide appears to no-op, or the card returns.

**Causes:**

- An in-flight page load used to overwrite the list. Hides are session-omitted and also written as `hidden = 1`. Merges drop hidden and omitted ids.
- If the database update fails, an alert shows the error. The card may already have left the list for this session only.
- **Not watching** (check) marks watched; it is not the same as hide. With Unwatched only off, a watched video can still appear unless you also hid it.
- Restart clears the session omit list. Persistence is the database flag. Confirm under History → Hidden.

**Expected:** Card leaves Discovery and appears under History → Hidden. Unhide restores it.

## Sync feels empty or channels vanish mid-sync

**Symptom:** During sync, subscriptions disappear or Home is blank, then maybe recovers.

**Cause (older builds):** all channels were marked unsubscribed before the import finished. Current sync saves the YouTube list first, then uploads, and only then reconciles removals. Local-only subscribed channels are kept.

**Checks:** Wait until sync finishes. If a channel is missing afterward, it was not on the YouTube subscription list and was not a local-only add — or you had locally unsubscribed. Sign-in must be the YouTube identity that owns the subscriptions (brand accounts). Error: `Google denied subscription access. Sign out, sign in again, and pick the YouTube channel that owns those subscriptions (brand accounts can differ from the Gmail login).`

## Sign-in and API errors

| Message | Meaning | What to do |
| --- | --- | --- |
| `Add your Google Client ID and Client Secret in Settings first.` | No credentials saved | Settings → Account → Save both fields |
| `Google Client ID and Client Secret are both required.` | One field empty | Fill both |
| `Not signed in to Google` / `YouTube auth expired — sign in again.` | No token or HTTP 401 | Sign in again |
| `Sign-in timed out. Try again.` | Browser flow exceeded the wait | Retry; allow `http://127.0.0.1:17355/callback` |
| `Invalid OAuth callback` | Callback was not the expected code exchange | Retry; check the redirect URI |
| `Failed to refresh Google access token` | Refresh token rejected | Sign out and sign in again |
| `YouTube Data API v3 is not enabled…` | API disabled on the Cloud project | Enable it, wait a minute, sync again. https://console.cloud.google.com/apis/library/youtube.googleapis.com |
| `YouTube search quota exceeded for today…` | `search.list` daily cap (often ~100/project) | Use cached searches; resets midnight Pacific Time. Feed sync does not use search |
| `YouTube API quota exceeded for today…` | General Data API quota | Wait for Pacific midnight reset. Avoid repeated full syncs |
| `Missing YouTube permission…` | Token lacks `youtube.readonly` | Sign out and sign in, grant the scope |
| `YouTube API forbidden (path): …` | Other 403 | Read the detail. Often Cloud project, quota, or identity |
| `Channel not found: …` | API returned no channel | Id is wrong or removed |
| `A subscription sync is already running…` | Second sync | Wait |

Token exchange failures surface as `Token exchange failed: …` (Google’s body). That is a Google OAuth problem (wrong secret, redirect mismatch, or consent).

## Search returns nothing or burns quota

**Symptom:** Search is empty, or you hit the search quota message.

**Causes:** Each new query and each uncached Load more costs one search unit. Cache lasts 6 hours and is keyed by the exact lowercased query. Unwatched only can hide every hit on a page; the app may walk cached pages only after the first live call. Keywords and the queue exclude hits. Mock provider searches fixtures only.

**Checks:** Settings → Provider is Live. Repeat the same query within 6 hours (should be cached). Turn off Unwatched only. Do not mash Search.

## Playback problems

| Symptom | Likely side | Action |
| --- | --- | --- |
| Black player, YouTube error 153 in a packaged build | Origin was `file://` in old builds | Current packaged app serves the UI at `http://127.0.0.1:<port>`. Update the app |
| `Timed out loading YouTube IFrame API` / `YouTube IFrame API failed to initialize` / `Failed to load YouTube IFrame API script` | Network or YouTube script blocked | Check firewall/DNS. MyYouTube does not host the player |
| `Player error — try Open on YouTube.` | The embed reported an error | Play page → **Open on YouTube**. Quality and ads are still YouTube’s |
| Quality stays low | YouTube ABR, or GPU off | Settings → Player quality; Performance → hardware acceleration (restart). See `userData/youtube-quality.log` |
| Starts at 0 though you watched some | Progress not flushed, or Replay | Close once so flush runs. Replay intentionally restarts |
| Mini player missing | Nothing in now playing | Watch now on a card |
| Next did not mark watched | Progress under threshold | Settings → Feed threshold, or watch further. End of video always marks watched |

## Updates

**Symptom:** Check says no folder, or install refuses the file.

Use Settings → Updates, pick the folder that actually contains `MyYouTube Setup <version>.exe`, then Check. Install only launches that local file. It will not download a build for you. The installer must sit inside the configured folder.

## Window or process left behind

See the freeze section. Dev mode: closing the window does not always stop `npm run dev`; use the terminal. Installed app: after the force-destroy path, `window-all-closed` quits and closes SQLite.

## Database / “corrupt” library

**Symptom:** App will not start, or lists are nonsense after a crash.

SQLite uses WAL (`myyoutube.sqlite-wal` / `-shm` may exist). Do not delete `-wal` while the app is running.

**Safe recovery:**

1. Quit MyYouTube (Task Manager if needed).
2. Copy the entire `%APPDATA%\myyoutube` folder to a backup.
3. Start again. If it still fails, rename `myyoutube.sqlite` (and wal/shm) aside and start — you get an **empty** library. Tokens in `tokens\` can be left in place. You will need **Sync** to refill videos. Watch history in the old file is not merged automatically. There is no in-app import of a renamed database.

## What to send in a bug report

GitHub issues: https://github.com/MeaningfulnessMediaGroup/MyYoutube/issues

Include: app version (Settings → Updates shows the running version), Windows version, provider Mock or Live, the **exact** error text, and what you expected. Do **not** paste client secrets, refresh tokens, `google-oauth.json`, or `google-client.json`. Redact personal channel lists if they are private. A screenshot of the message is enough. There is no support desk and no response-time promise.
