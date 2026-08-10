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

**Dev (`npm run dev`) and the installed app share one library.** Canonical folder is the package id:

```text
%APPDATA%\myyoutube\
```

(On Windows this is usually the same directory as `%APPDATA%\MyYouTube` because the filesystem is case-insensitive.)

If an older install-only profile under `MyYouTube` has `myyoutube.sqlite` and the package-name folder does not, that path is used until a package-name library exists — so nothing is stranded. When both exist on a case-sensitive OS, **the `myyoutube` (dev) profile wins**.

Suggested layout:

```text
myyoutube/
  myyoutube.sqlite
  myyoutube.sqlite-wal   # if WAL mode
  window-state.json      # size, position, maximized
  tokens/                # OAuth tokens (not committed)
  hardware-acceleration.json
  cache/                 # optional thumbnail disk cache
```

Override for an isolated profile:

- `MYYOUTUBE_USER_DATA` — absolute path (`MYTUBE_USER_DATA` still accepted)

## Credentials

Entered in **Settings → Google account**; stored under `userData/tokens/google-client.json` (gitignored via userData, never the repo). User OAuth tokens: `userData/tokens/google-oauth.json`.

## Backups / export (future)

JSON export of interests, groups, weights, and collections is fine; treat exports as sensitive.
