# Data model — MyYouTube

Authoritative entity list and illustrative SQL from PRODUCT_SPEC §26, §28, §54–§55. Evolve via **migrations** only.

---

## Entities (MVP → Phase 3)

| Entity | Purpose |
| ------ | ------- |
| Channel | Cached channel + local preference flags |
| Video | Cached video metadata + local flags |
| Subscription | Link user ↔ channel (may fold into `channels.subscribed`) |
| ChannelGroup / Membership | User-defined groups (multi) |
| Interest | Explicit topic interests / blocks |
| VideoTopic | Topic tags on a video (manual/rules/AI later) |
| WatchHistory | Local watch progress / completed |
| WatchQueueItem | Ordered queue |
| Collection / CollectionVideo | Local collections |
| VideoFeedback | Distinct intents (less like this, already know, etc.) |
| RecommendationScore / Component | Score + explainability rows or JSON |
| SearchCache | Query → result ids + fetched_at |
| ApplicationSetting | Key/value or JSON blobs |

---

## Illustrative SQLite (starter)

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
    FOREIGN KEY(channel_id) REFERENCES channels(id)
);

CREATE TABLE watch_history (
    video_id TEXT PRIMARY KEY,
    first_opened_at TEXT,
    last_opened_at TEXT,
    watch_progress REAL,
    completed INTEGER NOT NULL DEFAULT 0,
    rating REAL,
    FOREIGN KEY(video_id) REFERENCES videos(id)
);

CREATE TABLE application_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
);
```

Add indexes early for: `videos(published_at)`, `videos(channel_id)`, `videos(is_short)`, `videos(hidden)`.

---

## TypeScript shapes (conceptual)

See PRODUCT_SPEC for full `Channel`, `Video`, `WatchHistoryEntry`, `Interest`, `RecommendationScore` interfaces. Shared Zod schemas should live under `src/shared/schemas/` when code exists.

---

## Feedback semantics (do not collapse)

Store separately (PRODUCT_SPEC §30–§31):

- dislike this video  
- do not want this topic  
- already know this  
- do not want this channel  
- not now  

Never reduce these to a single “engagement” scalar.
