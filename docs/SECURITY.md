# Security & policy — MyYouTube

This project is released under the [MIT License](../LICENSE). Security expectations below apply to contributors and operators alike.

## OAuth & secrets

- Google OAuth client ID/secret/API key are entered in **Settings UI** and stored under Electron `userData` (never in the repo).  
- Access/refresh tokens only in Electron `userData` (encrypted at rest if/when practical; never in renderer storage as long-lived secrets).  
- Never log tokens, client secrets, or Authorization headers.  
- Request **minimal scopes** needed for subscriptions, channel/video metadata, and search (currently readonly YouTube scope).

## Process isolation

- `contextIsolation: true`, `nodeIntegration: false`, sandbox preload.  
- Renderer cannot read the SQLite file or token store directly.

## YouTube policy

- Official Data API v3 + OAuth + IFrame Player / supported embeds only.  
- Do not scrape youtube.com for data the API provides.  
- Do not extract raw progressive/adaptive stream URLs.  
- Do not bypass advertising or authentication.  
- Re-read YouTube API Services ToS and quota docs before shipping API features.

## Privacy (local-first)

Prefer keeping on-device:

- watch history, interests, blocks, scores, classifications, groups, collections  

Do not send behavioural data to third parties unless the user explicitly enables a cloud AI provider later.

## Git hygiene

See root `.gitignore`. Never commit:

- `.env*` with secrets  
- `*.sqlite*` user databases  
- exported personal dumps under `data/`  
- Real Google client secrets in examples or screenshots  

Ship only placeholder text in docs (“paste your Client ID”). Operators create their own Cloud project.

## Reporting issues

Prefer GitHub issues for non-sensitive bugs. Do **not** paste refresh tokens, client secrets, or full `userData` dumps into public issues.

## Error UX

Failures (quota, network, revoked token) must be non-destructive: keep showing cached feed with Retry.
