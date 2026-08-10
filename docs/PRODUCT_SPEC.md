# Personal YouTube Client — Product & Technical Specification

**Working title:** MyYouTube  
**Document type:** Product Requirements + Technical Specification  
**Status:** Initial specification (imported into MyYouTube repo)  
**Primary platform:** Desktop application  
**Primary user:** Single authenticated user  
**Objective:** Provide a user-controlled YouTube browsing and playback experience without exposure to YouTube's engagement-driven Home recommendation feed.

> **Repo note:** This file is the behavioural bible. For **this** repository, stack and process locks live in [../PLAN.md](../PLAN.md) and [DECISIONS.md](DECISIONS.md) — notably **Electron + React** (not Tauri / pure local-web). Where this document lists options, **DECISIONS.md wins**.

---

# 1. Overview

## 1.1 Purpose

Build a personal YouTube client that uses YouTube as the underlying video platform while replacing the standard YouTube browsing experience with a transparent, user-controlled interface.

The application must allow the user to:

- Browse subscribed channels.
- See newly uploaded videos from subscriptions.
- Search YouTube.
- Watch YouTube videos using the official YouTube player.
- Organise channels into custom groups.
- Filter unwanted content.
- Hide Shorts.
- Hide channels or individual videos.
- Maintain a local watch state.
- Maintain explicit interest preferences.
- Rank videos using configurable rules.
- Generate recommendations independently of YouTube's Home recommendation algorithm.
- Avoid engagement-optimised infinite-scroll behaviour.
- Preserve user agency by making recommendation logic visible and editable.

The application should treat YouTube primarily as:

1. a video catalogue;
2. a metadata provider;
3. a hosting/streaming service.

The application's own local data and ranking system should determine what the user sees.

---

# 2. Core Product Philosophy

The application must follow these principles.

## 2.1 User intent over inferred engagement

Do not assume that watching a video means the user wants more videos about the same subject.

Explicit user preferences must take priority over behavioural inference.

For example:

```text
Watching:
"Why aircraft crashes happen"

must NOT automatically imply:

interest("aircraft disasters") += large_amount
```

A user may watch something because it is:

- temporarily relevant;
- required for research;
- linked by someone else;
- curiosity-driven;
- disliked;
- misleading;
- being investigated;
- completely unrelated to their normal interests.

Explicit preferences should therefore dominate implicit signals.

---

## 2.2 Transparent recommendations

Every recommendation should, where practical, be explainable.

Example:

```text
Recommended because:

+ Subscribed channel
+ Matches "Artificial Intelligence"
+ Technical depth preference
+ 23 minutes, within preferred duration
+ Published today
- Similar topic watched recently

Final score: 82
```

There must be no invisible engagement optimisation layer.

---

## 2.3 No attention traps

Avoid UX patterns whose primary purpose is maximising time-on-platform.

Do not implement:

- autoplay by default;
- infinite scrolling by default;
- endless recommendation chains;
- forced Shorts feeds;
- artificial urgency;
- engagement streaks;
- algorithmically inserted unrelated content.

Pagination or explicit "Load more" controls are preferred.

---

# 3. Goals

## 3.1 Primary goals

The application should provide:

1. A clean alternative YouTube UI.
2. A chronological subscription feed.
3. Custom channel organisation.
4. Powerful filtering.
5. User-controlled recommendation ranking.
6. Search without exposing the user to YouTube Home.
7. Official YouTube playback.
8. Local user profiles and preferences.
9. Local watch-history intelligence.
10. Optional local AI classification/recommendation functionality.

---

## 3.2 Secondary goals

Future versions may provide:

- automatic topic classification;
- semantic video similarity;
- local embeddings;
- local LLM analysis;
- automatic clickbait detection;
- transcript analysis;
- custom watch queues;
- research collections;
- topic-specific feeds;
- duplicate-topic suppression;
- information-quality scoring.

---

# 4. Non-Goals

The application must NOT attempt to:

- download YouTube videos unless explicitly added later using a legally and technically appropriate mechanism;
- extract or reverse-engineer YouTube's raw streaming URLs;
- bypass YouTube advertising mechanisms;
- bypass YouTube authentication;
- scrape data unnecessarily when an official API exists;
- impersonate YouTube;
- reproduce YouTube's recommendation algorithm;
- maximise engagement;
- automatically publish content.

The initial application is a personal client, not a commercial YouTube replacement.

---

# 5. High-Level Architecture

```text
┌──────────────────────────────────────────────┐
│                  User Interface              │
│                                              │
│ React / TypeScript                           │
│                                              │
│ - Home                                       │
│ - Subscriptions                              │
│ - Search                                     │
│ - Channels                                   │
│ - Collections                                │
│ - Watch Queue                                │
│ - Settings                                   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             Application Services             │
│                                              │
│ - YouTube API Service                        │
│ - Feed Aggregator                            │
│ - Recommendation Engine                     │
│ - Filter Engine                             │
│ - Watch History                             │
│ - Channel Management                         │
│ - Search Cache                               │
│ - Metadata Cache                             │
│ - Optional AI Classification                 │
└──────────────────────┬───────────────────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
┌──────────────────────┐   ┌──────────────────────┐
│ Local Application DB │   │ YouTube APIs         │
│                      │   │                      │
│ SQLite recommended   │   │ Data API v3          │
│                      │   │ OAuth                 │
│ preferences          │   │ IFrame Player API    │
│ history              │   │                      │
│ cache                │   │                      │
│ classifications      │   │                      │
└──────────────────────┘   └──────────────────────┘
```

---

# 6. Recommended Technology Stack

## 6.1 Frontend

Preferred:

- React
- TypeScript
- Vite

UI framework should remain lightweight.

Possible choices:

- plain CSS / CSS Modules;
- Tailwind CSS;
- Material UI;
- shadcn/ui.

Avoid coupling core application logic to a specific component library.

---

## 6.2 Application runtime

Two acceptable architectures exist.

### Option A — Local web application

```text
React frontend
       │
       ▼
Node.js local backend
       │
       ├── YouTube API
       └── SQLite
```

### Option B — Desktop application

Possible wrappers:

- Tauri;
- Electron.

Tauri is preferred if a dedicated desktop executable becomes desirable because it has significantly lower runtime overhead than Electron.

The architecture should nevertheless keep the frontend largely platform-independent.

---

# 7. Data Storage

SQLite is recommended for the application because the system will eventually need efficient queries across:

- videos;
- channels;
- topics;
- classifications;
- watch history;
- subscriptions;
- feed state;
- user ratings;
- recommendation scores.

JSON may still be used for:

- configuration;
- backup/export;
- themes;
- user-editable ranking rules.

---

# 8. Authentication

Use Google OAuth 2.0.

Authentication must:

- happen through Google's supported OAuth mechanism;
- request only necessary scopes;
- securely retain authentication tokens;
- allow token refresh;
- never commit credentials or tokens into source control.

OAuth credentials should be stored outside the repository.

Example:

```text
.env.local
```

Must be excluded through `.gitignore`.

---

# 9. YouTube Integration

## 9.1 YouTube Data API

Use the YouTube Data API v3 for metadata and account-related functionality.

Expected API resources include:

- channels;
- videos;
- playlists;
- playlistItems;
- subscriptions;
- search.

---

## 9.2 Subscription discovery

Retrieve the authenticated user's subscriptions.

For each subscribed channel, obtain its channel metadata.

The application's local database should maintain a cached representation of subscriptions.

Example entity:

```ts
interface Channel {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;

    subscribed: boolean;

    uploadsPlaylistId?: string;

    customGroups: string[];

    hidden: boolean;
    muted: boolean;

    userRating?: number;
    qualityWeight?: number;

    lastFetchedAt?: string;
}
```

---

# 10. Subscription Feed

The application must provide a chronological subscription feed independent of YouTube Home.

Conceptually:

```text
Subscribed Channels
        │
        ├── Channel A uploads
        ├── Channel B uploads
        ├── Channel C uploads
        ├── Channel D uploads
        │
        ▼
Local Aggregator
        │
        ├── filtering
        ├── deduplication
        ├── ranking
        ├── topic classification
        └── local watch status
        │
        ▼
Personal Feed
```

---

# 11. Feed Modes

At minimum provide the following feed modes.

## 11.1 Chronological

Strictly:

```text
publicationDate DESC
```

No ranking algorithm should alter order.

---

## 11.2 Ranked

Rank according to the user's local recommendation rules.

---

## 11.3 Unwatched

Show only videos not locally considered watched.

---

## 11.4 Priority

Show videos whose local recommendation score exceeds a configurable threshold.

Example:

```text
score >= 70
```

---

## 11.5 Channel group

Examples:

```text
AI
Science
Physics
Programming
Music
Documentaries
Gaming
News
```

Groups are user-defined.

A channel may belong to multiple groups.

---

# 12. Core Home Screen

Suggested layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ MyTube                                      Search...         │
├──────────────┬────────────────────────────────────────────────┤
│ HOME         │                                                │
│              │ Personal Feed                                  │
│ Subscriptions│                                                │
│ Watch Queue  │ [Video] Title                                  │
│ Collections  │         Channel                                │
│              │         28 min                                 │
│ GROUPS       │         AI • Programming                       │
│              │                                                │
│ AI           │ [Video] Title                                  │
│ Science      │         Channel                                │
│ Space        │                                                │
│ Programming  │                                                │
│ Music        │                                                │
│              │                                                │
│ FILTERS      │                                                │
│              │                                                │
│ ☑ No Shorts  │                                                │
│ ☑ Unwatched  │                                                │
│ ☐ > 10 min   │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

---

# 13. Video Cards

Each video card should support:

- thumbnail;
- title;
- channel;
- publication date;
- duration;
- view count, optionally;
- topic tags;
- locally calculated recommendation score;
- watched/unwatched status;
- watch-later button;
- hide button;
- dislike-for-recommendation button;
- channel mute option;
- recommendation explanation.

Example:

```text
┌──────────────────────────────────────────────┐
│ [thumbnail]  Why Neural Networks Generalise │
│                                              │
│              Example Channel                 │
│              27 min • 3 hours ago            │
│                                              │
│              AI • Machine Learning           │
│                                              │
│              Personal score: 91              │
│                                              │
│ [Watch] [Queue] [Hide] [Why?]                │
└──────────────────────────────────────────────┘
```

---

# 14. Video Playback

Use YouTube's supported embedded/player mechanism.

Do not attempt to obtain raw streaming URLs.

The application should provide its own surrounding interface while playback remains handled by YouTube.

Example:

```text
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                       YouTube Player                          │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ Video Title                                                   │
│ Channel                                                       │
│                                                               │
│ [Save] [Queue] [Hide] [Rate] [Open on YouTube]               │
├───────────────────────────────────────────────────────────────┤
│ Personal Recommendations                                     │
│                                                               │
│ Video A                                                       │
│ Video B                                                       │
│ Video C                                                       │
└───────────────────────────────────────────────────────────────┘
```

---

# 15. Recommendation Engine

The recommendation engine is one of the primary features.

It must be:

- local;
- transparent;
- deterministic where possible;
- configurable;
- independent from YouTube Home recommendations.

---

# 16. Initial Recommendation Model

Start with a weighted scoring model.

Example:

```ts
score =
    subscribedChannelWeight +
    interestMatchWeight +
    channelPreferenceWeight +
    durationPreferenceWeight +
    freshnessWeight +
    qualityWeight +
    noveltyWeight -
    clickbaitPenalty -
    shortsPenalty -
    repetitionPenalty -
    hiddenTopicPenalty;
```

Example conceptual values:

```text
+ 50 subscribed channel
+ 30 strong interest match
+ 20 favourite channel
+ 10 preferred video duration
+ 10 recently published
+ 15 high-quality channel

- 100 hidden topic
- 100 muted channel
- 50 Shorts
- 30 likely clickbait
- 20 excessively repeated subject
```

Final values must be configurable.

---

# 17. Recommendation Rule Configuration

Store ranking configuration separately.

Example:

```json
{
  "weights": {
    "subscribedChannel": 50,
    "strongInterestMatch": 30,
    "weakInterestMatch": 10,
    "favouriteChannel": 20,
    "preferredDuration": 10,
    "freshness": 10,
    "highQualityChannel": 15,
    "shorts": -50,
    "clickbait": -30,
    "repeatedTopic": -20,
    "blockedTopic": -1000
  }
}
```

Eventually expose these values through the UI.

---

# 18. Recommendation Explainability

Every recommendation result should store individual scoring components.

Example:

```ts
interface RecommendationScore {
    finalScore: number;

    components: {
        name: string;
        value: number;
        reason: string;
    }[];
}
```

Example output:

```text
Score: 84

+50 Subscribed channel
+30 Strong match: Artificial Intelligence
+10 Preferred duration
+10 Published recently
-16 Similar videos recently watched
```

---

# 19. Explicit Interest Model

The application must support explicit user interests.

Example:

```ts
interface Interest {
    id: string;
    name: string;

    weight: number;

    mode:
        | "strong_interest"
        | "interest"
        | "neutral"
        | "low_interest"
        | "blocked";
}
```

Possible UI:

```text
Artificial Intelligence    █████  Very High
Physics                    █████  Very High
Space                      ████   High
Programming                ████   High
Cats                       ███    Medium
Celebrity News             BLOCKED
Shorts                     BLOCKED
```

Explicit settings must override behavioural inference.

---

# 20. Channel Preferences

Users must be able to assign channel-specific states.

Example:

```text
Favourite
Normal
Low priority
Muted
Blocked
```

Optional numerical quality rating:

```text
0–5 stars
```

or:

```text
0–100
```

---

# 21. Filtering System

Required filters:

- hide Shorts;
- watched / unwatched;
- minimum duration;
- maximum duration;
- publication date;
- channel;
- channel group;
- topic;
- keyword;
- hidden keywords;
- language, where metadata allows;
- minimum recommendation score.

Filters should be combinable.

---

# 22. Shorts Handling

Shorts should be suppressible globally.

Setting:

```text
Hide YouTube Shorts: ON/OFF
```

Default:

```text
ON
```

Where exact Shorts classification cannot be reliably determined from metadata alone, implement a configurable heuristic.

Potential indicators include:

- very short duration;
- URL/metadata information where available;
- later user corrections.

Do not assume every short-duration video is necessarily a Short.

---

# 23. Search

Provide a dedicated search interface.

Search should use YouTube's supported search functionality.

The user's query should not send them to YouTube Home.

Example:

```text
Search: "quantum gravity"

Filters:

[x] Videos
[ ] Channels
[ ] Playlists

Duration:
Any | < 5m | 5–20m | 20–60m | > 60m

Sort:
Relevance
Newest
Personal score
```

---

# 24. Search Result Re-Ranking

Search results may be locally re-ranked after retrieval.

Modes:

```text
YouTube relevance
Personal relevance
Newest
Duration
Channel preference
```

"Personal relevance" must use the application's recommendation engine.

---

# 25. Search Quota Management

Search operations are relatively expensive/restricted compared with ordinary metadata retrieval.

Therefore:

- cache search results;
- avoid automatically issuing searches while typing;
- debounce queries;
- preferably search only after explicit submission;
- persist recent results;
- reuse cached metadata.

Provide a quota diagnostics page later.

---

# 26. Metadata Cache

Videos fetched from the API should be cached locally.

Example:

```ts
interface Video {
    id: string;

    channelId: string;

    title: string;
    description?: string;

    publishedAt: string;

    durationSeconds?: number;

    thumbnailUrl?: string;

    viewCount?: number;
    likeCount?: number;

    fetchedAt: string;

    isShort?: boolean;

    watched?: boolean;

    watchProgress?: number;

    hidden?: boolean;

    topicIds?: string[];

    recommendationScore?: number;
}
```

---

# 27. Cache Strategy

Suggested rules:

### Video metadata

Refresh after:

```text
24 hours
```

unless recently published.

### Channel metadata

Refresh after:

```text
7 days
```

### Subscription list

Refresh:

```text
manually
or once/day
```

### New upload discovery

Refresh:

```text
on application startup
and manually via Refresh
```

Optional background refresh can be considered later.

---

# 28. Watch History

Maintain a local watch history independent of YouTube wherever practical.

Example:

```ts
interface WatchHistoryEntry {
    videoId: string;

    firstOpenedAt: string;
    lastOpenedAt: string;

    completed: boolean;

    progress?: number;

    userRating?: number;

    hiddenAfterWatching?: boolean;
}
```

---

# 29. Watched Definition

A video may count as watched when any of the following configurable conditions occur:

```text
opened manually;
played > X seconds;
watched > X%;
explicitly marked watched.
```

Recommended default:

```text
watched >= 70%
```

Store partial progress where technically practical.

---

# 30. Recommendation Feedback

Provide explicit controls.

Examples:

```text
More like this
Less like this
Hide this video
Hide this topic
Mute this channel
Favourite this channel
Not interested in this topic
Already know this
Save for later
```

The system should avoid collapsing all these signals into a single generic "engagement" value.

They mean different things.

---

# 31. Critical Semantic Distinction

The application should distinguish:

```text
"I dislike this video"

from

"I do not want this topic"

from

"I already know this information"

from

"I do not want this channel"

from

"I don't want this NOW"
```

These are fundamentally different user intents.

Store them separately.

---

# 32. Watch Queue

Provide a deliberate watch queue.

Example:

```text
WATCH NEXT

1. Neural Rendering Explained
2. Quantum Gravity Lecture
3. New GPU Architecture Analysis
```

Queue behaviour:

- manual order;
- drag/drop;
- no automatic insertion unless explicitly enabled;
- optionally save queue between sessions.

---

# 33. Collections

Provide user-created collections.

Examples:

```text
AI Research
Physics
Watch With Liana
Programming Tutorials
Later
Important
Music
```

Collections are separate from YouTube playlists initially.

Future functionality may optionally synchronise selected collections with YouTube playlists.

---

# 34. Topic Model

Initial version:

Topics may be:

- manually assigned;
- keyword-derived;
- assigned through rules.

Future version:

Use embeddings or local AI classification.

Example:

```json
{
  "videoId": "abc123",
  "topics": [
    {
      "name": "Artificial Intelligence",
      "confidence": 0.96
    },
    {
      "name": "Image Generation",
      "confidence": 0.90
    },
    {
      "name": "LoRA Training",
      "confidence": 0.86
    }
  ]
}
```

---

# 35. Optional Local AI Layer

A local AI service may later analyse new videos.

It must be optional.

Possible tasks:

- topic classification;
- clickbait estimation;
- technical-depth estimation;
- semantic embeddings;
- title normalisation;
- duplicate-topic detection;
- relevance scoring;
- transcript summarisation.

Example output:

```json
{
  "topics": [
    "Artificial Intelligence",
    "Image Generation",
    "LoRA"
  ],

  "technicalDepth": 4,
  "clickbaitProbability": 0.12,
  "interestProbability": 0.91,
  "informationDensity": 0.83
}
```

---

# 36. AI Architecture

Do not couple the main application directly to a specific LLM.

Create an abstraction.

Example:

```ts
interface VideoClassifier {
    classify(video: Video): Promise<VideoClassification>;
}
```

Possible implementations:

```text
RuleBasedClassifier
EmbeddingClassifier
LMStudioClassifier
LocalModelClassifier
CloudClassifier
```

The application must work without any AI provider.

---

# 37. Embeddings

A lightweight local embedding model may eventually be preferable to running an LLM for every recommendation.

Represent:

```text
video
channel
topic
interest
```

as embeddings.

Similarity:

```text
similarity(video_embedding, user_interest_embedding)
```

can contribute to recommendation scores.

Do not make embeddings mandatory in V1.

---

# 38. Clickbait Detection

Potential future feature.

Signals could include:

- excessive capitals;
- excessive punctuation;
- common clickbait patterns;
- thumbnail OCR;
- title/description mismatch;
- AI classification.

Example:

```text
"This Changes EVERYTHING!!!"

clickbait probability = 0.81
```

Clickbait probability should only influence ranking, not automatically hide content unless configured.

---

# 39. Repetition Suppression

One problem with recommendation systems is repeatedly presenting the same subject.

Track recent semantic topics.

Example:

```text
User watched:

5 videos about RTX 6090 rumours
within 2 days
```

The system may reduce additional recommendations for the same topic.

Example:

```text
repetitionPenalty = -25
```

The penalty should decay with time.

---

# 40. Novelty

The recommendation engine may positively score meaningful novelty.

Example:

```text
high interest topic
+
sub-topic not encountered recently
=
novelty bonus
```

This prevents the system from creating an increasingly narrow filter bubble.

---

# 41. Discovery

Provide an optional "Discover" section.

Discovery must differ conceptually from YouTube Home.

Sources may include:

- explicit YouTube searches;
- neighbouring topics;
- selected trusted channels;
- high-ranking videos discovered through search;
- channels manually approved for discovery.

Discovery must be optional.

---

# 42. Trusted Channels

Allow users to maintain a list of trusted channels.

Example:

```text
PBS Space Time
Computerphile
Fermilab
Veritasium
...
```

Trusted status may provide a ranking bonus.

It must not guarantee recommendation.

---

# 43. Block Lists

Provide:

### Blocked channels

Never show.

### Muted channels

Normally hide but remain searchable.

### Blocked topics

Never recommend.

### Muted topics

Reduce ranking substantially.

### Blocked keywords

Hide matching videos.

---

# 44. Recommendation Presets

Allow different recommendation configurations.

Examples:

```text
General
Deep Technical
Relaxation
Music
Learning
Quick Watch
Long Form
```

Example:

```text
Deep Technical

minimum duration: 10 min
technical depth >= 3
clickbait penalty: high
Shorts: hidden
freshness importance: low
topic relevance: high
```

---

# 45. Sorting

Feed sorting options:

```text
Personal Score
Newest
Oldest
Duration Short → Long
Duration Long → Short
Channel
View Count
Unwatched First
```

---

# 46. UI State Persistence

Persist:

- sidebar state;
- selected filters;
- selected sort;
- selected feed;
- theme;
- density;
- player layout;
- recommendation preset.

---

# 47. Themes

Provide theming architecture from the beginning.

At minimum:

```text
Light
Dark
System
```

Theme system should eventually permit:

- accent colour;
- font family;
- font size;
- UI density;
- spacing;
- card size;
- thumbnail size.

Avoid hard-coded visual values where practical.

---

# 48. Settings

Suggested settings hierarchy:

```text
Settings
├── YouTube Account
├── Feed
├── Recommendations
│   ├── Interest Weights
│   ├── Channel Weights
│   ├── Ranking Rules
│   └── Recommendation Presets
├── Filters
├── Shorts
├── Watch History
├── Search
├── AI
├── Cache
├── Appearance
├── Privacy
└── Advanced
```

---

# 49. Privacy

The application should be local-first.

Prefer keeping the following data locally:

- watch history;
- explicit interests;
- blocked topics;
- recommendation scores;
- user ratings;
- AI classifications;
- custom channel groups;
- collections.

Do not send local behavioural data to external services unless explicitly enabled.

---

# 50. API Quota Philosophy

API usage should be conservative.

Strategies:

- cache aggressively;
- batch video metadata requests where supported;
- prefer playlist-based upload discovery;
- avoid unnecessary search calls;
- refresh only stale resources;
- do not repeatedly request unchanged channel metadata;
- provide manual refresh.

---

# 51. Diagnostics

Add an optional diagnostics page.

Example:

```text
YouTube API

Requests today:             183
Search requests:              4
Videos cached:            8,421
Channels cached:             214
Last subscription sync:   13:42
Last upload refresh:      13:45

Database size:             84 MB
```

Exact quota information should only be displayed if reliably available or locally calculated.

---

# 52. Error Handling

The application must handle:

- expired OAuth tokens;
- API quota exhaustion;
- network errors;
- deleted videos;
- private videos;
- removed channels;
- malformed API responses;
- unavailable player content;
- region-restricted content.

UI errors should be non-destructive.

Example:

```text
Unable to refresh subscriptions.

Your existing cached feed remains available.

[Retry]
```

---

# 53. Offline Behaviour

Metadata already cached locally should remain browsable without internet access.

Playback obviously requires network access.

The app should indicate stale metadata when offline.

---

# 54. Database Entities

Initial suggested entities:

```text
Channel
Video
Subscription
ChannelGroup
ChannelGroupMembership
Interest
VideoTopic
WatchHistory
WatchQueueItem
Collection
CollectionVideo
VideoFeedback
RecommendationScore
RecommendationComponent
SearchCache
ApplicationSetting
```

---

# 55. Suggested SQLite Schema

Illustrative only.

```sql
CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    uploads_playlist_id TEXT,

    subscribed INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    muted INTEGER NOT NULL DEFAULT 0,
    favourite INTEGER NOT NULL DEFAULT 0,

    user_rating REAL,
    quality_weight REAL,

    fetched_at TEXT
);

CREATE TABLE videos (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,

    title TEXT NOT NULL,
    description TEXT,

    published_at TEXT,
    duration_seconds INTEGER,

    thumbnail_url TEXT,

    view_count INTEGER,
    like_count INTEGER,

    is_short INTEGER,

    hidden INTEGER NOT NULL DEFAULT 0,

    recommendation_score REAL,

    fetched_at TEXT,

    FOREIGN KEY(channel_id)
        REFERENCES channels(id)
);

CREATE TABLE watch_history (
    video_id TEXT PRIMARY KEY,

    first_opened_at TEXT,
    last_opened_at TEXT,

    watch_progress REAL,
    completed INTEGER NOT NULL DEFAULT 0,

    rating REAL,

    FOREIGN KEY(video_id)
        REFERENCES videos(id)
);
```

Schema should evolve through migrations.

---

# 56. Backend Service Boundaries

Suggested modules:

```text
services/
    youtube/
        youtubeApi.ts
        authentication.ts
        subscriptions.ts
        videos.ts
        search.ts

    feed/
        feedService.ts
        feedAggregator.ts

    recommendations/
        recommendationEngine.ts
        scoringRules.ts
        explanations.ts

    filters/
        filterEngine.ts

    channels/
        channelService.ts

    history/
        watchHistoryService.ts

    cache/
        cacheService.ts

    ai/
        classifier.ts
        ruleBasedClassifier.ts

    database/
        database.ts
        migrations/
```

---

# 57. Recommendation Engine API

Suggested interface:

```ts
interface RecommendationEngine {
    scoreVideo(
        video: Video,
        context: RecommendationContext
    ): RecommendationResult;
}
```

Result:

```ts
interface RecommendationResult {
    score: number;

    components: RecommendationComponent[];
}

interface RecommendationComponent {
    id: string;

    score: number;

    explanation: string;
}
```

---

# 58. Filter Engine API

```ts
interface FeedFilter {
    id: string;

    matches(
        video: Video,
        context: FilterContext
    ): boolean;
}
```

Filters should be composable.

---

# 59. YouTube Data Synchronisation

Suggested startup sequence:

```text
Application starts
      │
      ▼
Load local database
      │
      ▼
Render cached feed immediately
      │
      ▼
Check authentication
      │
      ▼
Refresh subscriptions if stale
      │
      ▼
Check subscribed channels for new uploads
      │
      ▼
Fetch missing video metadata
      │
      ▼
Run local classification if enabled
      │
      ▼
Calculate recommendation scores
      │
      ▼
Update UI
```

Important:

The UI should not wait for a complete network refresh before becoming usable.

Cached data should render first.

---

# 60. Initial MVP

The first usable version should deliberately be small.

## MVP requirements

### Authentication

- Google OAuth.

### Subscription sync

- import subscriptions;
- cache channels;
- discover recent uploads.

### Feed

- chronological subscription feed;
- thumbnails;
- titles;
- channels;
- publication time;
- duration.

### Filtering

- hide Shorts;
- hide watched;
- channel filtering;
- minimum duration.

### Player

- embedded YouTube playback.

### Local state

- watched state;
- hidden videos;
- favourite channels.

### Search

- YouTube video search.

### UI

- sidebar;
- main feed;
- player page;
- settings.

Do NOT build AI functionality in the MVP.

---

# 61. Phase 2 — Personal Ranking

Implement:

- explicit interests;
- channel weighting;
- recommendation score;
- ranked feed;
- explanation system;
- recommendation settings.

---

# 62. Phase 3 — Organisation

Implement:

- channel groups;
- collections;
- watch queue;
- presets;
- advanced filters;
- blocked topics;
- muted topics.

---

# 63. Phase 4 — Intelligent Classification

Implement optional:

- topic classifier;
- embeddings;
- semantic similarity;
- duplicate-topic detection;
- novelty scoring;
- clickbait estimation.

AI components must remain optional.

---

# 64. Phase 5 — Advanced Personal Discovery

Potential features:

- semantic topic discovery;
- knowledge-interest graph;
- transcript indexing;
- local semantic search;
- personalised research feeds;
- channel discovery;
- information-density scoring.

---

# 65. Future Knowledge Model

A more advanced version could maintain a personal topic graph.

Example:

```text
Artificial Intelligence
├── Generative AI
│   ├── Image Generation
│   │   ├── Diffusion
│   │   ├── LoRA
│   │   └── ComfyUI
│   └── LLM
│       ├── Local Models
│       ├── Agents
│       └── Fine-tuning
│
├── Computer Vision
└── Robotics
```

User preference may exist at any level of the hierarchy.

Example:

```text
Artificial Intelligence          +60
Generative AI                    +80
Image Generation                 +100
AI Business News                 -50
```

---

# 66. Personal Recommendation Philosophy

The recommendation engine should eventually optimise for:

```text
expected usefulness
```

rather than:

```text
expected engagement
```

Conceptually:

```text
PersonalValue(video) =
    Interest
  × InformationQuality
  × Novelty
  × ContextualRelevance
  × ChannelTrust
  - Repetition
  - Clickbait
  - KnownContent
  - ExplicitDisinterest
```

This formula is conceptual, not prescriptive.

---

# 67. Important UX Distinction

The app should expose three fundamentally different content sources:

```text
Subscriptions
Discovery
Search
```

They must never silently blend together.

A user looking at the subscription feed should know:

> Everything here came from channels I explicitly subscribed to.

Discovery should similarly be visibly identified as discovery.

---

# 68. No Invisible Feed Injection

Never insert content into a subscription feed merely because the recommendation system considers it interesting.

Instead:

```text
Subscriptions
─────────────
only subscriptions

Discover
────────
new content selected by personal ranking
```

This is a core product requirement.

---

# 69. User Control

Any automated rule that materially changes what content appears should eventually be inspectable.

Examples:

```text
Why was this recommended?

Why was this hidden?

Why is this channel ranked highly?

Why am I seeing fewer videos about this subject?
```

The answer should come from stored rules and scoring components.

---

# 70. Security Requirements

Never commit:

```text
Google OAuth client secrets
OAuth access tokens
OAuth refresh tokens
personal API configuration
local watch history
personal database
```

Relevant files must be excluded from Git.

Example:

```gitignore
.env
.env.local
data/
*.db
*.sqlite
*.sqlite3
```

Do not log access tokens.

---

# 71. YouTube Policy Compatibility

Implementation must use supported YouTube/Google interfaces.

Before implementing API functionality, verify current:

- YouTube Data API documentation;
- OAuth requirements;
- quota rules;
- YouTube API Services Terms of Service;
- embedded-player requirements.

Do not depend on undocumented YouTube endpoints.

Do not parse the normal YouTube website when an official supported API exists.

---

# 72. Performance Targets

Cached feed rendering should feel immediate.

Target:

```text
initial cached UI render: < 500 ms
```

where practical on normal desktop hardware.

Feed scrolling should remain smooth with thousands of cached videos.

Use:

- pagination;
- virtualisation if necessary;
- indexed database queries;
- lazy-loaded thumbnails.

---

# 73. Feed Pagination

Do not use endless auto-loading infinite scroll.

Preferred:

```text
Page 1
Page 2
Page 3
```

or:

```text
[Load more]
```

Loading should be an explicit user action.

---

# 74. Keyboard Navigation

Eventually support:

```text
J / ↓    next video
K / ↑    previous video
Enter    open video
Q        add to queue
H        hide
W        mark watched
S        save
/        search
```

All shortcuts should be configurable.

---

# 75. Accessibility

Use:

- semantic HTML;
- keyboard navigation;
- ARIA labels where required;
- visible focus indicators;
- sufficient contrast;
- scalable fonts;
- configurable density.

---

# 76. Logging

Use structured logging.

Levels:

```text
ERROR
WARN
INFO
DEBUG
```

Do not log secrets.

Debug logs should include:

```text
API request category
cache hit/miss
sync duration
videos discovered
classification duration
recommendation calculation duration
```

---

# 77. Testing

## Unit tests

Cover:

- score calculation;
- filters;
- topic weighting;
- duration filters;
- blocked channels;
- hidden videos;
- recommendation explanations;
- cache expiry.

## Integration tests

Cover:

- API response mapping;
- subscription synchronisation;
- new upload discovery;
- database persistence.

## UI tests

Cover:

- filtering;
- sorting;
- watch queue;
- settings persistence;
- search;
- player page.

---

# 78. Mock API Layer

The YouTube API must be abstracted sufficiently to allow development without consuming real quota.

Example:

```ts
interface YouTubeProvider {
    getSubscriptions(): Promise<Channel[]>;
    getChannelUploads(channelId: string): Promise<Video[]>;
    getVideos(ids: string[]): Promise<Video[]>;
    search(query: SearchQuery): Promise<SearchResult>;
}
```

Implement:

```text
YouTubeApiProvider
MockYouTubeProvider
```

---

# 79. Development Data

Provide fixture datasets representing:

- subscribed channels;
- long-form videos;
- Shorts;
- watched videos;
- blocked channels;
- favourite channels;
- multiple topics.

This allows recommendation logic to be developed independently of the live API.

---

# 80. Recommended First Implementation Milestones

## Milestone 1 — Application shell

Implement:

- React application;
- routing;
- sidebar;
- theme;
- placeholder feed.

## Milestone 2 — Local database

Implement:

- SQLite;
- schema;
- repositories;
- migrations.

## Milestone 3 — Google authentication

Implement OAuth.

## Milestone 4 — Subscription import

Retrieve and cache subscriptions.

## Milestone 5 — Upload feed

Aggregate recent uploads.

At this stage the application should already be useful.

## Milestone 6 — Player

Embed YouTube player.

## Milestone 7 — Search

Add YouTube search.

## Milestone 8 — Filters

Add:

- Shorts;
- duration;
- watched;
- channel.

## Milestone 9 — User state

Add:

- watch history;
- hidden videos;
- favourite/muted channels.

## Milestone 10 — Recommendation engine

Add explicit interests and weighted ranking.

---

# 81. MVP Completion Criteria

The MVP is complete when the following workflow works:

```text
1. Launch MyTube.

2. Authenticate with Google.

3. Application imports subscribed channels.

4. Application displays recent uploads from those channels.

5. User can hide Shorts.

6. User can filter/sort videos.

7. User can select a video.

8. Video plays using YouTube's supported player.

9. Application records local watch state.

10. User can search YouTube.

11. User can mark channels as favourite, normal, muted or blocked.

12. Application works again on restart using cached data.

13. User never needs to visit YouTube Home.
```

---

# 82. Phase 2 Completion Criteria

Phase 2 is complete when:

```text
1. User can define interests.

2. Videos receive personal recommendation scores.

3. User can sort feed by personal score.

4. User can inspect why a video received its score.

5. User can modify scoring weights.

6. Explicit preferences override inferred behaviour.

7. YouTube's own Home recommendation feed is never required.
```

---

# 83. Design Principle Summary

The central distinction is:

```text
YouTube decides what videos exist.

MyTube decides what the user sees.
```

YouTube provides:

```text
video hosting
streaming
metadata
channels
subscriptions
search
```

MyTube provides:

```text
organisation
filtering
ranking
recommendations
history
interests
collections
discovery rules
user control
```

The recommendation system should be designed around the question:

> "What is most useful or interesting to this user according to preferences they can inspect and control?"

rather than:

> "What is most likely to keep this user watching?"

That distinction is the fundamental product requirement.

---

# 84. Cursor Implementation Instructions

When implementing this specification:

1. Work incrementally.
2. Do not attempt to implement all phases simultaneously.
3. Maintain strict separation between YouTube API code, database code, UI code and recommendation logic.
4. Keep the application functional without AI features.
5. Use TypeScript strict mode.
6. Avoid `any` unless absolutely necessary and documented.
7. Keep API provider interfaces mockable.
8. Cache API results rather than repeatedly calling YouTube.
9. Never commit OAuth credentials, tokens or personal application data.
10. Do not use undocumented YouTube APIs or scraping as shortcuts.
11. Create database migrations rather than manually modifying persistent schemas.
12. Keep recommendation scoring deterministic and testable.
13. Store recommendation score components so the UI can explain results.
14. Do not silently mix subscription content with discovery content.
15. Do not introduce autoplay or infinite-scroll behaviour unless explicitly requested later.
16. Build the MVP before implementing semantic AI functionality.
17. When the specification conflicts with convenience, preserve explicit user control.
18. Before implementing any YouTube API operation, verify the current official API documentation and quota requirements.