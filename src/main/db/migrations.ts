export type Migration = {
  id: number
  name: string
  sql: string
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        uploads_playlist_id TEXT,
        subscribed INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0,
        muted INTEGER NOT NULL DEFAULT 0,
        favourite INTEGER NOT NULL DEFAULT 0,
        blocked INTEGER NOT NULL DEFAULT 0,
        user_rating REAL,
        quality_weight REAL,
        fetched_at TEXT
      );

      CREATE TABLE IF NOT EXISTS videos (
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

      CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);
      CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
      CREATE INDEX IF NOT EXISTS idx_videos_is_short ON videos(is_short);
      CREATE INDEX IF NOT EXISTS idx_videos_hidden ON videos(hidden);

      CREATE TABLE IF NOT EXISTS watch_history (
        video_id TEXT PRIMARY KEY,
        first_opened_at TEXT,
        last_opened_at TEXT,
        watch_progress REAL,
        completed INTEGER NOT NULL DEFAULT 0,
        rating REAL,
        FOREIGN KEY(video_id) REFERENCES videos(id)
      );

      CREATE TABLE IF NOT EXISTS application_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS search_cache (
        cache_key TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        result_ids_json TEXT NOT NULL,
        next_page_token TEXT,
        fetched_at TEXT NOT NULL
      );
    `
  },
  {
    id: 2,
    name: 'channel_local_unsubscribed',
    sql: `
      ALTER TABLE channels ADD COLUMN local_unsubscribed INTEGER NOT NULL DEFAULT 0;
    `
  }
]
