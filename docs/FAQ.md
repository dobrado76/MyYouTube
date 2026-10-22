# FAQ — MyYouTube

Version **0.1.17**. Answers match the app, not YouTube’s website.

## Basics

### What is MyYouTube?

A Windows desktop client that keeps a local chronological library of subscription uploads and plays them with YouTube’s official player. It is not YouTube Home and it is not affiliated with Google.

### Which version is this FAQ about?

**0.1.17** as recorded in `package.json`. If Settings → Updates shows a different version, behaviour can differ. Say your version when you ask for help.

### Where do I download it?

The repository builds `release/MyYouTube Setup <version>.exe` with `npm run dist`. There is no in-app cloud download. GitHub: https://github.com/MeaningfulnessMediaGroup/MyYoutube

### Does it work on Mac or Linux?

Packaging is Windows NSIS only. Running from source depends on Electron. There is no supported Mac/Linux installer in this version.

### Is it affiliated with YouTube?

No. YouTube is a trademark of Google. Playback and metadata use official APIs.

### Does it download videos?

No. No stream URLs, no files to play offline, no ad removal.

## Installation and accounts

### How do I run it without a Google account?

Settings → Provider → **Mock (fixtures)**. Home → Refresh shows sample videos. This is the default until you save Google credentials.

### How do I use my real subscriptions?

Settings → Account: save Client ID and Client Secret, sign in, then **Subscriptions → Sync subscriptions**. Enable YouTube Data API v3 on that Cloud project and use a **Desktop app** OAuth client. Redirect URI: `http://127.0.0.1:17355/callback`.

### Where do I get a Client ID?

Google Cloud Console credentials: https://console.cloud.google.com/apis/credentials — create an OAuth client, type Desktop app. MyYouTube does not issue client ids.

### Do I need an API key?

No. It is optional. OAuth client id and secret are what sign-in uses.

### Why did saving credentials change Mock to Live?

By design. The UI says saving Google credentials switches to Live. Switch back to Mock if you want fixtures.

### What permissions does sign-in request?

`youtube.readonly` plus OpenID email and profile. The app cannot subscribe, unsubscribe, like, or upload on YouTube’s side.

### Sign-in timed out. What now?

Message: `Sign-in timed out. Try again.` Finish the browser consent. Confirm the redirect URI. Do not block `127.0.0.1`.

### Which Google account’s subscriptions are imported?

The account you pick in the browser. Brand accounts can differ from the Gmail login. If Google returns `subscriptionForbidden`, the app says to sign out, sign in again, and pick the channel that owns the subscriptions.

### Where are my tokens stored?

`<userData>/tokens/google-oauth.json` and credentials in `google-client.json`. Normally `%APPDATA%\myyoutube\tokens\`. Never paste these into issues.

### How do I sign out?

Settings → Account → sign out. Local videos remain. API calls stop until you sign in again.

## Home and sync

### How do I refresh new uploads?

**Subscriptions → Sync subscriptions** for every channel (about the newest 100 videos each). **Channel → Refresh** for one channel (deeper, 5 playlist pages). **Home → Refresh** only reloads what is already in the database.

### Why does Home Refresh finish instantly and change nothing?

It does not call YouTube. Run Sync, or Channel Refresh.

### Why doesn’t a huge channel show its whole catalogue?

Bulk sync stores 2 pages of 50 playlist items per channel. Channel Refresh stores up to 5 pages per click. There is no “download entire channel” control.

### What does the line “1200 cached · 40 match filters · showing 24” mean?

`cached` is videos on subscribed channels in SQLite. `match filters` applies Hide Shorts, Unwatched only, keywords, and exclusions. `showing` is how many cards are on screen after Discovery filters (queue, hidden, watched threshold).

### Why did a video disappear when I queued it?

Discovery (Home, Search, Channel) hides now-playing and up-next. Open **Queue**. Remove it from the queue if you want it back on Home.

### What is the difference between Hide and Not watching?

**Not watching** (check) marks the video watched. **Not watching (hide)** (eye) sets hidden so it leaves the feed even if Unwatched only is off. Both can be undone from History (Restore vs Unhide).

### Can I undo hide?

History → Hidden or All hidden → **Unhide**. That clears `hidden` in the database.

### Can I undo watched?

History → Watched → **Restore (clear watched)**.

### Why are Shorts missing?

**Hide Shorts** defaults on, on Home, Channel, and Settings → Feed. A Short is duration ≤ 60 seconds when the API did not send a better flag. Turn the checkbox off to see them.

### What does Unwatched only do?

Hides videos with completed watch history or progress at or above the threshold (default 70%). It also treats queued items as not part of Discovery. The checkbox is saved.

### Why does “Loading more…” stop with “No more videos match your filters”?

The app will automatically walk at most **8** local pages that produce zero visible cards, then stop so it cannot freeze. Relax filters or sync more uploads.

### The window froze and Task Manager still shows the process.

Close once (the app force-destroys the window after about 0.8 seconds). Close again to force quit. End the process if the OS already detached the window. In development, also stop `npm run dev`. Your library is in userData; killing the process does not delete it, but the last second of playback might not have flushed.

### Sync says it is already running.

`A subscription sync is already running. Wait for it to finish, or check Subscriptions.` Only one sync at a time. Watch the button phase text.

### Some channels failed during sync but others imported.

That is intentional. The summary can include per-channel errors. Those channels stay on the subscription list. Open a failed channel and Refresh, or sync again later. Quota or a deleted channel are typical causes.

### I unsubscribed inside MyYouTube but YouTube still shows the subscription.

Correct. Unsubscribe is local only. YouTube is unchanged.

### I subscribed from a video. Did I subscribe on YouTube?

No. The Play page control says `Add to MyYouTube subscriptions (YouTube subscription unchanged)`. It fetches that channel into the local database.

### Does Favourite change the feed order?

No. Home stays newest-first. Favourite, Muted, and Blocked are preference flags. Muted and Blocked remove the channel from Home. Favourite does not sort.

### What is Normal?

It clears favourite, muted, and blocked on that channel.

## Channel tab

### How do I open a channel?

Click the channel name on a card, or a row on Subscriptions. A channel icon appears in the tab bar. Only one channel tab exists; opening another replaces it.

### How do I close the channel tab?

**Close** on the channel page. The icon disappears. The choice is remembered until then, including across restarts.

### The channel page is empty but YouTube has videos.

Those videos are not in the local library yet, or filters hid them. Press **Refresh** on the channel page (this one talks to YouTube). Turn off Hide Shorts and Unwatched only. If the API errors, the red message is the reason (quota, auth, not found).

## Search

### Does search run while I type?

No. Submit the form or press the Search button. The top bar works the same way.

### Why did search stop working today?

`YouTube search quota exceeded for today (default ~100 search.list calls/day per Google Cloud project).` Resets midnight Pacific Time. Repeating a query within **6 hours** uses the local cache and does not spend another unit. Home sync does not use the search quota.

### What does Load more cost?

One `search.list` if that page is not cached. After a live page, extra fill only walks cache (up to 10 cached pages) and stops around 24 videos that pass the local filters. If the batch is empty but a next page exists, the button reads **Keep scanning** and the message says to load more to keep scanning.

### Why does search say results are in History?

The Search page and the top bar have a dropdown labelled like recent queries (`Recent queries appear in History`). That is search history, not the History tab of watched and hidden videos.

### Are search results mixed into Home?

No. Home is subscriptions only.

## Queue and playback

### How do I watch without leaving the page?

Click **Watch now** (play icon or thumbnail). A mini player opens at the bottom right.

### How do I open the big player?

Shift-click Watch now, press **Expand** on the mini player (tooltip `Open Play tab`), or use the Play icon. On the Queue page, **Open Play** does the same for the current item.

### What does Close player do?

Clears now playing. If you were on the Play tab, you return Home.

### What is the difference between Previous and Next?

**Previous** goes back through play history and does not mark watched. **Next** marks watched only if progress ≥ the threshold, then plays the next queued item. When the video ends, it is always marked watched and the next item starts.

### Why did Next not count as watched?

Progress was under Settings → Feed threshold (default 0.7). Watch further or lower the threshold. **Not watching** (check) on Home or Channel always marks watched. Search cards do not have that check; use Play → **Mark watched**. **Next** only records watched when progress is already at the threshold, and that video is then omitted from play history. A video that plays to the end is always marked watched and **can** be reached with **Previous**.

### It restarted from the beginning.

If you pressed **Replay**, that is intended (finished videos resume via Replay, not from a stale end position). Otherwise progress may not have flushed before a crash. Normal opens resume the saved fraction.

### Autoplay when opening a video — does the feed autoplay?

No. Settings → Player → **Autoplay when opening a video** starts the embed you opened. It does not autoplay down Home. There is no infinite-scroll autoplay.

### Cinema mode looks different.

Settings → Player → Mode → **Cinema (viewport fit)** uses the full width under the top bar. **Default** is the other layout.

### Quality will not stick.

MyYouTube writes a preferred quality into the YouTube embed and locks the range. YouTube can still fail. Check Settings → Performance → hardware acceleration (needs restart). Log file: `%APPDATA%\myyoutube\youtube-quality.log`. Further quality behaviour is YouTube’s player, not this app.

### The player says error 153.

Older packaged builds loaded the UI from `file://`, which YouTube rejects. Current builds serve the UI on `http://127.0.0.1`. Update the app. If you still see it, record the version.

### The iframe script timed out.

`Timed out loading YouTube IFrame API` means the YouTube script did not load. Check the network. MyYouTube cannot play video without it.

## Saved and history

### Are collections YouTube playlists?

No. They are local names in SQLite. They do not sync to Google. Deleting a collection does not delete videos from YouTube or from the video table.

### Why can’t I save a video?

The video row must exist locally (it appeared on a card). Error `Video not found` means it is not in the database. Duplicate collection names: `A collection with that name already exists`.

### How do I remove a save without hiding the video?

Saved tab → **Remove from this collection**. That is not Hide.

### History opened on Hidden, not Watched.

That is the default section. Choose **Watched** or **All hidden** in the left column.

### Filter on History matches what?

Title, description, and channel title, case-insensitive, after a short debounce. **Clear filter** resets it.

### Block channel from History — what happens?

The channel preference becomes blocked (and hidden as a channel). Its videos leave Home. Unblock under Settings → Filters.

## Settings

### Where are settings on disk?

Inside `%APPDATA%\myyoutube\myyoutube.sqlite`, plus token files and `hardware-acceleration.json`. Override the folder with `MYYOUTUBE_USER_DATA`.

### Do dev and the installed app share data?

Yes, if they use the same userData path. Use `MYYOUTUBE_USER_DATA` to separate them.

### I turned off hardware acceleration and nothing changed.

It applies on the **next launch**. Restart the app.

### How do updates work?

Settings → Updates → choose a folder that already contains newer `MyYouTube Setup *.exe` files → Check → Install. Nothing is downloaded from the internet. Errors include `Set an updates folder first.` and `File is not a recognized MyYouTube installer.`

### What is the watched threshold?

Settings → Feed. Default 0.7. Progress at or above it counts as watched for Unwatched only and for the player’s Next button. The slider does not go below 0.1.

### Keyword filter “spoilers” hid too much.

Filters are substrings of title **or** description, case-insensitive. A short word can match a lot. Remove it under Settings → Filters.

## Data safety

### How do I back up?

Quit the app. Copy `%APPDATA%\myyoutube` (or your override path). Include `tokens` if you do not want to sign in again. Treat the copy as secret.

### How do I start fresh without losing the backup?

Quit, rename the folder, start the app, sign in, Sync. The old folder remains as your backup. There is no merge tool.

### Will reinstalling wipe my library?

No. The installer does not store the library in Program Files. Uninstalling might, depending on Windows uninstall options — back up userData first if you care. This document cannot see a specific uninstaller checkbox beyond “data lives in userData”.

### Can two copies run at once?

They would share one SQLite file unless userData is overridden. That risks database locks. Use one instance per profile.

## Failures

### YouTube Data API v3 is not enabled.

Enable it: https://console.cloud.google.com/apis/library/youtube.googleapis.com then wait a minute and sync again.

### Quota exceeded but I did not search.

Non-search message: `YouTube API quota exceeded for today. Try again tomorrow (resets midnight Pacific Time).` Subscription listing and video details spend the general quota. Searching spends a separate search budget. Both are Google’s.

### Auth expired.

`YouTube auth expired — sign in again.` The refresh token may also fail (`Failed to refresh Google access token`). Sign out and sign in.

### Channel not found.

The id is unknown to the API (`Channel not found: …`). The channel may have been deleted.

## Development

### How do I build from source?

Node 20+, `npm install`, `npm run dev`. Tests: `npm test`. Package: `npm run dist` (bumps the patch version).

### Where do I report a bug?

https://github.com/MeaningfulnessMediaGroup/MyYoutube/issues — version, exact error text, expected vs actual. No secrets. No guaranteed response time.
