# On-disk layout — MyYouTube

## Repository (source)

```text
MyYouTube/
  PLAN.md
  README.md
  docs/
  .cursor/rules/
  .gitignore
  package.json          # after scaffold
  electron.vite.config.*
  src/
```

No personal YouTube data belongs in the repo.

## Electron `userData` (runtime)

Typical Windows path:

```text
%APPDATA%\MyYouTube\
```

Suggested layout:

```text
MyYouTube/
  myyoutube.sqlite
  myyoutube.sqlite-wal   # if WAL mode
  window-state.json      # size, position, maximized
  tokens/                # OAuth tokens (not committed)
  cache/                 # optional thumbnail disk cache
  logs/                  # optional
  settings.json          # if not entirely in SQLite
```

Override for isolation during development (optional later):

- `MYYOUTUBE_USER_DATA` — absolute path (`MYTUBE_USER_DATA` still accepted)  
- or a documented flag for repo-local `.dev-user-data/`  

## Credentials

Entered in **Settings → Google account**; stored under `userData/tokens/google-client.json` (gitignored via userData, never the repo). User OAuth tokens: `userData/tokens/google-oauth.json`.

## Backups / export (future)

JSON export of interests, groups, weights, and collections is fine; treat exports as sensitive.
